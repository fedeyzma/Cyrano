"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import { PROFILE_PROMPTS } from "@/lib/hingePrompts";
import { IconCards, IconCheck, IconCopy, IconRefresh, IconSparkles } from "./icons";
import { Spinner } from "./ui";

type Answer = { text: string; angle: string };

const ANGLE_STYLES: Record<string, string> = {
  funny: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  playful: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  dry: "bg-zinc-500/15 text-zinc-300 ring-zinc-400/20",
  curious: "bg-sky-500/15 text-sky-300 ring-sky-400/20",
  chill: "bg-sky-500/15 text-sky-300 ring-sky-400/20",
  flirty: "bg-rose-500/15 text-rose-300 ring-rose-400/20",
  sincere: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  adventurous: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  bold: "bg-violet-500/15 text-violet-300 ring-violet-400/20",
};
function angleStyle(a: string): string {
  return ANGLE_STYLES[a.toLowerCase().trim()] ?? "bg-white/10 text-zinc-300 ring-white/15";
}

const PLATFORMS = ["Hinge", "Tinder", "Bumble"];
const MOODS = ["funny", "flirty", "dry", "sincere", "adventurous", "chill", "bold"];
const CUSTOM = "Custom prompt…";

export function PromptsLab({
  onGenerate,
}: {
  onGenerate: (data: {
    prompt: string;
    mood: string;
    platform: string;
    count?: number;
    avoid?: string[];
  }) => Promise<Answer[]>;
}) {
  const [selected, setSelected] = useState(PROFILE_PROMPTS[0]);
  const [custom, setCustom] = useState("");
  const [platform, setPlatform] = useState("Hinge");
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
      setOptions(await onGenerate({ prompt, mood, platform }));
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

  const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500";
  const fieldCls =
    "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20";

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/5 px-4">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent">
          <IconCards size={18} />
        </span>
        <div className="leading-tight">
          <div className="font-semibold">Profile prompts</div>
          <div className="text-[11px] text-zinc-500">answers in your voice, easy to match on</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Controls */}
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div>
              <label className={labelCls}>Prompt</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className={fieldCls}
              >
                {PROFILE_PROMPTS.map((p) => (
                  <option key={p} value={p} className="bg-zinc-900">
                    {p}
                  </option>
                ))}
                <option value={CUSTOM} className="bg-zinc-900">
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
                      "rounded-full px-3 py-1 text-xs transition",
                      platform === p
                        ? "bg-accent font-medium text-zinc-950"
                        : "border border-white/10 text-zinc-300 hover:border-white/25",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Mood / vibe <span className="font-normal normal-case text-zinc-600">(optional)</span>
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
                      "rounded-full px-2.5 py-0.5 text-[11px] transition",
                      mood === m
                        ? "bg-accent-soft text-accent ring-1 ring-accent/30"
                        : "border border-white/10 text-zinc-400 hover:border-white/25",
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Spinner size={15} /> : <IconSparkles size={16} />}
              {options ? "Generate more" : "Generate answers"}
            </button>
          </div>

          {/* Results */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-thinking rounded-xl bg-white/[0.04] p-4"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <div className="h-3 w-2/3 rounded bg-white/10" />
                  <div className="mt-2 h-3 w-1/3 rounded bg-white/10" />
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
                    className="animate-fade-up rounded-xl border border-white/5 bg-white/[0.03] p-3.5 transition hover:border-white/10"
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cx(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1",
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
                          className="inline-flex items-center rounded-md px-1.5 py-1 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy ? <Spinner size={13} /> : <IconRefresh size={13} />}
                        </button>
                        <button
                          onClick={() => copy(o.text, i)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 disabled:opacity-50"
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
                        "mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-100 transition",
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
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <p className="text-sm text-zinc-400">Pick a prompt, set a mood, and generate.</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600">
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
