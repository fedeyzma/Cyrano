"use client";

import { useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { cx } from "@/lib/cx";
import { PROFILE_PROMPTS } from "@/lib/hingePrompts";
import {
  DUR,
  EASE_INK,
  MotionButton,
  SPRING_SHEET,
  fadeUp,
  rm,
  suggestionCardVariants,
  useAppReducedMotion,
} from "@/components/motion";
import { IconCheck, IconChevronDown, IconCopy, IconRefresh, IconSparkles } from "./icons";
import {
  Chip,
  EmptyState,
  IconButton,
  Input,
  SectionLabel,
  Spinner,
  buttonClass,
  cardClass,
  inputClass,
} from "./ui";

type Answer = { text: string; angle: string };

/* ── Angle → tone ink (DESIGN.md §2 tone table; §5 pill recipe:
   tone/12% fill, tone/30 ring, full-value text, sentence case) ── */
const TONE_CHIP: Record<string, string> = {
  dry: "bg-tone-dry/12 text-tone-dry ring-tone-dry/30",
  funny: "bg-tone-playful/12 text-tone-playful ring-tone-playful/30",
  playful: "bg-tone-playful/12 text-tone-playful ring-tone-playful/30",
  curious: "bg-tone-curious/12 text-tone-curious ring-tone-curious/30",
  chill: "bg-tone-curious/12 text-tone-curious ring-tone-curious/30",
  flirty: "bg-tone-flirty/12 text-tone-flirty ring-tone-flirty/30",
  sincere: "bg-tone-sincere/12 text-tone-sincere ring-tone-sincere/30",
  adventurous: "bg-tone-sincere/12 text-tone-sincere ring-tone-sincere/30",
  bold: "bg-tone-bold/12 text-tone-bold ring-tone-bold/30",
};
function toneChipClass(angle: string): string {
  return cx(
    "inline-flex min-w-0 items-center rounded-full px-2.5 py-0.5 text-folio ring-1",
    TONE_CHIP[angle.toLowerCase().trim()] ?? "bg-fill text-ink-secondary ring-line-strong",
  );
}

const PLATFORMS = ["Hinge", "Tinder", "Bumble"];
const LANGUAGES = ["Français", "English", "Español", "Italiano"];
const MOODS = ["funny", "flirty", "dry", "sincere", "adventurous", "chill", "bold"];
const CUSTOM = "Custom prompt…";

/* Skeleton cards — reserved at final size so arrival is a crossfade, then
   they Melt out (§7A.1). */
const skeletonGroupVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: DUR.hair, ease: EASE_INK } },
  exit: { opacity: 0, filter: "blur(2px)", transition: { duration: DUR.hair, ease: EASE_INK } },
};

/* The results panel rises as one glass pane; cards float in within (§7A.2). */
const resultsPanelVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  enter: { opacity: 1, y: 0, transition: SPRING_SHEET },
  exit: { opacity: 0, transition: { duration: DUR.hair, ease: EASE_INK } },
};

/* Match Strike (§6.8): the copy glyph swaps to a check that flares gold and
   cools to laurel. Colors are the compiled values of --color-accent /
   --color-laurel (motion can't interpolate var() strings). */
const STRIKE_FLARE = "#FFD37E";
const STRIKE_COOL = "#7DE8B4";

