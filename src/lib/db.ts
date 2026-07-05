import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  Conversation,
  ConversationListItem,
  Fact,
  FactCategory,
  FactSource,
  Message,
  MessageRole,
  QueuedReply,
} from "./types";

// Reuse a single connection across hot reloads in dev.
declare global {
  // eslint-disable-next-line no-var
  var __cyranoDb: DatabaseSync | undefined;
}

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS conversations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    platform    TEXT,
    notes       TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role            TEXT    NOT NULL CHECK (role IN ('them', 'me', 'context')),
    content         TEXT    NOT NULL,
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS facts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    content         TEXT    NOT NULL,
    category        TEXT    NOT NULL DEFAULT 'other',
    pinned          INTEGER NOT NULL DEFAULT 0,
    source          TEXT    NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'user')),
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS queued_replies (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id   INTEGER NOT NULL,
    target_message_id INTEGER,
    content           TEXT    NOT NULL,
    tone              TEXT,
    created_at        INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
    FOREIGN KEY (target_message_id) REFERENCES messages (id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id);
  CREATE INDEX IF NOT EXISTS idx_facts_conv ON facts (conversation_id);
  CREATE INDEX IF NOT EXISTS idx_queued_conv ON queued_replies (conversation_id);
`;

function createDb(): DatabaseSync {
  const dbPath = resolve(process.env.DATABASE_PATH ?? "./data/cyrano.db");
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);
  // CREATE TABLE IF NOT EXISTS doesn't touch existing tables, so pre-category
  // databases need the column added by hand.
  const factCols = db.prepare(`PRAGMA table_info(facts)`).all() as unknown as Array<{
    name: string;
  }>;
  if (!factCols.some((c) => c.name === "category")) {
    db.exec(`ALTER TABLE facts ADD COLUMN category TEXT NOT NULL DEFAULT 'other'`);
  }
  migrateMessagesRoleCheck(db);
  return db;
}

/**
 * Older databases carry `CHECK (role IN ('them','me'))` on messages, which
 * rejects the newer `context` role. CHECK constraints can't be altered in
 * place, so rebuild the table (ids preserved, so queued_replies FKs stay
 * valid) when the old constraint is still present.
 */
function migrateMessagesRoleCheck(db: DatabaseSync): void {
  const row = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'messages'`)
    .get() as unknown as { sql?: string } | undefined;
  const sql = row?.sql ?? "";
  if (!sql || sql.includes("'context'")) return; // fresh schema already allows context

  db.exec("PRAGMA foreign_keys = OFF");
  db.exec("BEGIN");
  try {
    db.exec(`
      CREATE TABLE messages_new (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        role            TEXT    NOT NULL CHECK (role IN ('them', 'me', 'context')),
        content         TEXT    NOT NULL,
        created_at      INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
      );
      INSERT INTO messages_new (id, conversation_id, role, content, created_at)
        SELECT id, conversation_id, role, content, created_at FROM messages;
      DROP TABLE messages;
      ALTER TABLE messages_new RENAME TO messages;
      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id);
    `);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
}

export function getDb(): DatabaseSync {
  if (!globalThis.__cyranoDb) {
    globalThis.__cyranoDb = createDb();
  }
  return globalThis.__cyranoDb;
}

const now = () => Date.now();

/* ------------------------------- conversations ------------------------------ */

export function listConversations(): ConversationListItem[] {
  return getDb()
    .prepare(
      `SELECT c.*,
         (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
         (SELECT content    FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message,
         (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message_at
       FROM conversations c
       ORDER BY c.updated_at DESC`,
    )
    .all() as unknown as ConversationListItem[];
}

export function getConversation(id: number): Conversation | undefined {
  return getDb()
    .prepare(`SELECT * FROM conversations WHERE id = ?`)
    .get(id) as unknown as Conversation | undefined;
}

export function createConversation(input: {
  name: string;
  platform?: string | null;
  notes?: string | null;
}): Conversation {
  const ts = now();
  const res = getDb()
    .prepare(
      `INSERT INTO conversations (name, platform, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(input.name.trim(), input.platform?.trim() || null, input.notes?.trim() || null, ts, ts);
  return getConversation(Number(res.lastInsertRowid))!;
}

export function updateConversation(
  id: number,
  patch: { name?: string; platform?: string | null; notes?: string | null },
): Conversation | undefined {
  const existing = getConversation(id);
  if (!existing) return undefined;
  const name = patch.name !== undefined ? patch.name.trim() : existing.name;
  const platform =
    patch.platform !== undefined ? patch.platform?.trim() || null : existing.platform;
  const notes = patch.notes !== undefined ? patch.notes?.trim() || null : existing.notes;
  getDb()
    .prepare(
      `UPDATE conversations SET name = ?, platform = ?, notes = ?, updated_at = ? WHERE id = ?`,
    )
    .run(name, platform, notes, now(), id);
  return getConversation(id);
}

export function touchConversation(id: number, ts: number = now()): void {
  getDb().prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`).run(ts, id);
}

export function deleteConversation(id: number): boolean {
  const res = getDb().prepare(`DELETE FROM conversations WHERE id = ?`).run(id);
  return res.changes > 0;
}

/* --------------------------------- messages -------------------------------- */

