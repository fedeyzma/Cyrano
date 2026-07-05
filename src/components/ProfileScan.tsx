"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ProfileAnalysisResult, ScanApproach } from "@/lib/api";
import { cx } from "@/lib/cx";
import {
  DUR,
  EASE_FADE,
  MotionButton,
  SPRING_MICRO,
  fadeUp,
  rm,
  suggestionCardVariants,
  useAppReducedMotion,
} from "@/components/motion";
import { IconCheck, IconClose, IconCopy, IconRefresh, IconScan, IconSend, IconSparkles } from "./icons";
import { Spinner } from "./ui";

const TONE_STYLES: Record<string, string> = {
  dry: "bg-zinc-500/12 text-zinc-300 ring-zinc-400/25",
  playful: "bg-amber-500/12 text-amber-300 ring-amber-400/25",
  curious: "bg-sky-500/12 text-sky-300 ring-sky-400/25",
  flirty: "bg-rose-500/12 text-rose-300 ring-rose-400/25",
  sincere: "bg-emerald-500/12 text-emerald-300 ring-emerald-400/25",
  bold: "bg-violet-500/12 text-violet-300 ring-violet-400/25",
};
const toneStyle = (t: string) =>
  TONE_STYLES[t.toLowerCase().trim()] ?? "bg-fill text-ink-secondary ring-line-strong";

