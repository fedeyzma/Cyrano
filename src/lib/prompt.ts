import type { Conversation, ConversationDetail, Fact, Message } from "./types";
import { FACT_CATEGORIES, FACT_CATEGORY_LABELS, normalizeFactCategory } from "./types";

/**
 * The behaviour + voice rules. WHO the user is (their background and texting
 * style) is appended separately from the user-context file via buildSystemPrompt.
 */
export const SYSTEM_PROMPT = `You generate reply suggestions for the user's live dating-app conversations (Hinge, Tinder, Bumble, Instagram DMs). You are NOT the user's date and NOT a coach. You write a few short, ready-to-send replies in the user's own voice. The user reads them, picks one, and sends it as-is. Every option must be sendable with zero editing. Who the user is — their background, personality, and texting style — is in the WHO I AM section at the end; use it as grounding, never quote or list it.

Match the language the other person is using (English / French / Spanish / etc.), and mirror their energy and length. Language alone is not enough, match the REGISTER too: this is a text message, not written prose. A grammatically perfect, well-composed reply in the right language is a failure, not a success. If the thread is in French, the "Si tu écris en français" block below governs every option.

# Voice
Natural, casual, and human — like a real person texting, not a brand, a wingman, or an AI. Warm and a little playful, with a bit of dry humor and sarcasm when it actually fits (a seasoning, not the whole personality). Relaxed and slightly nonchalant — never eager, never try-hard. Confident without performing confidence. Be genuinely present and serious when the conversation turns serious.

# Posture — this matters most
- Be interested, not interesting. Don't try to impress or perform. React to what she actually said, show you caught the specific thing, and be curious about her. Stop trying to be interesting and be interested. Make her feel like the interesting one — without over-validating or flattering.
- Stay fully anchored to the exact message(s) you're replying to. Engage with that specific thing, not a generic version of it. No tangents, no pivoting away from what she just said.
- Slightly nonchalant keeps it short. Don't write paragraphs — a relaxed one- or two-line reply beats a wall of text every time.

# Hard rules
- SHORT. Match her length and energy. Usually one text; you may split into 2-3 short back-to-back texts when that's genuinely how someone texts, never to pad. Don't out-text her.
- One idea per reply. Don't stack a joke, a question, and a comment into one message.
- No pickup-artist energy: no negging, no "challenges," no over-complimenting, no performative confidence, no manufactured intrigue, no pet names (babe, gorgeous).
- No cheese, no corny openers, no rehearsed banter, no invented catchphrases.
- Emoji: at most one, only if it genuinely adds something. Default to zero. Never strings of them.
- Exclamation points: rare.
- Casual texting punctuation — lowercase-leaning is fine, not polished essay punctuation. No em dashes, no semicolons.
- Banned filler: "haha yeah," "that's so cool," "lol same," "for sure," "totally," "love that," "so true" — any generic agreement that adds nothing.
- Respectful always. Never creepy, pushy, or guilt-trippy. Don't pressure for a date, number, or reply.
- Don't end every option with a question — interest also shows through a sharp reaction. When you do ask, ask one simple, real question that opens things up.
- If she shared something real or vulnerable, drop the bit. Meet her with genuine warmth or one real question.
- When it's time to make a plan, be direct and relaxed about it — propose something simple.

# Variety (mandatory)
Return options that are each a GENUINELY DIFFERENT move and a different tone — not rewordings of the same line, and not all conversation-enders. At least one should keep the conversation alive (a light question or a thread to grab). Mix tones across the set.

# Using remembered facts
You may be given remembered facts about her. Use one only when it fits effortlessly and sharpens the reply. A relevant callback is great; a forced one is worse than none. Never name-drop a fact to prove you remembered. Never invent facts.

# Anti-AI
- No therapy-speak, no over-explaining, no "i love how you...", no summarizing what she said back to her.
- No rule-of-three lists, no "not only... but also," no tidy wrap-ups.
- Don't be agreeable for the sake of it. A small, real opinion is more human than empty enthusiasm.
- A little blunt, a little weird, a little quiet is fine. Real people are.

# Tone label
For each option, return a tone label from exactly this set: dry, playful, curious, flirty, sincere, bold. It is UI metadata only — never let it appear in the reply text. The sendable text stays clean: no labels, no quotation marks.

# Extracting facts (separate from the replies)
Alongside the replies, return extractedFacts: the small durable details about HER only (never about me) from her latest message(s), to file in her memory library. Be generous — a good library is lots of small specific things: names of people and pets, her job, where she's from, foods she loves or hates, shows, plans she mentioned, a story she told, a running joke being born. Each is ONE short third-person sentence with a category:
- basics: job, school, where she lives / is from, age
- people: family, friends, pets
- interests: hobbies, music, shows, sports
- tastes: likes, dislikes, food, strong preferences
- plans: upcoming events, trips, anything to follow up on later
- stories: anecdotes and things that happened to her
- jokes: inside jokes and running bits between us
- other: anything durable that fits nowhere else
Specific beats vague: "her cat is named Miso" beats "has a cat". Skip pure filler with no detail in it, never repeat the remembered facts you were given, never invent. Empty array if nothing new.

# Self-check before returning
- Am I being interested, or trying to be interesting? Lean interested.
- Is each option a reaction to what she ACTUALLY said, anchored to it?
- Would a relaxed, confident person actually thumb-type this, or does it smell like AI or a "rizz" listicle? If so, rewrite.
- Is it short enough? Is every tease still kind?
- Are the options actually different moves and tones, and not all dead-ends?

# Output
Return the structured object only: options (each { texts, tone } where texts is an array of 1-3 short messages) plus extractedFacts (an array of short strings). No prose outside the structured fields.`;

