# CYRANO — DESIGN SPEC (final)

**Direction: "Candlelit Noir, set in type."** The base mood is Concept A's candlelit noir — violet-black gradient canvas, drifting rose/violet glow, glass chrome, the rose accent as flame. Grafted onto it is Concept B's letterpress discipline: fewer glowing things, flat "me" bubbles, pressed buttons, editorial rose rules, a drop-cap welcome, and hard restraint on where Fraunces and blur may appear. Every decision below is final. This is a visual + motion rework only: zero behavior changes, no state/props/handler edits, `fred_context.md` untouched, nothing committed.

---

## 1. Tokens

Complete `@theme` ladder for `src/app/globals.css`. Every existing token name is preserved (values may differ); new tokens are marked `NEW`.

```css
@theme {
  /* ── Fonts ─────────────────────────────────────────────── */
  --font-sans:    var(--font-inter, ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif);
  --font-display: var(--font-fraunces, Georgia, "Times New Roman", serif);   /* NEW */

  /* ── Surfaces: opaque elevation ladder (must cover) ────── */
  --color-canvas:        #0b0a0e;   /* violet-black "night"; also viewport themeColor */
  --color-canvas-deep:   #050507;   /* NEW — bottom of the body gradient; never #000 */
  --color-surface:       #16131a;   /* modal, drawer, popover, composer interior */
  --color-surface-high:  #201c26;   /* toast, menu */

  /* ── Glass fills (used WITH backdrop-blur; chrome only) ── */
  --color-glass:         rgb(22 19 26 / 0.72);   /* NEW — headers, composer dock */
  --color-glass-heavy:   rgb(22 19 26 / 0.86);   /* NEW — modals, drawers */

  /* ── Fills: translucent, candle-warmed rose-white ──────── */
  --color-fill:          rgb(244 228 236 / 0.045);
  --color-fill-hover:    rgb(244 228 236 / 0.075);
  --color-fill-active:   rgb(244 228 236 / 0.11);

  /* ── Hairlines ─────────────────────────────────────────── */
  --color-line:          rgb(255 255 255 / 0.08);
  --color-line-strong:   rgb(255 255 255 / 0.14);
  --color-line-accent:   rgb(251 113 133 / 0.28);  /* NEW — rose rules + focused chrome */

  /* ── Ink (verified against darkest stop #050507) ───────── */
  --color-ink:            #f5f3f7;  /* ~17.5:1 */
  --color-ink-secondary:  #b6b1bd;  /* ~9:1 */
  --color-ink-muted:      #8d8896;  /* ~5.5:1 — labels, meta, placeholders */
  --color-ink-faint:      #645f6d;  /* decorative / disabled ONLY */

  /* ── Rose accent (identity kept) ───────────────────────── */
  --color-accent:        #fb7185;
  --color-accent-strong: #f43f5e;
  --color-accent-deep:   #9f1239;  /* NEW — pressed/:active fills + drop cap; never text on canvas */
  --color-accent-soft:   color-mix(in oklch, #fb7185 15%, transparent);
  --color-accent-faint:  color-mix(in oklch, #fb7185 8%, transparent);
  --color-on-accent:     #1c0a0e;

  /* ── Ember (the ONE support text tone; shimmer only) ───── */
  --color-ember:         #d4a574;  /* NEW — "thinking" shimmer gradient + blob C. Never controls/borders/body text */

  /* ── Semantic (unchanged) ──────────────────────────────── */
  --color-danger:        #f87171;
  --color-danger-soft:   color-mix(in oklch, #f87171 14%, transparent);
  --color-success:       #34d399;
  --color-success-soft:  color-mix(in oklch, #34d399 14%, transparent);

  /* ── Radius (one notch softer for the romance) ─────────── */
  --radius-sm:  8px;
  --radius-md:  12px;
  --radius-lg:  16px;    /* cards: suggestions, queue items, empty states */
  --radius-xl:  22px;    /* modals */
  --radius-2xl: 28px;

  /* ── Elevation ─────────────────────────────────────────── */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.30);
  --shadow-sm: 0 2px 8px -2px rgb(0 0 0 / 0.40);
  --shadow-md: 0 10px 28px -8px rgb(0 0 0 / 0.55);
  --shadow-lg: 0 32px 80px -20px rgb(0 0 0 / 0.75);          /* deepened: glass needs drop vs glowing backdrop */
  --shadow-highlight: inset 0 1px 0 0 rgb(255 255 255 / 0.05); /* signature top-light — keep on every raised surface */
  --shadow-glow:  0 0 24px -6px rgb(251 113 133 / 0.45);      /* NEW — the "flame". Generate button ONLY */
  --shadow-press: inset 0 1px 0 rgb(255 255 255 / 0.22), inset 0 -1px 0 rgb(0 0 0 / 0.25); /* NEW — letterpress primary buttons */

  /* ── Type scale (Inter tiers unchanged; Fraunces tiers added) ── */
  --text-meta:    0.6875rem;            /* 11px */
  --text-meta--line-height: 1rem;
  --text-meta--font-weight: 500;
  --text-label:   0.75rem;              /* 12px */
  --text-label--line-height: 1rem;
  --text-label--font-weight: 500;
  --text-title:   1rem;                 /* 16px */
  --text-title--line-height: 1.375rem;
  --text-title--font-weight: 600;
  --text-title--letter-spacing: -0.01em;
  --text-heading: 1.125rem;             /* 18px */
  --text-heading--line-height: 1.5rem;
  --text-heading--font-weight: 600;
  --text-heading--letter-spacing: -0.01em;
  --text-display: 1.625rem;             /* 26px — Fraunces empty-state headings (was 22px Inter) */
  --text-display--line-height: 2rem;
  --text-display--font-weight: 560;
  --text-display--letter-spacing: -0.01em;
  --text-scene:   1.5rem;               /* NEW 24px — Fraunces view titles (PromptsLab/ProfileScan) */
  --text-scene--line-height: 1.875rem;
  --text-scene--font-weight: 500;
  --text-scene--letter-spacing: -0.015em;
  --text-modal:   1.3125rem;            /* NEW 21px — Fraunces modal titles */
  --text-modal--line-height: 1.75rem;
  --text-modal--font-weight: 520;
  --text-persona: 1.25rem;              /* NEW 20px — Fraunces conversation-header name */
  --text-persona--line-height: 1.55rem;
  --text-persona--font-weight: 520;
  --text-persona--letter-spacing: -0.015em;

  /* ── Motion ────────────────────────────────────────────── */
  --ease-out-soft:    cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out-soft: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-fade:        cubic-bezier(0.16, 1, 0.3, 1);   /* NEW — canonical fade ease */
}
```

