"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { listContainer, rm, useAppReducedMotion } from "@/components/motion";
import { Field, IconButton, Input, Spinner, Textarea, focusRing, inputClass } from "@/components/ui";
import { cx } from "@/lib/cx";
import { FactRow, groupFacts } from "@/components/factLib";
import type { ConversationDetail, FactCategory } from "@/lib/types";
import { FACT_CATEGORIES, FACT_CATEGORY_LABELS } from "@/lib/types";
import { IconChevronDown, IconClose, IconPlus, IconScan, IconSearch } from "./icons";

/**
 * FactsPanel — the frosted memory inspector (DESIGN.md v2 §8). The
 * compact-density sibling of the dossier: about fields, then the fact
 * library as soft rows under glow-dot section labels. Laurel is memory's
 * pigment throughout. Lives inline at xl+ and inside the right drawer below
 * xl (the drawer supplies the glass; this panel stays blur-free).
 */
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
    <div className="flex h-full w-full min-w-0 flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-laurel [box-shadow:0_0_8px_color-mix(in_srgb,var(--color-laurel)_40%,transparent)]"
          />
          <div className="min-w-0">
            <div className="truncate text-title text-ink">Memory</div>
            <div className="truncate text-marginalia text-ink-muted">
              What Cyrano knows about {conversation.name}
            </div>
          </div>
        </div>
        {onClose && (
          <IconButton label="Close memory panel" onClick={onClose}>
            <IconClose size={16} />
          </IconButton>
        )}
      </header>

      <div className="flex-1 space-y-9 overflow-y-auto p-4 pt-5">
        {/* About — context only the user knows */}
        <section>
          <h3 className="kicker kicker-laurel mb-3 truncate text-folio text-ink-muted">
            About {conversation.name}
          </h3>
          <div className="space-y-3">
            <Field label="Where you matched">
              <Input
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                onBlur={savePlatform}
                placeholder="Hinge, Tinder, IRL…"
                className="py-1.5"
              />
            </Field>
            <Field label="Your notes">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                rows={3}
                placeholder="Context only you know…"
              />
            </Field>
          </div>
        </section>

        {/* Facts — the memory library */}
        <section>
          <div className="kicker kicker-laurel mb-3 flex items-baseline justify-between gap-3">
            <h3 className="text-folio text-ink-muted">Facts</h3>
            <span className="rounded-full bg-fill px-2 py-px text-folio tabular-nums text-ink-muted">
              {facts.length}
            </span>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={onScanFacts}
              disabled={scanning}
              className={cx(
                "hit-sm mb-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-line-strong px-3.5 py-1.5 text-label text-ink-secondary transition-colors duration-150 hover:border-line-laurel hover:bg-laurel-faint hover:text-laurel active:bg-laurel-soft disabled:pointer-events-none disabled:opacity-60",
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

          <div className="flex gap-2">
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
          <div className="mt-2 flex items-center gap-2">
            <label
              htmlFor={`fact-cat-${conversation.id}`}
              className="shrink-0 text-folio text-ink-muted"
            >
              Category
            </label>
            <div className="relative min-w-0 flex-1">
              <select
                id={`fact-cat-${conversation.id}`}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as FactCategory)}
                className={cx(inputClass, "w-full appearance-none py-1.5 pr-8")}
              >
                {FACT_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-surface">
                    {FACT_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
              <IconChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
              />
            </div>
          </div>

          {facts.length > 5 && (
            <div className="relative mt-3">
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

          {facts.length === 0 ? (
            <p className="mt-4 text-body text-ink-muted">
              No facts yet. Scan the thread to pick up the little things about{" "}
              {conversation.name}, or add one yourself.
            </p>
          ) : groups.length === 0 ? (
            <p className="mt-4 text-body text-ink-muted">Nothing matches that.</p>
          ) : (
            <motion.div
              key={conversation.id}
              className="mt-4 space-y-5"
              variants={factListVariants}
              initial="initial"
              animate="enter"
            >
              {groups.map((g) => (
                <div key={g.key}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 px-2.5">
                    <span
                      className={cx(
                        "text-folio",
                        g.key === "pinned" ? "text-accent" : "text-ink-muted",
                      )}
                    >
                      {g.label}
                    </span>
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
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}
