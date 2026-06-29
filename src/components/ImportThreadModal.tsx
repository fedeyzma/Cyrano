"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import { MAX_IMPORT_CHARS, parseThread, type ParsedMessage } from "@/lib/parseThread";
import { IconClose, IconSparkles } from "./icons";
import { Spinner } from "./ui";

export function ImportThreadModal({
  open,
  importing,
  error,
  conversationName,
  onClose,
  onImport,
  onAiParse,
}: {
  open: boolean;
  importing: boolean;
  error: string | null;
  conversationName: string;
  onClose: () => void;
  onImport: (messages: ParsedMessage[]) => void;
  onAiParse: (raw: string) => Promise<ParsedMessage[]>;
}) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedMessage[] | null>(null);
  const [aiParsing, setAiParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRaw("");
      setParsed(null);
      setParseError(null);
      setAiParsing(false);
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

  function setRole(i: number, role: "me" | "them") {
    setParsed((prev) => (prev ? prev.map((m, idx) => (idx === i ? { ...m, role } : m)) : prev));
  }
  function toggleRole(i: number) {
    setParsed((prev) =>
      prev
        ? prev.map((m, idx) => (idx === i ? { ...m, role: m.role === "me" ? "them" : "me" } : m))
        : prev,
    );
  }
  function removeAt(i: number) {
    setParsed((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev));
  }
  function flipAll() {
    setParsed((prev) =>
      prev ? prev.map((m) => ({ ...m, role: m.role === "me" ? "them" : "me" })) : prev,
    );
  }

  async function runAiParse() {
    setAiParsing(true);
    setParseError(null);
    try {
      setParsed(await onAiParse(raw));
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not auto-detect the messages.");
    } finally {
      setAiParsing(false);
    }
  }

  void setRole; // (kept for clarity; toggleRole is used in the UI)

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[85vh] w-full max-w-lg animate-fade-up flex-col rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <div>
            <h2 className="text-base font-semibold">Import a thread</h2>
            <p className="text-xs text-zinc-500">
              Paste an existing conversation with {conversationName}.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
          >
            <IconClose size={18} />
          </button>
        </div>

        {parsed === null ? (
          <div className="flex flex-1 flex-col overflow-hidden p-4">
            <textarea
              autoFocus
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={
                "Paste the whole conversation here — names, timestamps, whatever junk. Auto-detect figures out who said what; you can fix any line (or flip both sides) on the next step."
              }
              className="h-64 max-h-[45vh] min-h-[10rem] w-full resize-y rounded-lg border border-white/10 bg-black/30 p-3 text-sm leading-relaxed outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
            />
            <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-zinc-600">
              <span>
                {raw.length.toLocaleString()} characters ·{" "}
                {raw.split(/\r?\n/).filter((l) => l.trim()).length} lines
              </span>
              {raw.length > MAX_IMPORT_CHARS && (
                <span className="text-amber-400/80">
                  only the first {MAX_IMPORT_CHARS.toLocaleString()} characters will be read —
                  split very long threads
                </span>
              )}
            </div>
            {parseError && (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {parseError}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setParseError(null);
                    setParsed(parseThread(raw, conversationName));
                  }}
                  disabled={!raw.trim() || aiParsing}
                  title="No AI — split by lines and Me:/Them: labels"
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Quick parse
                </button>
                <button
                  onClick={runAiParse}
                  disabled={!raw.trim() || aiParsing}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiParsing ? <Spinner size={14} /> : <IconSparkles size={15} />}
                  {aiParsing ? "Reading…" : "Auto-detect with AI"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-2 text-xs text-zinc-500">
              <span>{parsed.length} messages · tap a bubble to switch speaker</span>
              <button
                onClick={flipAll}
                className="rounded-md px-2 py-1 text-zinc-300 transition hover:bg-white/5"
              >
                Flip all
              </button>
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto p-4">
              {parsed.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  Nothing to import — go back and paste some text.
                </p>
              ) : (
                parsed.map((m, i) => (
                  <div
                    key={i}
                    className={cx(
                      "group flex items-center gap-1.5",
                      m.role === "me" ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <button
                      onClick={() => toggleRole(i)}
                      title="Switch speaker"
                      className={cx(
                        "max-w-[74%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-left text-sm",
                        m.role === "me"
                          ? "rounded-br-md bg-accent text-zinc-950"
                          : "rounded-bl-md bg-white/[0.06] text-zinc-100 ring-1 ring-white/5",
                      )}
                    >
                      {m.content}
                    </button>
                    <button
                      onClick={() => removeAt(i)}
                      aria-label="Remove message"
                      className="text-zinc-700 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                    >
                      <IconClose size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {error && (
              <div className="mx-4 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            <div className="flex justify-between gap-2 border-t border-white/5 p-4">
              <button
                onClick={() => setParsed(null)}
                className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
              >
                ← Back to edit
              </button>
              <button
                onClick={() => onImport(parsed)}
                disabled={importing || parsed.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importing && <Spinner size={14} />} Import {parsed.length}{" "}
                {parsed.length === 1 ? "message" : "messages"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