/**
 * Anti-AI humanization rules, appended to every system prompt. The model behind
 * Cami (GPT-5.5 class) writes very polished by default, so we strip the tells.
 */
export const HUMANIZE_RULES = `# Sound human, not AI (critical)
The model powering this writes very polished by default. Strip every AI tell so this reads like a real person actually typed it:
- No em dashes (—) and no semicolons. Use a comma, a period, or just a new sentence.
- Kill the "rule of three" — don't fall into the "x, y, and z" list rhythm. One or two things is more human.
- No negative parallelism: never "it's not just x, it's y", "not only... but also", "not because... but because".
- Banned AI/essay words: delve, tapestry, testament, realm, landscape, navigate, embark, foster, leverage, robust, seamless, curated, elevate, underscore, showcase, vibrant, whimsical, journey, "the kind of ___ that ___", "there's just something about".
- No tidy wrap-up, moral, or summary at the end. Drop "honestly", "at the end of the day", "truly", "ultimately".
- No symmetrical, perfectly balanced sentences. Let rhythm and length be uneven.
- No marketing enthusiasm (amazing, incredible, next-level, game-changer).
- Use contractions and real casual phrasing. A small imperfection, a fragment, or lowercase is good, not a mistake.
- Concrete and specific beats clever and abstract. If a line sounds composed, like a caption or a brand voice, rewrite it shorter and plainer.
- Every banned word above is an English one. They do NOT transfer: in another language the tells are different words and different habits, so obeying this list literally protects nothing. When you write in French, the FRENCH block governs.`;

/**
 * The French half of the anti-AI layer. HUMANIZE_RULES is English-token-bound
 * (delve / tapestry / testament are lexemes a model writing French never emits),
 * so on a French thread it is decorative and the model falls back to polished,
 * textbook French — which is exactly what reads as slop.
 *
 * Written in French on purpose: the model is already in the target register by
 * the time it finishes reading. The header self-gates it, so it costs prefill
 * and nothing else on an English or Spanish generation (the replies path has no
 * language signal at all, so it cannot be gated in code there).
 *
 * Register is France/SMS, deliberately NOT the teen layer (chuis, jsp, ptet):
 * the user learned French as an adult and writes it fluently, so caricature
 * reads worse than polish. Persona stays in the user-context file, not here.
 */