Also update `viewport.themeColor` in `layout.tsx` to `#0b0a0e`.

---

## 2. Typography

Inter stays for all UI/body. Fraunces is the display/brand face — the voice of Cyrano. Two voices, no third.

**`layout.tsx` setup:**

```tsx
import { Inter, Fraunces } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const fraunces = Fraunces({
  subsets: ["latin"], display: "swap", variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"], style: ["normal", "italic"],
});
// <html className={`${inter.variable} ${fraunces.variable}`}>
```

Global Fraunces settings (a `.font-display` context in globals.css): `font-optical-sizing: auto`, `font-variation-settings: "SOFT" 50, "WONK" 0`. `WONK 1` in exactly one place: the wordmark.

**Where Fraunces appears — the complete list. Nowhere else.**

| Location | Spec |
|---|---|
| Sidebar wordmark "Cyrano" | 22px / 560, italic, WONK 1; "reply copilot" strap stays Inter `--text-meta` |
| Conversation header name | `--text-persona` (20px / 520) — her name set like a chapter heading |
| Empty-state headings ("Welcome to Cyrano", "Pick a conversation", "No messages yet") | `--text-display` (26px / 560) + drop cap (§6) |
| Modal titles (New conversation, Import thread, Profile) | `--text-modal` (21px / 520) |
| View titles in PromptsLab / ProfileScan | `--text-scene` (24px / 500) |
| "Cyrano is thinking…" | 13px italic — the ONE sub-18px exception (marginalia) |

