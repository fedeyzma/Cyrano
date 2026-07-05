/** Reply-relevant speaker: only these two take part in suggestion targeting. */
export type Role = "them" | "me";

/**
 * How a row in the thread is stored. `context` is a situational note the user
 * drops in for Cyrano to read as background — it is never a message from
 * either party and is never a reply target. Reply/targeting code stays on
 * {@link Role} (them|me) so context is excluded by construction.
 */
export type MessageRole = Role | "context";

export type FactSource = "ai" | "user";

/** Fixed category set for the per-person fact library. Order = display order. */
export const FACT_CATEGORIES = [
  "basics",
  "people",
  "interests",
  "tastes",
  "plans",
  "stories",
  "jokes",
  "other",
] as const;

export type FactCategory = (typeof FACT_CATEGORIES)[number];

export const FACT_CATEGORY_LABELS: Record<FactCategory, string> = {
  basics: "Basics",
  people: "People & pets",
  interests: "Interests",
  tastes: "Likes & dislikes",
  plans: "Plans & follow-ups",
  stories: "Stories",
  jokes: "Inside jokes",
  other: "Other",
};

/** Map a free-form category string (from the model or an old row) onto the fixed set. */
export function normalizeFactCategory(raw: string | null | undefined): FactCategory {
  const r = (raw ?? "").trim().toLowerCase();
  if ((FACT_CATEGORIES as readonly string[]).includes(r)) return r as FactCategory;
  if (/job|work|career|school|stud|city|home|live|from|origin|age|basic|bio/.test(r)) return "basics";
  if (/famil|friend|pet|dog|cat|people|sister|brother|parent|roommate/.test(r)) return "people";
  if (/interest|hobb|music|show|movie|sport|book|game|art|passion/.test(r)) return "interests";
  if (/taste|like|dislike|food|drink|prefer|favorite|favourite|hate|opinion/.test(r)) return "tastes";
  if (/plan|date|trip|travel|event|upcoming|follow|goal/.test(r)) return "plans";
  if (/stor|anecdote|happen|past|memor|life/.test(r)) return "stories";
  if (/joke|banter|bit|tease|callback|humor|humour|running/.test(r)) return "jokes";
  return "other";
}

export interface Conversation {
  id: number;
  name: string;
  platform: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface ConversationListItem extends Conversation {
  message_count: number;
  last_message: string | null;
  last_message_at: number | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: MessageRole;
  content: string;
  created_at: number;
}

export interface Fact {
  id: number;
  conversation_id: number;
  content: string;
  category: FactCategory;
  pinned: 0 | 1;
  source: FactSource;
  created_at: number;
}

export interface ConversationDetail {
  conversation: Conversation;
  messages: Message[];
  facts: Fact[];
  queued: QueuedReply[];
}

export interface ReplyOption {
  /** 1-3 short texts to send back-to-back (usually just one). */
  texts: string[];
  tone: string;
}

export interface QueuedReply {
  id: number;
  conversation_id: number;
  target_message_id: number | null;
  content: string;
  tone: string | null;
  created_at: number;
}

export interface SuggestResult {
  options: ReplyOption[];
  extractedFacts: Fact[];
  addedMessages: Message[];
}

/* --------------------------------- backup ---------------------------------- */

export const BACKUP_VERSION = 1;

/** One conversation with all its data, ids stripped (portable across instances). */
export interface BackupConversation {
  name: string;
  platform: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
  messages: Array<{ role: MessageRole; content: string; created_at: number }>;
  facts: Array<{
    content: string;
    category: FactCategory;
    pinned: 0 | 1;
    source: FactSource;
    created_at: number;
  }>;
  queued: Array<{
    content: string;
    tone: string | null;
    created_at: number;
    /** Index into this conversation's `messages` array, or null. Re-linked on import. */
    target_message_index: number | null;
  }>;
}

/** A full portable dump of every conversation — the export/import payload. */
export interface Backup {
  version: number;
  exported_at: number;
  conversations: BackupConversation[];
}

/** What an import reports back. */
export interface ImportResult {
  importedConversations: number;
  skippedConversations: number;
  importedMessages: number;
  importedFacts: number;
  importedQueued: number;
}