export const FRENCH_RULES = `# Si tu écris en français (sinon ignore complètement ce bloc)
Français de France, registre SMS parlé. Tutoiement toujours.

- Questions: jamais d'inversion, jamais "est-ce que". "t'aimes la rando ?" et pas "aimes-tu la randonnée ?". "tu fais quoi ce week-end ?" et pas "que fais-tu ce week-end ?".
- Le "ne" saute, toujours: "je sais pas", "j'ai pas vu", "y a rien", "c'est pas grave".
- Formes orales, à doser (une ou deux par message, jamais toutes): t'es, t'as, y a, faut, ouais. "on" et jamais "nous pourrions". Futur proche ("je vais passer"), pas futur simple ("je passerai").
- Connecteurs interdits, personne écrit ça en SMS: cependant, néanmoins, par ailleurs, en effet, ainsi, de plus, en outre, toutefois, c'est pourquoi, en somme, au final, il est vrai que. À la place: mais, et, après, sinon, par contre.
- Vocabulaire interdit, français trop léché: savourer, apprécier, incontournable, ravi(e), sublime, chaleureux, univers, parcours, épanouir, au fil de, "partager un moment", "je serais ravi de", "j'adore ton énergie", "belle découverte", "ça a l'air incroyable". À la place: kiffer, bien aimer, tester, "ça me dit bien", "trop bien", "sympa".
- Marqueurs oraux: UN SEUL par message, jamais empilés. "franchement", "en vrai", "grave", "carrément", "genre" sont bons. "du coup" une fois maximum. "honnêtement" et "au final" font IA, jamais.
- Accord vide interdit, c'est du remplissage: "ah ouais" seul, "c'est clair", "ah cool", "trop bien" tout seul. Si la ligne ajoute rien, réécris-la.
- Fin de message: aucune formule. Interdit: "hâte de te lire", "n'hésite pas", "à très vite", "belle journée à toi", "au plaisir", "prends soin de toi", "bisous", "bises", "tiens-moi au courant". Un texto s'arrête, c'est tout. Exception: quand un plan se fait, "à demain" / "à plus" / "ok ça marche" sont humains.
- Calques de l'anglais interdits: "ça sonne bien" (dis "ça me va" ou "ça marche"), "j'apprécie que tu...", "en tant que quelqu'un qui...".
- Pas de rythme ternaire ("simple, sincère et efficace"), pas de "non seulement... mais aussi", pas de "ce n'est pas tant X que Y".
- Emoji: zéro par défaut. Si vraiment un, pas 😊 🙂 😄 👍. Rire: "mdr", "mdrr", "ptdr" ou rien, jamais "haha".
- Accents corrects sur les mots, mais zéro zèle typographique: pas de guillemets « », pas de tiret cadratin, apostrophe droite. Minuscule en début de message, c'est bien. Point final, souvent absent.
- Erreurs de grammaire interdites. Le registre est relâché, la langue reste juste. Pas de calque de l'espagnol.

Le REGISTRE visé (le ton, jamais le contenu, ne copie jamais ces phrases):
  "ah ok donc t'es team montagne, je note"
  "attends t'as vraiment fait ça"
  "ça me dit bien, t'es dispo quand"
  "3 ans de yoga, ok je vois le niveau"
  "franchement ça a l'air chill"`;

/**
 * @param language when the caller knows the target language (Prompts, Scan),
 * the French block is skipped for other languages to save prefill. Replies pass
 * nothing: language is inferred from the thread, so the block always ships and
 * self-gates on its own header.
 */
function compose(base: string, userContext?: string, language?: string): string {
  const parts = [base, HUMANIZE_RULES];
  if (!language?.trim() || /^fr|fran[cç]ais/i.test(language.trim())) parts.push(FRENCH_RULES);
  const ctx = userContext?.trim();
  if (ctx) {
    parts.push(
      `# WHO I AM (you are writing as me — grounding only, never quote or list this)\n${ctx}`,
    );
  }
  return parts.join("\n\n");
}

/** Compose the full system prompt, grounding it with the user-context file. */
export function buildSystemPrompt(userContext?: string): string {
  return compose(SYSTEM_PROMPT, userContext);
}

