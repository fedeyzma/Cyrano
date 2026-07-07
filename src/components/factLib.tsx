"use client";

import { motion, type Variants } from "motion/react";
import { EASE_FADE, MotionButton, SPRING_MICRO, SPRING_SETTLE, rm } from "@/components/motion";
import { cx } from "@/lib/cx";
import type { Fact } from "@/lib/types";
import { FACT_CATEGORIES, FACT_CATEGORY_LABELS, normalizeFactCategory } from "@/lib/types";
import { IconPin, IconTrash } from "./icons";

/** New facts drop in from above (DESIGN.md §5 FactsPanel); delete leaves right. */
export const FACT_ITEM_VARIANTS: Variants = {
  initial: { opacity: 0, y: -6, scale: 0.97 },
  enter: { opacity: 1, y: 0, scale: 1, transition: SPRING_SETTLE },
  exit: { opacity: 0, x: 12, transition: { duration: 0.14, ease: EASE_FADE } },
};

/** Pin icon settles into place when toggled — the fact files itself. */
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
 * A single fact row — pin toggle, content, delete. Lives inside a
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
  return (
    <motion.li
      layout={!reduced}
      variants={rm(reduced, FACT_ITEM_VARIANTS)}
      exit="exit"
      transition={{ layout: SPRING_SETTLE }}
      className={cx(
        "group relative flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-fill",
        fact.pinned === 1 && "bg-accent-faint ring-1 ring-accent/20",
      )}
    >
      {isNew && !reduced && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-md bg-accent-faint"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: EASE_FADE }}
        />
      )}
      <MotionButton
        onClick={() => onTogglePin(fact.id, !fact.pinned)}
        aria-label={fact.pinned ? "Unpin fact" : "Pin fact"}
        title={fact.pinned ? "Unpin" : "Pin to keep on top"}
        className={cx(
          "hit -ml-1 shrink-0 rounded-md p-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          fact.pinned ? "text-accent" : "text-ink-faint hover:text-ink",
        )}
      >
        <motion.span
          key={fact.pinned ? "pinned" : "unpinned"}
          className="block"
          variants={rm(reduced, PIN_POP_VARIANTS)}
          initial="initial"
          animate="enter"
        >
          <IconPin size={14} />
        </motion.span>
      </MotionButton>
      <span className="flex-1 text-sm leading-snug text-ink">{fact.content}</span>
      <MotionButton
        onClick={() => onDeleteFact(fact.id)}
        aria-label="Delete fact"
        className="hit -mr-1 shrink-0 rounded-md p-1 text-ink-faint opacity-0 max-md:opacity-100 transition duration-150 hover:bg-danger-soft hover:text-danger group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        <IconTrash size={14} />
      </MotionButton>
    </motion.li>
  );
}
