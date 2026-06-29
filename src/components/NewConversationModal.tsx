"use client";

import { useEffect, useRef, useState } from "react";
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

  if (!open) return null;

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
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-conversation-title"
        className="relative w-full max-w-md animate-fade-up rounded-xl border border-line-strong bg-surface p-5 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h2 id="new-conversation-title" className="text-title text-ink">
            New conversation
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <IconClose size={18} />
          </button>
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
          className="mt-1 w-full rounded-md border border-line bg-black/30 px-3 py-2 text-sm text-ink placeholder:text-ink-faint outline-none transition-colors duration-150 focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
        />

        <label className="mt-4 block text-xs font-medium text-ink-secondary">
          Where you matched <span className="text-ink-faint">(optional)</span>
        </label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => (
            <button
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
            </button>
          ))}
        </div>

        <label className="mt-4 block text-xs font-medium text-ink-secondary">
          Notes / context <span className="text-ink-faint">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="anything you already know — how you matched, their vibe, what you've talked about…"
          className="mt-1 w-full resize-none rounded-md border border-line bg-black/30 px-3 py-2 text-sm text-ink placeholder:text-ink-faint outline-none transition-colors duration-150 focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
        />

        {error && (
          <div className="mt-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={creating || !name.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-label text-on-accent shadow-xs transition-colors duration-150 hover:bg-accent-strong motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            {creating && <Spinner size={14} />} Create
          </button>
        </div>
      </div>
    </div>
  );
}
