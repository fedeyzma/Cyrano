import {
  IMPORTED_THREAD_JSON_EXAMPLE,
  importedThreadSchema,
  PROFILE_ANALYSIS_JSON_EXAMPLE,
  profileAnalysisSchema,
  PROMPT_ANSWERS_JSON_EXAMPLE,
  promptAnswersSchema,
  SCAN_OPENERS_JSON_EXAMPLE,
  scanOpenersSchema,
  SUGGESTION_JSON_EXAMPLE,
  suggestionSchema,
  THREAD_FACTS_JSON_EXAMPLE,
  threadFactsSchema,
  type ProfileAnalysis,
  type PromptAnswers,
  type ScanOpeners,
  type Suggestion,
  type ThreadFacts,
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
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number; images?: string[] } = {},
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
          {
            role: "user",
            content:
              opts.images && opts.images.length > 0
                ? [
                    { type: "text", text: user },
                    ...opts.images.map((url) => ({ type: "image_url", image_url: { url } })),
                  ]
                : user,
          },
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
 * Strip the typographic marks a phone keyboard cannot produce. The prompt asks
 * for these too, but asking is unreliable and an em dash in a text is the single
 * most legible machine signature there is, so guarantee it here instead.
 *
 * SEND-READY TEXT ONLY. Never run this over imported messages (that rewrites her
 * actual words), over extracted facts, or over a scan approach's `target` (it is
 * her profile answer quoted verbatim and anchors the stage-2 openers).
 */
function cleanSendable(s: string): string {
  const out = s
    .replace(/\s*[—–]\s*/g, ", ") // em / en dash -> comma
    .replace(/^\s*,\s*/, "") // ...unless it opened the line
    .replace(/,\s*,/g, ",")
    .replace(/,\s*([.!?…])/g, "$1")
    .replace(/[‘’]/g, "'") // curly apostrophe -> straight (Gboard writes straight)
    .replace(/[“”]/g, '"')
    .replace(/\s*[«»]\s*/g, " ") // guillemets « »
    // U+202F / U+00A0 before French punctuation is a typesetter's space; a phone
    // types a plain one. Normalise rather than delete, "ça va ?" is real French.
    .replace(/[  ]/g, " ")
    .replace(/;(?![)(DPp3-])/g, ",") // keep the ;) ;( ;D winks
    .replace(/[^\S\n]{2,}/g, " ") // collapse runs, preserve newlines
    .trim();
  return out || s; // never hand back an empty message
}

/**
 * Ask Cami for reply suggestions as strict JSON, then validate. Cami is an agent
 * (not a plain model), so we explicitly ask for JSON-only output and suppress
 * tool use / notifications. We retry once if the first response isn't parseable.
 */
export async function generateSuggestions(system: string, prompt: string): Promise<Suggestion> {
  const jsonInstruction = `\n\nThis is a pure text-generation task. Do NOT use any tools, do NOT notify anyone, do NOT ask questions. Return ONLY a single valid JSON object — no markdown, no code fences, no commentary before or after it — in exactly this shape:\n${SUGGESTION_JSON_EXAMPLE}\nEach option's "text" is the message to send (clean, no surrounding quotes). "tone" is one of: dry, playful, curious, flirty, sincere, bold. Each extractedFacts item is {"fact","category"} with "category" one of: basics, people, interests, tastes, plans, stories, jokes, other.`;
  const sys = system + jsonInstruction;

  let lastParseError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await chat(sys, prompt); // network/HTTP errors propagate immediately
    try {
      const parsed = suggestionSchema.parse(extractJson(raw));
      return {
        ...parsed,
        options: parsed.options.map((o) => ({ ...o, texts: o.texts.map(cleanSendable) })),
      };
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
      const parsed = promptAnswersSchema.parse(extractJson(raw));
      return {
        options: parsed.options.map((o) => ({ ...o, text: cleanSendable(o.text) })),
      };
    } catch (err) {
      lastParseError = err;
    }
  }
  throw new LlmError("Cami did not return usable prompt answers. Try again.", lastParseError);
}

/** Scan a whole thread and return new library facts (strict JSON, with retry). */
export async function extractFactLibrary(system: string, userMsg: string): Promise<ThreadFacts> {
  const jsonInstruction = `\n\nThis is a pure extraction task. Do NOT use tools, notify anyone, or ask questions. Return ONLY a single valid JSON object — no markdown, no commentary — exactly:\n${THREAD_FACTS_JSON_EXAMPLE}\n"category" is one of: basics, people, interests, tastes, plans, stories, jokes, other.`;
  const sys = system + jsonInstruction;

  let lastParseError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    // Re-emitting a whole library needs a big output budget; keep it
    // near-deterministic and allow extra time for long threads.
    const raw = await chat(sys, userMsg, {
      maxTokens: 4000,
      temperature: 0.3,
      timeoutMs: 90000,
    });
    try {
      return threadFactsSchema.parse(extractJson(raw));
    } catch (err) {
      lastParseError = err;
    }
  }
  throw new LlmError("Cami couldn't scan that thread for details. Try again.", lastParseError);
}

