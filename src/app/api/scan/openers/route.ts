import { json, readJson } from "@/lib/http";
import { generateScanOpeners, LlmError } from "@/lib/llm";
import { assembleScanOpenersRequest, buildScanOpenersSystem } from "@/lib/prompt";
import { getUserContext } from "@/lib/userContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const MAX_IMAGES = 6;
const MAX_TOTAL_CHARS = 9_000_000; // ~9MB of base64 across all images

export async function POST(req: Request) {
  const body = await readJson<{
    images?: string[];
    approach?: { angle?: string; target?: string; type?: string; reason?: string };
    mood?: string;
    language?: string;
    platform?: string;
    count?: number;
    avoid?: string[];
  }>(req);

  const images = Array.isArray(body?.images)
    ? body.images
        .filter((s): s is string => typeof s === "string" && s.startsWith("data:image/"))
        .slice(0, MAX_IMAGES)
    : [];
  if (images.length === 0) return json({ error: "Add at least one profile screenshot." }, 400);

  const total = images.reduce((n, s) => n + s.length, 0);
  if (total > MAX_TOTAL_CHARS) {
    return json({ error: "Those screenshots are too large — use fewer or smaller ones." }, 413);
  }

  const target = body?.approach?.target;
  if (typeof target !== "string" || target.trim().length === 0) {
    return json({ error: "Pick an approach to write openers for." }, 400);
  }
  const approach = {
    angle: typeof body?.approach?.angle === "string" ? body.approach.angle.trim() : "",
    target: target.trim(),
    type: typeof body?.approach?.type === "string" ? body.approach.type.trim() : "detail",
    reason: typeof body?.approach?.reason === "string" ? body.approach.reason.trim() : "",
  };

  const mood = typeof body?.mood === "string" ? body.mood.trim() : "";
  const language = typeof body?.language === "string" ? body.language.trim() : "";
  const platform = typeof body?.platform === "string" ? body.platform.trim() : "";
  const count = clamp(Math.round(Number(body?.count ?? 4)) || 4, 1, 6);
  const avoid = Array.isArray(body?.avoid)
    ? body.avoid.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];

  const system = buildScanOpenersSystem(getUserContext());
  const userMsg = assembleScanOpenersRequest(approach, mood, language, count, platform, avoid);

  try {
    const res = await generateScanOpeners(system, userMsg, images);
    return json(res);
  } catch (err) {
    return json(
      { error: err instanceof LlmError ? err.message : "Could not write the openers." },
      502,
    );
  }
}
