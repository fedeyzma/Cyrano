import { json, readJson } from "@/lib/http";
import { generatePromptAnswers, LlmError } from "@/lib/llm";
import { assemblePromptRequest, buildPromptSystem } from "@/lib/prompt";
import { getUserContext } from "@/lib/userContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export async function POST(req: Request) {
  const body = await readJson<{
    prompt?: string;
    mood?: string;
    count?: number;
    platform?: string;
    language?: string;
    avoid?: string[];
  }>(req);

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return json({ error: "Pick or write a prompt first" }, 400);

  const mood = typeof body?.mood === "string" ? body.mood.trim() : "";
  const platform = typeof body?.platform === "string" ? body.platform.trim() : "";
  const language = typeof body?.language === "string" ? body.language.trim() : "";
  const count = clamp(Math.round(Number(body?.count ?? 4)) || 4, 1, 6);
  const avoid = Array.isArray(body?.avoid)
    ? body.avoid.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];

  const system = buildPromptSystem(getUserContext(), language);
  const userMsg = assemblePromptRequest(prompt, mood, count, platform, language, avoid);

  try {
    const res = await generatePromptAnswers(system, userMsg);
    return json({ options: res.options });
  } catch (err) {
    return json(
      { error: err instanceof LlmError ? err.message : "Could not generate answers." },
      502,
    );
  }
}
