import { addFact, addMessage, getConversation, getFacts, getMessages } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";
import { generateSuggestions, LlmError } from "@/lib/llm";
import { assemblePrompt, buildSystemPrompt } from "@/lib/prompt";
import { getUserContext } from "@/lib/userContext";
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

  const body = await readJson<{
    incoming?: string;
    count?: number;
    steer?: string;
    targetMessageIds?: number[];
    avoid?: string[];
    extractFacts?: boolean;
  }>(req);
  const incoming = typeof body?.incoming === "string" ? body.incoming.trim() : "";
  const steer = typeof body?.steer === "string" ? body.steer.trim() : "";
  const targetMessageIds = Array.isArray(body?.targetMessageIds)
    ? body.targetMessageIds.filter((n): n is number => Number.isInteger(n))
    : [];
  const avoid = Array.isArray(body?.avoid)
    ? body.avoid.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];
  const persistFacts = body?.extractFacts !== false;
  const optionCount = clamp(
    Math.round(Number(body?.count ?? process.env.SUGGESTION_COUNT ?? 4)) || 4,
    1,
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

  const prompt = assemblePrompt(
    { conversation, messages, facts, queued: [] },
    optionCount,
    steer,
    targetMessageIds,
    avoid,
  );

  let suggestion;
  try {
    suggestion = await generateSuggestions(buildSystemPrompt(getUserContext()), prompt);
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
  if (persistFacts) {
    for (const f of suggestion.extractedFacts ?? []) {
      const added = addFact(id, f, "ai");
      if (added) newFacts.push(added);
    }
  }

  return json({
    options: suggestion.options,
    extractedFacts: newFacts,
    addedMessages,
  });
}
