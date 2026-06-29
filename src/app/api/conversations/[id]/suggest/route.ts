import { addFact, addMessage, getConversation, getFacts, getMessages } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";
import { generateSuggestions, LlmError } from "@/lib/llm";
import { assemblePrompt, SYSTEM_PROMPT } from "@/lib/prompt";
import type { Fact, Message } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow the function plenty of time for a slow self-hosted model.
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export async function POST(req: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (id === null) return json({ error: "Not found" }, 404);
  const conversation = getConversation(id);
  if (!conversation) return json({ error: "Not found" }, 404);

  const body = await readJson<{ incoming?: string; count?: number }>(req);
  const incoming = typeof body?.incoming === "string" ? body.incoming.trim() : "";
  const optionCount = clamp(
    Math.round(Number(body?.count ?? process.env.SUGGESTION_COUNT ?? 4)) || 4,
    2,
    5,
  );

  // If the user pasted the latest incoming message, log it to the thread first.
  const addedMessages: Message[] = [];
  if (incoming) addedMessages.push(addMessage(id, "them", incoming));

  const messages = getMessages(id);
  const facts = getFacts(id);
  if (messages.length === 0) {
    return json(
      { error: "Add the message you want to reply to first.", addedMessages },
      400,
    );
  }

  const prompt = assemblePrompt({ conversation, messages, facts }, optionCount);

  let suggestion;
  try {
    suggestion = await generateSuggestions(SYSTEM_PROMPT, prompt);
  } catch (err) {
    const message =
      err instanceof LlmError
        ? err.message
        : "Could not generate replies. Check that your LLM endpoint is reachable.";
    // The incoming message we logged is still valid thread data — return it so
    // the client can reflect it even though generation failed.
    return json({ error: message, addedMessages }, 502);
  }

  // Persist any newly-learned facts (deduped inside addFact).
  const newFacts: Fact[] = [];
  for (const f of suggestion.extractedFacts ?? []) {
    const added = addFact(id, f, "ai");
    if (added) newFacts.push(added);
  }

  return json({
    options: suggestion.options,
    extractedFacts: newFacts,
    addedMessages,
  });
}