**Hard bans:** never in message bubbles, suggestion texts, buttons, inputs, labels, tone chips, timestamps, facts, toasts. Suggestion reply text stays Inter — the frame is literary, the content is casual texting. Timestamps/counters keep Inter `tabular-nums`; Fraunces numerals are banned from meta.

**Spacing (letterpress air):** header horizontal padding `px-4 → px-6`; thread column stays `max-w-2xl` with `space-y-3`; suggestions block `p-3 → p-4`; FactsPanel sections `space-y-6 → space-y-8`; empty states `mt-10 → mt-16`.

---

## 3. Surfaces & Atmosphere

### Canvas

Body paints a fixed vertical falloff (warm/lit at top, sinking to black); `--color-canvas` remains the flat token for ring-offsets/themeColor:

```css
body { background: linear-gradient(180deg, #0b0a0e 0%, #08070a 55%, #050507 100%) fixed; }
```

### Ambient glow (`.app-backdrop`) — exactly three blobs, transform-only, no film grain

Three fixed-position children (or pseudo-elements + one child), `pointer-events: none`, behind everything:

```css
/* Blob A — rose, hero */    background: radial-gradient(closest-side, rgb(251 113 133 / 0.10), transparent 60%);
                             width: 900px; height: 600px; top: -8%; left: 15%;
/* Blob B — violet, support */ background: radial-gradient(closest-side, rgb(139 92 246 / 0.06), transparent 65%);
                             width: 700px; height: 700px; top: 30%; right: -10%;
/* Blob C — ember, low */    background: radial-gradient(closest-side, rgb(245 158 11 / 0.05), transparent 55%);
                             width: 1000px; height: 500px; bottom: -12%; left: 45%;
```

Each: `filter: blur(70px)`, `will-change: transform`, its own keyframe drifting `translate` ±3–4% and `scale 1 → 1.06`, `alternate ease-in-out infinite` at **38s / 47s / 55s** (co-prime — never visibly repeats). Under `prefers-reduced-motion: animation: none` — blobs remain as static glow. Blob A also gets a `.speaking` class hook (see §6.1). These colors are ambient only — never on controls.

### Glass recipes (blur is chrome-only; ≤5 blurred layers on screen)

| Surface | Fill | Blur | Border | Notes |
|---|---|---|---|---|
| Conversation / Facts / Sidebar header rows | `--color-glass` | `backdrop-blur(16px) saturate(1.4)` | bottom `--color-line` | `--shadow-highlight`; headers are sticky glass, content scrolls under |
| Composer dock (bottom bar) | `rgb(22 19 26 / 0.55)` | `backdrop-blur(20px) saturate(1.5)` | top `--color-line` | the strongest everyday glass moment |
| Modals | `--color-glass-heavy` | `backdrop-blur(24px) saturate(1.4)` | `--color-line-strong` | radius `--radius-xl`, `--shadow-lg`, `--shadow-highlight`; scrim `bg-black/65 backdrop-blur(6px)` |
| Drawers | `--color-glass-heavy` | `backdrop-blur(24px)` | side `--color-line-strong` | same scrim |
| Toast | `rgb(32 28 38 / 0.80)` | `backdrop-blur(16px)` | `--color-line` (error: `danger/30`) | pill kept, `--shadow-md` |

**Everything else is matte** (letterpress discipline): sidebar column, cards, bubbles, suggestions panel, FactsPanel body — flat `--color-fill` + hairline + `--shadow-highlight`, no blur, no outer shadow at rest.

### Component surface decisions

