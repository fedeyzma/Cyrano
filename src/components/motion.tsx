"use client";

/**
 * Cyrano motion module — DESIGN.md §4.
 * Single shared module: every component imports springs, eases, variant
 * factories and motion components ONLY from here (plus `motion/react` for
 * `motion.*` / `AnimatePresence` primitives).
 *
 * Rules: transform + opacity only (one exception: ≤120ms blur on exiting
 * skeletons, dropped under reduced motion). Variant factories read no global
 * state — components call `useAppReducedMotion()` themselves and wrap their
 * variants with `rm()`. Reserved app-wide layoutId strings: "view-tab"
 * (sidebar tab pill) and "conv-ink" (conversation indicator); both elements
 * are aria-hidden.
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

/* ── Springs & eases (canonical, do not redefine locally) ── */
export const SPRING_MICRO: Transition  = { type: "spring", stiffness: 380, damping: 30 }; // hovers, chips, icons, small reveals
export const SPRING_SETTLE: Transition = { type: "spring", stiffness: 340, damping: 30 }; // list items, rows, bubbles
export const SPRING_MODAL: Transition  = { type: "spring", stiffness: 300, damping: 26 }; // modals, drawers, panels, view blocks
export const SPRING_TOAST: Transition  = { type: "spring", stiffness: 420, damping: 28 }; // toast only
export const EASE_FADE = [0.16, 1, 0.3, 1] as const;                                      // pure fades / exits
export const DUR = { fast: 0.15, base: 0.2, slow: 0.24, exitFast: 0.13, exitBase: 0.16 } as const;

/* ── Reduced motion ─────────────────────────────────────── */

/** Wraps useReducedMotion(); always returns boolean (false during SSR/hydration). */
export function useAppReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}

/** Zeroes a single variant target to an opacity-only, 120ms fade. */
function stripToOpacity(target: TargetAndTransition): TargetAndTransition {
  const out: TargetAndTransition = { transition: { duration: 0.12, ease: EASE_FADE } };
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

/** Returns variants with all transform deltas zeroed (opacity-only, 120ms) when reduced=true.
 *  Every component passes its variants through this before use. */
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

/** Fade-up entrance. enter: {opacity:0→1, y:distance→0}, EASE_FADE, DUR.slow;
 *  exit: {opacity:0, y:-distance/2}, DUR.exitBase. Keys: "initial" | "enter" | "exit". */
export function fadeUp(distance: number = 8): Variants {
  return {
    initial: { opacity: 0, y: distance },
    enter: { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE_FADE } },
    exit: { opacity: 0, y: -distance / 2, transition: { duration: DUR.exitBase, ease: EASE_FADE } },
  };
}

/** View switch (Replies/Prompts/Scan + conversation switch).
 *  enter y:8→0 240ms EASE_FADE; exit y:-4 160ms. Keys: "initial" | "enter" | "exit". */
export const viewVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE_FADE } },
  exit: { opacity: 0, y: -4, transition: { duration: DUR.exitBase, ease: EASE_FADE } },
};

/** Stagger list container. Keys: "initial" | "enter". Default stagger 35ms. */
export function listContainer(staggerMs: number = 35): Variants {
  return {
    initial: {},
    enter: { transition: { staggerChildren: staggerMs / 1000 } },
  };
}

/** Stagger list item = {opacity:0→1, y:6→0} SPRING_SETTLE; exit {opacity:0, scale:0.97} 140ms.
 *  Items with index >= capAt render visible immediately (pass custom={i}).
 *  Keys: "initial" | "enter" | "exit". Default capAt = 12. */
export function listItem(capAt: number = 12): Variants {
  return {
    initial: (custom: unknown) => {
      const i = typeof custom === "number" ? custom : 0;
      return i >= capAt ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 };
    },
    enter: { opacity: 1, y: 0, transition: SPRING_SETTLE },
    exit: { opacity: 0, scale: 0.97, transition: { duration: 0.14, ease: EASE_FADE } },
  };
}

