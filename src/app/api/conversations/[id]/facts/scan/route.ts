import { addFact, getConversation, getFacts, getMessages, setFactCategory } from "@/lib/db";
import { json, parseId } from "@/lib/http";
import { extractFactLibrary, LlmError } from "@/lib/llm";
import { assembleFactScanRequest, FACT_SCAN_SYSTEM } from "@/lib/prompt";
import { normalizeFactCategory, type Fact } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow the function plenty of time for a slow self-hosted model.
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/** Scan the whole thread and file every new durable detail into the library. */
export async function POST(_req: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (id === null) return json({ error: "Not found" }, 404);
  const conversation = getConversation(id);
  if (!conversation) return json({ error: "Not found" }, 404);

  const messages = getMessages(id);
  if (messages.length === 0) {
    return json({ error: "Nothing to scan yet — the thread is empty." }, 400);
  }
  const existing = getFacts(id);

  let result;
  try {
    result = await extractFactLibrary(
      FACT_SCAN_SYSTEM,
      assembleFactScanRequest(conversation, messages, existing),
    );
  } catch (err) {
    const message =
      err instanceof LlmError
        ? err.message
        : "Could not scan the thread. Check that your LLM endpoint is reachable.";
    return json({ error: message }, 502);
  }

  // Persist (deduped inside addFact).
  const newFacts: Fact[] = [];
  for (const f of result.facts) {
    const added = addFact(id, f.fact, "ai", normalizeFactCategory(f.category));
    if (added) newFacts.push(added);
  }

  // File any previously-uncategorized facts the model re-filed. Only facts
  // that were actually offered as unfiled are eligible.
  const unfiledIds = new Set(
    existing.filter((f) => normalizeFactCategory(f.category) === "other").map((f) => f.id),
  );
  let refiled = 0;
  for (const r of result.refiled ?? []) {
    if (!unfiledIds.has(r.id)) continue;
    const category = normalizeFactCategory(r.category);
    if (category === "other") continue;
    if (setFactCategory(id, r.id, category)) refiled++;
  }

  return json({ facts: newFacts, refiled });
}
