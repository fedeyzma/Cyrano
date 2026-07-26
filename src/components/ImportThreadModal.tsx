"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  SPRING_MICRO,
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
import {
  collectTiles,
  MAX_SHOTS,
  MAX_TILES,
  prepareScreenshot,
  type PreparedShot,
} from "@/lib/screenshotTiles";
import { IconClose, IconScan, IconSparkles, IconSwap } from "./icons";
import { Button, Chip, IconButton, Spinner, focusRing, inputClass } from "./ui";

export interface ScreenshotParseResult {
  messages: ParsedMessage[];
  slicesRead: number;
  slicesTotal: number;
}

export function ImportThreadModal({
  open,
  importing,
  error,
  conversationName,
  existingMessages,
  onClose,
  onImport,
  onAiParse,
  onScreenshotParse,
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
  onScreenshotParse: (tiles: string[]) => Promise<ScreenshotParseResult>;
}) {
  const [source, setSource] = useState<"text" | "shot">("text");
  const [raw, setRaw] = useState("");
  const [shots, setShots] = useState<PreparedShot[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState<ParsedMessage[] | null>(null);
  const [aiParsing, setAiParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  /** Set when the read came back short — surfaced above the preview, never swallowed. */
  const [shotNote, setShotNote] = useState<string | null>(null);
  const [importAll, setImportAll] = useState(false);
  const reduced = useAppReducedMotion();
  const shotSeq = useRef(0);

  // Overlap against what's already saved — recomputes as roles are toggled.
  const dedup = useMemo(
    () => (parsed ? splitNewMessages(parsed, existingMessages) : null),
    [parsed, existingMessages],
  );
  const toImport = importAll ? (parsed ?? []) : (dedup?.fresh ?? []);
  const totalSlices = useMemo(() => shots.reduce((n, s) => n + s.tiles.length, 0), [shots]);

  const scrim = rm(reduced, scrimVariants);
  const panel = rm(reduced, modalVariants);
  const stage = rm(reduced, viewVariants); // Crossfade-and-breathe between paste ⇄ shot ⇄ preview
  const alert = rm(reduced, railVariants);
  const galleyList = rm(reduced, listContainer(35));
  const galleyRow = rm(reduced, listItem(10));
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
      setSource("text");
      setRaw("");
      setShots([]);
      setPreparing(false);
      setDragOver(false);
      setParsed(null);
      setParseError(null);
      setShotNote(null);
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

  const addFiles = useCallback(async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setPreparing(true);
    setParseError(null);
    try {
      for (const f of images) {
        try {
          const shot = await prepareScreenshot(f, `shot-${(shotSeq.current += 1)}`);
          setShots((prev) => (prev.length >= MAX_SHOTS ? prev : [...prev, shot]));
        } catch {
          setParseError("Couldn't read one of those images — try a PNG or JPG.");
        }
      }
    } finally {
      setPreparing(false);
    }
  }, []);

  // Paste a screenshot straight into the modal (Win+Shift+S, then Ctrl+V).
  // Only image pastes are intercepted, so pasting text into the textarea is
  // untouched; an image paste also flips to the screenshot tab.
  useEffect(() => {
    if (!open || parsed !== null) return;
    function onPaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
        .map((it) => it.getAsFile())
        .filter((f): f is File => !!f);
      if (files.length) {
        e.preventDefault();
        setSource("shot");
        void addFiles(files);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open, parsed, addFiles]);

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
    setShotNote(null);
    try {
      setParsed(await onAiParse(raw));
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not auto-detect the messages.");
    } finally {
      setAiParsing(false);
    }
  }

  async function runShotParse() {
    const { tiles, dropped } = collectTiles(shots);
    if (tiles.length === 0) return;
    setAiParsing(true);
    setParseError(null);
    setShotNote(null);
    try {
      const res = await onScreenshotParse(tiles);
      const notes: string[] = [];
      if (dropped > 0) {
        notes.push(
          `the oldest ${dropped} ${dropped === 1 ? "slice was" : "slices were"} skipped (past the ${MAX_TILES}-slice limit)`,
        );
      }
      if (res.slicesRead < res.slicesTotal) {
        notes.push(`Cami only got through ${res.slicesRead} of ${res.slicesTotal} slices`);
      }
      setShotNote(
        notes.length ? `Heads up: ${notes.join(", and ")}. Check the end of the thread.` : null,
      );
      setParsed(res.messages);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not read that screenshot.");
    } finally {
      setAiParsing(false);
    }
  }

  void setRole; // (kept for clarity; toggleRole is used in the UI)

  const stageKey = parsed !== null ? "preview" : source;

  return (
    <AnimatePresence>
      {open && (
        <div
          key="import-thread-modal"
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
            aria-labelledby="import-thread-title"
            variants={panel}
            initial="initial"
            animate="enter"
            exit="exit"
            className="glass-modal relative flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl rounded-b-none sm:rounded-xl"
          >
            {/* Grab handle — bottom-sheet affordance below sm only (§7D) */}
            <div className="mx-auto mt-3 h-[5px] w-9 shrink-0 rounded-full bg-[rgb(255_255_255_/_0.25)] sm:hidden" aria-hidden="true" />

            <div className="shrink-0 px-6 pt-3 sm:pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <motion.h2
                    id="import-thread-title"
                    variants={title}
                    className="text-modal text-ink"
                  >
                    Import a thread
                  </motion.h2>
                  <p className="mt-1 text-marginalia text-ink-muted">
                    Paste an existing conversation with {conversationName}, or drop a screenshot of
                    it.
                  </p>
                </div>
                <IconButton label="Close" onClick={onClose} className="-mr-1 -mt-0.5">
                  <IconClose size={18} />
                </IconButton>
              </div>

              {parsed === null && (
                <div className="mt-3 flex gap-2" role="tablist" aria-label="Import source">
                  <Chip
                    role="tab"
                    aria-selected={source === "text"}
                    active={source === "text"}
                    onClick={() => {
                      setSource("text");
                      setParseError(null);
                    }}
                    className="hit min-h-7"
                  >
                    Paste text
                  </Chip>
                  <Chip
                    role="tab"
                    aria-selected={source === "shot"}
                    active={source === "shot"}
                    onClick={() => {
                      setSource("shot");
                      setParseError(null);
                    }}
                    className="hit min-h-7"
                  >
                    Screenshot
                  </Chip>
                </div>
              )}

              <div className="rule-double mt-4" aria-hidden="true" />
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {stageKey === "text" ? (
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
                    <span className="text-marginalia text-ink-muted">
                      Names and timestamps are fine — they get stripped out
                    </span>
                    <span className="text-marginalia tabular-nums text-ink-muted">
                      {raw.length.toLocaleString()} characters ·{" "}
                      {raw.split(/\r?\n/).filter((l) => l.trim()).length} lines
                    </span>
                  </div>
                  {raw.length > MAX_IMPORT_CHARS && (
                    <p className="mt-1.5 text-label tabular-nums text-accent">
                      Only the first {MAX_IMPORT_CHARS.toLocaleString()} characters will be read —
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
              ) : stageKey === "shot" ? (
                <motion.div
                  key="shot"
                  variants={stage}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:pb-6"
                >
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      void addFiles(Array.from(e.dataTransfer.files));
                    }}
                    className={cx(
                      "group flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed bg-[rgb(255_255_255_/_0.03)] px-4 py-8 text-center shadow-[var(--shadow-plate)] transition-colors duration-150",
                      dragOver
                        ? "border-line-gilt bg-accent-faint"
                        : "border-line-strong hover:border-line-gilt hover:bg-fill",
                    )}
                  >
                    <IconScan
                      size={22}
                      className={cx(
                        "transition-colors duration-150",
                        dragOver ? "text-accent" : "text-ink-muted group-hover:text-accent",
                      )}
                    />
                    <span className="text-title text-ink-secondary">Drop a chat screenshot</span>
                    <span className="text-label text-ink-muted">
                      Scroll captures welcome — long ones get sliced up automatically
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        void addFiles(Array.from(e.target.files ?? []));
                        e.target.value = "";
                      }}
                    />
                  </label>

                  {shots.length > 0 && (
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2.5">
                        <AnimatePresence mode="popLayout" initial={false}>
                          {shots.map((shot) => (
                            <motion.div
                              key={shot.id}
                              layout={!reduced}
                              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                              animate={
                                reduced
                                  ? { opacity: 1, transition: { duration: 0.12 } }
                                  : { opacity: 1, scale: 1, transition: SPRING_MICRO }
                              }
                              exit={
                                reduced
                                  ? { opacity: 0, transition: { duration: 0.12 } }
                                  : {
                                      opacity: 0,
                                      scale: 0.9,
                                      transition: { duration: 0.14, ease: EASE_INK },
                                    }
                              }
                              className="group relative"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={shot.thumb}
                                alt="chat screenshot"
                                className="h-24 w-20 rounded-md border border-line object-cover object-top"
                              />
                              <span className="absolute inset-x-0 bottom-0 rounded-b-md bg-[rgb(4_5_10_/_0.72)] px-1 py-0.5 text-center text-marginalia tabular-nums text-ink-secondary">
                                {shot.tiles.length}{" "}
                                {shot.tiles.length === 1 ? "slice" : "slices"}
                              </span>
                              <MotionButton
                                onClick={() =>
                                  setShots((prev) => prev.filter((x) => x.id !== shot.id))
                                }
                                aria-label="Remove screenshot"
                                className={cx(
                                  "hit absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-line-strong bg-surface-high text-ink-secondary shadow-[var(--shadow-sm)] transition-colors duration-150 hover:text-danger",
                                  focusRing,
                                )}
                              >
                                <IconClose size={11} />
                              </MotionButton>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                      <p className="mt-2 text-marginalia tabular-nums text-ink-muted">
                        {shots.length} of {MAX_SHOTS} · {totalSlices}{" "}
                        {totalSlices === 1 ? "slice" : "slices"} to read
                      </p>
                      {totalSlices > MAX_TILES && (
                        <p className="mt-1 text-label tabular-nums text-accent">
                          Only the last {MAX_TILES} slices will be read — the oldest part gets
                          skipped
                        </p>
                      )}
                    </div>
                  )}

                  <p className="mt-4 text-marginalia text-ink-muted">
                    Cami goes by which side each bubble sits on, so keep the full width of the chat
                    in frame. You can fix any line, or flip both sides at once, on the next step.
                  </p>

                  <AnimatePresence initial={false}>
                    {parseError && (
                      <motion.div
                        key="shot-error"
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
                    <Button
                      variant="primary"
                      className="hit-sm"
                      onClick={runShotParse}
                      disabled={shots.length === 0 || aiParsing || preparing}
                    >
                      {aiParsing || preparing ? <Spinner size={13} /> : <IconSparkles size={15} />}
                      {preparing
                        ? "Slicing…"
                        : aiParsing
                          ? totalSlices > 3
                            ? "Reading… (a minute or two)"
                            : "Reading…"
                          : "Read screenshot"}
                    </Button>
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
                    <span className="text-marginalia text-ink-muted">
                      <span className="tabular-nums">{parsed?.length ?? 0}</span> messages · tap a
                      bubble to switch speaker
                    </span>
                    <Button variant="subtle" size="sm" className="hit -mr-2" onClick={flipAll}>
                      <IconSwap size={14} /> Flip all
                    </Button>
                  </div>

                  {shotNote && (
                    <div className="shrink-0 border-b border-line bg-accent-faint px-6 py-2 text-label text-accent">
                      {shotNote}
                    </div>
                  )}

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
                        Import all anyway
                      </label>
                    </div>
                  )}

                  <motion.div
                    variants={galleyList}
                    initial="initial"
                    animate="enter"
                    className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-4 sm:px-6"
                  >
                    {(parsed?.length ?? 0) === 0 ? (
                      <p className="px-6 py-10 text-center text-body text-ink-secondary">
                        Nothing to import — go back and add something.
                      </p>
                    ) : (
                      parsed?.map((m, i) => {
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
                                "max-w-[78%] whitespace-pre-wrap break-words border px-3.5 py-2 text-left text-bubble text-ink shadow-[var(--shadow-plate)] transition-colors duration-150",
                                focusRing,
                                m.role === "me"
                                  ? "rounded-[20px] rounded-br-[6px] border-line-gilt bg-accent-soft hover:border-accent/50"
                                  : "rounded-[20px] rounded-bl-[6px] border-line bg-[rgb(255_255_255_/_0.05)] hover:border-line-strong hover:bg-fill-hover",
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
                    <Button
                      variant="subtle"
                      className="hit-sm"
                      onClick={() => {
                        setParsed(null);
                        setShotNote(null);
                      }}
                    >
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
