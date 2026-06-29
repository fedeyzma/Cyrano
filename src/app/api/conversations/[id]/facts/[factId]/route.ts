import { deleteFact, setFactPinned } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; factId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id: idStr, factId: factStr } = await params;
  const id = parseId(idStr);
  const factId = parseId(factStr);
  if (id === null || factId === null) return json({ error: "Not found" }, 404);

  const body = await readJson<{ pinned?: boolean }>(req);
  if (typeof body?.pinned !== "boolean") {
    return json({ error: "pinned (boolean) is required" }, 400);
  }
  const fact = setFactPinned(id, factId, body.pinned);
  if (!fact) return json({ error: "Not found" }, 404);
  return json(fact);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: idStr, factId: factStr } = await params;
  const id = parseId(idStr);
  const factId = parseId(factStr);
  if (id === null || factId === null) return json({ error: "Not found" }, 404);
  const ok = deleteFact(id, factId);
  if (!ok) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}
