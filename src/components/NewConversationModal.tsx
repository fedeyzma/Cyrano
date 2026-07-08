"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  DUR,
  EASE_INK,
  modalVariants,
  railVariants,
  rm,
  scrimVariants,
  useAppReducedMotion,
} from "@/components/motion";
import { cx } from "@/lib/cx";
import { IconClose } from "./icons";
import { Button, IconButton, Input, Spinner, Textarea, focusRing } from "./ui";

const PLATFORMS = ["Hinge", "Tinder", "Bumble", "IRL", "Other"];

/** Platform chip — frosted pill on a soft fill; the active chip takes the
 *  gold wash + hairline (DESIGN.md §5). Real padding below `sm` plus
 *  .hit-sm keeps the touch target ≥44px effective. */
function chipClass(active: boolean) {
  return cx(
    "hit-sm inline-flex select-none items-center rounded-full border px-3 py-1 text-label transition-colors duration-150 max-sm:py-2",
    active
      ? "border-line-gilt bg-accent-soft text-accent"
      : "border-transparent bg-fill text-ink-secondary hover:bg-fill-hover hover:text-ink",
    focusRing,
  );
}

/** Quiet sentence-case field label with an optional "Optional" note. */
function FieldLabel({ text, optional }: { text: string; optional?: boolean }) {
  return (
    <span className="flex items-baseline justify-between gap-3">
      <span className="text-folio text-ink-muted">{text}</span>
      {optional ? (
        <span className="text-marginalia text-ink-muted">Optional</span>
      ) : null}
    </span>
  );
}

export function NewConversationModal({
  open,
  creating,
  error,
  onClose,
  onCreate,
}: {
  open: boolean;
  creating: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (data: { name: string; platform?: string; notes?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [notes, setNotes] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const reduced = useAppReducedMotion();

  const scrim = rm(reduced, scrimVariants);
  const panel = rm(reduced, modalVariants);
  const alert = rm(reduced, railVariants);
  // The title settles in a beat after the pane (DESIGN.md §8 Modals).
  const title = rm(reduced, {
    initial: { opacity: 0, y: 6 },
    enter: {
      opacity: 1,
      y: 0,
      transition: { duration: DUR.leaf, ease: EASE_INK, delay: 0.06 },
    },
  });

  useEffect(() => {
    if (open) {
      setName("");
      setPlatform("");
      setNotes("");
      const t = setTimeout(() => nameRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      nameRef.current?.focus();
      return;
    }
    onCreate({
      name: trimmed,
      platform: platform || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          key="new-conversation-modal"
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
        >
          <motion.button
            aria-label="Close"
            className="absolute inset-0 bg-[rgb(4_5_10_/_0.60)] backdrop-blur-[12px]"
            onClick={onClose}
            variants={scrim}
            initial="initial"
            animate="enter"
            exit="exit"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-conversation-title"
            variants={panel}
            initial="initial"
            animate="enter"
            exit="exit"
            className="glass-modal relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-xl rounded-b-none px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 sm:rounded-xl sm:pb-6 sm:pt-6"
          >
            {/* Grab handle — bottom-sheet affordance below sm only (§7D) */}
            <div className="mx-auto mb-4 h-[5px] w-9 rounded-full bg-[rgb(255_255_255_/_0.25)] sm:hidden" aria-hidden="true" />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <motion.h2
                  id="new-conversation-title"
                  variants={title}
                  className="text-modal text-ink"
                >
                  New conversation
                </motion.h2>
                <p className="mt-1 text-marginalia text-ink-muted">
                  Who are you talking to?
                </p>
              </div>
              <IconButton label="Close" onClick={onClose} className="-mr-1 -mt-0.5">
                <IconClose size={18} />
              </IconButton>
            </div>
            <div className="rule-double mt-4" aria-hidden="true" />

            <div className="mt-6 space-y-5">
              <label className="block">
                <FieldLabel text="Name" />
                <Input
                  ref={nameRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="e.g. Sofia"
                  className="mt-2"
                />
              </label>

              <div>
                <FieldLabel text="Where you matched" optional />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(platform === p ? "" : p)}
                      className={chipClass(platform === p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <FieldLabel text="Notes / context" optional />
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="anything you already know — how you matched, their vibe, what you've talked about…"
                  className="mt-2"
                />
              </label>
            </div>

            <AnimatePresence initial={false}>
              {error && (
                <motion.div
                  key="create-error"
                  role="alert"
                  variants={alert}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  className="mt-4 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-label text-danger"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button variant="subtle" className="hit-sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="hit-sm"
                onClick={submit}
                disabled={creating || !name.trim()}
              >
                {creating && <Spinner size={13} />} Create
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
