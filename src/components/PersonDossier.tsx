"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import {
  DUR,
  EASE_INK,
  SPRING_SHEET,
  fadeUp,
  listContainer,
  rm,
  useAppReducedMotion,
} from "@/components/motion";
import { Button, Input, SealDisc, Spinner, focusRing, inputClass } from "@/components/ui";
import { cx } from "@/lib/cx";
import { FactRow, groupFacts } from "@/components/factLib";
import { relativeTime } from "@/lib/time";
import type { ConversationDetail, FactCategory } from "@/lib/types";
import { FACT_CATEGORIES, FACT_CATEGORY_LABELS } from "@/lib/types";
import { IconEdit, IconPlus, IconReply, IconScan, IconSearch } from "./icons";

/** The dossier sheet rises like a page laid on the desk (DESIGN.md §8). */
const dossierVariants: Variants = {
  initial: { opacity: 0, y: 24 },
  enter: { opacity: 1, y: 0, transition: SPRING_SHEET },
  exit: { opacity: 0, y: 12, transition: { duration: DUR.exitBase, ease: EASE_INK } },
};

/** Editorial section head — folio caps over the signature double rule. */
function SectionHead({ label, aside }: { label: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-folio uppercase text-ink-muted">{label}</h2>
        {aside}
      </div>
      <div className="rule-double" aria-hidden />
    </div>
  );
}

/** Marginalia-column stat: italic label, dot leader, tabular value. */
function IndexStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline">
      <span className="font-display shrink-0 text-marginalia italic text-ink-muted">{label}</span>
      <span className="dot-leader" aria-hidden />
      <span className="min-w-0 truncate text-right text-label tabular-nums text-ink-secondary">
        {value}
      </span>
    </div>
  );
}

/** Telemetry cell — the below-lg stat strip under the masthead. */
function TelemetryCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 px-2.5 py-3 first:pl-0 sm:px-4">
      <div className="truncate text-title tabular-nums text-ink">{value}</div>
      <div className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </div>
    </div>
  );
}

/**
 * PersonDossier — «The Profile Spread» (DESIGN.md §8). A full-region sheet
 * over the chat: seal-monogram masthead, spread-set name, pull-quote aside,
 * then a two-column editorial spread (bio + fact index left, marginalia
 * stats right) that collapses to a telemetry strip below lg.
 */
