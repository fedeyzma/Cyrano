"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  type TargetAndTransition,
  type Transition,
  type Variants,
} from "motion/react";
import {
  DUR,
  EASE_INK,
  MotionButton,
  SPRING_MICRO,
  SPRING_SETTLE,
  SPRING_SHEET,
  bubbleVariants,
  collapseVariants,
  fadeUp,
  rm,
  scrimVariants,
  sealVariants,
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
} from "@/lib/types";
import {
  IconBrain,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClose,
  IconCopy,
  IconEdit,
  IconImport,
  IconMenu,
  IconQuill,
  IconQuote,
  IconRefresh,
  IconReply,
  IconSend,
  IconSparkles,
  IconSwap,
  IconTrash,
} from "./icons";
import {
  Button,
  EmptyState,
  IconButton,
  SealDisc,
  Spinner,
  Tag,
  Textarea,
  cardClass,
  focusRing,
} from "./ui";

/* ── Tone chip inks (DESIGN.md §2/§5 — tinted glass pills) ── */

const TONE_STYLES: Record<string, string> = {
  dry: "bg-tone-dry/12 text-tone-dry ring-tone-dry/30",
  playful: "bg-tone-playful/12 text-tone-playful ring-tone-playful/30",
  curious: "bg-tone-curious/12 text-tone-curious ring-tone-curious/30",
  flirty: "bg-tone-flirty/12 text-tone-flirty ring-tone-flirty/30",
  sincere: "bg-tone-sincere/12 text-tone-sincere ring-tone-sincere/30",
  bold: "bg-tone-bold/12 text-tone-bold ring-tone-bold/30",
};

function toneStyle(tone: string): string {
  return TONE_STYLES[tone.toLowerCase().trim()] ?? "bg-fill text-ink-secondary ring-line-strong";
}

/** Tone pill — sentence case on a soft tinted wash (§5). */
const TONE_CHIP = "inline-flex items-center rounded-full px-2 py-0.5 text-folio ring-1";

/** Actions offered by the mobile message action sheet. */
type SheetAction = "quote" | "target" | "flip" | "up" | "down" | "edit" | "delete";

/** Quoted-reply previews show a glimpse, not the message — a hard clamp so a
 *  long quoted text can never stretch the reply bubble wide. */
const QUOTE_PREVIEW_CHARS = 20;
function clipQuote(s: string): string {
  const t = s.trim();
  return t.length > QUOTE_PREVIEW_CHARS ? `${t.slice(0, QUOTE_PREVIEW_CHARS).trimEnd()}…` : t;
}

/* ── Shared class recipes (tokens only) ─────────────────── */

/** Generate — the one glowing thing (§7E): gold gradient pill wearing the
 *  gilt halo. Press is the Squish (MotionButton) plus a dimmed fill; never
 *  a translate. Kept inline because the composed gilt+plate shadow must
 *  survive every state. */
const GENERATE_BTN = cx(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-label font-semibold tabular-nums text-on-accent transition-[background,box-shadow,filter] duration-150 max-md:py-3",
  "bg-[linear-gradient(180deg,var(--color-accent),var(--color-accent-strong))]",
  "shadow-[var(--shadow-plate),var(--shadow-gilt)]",
  "hover:bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-accent)_90%,white),color-mix(in_srgb,var(--color-accent-strong)_90%,white))]",
  "active:bg-[linear-gradient(180deg,var(--color-accent-strong),var(--color-accent-strong))]",
  "disabled:pointer-events-none",
  focusRing,
);

/** "Mark sent" — the commitment completing: laurel ghost pill (§7B). */
const SEND_BTN = cx(
  "inline-flex min-h-7 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-line-laurel px-3 py-1 text-label font-medium text-laurel transition-colors duration-150",
  "hover:border-laurel-strong hover:bg-laurel-soft active:bg-laurel-soft",
  "disabled:pointer-events-none disabled:opacity-50",
  focusRing,
);

/* ── Local variants (composed from the canonical springs) ── */

/** The suggestions panel rises y 16→0 on SPRING_SHEET (§7A). */
const panelVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  enter: { opacity: 1, y: 0, transition: SPRING_SHEET },
  exit: { opacity: 0, y: 8, transition: { duration: 0.15, ease: EASE_INK } },
};

/** Melt — a card leaving during a per-card regenerate (§6.7). */
const cardMeltExit: TargetAndTransition = {
  opacity: 0,
  filter: "blur(4px)",
  transition: { duration: 0.14, ease: EASE_INK },
};

/** The Float In (first arrival of a set) — §7A(3), custom={i}. */
const dealCardVariants: Variants = { ...suggestionCardVariants, exit: cardMeltExit };

/** Swapped-in card after a per-card regenerate: y 4→0, 180ms. */
const swapCardVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  enter: { opacity: 1, y: 0, transition: { duration: DUR.leaf, ease: EASE_INK } },
  exit: cardMeltExit,
};

/** Queue items: settle in; "Mark sent" Melts toward the thread (§7B). */
const queueItemVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  enter: { opacity: 1, y: 0, transition: SPRING_SETTLE },
  exit: { opacity: 0, x: 24, transition: { duration: DUR.leaf, ease: EASE_INK } },
};

