import {
  deleteConversation,
  getConversation,
  getFacts,
  getMessages,
  updateConversation,
} from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (id === null) return json({ error: "Not found" }, 404);
  const conversation = getConversation(id);
  if (!conversation) return json({ error: "Not found" }, 404);
  return json({
    conversation,
    messages: getMessages(id),
    facts: getFacts(id),
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (id === null) return json({ error: "Not found" }, 404);
  const body = await readJson<{ name?: string; platform?: string | null; notes?: string | null }>(req);
  if (!body) return json({ error: "Invalid JSON" }, 400);
  if (body.name !== undefined && body.name.trim() === "") {
    return json({ error: "Name cannot be empty" }, 400);
  }
  const updated = updateConversation(id, body);
  if (!updated) return json({ error: "Not found" }, 404);
  return json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (id === null) return json({ error: "Not found" }, 404);
  const ok = deleteConversation(id);
  if (!ok) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}
