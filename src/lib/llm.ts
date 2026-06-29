import {
  IMPORTED_THREAD_JSON_EXAMPLE,
  importedThreadSchema,
  PROMPT_ANSWERS_JSON_EXAMPLE,
  promptAnswersSchema,
  SUGGESTION_JSON_EXAMPLE,
  suggestionSchema,
  type PromptAnswers,
  type Suggestion,
} from "./schema";
import type { Role } from "./types";

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
async function chat(
  system: string,
  user: string,
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<string> {
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
        temperature: opts.temperature ?? TEMPERATURE,
        max_tokens: opts.maxTokens ?? 900,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? TIMEOUT_MS),
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

/** Generate answers to a dating-app profile prompt (strict JSON, with retry). */
export async function generatePromptAnswers(
  system: string,
  userMsg: string,
): Promise<PromptAnswers> {
  const jsonInstruction = `\n\nThis is a pure text task. Do NOT use tools, notify anyone, or ask questions. Return ONLY a single valid JSON object — no markdown, no commentary — exactly:\n${PROMPT_ANSWERS_JSON_EXAMPLE}`;
  const sys = system + jsonInstruction;

  let lastParseError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await chat(sys, userMsg, { maxTokens: 800, temperature: 0.95 });
    try {
      return promptAnswersSchema.parse(extractJson(raw));
    } catch (err) {
      lastParseError = err;
    }
  }
  throw new LlmError("Cami did not return usable prompt answers. Try again.", lastParseError);
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

function normalizeRole(raw: string): Role {
  const r = raw.trim().toLowerCase();
  if (r === "me" || r === "you" || r === "i" || r === "self" || r === "sent") return "me";
  return "them";
}

/**
 * Use Cami to split a raw, unlabeled chat paste into ordered messages with a
 * best-guess speaker for each. The caller previews and can correct the result
 * (including a one-click "flip all" if the two sides came out swapped).
 */
export async function parseThreadWithAI(
  raw: string,
  theirName: string,
): Promise<Array<{ role: Role; content: string }>> {
  const them = theirName.trim() || "the other person";
  const system = `You convert a raw, pasted chat log into structured messages. The log is a conversation between the user ("me") and ${them} ("them").

Split the log into individual messages in the order they appear, and label each sender "me" (the user) or "them" (${them}). Use names, timestamps, alignment, or context to decide — any line from ${them} (or a name that clearly isn't the user) is "them".

Clean each message: strip timestamps, sender names/initials, date separators, and system/receipt lines ("Delivered", "Read", "You matched", reactions like "Liked"). Keep only the actual message text. Join a single message that wraps across multiple lines into one. Drop empty/system-only lines.

If you genuinely can't tell who sent a line, make your best guess — the user can fix it afterward. Use exactly "me" or "them" for the role.

This is a pure text task. Do NOT use tools, do NOT notify anyone, do NOT ask questions. Return ONLY a single JSON object — no markdown, no commentary — in exactly this shape:\n${IMPORTED_THREAD_JSON_EXAMPLE}`;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    // Parsing re-emits the whole thread as JSON, so it needs a big output
    // budget; keep it near-deterministic and allow extra time for long pastes.
    const content = await chat(system, raw, {
      maxTokens: 8000,
      temperature: 0.2,
      timeoutMs: 90000,
    });
    try {
      const parsed = importedThreadSchema.parse(extractJson(content));
      const messages = parsed.messages
        .map((m) => ({ role: normalizeRole(m.role), content: m.content.trim() }))
        .filter((m) => m.content.length > 0);
      if (messages.length === 0) throw new Error("no messages parsed");
      return messages;
    } catch (err) {
      lastError = err;
    }
  }
  throw new LlmError(
    "Cami couldn't parse that into messages. Try the quick parse instead.",
    lastError,
  );
}
