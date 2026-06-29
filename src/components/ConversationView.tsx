"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { clockTime } from "@/lib/time";
import type { ConversationDetail, QueuedReply, ReplyOption, Role } from "@/lib/types";
import {
  IconBrain,
  IconCheck,
  IconClock,
  IconClose,
  IconCompass,
  IconCopy,
  IconEdit,
  IconImport,
  IconRefresh,
  IconReply,
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
  onAddMessage,
  onUseOption,
  onQueueOption,
  onRegenerateOne,
  onDismissSuggestions,
  onDeleteMessage,
  onEditMessage,
  onDeleteConversation,
  onDeleteQueued,
  onSendQueued,
  onOpenImport,
  onOpenFacts,
}: {
  detail: ConversationDetail;
  suggestions: ReplyOption[] | null;
  suggesting: boolean;
  suggestError: string | null;
  factsCount: number;
  onSuggest: (incoming: string, steer: string, targetIds: number[]) => void;
  onAddMessage: (role: Role, content: string) => void;
  onUseOption: (texts: string[]) => void;
  onQueueOption: (texts: string[], tone: string, targetId: number | null) => void;
  onRegenerateOne: (index: number, steer: string, targetIds: number[]) => Promise<void>;
  onDismissSuggestions: () => void;
  onDeleteMessage: (messageId: number) => void;
  onEditMessage: (messageId: number, content: string) => Promise<void>;
  onDeleteConversation: () => void;
  onDeleteQueued: (queueId: number) => void;
  onSendQueued: (q: QueuedReply) => void;
  onOpenImport: () => void;
  onOpenFacts: () => void;
}) {
  const { conversation, messages, queued } = detail;
  const [text, setText] = useState("");
  const [steer, setSteer] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [targets, setTargets] = useState<number[]>([]);
  const [queueOpen, setQueueOpen] = useState(true);
  const [regenIndex, setRegenIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const messageById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, suggestions, suggesting]);

  // Drop any targets whose message no longer exists.
  useEffect(() => {
    setTargets((prev) => prev.filter((id) => messageById.has(id)));
  }, [messageById]);

  const lastThem = [...messages].reverse().find((m) => m.role === "them");
  const canRegenerate = !!lastThem || targets.length > 0;
  const canGenerate = text.trim().length > 0 || canRegenerate;
  const primaryTargetId = targets.length > 0 ? targets[targets.length - 1] : (lastThem?.id ?? null);

  function toggleTarget(id: number) {
    setTargets((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function handleGenerate() {
    const t = text.trim();
    if (t) {
      onSuggest(t, steer, targets);
      setText("");
    } else if (canRegenerate) {
      onSuggest("", steer, targets);
    }
  }

  function regenerate() {
    onSuggest("", steer, targets);
  }

  function addAs(role: Role) {
    const t = text.trim();
    if (!t) return;
    onAddMessage(role, t);
    setText("");
  }

  async function copyValue(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch {
      /* clipboard not available */
    }
  }

  async function regenerateOne(index: number) {
    setRegenIndex(index);
    try {
      await onRegenerateOne(index, steer, targets);
    } finally {
      setRegenIndex(null);
    }
  }

  function startEdit(id: number, content: string) {
    setEditingId(id);
    setEditText(content);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }
  async function saveEdit(id: number) {
    const t = editText.trim();
    if (!t) return;
    await onEditMessage(id, t);
    setEditingId(null);
    setEditText("");
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
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-accent/40 hover:text-accent"
          >
            <IconImport size={15} />
            <span className="hidden sm:inline">Import</span>
          </button>
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

      {/* Thread + suggestions */}
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
              <button
                onClick={onOpenImport}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-accent/40 hover:text-accent"
              >
                <IconImport size={14} /> Import an existing thread
              </button>
            </div>
          )}

          {messages.map((m) => {
            const isTarget = m.role === "them" && targets.includes(m.id);

            if (editingId === m.id) {
              return (
                <div
                  key={m.id}
                  className={cx("flex", m.role === "me" ? "justify-end" : "justify-start")}
                >
                  <div className="w-full max-w-[80%]">
                    <textarea
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void saveEdit(m.id);
                        } else if (e.key === "Escape") {
                          cancelEdit();
                        }
                      }}
                      rows={2}
                      className="w-full resize-none rounded-xl border border-accent/40 bg-black/40 px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <div className="mt-1 flex justify-end gap-2">
                      <button
                        onClick={cancelEdit}
                        className="rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:text-zinc-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => void saveEdit(m.id)}
                        disabled={!editText.trim()}
                        className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-zinc-950 transition hover:bg-accent-strong disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            const actions = (
              <div
                className={cx(
                  "mb-0.5 flex flex-col gap-1 transition",
                  isTarget ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              >
                {m.role === "them" && (
                  <button
                    onClick={() => toggleTarget(m.id)}
                    aria-label={isTarget ? "Stop replying to this" : "Reply to this message"}
                    title={isTarget ? "Stop replying to this" : "Reply to this message"}
                    className={cx(
                      "transition",
                      isTarget ? "text-accent" : "text-zinc-600 hover:text-zinc-300",
                    )}
                  >
                    <IconReply size={14} />
                  </button>
                )}
                <button
                  onClick={() => startEdit(m.id, m.content)}
                  aria-label="Edit message"
                  title="Edit message"
                  className="text-zinc-600 transition hover:text-zinc-300"
                >
                  <IconEdit size={13} />
                </button>
                <button
                  onClick={() => onDeleteMessage(m.id)}
                  aria-label="Delete message"
                  title="Delete message"
                  className="text-zinc-700 transition hover:text-red-400"
                >
                  <IconTrash size={13} />
                </button>
              </div>
            );

            return (
              <div
                key={m.id}
                className={cx(
                  "group flex items-end gap-2",
                  m.role === "me" ? "justify-end" : "justify-start",
                )}
              >
                {m.role === "me" && actions}
                <div
                  className={cx(
                    "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                    m.role === "me"
                      ? "rounded-br-md bg-accent text-zinc-950"
                      : "rounded-bl-md bg-white/[0.06] text-zinc-100 ring-1 ring-white/5",
                    isTarget && "ring-2 ring-accent/70",
                  )}
                  title={clockTime(m.created_at)}
                >
                  <span className="whitespace-pre-wrap break-words">{m.content}</span>
                </div>
                {m.role === "them" && actions}
              </div>
            );
          })}

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
                      onClick={regenerate}
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
                    onClick={regenerate}
                    className="mt-2 block text-xs text-red-200 underline underline-offset-2 hover:text-white"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!suggesting && suggestions && (
                <div className="space-y-2">
                  {suggestions.map((opt, i) => {
                    const busy = regenIndex === i;
                    return (
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
                            {opt.texts.length > 1 && (
                              <span className="ml-1 normal-case text-zinc-500">
                                · {opt.texts.length} texts
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => regenerateOne(i)}
                              disabled={regenIndex !== null}
                              title="Regenerate just this one"
                              aria-label="Regenerate this reply"
                              className="inline-flex items-center rounded-md px-1.5 py-1 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busy ? <Spinner size={13} /> : <IconRefresh size={13} />}
                            </button>
                            <button
                              onClick={() => copyValue(opt.texts.join("\n"), `opt-${i}`)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 disabled:opacity-50"
                            >
                              {copied === `opt-${i}` ? (
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
                              onClick={() => onQueueOption(opt.texts, opt.tone, primaryTargetId)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 disabled:opacity-50"
                            >
                              <IconClock size={13} /> Queue
                            </button>
                            <button
                              onClick={() => {
                                void copyValue(opt.texts.join("\n"), `opt-${i}`);
                                onUseOption(opt.texts);
                              }}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-md bg-accent/90 px-2.5 py-1 text-xs font-medium text-zinc-950 transition hover:bg-accent disabled:opacity-50"
                            >
                              <IconSend size={13} /> Use
                            </button>
                          </div>
                        </div>
                        <div className={cx("mt-2 space-y-1 transition", busy && "opacity-40")}>
                          {opt.texts.map((t, j) => (
                            <p
                              key={j}
                              className="rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-sm leading-relaxed text-zinc-100"
                            >
                              {t}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <p className="px-1 pt-1 text-[11px] text-zinc-600">
                    “Use” sends now (logs to the thread); “Queue” saves it as a draft for later.
                  </p>
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Bottom: queue + targeting + composer */}
      <div className="shrink-0 border-t border-white/5 bg-zinc-950/60 px-4 py-3 backdrop-blur">
        {/* Queued replies */}
        {queued.length > 0 && (
          <div className="mx-auto mb-2 max-w-2xl rounded-xl border border-white/10 bg-white/[0.02]">
            <button
              onClick={() => setQueueOpen((o) => !o)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-zinc-400"
            >
              <span className="flex items-center gap-1.5">
                <IconClock size={14} className="text-accent" /> Queued replies · {queued.length}
              </span>
              <span className="text-zinc-600">{queueOpen ? "hide" : "show"}</span>
            </button>
            {queueOpen && (
              <div className="max-h-56 space-y-1.5 overflow-y-auto px-3 pb-3">
                {queued.map((q) => {
                  const tm = q.target_message_id ? messageById.get(q.target_message_id) : null;
                  const parts = q.content.split("\n").filter((l) => l.trim());
                  return (
                    <div key={q.id} className="rounded-lg border border-white/5 bg-white/[0.03] p-2.5">
                      {tm && (
                        <div className="mb-1 flex items-center gap-1 text-[11px] text-zinc-500">
                          <IconReply size={11} className="shrink-0" />
                          <span className="truncate">{tm.content}</span>
                        </div>
                      )}
                      <div className="space-y-0.5">
                        {parts.map((p, idx) => (
                          <p key={idx} className="text-sm leading-relaxed text-zinc-100">
                            {p}
                          </p>
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1">
                        {q.tone && (
                          <span
                            className={cx(
                              "mr-auto rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1",
                              toneStyle(q.tone),
                            )}
                          >
                            {q.tone}
                          </span>
                        )}
                        <button
                          onClick={() => copyValue(q.content, `q-${q.id}`)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
                        >
                          {copied === `q-${q.id}` ? (
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
                          onClick={() => onDeleteQueued(q.id)}
                          className="rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:text-red-400"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => onSendQueued(q)}
                          className="inline-flex items-center gap-1 rounded-md bg-accent/90 px-2.5 py-1 text-xs font-medium text-zinc-950 transition hover:bg-accent"
                        >
                          <IconSend size={13} /> Mark sent
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Targeting bar */}
        {targets.length > 0 && (
          <div className="mx-auto mb-2 flex max-w-2xl items-start gap-2 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2">
            <IconReply size={14} className="mt-0.5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-accent">
                Replying to {targets.length} message{targets.length > 1 ? "s" : ""}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {targets.map((tid) => {
                  const tm = messageById.get(tid);
                  if (!tm) return null;
                  return (
                    <span
                      key={tid}
                      className="inline-flex max-w-[14rem] items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[11px] text-zinc-300"
                    >
                      <span className="truncate">{tm.content}</span>
                      <button
                        onClick={() => toggleTarget(tid)}
                        aria-label="Remove target"
                        className="shrink-0 text-zinc-500 transition hover:text-zinc-200"
                      >
                        <IconClose size={11} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
            <button
              onClick={() => setTargets([])}
              className="shrink-0 text-xs text-zinc-400 transition hover:text-zinc-200"
            >
              clear
            </button>
          </div>
        )}

        {/* Composer */}
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-2 transition focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/15">
            <div className="flex items-center gap-1.5 px-1 pb-1.5">
              <IconCompass size={14} className="shrink-0 text-zinc-500" />
              <input
                value={steer}
                onChange={(e) => setSteer(e.target.value)}
                placeholder="optional: steer it — “be flirtier”, “ask her out”, “say something like…”"
                className="min-w-0 flex-1 bg-transparent text-xs text-zinc-300 outline-none placeholder:text-zinc-600"
              />
              {steer && (
                <button
                  onClick={() => setSteer("")}
                  aria-label="Clear steer"
                  className="shrink-0 text-zinc-600 transition hover:text-zinc-300"
                >
                  <IconClose size={13} />
                </button>
              )}
            </div>
            <div className="mb-1 h-px bg-white/5" />
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
              <div className="flex items-center gap-1">
                <button
                  onClick={() => addAs("me")}
                  disabled={!text.trim()}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add as me
                </button>
                <button
                  onClick={() => addAs("them")}
                  disabled={!text.trim()}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add as them
                </button>
              </div>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || suggesting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-zinc-950 transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
              >
                {suggesting ? <Spinner size={14} /> : <IconSparkles size={15} />}
                {targets.length > 0
                  ? `Reply to ${targets.length}`
                  : text.trim() || !canRegenerate
                    ? "Generate replies"
                    : "Regenerate"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
