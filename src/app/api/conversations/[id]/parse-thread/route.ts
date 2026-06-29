import { getConversation } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";
import { LlmError, parseThreadWithAI } from "@/lib/llm";
import { MAX_IMPORT_CHARS } from "@/lib/parseThread";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (id === null) return json({ error: "Not found" }, 404);
  const conversation = getConversation(id);
  if (!conversation) return json({ error: "Not found" }, 404);

  const body = await readJson<{ raw?: string }>(req);
  const raw = typeof body?.raw === "string" ? body.raw.trim().slice(0, MAX_IMPORT_CHARS) : "";
  if (!raw) return json({ error: "Paste a conversation first" }, 400);

  try {
    const messages = await parseThreadWithAI(raw, conversation.name);
    return json({ messages });
  } catch (err) {
    return json(
      { error: err instanceof LlmError ? err.message : "Could not parse the thread." },
      502,
    );
  }
}
