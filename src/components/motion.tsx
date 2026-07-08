"use client";

/**
 * Cyrano motion module — DESIGN.md §6 («Éditions Minuit» vocabulary).
 * Single shared module: every component imports springs, eases, variant
 * factories and motion components ONLY from here (plus `motion/react` for
 * `motion.*` / `AnimatePresence` primitives).
 *
 * The register: deliberate, weighted, brief — a press, not a bounce.
 * Everything ≤350ms. Rules: transform + opacity only (one exception: ≤120ms
 * blur on Melt exits, dropped under reduced motion). Variant factories read
 * no global state — components call `useAppReducedMotion()` themselves and
 * wrap their variants with `rm()`. Reserved app-wide layoutId strings:
 * "view-tab" (tab underline) and "conv-ink" (sidebar Ribbon Mark); both
 * elements are aria-hidden.
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

/** Canonical ease for fades/slides — the ink settling into paper. */
export const EASE_INK = [0.22, 1, 0.36, 1] as const;
/** LEGACY alias of EASE_INK. */
export const EASE_FADE = EASE_INK;

/** Tab ink, Ribbon Mark, toggles — quick and certain. */
export const SPRING_MICRO: Transition = { type: "spring", stiffness: 560, damping: 32 };
/** Bubbles, list items — Ink Rise. */
export const SPRING_SETTLE: Transition = { type: "spring", stiffness: 300, damping: 30 };
/** Modals, drawers, action sheet, panels. */
export const SPRING_SHEET: Transition = { type: "spring", stiffness: 340, damping: 34 };
/** The wax seal ONLY — the one sanctioned overshoot in the app. */
export const SPRING_STAMP: Transition = { type: "spring", stiffness: 480, damping: 20, mass: 0.9 };
/** LEGACY alias of SPRING_SHEET. */
export const SPRING_MODAL = SPRING_SHEET;
/** LEGACY alias of SPRING_SHEET. */
export const SPRING_TOAST = SPRING_SHEET;

/** Durations in seconds. hair/leaf/page/plate are canonical; the last five
 *  are LEGACY keys kept for unconverted call sites. */
export const DUR = {
  hair: 0.12, leaf: 0.18, page: 0.24, plate: 0.32,
  fast: 0.12, base: 0.18, slow: 0.24, exitFast: 0.12, exitBase: 0.15,
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

/** Fade-up entrance: {opacity 0→1, y distance→0} EASE_INK/DUR.page;
 *  exit {opacity 0, y −distance/2} DUR.exitBase. Keys: "initial" | "enter" | "exit". */
export function fadeUp(distance: number = 8): Variants {
  return {
    initial: { opacity: 0, y: distance },
    enter: { opacity: 1, y: 0, transition: { duration: DUR.page, ease: EASE_INK } },
    exit: { opacity: 0, y: -distance / 2, transition: { duration: DUR.exitBase, ease: EASE_INK } },
  };
}

/** Folio Turn — view switches (Replies/Prompts/Scan). Incoming x 8→0 240ms
 *  EASE_INK; outgoing x→−8 180ms. Use with AnimatePresence mode="wait".
 *  Keys: "initial" | "enter" | "exit". */
export const viewVariants: Variants = {
  initial: { opacity: 0, x: 8 },
  enter: { opacity: 1, x: 0, transition: { duration: DUR.page, ease: EASE_INK } },
  exit: { opacity: 0, x: -8, transition: { duration: DUR.leaf, ease: EASE_INK } },
};

/** Stagger list container. Keys: "initial" | "enter". Default stagger 35ms. */
export function listContainer(staggerMs: number = 35): Variants {
  return {
    initial: {},
    enter: { transition: { staggerChildren: staggerMs / 1000 } },
  };
}

/** Stagger list item: {opacity 0→1, y 6→0} SPRING_SETTLE; exit fade 120ms.
 *  Items with index >= capAt render visible immediately (pass custom={i}) —
 *  for bubbles, cap so only the LAST 8 messages cascade on mount.
 *  Keys: "initial" | "enter" | "exit". Default capAt = 12. */
export function listItem(capAt: number = 12): Variants {
  return {
    initial: (custom: unknown) => {
      const i = typeof custom === "number" ? custom : 0;
      return i >= capAt ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 };
    },
    enter: { opacity: 1, y: 0, transition: SPRING_SETTLE },
    exit: { opacity: 0, transition: { duration: DUR.hair, ease: EASE_INK } },
  };
}

/** Ink Rise — message bubble entrance: {opacity 0→1, y 8→0} SPRING_SETTLE.
 *  Bubbles no longer slide on x or scale; the `from` side is accepted for
 *  signature compatibility. Keys: "initial" | "enter" | "exit". */
export function bubbleVariants(from: "me" | "them"): Variants {
  void from; // side no longer affects the entrance (DESIGN.md §6.4)
  return {
    initial: { opacity: 0, y: 8 },
    enter: { opacity: 1, y: 0, transition: SPRING_SETTLE },
    exit: { opacity: 0, transition: { duration: DUR.hair, ease: EASE_INK } },
  };
}

