import { deleteMessage, updateMessage } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; messageId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id: idStr, messageId: msgStr } = await params;
  const id = parseId(idStr);
  const messageId = parseId(msgStr);
  if (id === null || messageId === null) return json({ error: "Not found" }, 404);

  const body = await readJson<{ content?: string }>(req);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) return json({ error: "content is required" }, 400);

  const updated = updateMessage(id, messageId, content);
  if (!updated) return json({ error: "Not found" }, 404);
  return json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: idStr, messageId: msgStr } = await params;
  const id = parseId(idStr);
  const messageId = parseId(msgStr);
  if (id === null || messageId === null) return json({ error: "Not found" }, 404);
  const ok = deleteMessage(id, messageId);
  if (!ok) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}
