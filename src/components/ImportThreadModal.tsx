"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  MAX_IMPORT_CHARS,
  parseThread,
  splitNewMessages,
  type ParsedMessage,
} from "@/lib/parseThread";
import { IconClose, IconSparkles } from "./icons";
import { Spinner } from "./ui";

export function ImportThreadModal({
  open,
  importing,
  error,
  conversationName,
  existingMessages,
  onClose,
  onImport,
  onAiParse,
}: {
  open: boolean;
  importing: boolean;
  error: string | null;
  conversationName: string;
  /** Messages already in the thread, used to skip overlap on re-import. */
  existingMessages: Array<{ role: string; content: string }>;
  onClose: () => void;
  onImport: (messages: ParsedMessage[]) => void;
  onAiParse: (raw: string) => Promise<ParsedMessage[]>;
}) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedMessage[] | null>(null);
  const [aiParsing, setAiParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importAll, setImportAll] = useState(false);
  const reduced = useAppReducedMotion();

  // Overlap against what's already saved — recomputes as roles are toggled.
  const dedup = useMemo(
    () => (parsed ? splitNewMessages(parsed, existingMessages) : null),
    [parsed, existingMessages],
  );
  const toImport = importAll ? (parsed ?? []) : (dedup?.fresh ?? []);

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

  useEffect(() => {
    if (open) {
      setRaw("");
      setParsed(null);
      setParseError(null);
      setAiParsing(false);
      setImportAll(false);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
    <AnimatePresence>
      {open && (
        <div key="import-thread-modal" className="fixed inset-0 z-50 grid place-items-center p-4">
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
            aria-labelledby="import-thread-title"
            variants={panel}
            initial="initial"
            animate="enter"
            exit="exit"
            className="glass-modal relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-line-strong shadow-[var(--shadow-lg),var(--shadow-highlight)]"
          >
            <div className="flex items-center justify-between border-b border-line p-4">
              <div>
                <motion.h2
                  id="import-thread-title"
                  variants={title}
                  className="font-display text-modal text-ink"
                >
                  Import a thread
                </motion.h2>
                <p className="text-xs text-ink-muted">
                  Paste an existing conversation with {conversationName}.
                </p>
              </div>
              <MotionButton
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1.5 text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
              >
                <IconClose size={18} />
              </MotionButton>
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
                  className="h-64 max-h-[45vh] min-h-[10rem] w-full resize-y rounded-md border border-line bg-black/30 p-3 text-sm leading-normal text-ink placeholder:text-ink-muted outline-none transition-colors duration-150 focus:border-line-accent focus:ring-2 focus:ring-accent/20"
                />
                <div className="mt-1.5 flex items-center justify-between gap-2 text-meta text-ink-muted">
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
                  <MotionButton
                    onClick={onClose}
                    className="rounded-md px-3 py-2 text-sm text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
                  >
                    Cancel
                  </MotionButton>
                  <div className="flex items-center gap-2">
                    <MotionButton
                      onClick={() => {
                        setParseError(null);
                        setParsed(parseThread(raw, conversationName));
                      }}
                      disabled={!raw.trim() || aiParsing}
                      title="No AI — split by lines and Me:/Them: labels"
                      className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-label text-ink-secondary transition-colors duration-150 hover:bg-fill hover:text-ink disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                    >
                      Quick parse
                    </MotionButton>
                    <MotionButton
                      onClick={runAiParse}
                      disabled={!raw.trim() || aiParsing}
                      className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-label text-on-accent shadow-press transition-colors duration-150 hover:bg-accent-strong disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                    >
                      {aiParsing ? <Spinner size={14} /> : <IconSparkles size={15} />}
                      {aiParsing ? "Reading…" : "Auto-detect with AI"}
                    </MotionButton>
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
                  <MotionButton
                    onClick={flipAll}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-label text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
                  >
                    Flip all
                  </MotionButton>
                </div>

                {dedup && dedup.skipped > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-line bg-fill px-4 py-2 text-xs">
                    <span className="text-ink-secondary">
                      <span className="tabular-nums text-accent">{dedup.fresh.length}</span> new ·{" "}
                      <span className="tabular-nums">{dedup.skipped}</span> already saved{" "}
                      {importAll ? "(importing anyway)" : "(skipped)"}
                    </span>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-ink-muted transition-colors duration-150 hover:text-ink">
                      <input
                        type="checkbox"
                        checked={importAll}
                        onChange={(e) => setImportAll(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                      />
                      import all anyway
                    </label>
                  </div>
                )}

                <div className="flex-1 space-y-1.5 overflow-y-auto p-4">
                  {parsed.length === 0 ? (
                    <p className="py-8 text-center text-sm text-ink-secondary">
                      Nothing to import — go back and paste some text.
                    </p>
                  ) : (
                    parsed.map((m, i) => {
                      const isDup = !importAll && (dedup?.isDup[i] ?? false);
                      return (
                      <div
                        key={i}
                        className={cx(
                          "group flex items-center gap-1.5 transition-opacity duration-150",
                          m.role === "me" ? "flex-row-reverse" : "flex-row",
                          isDup && "opacity-40",
                        )}
                      >
                        <MotionButton
                          onClick={() => toggleRole(i)}
                          title={isDup ? "Already saved — won't be imported" : "Switch speaker"}
                          className={cx(
                            "max-w-[74%] whitespace-pre-wrap break-words rounded-lg px-3.5 py-2 text-left text-sm leading-normal transition-colors duration-150",
                            m.role === "me"
                              ? "rounded-br-sm bg-accent text-on-accent shadow-xs shadow-[inset_0_1px_0_0_rgb(255_255_255/0.20)]"
                              : "rounded-bl-sm bg-fill text-ink ring-1 ring-line",
                          )}
                        >
                          {m.content}
                        </MotionButton>
                        <MotionButton
                          onClick={() => removeAt(i)}
                          aria-label="Remove message"
                          className="rounded-md p-1.5 text-ink-faint opacity-0 transition-colors duration-150 hover:bg-danger-soft hover:text-danger group-hover:opacity-100 group-focus-within:opacity-100"
                        >
                          <IconClose size={13} />
                        </MotionButton>
                      </div>
                      );
                    })
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
                  <MotionButton
                    onClick={() => setParsed(null)}
                    className="rounded-md px-3 py-2 text-sm text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink"
                  >
                    ← Back to edit
                  </MotionButton>
                  <MotionButton
                    onClick={() => onImport(toImport)}
                    disabled={importing || toImport.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-label text-on-accent shadow-press transition-colors duration-150 hover:bg-accent-strong disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                  >
                    {importing && <Spinner size={14} />}{" "}
                    {toImport.length === 0
                      ? "Nothing new to import"
                      : `Import ${toImport.length} ${toImport.length === 1 ? "message" : "messages"}`}
                  </MotionButton>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