/** The Deal — suggestion cards enter one at a time, 70ms stagger, each
 *  {opacity, y 10→0, rotate −0.6°→0} SPRING_SETTLE (hand-dealt). Exit is a
 *  Melt (opacity + 2px blur, 120ms). Pass custom={i}.
 *  Keys: "initial" | "enter" | "exit". */
export const suggestionCardVariants: Variants = {
  initial: { opacity: 0, y: 10, rotate: -0.6 },
  enter: (custom: unknown) => {
    const i = typeof custom === "number" ? custom : 0;
    return { opacity: 1, y: 0, rotate: 0, transition: { ...SPRING_SETTLE, delay: i * 0.07 } };
  },
  exit: { opacity: 0, filter: "blur(2px)", transition: { duration: DUR.hair, ease: EASE_INK } },
};

/** Melt — dismissals / cards being regenerated: opacity→0 with a 2px blur,
 *  120ms. Keys: "initial" | "enter" | "exit". */
export const meltVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: DUR.leaf, ease: EASE_INK } },
  exit: { opacity: 0, filter: "blur(2px)", transition: { duration: DUR.hair, ease: EASE_INK } },
};

/** Wax Seal stamp — the oxblood disc on queue items: scale 0→1 on
 *  SPRING_STAMP (natural overshoot), arriving 80ms after its row.
 *  Keys: "initial" | "enter" | "exit". */
export const sealVariants: Variants = {
  initial: { scale: 0, opacity: 0 },
  enter: { scale: 1, opacity: 1, transition: { ...SPRING_STAMP, delay: 0.08 } },
  exit: { opacity: 0, transition: { duration: DUR.hair, ease: EASE_INK } },
};

/** Compositor's Rail / Marginalia reveal — hover toolbar + timestamp:
 *  {opacity 0→1, y 4→0} 120ms in, fade 100ms out. Nothing reflows.
 *  Keys: "initial" | "enter" | "exit". */
export const railVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  enter: { opacity: 1, y: 0, transition: { duration: DUR.hair, ease: EASE_INK } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: EASE_INK } },
};

/* ── Modal + drawer + toast (used with AnimatePresence) ── */

/** Scrim: opacity 0→1 180ms EASE_INK; exit 150ms. */
export const scrimVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: DUR.leaf, ease: EASE_INK } },
  exit: { opacity: 0, transition: { duration: DUR.exitBase, ease: EASE_INK } },
};

/** The Plate — modal: enter {opacity, y 16→0, scale 0.98→1} SPRING_SHEET;
 *  exit {opacity 0, scale 0.985} 140ms. */
export const modalVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  enter: { opacity: 1, y: 0, scale: 1, transition: SPRING_SHEET },
  exit: { opacity: 0, scale: 0.985, transition: { duration: 0.14, ease: EASE_INK } },
};

/** Drawer: enter x ∓100%→0 SPRING_SHEET; exit tween 180ms EASE_INK. */
export function drawerVariants(side: "left" | "right"): Variants {
  const offscreen = side === "left" ? "-100%" : "100%";
  return {
    initial: { x: offscreen },
    enter: { x: 0, transition: SPRING_SHEET },
    exit: { x: offscreen, transition: { duration: DUR.leaf, ease: EASE_INK } },
  };
}

/** Bottom action sheet (coarse pointer): y 100%→0 SPRING_SHEET; exit tween 180ms. */
export const sheetVariants: Variants = {
  initial: { y: "100%" },
  enter: { y: 0, transition: SPRING_SHEET },
  exit: { y: "100%", transition: { duration: DUR.leaf, ease: EASE_INK } },
};

/** Toast: enter {y 16→0, opacity, scale 0.97→1} SPRING_SHEET; exit {y 8, opacity 0} 150ms. */
export const toastVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  enter: { opacity: 1, y: 0, scale: 1, transition: SPRING_SHEET },
  exit: { opacity: 0, y: 8, transition: { duration: DUR.exitBase, ease: EASE_INK } },
};

/** Collapsible (targeting strip, queue tray). height 0↔auto + opacity,
 *  SPRING_SHEET enter, 150ms exit. Keys: "initial" | "enter" | "exit". */
export const collapseVariants: Variants = {
  initial: { height: 0, opacity: 0 },
  enter: { height: "auto", opacity: 1, transition: SPRING_SHEET },
  exit: { height: 0, opacity: 0, transition: { duration: DUR.exitBase, ease: EASE_INK } },
};

/* ── Components ─────────────────────────────────────────── */

/** motion.button with the Kiss Impression press: translateY(0.5px), 120ms
 *  EASE_INK — never scale. Pair with the `.letterpress` class for the
 *  shadow-press inversion on primaries. Noop under reduced motion.
 *  Drop-in for <button>. */
export const MotionButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof motion.button>
>(function MotionButton(props, ref) {
  const reduced = useAppReducedMotion();
  return (
    <motion.button
      ref={ref}
      whileTap={reduced ? undefined : { y: 0.5 }}
      transition={{ duration: DUR.hair, ease: EASE_INK }}
      {...props}
    />
  );
});

/** Standard AnimatePresence view wrapper: <ViewFade viewKey={string}>{children}</ViewFade>
 *  Renders AnimatePresence mode="wait" + motion.div with viewVariants
 *  (Folio Turn) keyed by viewKey. Honors reduced motion (opacity-only). */
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
