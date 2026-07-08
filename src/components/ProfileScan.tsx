"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ProfileAnalysisResult, ScanApproach } from "@/lib/api";
import { cx } from "@/lib/cx";
import {
  DUR,
  EASE_INK,
  MotionButton,
  SPRING_MICRO,
  fadeUp,
  rm,
  suggestionCardVariants,
  useAppReducedMotion,
} from "@/components/motion";
import { IconCheck, IconClose, IconCopy, IconRefresh, IconScan, IconSparkles } from "./icons";
import {
  Chip,
  EmptyState,
  IconButton,
  Input,
  SectionLabel,
  Spinner,
  Tag,
  buttonClass,
  cardClass,
  focusRing,
} from "./ui";

/* ── Tone → tone ink (DESIGN.md §2 tone table; §5 pill recipe:
   tone/12% fill, tone/30 ring, full-value text, sentence case) ── */
const TONE_CHIP: Record<string, string> = {
  dry: "bg-tone-dry/12 text-tone-dry ring-tone-dry/30",
  playful: "bg-tone-playful/12 text-tone-playful ring-tone-playful/30",
  curious: "bg-tone-curious/12 text-tone-curious ring-tone-curious/30",
  flirty: "bg-tone-flirty/12 text-tone-flirty ring-tone-flirty/30",
  sincere: "bg-tone-sincere/12 text-tone-sincere ring-tone-sincere/30",
  bold: "bg-tone-bold/12 text-tone-bold ring-tone-bold/30",
};
const toneChipClass = (t: string) =>
  cx(
    "inline-flex min-w-0 items-center rounded-full px-2.5 py-0.5 text-folio ring-1",
    TONE_CHIP[t.toLowerCase().trim()] ?? "bg-fill text-ink-secondary ring-line-strong",
  );

const PLATFORMS = ["Hinge", "Tinder", "Bumble"];
const LANGUAGES = ["Français", "English", "Español", "Italiano"];
const MOODS = ["funny", "flirty", "dry", "sincere", "curious", "bold"];

/* Match Strike (§6.8): the check flares gold, cools to laurel. Compiled
   values of --color-accent / --color-laurel — motion can't interpolate
   var() strings. */
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

