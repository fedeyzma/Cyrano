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
  dry: "bg-zinc-500/12 text-zinc-300 ring-zinc-400/25",
  playful: "bg-amber-500/12 text-amber-300 ring-amber-400/25",
  curious: "bg-sky-500/12 text-sky-300 ring-sky-400/25",
  flirty: "bg-rose-500/12 text-rose-300 ring-rose-400/25",
  sincere: "bg-emerald-500/12 text-emerald-300 ring-emerald-400/25",
  bold: "bg-violet-500/12 text-violet-300 ring-violet-400/25",
};

function toneStyle(tone: string): string {
  return TONE_STYLES[tone.toLowerCase().trim()] ?? "bg-fill text-ink-secondary ring-line-strong";
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
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent/25 to-accent-strong/10 text-title text-accent ring-1 ring-line">
            {conversation.name.slice(0, 1).toUpperCase() || <IconUser size={16} />}
          </span>
          <div className="min-w-0">
            <div className="truncate text-title leading-tight text-ink">{conversation.name}</div>
            {conversation.platform && (
              <div className="text-meta text-ink-muted">{conversation.platform}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-label text-ink-secondary transition-colors duration-150 hover:border-accent/40 hover:bg-fill hover:text-accent motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <IconImport size={15} />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            onClick={onOpenFacts}
            className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-label text-ink-secondary transition-colors duration-150 hover:border-accent/40 hover:bg-fill hover:text-accent motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas xl:hidden"
          >
            <IconBrain size={15} />
            {factsCount > 0 && <span className="tabular-nums">{factsCount}</span>}
          </button>
          <button
            onClick={onDeleteConversation}
            aria-label="Delete conversation"
            className="inline-flex items-center justify-center rounded-md p-1.5 text-ink-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <IconTrash size={16} />
          </button>
        </div>
      </header>

      {/* Thread + suggestions */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-2xl space-y-2.5">
          {messages.length === 0 && (
            <div className="mx-auto mt-10 max-w-sm rounded-xl border border-dashed border-line-strong p-6 text-center">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent">
                <IconSparkles size={20} />
              </span>
              <p className="mt-3 text-sm text-ink-secondary">No messages yet.</p>
              <p className="mt-1 text-xs leading-normal text-ink-muted">
                Paste what {conversation.name} said in the box below and hit Generate — Cyrano
                will hand you a few ways to reply.
              </p>
              <button
                onClick={onOpenImport}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-label text-ink-secondary transition-colors duration-150 hover:border-accent/40 hover:bg-fill hover:text-accent motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
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
                      className="w-full resize-none rounded-md border border-accent/50 bg-black/30 px-3 py-2 text-sm leading-normal text-ink outline-none transition-colors duration-150 focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
                    />
                    <div className="mt-1 flex justify-end gap-2">
                      <button
                        onClick={cancelEdit}
                        className="inline-flex items-center rounded-md px-2 py-1 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => void saveEdit(m.id)}
                        disabled={!editText.trim()}
                        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-label text-on-accent shadow-xs transition-colors duration-150 hover:bg-accent-strong motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
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
                  "mb-0.5 flex flex-col gap-1 transition-opacity duration-150",
                  isTarget
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                )}
              >
                {m.role === "them" && (
                  <button
                    onClick={() => toggleTarget(m.id)}
                    aria-label={isTarget ? "Stop replying to this" : "Reply to this message"}
                    title={isTarget ? "Stop replying to this" : "Reply to this message"}
                    className={cx(
                      "transition-colors duration-150",
                      isTarget ? "text-accent" : "text-ink-faint hover:text-ink",
                    )}
                  >
                    <IconReply size={14} />
                  </button>
                )}
                <button
                  onClick={() => startEdit(m.id, m.content)}
                  aria-label="Edit message"
                  title="Edit message"
                  className="text-ink-faint transition-colors duration-150 hover:text-ink"
                >
                  <IconEdit size={13} />
                </button>
                <button
                  onClick={() => onDeleteMessage(m.id)}
                  aria-label="Delete message"
                  title="Delete message"
                  className="text-ink-faint transition-colors duration-150 hover:text-danger"
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
                    "max-w-[78%] rounded-lg px-3.5 py-2 text-sm leading-normal",
                    m.role === "me"
                      ? "rounded-br-sm bg-accent text-on-accent shadow-xs shadow-[inset_0_1px_0_0_rgb(255_255_255/0.20)]"
                      : "rounded-bl-sm bg-fill text-ink ring-1 ring-line",
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
            <div className="!mt-6 animate-fade-up rounded-lg border border-line bg-fill p-3">
              <div className="mb-2.5 flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-label font-medium text-ink-secondary">
                  <IconSparkles size={15} className="text-accent" />
                  {suggesting ? (
                    <span className="animate-thinking">Cyrano is thinking…</span>
                  ) : (
                    "Pick a reply"
                  )}
                </div>
                {!suggesting && (suggestions || suggestError) && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={regenerate}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
                    >
                      <IconRefresh size={13} /> Regenerate
                    </button>
                    <button
                      onClick={onDismissSuggestions}
                      className="inline-flex items-center rounded-md px-2 py-1 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>

              {suggesting && (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-md border border-line bg-fill p-3">
                      <div className="skeleton h-3 w-3/4 rounded" />
                      <div className="skeleton mt-2 h-3 w-1/2 rounded" />
                    </div>
                  ))}
                </div>
              )}

              {!suggesting && suggestError && (
                <div className="rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
                  {suggestError}
                  <button
                    onClick={regenerate}
                    className="mt-2 block text-xs text-danger underline underline-offset-2 transition-colors duration-150 hover:text-ink"
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
                        className="animate-fade-up rounded-md border border-line bg-fill p-3 transition-colors duration-150 hover:border-line-strong hover:bg-fill-hover"
                        style={{ animationDelay: `${i * 0.04}s` }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cx(
                              "rounded-full px-2 py-0.5 text-meta font-medium uppercase tracking-wider ring-1",
                              toneStyle(opt.tone),
                            )}
                          >
                            {opt.tone}
                            {opt.texts.length > 1 && (
                              <span className="ml-1 normal-case tabular-nums text-ink-muted">
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
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busy ? <Spinner size={13} /> : <IconRefresh size={13} />}
                            </button>
                            <button
                              onClick={() => copyValue(opt.texts.join("\n"), `opt-${i}`)}
                              disabled={busy}
                              aria-label="Copy reply"
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink disabled:opacity-50"
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
                              aria-label="Queue reply"
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink disabled:opacity-50"
                            >
                              <IconClock size={13} /> Queue
                            </button>
                            <button
                              onClick={() => {
                                void copyValue(opt.texts.join("\n"), `opt-${i}`);
                                onUseOption(opt.texts);
                              }}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-label text-on-accent shadow-xs transition-colors duration-150 hover:bg-accent-strong motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                            >
                              <IconSend size={13} /> Use
                            </button>
                          </div>
                        </div>
                        <div
                          className={cx(
                            "mt-2 space-y-1 transition-opacity duration-150",
                            busy && "opacity-40",
                          )}
                        >
                          {opt.texts.map((t, j) => (
                            <p
                              key={j}
                              className="rounded-md bg-black/20 px-2.5 py-1.5 text-sm leading-normal text-ink"
                            >
                              {t}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <p className="px-1 pt-1 text-meta text-ink-muted">
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
      <div className="shrink-0 border-t border-line bg-canvas/60 px-4 py-3 backdrop-blur">
        {/* Queued replies */}
        {queued.length > 0 && (
          <div className="mx-auto mb-2 max-w-2xl rounded-lg border border-line bg-fill">
            <button
              onClick={() => setQueueOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-label font-medium text-ink-secondary transition-colors duration-150"
            >
              <span className="flex items-center gap-1.5">
                <IconClock size={14} className="text-accent" /> Queued replies ·{" "}
                <span className="tabular-nums">{queued.length}</span>
              </span>
              <span className="text-ink-faint">{queueOpen ? "hide" : "show"}</span>
            </button>
            {queueOpen && (
              <div className="max-h-56 space-y-1.5 overflow-y-auto px-3 pb-3">
                {queued.map((q) => {
                  const tm = q.target_message_id ? messageById.get(q.target_message_id) : null;
                  const parts = q.content.split("\n").filter((l) => l.trim());
                  return (
                    <div
                      key={q.id}
                      className="animate-fade-up rounded-md border border-line bg-fill p-2.5 transition-colors duration-150 hover:border-line-strong hover:bg-fill-hover"
                    >
                      {tm && (
                        <div className="mb-1 flex items-center gap-1 text-meta text-ink-muted">
                          <IconReply size={11} className="shrink-0" />
                          <span className="truncate">{tm.content}</span>
                        </div>
                      )}
                      <div className="space-y-0.5">
                        {parts.map((p, idx) => (
                          <p key={idx} className="text-sm leading-normal text-ink">
                            {p}
                          </p>
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1">
                        {q.tone && (
                          <span
                            className={cx(
                              "mr-auto rounded-full px-2 py-0.5 text-meta font-medium uppercase tracking-wider ring-1",
                              toneStyle(q.tone),
                            )}
                          >
                            {q.tone}
                          </span>
                        )}
                        <button
                          onClick={() => copyValue(q.content, `q-${q.id}`)}
                          aria-label="Copy queued reply"
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
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
                          className="inline-flex items-center rounded-md px-2 py-1 text-label text-ink-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => onSendQueued(q)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-label text-on-accent shadow-xs transition-colors duration-150 hover:bg-accent-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
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
          <div className="mx-auto mb-2 flex max-w-2xl items-start gap-2 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2">
            <IconReply size={14} className="mt-0.5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <div className="text-label font-medium tabular-nums text-accent">
                Replying to {targets.length} message{targets.length > 1 ? "s" : ""}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {targets.map((tid) => {
                  const tm = messageById.get(tid);
                  if (!tm) return null;
                  return (
                    <span
                      key={tid}
                      className="inline-flex max-w-[14rem] items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-meta text-ink-secondary"
                    >
                      <span className="truncate">{tm.content}</span>
                      <button
                        onClick={() => toggleTarget(tid)}
                        aria-label="Remove target"
                        className="shrink-0 text-ink-muted transition-colors duration-150 hover:text-ink"
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
              className="shrink-0 text-label text-ink-muted transition-colors duration-150 hover:text-ink"
            >
              clear
            </button>
          </div>
        )}

        {/* Composer */}
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-line bg-fill p-2 shadow-highlight transition-colors duration-150 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20">
            <div className="flex items-center gap-1.5 px-1 pb-1.5">
              <IconCompass size={14} className="shrink-0 text-ink-muted" />
              <input
                value={steer}
                onChange={(e) => setSteer(e.target.value)}
                placeholder="optional: steer it — “be flirtier”, “ask her out”, “say something like…”"
                className="min-w-0 flex-1 bg-transparent text-xs text-ink-secondary outline-none placeholder:text-ink-faint"
              />
              {steer && (
                <button
                  onClick={() => setSteer("")}
                  aria-label="Clear steer"
                  className="shrink-0 text-ink-faint transition-colors duration-150 hover:text-ink"
                >
                  <IconClose size={13} />
                </button>
              )}
            </div>
            <div className="my-1 h-px bg-line" />
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
              className="max-h-40 min-h-[44px] w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-normal text-ink outline-none placeholder:text-ink-faint"
            />
            <div className="flex items-center justify-between gap-2 px-1 pt-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => addAs("me")}
                  disabled={!text.trim()}
                  className="inline-flex items-center rounded-md px-2.5 py-1.5 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add as me
                </button>
                <button
                  onClick={() => addAs("them")}
                  disabled={!text.trim()}
                  className="inline-flex items-center rounded-md px-2.5 py-1.5 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add as them
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden items-center gap-1.5 text-meta text-ink-muted sm:flex">
                  <span className="kbd">↵</span> generate ·{" "}
                  <span className="kbd">⇧↵</span> newline
                </span>
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate || suggesting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-label tabular-nums text-on-accent shadow-xs transition-colors duration-150 hover:bg-accent-strong motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
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
    </div>
  );
}
