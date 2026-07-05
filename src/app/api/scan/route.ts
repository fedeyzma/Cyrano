import { json, readJson } from "@/lib/http";
import { analyzeProfile, LlmError } from "@/lib/llm";
import { assembleScanAnalyzeRequest, buildScanAnalyzeSystem } from "@/lib/prompt";
import { getUserContext } from "@/lib/userContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_IMAGES = 6;
const MAX_TOTAL_CHARS = 9_000_000; // ~9MB of base64 across all images

export async function POST(req: Request) {
  const body = await readJson<{
    images?: string[];
    language?: string;
    platform?: string;
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

  const language = typeof body?.language === "string" ? body.language.trim() : "";
  const platform = typeof body?.platform === "string" ? body.platform.trim() : "";

  const system = buildScanAnalyzeSystem(getUserContext());
  const userMsg = assembleScanAnalyzeRequest(language, platform);

  try {
    const res = await analyzeProfile(system, userMsg, images);
    return json(res);
  } catch (err) {
    return json(
      { error: err instanceof LlmError ? err.message : "Could not scan the profile." },
      502,
    );
  }
}