/** Read profile screenshot(s) and return approaches + facts (strict JSON, with retry). */
export async function analyzeProfile(
  system: string,
  userMsg: string,
  images: string[],
): Promise<ProfileAnalysis> {
  const jsonInstruction = `\n\nThis is a pure analysis task. Do NOT use tools, notify anyone, or ask questions. Return ONLY a single valid JSON object — no markdown, no commentary — exactly:\n${PROFILE_ANALYSIS_JSON_EXAMPLE}\n"type" is one of: prompt, photo, detail. Each extractedFacts item is {"fact","category"} with "category" one of: basics, people, interests, tastes, plans, stories, jokes, other.`;
  const sys = system + jsonInstruction;

  let lastParseError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await chat(sys, userMsg, {
      images,
      maxTokens: 1400,
      temperature: 0.7,
      timeoutMs: 90000,
    });
    try {
      return profileAnalysisSchema.parse(extractJson(raw));
    } catch (err) {
      lastParseError = err;
    }
  }
  throw new LlmError("Cami couldn't read that profile. Try clearer or fewer screenshots.", lastParseError);
}

/** Write openers for one chosen approach on a profile (strict JSON, with retry). */
export async function generateScanOpeners(
  system: string,
  userMsg: string,
  images: string[],
): Promise<ScanOpeners> {
  const jsonInstruction = `\n\nThis is a pure text task. Do NOT use tools, notify anyone, or ask questions. Return ONLY a single valid JSON object — no markdown, no commentary — exactly:\n${SCAN_OPENERS_JSON_EXAMPLE}\n"tone" is one of: dry, playful, curious, flirty, sincere, bold.`;
  const sys = system + jsonInstruction;

  let lastParseError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await chat(sys, userMsg, {
      images,
      maxTokens: 900,
      temperature: 0.9,
      timeoutMs: 90000,
    });
    try {
      const parsed = scanOpenersSchema.parse(extractJson(raw));
      return {
        openers: parsed.openers.map((o) => ({ ...o, text: cleanSendable(o.text) })),
      };
    } catch (err) {
      lastParseError = err;
    }
  }
  throw new LlmError("Cami couldn't write openers for that approach. Try again.", lastParseError);
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

/* ----------------------- screenshot import (vision) ----------------------- */

/**
 * Slices per vision call. Small batches keep the JSON from truncating and keep
 * enough of the thread in view at once for the model to hold the alignment.
 * Consecutive batches share their edge slice (step = SHOT_BATCH - 1) so a
 * bubble straddling a batch boundary is read whole by one of the two.
 */
const SHOT_BATCH = 3;

type ParsedMsg = { role: Role; content: string };

