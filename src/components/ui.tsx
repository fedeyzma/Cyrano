"use client";

/**
 * Cyrano primitive kit — DESIGN.md §5 («Éditions Minuit» component recipes).
 * The six surface builders consume these primitives (and the exported class
 * recipes) so hierarchy, radii, focus rings and press behavior stay identical
 * across the app. Color grammar: champagne = Cyrano's voice, oxblood seal =
 * the user's commitments (danger = destruction), neutral ink = the match.
 */

import * as React from "react";
import { cx } from "@/lib/cx";

/* ── Shared class recipes ───────────────────────────────── */

/** Canonical focus treatment: champagne ring offset against the canvas. */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

/** Input / textarea recipe (§5): surface fill, strong hairline, gilt focus. */
export const inputClass =
  "w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-muted outline-none transition-colors duration-150 focus:border-line-gilt focus:ring-[3px] focus:ring-accent/12";

/** Flat inline card recipe (§4): hairline + fill + top-light, NO drop shadow. */
export const cardClass =
  "rounded-md border border-line bg-surface shadow-[var(--shadow-plate)] [background-image:linear-gradient(rgb(242_236_222_/_0.02),transparent)]";

/** Floating layer recipe (§4): opaque high surface for menus/popovers/toolbars. */
export const floatingClass =
  "rounded-md border border-line-strong bg-surface-high shadow-[var(--shadow-md),var(--shadow-plate)]";

/* ── Button ─────────────────────────────────────────────── */

type ButtonVariant = "primary" | "ghost" | "danger" | "danger-solid" | "subtle";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  /* Letterpress primary — Kiss Impression on press via .letterpress. */
  primary:
    "letterpress bg-accent-strong text-on-accent hover:bg-accent active:bg-[color-mix(in_oklch,var(--color-accent-strong)_82%,var(--color-accent-deep))]",
  /* Ghost — hairline frame that warms to gilt on hover. */
  ghost:
    "border border-line-strong bg-transparent text-ink-secondary transition-colors duration-150 hover:border-line-gilt hover:bg-fill hover:text-accent active:bg-fill-active",
  /* Destructive ghost — same skeleton, wax-red on hover. */
  danger:
    "border border-line-strong bg-transparent text-ink-secondary transition-colors duration-150 hover:border-danger/40 hover:bg-danger-soft hover:text-danger active:bg-danger-soft",
  /* Solid danger — modal confirm buttons ONLY. */
  "danger-solid": "letterpress bg-danger text-[#2A0F08] hover:brightness-105",
  /* Subtle — borderless, for tertiary row actions. */
  subtle:
    "bg-transparent text-ink-secondary transition-colors duration-150 hover:bg-fill hover:text-ink active:bg-fill-active",
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "min-h-7 gap-1.5 px-2.5 py-1 text-label",
  md: "min-h-8 gap-1.5 px-3.5 py-1.5 text-label",
};

/** Returns the full class string for a button recipe — for call sites that
 *  need a styled <label>/<a> or a motion.button instead of <Button>. */
export function buttonClass(variant: ButtonVariant = "ghost", size: ButtonSize = "md", className?: string): string {
  return cx(
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-sm font-medium disabled:pointer-events-none disabled:opacity-50",
    BUTTON_VARIANT[variant],
    BUTTON_SIZE[size],
    focusRing,
    className,
  );
}

/** Button — the standard control. Variants: primary (letterpress champagne),
 *  ghost, danger (destructive ghost), danger-solid (modal confirms), subtle. */
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }
>(function Button({ variant = "ghost", size = "md", className, type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />;
});

/* ── IconButton ─────────────────────────────────────────── */

/** IconButton — 28×28 icon control with built-in desktop tooltip (data-tip),
 *  aria-label, coarse-pointer hit slop and the canonical focus ring.
 *  `tone="danger"` for destructive icons. */
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
        "hit inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm transition-colors duration-150",
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

/** Chip — letterpress tag: folio caps in a hairline frame, no fill; active
 *  chips take the champagne wash. Renders a button (tab/filter duty). */
export const Chip = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(function Chip({ active = false, className, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        "inline-flex select-none items-center gap-1 rounded-xs border px-2 py-0.5 text-folio uppercase transition-colors duration-150",
        active
          ? "border-line-gilt bg-accent-soft text-accent"
          : "border-line-strong text-ink-muted hover:bg-fill hover:text-ink-secondary",
        focusRing,
        className,
      )}
      {...props}
    />
  );
});

/** Tag — the non-interactive letterpress tag (platform labels, categories). */
export function Tag({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xs border border-line-strong px-1.5 py-px text-folio uppercase text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}

/* ── Card ───────────────────────────────────────────────── */

/** Card — flat inline surface: hairline + fill + inset top-light, no drop
 *  shadow. Padded p-4 per the 4px grid. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(cardClass, "p-4", className)} {...props} />;
}

/* ── Field / Input / Textarea ───────────────────────────── */

/** Field — folio kicker label above a control; pass `hint` for a Fraunces
 *  marginalia helper line beneath. */
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
      <span className="mb-1.5 block text-folio uppercase text-ink-muted">{label}</span>
      {children}
      {hint ? (
        <span className="font-display mt-1.5 block text-marginalia italic text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}

/** Input — the framed single-line field (recipe §5). */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cx(inputClass, className)} {...props} />;
  },
);

/** Textarea — the framed multi-line field; min-h 44px, resize disabled
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

/** SectionLabel — the kicker: 20×2px gilt bar over folio caps in muted ink. */
export function SectionLabel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("kicker text-folio uppercase text-ink-muted", className)} {...props}>
      {children}
    </div>
  );
}

/* ── EmptyState ─────────────────────────────────────────── */

/** EmptyState — typography IS the illustration: Fraunces display heading,
 *  one drop-cap paragraph, a single ghost CTA (pass via `action`). */
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
      <h2 className="font-display text-display text-ink">{title}</h2>
      {children ? (
        <p className="drop-cap mt-5 text-left text-body text-ink-secondary">{children}</p>
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

/** SealDisc — the oxblood wax disc with a Fraunces initial in seal-bright
 *  (queue seals, monograms, dossier avatars). Size in px. */
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
      className={cx("seal-emboss font-display inline-flex shrink-0 select-none items-center justify-center rounded-full", className)}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.56)) }}
    >
      {initial.slice(0, 1).toUpperCase()}
    </span>
  );
}
