export type Role = "them" | "me";

export type FactSource = "ai" | "user";

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
  role: Role;
  content: string;
  created_at: number;
}

export interface Fact {
  id: number;
  conversation_id: number;
  content: string;
  pinned: 0 | 1;
  source: FactSource;
  created_at: number;
}

export interface ConversationDetail {
  conversation: Conversation;
  messages: Message[];
  facts: Fact[];
}

export interface ReplyOption {
  text: string;
  tone: string;
}

export interface SuggestResult {
  options: ReplyOption[];
  extractedFacts: Fact[];
  addedMessages: Message[];
}
