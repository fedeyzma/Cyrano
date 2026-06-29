import { deleteQueuedReply } from "@/lib/db";
import { json, parseId } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; queueId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: idStr, queueId: qStr } = await params;
  const id = parseId(idStr);
  const queueId = parseId(qStr);
  if (id === null || queueId === null) return json({ error: "Not found" }, 404);
  const ok = deleteQueuedReply(id, queueId);
  if (!ok) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}
