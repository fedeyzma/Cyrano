import { createConversation, listConversations } from "@/lib/db";
import { json, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return json(listConversations());
}

export async function POST(req: Request) {
  const body = await readJson<{ name?: string; platform?: string; notes?: string }>(req);
  if (!body) return json({ error: "Invalid JSON" }, 400);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return json({ error: "A name is required" }, 400);
  const conversation = createConversation({
    name,
    platform: body.platform ?? null,
    notes: body.notes ?? null,
  });
  return json(conversation, 201);
}
