import { addQueuedReply, getConversation } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (id === null) return json({ error: "Not found" }, 404);
  if (!getConversation(id)) return json({ error: "Not found" }, 404);

  const body = await readJson<{
    content?: string;
    tone?: string | null;
    targetMessageId?: number | null;
  }>(req);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) return json({ error: "content is required" }, 400);

  const targetMessageId = Number.isInteger(body?.targetMessageId)
    ? (body!.targetMessageId as number)
    : null;
  const tone = typeof body?.tone === "string" ? body.tone : null;

  return json(addQueuedReply(id, { content, tone, targetMessageId }), 201);
}
