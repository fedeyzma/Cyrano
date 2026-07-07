"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  MotionButton,
  fadeUp,
  listContainer,
  rm,
  useAppReducedMotion,
} from "@/components/motion";
import { cx } from "@/lib/cx";
import { FactRow, groupFacts } from "@/components/factLib";
import { relativeTime } from "@/lib/time";
import type { ConversationDetail, FactCategory } from "@/lib/types";
import { FACT_CATEGORIES, FACT_CATEGORY_LABELS } from "@/lib/types";
import { IconEdit, IconPlus, IconReply, IconScan, IconUser } from "./icons";

const INPUT_CLASS =
  "w-full rounded-md border border-line bg-fill px-3 text-sm text-ink placeholder:text-ink-muted outline-none transition-colors duration-150 focus:border-line-accent focus:ring-[3px] focus:ring-accent/12";

const GHOST_BTN =
  "inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-label text-ink-secondary transition-colors duration-150 hover:border-accent/40 hover:bg-fill hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-line bg-fill p-3 shadow-highlight">
      <div className="text-heading tabular-nums text-ink">{value}</div>
      <div className="mt-0.5 text-meta uppercase tracking-wider text-ink-muted">{label}</div>
    </div>
  );
}

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
  const groups = groupFacts(facts, query);
  const tileVariants = rm(reduced, listContainer(40));
  const tileItem = rm(reduced, fadeUp(6));

  return (
    <motion.div
      variants={rm(reduced, fadeUp(8))}
      initial="initial"
      animate="enter"
      exit="exit"
      className="absolute inset-0 z-20 flex flex-col bg-canvas"
    >
      <header className="glass-header flex h-16 shrink-0 items-center justify-between border-b border-line px-6">
        <MotionButton onClick={onClose} className={GHOST_BTN}>
          <IconReply size={15} /> Back to chat
        </MotionButton>
        <MotionButton onClick={onEditProfile} className={GHOST_BTN}>
          <IconEdit size={15} /> Edit
        </MotionButton>
      </header>

      <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent/25 to-accent-strong/10 text-heading text-accent ring-1 ring-line">
              {conversation.name.slice(0, 1).toUpperCase() || <IconUser size={22} />}
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-scene text-ink">{conversation.name}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-meta text-ink-muted">
                {conversation.platform && <span>{conversation.platform}</span>}
                {conversation.platform && <span aria-hidden>·</span>}
                <span>matched {relativeTime(conversation.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <motion.div
            variants={tileVariants}
            initial="initial"
            animate="enter"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {(
              [
                ["Messages", messages.length],
                ["Facts", facts.length],
                ["Queued", queued.length],
                ["Last active", relativeTime(lastActive)],
              ] as const
            ).map(([label, value]) => (
              <motion.div key={label} variants={tileItem}>
                <StatTile label={label} value={value} />
              </motion.div>
            ))}
          </motion.div>

          {/* Notes */}
          {conversation.notes && (
            <section>
              <h2 className="kicker mb-2 text-meta font-semibold uppercase tracking-wider text-ink-muted">
                Your notes
              </h2>
              <p className="whitespace-pre-wrap rounded-lg border border-line bg-fill p-3 text-sm leading-normal text-ink-secondary">
                {conversation.notes}
              </p>
            </section>
          )}

          {/* Fact library */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-meta font-semibold uppercase tracking-wider text-ink-muted">
                Fact library
              </h2>
              <span className="text-meta tabular-nums text-ink-muted">{facts.length}</span>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              {messages.length > 0 && (
                <MotionButton onClick={onScanFacts} disabled={scanning} className={GHOST_BTN}>
                  <IconScan size={14} className={scanning ? "animate-pulse" : undefined} />
                  {scanning ? "Reading the whole thread…" : "Scan thread for details"}
                </MotionButton>
              )}
              {facts.length > 8 && (
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="search the library…"
                  className={cx(INPUT_CLASS, "ml-auto max-w-52 py-1.5")}
                />
              )}
            </div>

            <div className="mb-4 flex flex-col gap-1.5 sm:flex-row sm:items-center">
              <div className="flex flex-1 gap-1.5">
                <input
                  value={newFact}
                  onChange={(e) => setNewFact(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFact();
                    }
                  }}
                  placeholder="add a detail to remember…"
                  className={cx(INPUT_CLASS, "min-w-0 flex-1 py-1.5")}
                />
                <MotionButton
                  onClick={addFact}
                  aria-label="Add fact"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line-strong text-ink-secondary transition-colors duration-150 hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  <IconPlus size={16} />
                </MotionButton>
              </div>
              <select
                aria-label="Category for the new fact"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as FactCategory)}
                className={cx(INPUT_CLASS, "py-1.5 sm:w-48")}
              >
                {FACT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {FACT_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            {facts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">
                Nothing filed yet. Scan the thread to build a library of the little things about{" "}
                {conversation.name}.
              </div>
            ) : groups.length === 0 ? (
              <p className="text-sm text-ink-muted">No details match that.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {groups.map((g) => (
                  <div
                    key={g.key}
                    className="rounded-lg border border-line bg-fill p-3 shadow-highlight"
                  >
                    <div className="mb-1.5 flex items-baseline justify-between px-1">
                      <span
                        className={cx(
                          "text-meta font-semibold uppercase tracking-wider",
                          g.key === "pinned" ? "text-accent" : "text-ink-muted",
                        )}
                      >
                        {g.label}
                      </span>
                      <span className="text-meta tabular-nums text-ink-faint">
                        {g.items.length}
                      </span>
                    </div>
                    <ul className="space-y-1">
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
          </section>
        </div>
      </div>
    </motion.div>
  );
}