export function PersonDossier({
  detail,
  scanning,
  onAddFact,
  onScanFacts,
  onDeleteFact,
  onTogglePin,
  onEditProfile,
  onClose,
}: {
  detail: ConversationDetail;
  scanning: boolean;
  onAddFact: (content: string, category: FactCategory) => void;
  onScanFacts: () => void;
  onDeleteFact: (factId: number) => void;
  onTogglePin: (factId: number, pinned: boolean) => void;
  onEditProfile: () => void;
  onClose: () => void;
}) {
  const { conversation, messages, facts, queued } = detail;
  const [newFact, setNewFact] = useState("");
  const [newCategory, setNewCategory] = useState<FactCategory>("other");
  const [query, setQuery] = useState("");
  const reduced = useAppReducedMotion();

  // Flash only genuinely-new facts (added/scanned while open), never the
  // person-switch entrance — same bookkeeping as FactsPanel.
  const seenFactIdsRef = useRef<Set<number>>(new Set());
  const newFactIdsRef = useRef<Set<number>>(new Set());
  const renderedConvRef = useRef<number | null>(null);
  if (renderedConvRef.current !== conversation.id) {
    seenFactIdsRef.current = new Set();
    newFactIdsRef.current = new Set();
  }
  const listMounted = renderedConvRef.current === conversation.id;
  for (const f of facts) {
    if (listMounted && !seenFactIdsRef.current.has(f.id)) newFactIdsRef.current.add(f.id);
  }
  useEffect(() => {
    renderedConvRef.current = conversation.id;
    for (const f of facts) seenFactIdsRef.current.add(f.id);
  });

  useEffect(() => {
    setNewFact("");
    setNewCategory("other");
    setQuery("");
  }, [conversation.id]);

  // Close on Escape — mirrors the chat's other dismissable layers.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function addFact() {
    const t = newFact.trim();
    if (!t) return;
    onAddFact(t, newCategory);
    setNewFact("");
  }

  const lastActive = messages.length
    ? messages[messages.length - 1].created_at
    : conversation.updated_at;
  const since = new Date(conversation.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const standout = facts.find((f) => f.pinned === 1) ?? facts[0];
  const groups = groupFacts(facts, query);
  const sectionStagger = rm(reduced, listContainer(60));
  const sectionItem = rm(reduced, fadeUp(10));

  return (
    <motion.div
      variants={rm(reduced, dossierVariants)}
      initial="initial"
      animate="enter"
      exit="exit"
      className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-canvas shadow-[var(--shadow-lg)]"
    >
      {/* The dossier's own reading lamp — warm pool over the masthead */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 520px at 20% -10%, rgb(228 197 137 / 0.06), transparent 62%)",
        }}
      />

      <header className="plate relative flex h-16 shrink-0 items-center justify-between border-b border-line px-4 sm:px-6">
        <Button variant="ghost" onClick={onClose} className="hit">
          <IconReply size={15} />
          Back to chat
        </Button>
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-folio uppercase text-ink-muted max-sm:hidden"
        >
          The dossier
        </span>
        <Button variant="ghost" onClick={onEditProfile} className="hit">
          <IconEdit size={15} />
          Edit profile
        </Button>
      </header>

      <div className="relative flex-1 overflow-y-auto">
        <motion.div
          variants={sectionStagger}
          initial="initial"
          animate="enter"
          className="mx-auto w-full max-w-4xl px-4 pt-10 pb-[calc(3rem+env(safe-area-inset-bottom))] sm:px-6"
        >
          {/* ── Masthead ── */}
          <motion.div variants={sectionItem}>
            <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
              <SealDisc initial={conversation.name.trim() || "?"} size={64} className="mb-1.5" />
              <div className="min-w-0 flex-1">
                <h1 className="text-spread break-words text-ink">{conversation.name}</h1>
                <p className="font-display mt-2 text-marginalia italic text-ink-muted">
                  in conversation since {since} ·{" "}
                  {messages.length === 1 ? "1 letter" : `${messages.length} letters`}
                  {conversation.platform ? ` · via ${conversation.platform}` : ""}
                </p>
              </div>
            </div>
            <div className="rule-double mt-6" aria-hidden />
          </motion.div>

          {/* ── Pull-quote — Cyrano's aside, one standout fact ── */}
          {standout && (
            <motion.figure
              variants={sectionItem}
              className="gilt-rule drawing mt-8 max-w-xl pt-5"
            >
              <blockquote className="font-display text-[20px] italic leading-7 text-accent">
                “{standout.content}”
              </blockquote>
              <figcaption className="font-display mt-1.5 text-marginalia italic text-ink-muted">
                — from the fact library
              </figcaption>
            </motion.figure>
          )}

          {/* ── Telemetry strip (below lg the marginalia column folds here) ── */}
          <motion.div
            variants={sectionItem}
            className="mt-8 grid grid-cols-4 divide-x divide-line border-y border-line lg:hidden"
          >
            <TelemetryCell label="Messages" value={messages.length} />
            <TelemetryCell label="Facts" value={facts.length} />
            <TelemetryCell label="Queued" value={queued.length} />
            <TelemetryCell label="Last seen" value={relativeTime(lastActive) || "—"} />
          </motion.div>

          {/* ── The spread ── */}
          <div className="mt-10 grid gap-10 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
            <div className="min-w-0 space-y-10">
              {/* Notes — user-authored text, so no drop cap (it mangles short
                  or lowercase notes; the cap stays on authored empty-state copy) */}
              {conversation.notes && (
                <motion.section variants={sectionItem}>
                  <SectionHead label="Your notes" />
                  <p className="max-w-prose whitespace-pre-wrap text-body leading-relaxed text-ink-secondary">
                    {conversation.notes}
                  </p>
                </motion.section>
              )}

              {/* Fact library — the index */}
              <motion.section variants={sectionItem}>
                <SectionHead
                  label="Fact library"
                  aside={
                    <span className="font-display text-marginalia italic tabular-nums text-ink-muted">
                      {facts.length} filed
                    </span>
                  }
                />

                <div className="flex flex-wrap items-center gap-2">
                  {messages.length > 0 && (
                    <Button
                      variant="ghost"
                      onClick={onScanFacts}
                      disabled={scanning}
                      className="hit-sm"
                    >
                      {scanning ? <Spinner size={13} /> : <IconScan size={14} />}
                      {scanning ? (
                        <span className="animate-thinking">Reading the whole thread…</span>
                      ) : (
                        "Scan thread for details"
                      )}
                    </Button>
                  )}
                  {facts.length > 8 && (
                    <div className="relative ml-auto w-full sm:w-56">
                      <IconSearch
                        size={14}
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
                      />
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="search the library…"
                        className="py-1.5 pl-8"
                      />
                    </div>
                  )}
                </div>

                <div className="mb-6 mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <div className="flex min-w-0 flex-1 gap-2">
                    <Input
                      value={newFact}
                      onChange={(e) => setNewFact(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addFact();
                        }
                      }}
                      placeholder="add a detail to remember…"
                      className="min-w-0 flex-1 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={addFact}
                      aria-label="Add fact"
                      data-tip="Add fact"
                      className={cx(
                        "hit grid w-9 shrink-0 place-items-center self-stretch rounded-sm border border-line-strong text-ink-secondary transition-colors duration-150 hover:border-line-gilt hover:bg-fill hover:text-accent active:bg-fill-active",
                        focusRing,
                      )}
                    >
                      <IconPlus size={15} />
                    </button>
                  </div>
                  <select
                    aria-label="Category for the new fact"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as FactCategory)}
                    className={cx(inputClass, "py-1.5 sm:w-44")}
                  >
                    {FACT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {FACT_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>

                {facts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
                    <p className="font-display text-[17px] italic leading-6 text-ink-secondary">
                      Nothing filed yet.
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-body text-ink-muted">
                      Scan the thread to build a library of the little things about{" "}
                      {conversation.name}.
                    </p>
                  </div>
                ) : groups.length === 0 ? (
                  <p className="font-display text-[13px] italic leading-5 text-ink-muted">
                    No details match that.
                  </p>
                ) : (
                  <div className="space-y-7">
                    {groups.map((g) => (
                      <div key={g.key}>
                        <div
                          className={cx(
                            "kicker mb-1.5 flex items-baseline justify-between gap-3",
                            g.key !== "pinned" && "kicker-laurel",
                          )}
                        >
                          <h3
                            className={cx(
                              "text-folio uppercase",
                              g.key === "pinned" ? "text-accent" : "text-ink-muted",
                            )}
                          >
                            {g.label}
                          </h3>
                          <span className="font-display text-marginalia italic tabular-nums text-ink-faint">
                            {g.items.length}
                          </span>
                        </div>
                        <ul className="space-y-0.5">
                          <AnimatePresence mode="popLayout">
                            {g.items.map((f) => (
                              <FactRow
                                key={f.id}
                                fact={f}
                                isNew={newFactIdsRef.current.has(f.id)}
                                reduced={reduced}
                                onTogglePin={onTogglePin}
                                onDeleteFact={onDeleteFact}
                              />
                            ))}
                          </AnimatePresence>
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>
            </div>

            {/* ── Marginalia column (lg+) ── */}
            <motion.aside variants={sectionItem} className="hidden lg:block">
              <div className="sticky top-8 space-y-4 border-l border-line pl-6">
                <div className="kicker kicker-laurel text-folio uppercase text-ink-muted">Marginalia</div>
                <div className="space-y-2.5">
                  <IndexStat label="letters" value={messages.length} />
                  <IndexStat label="facts filed" value={facts.length} />
                  <IndexStat label="sealed & waiting" value={queued.length} />
                  <IndexStat label="last heard" value={relativeTime(lastActive) || "—"} />
                  <IndexStat label="matched" value={since} />
                  {conversation.platform && (
                    <IndexStat label="met on" value={conversation.platform} />
                  )}
                </div>
              </div>
            </motion.aside>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
