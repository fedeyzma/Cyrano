"use client";

/**
 * Cyrano motion module — DESIGN.md v2 §6 («Liquid Aurora» vocabulary).
 * Single shared module: every component imports springs, eases, variant
 * factories and motion components ONLY from here (plus `motion/react` for
 * `motion.*` / `AnimatePresence` primitives).
 *
 * The register: fluid, weighted, slightly bouncy — a sheet of glass
 * settling, never a snap. Rules: transform + opacity only (one exception:
 * ≤140ms blur on Melt exits, dropped under reduced motion). Variant
 * factories read no global state — components call `useAppReducedMotion()`
 * themselves and wrap their variants with `rm()`. Reserved app-wide
 * layoutId strings: "view-tab" (segmented-control thumb) and "conv-ink"
 * (sidebar Ribbon Mark); both elements are aria-hidden.
 */

import * as React from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Transition,
  type Variants,
  type TargetAndTransition,
} from "motion/react";

/* ── Eases & springs (canonical, do not redefine locally) ── */

/** Canonical ease for fades/slides — the iOS sheet ease. */
export const EASE_INK = [0.32, 0.72, 0, 1] as const;
/** LEGACY alias of EASE_INK. */
export const EASE_FADE = EASE_INK;

/** Segmented thumb, Ribbon Mark, toggles — glides, no overshoot. */
export const SPRING_MICRO: Transition = { type: "spring", stiffness: 640, damping: 42 };
/** Bubbles, cards, list items — Float In with one soft bounce. */
export const SPRING_SETTLE: Transition = { type: "spring", stiffness: 320, damping: 26, mass: 0.8 };
/** Modals, drawers, sheets — a visible spring settle. */
export const SPRING_SHEET: Transition = { type: "spring", stiffness: 280, damping: 26, mass: 0.9 };
/** The queue gem ONLY — the one sanctioned big overshoot in the app. */
export const SPRING_STAMP: Transition = { type: "spring", stiffness: 500, damping: 16, mass: 0.7 };
/** LEGACY alias of SPRING_SHEET. */
export const SPRING_MODAL = SPRING_SHEET;
/** LEGACY alias of SPRING_SHEET. */
export const SPRING_TOAST = SPRING_SHEET;

/** Durations in seconds. hair/leaf/page/plate are canonical; the last five
 *  are LEGACY keys kept for unconverted call sites. */
export const DUR = {
  hair: 0.12, leaf: 0.18, page: 0.26, plate: 0.34,
  fast: 0.12, base: 0.18, slow: 0.26, exitFast: 0.12, exitBase: 0.15,
} as const;

/* ── Reduced motion ─────────────────────────────────────── */

/** Wraps useReducedMotion(); always returns boolean (false during SSR/hydration). */
export function useAppReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}

/** Zeroes a single variant target to an opacity-only, 120ms fade. */
function stripToOpacity(target: TargetAndTransition): TargetAndTransition {
  const out: TargetAndTransition = { transition: { duration: 0.12, ease: EASE_INK } };
  if (target && typeof target === "object" && "opacity" in target) {
    out.opacity = target.opacity;
  }
  return out;
}

type DynamicVariant = (
  custom: unknown,
  current: unknown,
  velocity: unknown,
) => TargetAndTransition | string;

/** Returns variants with all transform/filter deltas zeroed (opacity-only,
 *  ≤120ms) when reduced=true. Every component passes its variants through
 *  this before use. */
export function rm(reduced: boolean, variants: Variants): Variants {
  if (!reduced) return variants;
  const out: Variants = {};
  for (const key of Object.keys(variants)) {
    const value = variants[key];
    if (typeof value === "function") {
      const fn = value as unknown as DynamicVariant;
      out[key] = ((custom: unknown, current: unknown, velocity: unknown) => {
        const resolved = fn(custom, current, velocity);
        return typeof resolved === "string" ? resolved : stripToOpacity(resolved);
      }) as unknown as Variants[string];
    } else {
      out[key] = stripToOpacity(value as TargetAndTransition);
    }
  }
  return out;
}

/* ── Variant factories ──────────────────────────────────── */

/** Fade-up entrance: {opacity 0→1, y distance→0} on SPRING_SETTLE;
 *  exit {opacity 0, y −distance/2} 150ms EASE_INK.
 *  Keys: "initial" | "enter" | "exit". */
