"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  type TargetAndTransition,
  type Transition,
  type Variants,
} from "motion/react";
import {
  DUR,
  EASE_FADE,
  MotionButton,
  SPRING_MICRO,
  SPRING_MODAL,
  SPRING_SETTLE,
  bubbleVariants,
  collapseVariants,
  fadeUp,
  rm,
  scrimVariants,
  sheetVariants,
  suggestionCardVariants,
  useAppReducedMotion,
} from "@/components/motion";
import { cx } from "@/lib/cx";
import { clockTime } from "@/lib/time";
import { useIsCoarsePointer } from "@/lib/useCoarsePointer";
import type {
  ConversationDetail,
  Message,
  MessageRole,
  QueuedReply,
  ReplyOption,
  Role,
} from "@/lib/types";
import {
  IconBrain,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconClose,
  IconCompass,
  IconCopy,
  IconEdit,
  IconImport,
  IconMenu,
  IconQuote,
  IconRefresh,
  IconReply,
  IconSend,
  IconSparkles,
  IconSwap,
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

/** Actions offered by the mobile message action sheet. */
type SheetAction = "quote" | "target" | "flip" | "up" | "down" | "edit" | "delete";

/* ── Shared class recipes (tokens only) ─────────────────── */

/** Primary rose button — letterpress press (DESIGN.md §3): resting
 *  --shadow-press, :active inverts the insets and sinks toward accent-deep. */
const PRIMARY_BTN =
  "inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-label text-on-accent shadow-press transition-colors duration-150 hover:bg-accent-strong active:bg-[color-mix(in_oklch,var(--color-accent-strong)_85%,var(--color-accent-deep))] active:shadow-[inset_0_-1px_0_rgb(255_255_255/0.22),inset_0_1px_0_rgb(0_0_0/0.25)] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

const GHOST_BTN =
  "inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-label text-ink-secondary transition-colors duration-150 hover:border-accent/40 hover:bg-fill hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

/* ── Local variants (composed from the canonical springs) ── */

/** Suggestions panel: fadeUp(12) on SPRING_MODAL; dismiss exit per §5. */
const panelVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: SPRING_MODAL },
  exit: { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.17, ease: EASE_FADE } },
};

/** Old card leaving during a per-card regenerate (§5: 120ms blur fade). */
const cardBlurExit: TargetAndTransition = {
  opacity: 0,
  filter: "blur(2px)",
  transition: { duration: 0.12, ease: EASE_FADE },
};

/** Deal-out cards (first arrival of a set) — §6.1, custom={i}. */
const dealCardVariants: Variants = { ...suggestionCardVariants, exit: cardBlurExit };

/** Swapped-in card after a per-card regenerate. */
const swapCardVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.18, ease: EASE_FADE } },
  exit: cardBlurExit,
};

/** Queue items: listItem-style enter; "Mark sent" leaves toward the thread. */
const queueItemVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  enter: { opacity: 1, y: 0, transition: SPRING_SETTLE },
  exit: { opacity: 0, x: 24, transition: { duration: 0.18, ease: EASE_FADE } },
};

/** Targeting-bar chips. */
const chipVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  enter: { opacity: 1, scale: 1, transition: SPRING_MICRO },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.14, ease: EASE_FADE } },
};

/** Context note: settles straight down (no left/right slide — it's not a speaker). */
const contextNoteVariants: Variants = {
  initial: { opacity: 0, y: -4, scale: 0.98 },
  enter: { opacity: 1, y: 0, scale: 1, transition: SPRING_SETTLE },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.14, ease: EASE_FADE } },
};

