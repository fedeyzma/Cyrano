import type {
  Conversation,
  ConversationDetail,
  ConversationListItem,
  Fact,
  Message,
  QueuedReply,
  ReplyOption,
  Role,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = res.statusText || "Request failed";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

export interface SuggestResponse {
  options: ReplyOption[];
  extractedFacts: Fact[];
  addedMessages: Message[];
}

export const api = {
  listConversations: () => req<ConversationListItem[]>("/api/conversations"),

  createConversation: (data: { name: string; platform?: string; notes?: string }) =>
    req<Conversation>("/api/conversations", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getConversation: (id: number) => req<ConversationDetail>(`/api/conversations/${id}`),

  updateConversation: (
    id: number,
    data: { name?: string; platform?: string | null; notes?: string | null },
  ) =>
    req<Conversation>(`/api/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteConversation: (id: number) =>
    req<{ ok: boolean }>(`/api/conversations/${id}`, { method: "DELETE" }),

  addMessage: (id: number, role: Role, content: string) =>
    req<Message>(`/api/conversations/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ role, content }),
    }),

  addMessagesBulk: (id: number, messages: Array<{ role: Role; content: string }>) =>
    req<Message[]>(`/api/conversations/${id}/messages/bulk`, {
      method: "POST",
      body: JSON.stringify({ messages }),
    }),

  parseThread: (id: number, raw: string) =>
    req<{ messages: Array<{ role: Role; content: string }> }>(
      `/api/conversations/${id}/parse-thread`,
      { method: "POST", body: JSON.stringify({ raw }) },
    ),

  addQueuedReply: (
    id: number,
    data: { content: string; tone?: string | null; targetMessageId?: number | null },
  ) =>
    req<QueuedReply>(`/api/conversations/${id}/queue`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteQueuedReply: (id: number, queueId: number) =>
    req<{ ok: boolean }>(`/api/conversations/${id}/queue/${queueId}`, { method: "DELETE" }),

  updateMessage: (id: number, messageId: number, content: string) =>
    req<Message>(`/api/conversations/${id}/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }),

  deleteMessage: (id: number, messageId: number) =>
    req<{ ok: boolean }>(`/api/conversations/${id}/messages/${messageId}`, {
      method: "DELETE",
    }),

  suggest: (
    id: number,
    opts: {
      incoming?: string;
      count?: number;
      steer?: string;
      targetMessageIds?: number[];
      avoid?: string[];
      extractFacts?: boolean;
    } = {},
  ) =>
    req<SuggestResponse>(`/api/conversations/${id}/suggest`, {
      method: "POST",
      body: JSON.stringify(opts),
    }),

  addFact: (id: number, content: string) =>
    req<Fact>(`/api/conversations/${id}/facts`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  setFactPinned: (id: number, factId: number, pinned: boolean) =>
    req<Fact>(`/api/conversations/${id}/facts/${factId}`, {
      method: "PATCH",
      body: JSON.stringify({ pinned }),
    }),

  deleteFact: (id: number, factId: number) =>
    req<{ ok: boolean }>(`/api/conversations/${id}/facts/${factId}`, {
      method: "DELETE",
    }),

  suggestPrompt: (data: {
    prompt: string;
    mood?: string;
    count?: number;
    platform?: string;
    language?: string;
    avoid?: string[];
  }) =>
    req<{ options: Array<{ text: string; angle: string }> }>("/api/prompts/suggest", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