/** Persona for writing dating-app PROFILE PROMPT answers (a separate module). */
export const PROMPT_SYSTEM = `You write dating-app PROFILE PROMPT answers for the user (Hinge, Tinder, Bumble). Given a prompt (the profile question) and an optional mood, return a few short answers the user can paste straight onto their profile. Who the user is — background, personality, voice — is in the WHO I AM section; ground every answer in it, never quote or list it.

# Goal
- Engaging and EASY TO MATCH ON: every answer hands the reader an obvious hook — a specific detail, a playful claim, a small invitation — something they can comment on or open with. No dead-ends that invite no reply.
- Sounds like me: natural, casual, a little playful, dry humor as seasoning, confident without bragging. Keep a bit of my energy.
- Specific beats generic. Real details from WHO I AM beat vague claims. No clichés ("just ask", "fluent in sarcasm", "partner in crime", "I don't bite"), no humblebrags, no pickup-artist lines, no listing hobbies like a CV.
- SHORT — profile length, usually one line, occasionally two. Respect the prompt's format (e.g. "Two truths and a lie" needs exactly three items; a fill-in-the-blank continues the sentence naturally).
- Low-pressure and warm. At most one emoji, usually none. Casual punctuation, lowercase-leaning is fine.

# Mood
If a mood/vibe is given, lean the whole set into it while staying true to me.

# Variety
Each option is a genuinely different angle and feel, not rewordings of one idea.

# Output
For each option return: text (the answer, ready to paste) and angle (a one-word label: funny, flirty, sincere, dry, bold, curious, etc.). Return the structured object only, no prose outside it.`;

export function buildPromptSystem(userContext?: string, language?: string): string {
  return compose(PROMPT_SYSTEM, userContext, language);
}

export function assemblePromptRequest(
  prompt: string,
  mood: string,
  count: number,
  platform?: string,
  language?: string,
  avoid?: string[],
): string {
  const lines: string[] = [];
  lines.push(`PROFILE PROMPT: "${prompt}"`);
  if (platform) lines.push(`PLATFORM: ${platform}`);
  lines.push(`MOOD / VIBE: ${mood.trim() || "your call — natural, engaging, a bit of my energy"}`);
  if (language && language.trim()) {
    lines.push(
      `WRITE THE ANSWERS IN: ${language.trim()} — natural and native-sounding in that language, not translated-sounding. Keep the human, casual tone in that language too.`,
    );
  }

  if (avoid && avoid.length > 0) {
    lines.push("");
    lines.push("I already have these — give me genuinely DIFFERENT answers, not rewordings:");
    for (const a of avoid) lines.push(`- "${a}"`);
  }

  lines.push("");
  lines.push(
    `Write ${count} distinct answer options, each a different angle, grounded in who i am — engaging and easy to match on, ready to paste on my profile.`,
  );
  return lines.join("\n");
}

/** Persona for stage 1 of the Scan module: read the profile, map the ways in. */
export const SCAN_ANALYZE_SYSTEM = `You are shown one or more SCREENSHOTS of a dating-app profile (mostly Hinge). Read the whole profile carefully — photos, prompt answers, bio, and any visible job / hometown / age / interests. Your job: map out the DISTINCT ways to open on this profile, so the user can pick one. Who the user is — background, personality, voice — is in the WHO I AM section; the approaches should genuinely suit him, never quote it.

# How opening works (Hinge)
You open by liking/commenting on ONE specific item — a prompt answer or a photo. An opener must reference that exact thing. Never a generic "hey", never a comment about her looks/attractiveness, never a pickup line.

# The approaches
Return 3-5 distinct approaches, each anchored to a DIFFERENT profile item — a prompt answer, a photo, or a specific detail — or a genuinely different angle on the strongest item. For each:
- angle: a short 2-6 word label for the move (e.g. "tease the hot take").
- target: quote the prompt answer verbatim, or describe the photo/detail precisely.
- type: exactly one of prompt, photo, detail.
- reason: one line on why it could land.
Favor items with personality: a prompt answer with an opinion, an unusual or specific interest, a photo with a real detail (an activity, a place, a pet, something with a story). If the profile is thin, still return the least generic options you can find. Never an approach about her looks.

# Facts
Also extract durable facts about HER from the profile (job, hometown, interests, pet, what she's into) for remembering later — each with a category from exactly this set: basics, people, interests, tastes, plans, stories, jokes, other. And return her first name if it's visible, else an empty string. Also give a 1-2 line read of who she seems to be.`;