/** Adds a stagger delay to a variants object's enter transition (mount cascade). */
function withEnterDelay(variants: Variants, delay: number): Variants {
  const enter = variants.enter;
  if (!enter || typeof enter !== "object") return variants;
  const target = enter as TargetAndTransition;
  return {
    ...variants,
    enter: { ...target, transition: { ...(target.transition as Transition | undefined), delay } },
  };
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
  onFlipMessage,
  onMoveMessage,
  onDeleteConversation,
  onDeleteQueued,
  onSendQueued,
  onOpenImport,
  onOpenFacts,
  onOpenProfile,
  onOpenMenu,
}: {
  detail: ConversationDetail;
  suggestions: ReplyOption[] | null;
  suggesting: boolean;
  suggestError: string | null;
  factsCount: number;
  onSuggest: (
    incoming: string,
    steer: string,
    targetIds: number[],
    replyToMessageId?: number | null,
  ) => void;
  onAddMessage: (role: MessageRole, content: string, replyToMessageId?: number | null) => void;
  onUseOption: (texts: string[]) => void;
  onQueueOption: (texts: string[], tone: string, targetId: number | null) => void;
  onRegenerateOne: (index: number, steer: string, targetIds: number[]) => Promise<void>;
  onDismissSuggestions: () => void;
  onDeleteMessage: (messageId: number) => void;
  onEditMessage: (messageId: number, content: string) => Promise<void>;
  onFlipMessage: (messageId: number) => void;
  onMoveMessage: (messageId: number, direction: "up" | "down") => void;
  onDeleteConversation: () => void;
  onDeleteQueued: (queueId: number) => void;
  onSendQueued: (q: QueuedReply) => void;
  onOpenImport: () => void;
  onOpenFacts: () => void;
  onOpenProfile: () => void;
  /** Mobile only: opens the conversations drawer from the merged header. */
  onOpenMenu?: () => void;
}) {
  const { conversation, messages, queued } = detail;
  const [text, setText] = useState("");
  const [steer, setSteer] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [targets, setTargets] = useState<number[]>([]);
  /** Persisted quote link for the NEXT added message (Instagram-style reply);
      distinct from `targets`, which only steers generation. */
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [queueOpen, setQueueOpen] = useState(true);
  const [regenIndex, setRegenIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  /** Message whose action sheet is open (touch devices only). */
  const [sheetId, setSheetId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const reduced = useAppReducedMotion();
  const isCoarse = useIsCoarsePointer();

  /* Mount-cascade bookkeeping (§5 Thread messages): on conversation mount the
     last 8 messages cascade in; everything older renders instantly; messages
     appended after mount animate individually. `seen` ids never re-animate,
     so a long thread does not re-stagger on unrelated state changes. */
  const mountedRef = useRef(false);
  const cascadeStartRef = useRef(Math.max(0, messages.length - 8));
  const seenRef = useRef<Set<number> | null>(null);
  if (seenRef.current === null) {
    seenRef.current = new Set(
      messages.slice(0, Math.max(0, messages.length - 8)).map((m) => m.id),
    );
  }
  const seen = seenRef.current;

  useEffect(() => {
    mountedRef.current = true;
  }, []);

  useEffect(() => {
    for (const m of messages) seen.add(m.id);
  }, [messages, seen]);

  /* §6.1 — distinguishes the full deal-out (fresh set) from a per-card swap. */
  const dealtRef = useRef(false);
  useEffect(() => {
    if (suggesting) dealtRef.current = false;
    else if (suggestions) dealtRef.current = true;
  }, [suggesting, suggestions]);

  /* §6.1(4) — "the room brightens when Cyrano speaks": pulse Blob A via the
     `.speaking` hook on the app backdrop for 1.6s when results arrive.
     Purely visual (CSS opacity transition); skipped under reduced motion. */
  useEffect(() => {
    if (reduced || suggesting || !suggestions) return;
    const el = document.querySelector(".app-backdrop");
    if (!el) return;
    el.classList.add("speaking");
    const t = window.setTimeout(() => el.classList.remove("speaking"), 1600);
    return () => {
      window.clearTimeout(t);
      el.classList.remove("speaking");
    };
  }, [reduced, suggesting, suggestions]);

  const messageById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, suggestions, suggesting]);

  // Drop any targets / quote link / open sheet whose message no longer exists.
  useEffect(() => {
    setTargets((prev) => prev.filter((id) => messageById.has(id)));
    setReplyTo((prev) => (prev !== null && messageById.has(prev) ? prev : null));
    setSheetId((prev) => (prev !== null && messageById.has(prev) ? prev : null));
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
      onSuggest(t, steer, targets, replyTo);
      setText("");
      setReplyTo(null);
    } else if (canRegenerate) {
      onSuggest("", steer, targets);
    }
  }

  function regenerate() {
    onSuggest("", steer, targets);
  }

  function addAs(role: MessageRole) {
    const t = text.trim();
    if (!t) return;
    onAddMessage(role, t, role === "context" ? null : replyTo);
    setText("");
    if (role !== "context") setReplyTo(null);
  }

  function handleSheetAction(act: SheetAction) {
    const m = sheetId !== null ? messageById.get(sheetId) : undefined;
    setSheetId(null);
    if (!m) return;
    switch (act) {
      case "quote":
        setReplyTo((prev) => (prev === m.id ? null : m.id));
        break;
      case "target":
        toggleTarget(m.id);
        break;
      case "flip":
        onFlipMessage(m.id);
        break;
      case "up":
        onMoveMessage(m.id, "up");
        break;
      case "down":
        onMoveMessage(m.id, "down");
        break;
      case "edit":
        startEdit(m.id, m.content);
        break;
      case "delete":
        onDeleteMessage(m.id);
        break;
    }
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

  const rmCollapse = rm(reduced, collapseVariants);
  const rmChip = rm(reduced, chipVariants);
  const rmPanel = rm(reduced, panelVariants);
  const rmHeader = rm(reduced, fadeUp(6));

  return (
    <div className="flex h-full flex-col">
      {/* Header — sticky glass; fades up on conversation mount (§6.2) */}
      <motion.header
        variants={rmHeader}
        initial="initial"
        animate="enter"
        className="glass-header flex h-16 shrink-0 items-center justify-between border-b border-line px-3 pt-[env(safe-area-inset-top)] sm:px-6"
      >
        {onOpenMenu && (
          <MotionButton
            onClick={onOpenMenu}
            aria-label="Open conversations"
            className="hit mr-1 shrink-0 rounded-md p-2 text-ink-secondary transition-colors duration-150 hover:bg-fill-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:hidden"
          >
            <IconMenu size={20} />
          </MotionButton>
        )}
        <MotionButton
          onClick={onOpenProfile}
          title="Edit profile"
          className="group/profile flex min-w-0 items-center gap-3 rounded-md px-1 py-0.5 text-left transition-colors duration-150 hover:bg-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent/25 to-accent-strong/10 text-title text-accent ring-1 ring-line">
            {conversation.name.slice(0, 1).toUpperCase() || <IconUser size={16} />}
            {/* §6.2 — the avatar ring draws once per conversation switch */}
            <motion.svg
              aria-hidden="true"
              viewBox="0 0 36 36"
              className="absolute inset-0 h-full w-full -rotate-90"
            >
              <motion.circle
                cx="18"
                cy="18"
                r="17.25"
                fill="none"
                stroke="var(--color-accent)"
                strokeOpacity={0.55}
                strokeWidth="1.5"
                strokeLinecap="round"
                initial={reduced ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: EASE_FADE }}
              />
            </motion.svg>
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {/* §6.2 — "Her name in ink": Fraunces persona name, pen-stroke reveal */}
              <span className="animate-ink truncate font-display text-persona text-ink">
                {conversation.name}
              </span>
              <IconEdit
                size={12}
                className="shrink-0 text-ink-faint opacity-0 transition-opacity duration-150 group-hover/profile:opacity-100 group-focus-visible/profile:opacity-100"
              />
            </div>
            {conversation.platform && (
              <div className="text-meta text-ink-muted">{conversation.platform}</div>
            )}
          </div>
        </MotionButton>
        <div className="flex shrink-0 items-center gap-1.5">
          <MotionButton onClick={onOpenImport} className={cx(GHOST_BTN, "hit-sm")}>
            <IconImport size={15} />
            <span className="hidden sm:inline">Import</span>
          </MotionButton>
          <MotionButton onClick={onOpenFacts} className={cx(GHOST_BTN, "hit-sm xl:hidden")}>
            <IconBrain size={15} />
            {factsCount > 0 && <span className="tabular-nums">{factsCount}</span>}
          </MotionButton>
          <MotionButton
            onClick={onDeleteConversation}
            aria-label="Delete conversation"
            className="hit inline-flex items-center justify-center rounded-md p-1.5 text-ink-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <IconTrash size={16} />
          </MotionButton>
        </div>
      </motion.header>

      {/* Thread + suggestions */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-2xl space-y-3">
          {messages.length === 0 && (
            <motion.div
              variants={rm(reduced, fadeUp(6))}
              initial="initial"
              animate="enter"
              className="mx-auto mt-16 max-w-sm rounded-lg border border-dashed border-line-strong p-6 text-center"
            >
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent">
                <IconSparkles size={20} />
              </span>
              {/* §6.3 small drop cap — accent-tinted first letter */}
              <p className="drop-cap-sm mt-3 font-display text-display text-ink">
                No messages yet.
              </p>
              <p className="mt-1 text-xs leading-normal text-ink-muted">
                Paste what {conversation.name} said in the box below and hit Generate — Cyrano
                will hand you a few ways to reply.
              </p>
              <MotionButton onClick={onOpenImport} className={cx(GHOST_BTN, "mt-4")}>
                <IconImport size={14} /> Import an existing thread
              </MotionButton>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((m, idx) => {
              const isTarget = m.role === "them" && targets.includes(m.id);
              const isEditing = editingId === m.id;
              const isNew = !seen.has(m.id);

              // Context notes are situational, not a speaker: centered, muted,
              // never a reply target. Rendered before the bubble path so the
              // remaining role narrows to "them" | "me".
              if (m.role === "context") {
                return (
                  <motion.div
                    key={m.id}
                    layout={reduced ? false : "position"}
                    variants={rm(reduced, contextNoteVariants)}
                    initial={isNew ? "initial" : false}
                    animate="enter"
                    exit="exit"
                    className="group flex justify-center"
                  >
                    {isEditing ? (
                      <div className="w-full max-w-[80%]">
                        <textarea
                          autoFocus
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && !isCoarse) {
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
                          <MotionButton
                            onClick={cancelEdit}
                            className="inline-flex items-center rounded-md px-2 py-1 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
                          >
                            Cancel
                          </MotionButton>
                          <MotionButton
                            onClick={() => void saveEdit(m.id)}
                            disabled={!editText.trim()}
                            className={PRIMARY_BTN}
                          >
                            Save
                          </MotionButton>
                        </div>
                      </div>
                    ) : (
                      <div className="flex max-w-[85%] items-center gap-1.5">
                        <div
                          className="flex items-center gap-2 rounded-md border border-line bg-fill px-3 py-1"
                          title={clockTime(m.created_at)}
                          onClick={isCoarse ? () => setSheetId(m.id) : undefined}
                        >
                          <span className="shrink-0 text-meta font-semibold uppercase tracking-wider text-ink-faint">
                            context
                          </span>
                          <span className="whitespace-pre-wrap break-words text-xs italic leading-normal text-ink-secondary">
                            {m.content}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                          <MotionButton
                            onClick={() => startEdit(m.id, m.content)}
                            aria-label="Edit context"
                            title="Edit context"
                            className="hit-sm text-ink-faint transition-colors duration-150 hover:text-ink"
                          >
                            <IconEdit size={13} />
                          </MotionButton>
                          <MotionButton
                            onClick={() => onDeleteMessage(m.id)}
                            aria-label="Delete context"
                            title="Delete context"
                            className="hit-sm text-ink-faint transition-colors duration-150 hover:text-danger"
                          >
                            <IconTrash size={13} />
                          </MotionButton>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              }

              const cascadeDelay =
                !mountedRef.current && isNew
                  ? Math.max(0, idx - cascadeStartRef.current) * 0.03
                  : 0;
              const base = bubbleVariants(m.role);
              const rowVariants = rm(
                reduced,
                cascadeDelay > 0 ? withEnterDelay(base, cascadeDelay) : base,
              );

              const isQuoteSource = replyTo === m.id;
              const actions = (
                <div
                  className={cx(
                    "mb-0.5 grid grid-cols-2 items-center gap-1 transition-[opacity,transform] duration-150",
                    isTarget || isQuoteSource
                      ? "opacity-100"
                      : cx(
                          "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                          m.role === "me"
                            ? "-translate-x-1 group-hover:translate-x-0 group-focus-within:translate-x-0"
                            : "translate-x-1 group-hover:translate-x-0 group-focus-within:translate-x-0",
                        ),
                  )}
                >
                  <MotionButton
                    onClick={() => setReplyTo((prev) => (prev === m.id ? null : m.id))}
                    aria-label={
                      isQuoteSource ? "Stop quoting this message" : "Next added message replies to this"
                    }
                    title={
                      isQuoteSource
                        ? "Stop quoting this message"
                        : "Quote: the next message you add replies to this one"
                    }
                    className={cx(
                      "hit-sm transition-colors duration-150",
                      isQuoteSource ? "text-accent" : "text-ink-faint hover:text-ink",
                    )}
                  >
                    <IconQuote size={13} />
                  </MotionButton>
                  {m.role === "them" && (
                    <MotionButton
                      onClick={() => toggleTarget(m.id)}
                      aria-label={isTarget ? "Stop replying to this" : "Reply to this message"}
                      title={isTarget ? "Stop replying to this" : "Reply to this message"}
                      className={cx(
                        "hit-sm transition-colors duration-150",
                        isTarget ? "text-accent" : "text-ink-faint hover:text-ink",
                      )}
                    >
                      <IconReply size={14} />
                    </MotionButton>
                  )}
                  <MotionButton
                    onClick={() => onFlipMessage(m.id)}
                    aria-label="Flip sender (me/them)"
                    title={`Flip sender — make this ${m.role === "me" ? `${conversation.name}'s` : "my"} message`}
                    className="hit-sm text-ink-faint transition-colors duration-150 hover:text-ink"
                  >
                    <IconSwap size={13} />
                  </MotionButton>
                  <MotionButton
                    onClick={() => onMoveMessage(m.id, "up")}
                    disabled={idx === 0}
                    aria-label="Move message up"
                    title="Move up"
                    className="hit-sm text-ink-faint transition-colors duration-150 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                  >
                    <IconChevronUp size={13} />
                  </MotionButton>
                  <MotionButton
                    onClick={() => onMoveMessage(m.id, "down")}
                    disabled={idx === messages.length - 1}
                    aria-label="Move message down"
                    title="Move down"
                    className="hit-sm text-ink-faint transition-colors duration-150 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                  >
                    <IconChevronDown size={13} />
                  </MotionButton>
                  <MotionButton
                    onClick={() => startEdit(m.id, m.content)}
                    aria-label="Edit message"
                    title="Edit message"
                    className="hit-sm text-ink-faint transition-colors duration-150 hover:text-ink"
                  >
                    <IconEdit size={13} />
                  </MotionButton>
                  <MotionButton
                    onClick={() => onDeleteMessage(m.id)}
                    aria-label="Delete message"
                    title="Delete message"
                    className="hit-sm text-ink-faint transition-colors duration-150 hover:text-danger"
                  >
                    <IconTrash size={13} />
                  </MotionButton>
                </div>
              );

              return (
                <motion.div
                  key={m.id}
                  layout={reduced ? false : "position"}
                  variants={rowVariants}
                  initial={isNew ? "initial" : false}
                  animate="enter"
                  exit="exit"
                  className={cx(
                    "flex",
                    m.role === "me" ? "justify-end" : "justify-start",
                    !isEditing && "group items-end gap-2",
                  )}
                >
                  {isEditing ? (
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
                        <MotionButton
                          onClick={cancelEdit}
                          className="inline-flex items-center rounded-md px-2 py-1 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
                        >
                          Cancel
                        </MotionButton>
                        <MotionButton
                          onClick={() => void saveEdit(m.id)}
                          disabled={!editText.trim()}
                          className={PRIMARY_BTN}
                        >
                          Save
                        </MotionButton>
                      </div>
                    </div>
                  ) : (
                    <>
                      {m.role === "me" && actions}
                      {/* Bubble — target toggle-on pulses once (§5); ring stays CSS */}
                      <motion.div
                        id={`msg-${m.id}`}
                        onClick={isCoarse ? () => setSheetId(m.id) : undefined}
                        animate={
                          reduced ? undefined : { scale: isTarget ? [1, 1.015, 1] : 1 }
                        }
                        transition={{ duration: 0.26, ease: EASE_FADE }}
                        className={cx(
                          "max-w-[78%] rounded-lg px-3.5 py-2 text-sm leading-normal",
                          m.role === "me"
                            ? "rounded-br-sm bg-accent text-on-accent shadow-highlight"
                            : "rounded-bl-sm bg-fill text-ink ring-1 ring-line",
                          isTarget && "ring-2 ring-accent/70",
                          isQuoteSource && "ring-2 ring-accent/50",
                        )}
                        title={clockTime(m.created_at)}
                      >
                        {(() => {
                          const quoted =
                            m.reply_to_message_id !== null
                              ? messageById.get(m.reply_to_message_id)
                              : undefined;
                          if (!quoted) return null;
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                document
                                  .getElementById(`msg-${quoted.id}`)
                                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
                              }}
                              title="Jump to the quoted message"
                              className={cx(
                                "mb-1.5 flex w-full items-center gap-1.5 rounded-md border-l-2 px-2 py-1 text-left text-xs transition-colors duration-150",
                                m.role === "me"
                                  ? "border-white/50 bg-black/15 text-on-accent/85 hover:bg-black/25"
                                  : "border-accent/60 bg-black/20 text-ink-muted hover:bg-black/30",
                              )}
                            >
                              <IconQuote size={10} className="shrink-0 opacity-70" />
                              <span className="truncate">
                                <span className="font-medium">
                                  {quoted.role === "me" ? "You" : conversation.name}:
                                </span>{" "}
                                {quoted.content}
                              </span>
                            </button>
                          );
                        })()}
                        <span className="whitespace-pre-wrap break-words">{m.content}</span>
                      </motion.div>
                      {m.role === "them" && actions}
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Suggestions — "the reply arrives like a letter" (§6.1) */}
          <AnimatePresence>
            {(suggesting || suggestions || suggestError) && (
              <motion.div
                key="suggestions-panel"
                variants={rmPanel}
                initial="initial"
                animate="enter"
                exit="exit"
                className={cx(
                  "rose-rule !mt-6 rounded-lg border border-line bg-fill p-4",
                  !suggesting && suggestions && "drawing",
                )}
              >
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
                      <MotionButton
                        onClick={regenerate}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 max-md:py-2 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
                      >
                        <IconRefresh size={13} /> Regenerate
                      </MotionButton>
                      <MotionButton
                        onClick={onDismissSuggestions}
                        className="inline-flex items-center rounded-md px-2 py-1 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
                      >
                        Dismiss
                      </MotionButton>
                    </div>
                  )}
                </div>

                <AnimatePresence mode="popLayout" initial={false}>
                  {suggesting && (
                    <motion.div
                      key="skeletons"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={
                        reduced
                          ? { opacity: 0, transition: { duration: 0.12, ease: EASE_FADE } }
                          : {
                              opacity: 0,
                              filter: "blur(3px)",
                              transition: { duration: 0.12, ease: EASE_FADE },
                            }
                      }
                      transition={{ duration: DUR.fast, ease: EASE_FADE }}
                      className="space-y-2"
                    >
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-lg border border-line bg-fill p-3">
                          <div className="skeleton h-3 w-3/4 rounded" />
                          <div className="skeleton mt-2 h-3 w-1/2 rounded" />
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {!suggesting && suggestError && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE_FADE } }}
                      transition={{ duration: DUR.base, ease: EASE_FADE }}
                      className="rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger"
                    >
                      {suggestError}
                      <MotionButton
                        onClick={regenerate}
                        className="mt-2 block text-xs text-danger underline underline-offset-2 transition-colors duration-150 hover:text-ink"
                      >
                        Try again
                      </MotionButton>
                    </motion.div>
                  )}

                  {!suggesting && suggestions && (
                    <motion.div
                      key="cards"
                      initial={false}
                      exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE_FADE } }}
                      className="space-y-2"
                    >
                      <AnimatePresence mode="popLayout">
                        {suggestions.map((opt, i) => {
                          const busy = regenIndex === i;
                          const isSwap = dealtRef.current;
                          const cardV = rm(reduced, isSwap ? swapCardVariants : dealCardVariants);
                          const chipDelay = reduced ? 0 : isSwap ? 0.06 : i * 0.09 + 0.06;
                          return (
                            <motion.div
                              key={`${i}:${opt.texts.join(" ")}`}
                              custom={i}
                              layout={reduced ? false : "position"}
                              variants={cardV}
                              initial="initial"
                              animate="enter"
                              exit="exit"
                              className="rounded-lg border border-line bg-fill p-3 transition-colors duration-150 hover:border-line-strong hover:bg-fill-hover"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-y-1.5">
                                {/* Tone chip — the wax seal (§6.1) */}
                                <motion.span
                                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={
                                    reduced
                                      ? { duration: 0.12, ease: EASE_FADE }
                                      : { ...SPRING_MICRO, delay: chipDelay }
                                  }
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
                                </motion.span>
                                <div className="flex flex-wrap items-center justify-end gap-1">
                                  <MotionButton
                                    onClick={() => regenerateOne(i)}
                                    disabled={regenIndex !== null}
                                    title="Regenerate just this one"
                                    aria-label="Regenerate this reply"
                                    className="hit-sm inline-flex items-center justify-center rounded-md p-1.5 max-md:p-2 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {busy ? <Spinner size={13} /> : <IconRefresh size={13} />}
                                  </MotionButton>
                                  <MotionButton
                                    onClick={() => copyValue(opt.texts.join("\n"), `opt-${i}`)}
                                    disabled={busy}
                                    aria-label="Copy reply"
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 max-md:py-2 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink disabled:opacity-50"
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
                                  </MotionButton>
                                  <MotionButton
                                    onClick={() =>
                                      onQueueOption(opt.texts, opt.tone, primaryTargetId)
                                    }
                                    disabled={busy}
                                    aria-label="Queue reply"
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 max-md:py-2 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink disabled:opacity-50"
                                  >
                                    <IconClock size={13} /> Queue
                                  </MotionButton>
                                  <MotionButton
                                    onClick={() => {
                                      void copyValue(opt.texts.join("\n"), `opt-${i}`);
                                      onUseOption(opt.texts);
                                    }}
                                    disabled={busy}
                                    className={PRIMARY_BTN}
                                  >
                                    <IconSend size={13} /> Use
                                  </MotionButton>
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
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      <p className="px-1 pt-1 text-meta text-ink-muted">
                        “Use” sends now (logs to the thread); “Queue” saves it as a draft for
                        later.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Bottom: queue + targeting + composer — the dock never moves */}
      <div className="glass-dock shrink-0 border-t border-line px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {/* Queued replies */}
        <AnimatePresence initial={false}>
          {queued.length > 0 && (
            <motion.div
              key="queue"
              variants={rmCollapse}
              initial="initial"
              animate="enter"
              exit="exit"
              className="mx-auto w-full max-w-2xl overflow-hidden"
            >
              <div className="pb-2">
                <div className="rounded-lg border border-line bg-fill">
                  <MotionButton
                    onClick={() => setQueueOpen((o) => !o)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-label font-medium text-ink-secondary transition-colors duration-150"
                  >
                    <span className="flex items-center gap-1.5">
                      <IconClock size={14} className="text-accent" /> Queued replies ·{" "}
                      <span className="tabular-nums">{queued.length}</span>
                    </span>
                    <span className="text-ink-muted">{queueOpen ? "hide" : "show"}</span>
                  </MotionButton>
                  <AnimatePresence initial={false}>
                    {queueOpen && (
                      <motion.div
                        key="queue-list"
                        variants={rmCollapse}
                        initial="initial"
                        animate="enter"
                        exit="exit"
                        className="overflow-hidden"
                      >
                        <div className="max-h-56 space-y-1.5 overflow-y-auto px-3 pb-3">
                          <AnimatePresence mode="popLayout" initial={false}>
                            {queued.map((q) => {
                              const tm = q.target_message_id
                                ? messageById.get(q.target_message_id)
                                : null;
                              const parts = q.content.split("\n").filter((l) => l.trim());
                              return (
                                <motion.div
                                  key={q.id}
                                  layout={reduced ? false : "position"}
                                  variants={rm(reduced, queueItemVariants)}
                                  initial="initial"
                                  animate="enter"
                                  exit="exit"
                                  className="rounded-lg border border-line bg-fill p-2.5 transition-colors duration-150 hover:border-line-strong hover:bg-fill-hover"
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
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1 gap-y-1">
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
                                    <MotionButton
                                      onClick={() => copyValue(q.content, `q-${q.id}`)}
                                      aria-label="Copy queued reply"
                                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 max-md:py-2 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
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
                                    </MotionButton>
                                    <MotionButton
                                      onClick={() => onDeleteQueued(q.id)}
                                      className="inline-flex items-center rounded-md px-2 py-1 max-md:py-2 text-label text-ink-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
                                    >
                                      Delete
                                    </MotionButton>
                                    <MotionButton
                                      onClick={() => onSendQueued(q)}
                                      className={PRIMARY_BTN}
                                    >
                                      <IconSend size={13} /> Mark sent
                                    </MotionButton>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Targeting bar */}
        <AnimatePresence initial={false}>
          {targets.length > 0 && (
            <motion.div
              key="targeting"
              variants={rmCollapse}
              initial="initial"
              animate="enter"
              exit="exit"
              className="mx-auto w-full max-w-2xl overflow-hidden"
            >
              <div className="pb-2">
                <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2">
                  <IconReply size={14} className="mt-0.5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="text-label font-medium tabular-nums text-accent">
                      Replying to {targets.length} message{targets.length > 1 ? "s" : ""}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <AnimatePresence initial={false}>
                        {targets.map((tid) => {
                          const tm = messageById.get(tid);
                          if (!tm) return null;
                          return (
                            <motion.span
                              key={tid}
                              layout={reduced ? false : "position"}
                              variants={rmChip}
                              initial="initial"
                              animate="enter"
                              exit="exit"
                              className="inline-flex max-w-[14rem] items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-meta text-ink-secondary"
                            >
                              <span className="truncate">{tm.content}</span>
                              <MotionButton
                                onClick={() => toggleTarget(tid)}
                                aria-label="Remove target"
                                className="hit shrink-0 text-ink-muted transition-colors duration-150 hover:text-ink"
                              >
                                <IconClose size={11} />
                              </MotionButton>
                            </motion.span>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                  <MotionButton
                    onClick={() => setTargets([])}
                    className="shrink-0 text-label text-ink-muted transition-colors duration-150 hover:text-ink"
                  >
                    clear
                  </MotionButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Composer */}
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-line bg-fill p-2 shadow-highlight transition-colors duration-150 focus-within:border-line-accent focus-within:ring-[3px] focus-within:ring-accent/12">
            <div className="flex items-center gap-1.5 px-1 pb-1.5">
              <IconCompass size={14} className="shrink-0 text-ink-muted" />
              <input
                value={steer}
                onChange={(e) => setSteer(e.target.value)}
                placeholder="optional: steer it — “be flirtier”, “ask her out”, “say something like…”"
                className="min-w-0 flex-1 bg-transparent text-xs text-ink-secondary outline-none placeholder:text-ink-muted"
              />
              {steer && (
                <MotionButton
                  onClick={() => setSteer("")}
                  aria-label="Clear steer"
                  className="shrink-0 text-ink-faint transition-colors duration-150 hover:text-ink"
                >
                  <IconClose size={13} />
                </MotionButton>
              )}
            </div>
            <div className="my-1 h-px bg-line" />
            <AnimatePresence initial={false}>
              {replyTo !== null && messageById.has(replyTo) && (
                <motion.div
                  key="quote-chip"
                  variants={rmChip}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  className="mx-1 mb-1 flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent-soft px-2 py-1"
                >
                  <IconQuote size={12} className="shrink-0 text-accent" />
                  <span className="min-w-0 flex-1 truncate text-meta text-ink-secondary">
                    <span className="font-medium text-accent">
                      replies to {messageById.get(replyTo)!.role === "me" ? "you" : conversation.name}:
                    </span>{" "}
                    {messageById.get(replyTo)!.content}
                  </span>
                  <MotionButton
                    onClick={() => setReplyTo(null)}
                    aria-label="Remove quote link"
                    className="hit shrink-0 text-ink-muted transition-colors duration-150 hover:text-ink"
                  >
                    <IconClose size={12} />
                  </MotionButton>
                </motion.div>
              )}
            </AnimatePresence>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Touch keyboards: Enter inserts a newline; Generate is the button.
                if (e.key === "Enter" && !e.shiftKey && !isCoarse) {
                  e.preventDefault();
                  if (canGenerate) handleGenerate();
                }
              }}
              rows={2}
              placeholder={`Paste ${conversation.name}'s latest message…`}
              className="max-h-40 min-h-[44px] w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-normal text-ink outline-none placeholder:text-ink-muted"
            />
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-1 pt-1">
              <div className="flex items-center gap-1">
                <MotionButton
                  onClick={() => addAs("me")}
                  disabled={!text.trim()}
                  className="inline-flex items-center rounded-md px-2.5 py-1.5 max-md:py-2.5 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="sm:hidden">+ Me</span>
                  <span className="hidden sm:inline">Add as me</span>
                </MotionButton>
                <MotionButton
                  onClick={() => addAs("them")}
                  disabled={!text.trim()}
                  className="inline-flex items-center rounded-md px-2.5 py-1.5 max-md:py-2.5 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="sm:hidden">+ Them</span>
                  <span className="hidden sm:inline">Add as them</span>
                </MotionButton>
                <MotionButton
                  onClick={() => addAs("context")}
                  disabled={!text.trim()}
                  title="Drop in a situational note for Cyrano (not a message)"
                  className="inline-flex items-center rounded-md px-2.5 py-1.5 max-md:py-2.5 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="sm:hidden">+ Note</span>
                  <span className="hidden sm:inline">Add as context</span>
                </MotionButton>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden items-center gap-1.5 text-meta text-ink-muted sm:flex">
                  <span className="kbd">↵</span> generate ·{" "}
                  <span className="kbd">⇧↵</span> newline
                </span>
                {/* Generate — the only glowing control; wick ring while thinking (§6.4) */}
                <MotionButton
                  onClick={handleGenerate}
                  disabled={!canGenerate || suggesting}
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 max-md:py-2.5 text-label tabular-nums text-on-accent transition-colors duration-150 hover:bg-accent-strong",
                    "shadow-[var(--shadow-press),var(--shadow-glow)]",
                    "active:bg-[color-mix(in_oklch,var(--color-accent-strong)_85%,var(--color-accent-deep))]",
                    "active:shadow-[inset_0_-1px_0_rgb(255_255_255/0.22),inset_0_1px_0_rgb(0_0_0/0.25),var(--shadow-glow)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                    "disabled:pointer-events-none",
                    suggesting ? "wick-ring" : "disabled:opacity-40",
                  )}
                >
                  {suggesting ? <Spinner size={14} /> : <IconSparkles size={15} />}
                  {targets.length > 0
                    ? `Reply to ${targets.length}`
                    : text.trim() || !canRegenerate
                      ? "Generate replies"
                      : "Regenerate"}
                </MotionButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile message action sheet — touch replacement for the hover cluster */}
      <AnimatePresence>
        {sheetId !== null &&
          (() => {
            const m = messageById.get(sheetId);
            if (!m) return null;
            const orderIdx = messages.findIndex((x) => x.id === m.id);
            return (
              <MessageActionsSheet
                key="message-sheet"
                message={m}
                conversationName={conversation.name}
                isFirst={orderIdx === 0}
                isLast={orderIdx === messages.length - 1}
                isQuoteSource={replyTo === m.id}
                isTarget={targets.includes(m.id)}
                reduced={reduced}
                onAction={handleSheetAction}
                onClose={() => setSheetId(null)}
              />
            );
          })()}
      </AnimatePresence>
    </div>
  );
}

/** Bottom sheet with labeled message actions — the touch replacement for the
 *  hover-only action cluster next to each bubble. */
function MessageActionsSheet({
  message,
  conversationName,
  isFirst,
  isLast,
  isQuoteSource,
  isTarget,
  reduced,
  onAction,
  onClose,
}: {
  message: Message;
  conversationName: string;
  isFirst: boolean;
  isLast: boolean;
  isQuoteSource: boolean;
  isTarget: boolean;
  reduced: boolean;
  onAction: (act: SheetAction) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isContext = message.role === "context";
  const speaker = isContext ? "Context note" : message.role === "me" ? "You" : conversationName;

  const rows: Array<{
    act: SheetAction;
    label: string;
    icon: ReactNode;
    disabled?: boolean;
    danger?: boolean;
    active?: boolean;
  }> = isContext
    ? [
        { act: "edit", label: "Edit note", icon: <IconEdit size={16} /> },
        { act: "delete", label: "Delete note", icon: <IconTrash size={16} />, danger: true },
      ]
    : [
        {
          act: "quote",
          label: isQuoteSource ? "Stop quoting this" : "Quote in the next message",
          icon: <IconQuote size={16} />,
          active: isQuoteSource,
        },
        ...(message.role === "them"
          ? [
              {
                act: "target" as SheetAction,
                label: isTarget ? "Stop replying to this" : "Reply to this message",
                icon: <IconReply size={16} />,
                active: isTarget,
              },
            ]
          : []),
        {
          act: "flip",
          label:
            message.role === "me"
              ? `Make this ${conversationName}'s message`
              : "Make this my message",
          icon: <IconSwap size={16} />,
        },
        { act: "up", label: "Move up", icon: <IconChevronUp size={16} />, disabled: isFirst },
        { act: "down", label: "Move down", icon: <IconChevronDown size={16} />, disabled: isLast },
        { act: "edit", label: "Edit message", icon: <IconEdit size={16} /> },
        { act: "delete", label: "Delete message", icon: <IconTrash size={16} />, danger: true },
      ];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Message actions">
      <motion.button
        variants={rm(reduced, scrimVariants)}
        initial="initial"
        animate="enter"
        exit="exit"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-[6px]"
      />
      <motion.div
        variants={rm(reduced, sheetVariants)}
        initial="initial"
        animate="enter"
        exit="exit"
        className="glass-drawer absolute inset-x-0 bottom-0 rounded-t-xl border-t border-line-strong pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-line-strong" />
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <span className="shrink-0 text-label font-medium text-ink-secondary">{speaker}:</span>
          <span className="truncate text-sm text-ink-muted">{message.content}</span>
        </div>
        <div className="py-1">
          {rows.map((r) => (
            <MotionButton
              key={r.act}
              onClick={() => onAction(r.act)}
              disabled={r.disabled}
              className={cx(
                "flex min-h-12 w-full items-center gap-3 px-5 text-left text-sm transition-colors duration-150",
                r.danger ? "text-danger" : r.active ? "text-accent" : "text-ink",
                "disabled:opacity-35 active:bg-fill",
              )}
            >
              <span className={r.danger ? "text-danger" : r.active ? "text-accent" : "text-ink-muted"}>
                {r.icon}
              </span>
              {r.label}
            </MotionButton>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
