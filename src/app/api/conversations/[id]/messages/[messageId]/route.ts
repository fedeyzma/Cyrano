import { deleteMessage } from "@/lib/db";
import { json, parseId } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; messageId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: idStr, messageId: msgStr } = await params;
  const id = parseId(idStr);
  const messageId = parseId(msgStr);
  if (id === null || messageId === null) return json({ error: "Not found" }, 404);
  const ok = deleteMessage(id, messageId);
  if (!ok) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}