- **Suggestions panel:** matte `--color-fill`, radius `--radius-lg`, with a 2px top rule in `--color-line-accent` fading to transparent at the ends (`linear-gradient(90deg, transparent, rgb(251 113 133/0.28), transparent)`) — the rose thread where magic arrives.
- **"Me" bubbles:** flat solid `--color-accent` + `--shadow-highlight` only — no gradient, no glow. "Them" bubbles: `--color-fill` + `--color-line` hairline. Asymmetric radius (tail corners) kept.
- **Primary rose buttons (letterpress press):** resting `--shadow-press`; on `:active` invert the insets and shift bg toward `color-mix(in oklch, var(--color-accent-strong) 70%, var(--color-accent-deep))`. The Generate button additionally carries `--shadow-glow` — the only glowing control in the app.
- **Composer card:** translucent `--color-fill` interior; `:focus-within` → border `--color-line-accent` + `0 0 0 3px` accent/12% ring.
- **Section kickers (Sidebar + FactsPanel uppercase labels):** a 20px × 2px `--color-line-accent` bar above the label replaces full-width top borders — magazine-rule detail.
- **Skeleton shimmer gradient warms** to `rgb(244 228 236 / 0.05)`.

### Elevation ladder (by altitude)

`xs` inline chips → `sm` popovers/menus → `md` toast → `lg` modals/drawers. `--shadow-highlight` on every raised surface. `--shadow-glow` on the Generate button only. No resting outer shadows on cards.

---

## 4. Motion API — `src/components/motion.tsx`

Single shared module. All seven teams import ONLY from here (plus `motion/react` for `motion.*`/`AnimatePresence` primitives). Exact exports:

```tsx
"use client";
import { motion, useReducedMotion, type Transition, type Variants } from "motion/react";

/* ── Springs & eases (canonical, do not redefine locally) ── */
export const SPRING_MICRO: Transition  = { type: "spring", stiffness: 380, damping: 30 }; // hovers, chips, icons, small reveals
export const SPRING_SETTLE: Transition = { type: "spring", stiffness: 340, damping: 30 }; // list items, rows, bubbles
export const SPRING_MODAL: Transition  = { type: "spring", stiffness: 300, damping: 26 }; // modals, drawers, panels, view blocks
export const SPRING_TOAST: Transition  = { type: "spring", stiffness: 420, damping: 28 }; // toast only
export const EASE_FADE = [0.16, 1, 0.3, 1] as const;                                       // pure fades / exits
export const DUR = { fast: 0.15, base: 0.2, slow: 0.24, exitFast: 0.13, exitBase: 0.16 } as const;

/* ── Reduced motion ── */
/** Wraps useReducedMotion(); always returns boolean (false during SSR/hydration). */
export function useAppReducedMotion(): boolean;

/** Returns variants with all transform deltas zeroed (opacity-only, 120ms) when reduced=true.
 *  Every component passes its variants through this before use. */
export function rm(reduced: boolean, variants: Variants): Variants;

/* ── Variant factories (all honor the reduced flag internally where noted) ── */

/** Fade-up entrance. enter: {opacity:0→1, y:distance→0}, EASE_FADE, DUR.slow; exit: {opacity:0, y:-distance/2}, DUR.exitBase. */
export function fadeUp(distance?: number): Variants;          // default distance = 8. Keys: "initial" | "enter" | "exit"

/** View switch (Replies/Prompts/Scan + conversation switch). enter y:8→0 240ms EASE_FADE; exit y:-4 160ms. */
export const viewVariants: Variants;                          // keys: "initial" | "enter" | "exit"

/** Stagger list. Container staggers children; item = {opacity:0→1, y:6→0} SPRING_SETTLE.
 *  capAt: items with index >= capAt render visible immediately (pass custom={i} to items). */
export function listContainer(staggerMs?: number): Variants;  // default 35ms. keys: "initial" | "enter"
export function listItem(capAt?: number): Variants;           // default capAt = 12. keys: "initial" | "enter" | "exit"
                                                              // exit: {opacity:0, scale:0.97} 140ms

/** Message bubble entrance, direction-aware. from="me" slides x:12→0, from="them" x:-12→0, both scale 0.96→1, SPRING_SETTLE. */
export function bubbleVariants(from: "me" | "them"): Variants; // keys: "initial" | "enter" | "exit" (exit: opacity 0, scale 0.95, 140ms)

/** Suggestion card deal-out. i*90ms delay, {opacity, y:14→0, scale:0.96→1} SPRING_MODAL. Pass custom={i}. */
export const suggestionCardVariants: Variants;                // keys: "initial" | "enter" | "exit"

/** Modal + drawer + toast (used with AnimatePresence) */
export const scrimVariants: Variants;                         // opacity 0→1 200ms EASE_FADE; exit 150ms
export const modalVariants: Variants;                         // enter {opacity, scale:0.96→1, y:8→0} SPRING_MODAL; exit {opacity:0, scale:0.97} 140ms
export function drawerVariants(side: "left" | "right"): Variants; // enter x:∓100%→0 SPRING_MODAL; exit tween 180ms EASE_FADE
export const toastVariants: Variants;                         // enter {y:24→0, opacity, scale:0.95→1} SPRING_TOAST; exit {y:12, opacity:0} 160ms

/** Collapsible (targeting bar, queue expand). animate height 0↔auto + opacity, SPRING_MODAL enter, 150ms exit. */
export const collapseVariants: Variants;                      // keys: "initial" | "enter" | "exit"

/* ── Components ── */

/** motion.button with whileTap={{scale:0.97}} (noop under reduced motion). Drop-in for <button>. */
export const MotionButton: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof motion.button> & React.RefAttributes<HTMLButtonElement>
>;

/** Standard AnimatePresence view wrapper: <ViewFade viewKey={string}>{children}</ViewFade>
 *  Renders AnimatePresence mode="wait" + motion.div with viewVariants keyed by viewKey. */
export function ViewFade(props: { viewKey: string; className?: string; children: React.ReactNode }): JSX.Element;
```

