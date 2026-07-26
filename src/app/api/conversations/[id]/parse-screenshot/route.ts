import { getConversation } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";
import { LlmError, parseThreadFromScreenshots } from "@/lib/llm";
import { MAX_TILES } from "@/lib/screenshotTiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Slices are read a few at a time, one batch after another, against a
// self-hosted vision model — a full 12-slice scroll capture is minutes, not
// seconds.
export const maxDuration = 300;

const MAX_TOTAL_CHARS = 9_000_000; // ~9MB of base64 across all slices

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (id === null) return json({ error: "Not found" }, 404);
  const conversation = getConversation(id);
  if (!conversation) return json({ error: "Not found" }, 404);

  const body = await readJson<{ tiles?: string[] }>(req);
  const tiles = Array.isArray(body?.tiles)
    ? body.tiles
        .filter((s): s is string => typeof s === "string" && s.startsWith("data:image/"))
        // Keep the TAIL, matching collectTiles on the client — over the ceiling
        // it is the newest part of the thread that's worth reading.
        .slice(-MAX_TILES)
    : [];
  if (tiles.length === 0) return json({ error: "Add a screenshot first" }, 400);

  const total = tiles.reduce((n, s) => n + s.length, 0);
  if (total > MAX_TOTAL_CHARS) {
    return json({ error: "That screenshot is too large — import it in two halves." }, 413);
  }

  try {
    const res = await parseThreadFromScreenshots(tiles, conversation.name);
    return json(res);
  } catch (err) {
    return json(
      { error: err instanceof LlmError ? err.message : "Could not read that screenshot." },
      502,
    );
  }
}