function CopySwap({ active, reduced }: { active: boolean; reduced: boolean }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {active ? (
        <motion.span
          key="struck"
          className="inline-flex items-center gap-1"
          initial={reduced ? { opacity: 0, color: STRIKE_COOL } : { opacity: 0, scale: 0.7, color: STRIKE_FLARE }}
          animate={
            reduced
              ? { opacity: 1, color: STRIKE_COOL, transition: { duration: 0.12 } }
              : { opacity: 1, scale: 1, color: STRIKE_COOL, transition: { duration: 0.4, ease: EASE_INK } }
          }
          exit={{ opacity: 0, transition: { duration: 0.1, ease: EASE_INK } }}
        >
          <IconCheck size={13} /> Copied
        </motion.span>
      ) : (
        <motion.span
          key="copy"
          className="inline-flex items-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.12, ease: EASE_INK } }}
          exit={{ opacity: 0, transition: { duration: 0.08, ease: EASE_INK } }}
        >
          <IconCopy size={13} /> Copy
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function PromptsLab({
  onGenerate,
}: {
  onGenerate: (data: {
    prompt: string;
    mood: string;
    platform: string;
    language: string;
    count?: number;
    avoid?: string[];
  }) => Promise<Answer[]>;
}) {
  const [selected, setSelected] = useState(PROFILE_PROMPTS[0]);
  const [custom, setCustom] = useState("");
  const [platform, setPlatform] = useState("Hinge");
  const [language, setLanguage] = useState("Français");
  const [mood, setMood] = useState("");
  const [options, setOptions] = useState<Answer[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [regenIndex, setRegenIndex] = useState<number | null>(null);

  const reduced = useAppReducedMotion();

  const isCustom = selected === CUSTOM;
  const prompt = (isCustom ? custom : selected).trim();
  const canGenerate = prompt.length > 0 && !loading;

  async function generate() {
    if (!prompt) return;
    setLoading(true);
    setError(null);
    setOptions(null);
    try {
      setOptions(await onGenerate({ prompt, mood, platform, language }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate answers.");
    } finally {
      setLoading(false);
    }
  }

  async function regenerateOne(i: number) {
    if (!options) return;
    setRegenIndex(i);
    try {
      const res = await onGenerate({
        prompt,
        mood,
        platform,
        language,
        count: 1,
        avoid: options.map((o) => o.text),
      });
      if (res[0]) setOptions((prev) => (prev ? prev.map((o, idx) => (idx === i ? res[0] : o)) : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not regenerate.");
    } finally {
      setRegenIndex(null);
    }
  }

  async function copy(text: string, i: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied((c) => (c === i ? null : c)), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  const cardVariants = rm(reduced, suggestionCardVariants);
  const groupLabel = "mb-1.5 block text-folio text-ink-muted";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pb-[calc(3rem_+_env(safe-area-inset-bottom))] pt-10 sm:px-6">
        {/* ── Scene masthead — glow-dot kicker over the scene title (§8) ── */}
        <header>
          <SectionLabel>Profile prompts</SectionLabel>
          <h1 className="mt-3 text-scene text-ink">Prompts</h1>
          <p className="mt-1.5 text-body text-ink-muted">
            Answers in your voice, easy to match on.
          </p>
        </header>

        {/* ── Controls ── */}
        <section className={cx(cardClass, "space-y-5 p-4 sm:p-5")}>
          <div>
            <label htmlFor="prompt-select" className={groupLabel}>
              Prompt
            </label>
            <div className="relative">
              <select
                id="prompt-select"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className={cx(inputClass, "appearance-none pr-9")}
              >
                {PROFILE_PROMPTS.map((p) => (
                  <option key={p} value={p} className="bg-surface">
                    {p}
                  </option>
                ))}
                <option value={CUSTOM} className="bg-surface">
                  {CUSTOM}
                </option>
              </select>
              <IconChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
            </div>
            {isCustom && (
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Type your prompt question…"
                className="mt-2"
              />
            )}
          </div>

          <div>
            <span className={groupLabel}>Platform</span>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <Chip key={p} active={platform === p} onClick={() => setPlatform(p)} className="hit min-h-7">
                  {p}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <span className={groupLabel}>Language</span>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <Chip key={l} active={language === l} onClick={() => setLanguage(l)} className="hit min-h-7">
                  {l}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="prompt-mood" className={groupLabel}>
              Mood / vibe <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <Input
              id="prompt-mood"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="e.g. playful, a bit flirty, show my music side…"
            />
            <div className="mt-2.5 flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <Chip
                  key={m}
                  active={mood === m}
                  onClick={() => setMood((cur) => (cur === m ? "" : m))}
                  className="hit min-h-7"
                >
                  {m}
                </Chip>
              ))}
            </div>
          </div>

          {/* Generate — this view's one glow (gilt halo + conic ring, Law 4) */}
          <div
            className={cx(
              "rounded-full",
              (canGenerate || loading) && "shadow-[var(--shadow-gilt)]",
              loading && "wick-ring",
            )}
          >
            <MotionButton
              onClick={generate}
              disabled={!canGenerate}
              className={buttonClass("primary", "md", "min-h-11 w-full gap-2")}
            >
              {loading ? <Spinner size={14} /> : <IconSparkles size={15} />}
              {options ? "Generate more" : "Generate answers"}
            </MotionButton>
          </div>
        </section>

        {/* ── Error ── */}
        <AnimatePresence initial={false}>
          {error && (
            <motion.div
              key="error"
              role="alert"
              variants={rm(reduced, fadeUp(6))}
              initial="initial"
              animate="enter"
              exit="exit"
              className="rounded-md border border-danger/30 bg-danger-soft p-4"
            >
              <p className="text-body font-medium text-danger">Something went wrong.</p>
              <p className="mt-1 text-body text-ink-secondary">{error}</p>
              <div className="mt-3">
                <MotionButton
                  onClick={generate}
                  disabled={!canGenerate}
                  className={buttonClass("ghost", "sm", "gap-1.5")}
                >
                  <IconRefresh size={13} /> Try again
                </MotionButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Suggestions / skeleton cards / empty ── */}
        <AnimatePresence mode="wait" initial={false}>
          {loading && (
            <motion.div
              key="skeletons"
              variants={rm(reduced, skeletonGroupVariants)}
              initial="initial"
              animate="enter"
              exit="exit"
              className="space-y-3"
            >
              <p className="animate-thinking px-1">Thinking…</p>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={cx(cardClass, "p-4")}>
                  <div className="flex items-center justify-between">
                    <div className="skeleton h-5 w-20 rounded-full" />
                    <div className="skeleton h-4 w-10" />
                  </div>
                  <div className="skeleton mt-4 h-3.5 w-full" />
                  <div className="skeleton mt-2 h-3.5 w-2/3" />
                  <div className="mt-4 border-t border-line pt-3">
                    <div className="skeleton ml-auto h-6 w-28" />
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {!loading && options && (
            <motion.section
              key="results"
              variants={rm(reduced, resultsPanelVariants)}
              initial="initial"
              animate="enter"
              exit="exit"
              className="glass-panel gilt-rule rule-garnet drawing rounded-lg p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-folio text-ink-secondary">Suggestions</h2>
                <span className="rounded-full bg-fill px-2 py-px text-marginalia tabular-nums text-ink-muted">
                  {options.length}
                </span>
              </div>
              <div className="rule-double mt-3" aria-hidden="true" />

              <div className="mt-4 space-y-3">
                {options.map((o, i) => {
                  const busy = regenIndex === i;
                  return (
                    <motion.article
                      key={i}
                      custom={i}
                      variants={cardVariants}
                      initial="initial"
                      animate="enter"
                      className={cx(
                        cardClass,
                        "p-4 transition-colors duration-150 hover:border-line-strong",
                        busy && "wick-ring",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className={toneChipClass(o.angle)}>{o.angle}</span>
                        <span className="shrink-0 text-marginalia tabular-nums text-ink-faint">
                          {i + 1}
                        </span>
                      </div>

                      {/* Melt out → Float In on per-card regenerate (§8) */}
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.p
                          key={o.text}
                          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4, filter: "blur(0px)" }}
                          animate={
                            reduced
                              ? { opacity: busy ? 0.4 : 1, transition: { duration: 0.12 } }
                              : {
                                  opacity: busy ? 0.4 : 1,
                                  y: 0,
                                  filter: "blur(0px)",
                                  transition: { duration: DUR.leaf, ease: EASE_INK },
                                }
                          }
                          exit={
                            reduced
                              ? { opacity: 0, transition: { duration: 0.12 } }
                              : { opacity: 0, filter: "blur(2px)", transition: { duration: DUR.hair, ease: EASE_INK } }
                          }
                          className="mt-3 whitespace-pre-wrap text-bubble text-ink"
                        >
                          {o.text}
                        </motion.p>
                      </AnimatePresence>

                      <div className="mt-4 flex items-center justify-end gap-1 border-t border-line pt-2.5">
                        <IconButton
                          label="Regenerate just this one"
                          onClick={() => regenerateOne(i)}
                          disabled={regenIndex !== null}
                          className="disabled:pointer-events-none disabled:opacity-40"
                        >
                          {busy ? <Spinner size={13} /> : <IconRefresh size={14} />}
                        </IconButton>
                        <MotionButton
                          onClick={() => copy(o.text, i)}
                          disabled={busy}
                          className={buttonClass("subtle", "sm")}
                        >
                          <CopySwap active={copied === i} reduced={reduced} />
                        </MotionButton>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </motion.section>
          )}

          {!loading && !options && !error && (
            <motion.div
              key="empty"
              variants={rm(reduced, fadeUp(6))}
              initial="initial"
              animate="enter"
              exit="exit"
            >
              <EmptyState title="Answers that sound like you">
                Pick a prompt, set a mood, and hit Generate. Every answer is grounded in your
                context file and written to give a match an easy line back.
              </EmptyState>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