async function fileToResizedDataUrl(file: File, max = 1280, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

type Img = { id: string; url: string };
type Opener = { text: string; tone: string };

export function ProfileScan({
  onAnalyze,
  onOpeners,
  onStart,
}: {
  onAnalyze: (data: {
    images: string[];
    language: string;
    platform: string;
  }) => Promise<ProfileAnalysisResult>;
  onOpeners: (data: {
    images: string[];
    approach: ScanApproach;
    mood: string;
    language: string;
    platform: string;
    count?: number;
    avoid?: string[];
  }) => Promise<{ openers: Opener[] }>;
  onStart: (data: {
    name: string;
    platform: string;
    facts: Array<{ fact: string; category?: string }>;
    opener: string;
  }) => void;
}) {
  const reduced = useAppReducedMotion();
  const [images, setImages] = useState<Img[]>([]);
  const [platform, setPlatform] = useState("Hinge");
  const [language, setLanguage] = useState("Français");
  const [mood, setMood] = useState("");
  const [analysis, setAnalysis] = useState<ProfileAnalysisResult | null>(null);
  const [openers, setOpeners] = useState<Record<number, Opener[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // "Write openers" busy per approach; regenerate-one busy per "approach:opener" key.
  const [writing, setWriting] = useState<number[]>([]);
  const [regenKeys, setRegenKeys] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  // Bumped on every scan; in-flight opener requests from a previous scan
  // check it before touching state so stale responses are dropped.
  const scanGen = useRef(0);

  const addFiles = useCallback(async (files: File[]) => {
    for (const f of files.filter((f) => f.type.startsWith("image/"))) {
      try {
        const url = await fileToResizedDataUrl(f);
        setImages((prev) =>
          prev.length >= 6 ? prev : [...prev, { id: `${Date.now()}-${prev.length}-${url.length}`, url }],
        );
      } catch {
        /* skip unreadable file */
      }
    }
  }, []);

  // Paste a screenshot anywhere in this view.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
        .map((it) => it.getAsFile())
        .filter((f): f is File => !!f);
      if (files.length) {
        e.preventDefault();
        void addFiles(files);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  // The aurora surges while screenshots hover over the dropzone (§8 Scan).
  // Guarded: if the LLM in-flight counter already lit it, leave it alone.
  useEffect(() => {
    if (!dragOver) return;
    const backdrop = document.querySelector(".app-backdrop");
    if (!backdrop || backdrop.classList.contains("speaking")) return;
    backdrop.classList.add("speaking");
    return () => backdrop.classList.remove("speaking");
  }, [dragOver]);

  const canScan = images.length > 0 && !loading;

  async function scan() {
    if (images.length === 0) return;
    scanGen.current += 1;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setOpeners({});
    setWriting([]);
    setRegenKeys([]);
    try {
      setAnalysis(await onAnalyze({ images: images.map((i) => i.url), language, platform }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not scan the profile.");
    } finally {
      setLoading(false);
    }
  }

  async function writeOpeners(ai: number) {
    if (!analysis) return;
    const approach = analysis.approaches[ai];
    if (!approach) return;
    const gen = scanGen.current;
    setWriting((prev) => [...prev, ai]);
    setError(null);
    try {
      const res = await onOpeners({
        images: images.map((x) => x.url),
        approach,
        mood,
        language,
        platform,
        avoid: openers[ai]?.map((o) => o.text),
      });
      if (gen !== scanGen.current) return; // stale: a new scan replaced this analysis
      setOpeners((prev) => ({ ...prev, [ai]: res.openers }));
    } catch (e) {
      if (gen !== scanGen.current) return;
      setError(e instanceof Error ? e.message : "Could not write the openers.");
    } finally {
      if (gen === scanGen.current) setWriting((prev) => prev.filter((x) => x !== ai));
    }
  }

  async function regenerateOne(ai: number, oi: number) {
    if (!analysis) return;
    const approach = analysis.approaches[ai];
    const current = openers[ai];
    if (!approach || !current) return;
    const key = `${ai}:${oi}`;
    const gen = scanGen.current;
    setRegenKeys((prev) => [...prev, key]);
    try {
      const res = await onOpeners({
        images: images.map((x) => x.url),
        approach,
        mood,
        language,
        platform,
        count: 1,
        avoid: current.map((o) => o.text),
      });
      if (gen !== scanGen.current) return; // stale: a new scan replaced this analysis
      const next = res.openers[0];
      if (next) {
        setOpeners((prev) => ({
          ...prev,
          [ai]: (prev[ai] ?? []).map((o, idx) => (idx === oi ? next : o)),
        }));
      }
    } catch (e) {
      if (gen !== scanGen.current) return;
      setError(e instanceof Error ? e.message : "Could not regenerate.");
    } finally {
      if (gen === scanGen.current) setRegenKeys((prev) => prev.filter((k) => k !== key));
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  const groupLabel = "mb-1.5 block text-folio text-ink-muted";

  /* ── Motion recipes (all rm-gated) ── */
  const cardVariants = rm(reduced, suggestionCardVariants);
  const errorVariants = rm(reduced, fadeUp(6));
  const emptyVariants = rm(reduced, fadeUp(6));
  const openerVariants = rm(reduced, fadeUp(6));
  const skeletonVariants = rm(reduced, {
    initial: { opacity: 0, filter: "blur(0px)" },
    enter: { opacity: 1, filter: "blur(0px)", transition: { duration: DUR.leaf, ease: EASE_INK } },
    exit: { opacity: 0, filter: "blur(2px)", transition: { duration: DUR.hair, ease: EASE_INK } },
  });
  const resultVariants = rm(reduced, {
    initial: { opacity: 0 },
    enter: { opacity: 1, transition: { duration: DUR.leaf, ease: EASE_INK } },
    exit: { opacity: 0, transition: { duration: DUR.hair, ease: EASE_INK } },
  });

  // Deal-out order across the result cards: read → approaches → facts.
  const approachBase = analysis?.read ? 1 : 0;
  const factsIdx = approachBase + (analysis?.approaches.length ?? 0);
  const anyOpeners = Object.values(openers).some((list) => list.length > 0);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pb-[calc(3rem_+_env(safe-area-inset-bottom))] pt-10 sm:px-6">
        {/* ── Scene masthead — glow-dot kicker over the scene title (§8) ── */}
        <header>
          <SectionLabel>Profile scan</SectionLabel>
          <h1 className="mt-3 text-scene text-ink">Scan a profile</h1>
          <p className="mt-1.5 text-body text-ink-muted">
            Screenshots in, openers out.
          </p>
        </header>

        {/* ── Upload & controls ── */}
        <section className={cx(cardClass, "space-y-5 p-4 sm:p-5")}>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void addFiles(Array.from(e.dataTransfer.files));
            }}
            className={cx(
              "group flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed bg-[rgb(255_255_255_/_0.03)] px-4 py-9 text-center shadow-[var(--shadow-plate)] transition-colors duration-150",
              dragOver
                ? "border-line-gilt bg-accent-faint"
                : "border-line-strong hover:border-line-gilt hover:bg-fill",
            )}
          >
            <IconScan
              size={22}
              className={cx(
                "transition-colors duration-150",
                dragOver ? "text-accent" : "text-ink-muted group-hover:text-accent",
              )}
            />
            <span className="text-title text-ink-secondary">
              Drop screenshots here
            </span>
            <span className="text-label text-ink-muted">
              Drop, paste, or click to add her profile screenshots (up to 6)
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void addFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </label>

          {images.length > 0 && (
            <div>
              <div className="flex flex-wrap gap-2.5">
                <AnimatePresence mode="popLayout" initial={false}>
                  {images.map((img) => (
                    <motion.div
                      key={img.id}
                      layout={!reduced}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                      animate={
                        reduced
                          ? { opacity: 1, transition: { duration: 0.12 } }
                          : { opacity: 1, scale: 1, transition: SPRING_MICRO }
                      }
                      exit={
                        reduced
                          ? { opacity: 0, transition: { duration: 0.12 } }
                          : { opacity: 0, scale: 0.9, transition: { duration: 0.14, ease: EASE_INK } }
                      }
                      className="group relative"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt="profile screenshot"
                        className="h-24 w-20 rounded-md border border-line object-cover"
                      />
                      <MotionButton
                        onClick={() => setImages((prev) => prev.filter((x) => x.id !== img.id))}
                        aria-label="Remove screenshot"
                        className={cx(
                          "hit absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-line-strong bg-surface-high text-ink-secondary shadow-[var(--shadow-sm)] transition-colors duration-150 hover:text-danger",
                          focusRing,
                        )}
                      >
                        <IconClose size={11} />
                      </MotionButton>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <p className="mt-2 text-marginalia tabular-nums text-ink-muted">
                {images.length} of 6 added
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
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
          </div>

          <div>
            <label htmlFor="scan-mood" className={groupLabel}>
              Mood <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <Input
              id="scan-mood"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="e.g. playful, a little flirty…"
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

          {/* Scan — this view's one glow (gilt halo + conic ring, Law 4) */}
          <div
            className={cx(
              "rounded-full",
              (canScan || loading) && "shadow-[var(--shadow-gilt)]",
              loading && "wick-ring",
            )}
          >
            <MotionButton
              onClick={scan}
              disabled={!canScan}
              className={buttonClass("primary", "md", "min-h-11 w-full gap-2")}
            >
              {loading ? <Spinner size={14} /> : <IconSparkles size={15} />}
              {analysis ? "Scan again" : "Scan profile"}
            </MotionButton>
          </div>
        </section>

        {/* ── Error ── */}
        <AnimatePresence initial={false}>
          {error && (
            <motion.div
              key="error"
              role="alert"
              variants={errorVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="rounded-md border border-danger/30 bg-danger-soft p-4"
            >
              <p className="text-body font-medium text-danger">Something went wrong.</p>
              <p className="mt-1 text-body text-ink-secondary">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Reading / result / empty ── */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              variants={skeletonVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="space-y-3"
            >
              <p className="animate-thinking px-1">Reading her profile…</p>
              <div className={cx(cardClass, "p-4")}>
                <div className="skeleton h-3.5 w-full" />
                <div className="skeleton mt-2 h-3.5 w-4/5" />
              </div>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className={cx(cardClass, "p-4")}>
                  <div className="flex items-center justify-between">
                    <div className="skeleton h-4 w-36" />
                    <div className="skeleton h-4 w-10" />
                  </div>
                  <div className="skeleton mt-3 h-3.5 w-2/3" />
                  <div className="skeleton mt-2 h-3 w-1/2" />
                </div>
              ))}
            </motion.div>
          ) : analysis ? (
            <motion.div
              key="result"
              variants={resultVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="space-y-6"
            >
              {/* The read — Cyrano's take, set as a quiet pull-quote */}
              {analysis.read && (
                <motion.div
                  custom={0}
                  variants={cardVariants}
                  initial="initial"
                  animate="enter"
                  className="px-1"
                >
                  <div aria-hidden="true" className="h-0.5 w-10 rounded-full bg-line-gilt" />
                  <p className="mt-3 text-[17px] font-medium leading-relaxed text-ink-secondary">
                    {analysis.read}
                  </p>
                </motion.div>
              )}

              {/* Approaches — the ways in */}
              <div className="space-y-3">
                <SectionLabel>Ways to open</SectionLabel>
                {analysis.approaches.map((a, ai) => {
                  const list = openers[ai];
                  const busy = writing.includes(ai);
                  // Any single-opener regen in flight for this approach: block the
                  // approach-level rewrite and the other regen buttons so concurrent
                  // requests can't clobber each other or share a stale avoid list.
                  const regenBusy = regenKeys.some((k) => k.startsWith(`${ai}:`));
                  return (
                    <motion.article
                      key={ai}
                      custom={approachBase + ai}
                      variants={cardVariants}
                      initial="initial"
                      animate="enter"
                      className={cx(cardClass, "p-4 transition-colors duration-150 hover:border-line-strong")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <h3 className="min-w-0 text-title text-ink">
                            {a.angle}
                          </h3>
                          <Tag>{a.type}</Tag>
                        </div>
                        <span className="shrink-0 text-marginalia tabular-nums text-ink-faint">
                          {ai + 1}
                        </span>
                      </div>

                      <blockquote className="mt-2.5 rounded-[10px] border-l-2 border-line-gilt bg-fill py-2 pl-3 pr-3 text-[15px] leading-relaxed text-ink-secondary">
                        “{a.target}”
                      </blockquote>
                      <p className="mt-2 text-body text-ink-muted">{a.reason}</p>

                      <div className="mt-3 flex justify-end">
                        <MotionButton
                          onClick={() => writeOpeners(ai)}
                          disabled={busy || regenBusy}
                          className={buttonClass("ghost", "sm", "gap-1.5")}
                        >
                          {busy ? <Spinner size={13} /> : <IconSparkles size={13} />}
                          {list ? "Rewrite openers" : "Write openers"}
                        </MotionButton>
                      </div>

                      <AnimatePresence initial={false}>
                        {list && list.length > 0 && (
                          <motion.div
                            key="openers"
                            variants={openerVariants}
                            initial="initial"
                            animate="enter"
                            exit="exit"
                            className="mt-3 space-y-2 border-t border-line pt-3"
                          >
                            {list.map((o, oi) => {
                              const key = `${ai}:${oi}`;
                              const oBusy = regenKeys.includes(key);
                              return (
                                <div
                                  key={oi}
                                  className={cx(
                                    "rounded-md border border-line bg-fill p-3 transition-colors duration-150 hover:border-line-strong",
                                    oBusy && "wick-ring",
                                  )}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                                    <span className={toneChipClass(o.tone)}>{o.tone}</span>
                                    <div className="flex items-center gap-1">
                                      <IconButton
                                        label="Regenerate this opener"
                                        onClick={() => regenerateOne(ai, oi)}
                                        disabled={busy || regenBusy}
                                        className="disabled:pointer-events-none disabled:opacity-40"
                                      >
                                        {oBusy ? <Spinner size={13} /> : <IconRefresh size={14} />}
                                      </IconButton>
                                      <MotionButton
                                        onClick={() => copy(o.text, key)}
                                        disabled={oBusy}
                                        className={buttonClass("subtle", "sm")}
                                      >
                                        <CopySwap active={copied === key} reduced={reduced} />
                                      </MotionButton>
                                      {/* Start = a commitment — it carries the garnet gem dot, not gold */}
                                      <MotionButton
                                        onClick={() =>
                                          onStart({
                                            name: analysis.name,
                                            platform,
                                            facts: analysis.extractedFacts,
                                            opener: o.text,
                                          })
                                        }
                                        disabled={oBusy}
                                        className={buttonClass("ghost", "sm", "gap-1.5")}
                                      >
                                        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-seal" />
                                        Start
                                      </MotionButton>
                                    </div>
                                  </div>
                                  <AnimatePresence mode="wait" initial={false}>
                                    <motion.p
                                      key={o.text}
                                      initial={
                                        reduced ? { opacity: 0 } : { opacity: 0, y: 4, filter: "blur(0px)" }
                                      }
                                      animate={
                                        reduced
                                          ? { opacity: oBusy ? 0.4 : 1, transition: { duration: 0.12 } }
                                          : {
                                              opacity: oBusy ? 0.4 : 1,
                                              y: 0,
                                              filter: "blur(0px)",
                                              transition: { duration: DUR.leaf, ease: EASE_INK },
                                            }
                                      }
                                      exit={
                                        reduced
                                          ? { opacity: 0, transition: { duration: 0.12 } }
                                          : {
                                              opacity: 0,
                                              filter: "blur(2px)",
                                              transition: { duration: DUR.hair, ease: EASE_INK },
                                            }
                                      }
                                      className="mt-2.5 text-bubble text-ink"
                                    >
                                      {o.text}
                                    </motion.p>
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.article>
                  );
                })}
                {anyOpeners && (
                  <p className="px-1 pt-1 text-marginalia text-ink-muted">
                    Start opens a new conversation with her — facts saved, opener dropped into the
                    thread and copied.
                  </p>
                )}
              </div>

              {/* Extracted facts — quiet rows, category pill right (§8) */}
              {analysis.extractedFacts.length > 0 && (
                <motion.div
                  custom={factsIdx}
                  variants={cardVariants}
                  initial="initial"
                  animate="enter"
                  className={cx(cardClass, "p-4")}
                >
                  <div className="text-folio text-ink-secondary">Picked up about her</div>
                  <ul className="mt-3 space-y-1.5">
                    {analysis.extractedFacts.map((f, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 text-body text-ink-secondary">{f.fact}</span>
                        {f.category ? <Tag className="shrink-0">{f.category}</Tag> : null}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </motion.div>
          ) : !error ? (
            <motion.div
              key="empty"
              variants={emptyVariants}
              initial="initial"
              animate="enter"
              exit="exit"
            >
              <EmptyState title="Find your way in">
                Add her profile screenshots and scan. Cami reads the prompts and photos, maps out
                a few ways to open, and writes openers in your voice for whichever one you pick.
              </EmptyState>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
