"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { listContainer, rm, useAppReducedMotion, MotionButton } from "@/components/motion";
import { cx } from "@/lib/cx";
import { FactRow, groupFacts } from "@/components/factLib";
import type { ConversationDetail, FactCategory } from "@/lib/types";
import { FACT_CATEGORIES, FACT_CATEGORY_LABELS } from "@/lib/types";
import { IconBrain, IconClose, IconPlus, IconScan } from "./icons";

const INPUT_CLASS =
  "w-full rounded-md border border-line bg-fill px-3 text-sm text-ink placeholder:text-ink-muted outline-none transition-colors duration-150 focus:border-line-accent focus:ring-[3px] focus:ring-accent/12";

export function FactsPanel({
  detail,
  scanning,
  onAddFact,
  onScanFacts,
  onDeleteFact,
  onTogglePin,
  onUpdateConversation,
  onClose,
}: {
  detail: ConversationDetail;
  scanning: boolean;
  onAddFact: (content: string, category: FactCategory) => void;
  onScanFacts: () => void;
  onDeleteFact: (factId: number) => void;
  onTogglePin: (factId: number, pinned: boolean) => void;
  onUpdateConversation: (patch: { platform?: string | null; notes?: string | null }) => void;
  onClose?: () => void;
}) {
  const { conversation, messages, facts } = detail;
  const [newFact, setNewFact] = useState("");
  const [newCategory, setNewCategory] = useState<FactCategory>("other");
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState(conversation.notes ?? "");
  const [platform, setPlatform] = useState(conversation.platform ?? "");
  const reduced = useAppReducedMotion();

  // Track which fact ids have already been rendered for this conversation so
  // only genuinely new facts (incl. optimistic) get the accent flash — never
  // the person-switch entrance. Refs, not state: purely presentational.
  const seenFactIdsRef = useRef<Set<number>>(new Set());
  const newFactIdsRef = useRef<Set<number>>(new Set());
  const renderedConvRef = useRef<number | null>(null);

  if (renderedConvRef.current !== conversation.id) {
    seenFactIdsRef.current = new Set();
    newFactIdsRef.current = new Set();
  }
  const listMounted = renderedConvRef.current === conversation.id;
  for (const f of facts) {
    if (listMounted && !seenFactIdsRef.current.has(f.id)) {
      newFactIdsRef.current.add(f.id);
    }
  }

  useEffect(() => {
    renderedConvRef.current = conversation.id;
    for (const f of facts) seenFactIdsRef.current.add(f.id);
  });

  // Reset edit fields when the selected person changes.
  useEffect(() => {
    setNotes(conversation.notes ?? "");
    setPlatform(conversation.platform ?? "");
    setNewFact("");
    setNewCategory("other");
    setQuery("");
  }, [conversation.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function addFact() {
    const t = newFact.trim();
    if (!t) return;
    onAddFact(t, newCategory);
    setNewFact("");
  }

  function saveNotes() {
    if ((notes.trim() || null) !== (conversation.notes ?? null)) {
      onUpdateConversation({ notes: notes.trim() || null });
    }
  }

  function savePlatform() {
    if ((platform.trim() || null) !== (conversation.platform ?? null)) {
      onUpdateConversation({ platform: platform.trim() || null });
    }
  }

  const groups = groupFacts(facts, query);
  const factListVariants = rm(reduced, listContainer(30));

  return (
    <div className="flex h-full flex-col border-l border-line">
      <header className="glass-header flex h-16 shrink-0 items-center justify-between border-b border-line px-6">
        <div className="flex items-center gap-2 text-title text-ink">
          <IconBrain size={18} className="text-accent" />
          Memory
        </div>
        {onClose && (
          <MotionButton
            onClick={onClose}
            aria-label="Close memory panel"
            className="rounded-md p-1.5 text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <IconClose size={18} />
          </MotionButton>
        )}
      </header>

      <div className="flex-1 space-y-8 overflow-y-auto p-4">
        {/* About */}
        <section>
          <h3 className="kicker mb-2 text-meta font-semibold uppercase tracking-wider text-ink-muted">
            About {conversation.name}
          </h3>
          <label className="block text-meta text-ink-muted">Where you matched</label>
          <input
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            onBlur={savePlatform}
            placeholder="Hinge, Tinder, IRL…"
            className={cx(INPUT_CLASS, "mt-1 py-1.5")}
          />
          <label className="mt-3 block text-meta text-ink-muted">Your notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            rows={3}
            placeholder="context only you know…"
            className={cx(INPUT_CLASS, "mt-1 resize-none py-2")}
          />
        </section>

        {/* Fact library */}
        <section>
          <div className="kicker mb-2 flex items-center justify-between">
            <h3 className="text-meta font-semibold uppercase tracking-wider text-ink-muted">
              Fact library
            </h3>
            <span className="text-meta tabular-nums text-ink-muted">{facts.length}</span>
          </div>

          {messages.length > 0 && (
            <MotionButton
              onClick={onScanFacts}
              disabled={scanning}
              className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-label text-ink-secondary transition-colors duration-150 hover:border-accent/40 hover:text-accent disabled:cursor-default disabled:opacity-60 disabled:hover:border-line-strong disabled:hover:text-ink-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <IconScan size={14} className={scanning ? "animate-pulse" : undefined} />
              {scanning ? "Reading the whole thread…" : "Scan thread for details"}
            </MotionButton>
          )}

          <div className="flex gap-1.5">
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
          <div className="mt-1.5 flex items-center gap-2">
            <label
              htmlFor={`fact-cat-${conversation.id}`}
              className="shrink-0 text-meta text-ink-muted"
            >
              File under
            </label>
            <select
              id={`fact-cat-${conversation.id}`}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as FactCategory)}
              className={cx(INPUT_CLASS, "flex-1 py-1.5")}
            >
              {FACT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {FACT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          {facts.length > 5 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search the library…"
              className={cx(INPUT_CLASS, "mt-3 py-1.5")}
            />
          )}

          {facts.length === 0 ? (
            <p className="mt-3 text-xs leading-normal text-ink-muted">
              Nothing yet. Scan the thread to build a library of the little things about{" "}
              {conversation.name} — or jot one down yourself.
            </p>
          ) : groups.length === 0 ? (
            <p className="mt-3 text-xs leading-normal text-ink-muted">No details match that.</p>
          ) : (
            <motion.div
              key={conversation.id}
              className="mt-3 space-y-4"
              variants={factListVariants}
              initial="initial"
              animate="enter"
            >
              {groups.map((g) => (
                <div key={g.key}>
                  <div className="mb-1 flex items-baseline justify-between px-2">
                    <span
                      className={cx(
                        "text-meta font-semibold uppercase tracking-wider",
                        g.key === "pinned" ? "text-accent" : "text-ink-muted",
                      )}
                    >
                      {g.label}
                    </span>
                    <span className="text-meta tabular-nums text-ink-faint">{g.items.length}</span>
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
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}
