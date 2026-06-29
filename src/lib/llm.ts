import { SUGGESTION_JSON_EXAMPLE, suggestionSchema, type Suggestion } from "./schema";

const BASE_URL = (process.env.CAMI_API_URL ?? "http://192.168.69.244:8642").replace(/\/+$/, "");
const API_KEY = process.env.CAMI_API_KEY ?? "";
const MODEL = process.env.CAMI_API_MODEL ?? "cami";
const TIMEOUT_MS = Number(process.env.CAMI_API_TIMEOUT_MS ?? "45000");
const TEMPERATURE = Number(process.env.SUGGESTION_TEMPERATURE ?? "0.8");

export class LlmError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

interface ChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/** One round-trip to Cami's OpenAI-compatible chat endpoint. */
async function chat(system: string, user: string): Promise<string> {
  if (!API_KEY) {
    throw new LlmError("CAMI_API_KEY is not set — add it to your .env file.");
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: TEMPERATURE,
        max_tokens: 900,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new LlmError(
      "Could not reach Cami (network error or timeout). Is the endpoint up and on the LAN?",
      err,
    );
  }

  if (!res.ok) {
    const hint = res.status === 401 ? " — check CAMI_API_KEY" : res.status === 404 ? " — check CAMI_API_URL" : "";
    throw new LlmError(`Cami request failed with HTTP ${res.status}${hint}.`);
  }

  const payload = (await res.json()) as ChatResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new LlmError("Cami returned an empty response.");
  return content;
}

/**
 * Ask Cami for reply suggestions as strict JSON, then validate. Cami is an agent
 * (not a plain model), so we explicitly ask for JSON-only output and suppress
 * tool use / notifications. We retry once if the first response isn't parseable.
 */
export async function generateSuggestions(system: string, prompt: string): Promise<Suggestion> {
  const jsonInstruction = `\n\nThis is a pure text-generation task. Do NOT use any tools, do NOT notify anyone, do NOT ask questions. Return ONLY a single valid JSON object — no markdown, no code fences, no commentary before or after it — in exactly this shape:\n${SUGGESTION_JSON_EXAMPLE}\nEach option's "text" is the message to send (clean, no surrounding quotes). "tone" is one of: dry, playful, curious, flirty, sincere, bold.`;
  const sys = system + jsonInstruction;

  let lastParseError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await chat(sys, prompt); // network/HTTP errors propagate immediately
    try {
      return suggestionSchema.parse(extractJson(raw));
    } catch (err) {
      lastParseError = err;
    }
  }
  throw new LlmError(
    "Cami did not return usable JSON. Try again, or tweak the prompt.",
    lastParseError,
  );
}

/** Pull the outermost JSON object out of a possibly-chatty response. */
function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model output");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}
