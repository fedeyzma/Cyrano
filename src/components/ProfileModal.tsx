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
import type { Conversation } from "@/lib/types";
import { IconClose, IconUser } from "./icons";
import { Spinner } from "./ui";

const PLATFORMS = ["Hinge", "Tinder", "Bumble", "IRL", "Other"];

export function ProfileModal({
  open,
  conversation,
  saving,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  conversation: Conversation | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (patch: { name: string; platform: string | null; notes: string | null }) => void;
}) {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [notes, setNotes] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const reduced = useAppReducedMotion();

  const scrim = rm(reduced, scrimVariants);
  const panel = rm(reduced, modalVariants);
  // The Fraunces title arrives a beat after the glass (DESIGN.md §5 Modals).
  const title = rm(reduced, {
    initial: { opacity: 0, y: 6 },
    enter: {
      opacity: 1,
      y: 0,
      transition: { duration: DUR.base, ease: EASE_FADE, delay: 0.06 },
    },
  });

  // Reset only when the modal opens or a *different* conversation is shown.
  // Depending on the object identity would re-run this on every silent
  // loadDetail refetch (e.g. when a Generate resolves while the modal is
  // open) and clobber in-progress edits / yank focus back to Name.
  const conversationId = conversation?.id ?? null;
  useEffect(() => {
    if (open && conversation) {
      setName(conversation.name);
      setPlatform(conversation.platform ?? "");
      setNotes(conversation.notes ?? "");
      const t = setTimeout(() => nameRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversationId]);

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
    onSave({
      name: trimmed,
      platform: platform.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <AnimatePresence>
      {open && conversation && (
        <div key="profile-modal" className="fixed inset-0 z-50 grid place-items-center p-4">
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
            aria-labelledby="profile-title"
            variants={panel}
            initial="initial"
            animate="enter"
            exit="exit"
            className="glass-modal relative w-full max-w-md rounded-xl border border-line-strong p-5 shadow-[var(--shadow-lg),var(--shadow-highlight)]"
          >
            <div className="flex items-center justify-between">
              <motion.h2
                id="profile-title"
                variants={title}
                className="flex items-center gap-2 font-display text-modal text-ink"
              >
                <IconUser size={16} className="text-accent" /> Profile
              </motion.h2>
              <MotionButton
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1.5 text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                <IconClose size={18} />
              </MotionButton>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Fix their name or update the details you keep about them.
            </p>

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
              placeholder="Their name"
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
                    "rounded-full px-3 py-1 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
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
              placeholder="context only you know…"
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
                disabled={saving || !name.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-label text-on-accent shadow-press transition-colors duration-150 hover:bg-accent-strong disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                {saving && <Spinner size={14} />} Save
              </MotionButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
