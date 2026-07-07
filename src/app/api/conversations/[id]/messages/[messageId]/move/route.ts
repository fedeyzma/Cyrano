import { getMessages, moveMessage } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; messageId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id: idStr, messageId: msgStr } = await params;
  const id = parseId(idStr);
  const messageId = parseId(msgStr);
  if (id === null || messageId === null) return json({ error: "Not found" }, 404);

  const body = await readJson<{ direction?: string }>(req);
  if (body?.direction !== "up" && body?.direction !== "down") {
    return json({ error: "direction must be 'up' or 'down'" }, 400);
  }

  const ok = moveMessage(id, messageId, body.direction);
  if (!ok) return json({ error: "Cannot move that message" }, 400);
  return json({ messages: getMessages(id) });
}