const PLATFORMS = ["Hinge", "Tinder", "Bumble"];
const LANGUAGES = ["Français", "English", "Español", "Italiano"];
const MOODS = ["funny", "flirty", "dry", "sincere", "curious", "bold"];

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

  const labelCls = "mb-1.5 block text-meta font-semibold uppercase tracking-wider text-ink-muted";
  const pill = (active: boolean) =>
    cx(
      "rounded-full px-3 py-1 text-label transition-colors duration-150",
      active
        ? "bg-accent font-medium text-on-accent"
        : "border border-line-strong text-ink-secondary hover:bg-fill hover:text-ink",
    );

  /* ── Motion recipes (all rm-gated) ── */
  const cardVariants = rm(reduced, suggestionCardVariants);
  const errorVariants = rm(reduced, fadeUp(6));
  const emptyVariants = rm(reduced, fadeUp(6));
  const openerVariants = rm(reduced, fadeUp(6));
  const skeletonVariants = rm(reduced, {
    initial: { opacity: 0, filter: "blur(0px)" },
    enter: { opacity: 1, filter: "blur(0px)", transition: { duration: DUR.base, ease: EASE_FADE } },
    exit: { opacity: 0, filter: "blur(3px)", transition: { duration: 0.12, ease: EASE_FADE } },
  });
  const resultVariants = rm(reduced, {
    initial: { opacity: 0 },
    enter: { opacity: 1, transition: { duration: DUR.base, ease: EASE_FADE } },
    exit: { opacity: 0, transition: { duration: DUR.exitFast, ease: EASE_FADE } },
  });

  // Deal-out order across the result cards: read → approaches → facts.
  const approachBase = analysis?.read ? 1 : 0;
  const factsIdx = approachBase + (analysis?.approaches.length ?? 0);
  const anyOpeners = Object.values(openers).some((list) => list.length > 0);

  return (
    <div className="flex h-full flex-col">
      <header className="glass-header flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-6">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent ring-1 ring-line">
          <IconScan size={18} />
        </span>
        <div className="leading-tight">
          <div className="font-display text-scene text-ink">Scan a profile</div>
          <div className="text-meta text-ink-muted">screenshots in, ways to open + openers out</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Upload */}
          <div className="space-y-4 rounded-lg border border-line bg-fill p-4 shadow-highlight">
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
                "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 text-center transition-[transform,background-color,border-color] duration-150 ease-out-soft",
                dragOver
                  ? "scale-[1.01] border-accent/60 bg-accent-faint"
                  : "border-line-strong hover:border-line-accent hover:bg-fill-hover",
              )}
            >
              <span
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent transition-transform duration-150 ease-out-soft group-hover:-translate-y-0.5",
                  dragOver && "-translate-y-1 scale-110",
                )}
              >
                <IconScan size={20} />
              </span>
              <span className="text-sm text-ink-secondary">
                Drop, paste, or click to add profile screenshots
              </span>
              <span className="text-meta text-ink-muted">
                Hinge profiles span a few screens — add them all (up to 6)
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
              <div className="flex flex-wrap gap-2">
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
                          : { opacity: 0, scale: 0.9, transition: { duration: 0.14, ease: EASE_FADE } }
                      }
                      className="group relative"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt="profile screenshot"
                        className="h-24 w-20 rounded-md object-cover ring-1 ring-line"
                      />
                      <MotionButton
                        onClick={() => setImages((prev) => prev.filter((x) => x.id !== img.id))}
                        aria-label="Remove screenshot"
                        className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-surface-high text-ink-secondary shadow-highlight ring-1 ring-line-strong transition-colors duration-150 hover:text-danger"
                      >
                        <IconClose size={12} />
                      </MotionButton>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className={labelCls}>Platform</span>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORMS.map((p) => (
                    <MotionButton key={p} onClick={() => setPlatform(p)} className={pill(platform === p)}>
                      {p}
                    </MotionButton>
                  ))}
                </div>
              </div>
              <div>
                <span className={labelCls}>Language</span>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map((l) => (
                    <MotionButton key={l} onClick={() => setLanguage(l)} className={pill(language === l)}>
                      {l}
                    </MotionButton>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <span className={labelCls}>
                Mood <span className="font-normal normal-case text-ink-faint">(optional)</span>
              </span>
              <input
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="e.g. playful, a little flirty…"
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted outline-none transition-colors duration-150 focus:border-line-accent focus:ring-[3px] focus:ring-accent/12"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MOODS.map((m) => (
                  <MotionButton
                    key={m}
                    onClick={() => setMood((cur) => (cur === m ? "" : m))}
                    className={cx(
                      "rounded-full px-2.5 py-0.5 text-meta transition-colors duration-150",
                      mood === m
                        ? "bg-accent-soft text-accent ring-1 ring-accent/30"
                        : "border border-line-strong text-ink-secondary hover:bg-fill hover:text-ink",
                    )}
                  >
                    {m}
                  </MotionButton>
                ))}
              </div>
            </div>

            <MotionButton
              onClick={scan}
              disabled={!canScan}
              className={cx(
                "inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-label text-on-accent shadow-press transition-colors duration-150 hover:bg-accent-strong active:bg-accent-strong disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                loading && "wick-ring",
              )}
            >
              {loading ? <Spinner size={15} /> : <IconSparkles size={16} />}
              {analysis ? "Scan again" : "Find the ways in"}
            </MotionButton>
          </div>

          <AnimatePresence initial={false}>
            {error && (
              <motion.div
                key="error"
                role="alert"
                variants={errorVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

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
                <p className="animate-thinking px-1">Cyrano is reading her profile…</p>
                <div className="skeleton h-16" />
                <div className="skeleton h-12" />
                <div className="skeleton h-12" />
              </motion.div>
            ) : analysis ? (
              <motion.div
                key="result"
                variants={resultVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="space-y-4"
              >
                {analysis.read && (
                  <motion.p
                    custom={0}
                    variants={cardVariants}
                    initial="initial"
                    animate="enter"
                    className="px-1 text-sm leading-normal text-ink-secondary"
                  >
                    {analysis.read}
                  </motion.p>
                )}

                {/* Approaches */}
                <div className="space-y-2.5">
                  <div className="px-1 text-meta font-semibold uppercase tracking-wider text-ink-muted">
                    Ways to open
                  </div>
                  {analysis.approaches.map((a, ai) => {
                    const list = openers[ai];
                    const busy = writing.includes(ai);
                    // Any single-opener regen in flight for this approach: block the
                    // approach-level rewrite and the other regen buttons so concurrent
                    // requests can't clobber each other or share a stale avoid list.
                    const regenBusy = regenKeys.some((k) => k.startsWith(`${ai}:`));
                    return (
                      <motion.div
                        key={ai}
                        custom={approachBase + ai}
                        variants={cardVariants}
                        initial="initial"
                        animate="enter"
                        className="rounded-lg border border-accent/30 bg-accent-faint p-3.5 shadow-highlight"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-medium text-accent">{a.angle}</span>
                            <span className="shrink-0 rounded-full bg-fill px-2 py-0.5 text-meta uppercase tracking-wider text-ink-muted">
                              {a.type}
                            </span>
                          </div>
                          <MotionButton
                            onClick={() => writeOpeners(ai)}
                            disabled={busy || regenBusy}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent/90 px-2.5 py-1 text-label font-medium text-on-accent transition-colors duration-150 hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                          >
                            {busy ? <Spinner size={13} /> : <IconSparkles size={13} />}
                            {list ? "Rewrite openers" : "Write openers"}
                          </MotionButton>
                        </div>
                        <p className="mt-1.5 text-sm leading-normal text-ink">“{a.target}”</p>
                        <p className="mt-1 text-[13px] leading-normal text-ink-muted">{a.reason}</p>

                        <AnimatePresence initial={false}>
                          {list && list.length > 0 && (
                            <motion.div
                              key="openers"
                              variants={openerVariants}
                              initial="initial"
                              animate="enter"
                              exit="exit"
                              className="mt-3 space-y-2"
                            >
                              {list.map((o, oi) => {
                                const key = `${ai}:${oi}`;
                                const oBusy = regenKeys.includes(key);
                                return (
                                  <div
                                    key={oi}
                                    className="rounded-md border border-line bg-fill p-3 shadow-highlight transition-colors duration-150 hover:border-line-strong hover:bg-fill-hover"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span
                                        className={cx(
                                          "rounded-full px-2 py-0.5 text-meta font-medium uppercase tracking-wider ring-1",
                                          toneStyle(o.tone),
                                        )}
                                      >
                                        {o.tone}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <MotionButton
                                          onClick={() => regenerateOne(ai, oi)}
                                          disabled={busy || regenBusy}
                                          aria-label="Regenerate this opener"
                                          title="Regenerate just this one"
                                          className="inline-flex items-center rounded-md p-1.5 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          {oBusy ? <Spinner size={13} /> : <IconRefresh size={13} />}
                                        </MotionButton>
                                        <MotionButton
                                          onClick={() => copy(o.text, key)}
                                          disabled={oBusy}
                                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink disabled:opacity-50"
                                        >
                                          {copied === key ? (
                                            <>
                                              <IconCheck size={13} /> Copied
                                            </>
                                          ) : (
                                            <>
                                              <IconCopy size={13} /> Copy
                                            </>
                                          )}
                                        </MotionButton>
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
                                          className="inline-flex items-center gap-1 rounded-md bg-accent/90 px-2.5 py-1 text-label font-medium text-on-accent transition-colors duration-150 hover:bg-accent disabled:opacity-50"
                                        >
                                          <IconSend size={13} /> Start
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
                                                transition: { duration: 0.18, ease: EASE_FADE },
                                              }
                                        }
                                        exit={
                                          reduced
                                            ? { opacity: 0, transition: { duration: 0.12 } }
                                            : {
                                                opacity: 0,
                                                filter: "blur(2px)",
                                                transition: { duration: 0.12, ease: EASE_FADE },
                                              }
                                        }
                                        className="mt-2 text-sm leading-normal text-ink"
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
                      </motion.div>
                    );
                  })}
                  {anyOpeners && (
                    <p className="px-1 pt-1 text-meta text-ink-muted">
                      Start opens a new conversation with her — facts saved, opener dropped into the
                      thread and copied.
                    </p>
                  )}
                </div>

                {analysis.extractedFacts.length > 0 && (
                  <motion.div
                    custom={factsIdx}
                    variants={cardVariants}
                    initial="initial"
                    animate="enter"
                    className="rounded-md border border-line bg-fill p-3 shadow-highlight"
                  >
                    <div className="mb-1.5 text-meta font-semibold uppercase tracking-wider text-ink-muted">
                      Picked up about her
                    </div>
                    <ul className="space-y-0.5">
                      {analysis.extractedFacts.map((f, i) => (
                        <li key={i} className="text-[13px] leading-normal text-ink-secondary">
                          • {f.fact}
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
                className="rounded-lg border border-dashed border-line-strong p-8 text-center"
              >
                <p className="drop-cap-sm text-sm text-ink-secondary">Add a profile, then find your in.</p>
                <p className="mt-1 text-meta leading-normal text-ink-muted">
                  Cami reads the prompts and photos, maps out a few ways to open, and writes openers
                  in your voice for whichever one you pick — grounded in your context file.
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