Rules of the module: transform + opacity only (one exception: ≤120ms `filter: blur(2–3px)` on exiting skeletons in §6.1, dropped under reduced motion). Every variant factory reads NO global state — components call `useAppReducedMotion()` themselves and wrap with `rm()`. `layoutId` strings are reserved app-wide: `"view-tab"` (sidebar tab pill), `"conv-ink"` (conversation indicator). Both layoutId elements are `aria-hidden`.

---

## 5. Choreography

Reduced-motion behavior for EVERY entry: transforms zeroed via `rm()`, opacity fades at 120ms, staggers collapse to 0, CSS keyframes killed by the existing media query. Never remove focus outlines.

**Sidebar**
- View tabs: active tab background is `motion.span layoutId="view-tab"` — a pill of `--color-fill-active` + `--shadow-highlight` sliding between Replies/Prompts/Scan, SPRING_MICRO. Label color crossfades via CSS 150ms.
- Active conversation: the rose left bar becomes `motion.span layoutId="conv-ink"` — a 2×20px rose rod gliding between rows, SPRING_MICRO, `box-shadow: 0 0 8px rgb(251 113 133/0.5)`. Row bg change stays CSS.
- Conversation list: stagger entrance on initial mount ONLY (`listContainer(35)` + `listItem(10)`); no animation on refetch. Hover is color-only.
- `+` button: `MotionButton`; icon `whileHover={{ rotate: 90 }}` SPRING_MICRO.

**View transitions** — `ViewFade` around the `<main>` branch, keyed by `view` and `detail.conversation.id`. Enter 240ms fade-up 8px; exit 160ms fade to y:-4.

