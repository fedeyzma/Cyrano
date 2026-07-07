import { addMessage, getConversation, getMessage } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";
import type { MessageRole } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (id === null) return json({ error: "Not found" }, 404);
  if (!getConversation(id)) return json({ error: "Not found" }, 404);

  const body = await readJson<{ role?: string; content?: string; replyToMessageId?: unknown }>(
    req,
  );
  if (!body) return json({ error: "Invalid JSON" }, 400);

  const role: MessageRole | null =
    body.role === "me" || body.role === "them" || body.role === "context" ? body.role : null;
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!role) return json({ error: "role must be 'me', 'them', or 'context'" }, 400);
  if (!content) return json({ error: "content is required" }, 400);

  let replyTo: number | null = null;
  if (body.replyToMessageId != null) {
    const rid = Number(body.replyToMessageId);
    const target = Number.isInteger(rid) ? getMessage(id, rid) : undefined;
    if (!target || target.role === "context") {
      return json(
        { error: "replyToMessageId must reference a me/them message in this conversation" },
        400,
      );
    }
    replyTo = rid;
  }

  return json(addMessage(id, role, content, replyTo), 201);
}
