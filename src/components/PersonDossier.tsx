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

/** The profile sheet rises and settles like glass (DESIGN.md v2 §8). */
const dossierVariants: Variants = {
  initial: { opacity: 0, y: 24 },
  enter: { opacity: 1, y: 0, transition: SPRING_SHEET },
  exit: { opacity: 0, y: 12, transition: { duration: DUR.exitBase, ease: EASE_INK } },
};

/** Glow-dot section head — sentence case beside the dot; laurel = memory. */
function SectionHead({
  label,
  aside,
  memory = false,
}: {
  label: string;
  aside?: React.ReactNode;
  memory?: boolean;
}) {
  return (
    <div
      className={cx(
        "kicker mb-4 flex items-baseline justify-between gap-3",
        memory && "kicker-laurel",
      )}
    >
      <h2 className="text-folio text-ink-muted">{label}</h2>
      {aside}
    </div>
  );
}

/** "At a glance" row — quiet label left, tabular value right. */
function GlanceRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
      <span className="shrink-0 text-label text-ink-muted">{label}</span>
      <span className="min-w-0 truncate text-right text-label tabular-nums text-ink">
        {value}
      </span>
    </div>
  );
}

/** Stat pill — the below-lg strip under the masthead. Simulated glass. */
function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="glass-card inline-flex items-baseline gap-1.5 rounded-full px-3.5 py-1.5">
      <span className="text-label font-semibold tabular-nums text-ink">{value}</span>
      <span className="text-marginalia text-ink-muted">{label}</span>
    </span>
  );
}

/**
 * PersonDossier — the glass profile page (DESIGN.md v2 §8). A full-region
 * thick-glass sheet over the chat: gem-disc avatar masthead, big tight name,
 * a standout-fact pull-quote, then bio + grouped facts with an "At a glance"
 * stat card on the right (folds into a stat-pill strip below lg).
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
      className="glass-modal absolute inset-0 z-20 flex flex-col overflow-hidden"
    >
      <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-line px-4 sm:px-6">
        <Button variant="ghost" onClick={onClose} className="hit">
          <IconReply size={15} />
          Back to chat
        </Button>
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-folio text-ink-muted max-sm:hidden"
        >
          Profile
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
            <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
              <SealDisc initial={conversation.name.trim() || "?"} size={64} />
              <div className="min-w-0 flex-1">
                <h1 className="text-spread break-words text-ink">{conversation.name}</h1>
                <p className="mt-2 text-marginalia text-ink-muted">
                  In conversation since {since} ·{" "}
                  {messages.length === 1 ? "1 message" : `${messages.length} messages`}
                  {conversation.platform ? ` · via ${conversation.platform}` : ""}
                </p>
              </div>
            </div>
            <div className="rule-double mt-6" aria-hidden />
          </motion.div>

          {/* ── Pull-quote — one standout fact ── */}
          {standout && (
            <motion.figure variants={sectionItem} className="mt-8 max-w-xl">
              <div className="kicker text-folio text-ink-muted">Worth remembering</div>
              <blockquote className="mt-2 text-[18px] font-medium leading-7 text-accent">
                {standout.content}
              </blockquote>
            </motion.figure>
          )}

          {/* ── Stat pills (below lg the glance column folds here) ── */}
          <motion.div variants={sectionItem} className="mt-8 flex flex-wrap gap-2 lg:hidden">
            <StatPill value={messages.length} label={messages.length === 1 ? "message" : "messages"} />
            <StatPill value={facts.length} label={facts.length === 1 ? "fact" : "facts"} />
            <StatPill value={queued.length} label="in queue" />
            <StatPill value={relativeTime(lastActive) || "—"} label="last active" />
          </motion.div>

          {/* ── The body ── */}
          <div className="mt-10 grid gap-10 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
            <div className="min-w-0 space-y-10">
              {/* Notes — the user's own context */}
              {conversation.notes && (
                <motion.section variants={sectionItem}>
                  <SectionHead label="Your notes" />
                  <p className="max-w-prose whitespace-pre-wrap text-body leading-relaxed text-ink-secondary">
                    {conversation.notes}
                  </p>
                </motion.section>
              )}

              {/* Facts — the memory library */}
              <motion.section variants={sectionItem}>
                <SectionHead
                  label="Facts"
                  memory
                  aside={
                    <span className="rounded-full bg-fill px-2 py-px text-folio tabular-nums text-ink-muted">
                      {facts.length}
                    </span>
                  }
                />

                <div className="flex flex-wrap items-center gap-2">
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={onScanFacts}
                      disabled={scanning}
                      className={cx(
                        "hit-sm inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-1.5 text-label text-ink-secondary transition-colors duration-150 hover:border-line-laurel hover:bg-laurel-faint hover:text-laurel active:bg-laurel-soft disabled:pointer-events-none disabled:opacity-60",
                        focusRing,
                      )}
                    >
                      {scanning ? <Spinner size={13} /> : <IconScan size={14} />}
                      {scanning ? (
                        <span className="animate-thinking">Reading the thread…</span>
                      ) : (
                        "Scan thread for details"
                      )}
                    </button>
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
                        placeholder="Search facts…"
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
                      placeholder="Add something to remember…"
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
                    <p className="text-title text-ink">No facts yet</p>
                    <p className="mx-auto mt-2 max-w-sm text-body text-ink-muted">
                      Scan the thread to pick up the little things about{" "}
                      {conversation.name}, or add one above.
                    </p>
                  </div>
                ) : groups.length === 0 ? (
                  <p className="text-body text-ink-muted">Nothing matches that.</p>
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
                              "text-folio",
                              g.key === "pinned" ? "text-accent" : "text-ink-muted",
                            )}
                          >
                            {g.label}
                          </h3>
                          <span className="text-marginalia tabular-nums text-ink-muted">
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

            {/* ── At a glance (lg+) ── */}
            <motion.aside variants={sectionItem} className="hidden lg:block">
              <div className="sticky top-8 space-y-3">
                <div className="kicker text-folio text-ink-muted">At a glance</div>
                <div className="glass-card divide-y divide-line overflow-hidden rounded-md">
                  <GlanceRow label="Messages" value={messages.length} />
                  <GlanceRow label="Facts" value={facts.length} />
                  <GlanceRow label="In queue" value={queued.length} />
                  <GlanceRow label="Last active" value={relativeTime(lastActive) || "—"} />
                  <GlanceRow label="Matched" value={since} />
                  {conversation.platform && (
                    <GlanceRow label="Platform" value={conversation.platform} />
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
