# CYRANO — DESIGN SPEC v2 · «LIQUID AURORA»

This document is the single source of truth for the v2 aesthetic pivot. It replaces «Éditions Minuit» wholesale. Where it conflicts with current code, this document wins. It is a visual + motion rework only: zero behavior changes, no state/props/handler edits, keep the existing responsive skeleton (sidebar drawer `<md`, facts drawer `<xl`, action sheet on coarse pointer, `.hit` slop, safe-area padding, the `.speaking` and `.status-beam` contracts). `fred_context.md` untouched.

**Client verdict driving this pivot:** the editorial theme read "too blocky, too formal." v2 is iOS 17+/visionOS **liquid glass**: a deep dark canvas with a soft aurora glowing beneath, frosted translucent materials floating above it in tiers, huge soft radii, vibrancy, and springy iOS physics. The three-pigment **semantic grammar survives** — champagne/gold = the user's hand, garnet = Cyrano at work & commitments, laurel = her side & memory — but every hue is recalibrated for vivid glass. The letterpress metaphor (folios, small-caps, dot leaders, drop caps, serif marginalia, «№») is retired.

---

## 1. Identity & principles

**Mood.** A dark room lit from below by an aurora. Every surface is a pane of frosted glass suspended over that glow: you can feel color moving underneath the blur, hairlines of white light catch each pane's top edge, and everything floats on soft shadow. Nothing is boxed; things are *rounded, lifted, and lit*. Typography is a single friendly modern sans, sentence-case, tightly tracked. The one glowing object in any screen is the Generate button — the lamp of v1 reborn as a gem.

**Five laws (enforced in review):**

1. **Three pigments, one grammar (unchanged semantics, new hues).** Color is meaning, never decoration:
   - **Rose** (`accent` family — the client-chosen highlight, the original Cyrano rose restored) — **the user's hand & the machine's chrome**: Generate/Use, focus rings, quote-links, active segments, me-bubbles, pinned facts.
   - **Garnet** (`garnet`/`seal` family) — **Cyrano at work & commitments**: the thinking shimmer, the status beam, suggestions arriving, the queue gem, unsent badges; as `danger`, destruction.
   - **Laurel** (`laurel` family) — **her side & memory**: reply-targeting (targeted bubbles, target chips), the fact library, plans, success ("Mark sent", sent toasts).
   Neutral glass still belongs to **the match's own words**. A pigment never borrows another's meaning. Washes stay ≤16% (`-soft`) / 9% (`-faint`); pigment text uses only the documented text rungs (§2 contrast table).
2. **Glass is layered, not stacked.** Exactly three material tiers (§4): **thin** for chrome, **regular** for floating panels/sheets, **thick** for modals. Inline cards and bubbles are *simulated glass* (translucent fill + top-light + hairline, **no backdrop-filter**) so the blur budget (§9) holds. A pane never sits directly on another pane of the same tier without a gap.
3. **Light does the work of borders.** Every raised surface carries a 1px white-alpha hairline and an inner top-light highlight (`--shadow-plate`). Separation comes from blur, lift, and shadow — never from opaque boxes or heavy rules.
4. **One glow at rest.** At rest, a full screen shows exactly **one** glowing element: Generate (or its per-view equivalent). Focus rings and in-flight states may add temporary light; if anything else glows permanently, demote it.
5. **The aurora is felt, not seen.** The ambient gradient stays ≤10% opacity under content; it exists to give the blur something to refract. If you can name its shape while reading, turn it down.

---

## 2. Token sheet

Complete `@theme` ladder for `src/app/globals.css`. **Every existing token name keeps working** (values change only). Legacy aliases stay. sRGB hex is the source of truth here (glass alphas in rgb()).

