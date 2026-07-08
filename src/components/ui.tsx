"use client";

/**
 * Cyrano primitive kit — DESIGN.md v2 §5 («Liquid Aurora» component recipes).
 * The surface builders consume these primitives (and the exported class
 * recipes) so hierarchy, radii, focus rings and press behavior stay identical
 * across the app. Color grammar: gold = the user's hand, garnet = Cyrano at
 * work & commitments (danger = destruction), laurel = her side & memory,
 * neutral glass = the match's own words.
 */

import * as React from "react";
import { cx } from "@/lib/cx";

/* ── Shared class recipes ───────────────────────────────── */

/** Canonical focus treatment: vibrant gold ring offset against the canvas. */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

/** Input / textarea recipe (§5): frosted simulated-glass fill, strong
 *  hairline, gold focus ring. No backdrop-filter (blur budget §9). */
export const inputClass =
  "w-full rounded-sm border border-line-strong bg-[rgb(255_255_255_/_0.05)] px-3.5 py-2.5 text-body text-ink placeholder:text-ink-muted outline-none transition-colors duration-150 focus:border-line-gilt focus:ring-[3px] focus:ring-accent/15";

/** Simulated-glass inline card recipe (§4): translucent fill + top-light +
 *  hairline; NO drop shadow, NO backdrop-filter. */
export const cardClass =
  "rounded-md border border-line bg-[rgb(255_255_255_/_0.05)] shadow-[var(--shadow-plate)] [background-image:linear-gradient(180deg,rgb(255_255_255_/_0.04),transparent_45%)]";

/** Floating layer recipe (§4 regular tier): frosted glass for menus,
 *  popovers, capsule toolbars. Counts against the §9 blur budget. */
export const floatingClass =
  "rounded-md border border-line bg-glass backdrop-blur-[24px] backdrop-saturate-150 shadow-[var(--shadow-md),var(--shadow-plate)]";

/* ── Button ─────────────────────────────────────────────── */

type ButtonVariant = "primary" | "ghost" | "danger" | "danger-solid" | "subtle";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  /* The gem — gold gradient pill with a top-light; presses dim inward. */
  primary:
    "letterpress bg-[linear-gradient(180deg,var(--color-accent),var(--color-accent-strong))] font-semibold text-on-accent shadow-[var(--shadow-plate)] hover:bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-accent)_90%,white),color-mix(in_srgb,var(--color-accent-strong)_90%,white))] active:bg-[linear-gradient(180deg,var(--color-accent-strong),var(--color-accent-strong))]",
  /* Ghost — hairline pill, transparent at rest, warms to gold on hover. */
  ghost:
    "border border-line-strong bg-transparent text-ink-secondary transition-colors duration-150 hover:border-line-gilt hover:bg-fill hover:text-accent active:bg-fill-active",
  /* Destructive ghost — same skeleton, danger on hover. */
  danger:
    "border border-line-strong bg-transparent text-ink-secondary transition-colors duration-150 hover:border-danger/40 hover:bg-danger-soft hover:text-danger active:bg-danger-soft",
  /* Solid danger — modal confirm buttons ONLY. */
  "danger-solid":
    "letterpress bg-[linear-gradient(180deg,#FF8A80,var(--color-danger))] font-semibold text-[#2A0B08] shadow-[var(--shadow-plate)] hover:brightness-105",
  /* Subtle — borderless, for tertiary row actions. */
  subtle:
    "bg-transparent text-ink-secondary transition-colors duration-150 hover:bg-fill hover:text-ink active:bg-fill-active",
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "min-h-7 gap-1.5 px-3 py-1 text-label",
  md: "min-h-8 gap-1.5 px-4 py-1.5 text-label",
};

/** Returns the full class string for a button recipe — for call sites that
 *  need a styled <label>/<a> or a motion.button instead of <Button>. */
export function buttonClass(variant: ButtonVariant = "ghost", size: ButtonSize = "md", className?: string): string {
  return cx(
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-medium disabled:pointer-events-none disabled:opacity-50",
    BUTTON_VARIANT[variant],
    BUTTON_SIZE[size],
    focusRing,
    className,
  );
}

