import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject, generateText } from "ai";
import { SUGGESTION_JSON_EXAMPLE, suggestionSchema, type Suggestion } from "./schema";

const provider = createOpenAICompatible({
  name: "hermes",
  baseURL: process.env.LLM_BASE_URL ?? "http://localhost:1234/v1",
  apiKey: process.env.LLM_API_KEY ?? "not-needed",
});

const MODEL_ID = process.env.LLM_MODEL ?? "hermes-4";
const TEMPERATURE = Number(process.env.LLM_TEMPERATURE ?? "0.9");
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? "60000");

export const model = provider.chatModel(MODEL_ID);

export class LlmError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

/**
 * Generate reply suggestions. Tries native structured output first; if the
 * endpoint doesn't support JSON-schema/JSON mode, falls back to plain text and
 * parses the JSON out of the response.
 */
export async function generateSuggestions(
  system: string,
  prompt: string,
): Promise<Suggestion> {
  try {
    const { object } = await generateObject({
      model,
      schema: suggestionSchema,
      system,
      prompt,
      temperature: TEMPERATURE,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return object;
  } catch (structuredErr) {
    try {
      return await generateViaText(system, prompt);
    } catch (textErr) {
      throw new LlmError(
        "The LLM endpoint could not be reached or returned an unusable response.",
        textErr ?? structuredErr,
      );
    }
  }
}

async function generateViaText(system: string, prompt: string): Promise<Suggestion> {
  const jsonInstruction = `\n\nIMPORTANT: Respond with ONLY a single JSON object — no prose, no explanation, no markdown code fences. Use exactly this shape:\n${SUGGESTION_JSON_EXAMPLE}`;
  const { text } = await generateText({
    model,
    system: system + jsonInstruction,
    prompt,
    temperature: TEMPERATURE,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return suggestionSchema.parse(extractJson(text));
}

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