```css
@theme {
  /* ── Fonts (serif retired — one sans for everything) ───── */
  --font-sans:    var(--font-inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  --font-display: var(--font-inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif); /* LEGACY name; now the same sans */

  /* ── Canvas (deep cool near-black with a blue cast) ────── */
  --color-canvas:        #0B0D16;   /* app bg, themeColor, ring-offset */
  --color-canvas-deep:   #06070D;   /* bottom of body gradient; never #000 */
  --color-surface:       #131624;   /* SOLID fallback fill: drawers, popovers, reduced-transparency */
  --color-surface-high:  #1A1E30;   /* SOLID fallback: modals, menus, toasts, action sheet */

  /* ── Glass fills (used WITH backdrop-filter; recipes in §4) ── */
  --color-plate:         rgb(16 18 32 / 0.55);   /* thin — headers + composer dock */
  --color-glass:         rgb(20 23 40 / 0.55);   /* regular — panels, sheets, drawers */
  --color-glass-heavy:   rgb(24 27 46 / 0.70);   /* thick — modals, action sheet */

  /* ── Fills (interaction washes — white light, not cream) ── */
  --color-fill:          rgb(255 255 255 / 0.06);
  --color-fill-hover:    rgb(255 255 255 / 0.09);
  --color-fill-active:   rgb(255 255 255 / 0.13);

  /* ── Hairlines (white-alpha light edges) ───────────────── */
  --color-line:          rgb(255 255 255 / 0.10);   /* default 1px pane edge */
  --color-line-strong:   rgb(255 255 255 / 0.17);   /* input borders, capsule borders, kbd */
  --color-line-gilt:     rgb(251 113 133 / 0.45);   /* rose rules, focused inputs, me-bubble edge */
  --color-line-accent:   rgb(255 211 126 / 0.45);   /* LEGACY alias of line-gilt */

  /* ── Ink (cool white ladder — ratios on glass-thick over canvas, eff. ≈ #10131F) ── */
  --color-ink:            #F4F6FC;  /* ~17:1 — primary text */
  --color-ink-secondary:  #C0C7DA;  /* ~10:1 — secondary text, icons */
  --color-ink-muted:      #8E96AF;  /* ~6.2:1 — meta, placeholders, labels */
  --color-ink-faint:      #5C6379;  /* decorative / disabled ONLY, never functional text */

  /* ── Rose (accent — the user's hand; the identity color) ── */
  --color-accent:        #FB7185;  /* ~6.8:1 as text — links, active, focus rings, rose edges */
  --color-accent-strong: #F43F5E;  /* gradient partner in primary fills; hover on accent */
  --color-accent-deep:   #B87E1F;  /* pressed fills only, NEVER text */
  --color-accent-soft:   color-mix(in oklch, #FB7185 16%, transparent);  /* me-bubble, active chip */
  --color-accent-faint:  color-mix(in oklch, #FB7185 9%, transparent);   /* hover washes */
  --color-on-accent:     #1C0A0E;  /* text on rose fills */

  /* ── Garnet & seal (Cyrano at work & commitments) ──────── */
  --color-seal:          #B02440;  /* raspberry gem-disc fill, record dots; never text */
  --color-seal-bright:   #FFA07E;  /* = garnet; small text/icons (~8.2:1), ≥12px or icons */
  --color-danger:        #FF7B70;  /* ~7.3:1 — destructive text/icons */
  --color-danger-soft:   color-mix(in oklch, #FF7B70 16%, transparent);
  --color-success:       #7DE8B4;  /* LEGACY alias of laurel */
  --color-success-soft:  color-mix(in oklch, #7DE8B4 16%, transparent);

  --color-garnet:        #FFA07E;  /* ember-coral (re-spaced off the rose accent); ≥12px or icons */
  --color-garnet-strong: #E14E60;  /* fills/borders; never text */
  --color-garnet-soft:   color-mix(in oklch, #FFA07E 16%, transparent);
  --color-garnet-faint:  color-mix(in oklch, #FFA07E 9%, transparent);
  --color-line-garnet:   rgb(255 160 126 / 0.40);   /* garnet pane edges: queue, working rules */

  /* ── Laurel (her side & memory — vivid mint) ───────────── */
  --color-laurel:        #7DE8B4;  /* laurel text/icons (~12:1) */
  --color-laurel-strong: #34B87A;  /* fills/borders; never text */
  --color-laurel-deep:   #14523A;  /* pressed fills only, NEVER text */
  --color-laurel-soft:   color-mix(in oklch, #7DE8B4 16%, transparent);
  --color-laurel-faint:  color-mix(in oklch, #7DE8B4 9%, transparent);
  --color-line-laurel:   rgb(125 232 180 / 0.40);  /* targeted bubbles, memory edges */
  --color-on-laurel:     #06251A;  /* text on laurel fills */

  /* ── Ember (LEGACY — only inside old gradients until converted) ── */
  --color-ember:         #B87E1F;  /* remapped to accent-deep */

  /* ── Tone chip inks (refreshed for glass; chip recipe §5) ── */
  --color-tone-dry:      #B9C0D0;  /* ~10:1 */
  --color-tone-playful:  #FFC964;  /* ~12:1 */
  --color-tone-curious:  #7FC4FF;  /* ~9.8:1 */
  --color-tone-flirty:   #FFA07E;  /* garnet family — flirt is commitment (~8.2:1) */
  --color-tone-sincere:  #7DE8B4;  /* laurel (~12:1) */
  --color-tone-bold:     #C79CFF;  /* ~8.4:1 */

  /* ── Radius (LARGE and soft — glass, not typeset blocks) ── */
  --radius-xs:  8px;    /* chips, tags, kbd */
  --radius-sm:  12px;   /* buttons (non-pill), inputs */
  --radius-md:  16px;   /* rows, suggestion cards, queue items, toasts */
  --radius-lg:  20px;   /* panels, bubbles, dropzones */
  --radius-xl:  28px;   /* modals, sheets, drawers */
  --radius-2xl: 28px;   /* LEGACY alias of xl */
  /* pills (segmented control, capsule toolbar, primary buttons): rounded-full */

  /* ── Elevation (floating shadows + inner top-light) ────── */
  --shadow-xs:    0 1px 3px 0 rgb(0 0 0 / 0.25);
  --shadow-sm:    0 4px 16px -4px rgb(0 0 0 / 0.40);                  /* popovers, tooltips */
  --shadow-md:    0 16px 40px -12px rgb(0 0 0 / 0.55);                /* menus, toasts, capsule toolbar */
  --shadow-lg:    0 32px 80px -16px rgb(0 0 0 / 0.70);                /* modals, dossier sheet */
  --shadow-plate: inset 0 1px 0 rgb(255 255 255 / 0.12);              /* top-light on every pane */
  --shadow-highlight: inset 0 1px 0 rgb(255 255 255 / 0.12);          /* LEGACY alias of plate */
  --shadow-press: inset 0 2px 6px rgb(0 0 0 / 0.35);                  /* LEGACY name — pressed-glass inner shade */
  --shadow-gilt:  0 0 36px -6px rgb(255 211 126 / 0.55), 0 8px 24px -8px rgb(255 180 76 / 0.35); /* Generate ONLY */
  --shadow-glow:  0 0 36px -6px rgb(255 211 126 / 0.55), 0 8px 24px -8px rgb(255 180 76 / 0.35); /* LEGACY alias */

  /* ── Type scale (roles in §3 — one sans, sentence case) ── */
  --text-folio:   0.6875rem;              /* 11px/16, 600, +0.02em — section labels, tone chips (NO uppercase, NO wide tracking) */
  --text-folio--line-height: 1rem;
  --text-folio--font-weight: 600;
  --text-folio--letter-spacing: 0.02em;
  --text-meta:    0.6875rem;              /* LEGACY — converge on folio or marginalia */
  --text-meta--line-height: 1rem;
  --text-meta--font-weight: 500;
  --text-marginalia: 0.75rem;             /* 12px/16, sans 500 — timestamps, meta notes (serif italic retired) */
  --text-marginalia--line-height: 1rem;
  --text-marginalia--font-weight: 500;
  --text-label:   0.75rem;                /* 12px/16, sans 500 — buttons, chips, meta rows */
  --text-label--line-height: 1rem;
  --text-label--font-weight: 500;
  --text-body:    0.875rem;               /* 14px/21, sans 400 — UI body, list previews */
  --text-body--line-height: 1.3125rem;
  --text-body--font-weight: 400;
  --text-bubble:  0.9375rem;              /* 15px/22, sans 400 — message + suggestion text */
  --text-bubble--line-height: 1.375rem;
  --text-bubble--font-weight: 400;
  --text-title:   1rem;                   /* 16px/22, sans 600, −0.015em — card/row titles */
  --text-title--line-height: 1.375rem;
  --text-title--font-weight: 600;
  --text-title--letter-spacing: -0.015em;
  --text-heading: 1.125rem;               /* 18px/24, sans 600, −0.015em */
  --text-heading--line-height: 1.5rem;
  --text-heading--font-weight: 600;
  --text-heading--letter-spacing: -0.015em;
  --text-persona: 1.375rem;               /* 22px/28, sans 700, −0.02em — conversation-header name (upright) */
  --text-persona--line-height: 1.75rem;
  --text-persona--font-weight: 700;
  --text-persona--letter-spacing: -0.02em;
  --text-modal:   1.25rem;                /* 20px/26, sans 700, −0.02em — modal titles */
  --text-modal--line-height: 1.625rem;
  --text-modal--font-weight: 700;
  --text-modal--letter-spacing: -0.02em;
  --text-scene:   1.75rem;                /* 28px/34, sans 700, −0.025em — PromptsLab / ProfileScan titles */
  --text-scene--line-height: 2.125rem;
  --text-scene--font-weight: 700;
  --text-scene--letter-spacing: -0.025em;
  --text-display: 2rem;                   /* 32px/38, sans 700, −0.03em — empty-state headings */
  --text-display--line-height: 2.375rem;
  --text-display--font-weight: 700;
  --text-display--letter-spacing: -0.03em;
  /* .text-spread (dossier name): sans 700, clamp(36px, 5.5vw, 56px)/1.05, −0.03em — utility class in globals.css */

  /* ── Motion (CSS side; JS canon in motion.tsx §6) ──────── */
  --ease-ink:         cubic-bezier(0.32, 0.72, 0, 1);   /* canonical — the iOS sheet ease */
  --ease-out-soft:    cubic-bezier(0.32, 0.72, 0, 1);   /* LEGACY alias of ease-ink */
  --ease-in-out-soft: cubic-bezier(0.45, 0, 0.55, 1);   /* LEGACY — aurora drift only */
  --ease-fade:        cubic-bezier(0.32, 0.72, 0, 1);   /* LEGACY alias of ease-ink */
}
```