export function fadeUp(distance: number = 10): Variants {
  return {
    initial: { opacity: 0, y: distance },
    enter: { opacity: 1, y: 0, transition: SPRING_SETTLE },
    exit: { opacity: 0, y: -distance / 2, transition: { duration: DUR.exitBase, ease: EASE_INK } },
  };
}

/** Crossfade-and-breathe — view switches (Replies/Prompts/Scan). Incoming
 *  {opacity 0, scale 0.985}→{1, 1} 260ms EASE_INK; outgoing {opacity 0,
 *  scale 0.99} 150ms. No x-slide. Use with AnimatePresence mode="wait".
 *  Keys: "initial" | "enter" | "exit". */
export const viewVariants: Variants = {
  initial: { opacity: 0, scale: 0.985 },
  enter: { opacity: 1, scale: 1, transition: { duration: DUR.page, ease: EASE_INK } },
  exit: { opacity: 0, scale: 0.99, transition: { duration: DUR.exitBase, ease: EASE_INK } },
};

/** Stagger list container. Keys: "initial" | "enter". Default stagger 35ms. */
export function listContainer(staggerMs: number = 35): Variants {
  return {
    initial: {},
    enter: { transition: { staggerChildren: staggerMs / 1000 } },
  };
}

/** Stagger list item: {opacity 0→1, y 8→0, scale 0.98→1} SPRING_SETTLE;
 *  exit fade 120ms. Items with index >= capAt render visible immediately
 *  (pass custom={i}) — for bubbles, cap so only the LAST 8 messages cascade
 *  on mount. Keys: "initial" | "enter" | "exit". Default capAt = 12. */
export function listItem(capAt: number = 12): Variants {
  return {
    initial: (custom: unknown) => {
      const i = typeof custom === "number" ? custom : 0;
      return i >= capAt ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.98 };
    },
    enter: { opacity: 1, y: 0, scale: 1, transition: SPRING_SETTLE },
    exit: { opacity: 0, transition: { duration: DUR.hair, ease: EASE_INK } },
  };
}

/** Float In — message bubble entrance: {opacity 0→1, y 10→0, scale 0.97→1}
 *  SPRING_SETTLE. The `from` side is accepted for signature compatibility
 *  and ignored. Keys: "initial" | "enter" | "exit". */
export function bubbleVariants(from: "me" | "them"): Variants {
  void from; // side no longer affects the entrance (DESIGN.md §6.4)
  return {
    initial: { opacity: 0, y: 10, scale: 0.97 },
    enter: { opacity: 1, y: 0, scale: 1, transition: SPRING_SETTLE },
    exit: { opacity: 0, transition: { duration: DUR.hair, ease: EASE_INK } },
  };
}

/** The Float — suggestion cards rise one at a time, 60ms stagger, each
 *  {opacity, y 18→0, scale 0.96→1} SPRING_SETTLE. Exit is a Melt
 *  (opacity + 4px blur, 140ms). Pass custom={i}.
 *  Keys: "initial" | "enter" | "exit". */
export const suggestionCardVariants: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.96 },
  enter: (custom: unknown) => {
    const i = typeof custom === "number" ? custom : 0;
    return { opacity: 1, y: 0, scale: 1, transition: { ...SPRING_SETTLE, delay: i * 0.06 } };
  },
  exit: { opacity: 0, filter: "blur(4px)", transition: { duration: 0.14, ease: EASE_INK } },
};

/** Melt — dismissals / cards being regenerated: opacity→0 with a 4px blur,
 *  140ms. Keys: "initial" | "enter" | "exit". */
export const meltVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: DUR.leaf, ease: EASE_INK } },
  exit: { opacity: 0, filter: "blur(4px)", transition: { duration: 0.14, ease: EASE_INK } },
};

/** Gem Pop — the raspberry gem disc on queue items: scale 0.4→1 on
 *  SPRING_STAMP (the one big overshoot), arriving 80ms after its row.
 *  Keys: "initial" | "enter" | "exit". */
export const sealVariants: Variants = {
  initial: { scale: 0.4, opacity: 0 },
  enter: { scale: 1, opacity: 1, transition: { ...SPRING_STAMP, delay: 0.08 } },
  exit: { opacity: 0, transition: { duration: DUR.hair, ease: EASE_INK } },
};

