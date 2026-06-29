import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  Conversation,
  ConversationListItem,
  Fact,
  FactSource,
  Message,
  Role,
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
    role            TEXT    NOT NULL CHECK (role IN ('them', 'me')),
    content         TEXT    NOT NULL,
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS facts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    content         TEXT    NOT NULL,
    pinned          INTEGER NOT NULL DEFAULT 0,
    source          TEXT    NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'user')),
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id);
  CREATE INDEX IF NOT EXISTS idx_facts_conv ON facts (conversation_id);
`;

function createDb(): DatabaseSync {
  const dbPath = resolve(process.env.DATABASE_PATH ?? "./data/cyrano.db");
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);
  return db;
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

export function addMessage(conversationId: number, role: Role, content: string): Message {
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
  items: Array<{ role: Role; content: string }>,
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
      `INSERT INTO facts (conversation_id, content, pinned, source, created_at)
       VALUES (?, ?, 0, ?, ?)`,
    )
    .run(conversationId, trimmed, source, ts);
  return getDb()
    .prepare(`SELECT * FROM facts WHERE id = ?`)
    .get(Number(res.lastInsertRowid)) as unknown as Fact;
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