**Thread messages**
- On conversation mount: last **8** messages cascade with `listContainer(30)` + `bubbleVariants` (older messages render instantly — capped so long threads never wait).
- Newly appended message: `bubbleVariants("me"|"them")` — me from the right, them from the left. `layout` on the list container so neighbors settle (SPRING_SETTLE).
- Delete: `AnimatePresence` exit `{opacity:0, scale:0.95}` 140ms; `layout` closes the gap.
- Target toggle-on: one `scale 1 → 1.015 → 1` pulse, SPRING_MICRO; the ring itself stays CSS.
- Hover action column: CSS opacity + 4px micro-slide toward the bubble, 150ms.

**Suggestions panel** — see §6.1 for the full reveal. Baseline: panel `fadeUp(12)` SPRING_MODAL; dismiss exit `{opacity:0, y:8, scale:0.98}` 170ms. Per-card regenerate: `AnimatePresence mode="popLayout"` keyed on text — old card `{opacity:0, filter:blur(2px)}` 120ms, new `{opacity:0→1, y:4→0}` 180ms. "Use": chosen card scale-presses to 0.97 (SPRING_MICRO) before the block exits.

**Composer**
- The dock never moves — it is the anchor.
- Targeting bar + queued-replies box: `AnimatePresence` + `collapseVariants`; target chips stagger 30ms, exit scale→0.9.
- Generate button: `MotionButton`; while `suggesting`, a conic-gradient ring (rose → ember → rose) rotates around its border — CSS `@property --angle` animation, 2.4s linear, infinite. Killed under reduced motion.
- All other buttons app-wide: `MotionButton` (whileTap 0.97); hover colors stay CSS.

**Queue**
- Expand/collapse: `collapseVariants` height animation, 240ms EASE_FADE.
- Item added: `listItem` enter. "Mark sent": exit `{x:24, opacity:0}` 180ms — it leaves toward the thread.

**FactsPanel**
- Inline panel mount (xl+): none — it is furniture. Drawer version animates as a drawer.
- Facts list: `AnimatePresence mode="popLayout"` + `layout` rows. New fact (incl. optimistic): enter `{opacity, y:-6→0, scale:0.97→1}` SPRING_SETTLE + one-shot CSS bg flash `accent-faint → transparent` 800ms. Delete: exit `{opacity:0, x:12}` 140ms.
- Pin toggle: pin icon `rotate:-25°→0, scale:1.15→1` SPRING_MICRO; the row `layout`-floats to its new sort position (SPRING_SETTLE) — the fact files itself.
- Person-switch list entrance: `listContainer(30)` opacity-dominant, 180ms.

**Modals (all three)** — `AnimatePresence`: `scrimVariants` + `modalVariants`. The Fraunces title fades up with `delay: 0.06` — arrives a beat after the glass.

**Drawers** — `scrimVariants` + `drawerVariants(side)`. Replaces the current `animate-fade-up`.

**Toast** — `AnimatePresence` keyed on `toast.id`, `toastVariants`. Consecutive toasts crossfade via key change.

**Empty states** — `fadeUp(6)` 220ms with the drop-cap stamp (§6.3).

**Fact-extraction feedback** — toast (as today) + the Brain button's fact-count badge does a `scale 1→1.35→1` SPRING_MICRO tick when the count increments, and new rows do the accent flash. No particle flight — cut for restraint.

---

## 6. Signature moments

**6.1 — "The reply arrives like a letter" (suggestion reveal).** The product's payoff, most staged sequence in the app. While thinking: skeleton cards + the shimmer whisper (6.4) + the conic wick on Generate. On results: (1) the panel's rose top rule draws in `scaleX: 0→1` (origin center, 260ms EASE_FADE); (2) each skeleton exits `{opacity:0, filter:blur(3px)}` 120ms while its real card enters in place via `suggestionCardVariants` at `i*90ms` — a deliberate deal-out, one letter at a time; (3) each card's tone chip pops 60ms after its card, `scale 0.6→1` SPRING_MICRO — a wax seal; (4) Blob A gets a `.speaking` class for 1.6s easing its opacity 0.10→0.16→0.10 (CSS transition, opacity only) — **the room brightens when Cyrano speaks**. Reduced motion: plain staggered opacity fade, no blur, no room-glow.