/** Capsule Reveal — hover toolbar + timestamp: {opacity 0→1, y 6→0,
 *  scale 0.96→1} 140ms in, fade 100ms out. Nothing reflows.
 *  Keys: "initial" | "enter" | "exit". */
export const railVariants: Variants = {
  initial: { opacity: 0, y: 6, scale: 0.96 },
  enter: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.14, ease: EASE_INK } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: EASE_INK } },
};

/* ── Modal + drawer + toast (used with AnimatePresence) ── */

/** Scrim: opacity 0→1 180ms EASE_INK; exit 150ms. */
export const scrimVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: DUR.leaf, ease: EASE_INK } },
  exit: { opacity: 0, transition: { duration: DUR.exitBase, ease: EASE_INK } },
};

/** Modal: enter {opacity, y 24→0, scale 0.94→1} SPRING_SHEET;
 *  exit {opacity 0, y 8, scale 0.97} 160ms. */
export const modalVariants: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.94 },
  enter: { opacity: 1, y: 0, scale: 1, transition: SPRING_SHEET },
  exit: { opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.16, ease: EASE_INK } },
};

/** Drawer: enter x ∓100%→0 SPRING_SHEET (soft settle); exit tween 200ms EASE_INK. */
export function drawerVariants(side: "left" | "right"): Variants {
  const offscreen = side === "left" ? "-100%" : "100%";
  return {
    initial: { x: offscreen },
    enter: { x: 0, transition: SPRING_SHEET },
    exit: { x: offscreen, transition: { duration: 0.2, ease: EASE_INK } },
  };
}

/** Bottom action sheet (coarse pointer): y 100%→0 SPRING_SHEET — the iOS
 *  sheet feel; exit tween 220ms. */
export const sheetVariants: Variants = {
  initial: { y: "100%" },
  enter: { y: 0, transition: SPRING_SHEET },
  exit: { y: "100%", transition: { duration: 0.22, ease: EASE_INK } },
};

/** Toast — banner drop: enter {y 16→0, opacity, scale 0.95→1} SPRING_SHEET;
 *  exit {y 8, scale 0.97, opacity 0} 150ms. */
export const toastVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.95 },
  enter: { opacity: 1, y: 0, scale: 1, transition: SPRING_SHEET },
  exit: { opacity: 0, y: 8, scale: 0.97, transition: { duration: DUR.exitBase, ease: EASE_INK } },
};

/** Collapsible (targeting strip, queue tray). height 0↔auto + opacity,
 *  SPRING_SHEET enter, 150ms exit. Keys: "initial" | "enter" | "exit". */
export const collapseVariants: Variants = {
  initial: { height: 0, opacity: 0 },
  enter: { height: "auto", opacity: 1, transition: SPRING_SHEET },
  exit: { height: 0, opacity: 0, transition: { duration: DUR.exitBase, ease: EASE_INK } },
};

/* ── Components ─────────────────────────────────────────── */

/** motion.button with the Squish press: scale 0.96 on SPRING_MICRO — never
 *  translate. Icon buttons may pass whileTap={{ scale: 0.92 }} to override.
 *  Pair with `.letterpress` for the pressed-glass inner shade on primaries.
 *  Noop under reduced motion. Drop-in for <button>. */
export const MotionButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof motion.button>
>(function MotionButton(props, ref) {
  const reduced = useAppReducedMotion();
  return (
    <motion.button
      ref={ref}
      whileTap={reduced ? undefined : { scale: 0.96 }}
      transition={SPRING_MICRO}
      {...props}
    />
  );
});

/** Standard AnimatePresence view wrapper: <ViewFade viewKey={string}>{children}</ViewFade>
 *  Renders AnimatePresence mode="wait" + motion.div with viewVariants
 *  (Crossfade-and-breathe) keyed by viewKey. Honors reduced motion
 *  (opacity-only). */
export function ViewFade({
  viewKey,
  className,
  children,
}: {
  viewKey: string;
  className?: string;
  children: React.ReactNode;
}) {
  const reduced = useAppReducedMotion();
  const variants = rm(reduced, viewVariants);
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        className={className}
        variants={variants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