/** Message bubble entrance, direction-aware. from="me" slides x:12→0, from="them" x:-12→0,
 *  both scale 0.96→1, SPRING_SETTLE. Keys: "initial" | "enter" | "exit"
 *  (exit: opacity 0, scale 0.95, 140ms). */
export function bubbleVariants(from: "me" | "them"): Variants {
  const x = from === "me" ? 12 : -12;
  return {
    initial: { opacity: 0, x, scale: 0.96 },
    enter: { opacity: 1, x: 0, scale: 1, transition: SPRING_SETTLE },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.14, ease: EASE_FADE } },
  };
}

/** Suggestion card deal-out. i*90ms delay, {opacity, y:14→0, scale:0.96→1} SPRING_MODAL.
 *  Pass custom={i}. Keys: "initial" | "enter" | "exit". */
export const suggestionCardVariants: Variants = {
  initial: { opacity: 0, y: 14, scale: 0.96 },
  enter: (custom: unknown) => {
    const i = typeof custom === "number" ? custom : 0;
    return { opacity: 1, y: 0, scale: 1, transition: { ...SPRING_MODAL, delay: i * 0.09 } };
  },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.14, ease: EASE_FADE } },
};

/* ── Modal + drawer + toast (used with AnimatePresence) ── */

/** Scrim: opacity 0→1 200ms EASE_FADE; exit 150ms. */
export const scrimVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: DUR.base, ease: EASE_FADE } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: EASE_FADE } },
};

/** Modal: enter {opacity, scale:0.96→1, y:8→0} SPRING_MODAL; exit {opacity:0, scale:0.97} 140ms. */
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  enter: { opacity: 1, scale: 1, y: 0, transition: SPRING_MODAL },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.14, ease: EASE_FADE } },
};

/** Drawer: enter x:∓100%→0 SPRING_MODAL; exit tween 180ms EASE_FADE. */
export function drawerVariants(side: "left" | "right"): Variants {
  const offscreen = side === "left" ? "-100%" : "100%";
  return {
    initial: { x: offscreen },
    enter: { x: 0, transition: SPRING_MODAL },
    exit: { x: offscreen, transition: { duration: 0.18, ease: EASE_FADE } },
  };
}

/** Bottom sheet (mobile message actions): y 100%→0 SPRING_MODAL; exit tween 180ms. */
export const sheetVariants: Variants = {
  initial: { y: "100%" },
  enter: { y: 0, transition: SPRING_MODAL },
  exit: { y: "100%", transition: { duration: 0.18, ease: EASE_FADE } },
};

/** Toast: enter {y:24→0, opacity, scale:0.95→1} SPRING_TOAST; exit {y:12, opacity:0} 160ms. */
export const toastVariants: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.95 },
  enter: { opacity: 1, y: 0, scale: 1, transition: SPRING_TOAST },
  exit: { opacity: 0, y: 12, transition: { duration: DUR.exitBase, ease: EASE_FADE } },
};

/** Collapsible (targeting bar, queue expand). height 0↔auto + opacity,
 *  SPRING_MODAL enter, 150ms exit. Keys: "initial" | "enter" | "exit". */
export const collapseVariants: Variants = {
  initial: { height: 0, opacity: 0 },
  enter: { height: "auto", opacity: 1, transition: SPRING_MODAL },
  exit: { height: 0, opacity: 0, transition: { duration: 0.15, ease: EASE_FADE } },
};

/* ── Components ─────────────────────────────────────────── */

/** motion.button with whileTap={{scale:0.97}} (noop under reduced motion). Drop-in for <button>. */
export const MotionButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof motion.button>
>(function MotionButton(props, ref) {
  const reduced = useAppReducedMotion();
  return (
    <motion.button
      ref={ref}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={SPRING_MICRO}
      {...props}
    />
  );
});

/** Standard AnimatePresence view wrapper: <ViewFade viewKey={string}>{children}</ViewFade>
 *  Renders AnimatePresence mode="wait" + motion.div with viewVariants keyed by viewKey.
 *  Honors reduced motion (opacity-only fades). */
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