export function getMessages(conversationId: number): Message[] {
  return getDb()
    .prepare(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC`)
    .all(conversationId) as unknown as Message[];
}

export function addMessage(conversationId: number, role: MessageRole, content: string): Message {
  const ts = now();
  const res = getDb()
    .prepare(
      `INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)`,
    )
    .run(conversationId, role, content.trim(), ts);
  touchConversation(conversationId, ts);
  return getDb()
    .prepare(`SELECT * FROM messages WHERE id = ?`)
    .get(Number(res.lastInsertRowid)) as unknown as Message;
}

/** Insert many messages in order, in a single transaction. */
export function addMessages(
  conversationId: number,
  items: Array<{ role: MessageRole; content: string }>,
): Message[] {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)`,
  );
  const select = db.prepare(`SELECT * FROM messages WHERE id = ?`);
  const created: Message[] = [];
  const base = now();
  db.exec("BEGIN");
  try {
    items.forEach((m, i) => {
      const content = m.content.trim();
      if (!content) return;
      // base + i keeps display timestamps in insert order
      const res = insert.run(conversationId, m.role, content, base + i);
      created.push(select.get(Number(res.lastInsertRowid)) as unknown as Message);
    });
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  if (created.length > 0) touchConversation(conversationId, base + created.length);
  return created;
}

export function deleteMessage(conversationId: number, messageId: number): boolean {
  const res = getDb()
    .prepare(`DELETE FROM messages WHERE id = ? AND conversation_id = ?`)
    .run(messageId, conversationId);
  return res.changes > 0;
}

export function updateMessage(
  conversationId: number,
  messageId: number,
  content: string,
): Message | undefined {
  const trimmed = content.trim();
  if (!trimmed) return undefined;
  getDb()
    .prepare(`UPDATE messages SET content = ? WHERE id = ? AND conversation_id = ?`)
    .run(trimmed, messageId, conversationId);
  touchConversation(conversationId);
  return getDb()
    .prepare(`SELECT * FROM messages WHERE id = ? AND conversation_id = ?`)
    .get(messageId, conversationId) as unknown as Message | undefined;
}

/* ---------------------------------- facts ---------------------------------- */

export function getFacts(conversationId: number): Fact[] {
  return getDb()
    .prepare(
      `SELECT * FROM facts WHERE conversation_id = ? ORDER BY pinned DESC, id ASC`,
    )
    .all(conversationId) as unknown as Fact[];
}

/** Insert a fact, skipping near-duplicates (case-insensitive exact match). */
export function addFact(
  conversationId: number,
  content: string,
  source: FactSource,
  category: FactCategory = "other",
): Fact | null {
  const trimmed = content.trim();
  if (!trimmed) return null;
  const existing = getDb()
    .prepare(
      `SELECT * FROM facts WHERE conversation_id = ? AND lower(content) = lower(?)`,
    )
    .get(conversationId, trimmed) as unknown as Fact | undefined;
  if (existing) return null;
  const ts = now();
  const res = getDb()
    .prepare(
      `INSERT INTO facts (conversation_id, content, category, pinned, source, created_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
    )
    .run(conversationId, trimmed, category, source, ts);
  return getDb()
    .prepare(`SELECT * FROM facts WHERE id = ?`)
    .get(Number(res.lastInsertRowid)) as unknown as Fact;
}

export function setFactCategory(
  conversationId: number,
  factId: number,
  category: FactCategory,
): Fact | undefined {
  getDb()
    .prepare(`UPDATE facts SET category = ? WHERE id = ? AND conversation_id = ?`)
    .run(category, factId, conversationId);
  return getDb()
    .prepare(`SELECT * FROM facts WHERE id = ? AND conversation_id = ?`)
    .get(factId, conversationId) as unknown as Fact | undefined;
}

export function setFactPinned(
  conversationId: number,
  factId: number,
  pinned: boolean,
): Fact | undefined {
  getDb()
    .prepare(`UPDATE facts SET pinned = ? WHERE id = ? AND conversation_id = ?`)
    .run(pinned ? 1 : 0, factId, conversationId);
  return getDb()
    .prepare(`SELECT * FROM facts WHERE id = ?`)
    .get(factId) as unknown as Fact | undefined;
}

export function deleteFact(conversationId: number, factId: number): boolean {
  const res = getDb()
    .prepare(`DELETE FROM facts WHERE id = ? AND conversation_id = ?`)
    .run(factId, conversationId);
  return res.changes > 0;
}

/* ----------------------------- queued replies ------------------------------ */

export function getQueuedReplies(conversationId: number): QueuedReply[] {
  return getDb()
    .prepare(`SELECT * FROM queued_replies WHERE conversation_id = ? ORDER BY id ASC`)
    .all(conversationId) as unknown as QueuedReply[];
}

export function addQueuedReply(
  conversationId: number,
  input: { content: string; tone?: string | null; targetMessageId?: number | null },
): QueuedReply {
  const ts = now();
  const res = getDb()
    .prepare(
      `INSERT INTO queued_replies (conversation_id, target_message_id, content, tone, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      conversationId,
      input.targetMessageId ?? null,
      input.content.trim(),
      input.tone?.trim() || null,
      ts,
    );
  touchConversation(conversationId, ts);
  return getDb()
    .prepare(`SELECT * FROM queued_replies WHERE id = ?`)
    .get(Number(res.lastInsertRowid)) as unknown as QueuedReply;
}

export function deleteQueuedReply(conversationId: number, queueId: number): boolean {
  const res = getDb()
    .prepare(`DELETE FROM queued_replies WHERE id = ? AND conversation_id = ?`)
    .run(queueId, conversationId);
  return res.changes > 0;
}