**Body background:** `linear-gradient(180deg, #0D0F1A 0%, #0B0D16 40%, #06070D 100%) fixed`, `background-color: var(--color-canvas)`. The aurora (§4) sits above this, below all content.

**Contrast invariants (hard, verified on glass-thick over canvas ≈ `#10131F`):**

| Text rung | Value | Ratio | Rule |
|---|---|---|---|
| `ink` | `#F4F6FC` | ~17:1 | anywhere |
| `ink-secondary` | `#C0C7DA` | ~10:1 | anywhere |
| `ink-muted` | `#8E96AF` | ~6.2:1 | meta/labels ≥11px |
| `accent` | `#FB7185` | ~6.8:1 | ≥12px text, icons, edges |
| `laurel` | `#7DE8B4` | ~12:1 | anywhere |
| `garnet` / `seal-bright` | `#FFA07E` | ~8.2:1 | ≥12px or icons |
| `danger` | `#FF7B70` | ~7.3:1 | ≥12px or icons |
| `on-accent` on `accent-strong` | `#241903` | ~9:1 | button labels |

Never `accent-deep`, `seal`, `laurel-deep`, `garnet-strong`, `laurel-strong`, or `ink-faint` as functional text. Tone-chip text uses exactly the §2 tone values. Every rung above clears 4.5:1 with margin; nothing below `ink-muted` may carry information.

---

## 3. Typography

**Fonts (next/font/google, in `layout.tsx`):**

```ts
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
```

**Fraunces and Instrument Sans are removed.** One family: Inter, tight-tracked at display sizes (see the negative tracking on `title` and up). `--font-display` now resolves to the same Inter stack so existing `.font-display` call sites keep compiling; during per-surface passes, remove `font-display`, `italic`, `uppercase`, `[font-variant-numeric:oldstyle-nums]`, and wide `tracking-*` classes wherever they encode the old editorial voice. `.font-display` and `.font-wonk` become no-op passthroughs (keep the class names; strip the `font-variation-settings`). The wordmark "Cyrano" is set in Inter 700, 20px, −0.03em, with a subtle gold→white gradient text fill (`background-clip: text`) — the only decorated type in the app.

**Voice rules:**
- **Sentence case everywhere.** No small-caps system, no uppercase labels, no letter-spacing wider than +0.02em. "Suggestions", not "THE PROOFS".
- **Timestamps and meta are quiet, not italic.** `--text-marginalia` = 12px sans 500 `ink-muted`, `tabular-nums`.
- **Numerals:** `tabular-nums` on all counts/times. Oldstyle numerals and «№» are retired; counts render as plain numbers or "2 of 3".
- **Weights:** 400 body, 500 labels/meta, 600 titles/section labels, 700 names/headings. Nothing lighter than 400, nothing above 700.
- `.drop-cap` / `.drop-cap-sm` become no-ops (keep class names; strip `::first-letter` styling). The typography illustration of empty states is now the display heading itself plus vibrancy.

---

## 4. Materials — the glass system

**The aurora (replaces the Reading Lamp; keep the `.speaking` contract).** The app root `.app-backdrop` keeps its two fixed, `z-index:-1`, `pointer-events:none` pseudo-layers, now a CSS-only mesh:

1. `::before` — three radial pools composited in one background: `radial-gradient(900px 700px at 15% -10%, rgb(122 92 255 / 0.16), transparent 60%), radial-gradient(1100px 800px at 85% 15%, rgb(255 100 130 / 0.10), transparent 60%), radial-gradient(1000px 900px at 50% 115%, rgb(64 180 200 / 0.12), transparent 65%)`. Rest opacity 0.7. Drift: `transform: translate3d(0,0,0) scale(1) → scale(1.06)` over 60s alternate on `--ease-in-out-soft`. On `.app-backdrop.speaking` opacity lifts 0.7 → 1 over 800ms — *the aurora surges while Cyrano thinks*.
2. `::after` — a static counter-pool for depth: `radial-gradient(800px 600px at 75% 90%, rgb(255 180 76 / 0.05), transparent 60%)` (a whisper of gold under the composer corner). No animation.

