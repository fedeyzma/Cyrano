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
      <div className="relative w-full max-w-md animate-fade-up rounded-2xl border border-white/10 bg-zinc-900/95 p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">New conversation</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
          >
            <IconClose size={18} />
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Who are you talking to?</p>

        <label className="mt-4 block text-xs font-medium text-zinc-400">Name</label>
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
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
        />

        <label className="mt-4 block text-xs font-medium text-zinc-400">
          Where you matched <span className="text-zinc-600">(optional)</span>
        </label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(platform === p ? "" : p)}
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

        <label className="mt-4 block text-xs font-medium text-zinc-400">
          Notes / context <span className="text-zinc-600">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="anything you already know — how you matched, their vibe, what you've talked about…"
          className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
        />

        {error && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={creating || !name.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating && <Spinner size={14} />} Create
          </button>
        </div>
      </div>
    </div>
  );
}