/** Button — the standard control, a pill. Variants: primary (gold gradient
 *  gem), ghost, danger (destructive ghost), danger-solid (modal confirms),
 *  subtle. */
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }
>(function Button({ variant = "ghost", size = "md", className, type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />;
});

/* ── IconButton ─────────────────────────────────────────── */

/** IconButton — 28×28 round icon control with built-in desktop tooltip
 *  (data-tip), aria-label, coarse-pointer hit slop and the canonical focus
 *  ring. `tone="danger"` for destructive icons. */
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "default" | "danger" }
>(function IconButton({ label, tone = "default", className, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      data-tip={label}
      className={cx(
        "hit inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-150",
        tone === "danger"
          ? "text-ink-secondary hover:bg-danger-soft hover:text-danger"
          : "text-ink-secondary hover:bg-fill hover:text-ink",
        focusRing,
        className,
      )}
      {...props}
    />
  );
});

/* ── Chip ───────────────────────────────────────────────── */

/** Chip — frosted pill: sentence-case label on a soft fill; active chips
 *  take the gold wash + a gold hairline. Renders a button (tab/filter duty). */
export const Chip = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(function Chip({ active = false, className, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        "inline-flex select-none items-center gap-1 rounded-full border px-2.5 py-0.5 text-folio transition-colors duration-150",
        active
          ? "border-line-gilt bg-accent-soft text-accent"
          : "border-transparent bg-fill text-ink-secondary hover:bg-fill-hover hover:text-ink",
        focusRing,
        className,
      )}
      {...props}
    />
  );
});

/** Tag — the non-interactive pill (platform labels, categories). */
export function Tag({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full bg-fill px-2 py-px text-folio text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}

/* ── Card ───────────────────────────────────────────────── */

/** Card — simulated-glass inline surface: hairline + translucent fill +
 *  inset top-light, no drop shadow, no blur. Padded p-4 per the 4px grid. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(cardClass, "p-4", className)} {...props} />;
}

/* ── Field / Input / Textarea ───────────────────────────── */

/** Field — glow-dot section label above a control; pass `hint` for a quiet
 *  helper line beneath. */
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-folio text-ink-muted">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-marginalia text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}

/** Input — the frosted single-line field (recipe §5). */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cx(inputClass, className)} {...props} />;
  },
);

/** Textarea — the frosted multi-line field; min-h 44px, resize disabled
 *  (callers autogrow via rows/JS as today). */
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cx(inputClass, "min-h-11 resize-none", className)} {...props} />;
  },
);

/* ── Kbd ────────────────────────────────────────────────── */

/** Kbd — static keycap hint (⌘, ↵). Purely visual; no key handling. */
export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <kbd className={cx("kbd", className)} {...props} />;
}

/* ── SectionLabel ───────────────────────────────────────── */

/** SectionLabel — glow dot over a sentence-case label in muted ink. */
export function SectionLabel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("kicker text-folio text-ink-muted", className)} {...props}>
      {children}
    </div>
  );
}

/* ── EmptyState ─────────────────────────────────────────── */

/** EmptyState — the aurora behind the glass is the illustration: display
 *  heading, one quiet paragraph, a single ghost CTA (pass via `action`). */
export function EmptyState({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cx("mx-auto max-w-md px-6 py-16 text-center", className)}>
      <h2 className="text-display text-ink">{title}</h2>
      {children ? (
        <p className="mt-4 text-body text-ink-secondary">{children}</p>
      ) : null}
      {action ? <div className="mt-7 flex justify-center">{action}</div> : null}
    </div>
  );
}

/* ── Spinner ────────────────────────────────────────────── */

/** Spinner — hairline ring in the current ink; size in px. */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx(
        "inline-block animate-spin rounded-full border-[1.5px] border-current border-t-transparent align-[-2px] opacity-80",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}

/* ── SealDisc ───────────────────────────────────────────── */

/** SealDisc — the raspberry gem disc with a white initial (queue gems,
 *  monograms, dossier avatars). Size in px. */
export function SealDisc({
  initial,
  size = 16,
  className,
}: {
  initial: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx("seal-emboss inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold", className)}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.5)) }}
    >
      {initial.slice(0, 1).toUpperCase()}
    </span>
  );
}