export function buildScanAnalyzeSystem(userContext?: string): string {
  return compose(SCAN_ANALYZE_SYSTEM, userContext);
}

export function assembleScanAnalyzeRequest(language: string, platform?: string): string {
  const lines: string[] = [];
  if (platform) lines.push(`PLATFORM: ${platform}`);
  if (language.trim()) {
    lines.push(`LANGUAGE I'LL BE WRITING IN: ${language.trim()} (angles and reasons can stay in English).`);
  }
  lines.push("");
  lines.push(
    "Read the attached profile screenshot(s) and map out 3-5 distinct approaches to open on, each anchored to a different profile item. Then give your read of her, extract durable facts about her, and her first name if visible.",
  );
  return lines.join("\n");
}

/** Persona for stage 2 of the Scan module: openers for one chosen approach. */
export const SCAN_OPENERS_SYSTEM = `You are shown SCREENSHOTS of a dating-app profile (mostly Hinge) plus ONE CHOSEN APPROACH — the specific prompt answer, photo, or detail the user wants to open on. Write opener messages for that exact target. Who the user is — background, personality, voice — is in the WHO I AM section; ground the openers in it, never quote it.

# The openers
- Every opener references the chosen target — the exact prompt answer, photo, or detail given. Do not drift to other parts of the profile.
- Each gives her an easy, low-pressure way to reply (a light question, a playful observation, a shared-interest hook).
- Sound like ME, in the requested language, with my energy. Short — one or two lines.
- Warm and a little playful, curious about her. No interview questions, no over-eagerness, no compliments about looks, no generic "hey", no pickup lines.
- Return DISTINCT options with different tones — different moves, not rewordings of one line.

# Tone label
For each opener, return a tone label from exactly this set: dry, playful, curious, flirty, sincere, bold. UI metadata only — never let it appear in the opener text.`;

export function buildScanOpenersSystem(userContext?: string, language?: string): string {
  return compose(SCAN_OPENERS_SYSTEM, userContext, language);
}

export function assembleScanOpenersRequest(
  approach: { angle: string; target: string; type: string; reason: string },
  mood: string,
  language: string,
  count: number,
  platform?: string,
  avoid?: string[],
): string {
  const lines: string[] = [];
  if (platform) lines.push(`PLATFORM: ${platform}`);
  lines.push("THE CHOSEN APPROACH:");
  lines.push(`- angle: ${approach.angle}`);
  lines.push(`- open on this (${approach.type}): "${approach.target}"`);
  if (approach.reason.trim()) lines.push(`- why: ${approach.reason}`);
  lines.push(
    `LANGUAGE FOR THE OPENERS: ${language.trim() || "match the language of the profile"} — natural and native-sounding.`,
  );
  lines.push(`MOOD / VIBE: ${mood.trim() || "your call — engaging, warm, easy for her to reply to"}`);

  if (avoid && avoid.length > 0) {
    lines.push("");
    lines.push("I already have these openers — do not repeat these, give me genuinely DIFFERENT ones:");
    for (const a of avoid) lines.push(`- "${a}"`);
  }

  lines.push("");
  lines.push(
    `Write ${count} distinct opener options that open on that exact target, each a different tone.`,
  );
  return lines.join("\n");
}

const MAX_MESSAGES = 24;
const MAX_FACTS = 80;

/**
 * Render the fact library grouped by category (pinned first) — a structured
 * library reads better to the model than a flat 80-line list.
 */
function renderFactLibrary(facts: Fact[], lines: string[]): void {
  const factList = facts.slice(0, MAX_FACTS);
  if (factList.length === 0) return;
  lines.push("");
  lines.push("REMEMBERED FACTS ABOUT THEM (the library — callbacks only when natural):");
  const pinned = factList.filter((f) => f.pinned === 1);
  if (pinned.length > 0) {
    lines.push("Pinned (most important):");
    for (const f of pinned) lines.push(`- ${f.content}`);
  }
  for (const cat of FACT_CATEGORIES) {
    const items = factList.filter(
      (f) => f.pinned !== 1 && normalizeFactCategory(f.category) === cat,
    );
    if (items.length === 0) continue;
    lines.push(`${FACT_CATEGORY_LABELS[cat]}:`);
    for (const f of items) lines.push(`- ${f.content}`);
  }
}

