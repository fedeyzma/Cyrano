"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import { PROFILE_PROMPTS } from "@/lib/hingePrompts";
import { IconCards, IconCheck, IconCopy, IconRefresh, IconSparkles } from "./icons";
import { Spinner } from "./ui";

type Answer = { text: string; angle: string };

const ANGLE_STYLES: Record<string, string> = {
  funny: "bg-amber-500/12 text-amber-300 ring-amber-400/25",
  playful: "bg-amber-500/12 text-amber-300 ring-amber-400/25",
  dry: "bg-fill text-ink-secondary ring-line-strong",
  curious: "bg-sky-500/12 text-sky-300 ring-sky-400/25",
  chill: "bg-sky-500/12 text-sky-300 ring-sky-400/25",
  flirty: "bg-rose-500/12 text-rose-300 ring-rose-400/25",
  sincere: "bg-emerald-500/12 text-emerald-300 ring-emerald-400/25",
  adventurous: "bg-emerald-500/12 text-emerald-300 ring-emerald-400/25",
  bold: "bg-violet-500/12 text-violet-300 ring-violet-400/25",
};
function angleStyle(a: string): string {
  return ANGLE_STYLES[a.toLowerCase().trim()] ?? "bg-fill text-ink-secondary ring-line-strong";
}

const PLATFORMS = ["Hinge", "Tinder", "Bumble"];
const LANGUAGES = ["Français", "English", "Español", "Italiano"];
const MOODS = ["funny", "flirty", "dry", "sincere", "adventurous", "chill", "bold"];
const CUSTOM = "Custom prompt…";

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

  const labelCls = "mb-1.5 block text-meta font-semibold uppercase tracking-wider text-ink-muted";
  const fieldCls =
    "w-full rounded-md border border-line bg-black/30 px-3 py-2 text-sm text-ink placeholder:text-ink-faint outline-none transition-colors duration-150 focus:border-accent/50 focus:ring-2 focus:ring-accent/20";

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent/25 to-accent-strong/10 text-title text-accent ring-1 ring-line">
          <IconCards size={18} />
        </span>
        <div className="leading-tight">
          <div className="text-title text-ink">Profile prompts</div>
          <div className="text-meta text-ink-muted">answers in your voice, easy to match on</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Controls */}
          <div className="space-y-4 rounded-xl border border-line-strong bg-fill p-4">
            <div>
              <label className={labelCls}>Prompt</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className={fieldCls}
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
              {isCustom && (
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="write the prompt question…"
                  className={cx(fieldCls, "mt-2")}
                />
              )}
            </div>

            <div>
              <label className={labelCls}>Platform</label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={cx(
                      "rounded-full px-3 py-1 text-xs transition-colors duration-150 motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                      platform === p
                        ? "bg-accent font-medium text-on-accent"
                        : "border border-line-strong text-ink-secondary hover:bg-fill hover:text-ink",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Language</label>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={cx(
                      "rounded-full px-3 py-1 text-xs transition-colors duration-150 motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                      language === l
                        ? "bg-accent font-medium text-on-accent"
                        : "border border-line-strong text-ink-secondary hover:bg-fill hover:text-ink",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Mood / vibe <span className="font-normal normal-case text-ink-faint">(optional)</span>
              </label>
              <input
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="e.g. playful, a bit flirty, show my music side…"
                className={fieldCls}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMood((cur) => (cur === m ? "" : m))}
                    className={cx(
                      "rounded-full px-2.5 py-0.5 text-meta transition-colors duration-150 motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                      mood === m
                        ? "bg-accent font-medium text-on-accent"
                        : "border border-line-strong text-ink-secondary hover:bg-fill hover:text-ink",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generate}
              disabled={!canGenerate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-on-accent shadow-xs transition-colors duration-150 hover:bg-accent-strong motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              {loading ? <Spinner size={15} /> : <IconSparkles size={16} />}
              {options ? "Generate more" : "Generate answers"}
            </button>
          </div>

          {/* Results */}
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
              {error}
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-md border border-line bg-fill p-4">
                  <div className="skeleton h-3 w-2/3 rounded" />
                  <div className="skeleton mt-2 h-3 w-1/3 rounded" />
                </div>
              ))}
            </div>
          )}

          {!loading && options && (
            <div className="space-y-2">
              {options.map((o, i) => {
                const busy = regenIndex === i;
                return (
                  <div
                    key={i}
                    className="animate-fade-up rounded-md border border-line bg-fill p-3.5 transition-colors duration-150 hover:border-line-strong hover:bg-fill-hover"
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cx(
                          "rounded-full px-2 py-0.5 text-meta font-medium uppercase tracking-wider ring-1",
                          angleStyle(o.angle),
                        )}
                      >
                        {o.angle}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => regenerateOne(i)}
                          disabled={regenIndex !== null}
                          title="Regenerate just this one"
                          aria-label="Regenerate just this one"
                          className="inline-flex items-center rounded-md p-1.5 text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy ? <Spinner size={13} /> : <IconRefresh size={13} />}
                        </button>
                        <button
                          onClick={() => copy(o.text, i)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink disabled:opacity-50"
                        >
                          {copied === i ? (
                            <>
                              <IconCheck size={13} /> Copied
                            </>
                          ) : (
                            <>
                              <IconCopy size={13} /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <p
                      className={cx(
                        "mt-2 whitespace-pre-wrap rounded-md bg-black/20 px-2.5 py-1.5 text-sm leading-normal text-ink transition-opacity duration-150",
                        busy && "opacity-40",
                      )}
                    >
                      {o.text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !options && !error && (
            <div className="rounded-xl border border-dashed border-line-strong p-8 text-center">
              <p className="text-sm text-ink-secondary">Pick a prompt, set a mood, and generate.</p>
              <p className="mt-1 text-xs leading-normal text-ink-muted">
                Answers are grounded in your context file and written to give matches an easy
                opening.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
