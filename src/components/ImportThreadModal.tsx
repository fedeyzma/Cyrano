"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  DUR,
  EASE_INK,
  listContainer,
  listItem,
  modalVariants,
  MotionButton,
  railVariants,
  rm,
  scrimVariants,
  useAppReducedMotion,
  viewVariants,
} from "@/components/motion";
import { cx } from "@/lib/cx";
import {
  MAX_IMPORT_CHARS,
  parseThread,
  splitNewMessages,
  type ParsedMessage,
} from "@/lib/parseThread";
import { IconClose, IconSparkles, IconSwap } from "./icons";
import { Button, IconButton, Spinner, focusRing, inputClass } from "./ui";

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
  const stage = rm(reduced, viewVariants); // Folio Turn between paste ⇄ preview
  const alert = rm(reduced, railVariants);
  const galleyList = rm(reduced, listContainer(35));
  const galleyRow = rm(reduced, listItem(10));
  // The Fraunces title arrives a beat after the plate (DESIGN.md §8 Modals).
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
        <div
          key="import-thread-modal"
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
        >
          <motion.button
            aria-label="Close"
            className="absolute inset-0 bg-[rgb(8_7_6_/_0.72)] backdrop-blur-[8px]"
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
            className="relative flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl rounded-b-none border border-line-strong bg-surface-high shadow-[var(--shadow-lg),var(--shadow-plate)] sm:rounded-xl"
          >
            {/* Drag handle — bottom-sheet affordance below sm only */}
            <div className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />

            <div className="shrink-0 px-6 pt-3 sm:pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <motion.h2
                    id="import-thread-title"
                    variants={title}
                    className="font-display text-modal text-ink"
                  >
                    Import a thread
                  </motion.h2>
                  <p className="font-display mt-1 text-marginalia italic text-ink-muted">
                    Paste an existing conversation with {conversationName}.
                  </p>
                </div>
                <IconButton label="Close" onClick={onClose} className="-mr-1 -mt-0.5">
                  <IconClose size={18} />
                </IconButton>
              </div>
              <div className="rule-double mt-4" aria-hidden="true" />
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {parsed === null ? (
                <motion.div
                  key="paste"
                  variants={stage}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:pb-6"
                >
                  <textarea
                    autoFocus
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    placeholder={
                      "Paste the whole conversation here — names, timestamps, whatever junk. Auto-detect figures out who said what; you can fix any line (or flip both sides) on the next step."
                    }
                    className={cx(inputClass, "h-64 max-h-[45vh] min-h-40 resize-y")}
                  />
                  <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="font-display text-marginalia italic text-ink-muted">
                      the compositor reads past names and timestamps
                    </span>
                    <span className="text-folio uppercase tabular-nums text-ink-muted">
                      {raw.length.toLocaleString()} characters ·{" "}
                      {raw.split(/\r?\n/).filter((l) => l.trim()).length} lines
                    </span>
                  </div>
                  {raw.length > MAX_IMPORT_CHARS && (
                    <p className="mt-1.5 text-label tabular-nums text-accent">
                      only the first {MAX_IMPORT_CHARS.toLocaleString()} characters will be read —
                      split very long threads
                    </p>
                  )}

                  <AnimatePresence initial={false}>
                    {parseError && (
                      <motion.div
                        key="parse-error"
                        role="alert"
                        variants={alert}
                        initial="initial"
                        animate="enter"
                        exit="exit"
                        className="mt-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-label text-danger"
                      >
                        {parseError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                    <Button variant="subtle" className="hit-sm" onClick={onClose}>
                      Cancel
                    </Button>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        className="hit-sm"
                        onClick={() => {
                          setParseError(null);
                          setParsed(parseThread(raw, conversationName));
                        }}
                        disabled={!raw.trim() || aiParsing}
                        title="No AI — split by lines and Me:/Them: labels"
                      >
                        Quick parse
                      </Button>
                      <Button
                        variant="primary"
                        className="hit-sm"
                        onClick={runAiParse}
                        disabled={!raw.trim() || aiParsing}
                      >
                        {aiParsing ? <Spinner size={13} /> : <IconSparkles size={15} />}
                        {aiParsing ? "Reading…" : "Auto-detect with AI"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  variants={stage}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-6 py-2">
                    <span className="font-display text-marginalia italic text-ink-muted">
                      <span className="tabular-nums">{parsed.length}</span> messages · tap a bubble
                      to switch speaker
                    </span>
                    <Button variant="subtle" size="sm" className="hit -mr-2" onClick={flipAll}>
                      <IconSwap size={14} /> Flip all
                    </Button>
                  </div>

                  {dedup && dedup.skipped > 0 && (
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-line bg-fill px-6 py-2 text-label">
                      <span className="text-ink-secondary">
                        <span className="tabular-nums text-accent">{dedup.fresh.length}</span> new ·{" "}
                        <span className="tabular-nums">{dedup.skipped}</span> already saved{" "}
                        {importAll ? "(importing anyway)" : "(skipped)"}
                      </span>
                      <label className="hit-sm inline-flex cursor-pointer select-none items-center gap-1.5 text-ink-muted transition-colors duration-150 hover:text-ink">
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

                  <motion.div
                    variants={galleyList}
                    initial="initial"
                    animate="enter"
                    className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-4 sm:px-6"
                  >
                    {parsed.length === 0 ? (
                      <p className="font-display px-6 py-10 text-center text-body italic text-ink-secondary">
                        Nothing to import — go back and paste some text.
                      </p>
                    ) : (
                      parsed.map((m, i) => {
                        const isDup = !importAll && (dedup?.isDup[i] ?? false);
                        return (
                          <motion.div
                            key={i}
                            custom={i}
                            variants={galleyRow}
                            className={cx(
                              "group flex items-center gap-1 transition-opacity duration-150",
                              m.role === "me" ? "flex-row-reverse" : "flex-row",
                              isDup && "opacity-40",
                            )}
                          >
                            <MotionButton
                              onClick={() => toggleRole(i)}
                              title={isDup ? "Already saved — won't be imported" : "Switch speaker"}
                              className={cx(
                                "max-w-[78%] whitespace-pre-wrap break-words border px-3.5 py-2 text-left text-bubble text-ink transition-colors duration-150",
                                focusRing,
                                m.role === "me"
                                  ? "rounded-[14px] rounded-br-[4px] border-line-gilt bg-accent-soft hover:border-accent/50"
                                  : "rounded-[14px] rounded-bl-[4px] border-line bg-surface hover:border-line-strong hover:bg-fill",
                              )}
                            >
                              {m.content}
                            </MotionButton>
                            <IconButton
                              label="Remove message"
                              tone="danger"
                              onClick={() => removeAt(i)}
                              className="shrink-0 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100"
                            >
                              <IconClose size={13} />
                            </IconButton>
                          </motion.div>
                        );
                      })
                    )}
                  </motion.div>

                  <AnimatePresence initial={false}>
                    {error && (
                      <motion.div
                        key="import-error"
                        role="alert"
                        variants={alert}
                        initial="initial"
                        animate="enter"
                        exit="exit"
                        className="mx-6 mb-2 shrink-0 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-label text-danger"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
                    <Button variant="subtle" className="hit-sm" onClick={() => setParsed(null)}>
                      ← Back to edit
                    </Button>
                    <Button
                      variant="primary"
                      className="hit-sm"
                      onClick={() => onImport(toImport)}
                      disabled={importing || toImport.length === 0}
                    >
                      {importing && <Spinner size={13} />}
                      {toImport.length === 0
                        ? "Nothing new to import"
                        : `Import ${toImport.length} ${toImport.length === 1 ? "message" : "messages"}`}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
