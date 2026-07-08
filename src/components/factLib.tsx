"use client";

import { motion, type Variants } from "motion/react";
import { DUR, EASE_INK, MotionButton, SPRING_MICRO, SPRING_SETTLE, rm } from "@/components/motion";
import { focusRing } from "@/components/ui";
import { cx } from "@/lib/cx";
import type { Fact } from "@/lib/types";
import { FACT_CATEGORIES, FACT_CATEGORY_LABELS, normalizeFactCategory } from "@/lib/types";
import { IconPin, IconTrash } from "./icons";

/** Fact rows settle in from above; deletions Melt (opacity + 2px blur). */
export const FACT_ITEM_VARIANTS: Variants = {
  initial: { opacity: 0, y: -6 },
  enter: { opacity: 1, y: 0, transition: SPRING_SETTLE },
  exit: { opacity: 0, filter: "blur(2px)", transition: { duration: DUR.hair, ease: EASE_INK } },
};

/** Pin nib settles into place when toggled — the fact tucks itself away. */
export const PIN_POP_VARIANTS: Variants = {
  initial: { rotate: -25, scale: 1.15 },
  enter: { rotate: 0, scale: 1, transition: SPRING_MICRO },
};

export type FactGroup = { key: string; label: string; items: Fact[] };

/**
 * Group facts for the library view: pinned floats to its own group on top,
 * the rest are bucketed by category in the fixed display order. An optional
 * query filters by content first. Shared by FactsPanel and PersonDossier so
 * the two never diverge.
 */
export function groupFacts(facts: Fact[], query?: string): FactGroup[] {
  const q = query?.trim().toLowerCase();
  const visible = q ? facts.filter((f) => f.content.toLowerCase().includes(q)) : facts;
  const groups: FactGroup[] = [];
  const pinned = visible.filter((f) => f.pinned === 1);
  if (pinned.length > 0) groups.push({ key: "pinned", label: "Pinned", items: pinned });
  for (const cat of FACT_CATEGORIES) {
    const items = visible.filter(
      (f) => f.pinned !== 1 && normalizeFactCategory(f.category) === cat,
    );
    if (items.length > 0) groups.push({ key: cat, label: FACT_CATEGORY_LABELS[cat], items });
  }
  return groups;
}

/**
 * A single fact row — a soft list item (DESIGN.md v2 §5/§8): transparent at
 * rest with a rounded fill on hover, fact text left, then — pinned entries
 * only, since the pinned group loses its category context — a pill category
 * tag, and the round pin/delete icon actions (Capsule-style fade on hover;
 * delete always visible on touch widths). Pinned rows wear the gold wash
 * (pinned facts belong to the user's hand). Lives inside a
 * `<motion.ul variants animate>` + `<AnimatePresence mode="popLayout">` so it
 * inherits the enter state and animates its own exit/layout.
 */
export function FactRow({
  fact,
  isNew,
  reduced,
  onTogglePin,
  onDeleteFact,
}: {
  fact: Fact;
  isNew: boolean;
  reduced: boolean;
  onTogglePin: (factId: number, pinned: boolean) => void;
  onDeleteFact: (factId: number) => void;
}) {
  const pinned = fact.pinned === 1;
  return (
    <motion.li
      layout={!reduced}
      variants={rm(reduced, FACT_ITEM_VARIANTS)}
      exit="exit"
      transition={{ layout: SPRING_SETTLE }}
      className={cx(
        "group relative flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors duration-150 hover:bg-fill",
        pinned && "bg-accent-faint",
      )}
    >
      {/* New-fact flash — a wash of gold light that settles into the glass */}
      {isNew && !reduced && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-md bg-accent-soft"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: EASE_INK }}
        />
      )}

      <span className="min-w-0 flex-1 text-body text-ink">{fact.content}</span>

      {pinned && (
        <span className="hidden shrink-0 items-center whitespace-nowrap rounded-full bg-fill px-2 py-px text-folio text-ink-muted sm:inline-flex">
          {FACT_CATEGORY_LABELS[normalizeFactCategory(fact.category)]}
        </span>
      )}

      <span className="flex shrink-0 items-center gap-0.5">
        <MotionButton
          onClick={() => onTogglePin(fact.id, !fact.pinned)}
          aria-label={pinned ? "Unpin fact" : "Pin fact"}
          data-tip={pinned ? "Unpin" : "Pin to keep on top"}
          whileTap={reduced ? undefined : { scale: 0.92 }}
          className={cx(
            "hit grid h-7 w-7 shrink-0 place-items-center rounded-full transition-[color,background-color,opacity] duration-150",
            pinned
              ? "text-accent hover:bg-fill-active"
              : "text-ink-muted opacity-0 hover:bg-fill hover:text-ink-secondary group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 max-md:opacity-100",
            focusRing,
          )}
        >
          <motion.span
            key={pinned ? "pinned" : "unpinned"}
            className="block"
            variants={rm(reduced, PIN_POP_VARIANTS)}
            initial="initial"
            animate="enter"
          >
            <IconPin size={14} />
          </motion.span>
        </MotionButton>
        <MotionButton
          onClick={() => onDeleteFact(fact.id)}
          aria-label="Delete fact"
          data-tip="Delete"
          whileTap={reduced ? undefined : { scale: 0.92 }}
          className={cx(
            "hit grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-muted opacity-0 transition-[color,background-color,opacity] duration-150 hover:bg-danger-soft hover:text-danger group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 max-md:opacity-100",
            focusRing,
          )}
        >
          <IconTrash size={14} />
        </MotionButton>
      </span>
    </motion.li>
  );
}
