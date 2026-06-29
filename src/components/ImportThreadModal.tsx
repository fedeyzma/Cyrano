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
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-thread-title"
        className="relative flex max-h-[85vh] w-full max-w-lg animate-fade-up flex-col rounded-xl border border-line-strong bg-surface shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-line p-4">
          <div>
            <h2 id="import-thread-title" className="text-title text-ink">
              Import a thread
            </h2>
            <p className="text-xs text-ink-muted">
              Paste an existing conversation with {conversationName}.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
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
              className="h-64 max-h-[45vh] min-h-[10rem] w-full resize-y rounded-md border border-line bg-black/30 p-3 text-sm leading-normal text-ink placeholder:text-ink-faint outline-none transition-colors duration-150 focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
            />
            <div className="mt-1.5 flex items-center justify-between gap-2 text-meta text-ink-faint">
              <span className="tabular-nums">
                {raw.length.toLocaleString()} characters ·{" "}
                {raw.split(/\r?\n/).filter((l) => l.trim()).length} lines
              </span>
              {raw.length > MAX_IMPORT_CHARS && (
                <span className="tabular-nums text-amber-400/80">
                  only the first {MAX_IMPORT_CHARS.toLocaleString()} characters will be read —
                  split very long threads
                </span>
              )}
            </div>
            {parseError && (
              <div
                role="alert"
                className="mt-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
              >
                {parseError}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                onClick={onClose}
                className="rounded-md px-3 py-2 text-sm text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
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
                  className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-label text-ink-secondary transition-colors duration-150 hover:bg-fill hover:text-ink motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  Quick parse
                </button>
                <button
                  onClick={runAiParse}
                  disabled={!raw.trim() || aiParsing}
                  className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-label text-on-accent shadow-xs transition-colors duration-150 hover:bg-accent-strong motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  {aiParsing ? <Spinner size={14} /> : <IconSparkles size={15} />}
                  {aiParsing ? "Reading…" : "Auto-detect with AI"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs text-ink-muted">
              <span>
                <span className="tabular-nums">{parsed.length}</span> messages · tap a bubble to
                switch speaker
              </span>
              <button
                onClick={flipAll}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
              >
                Flip all
              </button>
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto p-4">
              {parsed.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-secondary">
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
                        "max-w-[74%] whitespace-pre-wrap break-words rounded-lg px-3.5 py-2 text-left text-sm leading-normal transition-colors duration-150",
                        m.role === "me"
                          ? "rounded-br-sm bg-accent text-on-accent shadow-xs shadow-[inset_0_1px_0_0_rgb(255_255_255/0.20)]"
                          : "rounded-bl-sm bg-fill text-ink ring-1 ring-line",
                      )}
                    >
                      {m.content}
                    </button>
                    <button
                      onClick={() => removeAt(i)}
                      aria-label="Remove message"
                      className="rounded-md p-1.5 text-ink-faint opacity-0 transition-colors duration-150 hover:bg-danger-soft hover:text-danger group-hover:opacity-100 group-focus-within:opacity-100"
                    >
                      <IconClose size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="mx-4 mb-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
              >
                {error}
              </div>
            )}

            <div className="flex justify-between gap-2 border-t border-line p-4">
              <button
                onClick={() => setParsed(null)}
                className="rounded-md px-3 py-2 text-sm text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
              >
                ← Back to edit
              </button>
              <button
                onClick={() => onImport(parsed)}
                disabled={importing || parsed.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-label text-on-accent shadow-xs transition-colors duration-150 hover:bg-accent-strong motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                {importing && <Spinner size={14} />} Import{" "}
                <span className="tabular-nums">{parsed.length}</span>{" "}
                {parsed.length === 1 ? "message" : "messages"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
