import { addMessages, createConversation } from "@/lib/db";
import { json, readJson } from "@/lib/http";
import { LlmError, parseThreadWithAI } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_CHARS = 16000;

/**
 * External intake: accept a raw transcript (e.g. from the Cyrano DM Exporter
 * userscript), AI-parse it into messages, and create a conversation from it.
 * Intended for local/self-hosted use; reached cross-origin via GM_xmlhttpRequest.
 */
export async function POST(req: Request) {
  const body = await readJson<{ transcript?: string; name?: string; platform?: string }>(req);
  const transcript = typeof body?.transcript === "string" ? body.transcript.trim().slice(0, MAX_CHARS) : "";
  if (!transcript) return json({ error: "transcript is required" }, 400);

  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "New chat";
  const platform = typeof body?.platform === "string" ? body.platform.trim() || null : null;

  let parsed: Array<{ role: "me" | "them"; content: string }>;
  try {
    parsed = await parseThreadWithAI(transcript, name);
  } catch (err) {
    return json(
      { error: err instanceof LlmError ? err.message : "Could not parse the transcript." },
      502,
    );
  }

  const conversation = createConversation({ name, platform });
  const created = addMessages(conversation.id, parsed);

  return json({ id: conversation.id, name: conversation.name, messageCount: created.length }, 201);
}
