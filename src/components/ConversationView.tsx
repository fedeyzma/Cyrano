"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { clockTime } from "@/lib/time";
import type { ConversationDetail, ReplyOption } from "@/lib/types";
import {
  IconBrain,
  IconCheck,
  IconCopy,
  IconRefresh,
  IconSend,
  IconSparkles,
  IconTrash,
  IconUser,
} from "./icons";
import { Spinner } from "./ui";

const TONE_STYLES: Record<string, string> = {
  dry: "bg-zinc-500/15 text-zinc-300 ring-zinc-400/20",
  playful: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  curious: "bg-sky-500/15 text-sky-300 ring-sky-400/20",
  flirty: "bg-rose-500/15 text-rose-300 ring-rose-400/20",
  sincere: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  bold: "bg-violet-500/15 text-violet-300 ring-violet-400/20",
};

function toneStyle(tone: string): string {
  return TONE_STYLES[tone.toLowerCase().trim()] ?? "bg-white/10 text-zinc-300 ring-white/15";
}

export function ConversationView({
  detail,
  suggestions,
  suggesting,
  suggestError,
  factsCount,
  onSuggest,
  onAddThem,
  onUseOption,
  onRegenerate,
  onDismissSuggestions,
  onDeleteMessage,
  onDeleteConversation,
  onOpenFacts,
}: {
  detail: ConversationDetail;
  suggestions: ReplyOption[] | null;
  suggesting: boolean;
  suggestError: string | null;
  factsCount: number;
  onSuggest: (incoming: string) => void;
  onAddThem: (content: string) => void;
  onUseOption: (text: string) => void;
  onRegenerate: () => void;
  onDismissSuggestions: () => void;
  onDeleteMessage: (messageId: number) => void;
  onDeleteConversation: () => void;
  onOpenFacts: () => void;
}) {
  const { conversation, messages } = detail;
  const [text, setText] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, suggestions, suggesting]);

  const lastThem = [...messages].reverse().find((m) => m.role === "them");
  const canRegenerate = !!lastThem;
  const canGenerate = text.trim().length > 0 || canRegenerate;

  function handleGenerate() {
    const t = text.trim();
    if (t) {
      onSuggest(t);
      setText("");
    } else if (canRegenerate) {
      onSuggest("");
    }
  }

  function handleAddThem() {
    const t = text.trim();
    if (!t) return;
    onAddThem(t);
    setText("");
  }

  async function copyText(value: string, index: number) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(index);
      setTimeout(() => setCopied((c) => (c === index ? null : c)), 1600);
    } catch {
      /* clipboard not available */
    }
  }

  function handleUse(value: string, index: number) {
    void copyText(value, index);
    onUseOption(value);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent/30 to-indigo-500/20 text-sm font-semibold text-accent">
            {conversation.name.slice(0, 1).toUpperCase() || <IconUser size={16} />}
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold leading-tight">{conversation.name}</div>
            {conversation.platform && (
              <div className="text-[11px] text-zinc-500">{conversation.platform}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenFacts}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-accent/40 hover:text-accent xl:hidden"
          >
            <IconBrain size={15} />
            {factsCount > 0 && <span>{factsCount}</span>}
          </button>
          <button
            onClick={onDeleteConversation}
            aria-label="Delete conversation"
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <IconTrash size={16} />
          </button>
        </div>
      </header>

      {/* Thread + suggestions (scrolls together) */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-2xl space-y-2.5">
          {messages.length === 0 && (
            <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-dashed border-white/10 p-6 text-center">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent">
                <IconSparkles size={20} />
              </span>
              <p className="mt-3 text-sm text-zinc-300">No messages yet.</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Paste what {conversation.name} said in the box below and hit Generate — Cyrano
                will hand you a few ways to reply.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cx(
                "group flex items-end gap-2",
                m.role === "me" ? "justify-end" : "justify-start",
              )}
            >
              {m.role === "me" && (
                <button
                  onClick={() => onDeleteMessage(m.id)}
                  aria-label="Delete message"
                  className="mb-1 text-zinc-700 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                >
                  <IconTrash size={13} />
                </button>
              )}
              <div
                className={cx(
                  "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  m.role === "me"
                    ? "rounded-br-md bg-accent text-zinc-950"
                    : "rounded-bl-md bg-white/[0.06] text-zinc-100 ring-1 ring-white/5",
                )}
                title={clockTime(m.created_at)}
              >
                <span className="whitespace-pre-wrap break-words">{m.content}</span>
              </div>
              {m.role === "them" && (
                <button
                  onClick={() => onDeleteMessage(m.id)}
                  aria-label="Delete message"
                  className="mb-1 text-zinc-700 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                >
                  <IconTrash size={13} />
                </button>
              )}
            </div>
          ))}

          {/* Suggestions */}
          {(suggesting || suggestions || suggestError) && (
            <div className="!mt-6 animate-fade-up rounded-2xl border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-2.5 flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                  <IconSparkles size={15} className="text-accent" />
                  {suggesting ? "Cyrano is thinking…" : "Pick a reply"}
                </div>
                {!suggesting && (suggestions || suggestError) && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={onRegenerate}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
                    >
                      <IconRefresh size={13} /> Regenerate
                    </button>
                    <button
                      onClick={onDismissSuggestions}
                      className="rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:text-zinc-300"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>

              {suggesting && (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-thinking rounded-xl bg-white/[0.04] p-3"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    >
                      <div className="h-3 w-3/4 rounded bg-white/10" />
                      <div className="mt-2 h-3 w-1/2 rounded bg-white/10" />
                    </div>
                  ))}
                </div>
              )}

              {!suggesting && suggestError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {suggestError}
                  <button
                    onClick={onRegenerate}
                    className="mt-2 block text-xs text-red-200 underline underline-offset-2 hover:text-white"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!suggesting && suggestions && (
                <div className="space-y-2">
                  {suggestions.map((opt, i) => (
                    <div
                      key={i}
                      className="animate-fade-up rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-white/10 hover:bg-white/[0.05]"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cx(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1",
                            toneStyle(opt.tone),
                          )}
                        >
                          {opt.tone}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyText(opt.text, i)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
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
                          <button
                            onClick={() => handleUse(opt.text, i)}
                            className="inline-flex items-center gap-1 rounded-md bg-accent/90 px-2.5 py-1 text-xs font-medium text-zinc-950 transition hover:bg-accent"
                          >
                            <IconSend size={13} /> Use
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-100">{opt.text}</p>
                    </div>
                  ))}
                  <p className="px-1 pt-1 text-[11px] text-zinc-600">
                    “Use” copies the reply and logs it to the thread as sent.
                  </p>
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-white/5 bg-zinc-950/60 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-2 transition focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/15">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canGenerate) handleGenerate();
                }
              }}
              rows={2}
              placeholder={`Paste ${conversation.name}'s latest message…`}
              className="max-h-40 min-h-[44px] w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none placeholder:text-zinc-600"
            />
            <div className="flex items-center justify-between gap-2 px-1 pt-1">
              <button
                onClick={handleAddThem}
                disabled={!text.trim()}
                className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add to thread
              </button>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || suggesting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-zinc-950 transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
              >
                {suggesting ? <Spinner size={14} /> : <IconSparkles size={15} />}
                {text.trim() || !canRegenerate ? "Generate replies" : "Regenerate"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
