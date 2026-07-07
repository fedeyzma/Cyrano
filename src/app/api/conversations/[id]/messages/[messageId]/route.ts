import { deleteMessage, updateMessage } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";
import type { MessageRole } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; messageId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id: idStr, messageId: msgStr } = await params;
  const id = parseId(idStr);
  const messageId = parseId(msgStr);
  if (id === null || messageId === null) return json({ error: "Not found" }, 404);

  const body = await readJson<{ content?: string; role?: string }>(req);
  const patch: { content?: string; role?: MessageRole } = {};
  if (typeof body?.content === "string") {
    const content = body.content.trim();
    if (!content) return json({ error: "content cannot be empty" }, 400);
    patch.content = content;
  }
  if (body?.role !== undefined) {
    if (body.role !== "me" && body.role !== "them" && body.role !== "context") {
      return json({ error: "role must be 'me', 'them', or 'context'" }, 400);
    }
    patch.role = body.role;
  }
  if (patch.content === undefined && patch.role === undefined) {
    return json({ error: "content or role is required" }, 400);
  }

  const updated = updateMessage(id, messageId, patch);
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