**6.2 — "Her name in ink" (conversation switch).** The header's Fraunces name reveals via `clip-path: inset(0 100% 0 0) → inset(0 0 0 0)` over 420ms EASE_FADE (a pen stroke, left to right) while the avatar ring draws (SVG circle `pathLength 0→1`, 500ms, rose stroke) and the header glass fades up 200ms. Runs once per conversation switch, during the data-fetch window — it masks latency. Reduced motion: instant name, static ring.

**6.3 — "The drop-cap welcome" (empty states).** Empty-state headings set the first letter as a two-line drop cap: ~56px Fraunces 560 in `--color-accent-deep` with a 1px rose hairline beneath (CSS `initial-letter` with float fallback). On mount it stamps in — `scale 1.12→1, opacity 0→1` SPRING_MICRO — followed 80ms later by the rest of the heading and body fading up 6px. "No messages yet" gets the small version: first letter accent-tinted, no giant cap. The first thing a new user sees declares the identity in one glyph. Reduced motion: static cap, opacity fade.

**6.4 — "The lit wick" (thinking state).** "Cyrano is thinking…" becomes Fraunces italic 13px with a candlelight sheen: `linear-gradient(90deg, var(--color-ink-muted), var(--color-ember) 45%, var(--color-accent) 50%, var(--color-ember) 55%, var(--color-ink-muted))`, `background-size: 200%`, `background-clip: text`, transparent fill, background-position sweeping 2.2s infinite. Paired with the conic-gradient ring burning around the Generate button (§5 Composer). The only places ember ever moves. Reduced motion: static `--color-ink-secondary` text, no ring.

---

## 7. Accessibility invariants

- **Contrast:** every info-bearing ink tier clears 4.5:1 on the darkest canvas stop (`#050507`): ink ~17.5:1, ink-secondary ~9:1, ink-muted ~5.5:1. `ink-faint` is decorative/disabled only. `on-accent` on `#fb7185` ≈ 6.6:1. `accent-deep` is never used as text on canvas. Glass fills under text ≥ 0.72 alpha (toast 0.80) so contrast holds regardless of scroll-behind content.
- **Motion:** all animation is transform / opacity / clip-path only; the two `filter: blur` micro-fades are exit-only, ≤120ms, and dropped under reduced motion. `useAppReducedMotion()` gates every motion/react transform and all four signature moments; the CSS `prefers-reduced-motion` block in globals.css remains as the backstop for keyframes and blobs. Blobs and grain-free backdrop are `pointer-events: none`.
- **Focus:** the existing focus-visible pattern (2px accent ring + offset, global `:focus-visible` fallback) is preserved verbatim on every control. The new `--color-line-accent` focus border on inputs adds to, never replaces, the ring. `layoutId` pills/rods never suppress a focus outline and are `aria-hidden`.
- **Structure:** all existing `aria-label`s, `role="dialog"` / `aria-modal`, keyboard handlers, and DOM order untouched — motion wraps markup, never restructures it. `AnimatePresence` exit animations must not delay focus return from closed modals/drawers.
- **Performance guard:** backdrop-blur on chrome only (headers, dock, modals, drawers, toast) — never on list items, bubbles, or cards; ≤5 blurred layers on screen.

## Files touched at implementation

`src/app/globals.css` (tokens, body gradient, blobs, shimmer, wick, drop cap, kickers) · `src/app/layout.tsx` (Fraunces, themeColor) · `src/components/motion.tsx` (NEW, §4) · `src/app/page.tsx` (ViewFade shell, drawers, toast) · `src/components/Sidebar.tsx` · `src/components/ConversationView.tsx` · `src/components/FactsPanel.tsx` · `src/components/PromptsLab.tsx` / `ProfileScan.tsx` (view titles) · the three modals. Zero behavior changes; `fred_context.md` untouched; nothing committed.