/** Targeting-bar chips. */
const chipVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  enter: { opacity: 1, scale: 1, transition: SPRING_MICRO },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.14, ease: EASE_INK } },
};

/** Context note: a floating chip settling straight down — not a speaker. */
const contextNoteVariants: Variants = {
  initial: { opacity: 0, y: -4 },
  enter: { opacity: 1, y: 0, transition: SPRING_SETTLE },
  exit: { opacity: 0, transition: { duration: 0.14, ease: EASE_INK } },
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

/* ── Match Strike (§6.8) — check flares gold, cools to laurel ── */

function StrikeCheck({ reduced, size = 13 }: { reduced: boolean; size?: number }) {
  if (reduced) {
    return (
      <span className="inline-flex text-success">
        <IconCheck size={size} />
      </span>
    );
  }
  return (
    <motion.span
      className="inline-flex"
      initial={{ color: "var(--color-accent)" }}
      animate={{ color: "var(--color-success)" }}
      transition={{ duration: 0.4, ease: EASE_INK }}
    >
      <IconCheck size={size} />
    </motion.span>
  );
}

/* ── Capsule toolbar button (§7C) ───────────────────────── */

function RailButton({
  label,
  danger = false,
  active = false,
  tone = "gilt",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  danger?: boolean;
  active?: boolean;
  /** Pigment when active/hovered: gilt (default) or laurel (reply-targeting). */
  tone?: "gilt" | "laurel";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tip={label}
      className={cx(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-150 disabled:pointer-events-none disabled:opacity-35",
        danger
          ? "text-ink-secondary hover:bg-danger-soft hover:text-danger"
          : active
            ? cx(tone === "laurel" ? "text-laurel" : "text-accent", "hover:bg-fill")
            : cx(
                "text-ink-secondary hover:bg-fill",
                tone === "laurel" ? "hover:text-laurel" : "hover:text-accent",
              ),
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

/* ── Inline message editor (bubbles + context notes) ────── */

function MessageEditor({
  value,
  onChange,
  onSave,
  onCancel,
  isCoarse,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isCoarse: boolean;
}) {
  return (
    <div className="w-full max-w-[80%]">
      <Textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !isCoarse) {
            e.preventDefault();
            onSave();
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
        rows={2}
        className="text-bubble"
      />
      <div className="mt-1.5 flex justify-end gap-1.5">
        <Button variant="subtle" size="sm" className="hit-sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" className="hit-sm" disabled={!value.trim()} onClick={onSave}>
          Save
        </Button>
      </div>
    </div>
  );
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

  /* Mount-cascade bookkeeping (§6.4 Float In): on conversation mount the
     last 8 messages cascade in at 35ms stagger; everything older renders
     instantly; messages appended after mount animate individually. `seen`
     ids never re-animate, so a long thread does not re-stagger on
     unrelated state changes. */
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

  /* §7A — distinguishes the full float-in (fresh set) from a per-card swap. */
  const dealtRef = useRef(false);
  useEffect(() => {
    if (suggesting) dealtRef.current = false;
    else if (suggestions) dealtRef.current = true;
  }, [suggesting, suggestions]);

  /* §7A(4) — the aurora surges while Cyrano speaks: pulse the `.speaking`
     hook on the app backdrop for ~1.6s when results arrive. Opacity-only,
     so it is kept under reduced motion (DESIGN.md §6). */
  useEffect(() => {
    if (suggesting || !suggestions) return;
    const el = document.querySelector(".app-backdrop");
    if (!el) return;
    el.classList.add("speaking");
    const t = window.setTimeout(() => el.classList.remove("speaking"), 1600);
    return () => {
      window.clearTimeout(t);
      el.classList.remove("speaking");
    };
  }, [suggesting, suggestions]);

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

  /** Escape inside the capsule toolbar hides it by returning focus to the page. */
  function railKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      (document.activeElement as HTMLElement | null)?.blur();
    }
  }

  const rmCollapse = rm(reduced, collapseVariants);
  const rmChip = rm(reduced, chipVariants);
  const rmPanel = rm(reduced, panelVariants);
  const rmHeader = rm(reduced, fadeUp(6));
  const rmSeal = rm(reduced, sealVariants);

  return (
    <div className="flex h-full flex-col">
      {/* ── Header — thin glass bar (§8 Conversation header) ── */}
      <motion.header
        variants={rmHeader}
        initial="initial"
        animate="enter"
        className="plate z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-line px-3 pt-[env(safe-area-inset-top)] sm:px-6"
      >
        {onOpenMenu && (
          <MotionButton
            onClick={onOpenMenu}
            aria-label="Open conversations"
            className={cx(
              "hit mr-0.5 shrink-0 rounded-full p-2 text-ink-secondary transition-colors duration-150 hover:bg-fill hover:text-ink md:hidden",
              focusRing,
            )}
          >
            <IconMenu size={20} />
          </MotionButton>
        )}

        <MotionButton
          onClick={onOpenProfile}
          title="Edit profile"
          className={cx(
            "group/profile flex min-w-0 items-center gap-3 rounded-md px-1.5 py-1 text-left transition-colors duration-150 hover:bg-fill",
            focusRing,
          )}
        >
          <span className="relative grid h-9 w-9 shrink-0 place-items-center">
            <SealDisc initial={conversation.name || "?"} size={36} />
            {/* §8 — the gem disc's gold ring plays Light Streak on switch */}
            <motion.svg
              key={conversation.id}
              aria-hidden="true"
              viewBox="0 0 36 36"
              className="absolute inset-0 h-full w-full -rotate-90"
            >
              <motion.circle
                cx="18"
                cy="18"
                r="17.25"
                fill="none"
                stroke="rgb(251 113 133 / 0.5)"
                strokeWidth="1.25"
                strokeLinecap="round"
                initial={reduced ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: EASE_INK }}
              />
            </motion.svg>
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              {/* Her name — big tight sans with the clip reveal */}
              <span
                key={conversation.id}
                className="animate-ink min-w-0 truncate text-persona text-ink"
              >
                {conversation.name}
              </span>
              <IconEdit
                size={12}
                className="shrink-0 text-ink-muted opacity-0 transition-opacity duration-150 group-hover/profile:opacity-100 group-focus-visible/profile:opacity-100"
              />
            </div>
            {conversation.platform && (
              <div className="mt-0.5">
                <Tag>{conversation.platform}</Tag>
              </div>
            )}
          </div>
        </MotionButton>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="ghost" className="hit-sm" onClick={onOpenImport}>
            <IconImport size={15} />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button
            variant="ghost"
            className="hit-sm xl:hidden"
            aria-label="Open facts"
            onClick={onOpenFacts}
          >
            <IconBrain size={15} />
            {factsCount > 0 && <span className="tabular-nums">{factsCount}</span>}
          </Button>
          <IconButton label="Delete conversation" tone="danger" onClick={onDeleteConversation}>
            <IconTrash size={16} />
          </IconButton>
        </div>
      </motion.header>

      {/* ── Thread (§8 Thread & bubbles) ───────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-10 max-md:pb-14 sm:px-6">
        <div className="mx-auto max-w-[44rem] space-y-3">
          {messages.length === 0 && (
            <motion.div variants={rm(reduced, fadeUp(6))} initial="initial" animate="enter">
              <EmptyState
                title="No messages yet"
                action={
                  <Button variant="ghost" onClick={onOpenImport}>
                    <IconImport size={14} /> Import an existing thread
                  </Button>
                }
              >
                Paste what {conversation.name} said in the box below and hit Generate — Cyrano
                will draft a few replies for you to pick from.
              </EmptyState>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((m, idx) => {
              const isTarget = m.role === "them" && targets.includes(m.id);
              const isEditing = editingId === m.id;
              const isNew = !seen.has(m.id);

              // Context notes are asides, not a speaker: a centered floating
              // chip with a small quill — no bubble, no side.
              if (m.role === "context") {
                return (
                  <motion.div
                    key={m.id}
                    variants={rm(reduced, contextNoteVariants)}
                    initial={isNew ? "initial" : false}
                    animate="enter"
                    exit="exit"
                    className="group flex items-center justify-center gap-1.5 py-1"
                  >
                    {isEditing ? (
                      <MessageEditor
                        value={editText}
                        onChange={setEditText}
                        onSave={() => void saveEdit(m.id)}
                        onCancel={cancelEdit}
                        isCoarse={isCoarse}
                      />
                    ) : (
                      <>
                        <div
                          // A title tooltip can never fire on touch, and the time
                          // is already rendered visibly below.
                          title={isCoarse ? undefined : clockTime(m.created_at)}
                          onClick={isCoarse ? () => setSheetId(m.id) : undefined}
                          className="flex max-w-[85%] items-start gap-2 rounded-full border border-line bg-fill px-3.5 py-1.5 text-label text-ink-secondary shadow-[var(--shadow-plate)]"
                        >
                          <IconQuill size={13} className="mt-px shrink-0 text-ink-muted" />
                          <span className="min-w-0 whitespace-pre-wrap break-words">
                            {m.content}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
                          <MotionButton
                            onClick={() => startEdit(m.id, m.content)}
                            aria-label="Edit context"
                            title="Edit context"
                            className={cx(
                              "hit-sm rounded-full text-ink-muted transition-colors duration-150 hover:text-ink",
                              focusRing,
                            )}
                          >
                            <IconEdit size={13} />
                          </MotionButton>
                          <MotionButton
                            onClick={() => onDeleteMessage(m.id)}
                            aria-label="Delete context"
                            title="Delete context"
                            className={cx(
                              "hit-sm rounded-full text-ink-muted transition-colors duration-150 hover:text-danger",
                              focusRing,
                            )}
                          >
                            <IconTrash size={13} />
                          </MotionButton>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              }

              const isMe = m.role === "me";
              const cascadeDelay =
                !mountedRef.current && isNew
                  ? Math.max(0, idx - cascadeStartRef.current) * 0.035
                  : 0;
              const base = bubbleVariants(m.role);
              const rowVariants = rm(
                reduced,
                cascadeDelay > 0 ? withEnterDelay(base, cascadeDelay) : base,
              );
              const isQuoteSource = replyTo === m.id;
              const quoted =
                m.reply_to_message_id !== null
                  ? messageById.get(m.reply_to_message_id)
                  : undefined;

              return (
                <motion.div
                  key={m.id}
                  variants={rowVariants}
                  initial={isNew ? "initial" : false}
                  animate="enter"
                  exit="exit"
                  className={cx("flex", isMe ? "justify-end" : "justify-start")}
                >
                  {isEditing ? (
                    <MessageEditor
                      value={editText}
                      onChange={setEditText}
                      onSave={() => void saveEdit(m.id)}
                      onCancel={cancelEdit}
                      isCoarse={isCoarse}
                    />
                  ) : (
                    <div
                      className={cx(
                        "group relative flex max-w-[78%] flex-col",
                        isMe ? "items-end" : "items-start",
                      )}
                    >
                      {/* Laurel tag — targeted for reply (§8) */}
                      {isTarget && (
                        <span className="mb-1 inline-flex items-center rounded-full bg-laurel-soft px-2 py-0.5 text-folio text-laurel">
                          Replying to this
                        </span>
                      )}

                      {/* Capsule toolbar (§7C) — fine pointer only; a frosted
                          floating pill fades in above the bubble's margin
                          side, nothing reflows. Blur is applied only while
                          revealed so the §9 budget holds across the thread. */}
                      {!isCoarse && (
                        <div
                          className={cx(
                            "pointer-events-none absolute bottom-full z-10 translate-y-1 pb-1.5 opacity-0",
                            "transition-[opacity,transform] duration-150 ease-[var(--ease-ink)]",
                            "group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100",
                            "group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100",
                            isMe ? "right-0" : "left-0",
                          )}
                          onKeyDown={railKeyDown}
                        >
                          <div
                            className={cx(
                              "flex items-center gap-0.5 whitespace-nowrap rounded-full border border-line-strong bg-glass px-1.5 py-1 shadow-[var(--shadow-md),var(--shadow-plate)]",
                              "group-hover:backdrop-blur-[24px] group-hover:backdrop-saturate-150",
                              "group-focus-within:backdrop-blur-[24px] group-focus-within:backdrop-saturate-150",
                            )}
                          >
                            <RailButton
                              label={isQuoteSource ? "Stop quoting this" : "Quote in next message"}
                              active={isQuoteSource}
                              onClick={() => setReplyTo((prev) => (prev === m.id ? null : m.id))}
                            >
                              <IconQuote size={15} />
                            </RailButton>
                            {m.role === "them" && (
                              <RailButton
                                label={isTarget ? "Stop replying to this" : "Reply to this message"}
                                active={isTarget}
                                tone="laurel"
                                onClick={() => toggleTarget(m.id)}
                              >
                                <IconReply size={15} />
                              </RailButton>
                            )}
                            <RailButton label="Flip sender" onClick={() => onFlipMessage(m.id)}>
                              <IconSwap size={15} />
                            </RailButton>
                            <RailButton
                              label="Move up"
                              disabled={idx === 0}
                              onClick={() => onMoveMessage(m.id, "up")}
                            >
                              <IconChevronUp size={15} />
                            </RailButton>
                            <RailButton
                              label="Move down"
                              disabled={idx === messages.length - 1}
                              onClick={() => onMoveMessage(m.id, "down")}
                            >
                              <IconChevronDown size={15} />
                            </RailButton>
                            <RailButton label="Edit message" onClick={() => startEdit(m.id, m.content)}>
                              <IconEdit size={15} />
                            </RailButton>
                            <span aria-hidden="true" className="mx-0.5 h-4 w-px shrink-0 bg-line" />
                            <RailButton label="Delete message" danger onClick={() => onDeleteMessage(m.id)}>
                              <IconTrash size={15} />
                            </RailButton>
                          </div>
                        </div>
                      )}

                      {/* The bubble — gold-tinted glass for me, neutral glass
                          for them; the small corner tucks toward the sender. */}
                      <div
                        id={`msg-${m.id}`}
                        title={isCoarse ? undefined : clockTime(m.created_at)}
                        onClick={isCoarse ? () => setSheetId(m.id) : undefined}
                        className={cx(
                          "rounded-[20px] px-4 py-2.5 text-bubble text-ink",
                          isMe
                            ? "rounded-br-[6px] border border-line-gilt bg-accent-soft shadow-[var(--shadow-plate)]"
                            : cx(
                                "glass-card rounded-bl-[6px]",
                                isTarget && "border-line-laurel bg-laurel-faint",
                              ),
                          isQuoteSource && "ring-1 ring-accent/45",
                        )}
                      >
                        {quoted && (
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
                              "mb-1.5 flex w-full items-center gap-2 rounded-[10px] bg-fill px-2 py-1 text-left transition-colors duration-150 hover:bg-fill-hover",
                              focusRing,
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className="w-0.5 shrink-0 self-stretch rounded-full bg-accent/70"
                            />
                            <span className="min-w-0 truncate text-marginalia text-ink-muted">
                              <span className="text-accent">
                                {quoted.role === "me" ? "You" : conversation.name}:
                              </span>{" "}
                              {clipQuote(quoted.content)}
                            </span>
                          </button>
                        )}
                        <span className="whitespace-pre-wrap break-words">{m.content}</span>
                      </div>

                      {/* Timestamps — quiet meta. ≥md they live in the margin
                          beside the bubble (Capsule Reveal); on touch they
                          sit quietly beneath. */}
                      {!isCoarse && (
                        <span
                          className={cx(
                            "pointer-events-none absolute top-1/2 hidden -translate-y-1/2 whitespace-nowrap text-marginalia tabular-nums text-ink-muted opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 md:block",
                            isMe ? "right-full mr-2.5" : "left-full ml-2.5",
                          )}
                        >
                          {clockTime(m.created_at)}
                        </span>
                      )}
                      {isCoarse && (
                        <span className="mt-1 px-1 text-marginalia tabular-nums text-ink-muted">
                          {clockTime(m.created_at)}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* ── Suggestions — floating glass panel (§7A) ────── */}
          <AnimatePresence>
            {(suggesting || suggestions || suggestError) && (
              <motion.div
                key="suggestions-panel"
                variants={rmPanel}
                initial="initial"
                animate="enter"
                exit="exit"
                className={cx(
                  "glass-panel gilt-rule rule-garnet !mt-8 rounded-lg p-4",
                  !suggesting && suggestions && "drawing",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <div className="flex items-center gap-2">
                    <IconSparkles size={14} className="text-garnet" />
                    <span className="text-folio text-ink-secondary">Suggestions</span>
                    {!suggesting && suggestions && (
                      <span className="inline-flex items-center rounded-full bg-fill px-2 py-px text-folio tabular-nums text-ink-secondary">
                        {suggestions.length}
                      </span>
                    )}
                    {suggesting && <span className="animate-thinking">Thinking…</span>}
                  </div>
                  {!suggesting && (suggestions || suggestError) && (
                    <div className="flex items-center gap-1">
                      <Button variant="subtle" size="sm" className="hit-sm" onClick={regenerate}>
                        <IconRefresh size={13} /> Regenerate
                      </Button>
                      <Button
                        variant="subtle"
                        size="sm"
                        className="hit-sm"
                        onClick={onDismissSuggestions}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
                <div className="rule-double mt-2.5" aria-hidden="true" />

                <div className="mt-3">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {suggesting && (
                      /* Skeleton cards — layout reserved so arrival is a
                         cross-fade, not a reflow jump. They Melt out. */
                      <motion.div
                        key="skeletons"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={
                          reduced
                            ? { opacity: 0, transition: { duration: DUR.hair, ease: EASE_INK } }
                            : {
                                opacity: 0,
                                filter: "blur(4px)",
                                transition: { duration: 0.14, ease: EASE_INK },
                              }
                        }
                        transition={{ duration: DUR.hair, ease: EASE_INK }}
                        className="space-y-2"
                      >
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className={cx(cardClass, "p-4")}>
                            <div className="flex items-center justify-between">
                              <div className="skeleton h-4 w-16 rounded-full" />
                              <div className="skeleton h-3 w-8" />
                            </div>
                            <div className="skeleton mt-3.5 h-3.5 w-full" />
                            <div className="skeleton mt-2 h-3.5 w-3/4" />
                            <div className="mt-4 flex justify-end border-t border-line pt-3">
                              <div className="skeleton h-6 w-44" />
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {!suggesting && suggestError && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: DUR.hair, ease: EASE_INK } }}
                        transition={{ duration: DUR.leaf, ease: EASE_INK }}
                        className="rounded-md border border-danger/30 bg-danger-soft p-4"
                      >
                        <p className="text-body text-danger">{suggestError}</p>
                        <Button variant="ghost" size="sm" className="mt-3 hit-sm" onClick={regenerate}>
                          <IconRefresh size={13} /> Try again
                        </Button>
                      </motion.div>
                    )}

                    {!suggesting && suggestions && (
                      <motion.div
                        key="cards"
                        initial={false}
                        exit={{ opacity: 0, transition: { duration: DUR.hair, ease: EASE_INK } }}
                        className="space-y-2"
                      >
                        <AnimatePresence mode="popLayout">
                          {suggestions.map((opt, i) => {
                            const busy = regenIndex === i;
                            const isSwap = dealtRef.current;
                            const cardV = rm(reduced, isSwap ? swapCardVariants : dealCardVariants);
                            const chipDelay = reduced ? 0 : isSwap ? 0.06 : i * 0.06 + 0.06;
                            const multi = opt.texts.length > 1;
                            return (
                              <motion.div
                                key={`${i}:${opt.texts.join(" ")}`}
                                custom={i}
                                layout={reduced ? false : "position"}
                                variants={cardV}
                                initial="initial"
                                animate="enter"
                                exit="exit"
                                className={cx(
                                  cardClass,
                                  "p-4 transition-colors duration-150 hover:border-line-strong",
                                  busy && "wick-ring",
                                )}
                              >
                                {/* Top row: tone pill left, quiet index right */}
                                <div className="flex items-start justify-between gap-2">
                                  <motion.span
                                    initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={
                                      reduced
                                        ? { duration: DUR.hair, ease: EASE_INK }
                                        : { ...SPRING_MICRO, delay: chipDelay }
                                    }
                                    className={cx(TONE_CHIP, toneStyle(opt.tone))}
                                  >
                                    {opt.tone}
                                    {multi && (
                                      <span className="ml-1 tabular-nums opacity-70">
                                        · {opt.texts.length} texts
                                      </span>
                                    )}
                                  </motion.span>
                                  <span className="shrink-0 text-marginalia tabular-nums text-ink-faint">
                                    {i + 1}
                                  </span>
                                </div>

                                {/* Body */}
                                <div
                                  className={cx(
                                    "mt-2.5 transition-opacity duration-150",
                                    busy && "opacity-40",
                                  )}
                                >
                                  {!multi ? (
                                    <p className="whitespace-pre-wrap break-words text-bubble text-ink">
                                      {opt.texts[0]}
                                    </p>
                                  ) : (
                                    opt.texts.map((t, j) => (
                                      <Fragment key={j}>
                                        {j > 0 && (
                                          <div
                                            aria-hidden="true"
                                            className="mx-6 my-2 border-t border-line"
                                          />
                                        )}
                                        <div className="flex items-start gap-2.5">
                                          <span className="mt-1 shrink-0 text-marginalia tabular-nums text-ink-muted">
                                            {j + 1} of {opt.texts.length}
                                          </span>
                                          <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-bubble text-ink">
                                            {t}
                                          </p>
                                          <MotionButton
                                            onClick={() => copyValue(t, `opt-${i}-${j}`)}
                                            disabled={busy}
                                            aria-label="Copy this text"
                                            title="Copy this text"
                                            className={cx(
                                              "hit-sm mt-1 shrink-0 rounded-full text-ink-muted transition-colors duration-150 hover:text-ink disabled:opacity-50",
                                              focusRing,
                                            )}
                                          >
                                            {copied === `opt-${i}-${j}` ? (
                                              <StrikeCheck reduced={reduced} size={14} />
                                            ) : (
                                              <IconCopy size={14} />
                                            )}
                                          </MotionButton>
                                        </div>
                                      </Fragment>
                                    ))
                                  )}
                                </div>

                                {/* Bottom action rail — behind a hairline */}
                                <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-line pt-2.5">
                                  <IconButton
                                    label="Regenerate just this one"
                                    disabled={regenIndex !== null}
                                    onClick={() => void regenerateOne(i)}
                                    className="mr-auto"
                                  >
                                    {busy ? <Spinner size={13} /> : <IconRefresh size={14} />}
                                  </IconButton>
                                  <Button
                                    variant="subtle"
                                    size="sm"
                                    className="hit"
                                    disabled={busy}
                                    aria-label="Copy reply"
                                    onClick={() => copyValue(opt.texts.join("\n"), `opt-${i}`)}
                                  >
                                    {copied === `opt-${i}` ? (
                                      <>
                                        <StrikeCheck reduced={reduced} /> Copied
                                      </>
                                    ) : (
                                      <>
                                        <IconCopy size={13} /> Copy
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="hit"
                                    disabled={busy}
                                    aria-label="Queue reply"
                                    onClick={() => onQueueOption(opt.texts, opt.tone, primaryTargetId)}
                                  >
                                    <span
                                      aria-hidden="true"
                                      className="seal-emboss h-2 w-2 rounded-full"
                                    />
                                    Queue
                                  </Button>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    className="hit"
                                    disabled={busy}
                                    onClick={() => {
                                      void copyValue(opt.texts.join("\n"), `opt-${i}`);
                                      onUseOption(opt.texts);
                                    }}
                                  >
                                    <IconSend size={13} /> Use
                                  </Button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                        <p className="px-1 pt-1 text-marginalia text-ink-muted">
                          Use logs it to the thread now · Queue saves it as a draft for later
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── The floating dock (§8 Targeting bar & composer) ── */}
      <div className="z-20 shrink-0 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-1 sm:px-4">
        {/* Reply queue — collapsible glass tray (§7B) */}
        <AnimatePresence initial={false}>
          {queued.length > 0 && (
            <motion.div
              key="queue"
              variants={rmCollapse}
              initial="initial"
              animate="enter"
              exit="exit"
              className="mx-auto w-full max-w-[44rem] overflow-hidden"
            >
              <div className="pb-2">
                <div className={cx(cardClass, "border-line-garnet")}>
                  <MotionButton
                    onClick={() => setQueueOpen((o) => !o)}
                    className={cx(
                      "flex w-full items-center justify-between rounded-md px-3.5 py-2.5 transition-colors duration-150 hover:bg-fill",
                      focusRing,
                    )}
                  >
                    <span className="flex items-center gap-2 text-folio text-ink-secondary">
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-garnet shadow-[0_0_8px_rgb(255_138_150_/_0.4)]"
                      />
                      Queue
                      <span className="inline-flex items-center rounded-full bg-garnet-soft px-2 py-px text-folio tabular-nums text-garnet">
                        {queued.length}
                      </span>
                    </span>
                    <span className="text-marginalia text-ink-muted">
                      {queueOpen ? "Hide" : "Show"}
                    </span>
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
                                  variants={rm(reduced, queueItemVariants)}
                                  initial="initial"
                                  animate="enter"
                                  exit="exit"
                                  className="rounded-md border border-line bg-fill p-3 transition-colors duration-150 hover:border-line-strong hover:bg-fill-hover"
                                >
                                  <div className="flex items-start gap-2.5">
                                    {/* The gem disc — Gem Pops in after its row */}
                                    <motion.span
                                      variants={rmSeal}
                                      initial="initial"
                                      animate="enter"
                                      className="mt-0.5 shrink-0"
                                    >
                                      <SealDisc initial={conversation.name || "?"} size={16} />
                                    </motion.span>
                                    <div className="min-w-0 flex-1">
                                      {tm && (
                                        <div className="mb-0.5 flex items-center gap-1.5 text-marginalia text-ink-muted">
                                          <IconReply size={11} className="shrink-0" />
                                          <span className="truncate">{tm.content}</span>
                                        </div>
                                      )}
                                      <div className="space-y-0.5">
                                        {parts.map((p, pIdx) => (
                                          <p key={pIdx} className="text-body text-ink">
                                            {p}
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5 gap-y-1.5">
                                    {q.tone && (
                                      <span className={cx(TONE_CHIP, "mr-auto", toneStyle(q.tone))}>
                                        {q.tone}
                                      </span>
                                    )}
                                    <Button
                                      variant="subtle"
                                      size="sm"
                                      className="hit"
                                      aria-label="Copy queued reply"
                                      onClick={() => copyValue(q.content, `q-${q.id}`)}
                                    >
                                      {copied === `q-${q.id}` ? (
                                        <>
                                          <StrikeCheck reduced={reduced} /> Copied
                                        </>
                                      ) : (
                                        <>
                                          <IconCopy size={13} /> Copy
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      className="hit"
                                      onClick={() => onDeleteQueued(q.id)}
                                    >
                                      Delete
                                    </Button>
                                    <MotionButton className={cx(SEND_BTN, "hit")} onClick={() => onSendQueued(q)}>
                                      <IconCheck size={13} /> Mark sent
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

        {/* Composer — thin glass, visually detached from the edges */}
        <div className="plate mx-auto w-full max-w-[44rem] rounded-lg border border-line p-3 shadow-[var(--shadow-md),var(--shadow-plate)]">
          {/* Targeting strip — laurel pills with × (§8) */}
          <AnimatePresence initial={false}>
            {targets.length > 0 && (
              <motion.div
                key="targeting"
                variants={rmCollapse}
                initial="initial"
                animate="enter"
                exit="exit"
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pb-2.5">
                  <span className="text-marginalia tabular-nums text-laurel">
                    Replying to {targets.length} message{targets.length > 1 ? "s" : ""}
                  </span>
                  <AnimatePresence initial={false}>
                    {targets.map((tid) => {
                      const tm = messageById.get(tid);
                      if (!tm) return null;
                      return (
                        <motion.span
                          key={tid}
                          variants={rmChip}
                          initial="initial"
                          animate="enter"
                          exit="exit"
                          className="inline-flex max-w-[13rem] items-center gap-1.5 rounded-full border border-line-laurel bg-laurel-faint px-2.5 py-0.5"
                        >
                          <span className="truncate text-label text-ink-secondary">{tm.content}</span>
                          <MotionButton
                            onClick={() => toggleTarget(tid)}
                            aria-label="Remove target"
                            className={cx(
                              "hit shrink-0 rounded-full text-ink-muted transition-colors duration-150 hover:text-ink",
                              focusRing,
                            )}
                          >
                            <IconClose size={11} />
                          </MotionButton>
                        </motion.span>
                      );
                    })}
                  </AnimatePresence>
                  <MotionButton
                    onClick={() => setTargets([])}
                    className={cx(
                      "hit rounded-full text-label text-ink-muted transition-colors duration-150 hover:text-ink",
                      focusRing,
                    )}
                  >
                    Clear
                  </MotionButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quoted-reply strip — inset with the gold bar (§8) */}
          <AnimatePresence initial={false}>
            {replyTo !== null && messageById.has(replyTo) && (
              <motion.div
                key="quote-chip"
                variants={rmChip}
                initial="initial"
                animate="enter"
                exit="exit"
                className="mb-2 flex items-center gap-2 rounded-[10px] bg-fill px-2.5 py-1.5"
              >
                <span aria-hidden="true" className="w-0.5 shrink-0 self-stretch rounded-full bg-accent/70" />
                <span className="min-w-0 flex-1 truncate text-marginalia text-ink-muted">
                  <span className="text-accent">
                    Replying to{" "}
                    {messageById.get(replyTo)!.role === "me" ? "you" : conversation.name}:
                  </span>{" "}
                  {messageById.get(replyTo)!.content}
                </span>
                <MotionButton
                  onClick={() => setReplyTo(null)}
                  aria-label="Remove quote link"
                  className={cx(
                    "hit shrink-0 rounded-full text-ink-muted transition-colors duration-150 hover:text-ink",
                    focusRing,
                  )}
                >
                  <IconClose size={12} />
                </MotionButton>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The field */}
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
            className="max-h-40 min-h-[44px] w-full resize-none rounded-sm border border-line-strong bg-[rgb(255_255_255_/_0.05)] px-3.5 py-2.5 text-bubble text-ink outline-none transition-colors duration-150 placeholder:text-ink-muted focus:border-line-gilt focus:ring-[3px] focus:ring-accent/15"
          />

          {/* Action row */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="flex items-center gap-0.5">
              <Button
                variant="subtle"
                size="sm"
                className="hit"
                disabled={!text.trim()}
                onClick={() => addAs("me")}
              >
                <span className="sm:hidden">+ Me</span>
                <span className="hidden sm:inline">Add as me</span>
              </Button>
              <Button
                variant="subtle"
                size="sm"
                className="hit"
                disabled={!text.trim()}
                onClick={() => addAs("them")}
              >
                <span className="sm:hidden">+ Them</span>
                <span className="hidden sm:inline">Add as them</span>
              </Button>
              <Button
                variant="subtle"
                size="sm"
                className="hit"
                disabled={!text.trim()}
                title="Drop in a situational note for Cyrano (not a message)"
                onClick={() => addAs("context")}
              >
                <span className="sm:hidden">+ Note</span>
                <span className="hidden sm:inline">Add as context</span>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1.5 text-marginalia text-ink-muted sm:flex">
                <span className="kbd">↵</span> generate ·{" "}
                <span className="kbd">⇧↵</span> newline
              </span>
              {/* Generate — the one glowing thing; conic ring while thinking */}
              <MotionButton
                onClick={handleGenerate}
                disabled={!canGenerate || suggesting}
                className={cx(GENERATE_BTN, suggesting ? "wick-ring" : "disabled:opacity-40")}
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

          {/* Steer — glow-dot labeled secondary field (§8) */}
          <div className="mt-2.5 flex items-center gap-2.5 border-t border-line px-1 pt-2">
            <span className="flex shrink-0 items-center gap-1.5 text-folio text-ink-muted">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgb(255_211_126_/_0.4)]"
              />
              Steer
            </span>
            <input
              value={steer}
              onChange={(e) => setSteer(e.target.value)}
              placeholder={isCoarse ? "Steer it: “be flirtier”…" : "optional: “be flirtier”, “ask her out”, “say something like…”"}
              className="min-w-0 flex-1 bg-transparent py-0.5 text-label text-ink-secondary outline-none placeholder:text-ink-muted"
            />
            {steer && (
              <MotionButton
                onClick={() => setSteer("")}
                aria-label="Clear steer"
                className={cx(
                  "hit shrink-0 rounded-full text-ink-muted transition-colors duration-150 hover:text-ink",
                  focusRing,
                )}
              >
                <IconClose size={13} />
              </MotionButton>
            )}
          </div>
        </div>
      </div>

      {/* Mobile message action sheet — touch replacement for the capsule */}
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
 *  desktop capsule toolbar. Thick glass, iOS sheet physics (DESIGN.md §7D). */
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
    /** Laurel pigment when active (reply-targeting rows). */
    laurel?: boolean;
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
                laurel: true,
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
      ];

  const dangerRows = isContext ? rows.filter((r) => r.danger) : [
    { act: "delete" as SheetAction, label: "Delete message", icon: <IconTrash size={16} /> },
  ];
  const mainRows = rows.filter((r) => !r.danger);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Message actions">
      <motion.button
        variants={rm(reduced, scrimVariants)}
        initial="initial"
        animate="enter"
        exit="exit"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[rgb(4_5_10_/_0.60)] backdrop-blur-[12px]"
      />
      <motion.div
        variants={rm(reduced, sheetVariants)}
        initial="initial"
        animate="enter"
        exit="exit"
        className="glass-modal absolute inset-x-0 bottom-0 rounded-t-xl border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)]"
      >
        <div aria-hidden="true" className="mx-auto mt-2.5 h-[5px] w-9 rounded-full bg-[rgb(255_255_255_/_0.25)]" />
        <div className="border-b border-line px-5 py-3">
          <p className="truncate text-marginalia text-ink-muted">
            <span className="text-ink-secondary">{speaker}</span> · {message.content}
          </p>
        </div>
        <div className="py-1">
          {mainRows.map((r) => (
            <MotionButton
              key={r.act}
              onClick={() => onAction(r.act)}
              disabled={r.disabled}
              className={cx(
                "flex min-h-11 w-full items-center gap-3 px-5 text-left text-body transition-colors duration-150 active:bg-fill disabled:opacity-35",
                r.active ? (r.laurel ? "text-laurel" : "text-accent") : "text-ink",
              )}
            >
              <span
                className={r.active ? (r.laurel ? "text-laurel" : "text-accent") : "text-ink-secondary"}
              >
                {r.icon}
              </span>
              {r.label}
            </MotionButton>
          ))}
          <div aria-hidden="true" className="mx-5 my-1 h-px bg-line" />
          {dangerRows.map((r) => (
            <MotionButton
              key={r.act}
              onClick={() => onAction(r.act)}
              className="flex min-h-11 w-full items-center gap-3 px-5 text-left text-body text-danger transition-colors duration-150 active:bg-danger-soft"
            >
              <span className="text-danger">{r.icon}</span>
              {r.label}
            </MotionButton>
          ))}
          <div className="px-4 pb-2 pt-1.5">
            <Button variant="ghost" className="min-h-11 w-full" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