function normForOverlap(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Append a batch's messages to what we already have, dropping the ones it
 * re-read from the slice it shares with the previous batch.
 *
 * First pass looks for an exact run — the longest suffix of `acc` that is also
 * a prefix of `next`. That is the shape a clean re-read produces. Second pass
 * handles OCR jitter later in the repeat, anchored on two consecutive matches.
 * Roles come from `acc`, the first read of a message being the one that saw
 * more of the thread around it.
 *
 * Both passes fail safe: an unrecognised repeat survives as a duplicate the
 * user can delete in the preview, never as a silently dropped message.
 */
function stitchBatch(acc: ParsedMsg[], next: ParsedMsg[]): ParsedMsg[] {
  if (acc.length === 0) return next;
  if (next.length === 0) return acc;

  const maxRun = Math.min(acc.length, next.length, 20);
  for (let k = maxRun; k > 0; k--) {
    let match = true;
    for (let i = 0; i < k; i++) {
      if (normForOverlap(acc[acc.length - k + i].content) !== normForOverlap(next[i].content)) {
        match = false;
        break;
      }
    }
    if (match) return [...acc, ...next.slice(k)];
  }

  // Fuzzy fallback, for a repeat that starts cleanly then drifts (one word
  // misread mid-run). Anchors on TWO consecutive matches: a single match is
  // not evidence of an overlap — "ouais", "ok" and "lol" recur constantly in a
  // real thread, and dropping on a coincidence would silently eat messages.
  // Erring here costs a visible duplicate, which the user can just delete.
  if (next.length >= 2) {
    const window = Math.min(acc.length, 25);
    for (let j = acc.length - 2; j >= acc.length - window; j--) {
      const repeated = acc.length - j;
      if (repeated > next.length) continue;
      if (
        normForOverlap(acc[j].content) === normForOverlap(next[0].content) &&
        normForOverlap(acc[j + 1].content) === normForOverlap(next[1].content)
      ) {
        return [...acc, ...next.slice(repeated)];
      }
    }
  }

  return [...acc, ...next];
}

const SCREENSHOT_SYSTEM = (them: string) => `You transcribe a chat screenshot into structured messages. The conversation is between the user ("me") and ${them} ("them").

The images are consecutive top-to-bottom slices of one tall phone screenshot (a scroll capture). Read them in the order given: the first slice is higher up the conversation, the last is further down. Top to bottom is oldest to newest.

Consecutive slices deliberately OVERLAP, so the last messages of one slice reappear at the top of the next. Transcribe each message exactly ONCE.

# Who sent it
- Bubbles on the RIGHT side of the screen are "me" (the user).
- Bubbles on the LEFT side are "them" (${them}).
Alignment decides it. Colour is a secondary hint (the user's own bubble is usually the tinted/coloured one, theirs the grey/white one), and avatars only ever appear on the left. If a bubble sits mid-screen, go by which edge it is closer to.

# Transcribe verbatim
Keep the original language, the emoji, the lowercase, the typos, the missing punctuation, the "mdr"/"lol"/"ptn". Do NOT translate, correct, punctuate, summarise, merge or tidy anything. Two short bubbles sent back to back are two messages, not one.

# Ignore everything that is not message text
The phone status bar, the app header and the name/photo at the top, timestamps and date separators, "Delivered"/"Read"/"Seen"/"Sent"/"Vu", typing indicators, emoji reactions stuck to a bubble, "You matched with…", unsent/deleted notices, and the message input box at the bottom.

# Edges and non-text bubbles
If a bubble is cut by a slice edge, use the slice that shows it whole; if neither does, join the two halves into one message. If a bubble holds only an image, sticker, GIF, voice note or link card, write a short bracketed placeholder instead: [photo], [voice note], [gif], [link].

If you genuinely can't tell which side a bubble is on, make your best guess — the user corrects it afterward. Use exactly "me" or "them" for the role.

This is a pure transcription task. Do NOT use tools, do NOT notify anyone, do NOT ask questions. Return ONLY a single JSON object — no markdown, no commentary — in exactly this shape:\n${IMPORTED_THREAD_JSON_EXAMPLE}`;

/**
 * Read a sliced chat screenshot into ordered messages.
 *
 * Batches run one after another rather than concurrently: Cami is a single
 * self-hosted box, and firing four vision calls at it at once is a good way to
 * make all four slow. Each batch also gets the tail of what has been read so
 * far, which lets the model skip the repeat itself; `stitchBatch` is the
 * backstop for when it doesn't.
 *
 * A batch that fails twice stops the run instead of killing it — the caller
 * gets the messages read so far plus `slicesRead`, and surfaces the shortfall.
 */
export async function parseThreadFromScreenshots(
  tiles: string[],
  theirName: string,
): Promise<{ messages: ParsedMsg[]; slicesRead: number; slicesTotal: number }> {
  const them = theirName.trim() || "the other person";
  const system = SCREENSHOT_SYSTEM(them);
  const step = Math.max(1, SHOT_BATCH - 1);

  let acc: ParsedMsg[] = [];
  let slicesRead = 0;
  let lastError: unknown;

  for (let start = 0; start < tiles.length; start += step) {
    const batch = tiles.slice(start, start + SHOT_BATCH);
    if (start > 0 && batch.length <= 1) break; // only the shared slice left, nothing new in it

    const tail = acc.slice(-6).map((m) => `${m.role}: ${m.content}`).join("\n");
    const userMsg = [
      `Slices ${start + 1}-${start + batch.length} of ${tiles.length}, in top-to-bottom order.`,
      start > 0 && tail
        ? `The first slice here is the same one you already read at the end of the last batch. Already transcribed, oldest to newest:\n${tail}\n\nStart from the first message that is NOT in that list.`
        : "",
      "Transcribe the messages visible in these slices, in order.",
    ]
      .filter(Boolean)
      .join("\n\n");

    let batchMessages: ParsedMsg[] | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const content = await chat(system, userMsg, {
          images: batch,
          maxTokens: 4000,
          temperature: 0.2,
          timeoutMs: 120000,
        });
        const parsed = importedThreadSchema.parse(extractJson(content));
        batchMessages = parsed.messages
          .map((m) => ({ role: normalizeRole(m.role), content: m.content.trim() }))
          .filter((m) => m.content.length > 0);
        break;
      } catch (err) {
        lastError = err; // network AND parse failures both just cost this batch a retry
      }
    }

    if (!batchMessages) break; // keep what we have; the caller reports the shortfall
    acc = stitchBatch(acc, batchMessages);
    slicesRead = start + batch.length;
  }

  if (acc.length === 0) {
    // A dead endpoint and an unreadable image fail in the same place. Don't
    // blame the screenshot for a network problem — pass the real cause up.
    if (lastError instanceof LlmError) throw lastError;
    throw new LlmError(
      "Cami couldn't read any messages off that screenshot. Check it's the chat itself, not a profile, and that the text is sharp.",
      lastError,
    );
  }

  return { messages: acc, slicesRead, slicesTotal: tiles.length };
}
