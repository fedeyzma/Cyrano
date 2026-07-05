import { z } from "zod";
import { FACT_CATEGORIES } from "./types";

/**
 * One extracted fact for the per-person library. Cami has no structured-output
 * guarantee, so accept either {fact, category} or a bare string (legacy shape)
 * and normalize to the object; the category string is mapped onto the fixed
 * set later via normalizeFactCategory.
 */
export const extractedFactSchema = z
  .union([
    z.string(),
    z.object({
      fact: z.string().describe("one short third-person detail about them"),
      category: z
        .string()
        .optional()
        .describe(`one of: ${FACT_CATEGORIES.join(", ")}`),
    }),
  ])
  .transform((v) => (typeof v === "string" ? { fact: v, category: undefined } : v));

export type ExtractedFact = z.infer<typeof extractedFactSchema>;

export const replyOptionSchema = z.object({
  texts: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe(
      "the reply as 1-3 short back-to-back texts in my first-person voice, ready to send; usually just one",
    ),
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
    .array(extractedFactSchema)
    .describe(
      "new durable details learned about the other person from their latest message(s), each with a category; empty array if nothing new",
    ),
});

export type Suggestion = z.infer<typeof suggestionSchema>;

/** A compact example of the expected JSON, used in the text-mode fallback. */
export const SUGGESTION_JSON_EXAMPLE =
  '{"options":[{"texts":["..."],"tone":"dry"},{"texts":["wait","actually no"],"tone":"playful"}],"extractedFacts":[{"fact":"has a corgi named Biscuit","category":"people"}]}';

/** Full-thread fact scan: every durable detail about them, categorized. */
export const threadFactsSchema = z.object({
  facts: z
    .array(extractedFactSchema)
    .describe("every new durable detail about them found in the thread; empty if none"),
  refiled: z
    .array(z.object({ id: z.number(), category: z.string() }))
    .optional()
    .describe("category assignments for the saved-but-unfiled facts listed by id"),
});

export type ThreadFacts = z.infer<typeof threadFactsSchema>;

export const THREAD_FACTS_JSON_EXAMPLE =
  '{"facts":[{"fact":"works as an ICU nurse","category":"basics"},{"fact":"her cat is named Miso","category":"people"}],"refiled":[{"id":12,"category":"interests"}]}';

/** Shape returned when the LLM parses a raw pasted thread into messages. */
export const importedThreadSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.string().describe('"me" for the user, "them" for the other person'),
        content: z.string(),
      }),
    )
    .describe("the conversation split into individual messages, in order"),
});

export type ImportedThread = z.infer<typeof importedThreadSchema>;

export const IMPORTED_THREAD_JSON_EXAMPLE =
  '{"messages":[{"role":"them","content":"hey how was your weekend"},{"role":"me","content":"good, climbed a bit. you?"}]}';

/** Answers to a dating-app profile prompt. */
export const promptAnswersSchema = z.object({
  options: z
    .array(
      z.object({
        text: z.string().describe("the profile-prompt answer, ready to paste"),
        angle: z
          .string()
          .describe("one-word angle label, e.g. funny, flirty, sincere, dry, bold, curious"),
      }),
    )
    .min(1)
    .describe("a few distinct profile-prompt answers, each a different angle"),
});

export type PromptAnswers = z.infer<typeof promptAnswersSchema>;

export const PROMPT_ANSWERS_JSON_EXAMPLE =
  '{"options":[{"text":"...","angle":"funny"},{"text":"...","angle":"sincere"}]}';

/** Result of scanning dating-profile screenshot(s) for an opener. */
export const profileScanSchema = z.object({
  name: z.string().describe("her first name if visible in the profile, else empty string"),
  read: z.string().describe("a 1-2 line read of who she seems to be, used to ground the openers"),
  pick: z.object({
    target: z
      .string()
      .describe("the single best thing to open on — quote the prompt answer, or describe the photo/detail"),
    type: z.string().describe("one of: prompt, photo, bio, detail"),
    reason: z.string().describe("a short why this is the best hook"),
  }),
  openers: z
    .array(
      z.object({
        text: z.string().describe("the opener message to send, ready to paste"),
        tone: z.string().describe("one tone: dry, playful, curious, flirty, sincere, bold"),
      }),
    )
    .min(1)
    .describe("a few distinct opener options that reference the hook"),
  extractedFacts: z
    .array(extractedFactSchema)
    .describe(
      "durable facts about HER from the profile (job, hometown, interests, pet), each with a category; empty if none",
    ),
});

export type ProfileScan = z.infer<typeof profileScanSchema>;

export const PROFILE_SCAN_JSON_EXAMPLE =
  '{"name":"","read":"...","pick":{"target":"...","type":"prompt","reason":"..."},"openers":[{"text":"...","tone":"playful"}],"extractedFacts":[{"fact":"...","category":"interests"}]}';
