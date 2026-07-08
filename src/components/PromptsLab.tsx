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

/* ── Angle → tone ink (DESIGN.md §2 tone table; warm-rebalanced) ── */
const TONE_CHIP: Record<string, string> = {
  dry: "bg-tone-dry/10 text-tone-dry ring-tone-dry/25",
  funny: "bg-tone-playful/10 text-tone-playful ring-tone-playful/25",
  playful: "bg-tone-playful/10 text-tone-playful ring-tone-playful/25",
  curious: "bg-tone-curious/10 text-tone-curious ring-tone-curious/25",
  chill: "bg-tone-curious/10 text-tone-curious ring-tone-curious/25",
  flirty: "bg-tone-flirty/10 text-tone-flirty ring-tone-flirty/25",
  sincere: "bg-tone-sincere/10 text-tone-sincere ring-tone-sincere/25",
  adventurous: "bg-tone-sincere/10 text-tone-sincere ring-tone-sincere/25",
  bold: "bg-tone-bold/10 text-tone-bold ring-tone-bold/25",
};
function toneChipClass(angle: string): string {
  return cx(
    "inline-flex min-w-0 items-center rounded-xs px-2 py-0.5 text-folio uppercase ring-1",
    TONE_CHIP[angle.toLowerCase().trim()] ?? "bg-fill text-ink-secondary ring-line-strong",
  );
}

const PLATFORMS = ["Hinge", "Tinder", "Bumble"];
const LANGUAGES = ["Français", "English", "Español", "Italiano"];
const MOODS = ["funny", "flirty", "dry", "sincere", "adventurous", "chill", "bold"];
const CUSTOM = "Custom prompt…";

/* Skeleton galleys — reserve final card size, then Melt out (§7A.1). */
const skeletonGroupVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: DUR.hair, ease: EASE_INK } },
  exit: { opacity: 0, filter: "blur(2px)", transition: { duration: DUR.hair, ease: EASE_INK } },
};

/* The proofs panel rises as one plate; cards deal themselves within (§7A.2). */
const proofsPanelVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: SPRING_SHEET },
  exit: { opacity: 0, transition: { duration: DUR.hair, ease: EASE_INK } },
};

/* Match Strike (§6.8): the copy glyph swaps to a check that flares champagne
   and cools to sage. Colors are the compiled values of --color-accent /
   --color-success (motion can't interpolate var() strings). */
const STRIKE_FLARE = "#E4C589";
const STRIKE_SAGE = "#A9C48F";

function CopySwap({ active, reduced }: { active: boolean; reduced: boolean }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {active ? (
        <motion.span
          key="struck"
          className="inline-flex items-center gap-1"
          initial={reduced ? { opacity: 0, color: STRIKE_SAGE } : { opacity: 0, scale: 0.7, color: STRIKE_FLARE }}
          animate={
            reduced
              ? { opacity: 1, color: STRIKE_SAGE, transition: { duration: 0.12 } }
              : { opacity: 1, scale: 1, color: STRIKE_SAGE, transition: { duration: 0.4, ease: EASE_INK } }
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
  const groupLabel = "mb-1.5 block text-folio uppercase text-ink-muted";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pb-[calc(3rem_+_env(safe-area-inset-bottom))] pt-10 sm:px-6">
        {/* ── Scene masthead — kicker over Fraunces title (§8) ── */}
        <header>
          <SectionLabel>Profile prompts</SectionLabel>
          <h1 className="font-display mt-3 text-scene text-ink">The Prompt Desk</h1>
          <p className="font-display mt-1.5 text-marginalia italic text-ink-muted">
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
                placeholder="write the prompt question…"
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
              Mood / vibe{" "}
              <span className="font-display normal-case italic tracking-normal text-ink-muted">— optional</span>
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

          {/* Generate — the one lit object on the desk (gilt glow + wick ring) */}
          <div
            className={cx(
              "rounded-sm",
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
              <p className="font-display text-body italic text-danger">The press jammed mid-run.</p>
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

        {/* ── Proofs / skeleton galleys / empty ── */}
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
              <p className="animate-thinking px-1">Setting type…</p>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={cx(cardClass, "p-4")}>
                  <div className="flex items-center justify-between">
                    <div className="skeleton h-5 w-20 rounded-xs" />
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
              variants={rm(reduced, proofsPanelVariants)}
              initial="initial"
              animate="enter"
              exit="exit"
              className="gilt-rule drawing pt-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-folio uppercase text-ink-muted">The Proofs</h2>
                <span className="font-display text-marginalia italic text-ink-muted [font-variant-numeric:oldstyle-nums]">
                  {options.length} {options.length === 1 ? "answer" : "answers"}, set in your voice
                </span>
              </div>
              <div className="rule-double mt-2" aria-hidden="true" />

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
                        <span className="font-display shrink-0 text-marginalia italic text-ink-faint [font-variant-numeric:oldstyle-nums]">
                          № {i + 1}
                        </span>
                      </div>

                      {/* Melt out → swap in on regenerate (§8 The Galleys) */}
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
                          className={cx(
                            "mt-3 whitespace-pre-wrap text-bubble text-ink",
                            i === 0 && "drop-cap",
                          )}
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
              <EmptyState title="An answer worth opening on.">
                Pick a prompt, set a mood, and generate. Every answer is grounded in your context
                file and written to give a match an easy line back — nothing polished, nothing
                try-hard, just you on a good day.
              </EmptyState>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
