import { z } from "zod";

export const replyOptionSchema = z.object({
  text: z
    .string()
    .describe("the reply itself, written in my first-person voice, ready to copy and send"),
  tone: z
    .string()
    .describe("one tone label from exactly this set: dry, playful, curious, flirty, sincere, bold"),
});

export const suggestionSchema = z.object({
  options: z
    .array(replyOptionSchema)
    .min(1)
    .describe("a few distinct reply options, each with a slightly different angle"),
  extractedFacts: z
    .array(z.string())
    .describe(
      "new, durable facts learned about the other person from their latest message(s); empty array if nothing new",
    ),
});

export type Suggestion = z.infer<typeof suggestionSchema>;

/** A compact example of the expected JSON, used in the text-mode fallback. */
export const SUGGESTION_JSON_EXAMPLE =
  '{"options":[{"text":"...","tone":"dry"},{"text":"...","tone":"curious"}],"extractedFacts":["..."]}';