**Grain:** keep the existing `body::after` feTurbulence overlay at **0.02** opacity (it kills gradient banding under blur). Never remove.

**Three material tiers (exact recipes).** All panes get `--shadow-plate` (inner top-light) plus a 1px hairline border; the tier sets fill, blur, and lift:

| Tier | Class | Fill | Backdrop-filter | Border | Shadow | Used for |
|---|---|---|---|---|---|---|
| **Thin** (chrome) | `.plate` (aliases `.glass-header`, `.glass-dock`) | `var(--color-plate)` | `blur(20px) saturate(1.6)` | 1px `--color-line` on the scroll edge | `--shadow-plate` only (chrome doesn't float) | sticky headers, composer dock, sidebar masthead |
| **Regular** (floating panels) | `.glass-panel` (NEW), `.glass-drawer`, `.glass-toast` | `var(--color-glass)` | `blur(24px) saturate(1.5)` | 1px `--color-line` | `--shadow-md` + `--shadow-plate` | suggestions panel, drawers, toasts, popovers, menus, capsule toolbar |
| **Thick** (modal) | `.glass-modal` | `var(--color-glass-heavy)` | `blur(40px) saturate(1.8)` | 1px `--color-line-strong` | `--shadow-lg` + `--shadow-plate` | modals, action sheet, dossier sheet |

**Simulated glass (no backdrop-filter — the budget saver):** inline cards, bubbles, rows, inputs use `.glass-card` (NEW): `background: rgb(255 255 255 / 0.05)` + `background-image: linear-gradient(180deg, rgb(255 255 255 / 0.04), transparent 45%)`, 1px `--color-line` border, `--shadow-plate`, radius per role, **no drop shadow, no blur**. Over the aurora-lit canvas this reads as glass at a fraction of the cost.

**Vibrancy (NEW `.vibrancy`):** secondary text/icons sitting directly on thin/regular glass use `color: color-mix(in srgb, var(--color-ink) 62%, transparent)` so the material tints the type — apply to header meta, dock hints, tab labels at rest. Never on primary reading text.

**Rules & edges:**
- `.rule-double` survives in name only: now a single 1px `--color-line` divider (`border-top: 1px solid var(--color-line)`, `::after` removed). Same whitelist (modal titles, dossier section heads, suggestions header).
- `.gilt-rule` / `.rose-rule`: 2px light-streak rule fading at both ends, center `rgb(255 211 126 / 0.45)`; `.drawing` keeps the scaleX draw-in. `.rule-garnet` re-tints it garnet.
- `.kicker`: the 20×2px bar becomes a **glow dot** — a 6px circle, `border-radius: 9999px`, default rose, `box-shadow: 0 0 8px currentColor` at 40%; `.kicker-laurel` / `.kicker-garnet` re-tint. Label beside it in `--text-folio` sentence case.
- `.dot-leader`: retired visually — keep the class as a plain flex spacer (`border-bottom: none`). Rows justify with `justify-between` instead.
- `.seal-emboss`: becomes the **gem disc** — `background: linear-gradient(160deg, #D93A5C, var(--color-seal))`, `box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.35), inset 0 -2px 4px rgb(0 0 0 / 0.35), 0 2px 8px -2px rgb(176 36 64 / 0.5)`, initial in white 600 (not serif).

**Radii per role:** cards/rows/toasts 16px; bubbles 20px with a 6px corner toward the speaker's margin (them `20/20/20/6`, me `20/20/6/20`); panels/drawers 20px; modals/sheets 28px (sheets: top corners only); segmented control, capsule toolbar, chips-with-count, primary buttons: fully rounded pills.

**Spacing:** 4px grid holds. Rows `px-3.5 py-3` (a touch airier than v1); cards `p-4`; panel gutters `px-4`/`px-6`; modals `p-6`; thread column stays `max-w-[44rem]` centered.

---

## 5. Component recipes

**Primary button (the gem):** fully rounded pill, `background: linear-gradient(180deg, var(--color-accent), var(--color-accent-strong))`, `text-on-accent`, `px-4 py-2 text-label font-semibold`, `--shadow-plate` top-light. **Generate alone** adds `--shadow-gilt` (Law 4). Hover: gradient shifts lighter (`accent 90% → white 10%` mix). Press: **Squish** — `scale: 0.96` via `MotionButton` (§6) + fill dims to `accent-strong`. `.letterpress` keeps its name: now `transition` + `:active { box-shadow: var(--shadow-press) }` inner shade, no translate.

**Ghost button:** pill, 1px `--color-line-strong` border, `bg-fill` at rest? No — transparent at rest, `text-ink-secondary`; hover `bg-fill border-line-gilt text-accent`; press squish.

**Destructive ghost:** same skeleton; hover `border-danger/40 bg-danger-soft text-danger`. Solid danger only on modal confirm: `background: linear-gradient(180deg, #FF8A80, var(--color-danger))`, text `#2A0B08`.

**Icon button:** 28×28 visual, `rounded-full`, `text-ink-secondary`; hover `bg-fill text-ink`; destructive hover `text-danger bg-danger-soft`; press squish 0.92. Always `.hit` on coarse pointer.

**Focus ring:** `ring-2 ring-accent/70 ring-offset-2 ring-offset-canvas`; global `:focus-visible` outline fallback unchanged in mechanism, `border-radius: 10px`.

**Inputs / textarea:** `.glass-card` base at `--radius-sm` (12px), `bg-[rgb(255_255_255_/_0.05)]`, 1px `--color-line-strong` border, `text-body text-ink placeholder:text-ink-muted px-3.5 py-2.5`. Focus: border `--color-line-gilt` + `ring-[3px] ring-accent/15`. Min-h 44px, autogrow.

**Chips / tags:** pills — `rounded-full`, `--text-label` sentence case, `bg-fill` fill, no border at rest, `ink-secondary`; active chip `bg-accent-soft text-accent` + 1px `--color-line-gilt`. Tone chips: `background: <tone>/12%`, `ring-1 ring-<tone>/30`, text at the full tone value, `--text-folio` sentence case, `rounded-full`. Targeting chips are laurel pills with a trailing ×.

**Kbd:** keep `.kbd`; restyle — `rounded-[6px]`, `bg-fill`, 1px `--color-line-strong` (single-weight border, no thick bottom), `ink-secondary`, 11px tabular.

**Tooltips:** keep the `[data-tip]` mechanism; restyle to `.glass-panel` at `--radius-xs`, `px-2.5 py-1.5`, `--text-label` `ink-secondary`, `--shadow-sm`. 300ms delay, fade 120ms. Desktop only.

**List rows:** `--radius-md`, transparent at rest; hover `bg-fill`; active `bg-fill-active` + `--shadow-plate`. Title `--text-body`/600 `ink`; meta `--text-marginalia` `ink-muted`.

**Segmented control (replaces the tab-underline system):** the view tabs become an iOS segmented control — container pill `bg-[rgb(255_255_255_/_0.06)]`, `rounded-full`, `p-1`, inner 1px `--color-line`; the active segment is a **sliding glass thumb** — `bg-[rgb(255_255_255_/_0.12)]`, `rounded-full`, `--shadow-plate` + `--shadow-xs` — moved between segments with the existing `layoutId` (`"view-tab"`, aria-hidden) on `SPRING_MICRO`. Active label `text-ink` 600; inactive `.vibrancy`. The sort chips row keeps chip styling (not a second segmented control).

**Scrollbars:** thumb `rgb(255 255 255 / 0.14)`, hover `0.24`.

**Skeletons:** `.skeleton` keeps structure; base `rgb(255 255 255 / 0.05)`, shimmer `rgb(255 255 255 / 0.07)`, radius `--radius-md`.

**Status beam:** keep `.status-beam` exactly as wired; restyle the sweep to `linear-gradient(90deg, transparent, var(--color-garnet), var(--color-accent), var(--color-garnet), transparent)` with a soft glow (`filter: drop-shadow(0 1px 6px rgb(255 138 150 / 0.5))`), height 2px, 1.6s loop. Reduced motion: static 2px `--color-line-gilt` bar.

---

## 6. Motion vocabulary — iOS spring physics

Fluid, weighted, slightly bouncy — a sheet of glass settling, never a snap. Canonical exports in `src/components/motion.tsx`: **every name stays; values retune.**

```ts
export const EASE_INK = [0.32, 0.72, 0, 1] as const;   // the iOS sheet ease (name kept)
export const EASE_FADE = EASE_INK;                     // LEGACY alias
export const SPRING_MICRO:  Transition = { type: "spring", stiffness: 640, damping: 42 };            // segmented thumb, toggles — glides, no overshoot
export const SPRING_SETTLE: Transition = { type: "spring", stiffness: 320, damping: 26, mass: 0.8 }; // bubbles, cards, list items — one soft bounce
export const SPRING_SHEET:  Transition = { type: "spring", stiffness: 280, damping: 26, mass: 0.9 }; // modals, drawers, sheets — visible spring settle
export const SPRING_STAMP:  Transition = { type: "spring", stiffness: 500, damping: 16, mass: 0.7 }; // the queue gem pop (the one big overshoot)
export const SPRING_MODAL = SPRING_SHEET;   // LEGACY alias
export const SPRING_TOAST = SPRING_SHEET;   // LEGACY alias
export const DUR = { hair: 0.12, leaf: 0.18, page: 0.26, plate: 0.34,
                     fast: 0.12, base: 0.18, slow: 0.26, exitFast: 0.12, exitBase: 0.15 } as const;
```

**Variant retunes (names and keys unchanged):**
- `fadeUp(distance=10)` — enter `{opacity, y d→0}` on `SPRING_SETTLE` (was tween); exit fade+`y −d/2` 150ms `EASE_INK`.
- `viewVariants` — **Crossfade-and-breathe** (replaces Folio Turn): initial `{opacity 0, scale 0.985}`, enter `{opacity 1, scale 1}` 260ms `EASE_INK`, exit `{opacity 0, scale 0.99}` 150ms. No x-slide.
- `listContainer(35)` — unchanged mechanism.
- `listItem(capAt)` — `{opacity 0, y 8, scale 0.98} → {1, 0, 1}` on `SPRING_SETTLE`; cap bookkeeping unchanged.
- `bubbleVariants(from)` — `{opacity 0, y 10, scale 0.97} → {1, 0, 1}` on `SPRING_SETTLE`; `from` still ignored.
- `suggestionCardVariants` — **the float-in**: initial `{opacity 0, y 18, scale 0.96}` (rotate removed), enter per-index delay `i * 0.06` on `SPRING_SETTLE`, exit Melt (opacity + `blur(4px)`, 140ms).
- `meltVariants` — exit blur bumped to 4px, 140ms; enter unchanged.
- `sealVariants` — the **gem pop**: `{scale 0.4, opacity 0} → {1, 1}` on `SPRING_STAMP`, delay 0.08 kept.
- `railVariants` — capsule toolbar: `{opacity 0, y 6, scale 0.96} → {1, 0, 1}` 140ms `EASE_INK` in, fade 100ms out.
- `scrimVariants` — unchanged timings.
- `modalVariants` — `{opacity 0, y 24, scale 0.94} → {1, 0, 1}` on `SPRING_SHEET`; exit `{opacity 0, y 8, scale 0.97}` 160ms.
- `drawerVariants(side)` — spring `SPRING_SHEET` in (now with its softer settle), tween 200ms `EASE_INK` out.
- `sheetVariants` — `y 100%→0` on `SPRING_SHEET` (reads as the iOS sheet); exit tween 220ms `EASE_INK`.
- `toastVariants` — banner drop: `{opacity 0, y 16, scale 0.95} → {1, 0, 1}` on `SPRING_SHEET`; exit `{opacity 0, y 8, scale 0.97}` 150ms.
- `collapseVariants` — unchanged mechanism, `SPRING_SHEET`.
- `MotionButton` — **Squish**: `whileTap={{ scale: 0.96 }}` on `SPRING_MICRO` (replaces the y:0.5 letterpress press). Icon buttons may pass `whileTap={{ scale: 0.92 }}`.
- `ViewFade` — unchanged wrapper, inherits new `viewVariants`.

**Named micro-interactions:**
1. **Squish** — every button press: scale 0.96 (0.92 icons), `SPRING_MICRO`. Never translate.
2. **Thumb Glide** — segmented control / Ribbon Mark: `layoutId` slide on `SPRING_MICRO`.
3. **Crossfade-and-breathe** — view switches (above).
4. **Float In** — bubbles/cards rise with a soft scale settle (`SPRING_SETTLE`).
5. **Capsule Reveal** — hover toolbar + timestamp fade/rise, nothing reflows (`railVariants`).
6. **Light Streak** — `.gilt-rule.drawing` scaleX draw, 260ms, kept.
7. **Melt** — dismissals: opacity + 4px blur, 140ms.
8. **Match Strike** — copy-confirm: icon swaps to a check flaring `accent` → cooling to `laurel` over 400ms, holds 1s. Kept as-is with new hues.
9. **Gem Pop** — queue disc stamps in on `SPRING_STAMP`.

**Hover:** fill/border/vibrancy changes only — no lift, no scale (scale is reserved for press). **Reduced motion:** unchanged contract — `useAppReducedMotion()` + `rm()` strip to opacity-only ≤120ms; layoutId thumbs jump; aurora static at 0.8 opacity (`.speaking` opacity lift kept, opacity-only); shimmer text static; conic rings hidden; the CSS backstop stays.

---

## 7. Signature moments

### 7A. Suggestions arriving — floating glass
1. **Thinking:** below the composer, one 13px sans 500 line — **"Thinking…"** — with the shimmer sweep (`.animate-thinking` re-cut: sans, not serif; gradient `ink-muted → garnet → accent → ink-muted`, 2.2s). Generate wears the conic ring (`.wick-ring`; gradient `accent → garnet → accent`, 2.4s). The status beam runs; the aurora surges (`.speaking`). Mount the panel with 3 skeleton cards at final size so arrival is a crossfade, not a reflow.
2. **Arrival:** the suggestions panel (`.glass-panel`, radius 20) rises `y 16→0` on `SPRING_SHEET`; its top edge plays **Light Streak**; header reads **"Suggestions"** (`--text-folio` 600, sentence case) with the count as a plain number in a small pill.
3. **The float:** cards enter with `suggestionCardVariants` — 60ms stagger, each floating up with a soft scale settle. Skeletons Melt out.
4. The aurora holds bright ~1.6s, then eases back.

### 7B. The queue gem — committing a reply
Queue item enters with the 16px **gem disc** (`.seal-emboss` new recipe, §4) that **Gem Pops** in 80ms after its row. "Mark sent": the gem flashes laurel, the row Melts toward the thread (`x→24, opacity→0`), the me-bubble Floats In with a 12px mint check that fades after 1.6s. The motif recurs: sidebar unsent badge = a 6px garnet glow dot; dossier avatar = the gem disc at 64px.

### 7C. The floating capsule — desktop per-message actions
On fine-pointer hover (or focus-within) of a message row, a **floating frosted capsule** appears above the bubble's top edge on the message's margin side, never overlapping the previous bubble: `.glass-panel` material (this is one of the two sanctioned regular-tier blurs in the thread), **fully rounded pill**, `px-1.5 py-1`, `--shadow-md` + `--shadow-plate`, 1px `--color-line-strong`. Contents: 16px icons at 28×28 `rounded-full` — quote-reply, target, flip sender, reorder, edit — `ink-secondary`, hover `text-accent bg-fill`; a 1px vertical `--color-line` divider; delete hovers `text-danger bg-danger-soft`. Enter/exit via `railVariants` (Capsule Reveal); absolutely positioned, zero reflow. Keyboard: Tab-reachable within the row, Escape returns focus. Coarse pointer: never renders — long-press/tap opens the bottom sheet as today.

### 7D. Sheet & drawer physics
- Drawers (sidebar `<md`, facts `<xl`): `.glass-drawer` regular material, slide on `SPRING_SHEET`, 1px edge hairline, `--shadow-lg`; exit tween 200ms.
- Bottom action sheet: `.glass-modal` thick material, `y 100%→0` on `SPRING_SHEET` — the iOS sheet feel — radius 28 top corners, **grab handle** 36×5px `rounded-full` `rgb(255 255 255 / 0.25)`, safe-area padded. Rows 44px min; destructive row in danger under a hairline.
- Scrim: `rgb(4 5 10 / 0.60)` + `backdrop-blur(12px)`, fade 180/150ms.

### 7E. Generate — the one glowing thing
Full pill, rose gradient fill, `--shadow-gilt` halo, `⌘↵` kbd hint beside it. While thinking: conic ring + the shimmer line. It is the only element allowed a permanent glow (Law 4); everything else earns light only through focus or in-flight states.

---

## 8. Per-surface art direction

### Sidebar
Masthead on thin glass (`.plate`, h-16): the gem-disc monogram "C" at 24px, wordmark "Cyrano" in Inter 700 20px with the gold→white gradient text fill, subtitle "Reply copilot" in `--text-folio` `.vibrancy`. Below it the **segmented control** (§5) for Replies / Prompts / Scan — pill container, sliding glass thumb on `layoutId` `"view-tab"`. Search is a pill input with the magnifier inside; sort chips are pills. The list reads **inset-grouped**: rows at `--radius-md` with 8px horizontal inset, hover `bg-fill`, active row `bg-fill-active` + top-light + the **Ribbon Mark** reborn as a 20×3px gold `rounded-full` bar (`layoutId` `"conv-ink"`, Thumb Glide, glow `0 0 10px rgb(255 211 126 / 0.5)`). Row: name (14/600 `ink`) left, relative time right in `--text-marginalia` (no dot leader, no italic); second line platform pill + preview `ink-muted`. Unsent badge: 6px garnet glow dot. Footer: "N people · stored locally" in `--text-marginalia` `.vibrancy`.

### Conversation header
Thin glass bar, bottom hairline. Avatar: 36px gem disc whose 1px rose ring plays **Light Streak** on conversation switch. Name in `--text-persona` (upright 700, tight); platform pill beside it; icon buttons right, all `rounded-full`. Drawer button left on mobile, `.hit`.

### Thread & bubbles
Column `max-w-[44rem]`. **Them:** `.glass-card` neutral — `rgb(255 255 255 / 0.05)` + top-light, 1px `--color-line`, radius `20/20/20/6`. **Me:** gold-tinted glass — `bg-accent-soft`, 1px `--color-line-gilt`, radius `20/20/6/20`; never a solid gold fill. **Context notes:** floating chips — centered, max-w fit, pill radius, `bg-fill` + hairline, `--text-label` `ink-secondary`, a small note-icon replacing the asterism `⁂`. **Quoted-reply previews:** inside the bubble top — a rounded inset strip (`bg-fill`, radius 10) with a 2px gold left bar and the excerpt in `--text-marginalia` `ink-muted`, one line; tap scrolls to source. **Timestamps:** `--text-marginalia` in the margin ≥md, revealed on hover (Capsule Reveal), below the bubble on touch. **Targeted for reply:** bubble border swaps to `--color-line-laurel` + a laurel wash, with a small laurel tag "Replying to this" above. **Date dividers:** centered `--text-folio` `ink-muted` flanked by hairlines. **Editing:** input recipe inside the bubble; delete confirms in danger. Entrances: Float In, last-8 cascade kept.

### Suggestions panel & cards
Panel: `.glass-panel` regular material (one sanctioned blur), radius 20, header **"Suggestions"** + count pill + "Regenerate" ghost; arrival per §7A. Cards inside: `.glass-card` (simulated glass, no blur), radius 16, `p-4`. Top row: tone chip pill left; index as a quiet "1" in `--text-marginalia` `ink-faint` right (no «№»). Body `--text-bubble` `ink` (no drop cap). Multi-text options: parts separated by a hairline inset divider; each part row carries "1 of 3" in `--text-marginalia` and a 14px copy icon (Match Strike). Bottom action rail behind a hairline: **Use** (small gold pill), **Queue** (ghost pill with an 8px gem dot), **Redo** (ghost icon), **Copy**. Per-card regenerate: Melt out → Float In; the regenerating card wears its own thin conic ring. Error card: `bg-danger-soft` wash, plain-sans apology, Retry ghost.

### Reply queue
Collapsible tray under suggestions (`collapseVariants`). Header **"Queue"** in `--text-folio` 600 + count as a plain number in a garnet-tinted pill. Items: `.glass-card` rows radius 16 — gem disc left (Gem Pop), text 2-line truncated `--text-body`, tone pill, actions right ("Mark sent" → laurel treatment, Delete → danger ghost). Physics per §7B.

### Targeting bar & composer — the floating dock
The composer becomes a **floating rounded dock**: thin glass (`.plate`), but visually detached — `mx-3 mb-3` (plus safe-area), radius 20, 1px `--color-line`, `--shadow-md`; content no longer runs edge-to-edge. Above the field: targeting chips (laurel pills with ×) in a `collapseVariants` strip + "Replying to N messages" in `--text-marginalia`; quoted-preview strip with gold bar + ×. The field: one pill-ish input (radius 12), min-h 44px, autogrow 5 lines. Right rail: "Add as me / them / context" split ghost (labels unchanged — stable hooks); then **Generate** per §7E. Steer field below with the glow-dot kicker labeled "Steer"; avoid-list chips as pills.

### Mobile action sheet
Per §7D: thick glass, radius 28 top, grab handle. Header: message excerpt in `--text-marginalia` `ink-muted`, one line. 44px rows, 16px icons, labels `--text-body` `ink`; hairline; delete in danger; full-width ghost Cancel. Icons `ink-secondary`.

### PromptsLab
Glow-dot kicker "Profile prompts" above a `--text-scene` title **"Prompts"**, generous `pt-10`. Prompt input, mood/language selectors, avoid field per pill recipes. Generate carries the gilt glow here (it is this view's one glow). Answers reuse the suggestions card recipe verbatim — plain indices, tone pills, Float In arrival with skeletons, Match Strike copy. The panel header reads "Suggestions".

### ProfileScan
Same kicker + scene pattern, title **"Scan a profile"**. Dropzone: `.glass-card` at radius 20 with a 1.5px dashed `--color-line-strong` inner border and "Drop screenshots here" in `ink-muted`; on dragover the dash goes rose and the aurora surges (`.speaking`). Results are suggestion-style cards; extracted items show confidence as a tabular percentage beside a status dot (≥80% laurel, 50–79% rose, <50% `ink-muted`). Batch actions as ghost pills.

### PersonDossier + facts
Full-screen **thick-glass sheet** over scrim (`.glass-modal`), radius 28 top on mobile, enters `y 24→0` on `SPRING_SHEET`, `--shadow-lg`. Masthead: 64px gem disc; name in `.text-spread` (sans 700 clamp, upright); beneath, "In conversation since {date} · {n} messages" in `--text-marginalia`; then a single hairline (`.rule-double` new look). Pull-quote: one standout fact in 18px 500 `accent`, glow-dot above. Body ≥lg two columns: left 2/3 bio + facts grouped under glow-dot section labels; right 1/3 **"At a glance"** — a stat stack in `.glass-card` (label `ink-muted` left, tabular value `ink` right, hairline-separated rows). Facts are rows: text left, category pill right, edit/delete icons on hover (Capsule Reveal). `<lg`: single column, stats fold into a horizontal strip under the masthead. FactsPanel (xl drawer) reuses the same rows at compact density with the same add-fact input.

### Modals
Scrim per §7D. Panel: `.glass-modal` thick glass, radius 28, 1px `--color-line-strong`, `--shadow-lg` + top-light; enters via `modalVariants` (y 24, scale 0.94 spring). Title `--text-modal` with a hairline beneath. Footer actions right, primary rose pill last. Mobile `<sm`: bottom sheet, radius 28 top, grab handle. Destructive modals: title stays white; only the confirm button is danger.

### Empty states
`--text-display` heading in `ink`; one paragraph `--text-body` `ink-secondary` (no drop cap); a single ghost pill CTA. The aurora behind the glass is the illustration.

### Toast — iOS banner
`.glass-toast` regular material, **fully rounded pill** (single-line) or radius 16 (two-line), `--shadow-md` + top-light, 1px `--color-line-strong`. Left: an 8px glow dot — laurel success, garnet commitment, danger error. Message `--text-body` `ink`; time `--text-marginalia` right. Enter/exit via `toastVariants` (spring drop-settle). Keep current mount position; it should feel like a banner, not a card.

---

## 9. Blur budget & fallbacks

**Budget (hard, counted in review):** ≤ **6** `backdrop-filter` layers per screen state:
1. header plate, 2. composer dock, 3. suggestions panel (regular), 4. one hovered capsule toolbar, 5. toast, 6. one overlay pair (scrim + modal/drawer/sheet count as the overlay's two, replacing 3–5 while open — overlays cover them).
Bubbles, cards, rows, inputs, chips are **simulated glass** (§4) and never blur. Never nest a blurred pane inside another blurred pane except modal-over-scrim.

**`@supports not (backdrop-filter: blur(1px))`:** swap fills to solids — `.plate` → `rgb(16 18 32 / 0.94)`, `.glass-panel`/`.glass-drawer`/`.glass-toast` → `var(--color-surface)` at 0.96 alpha, `.glass-modal` → `var(--color-surface-high)`. All hairlines/shadows unchanged; contrast already verified against solid equivalents.

**`prefers-reduced-transparency: reduce`:** same solid swaps as above (media query alongside the `@supports` block), aurora opacity drops to 0.3.

**`prefers-reduced-motion: reduce` (CSS backstop, JS gated via `rm()`):** aurora drift off, static at 0.8 opacity (`.speaking` opacity-only lift kept); shimmer text static `ink-secondary`; conic rings hidden; skeleton shimmer off; status beam static rose; Light Streak renders complete; springs → duration 0.

**Performance:** blurred panes get `transform: translateZ(0)` only if paint flashing shows repaint storms; never animate `backdrop-filter` itself; the aurora animates `transform`/`opacity` only.

---

## 10. Microcopy — modern-casual pass

Sentence case, short, friendly. The editorial register is retired.

| Old (editorial) | New (v2) |
|---|---|
| "The proofs" / "The Proofs" | "Suggestions" |
| "Sealed & waiting" | "Queue" |
| "Setting type…" | "Thinking…" |
| "№ 1", "№ 2/3", "№ {count}" | "1", "2 of 3", plain count pill |
| "Éditions · Reply Copilot" | "Reply copilot" |
| "Marginalia" (dossier column label) | "At a glance" |
| "sealed & waiting" (dossier stat) | "in queue" |
| "The table of contents is empty." | "No conversations yet" |
| "The Prompt Desk" | "Prompts" |
| "The Scanner" | "Scan a profile" |
| "Lay the page here" | "Drop screenshots here" |
| "Conversations" (kicker) | "Conversations" (kept, sentence case styling) |
| "⁂" asterism dividers | hairline divider / note icon |
| "+ Start one" | "New conversation" |

**Stable test hooks — MUST NOT change (build contract):**
- All existing `aria-label` strings: "New conversation", "Search people", "Clear search", "Open conversations", "Open facts", "Edit context", "Delete context", "Copy this text", "Copy reply", "Queue reply", "Copy queued reply", "Remove target", "Clear steer", "Remove quote link", "Message actions", "Close", "Add fact", "Category for the new fact", "Delete fact", "Remove screenshot", "Loading", "Export a backup", "Import a backup".
- The composer placeholder containing **"latest message"** (`Paste {name}'s latest message…`).
- Button labels **"Add as me" / "Add as them" / "Add as context"**, **"Mark sent"**, **"Generate replies" / "Regenerate" / "Generate answers" / "Generate more"**, and the icon-button labels "Regenerate just this one" / "Regenerate this opener".

---

## Build checklist (cross-cutting)

- [ ] `layout.tsx`: fonts → Inter only (`--font-inter`); remove Fraunces + Instrument Sans; `themeColor: #0B0D16`.
- [ ] `globals.css`: full token swap per §2; aurora replaces lamp/ember (keep `.speaking`); grain to 0.02; material tiers `.plate` / `.glass-panel` (new) / `.glass-modal` / `.glass-drawer` / `.glass-toast` + `.glass-card` + `.vibrancy`; re-cut `.kicker` (glow dot), `.rule-double` (single hairline), `.gilt-rule`, `.seal-emboss` (gem), `.animate-thinking` (sans), `.wick-ring`, `.kbd`, `.skeleton`, scrollbars, `.status-beam`; neuter `.drop-cap`, `.dot-leader`, `.font-wonk`; keep `.hit`, tooltips, reduced-motion backstop; add `@supports` + `prefers-reduced-transparency` fallbacks (§9).
- [ ] `motion.tsx`: retune every export per §6 (same names/keys); `MotionButton` press → Squish scale 0.96; `suggestionCardVariants` drops rotate, gains scale.
- [ ] Per-surface passes per §8: segmented control in Sidebar, floating dock composer, capsule toolbar, gem discs, pill buttons everywhere; strip `font-display` / `italic` / `uppercase` / oldstyle-nums / dot-leader usage as encountered.
- [ ] Microcopy pass per §10 — stable hooks untouched.
- [ ] Review gates: one-glow audit (Law 4), pigment grammar, contrast table (§2), blur budget ≤6 (§9), material-tier correctness (no blur on cards/bubbles), radius roles (§4).

*Verification:* `npm run build` is the type gate; visual QA via Playwright from the scratchpad (screenshots at 375 / 768 / 1280 / 1680 px; app is dark-only, `color-scheme: dark`).