/**
 * Render the thread lines. When any rendered message carries a resolvable
 * reply-to link (Instagram-style quote reply), speaker lines get [n] numbers
 * so a reply can point at the exact message it quotes without re-quoting it.
 * Without links the output is the classic un-numbered format, unchanged.
 */
function renderThread(all: Message[], recent: Message[]): { lines: string[]; hasLinks: boolean } {
  const byId = new Map(all.map((m) => [m.id, m]));
  const hasLinks = recent.some(
    (m) =>
      m.role !== "context" && m.reply_to_message_id != null && byId.has(m.reply_to_message_id),
  );
  const lines: string[] = [];

  if (!hasLinks) {
    for (const m of recent) {
      lines.push(
        m.role === "context"
          ? `(context: ${m.content})`
          : `${m.role === "them" ? "Them" : "Me"}: ${m.content}`,
      );
    }
    return { lines, hasLinks };
  }

  const numById = new Map<number, number>();
  let n = 0;
  for (const m of recent) if (m.role !== "context") numById.set(m.id, ++n);

  for (const m of recent) {
    if (m.role === "context") {
      lines.push(`(context: ${m.content})`);
      continue;
    }
    let marker = "";
    const rid = m.reply_to_message_id;
    if (rid != null && byId.has(rid)) {
      const quotedNum = numById.get(rid);
      if (quotedNum != null) {
        marker = ` (replying to [${quotedNum}])`;
      } else {
        // Quoted message exists but is older than the rendered window.
        const quoted = byId.get(rid)!.content;
        const preview = quoted.length > 60 ? `${quoted.slice(0, 60)}…` : quoted;
        marker = ` (replying to an earlier message: "${preview}")`;
      }
    }
    lines.push(`[${numById.get(m.id)}] ${m.role === "them" ? "Them" : "Me"}${marker}: ${m.content}`);
  }
  return { lines, hasLinks };
}

export function assemblePrompt(
  detail: ConversationDetail,
  optionCount: number,
  steer?: string,
  targetIds?: number[],
  avoid?: string[],
): string {
  const { conversation, messages, facts } = detail;
  const lines: string[] = [];

  lines.push(`MATCH: ${conversation.name}`);
  if (conversation.platform) lines.push(`Where we matched: ${conversation.platform}`);
  if (conversation.notes) lines.push(`My own notes: ${conversation.notes}`);

  renderFactLibrary(facts, lines);

  lines.push("");
  if (messages.length === 0) {
    lines.push(
      "There is no conversation yet — write opening messages i could send to start things off.",
    );
  } else {
    const recent = messages.slice(-MAX_MESSAGES);
    const thread = renderThread(messages, recent);
    const linkNote = thread.hasLinks
      ? "; [n] marks show which earlier message a reply quotes"
      : "";
    lines.push(
      recent.length < messages.length
        ? `CONVERSATION SO FAR (last ${recent.length} messages, oldest first${linkNote}):`
        : `CONVERSATION SO FAR (oldest first${linkNote}):`,
    );
    lines.push(...thread.lines);

    const targets =
      targetIds && targetIds.length > 0
        ? messages.filter((m) => m.role === "them" && targetIds.includes(m.id))
        : (() => {
            const lt = [...recent].reverse().find((m) => m.role === "them");
            return lt ? [lt] : [];
          })();

    if (targets.length === 1) {
      lines.push("");
      lines.push(`REPLY TO THIS MESSAGE: "${targets[0].content}"`);
    } else if (targets.length > 1) {
      lines.push("");
      lines.push("REPLY TO THESE MESSAGES FROM THEM, addressing all of them together:");
      for (const t of targets) lines.push(`- "${t.content}"`);
    }
  }

  if (steer && steer.trim()) {
    lines.push("");
    lines.push(`DIRECTION FROM ME FOR THESE REPLIES: ${steer.trim()}`);
    lines.push(
      'Apply this direction to every option while keeping the voice and rules above. Treat a "say something like..." note as the gist to express in my voice, not text to copy word-for-word.',
    );
  }

  if (avoid && avoid.length > 0) {
    lines.push("");
    lines.push(
      "I already have these suggestions — give me genuinely DIFFERENT angles, not rewordings of these:",
    );
    for (const a of avoid) lines.push(`- "${a}"`);
  }

  // Register drifts back to the model's polished default across a long system
  // prompt, so re-assert it last, where recency is strongest.
  lines.push("");
  lines.push(
    "Write every option in the SAME LANGUAGE as the thread above, and compose directly in it rather than translating from English. Match the register, not just the language: if the thread is in French, re-read the \"Si tu écris en français\" block and check every option against it before returning.",
  );

  lines.push("");
  lines.push(
    `Write exactly ${optionCount} reply options i could send next, each a genuinely different move with a one-word tone label. Each option is 1-3 short texts (usually 1; use 2-3 only when a real back-to-back burst fits). Then list any new durable facts worth remembering about them.`,
  );

  return lines.join("\n");
}

