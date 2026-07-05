import { addFact, getConversation } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";
import { normalizeFactCategory } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (id === null) return json({ error: "Not found" }, 404);
  if (!getConversation(id)) return json({ error: "Not found" }, 404);

  const body = await readJson<{ content?: string; category?: string }>(req);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) return json({ error: "content is required" }, 400);

  const fact = addFact(id, content, "user", normalizeFactCategory(body?.category));
  if (!fact) return json({ error: "That fact is already saved" }, 409);
  return json(fact, 201);
}
