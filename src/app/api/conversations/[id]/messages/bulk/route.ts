import { addMessages, getConversation } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const MAX_IMPORT = 500;

export async function POST(req: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (id === null) return json({ error: "Not found" }, 404);
  if (!getConversation(id)) return json({ error: "Not found" }, 404);

  const body = await readJson<{ messages?: Array<{ role?: string; content?: string }> }>(req);
  if (!body || !Array.isArray(body.messages)) {
    return json({ error: "messages array is required" }, 400);
  }

  const items: Array<{ role: Role; content: string }> = [];
  for (const m of body.messages.slice(0, MAX_IMPORT)) {
    const role: Role | null = m?.role === "me" || m?.role === "them" ? m.role : null;
    const content = typeof m?.content === "string" ? m.content.trim() : "";
    if (!role || !content) continue;
    items.push({ role, content });
  }

  if (items.length === 0) return json({ error: "No valid messages to import" }, 400);

  return json(addMessages(id, items), 201);
}
