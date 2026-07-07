"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  DUR,
  EASE_FADE,
  MotionButton,
  modalVariants,
  rm,
  scrimVariants,
  useAppReducedMotion,
} from "@/components/motion";
import { cx } from "@/lib/cx";
import { IconClose } from "./icons";
import { Spinner } from "./ui";

const PLATFORMS = ["Hinge", "Tinder", "Bumble", "IRL", "Other"];

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
  // The Fraunces title arrives a beat after the glass (DESIGN.md Â§5 Modals).
  const title = rm(reduced, {
    initial: { opacity: 0, y: 6 },
    enter: {
      opacity: 1,
      y: 0,
      transition: { duration: DUR.base, ease: EASE_FADE, delay: 0.06 },
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
        <div key="new-conversation-modal" className="fixed inset-0 z-50 grid place-items-center p-4">
          <motion.button
            aria-label="Close"
            className="absolute inset-0 bg-black/65 backdrop-blur-[6px]"
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
            className="glass-modal relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-xl border border-line-strong p-5 shadow-[var(--shadow-lg),var(--shadow-highlight)]"
          >
            <div className="flex items-center justify-between">
              <motion.h2
                id="new-conversation-title"
                variants={title}
                className="font-display text-modal text-ink"
              >
                New conversation
              </motion.h2>
              <MotionButton
                onClick={onClose}
                aria-label="Close"
                className="hit rounded-md p-1.5 text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                <IconClose size={18} />
              </MotionButton>
            </div>
            <p className="mt-1 text-xs text-ink-muted">Who are you talking to?</p>

            <label className="mt-4 block text-xs font-medium text-ink-secondary">Name</label>
            <input
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
              className="mt-1 w-full rounded-md border border-line bg-black/30 px-3 py-2 text-sm text-ink placeholder:text-ink-muted outline-none transition-colors duration-150 focus:border-line-accent focus:ring-2 focus:ring-accent/20"
            />

            <label className="mt-4 block text-xs font-medium text-ink-secondary">
              Where you matched <span className="text-ink-faint">(optional)</span>
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <MotionButton
                  key={p}
                  type="button"
                  onClick={() => setPlatform(platform === p ? "" : p)}
                  className={cx(
                    "rounded-full px-3 py-1 max-md:py-2 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                    platform === p
                      ? "bg-accent font-medium text-on-accent"
                      : "border border-line-strong text-ink-secondary hover:bg-fill hover:text-ink",
                  )}
                >
                  {p}
                </MotionButton>
              ))}
            </div>

            <label className="mt-4 block text-xs font-medium text-ink-secondary">
              Notes / context <span className="text-ink-faint">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="anything you already know â€” how you matched, their vibe, what you've talked aboutâ€¦"
              className="mt-1 w-full resize-none rounded-md border border-line bg-black/30 px-3 py-2 text-sm text-ink placeholder:text-ink-muted outline-none transition-colors duration-150 focus:border-line-accent focus:ring-2 focus:ring-accent/20"
            />

            {error && (
              <div className="mt-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <MotionButton
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                Cancel
              </MotionButton>
              <MotionButton
                onClick={submit}
                disabled={creating || !name.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-label text-on-accent shadow-press transition-colors duration-150 hover:bg-accent-strong disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                {creating && <Spinner size={14} />} Create
              </MotionButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