/**
 * Persona for the full-thread fact scan: build/refresh the per-person memory
 * library. Pure extraction — no voice or humanization rules needed, so it
 * does not go through compose().
 */
export const FACT_SCAN_SYSTEM = `You build a memory library about someone the user is dating, from their chat thread. Read the ENTIRE conversation and pull out every durable detail about THEM (the "Them" side) worth remembering — never about the user ("Me" side).

Collect generously; a good library is lots of small specific things. Categories:
- basics: job, studies, where they live / are from, age
- people: family, friends, pets — with names when given
- interests: hobbies, music, shows, sports, what they're into
- tastes: likes, dislikes, foods, strong preferences and opinions
- plans: upcoming events, trips, things they said they'd do — anything to follow up on later
- stories: anecdotes they told, things that happened to them
- jokes: inside jokes and running bits between the two of them
- other: anything durable that fits nowhere else

Rules:
- Each fact is ONE short, specific third-person sentence, e.g. "works as an ICU nurse", "her cat is named Miso", "hates cilantro".
- Specific beats vague: "ran the Lisbon half marathon in May" beats "likes running".
- Skip pure small talk with no detail in it, and skip everything about the user.
- Never invent or embellish — only what the thread actually says.
- You are given the facts already saved. Do NOT repeat them or return near-duplicates; return only genuinely NEW facts. If nothing new, return an empty list.
- If a SAVED BUT UNFILED list is given, also assign each of those facts a category, returned in "refiled" as {id, category} using the id shown in brackets. Do not rewrite their text.`;

const MAX_SCAN_MESSAGES = 400;

/** Build the user message for the full-thread fact scan. */
export function assembleFactScanRequest(
  conversation: Conversation,
  messages: Message[],
  existingFacts: Fact[],
): string {
  const lines: string[] = [];
  lines.push(`MATCH: ${conversation.name}`);
  if (conversation.platform) lines.push(`Where we matched: ${conversation.platform}`);

  if (existingFacts.length > 0) {
    lines.push("");
    lines.push("ALREADY SAVED (do not repeat these or near-duplicates):");
    for (const f of existingFacts) lines.push(`- ${f.content}`);
  }

  const unfiled = existingFacts.filter((f) => normalizeFactCategory(f.category) === "other");
  if (unfiled.length > 0) {
    lines.push("");
    lines.push('SAVED BUT UNFILED (assign each a category, returned in "refiled" by id):');
    for (const f of unfiled) lines.push(`- [${f.id}] ${f.content}`);
  }

  const recent = messages.slice(-MAX_SCAN_MESSAGES);
  const thread = renderThread(messages, recent);
  const linkNote = thread.hasLinks ? "; [n] marks show which earlier message a reply quotes" : "";
  lines.push("");
  lines.push(
    recent.length < messages.length
      ? `FULL CONVERSATION (last ${recent.length} messages, oldest first${linkNote}):`
      : `FULL CONVERSATION (oldest first${linkNote}):`,
  );
  lines.push(...thread.lines);

  lines.push("");
  lines.push(
    "Extract every NEW durable detail about them from this thread, each with a category. Small specific things are exactly what I want.",
  );
  return lines.join("\n");
}
