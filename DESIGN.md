# CYRANO — DESIGN SPEC (final) · «ÉDITIONS MINUIT»

This document is the single source of truth for the UI rebuild. Six engineers build from it concurrently; where it conflicts with the current code, this document wins. It is a visual + motion rework only: zero behavior changes, no state/props/handler edits, keep the existing responsive skeleton (sidebar drawer `<md`, facts drawer `<xl`, action sheet on coarse pointer, `.hit` slop, safe-area padding). `fred_context.md` untouched.

---

## 1. Identity & principles

**Mood.** A private letterpress studio after dark, printing a fashion magazine no one else will ever read. Everything is ink on noir: warm brown-black paper, cream and champagne text, hairline rules, serif italics in the margins, and one drop of oxblood wax where something is committed. The old rose/violet glow is retired entirely — no cool hues in the chrome, no glass-candy, no blobs. Confidence comes from typography and rules, not color quantity. The page is quiet until Cyrano speaks, and then it warms like a lamp being turned up.

**Five laws (enforced in review):**

1. **Three pigments, one grammar (v1.1).** Color is meaning, never decoration — three pigment families, each owning one voice:
   - **Champagne** (`accent` family) — **the user's hand & the machine's chrome**: primary actions (Generate, Use), the ribbon mark, focus rings, quote-links, pinned facts, me-bubbles.
   - **Garnet** (`garnet`/`seal` family, the wax) — **Cyrano at work & commitments**: the suggestions panel arriving ("The Proofs" rule + sparkle), the thinking sheen, the status beam, wax-seal discs, queue №; as `danger`, destruction.
   - **Laurel** (`laurel` family, the garden) — **her side & memory**: reply-targeting (¶ marks, targeted bubbles, target chips), the fact library / Memory index (kickers via `.kicker-laurel`), plans, success ("Mark sent", sent toasts).
   Neutral surface + hairline still belongs to **the match's own words**. A pigment never borrows another's meaning; if an element could carry meaning, it must carry *that* pigment. Washes stay ≤12% (`-soft`) / 7% (`-faint`); pigment text uses only the documented text rungs (`accent` 11.2:1, `laurel` ~9:1, `garnet` 5.9:1 ≥12px).
2. **Hairlines do the work of boxes.** Surfaces are separated by 1px cream hairlines and the editorial double-rule, not by elevation contrast. Drop shadows exist only on floating layers (modals, sheets, toasts, popovers, the message toolbar). Flat inline cards get hairline + fill only.
3. **Serif speaks, sans works.** Fraunces = voice (names, titles, marginalia, anything Cyrano "says"). Instrument Sans = machinery (body, labels, buttons, meta). Never mix roles. No third family.
4. **The surgical-champagne audit.** At rest, a full screen shows at most **three** lit champagne objects (e.g. Generate, the ribbon mark, one focused input). If a fourth appears, demote one to ink/hairline. Count them in review.
5. **Blur is chrome-only.** `backdrop-filter` appears only on plate headers/dock, modal scrim, and toasts — ≤4 blurred layers on screen. Plate fills stay ≥0.92 alpha so text contrast never depends on what scrolls beneath.

---

## 2. Token sheet

Complete `@theme` ladder for `src/app/globals.css`. **Every existing token name keeps working** (values change); tokens marked `NEW` are added; tokens marked `LEGACY` are kept as aliases so unconverted call sites don't break, but new code must use the canonical name. OKLCH is the source of truth; hex is the compiled value used in the file.

```css
@theme {
  /* ── Fonts ─────────────────────────────────────────────── */
  --font-sans:    var(--font-instrument-sans, ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif);
  --font-display: var(--font-fraunces, Georgia, "Times New Roman", serif);

  /* ── Paper (surfaces — warm brown-black, OKLCH hue ~80) ── */
  --color-canvas:        #100E0A;   /* oklch(16.5% 0.008 80) — app bg, themeColor, ring-offset */
  --color-canvas-deep:   #080706;   /* oklch(11% 0.006 80) — bottom of body gradient; never #000 */
  --color-surface:       #191510;   /* oklch(21% 0.011 80) — cards' base, composer field, drawers, popovers */
  --color-surface-high:  #221D16;   /* oklch(25% 0.013 80) — modals, menus, toasts, action sheet */

  /* ── Plate (sticky chrome fill; used WITH backdrop-blur) ── */
  --color-plate:         rgb(25 21 16 / 0.92);   /* NEW — headers + composer dock */
  --color-glass:         rgb(25 21 16 / 0.92);   /* LEGACY alias of plate */
  --color-glass-heavy:   rgb(34 29 22 / 0.94);   /* LEGACY — modal/drawer fill if still referenced */

  /* ── Fills (interaction washes — cream, not white) ─────── */
  --color-fill:          rgb(242 236 222 / 0.045);
  --color-fill-hover:    rgb(242 236 222 / 0.075);
  --color-fill-active:   rgb(242 236 222 / 0.11);

  /* ── Hairlines (cream, not white) ──────────────────────── */
  --color-line:          rgb(242 236 222 / 0.09);   /* default 1px rule */
  --color-line-strong:   rgb(242 236 222 / 0.16);   /* input borders, kbd, toolbar borders */
  --color-line-gilt:     rgb(228 197 137 / 0.34);   /* NEW — champagne rules, focused inputs, targeted bubbles */
  --color-line-accent:   rgb(228 197 137 / 0.34);   /* LEGACY alias of line-gilt */

  /* ── Ink (cream ladder — contrast verified against #080706) ── */
  --color-ink:            #F2ECDE;  /* oklch(94% 0.017 90) ~16.9:1 — primary text */
  --color-ink-secondary:  #C3BAA5;  /* oklch(78% 0.02 88)  ~9.4:1 — secondary text, icons */
  --color-ink-muted:      #948B77;  /* oklch(63% 0.02 85)  ~5.6:1 — meta, placeholders, labels */
  --color-ink-faint:      #6A6255;  /* oklch(48% 0.015 82) — decorative / disabled ONLY */

  /* ── Champagne (the one metal — Cyrano's voice) ────────── */
  --color-accent:        #E4C589;  /* oklch(83% 0.08 85) — links, active, focus rings, gilt rules; 11.2:1 as text */
  --color-accent-strong: #CFA75F;  /* oklch(76% 0.09 80) — primary button fill, hover on accent */
  --color-accent-deep:   #8D6A31;  /* oklch(55% 0.09 75) — pressed fills only, NEVER text */
  --color-accent-soft:   color-mix(in oklch, #E4C589 12%, transparent);  /* me-bubble, active chip */
  --color-accent-faint:  color-mix(in oklch, #E4C589 7%, transparent);   /* hover washes */
  --color-on-accent:     #241B0C;  /* oklch(22% 0.03 80) — text on champagne fills */

  /* ── Wax (the user's commitments + destruction) ────────── */
  --color-seal:          #77281E;  /* NEW — oklch(38% 0.115 30) — wax-seal disc fill, record dots; never text */
  --color-seal-bright:   #E5836E;  /* NEW — oklch(70% 0.13 32) — small seal-colored text/icons (5.9:1) */
  --color-danger:        #E37257;  /* oklch(68% 0.15 30) — destructive text/icons */
  --color-danger-soft:   color-mix(in oklch, #E37257 12%, transparent);
  --color-success:       #A9C48F;  /* oklch(76% 0.07 130) — sage; "sent", success toasts */
  --color-success-soft:  color-mix(in oklch, #A9C48F 12%, transparent);

  /* ── Ember (LEGACY — deprecated; only inside shimmer/ring gradients until converted) ── */
  --color-ember:         #8D6A31;  /* remapped to accent-deep so old gradients read champagne */

  /* ── Radius (crisper — typeset blocks, not pebbles) ────── */
  --radius-xs:  3px;    /* NEW — chips, tags, kbd */
  --radius-sm:  6px;    /* buttons, inputs */
  --radius-md:  10px;   /* rows, suggestion cards, queue items, toasts */
  --radius-lg:  14px;   /* panels, bubbles */
  --radius-xl:  20px;   /* modals, sheets */
  --radius-2xl: 20px;   /* LEGACY alias of xl */

  /* ── Elevation ─────────────────────────────────────────── */
  --shadow-xs:    0 1px 2px 0 rgb(0 0 0 / 0.30);                    /* LEGACY, rarely used */
  --shadow-sm:    0 2px 8px -2px rgb(0 0 0 / 0.45);                 /* popovers */
  --shadow-md:    0 12px 32px -10px rgb(0 0 0 / 0.6);               /* menus, toasts, message toolbar */
  --shadow-lg:    0 32px 80px -20px rgb(0 0 0 / 0.8);               /* modals, dossier sheet */
  --shadow-plate: inset 0 1px 0 rgb(242 236 222 / 0.05);            /* NEW — top-light on every raised surface */
  --shadow-highlight: inset 0 1px 0 rgb(242 236 222 / 0.05);        /* LEGACY alias of plate */
  --shadow-press: inset 0 1.5px 0 rgb(255 255 255 / 0.25), inset 0 -1px 0 rgb(0 0 0 / 0.3); /* letterpress buttons at rest; inverted on :active */
  --shadow-gilt:  0 0 26px -8px rgb(228 197 137 / 0.45);            /* NEW — Generate button ONLY (the lamp) */
  --shadow-glow:  0 0 26px -8px rgb(228 197 137 / 0.45);            /* LEGACY alias of gilt */

  /* ── Type scale (see §3 for roles) ─────────────────────── */
  --text-folio:   0.6875rem;              /* NEW — 11px/16, sans 500, +0.08em, uppercase */
  --text-folio--line-height: 1rem;
  --text-folio--font-weight: 500;
  --text-folio--letter-spacing: 0.08em;
  --text-meta:    0.6875rem;              /* LEGACY — 11px meta; converge on folio or marginalia */
  --text-meta--line-height: 1rem;
  --text-meta--font-weight: 500;
  --text-marginalia: 0.75rem;             /* NEW — 12px/16, Fraunces italic 420 (bumped from 11.5 for legibility) */
  --text-marginalia--line-height: 1rem;
  --text-marginalia--font-weight: 420;
  --text-label:   0.75rem;                /* 12px/16, sans 500 — buttons, chips, meta rows */
  --text-label--line-height: 1rem;
  --text-label--font-weight: 500;
  --text-body:    0.875rem;               /* NEW — 14px/21, sans 400 — UI body, list previews */
  --text-body--line-height: 1.3125rem;
  --text-body--font-weight: 400;
  --text-bubble:  0.9375rem;              /* NEW — 15px/22, sans 400 — message + suggestion text */
  --text-bubble--line-height: 1.375rem;
  --text-bubble--font-weight: 400;
  --text-title:   1rem;                   /* 16px/22, sans 600, −0.01em — card/row titles */
  --text-title--line-height: 1.375rem;
  --text-title--font-weight: 600;
  --text-title--letter-spacing: -0.01em;
  --text-heading: 1.125rem;               /* LEGACY — 18px/24 sans 600; keep for stray uses */
  --text-heading--line-height: 1.5rem;
  --text-heading--font-weight: 600;
  --text-heading--letter-spacing: -0.01em;
  --text-persona: 1.5rem;                 /* 24px/28, Fraunces 480, −0.015em — conversation-header name (italic) */
  --text-persona--line-height: 1.75rem;
  --text-persona--font-weight: 480;
  --text-persona--letter-spacing: -0.015em;
  --text-modal:   1.375rem;               /* 22px/28, Fraunces 500, −0.01em — modal titles */
  --text-modal--line-height: 1.75rem;
  --text-modal--font-weight: 500;
  --text-modal--letter-spacing: -0.01em;
  --text-scene:   1.875rem;               /* 30px/36, Fraunces 420, −0.015em — PromptsLab / ProfileScan titles */
  --text-scene--line-height: 2.25rem;
  --text-scene--font-weight: 420;
  --text-scene--letter-spacing: -0.015em;
  --text-display: 2.125rem;               /* 34px/40, Fraunces 460, −0.015em — empty-state headings */
  --text-display--line-height: 2.5rem;
  --text-display--font-weight: 460;
  --text-display--letter-spacing: -0.015em;
  /* --text-spread — dossier name only: Fraunces italic, clamp(40px, 6vw, 64px)/1.05, wght 440, −0.02em.
     Tailwind sized-tokens can't clamp; ship as utility class .text-spread in globals.css. */

  /* ── Motion (CSS side; JS canon lives in motion.tsx §6) ── */
  --ease-ink:         cubic-bezier(0.22, 1, 0.36, 1);   /* NEW — canonical ease */
  --ease-out-soft:    cubic-bezier(0.22, 1, 0.36, 1);   /* LEGACY alias of ease-ink */
  --ease-in-out-soft: cubic-bezier(0.4, 0, 0.2, 1);     /* LEGACY — lamp breathing only */
  --ease-fade:        cubic-bezier(0.22, 1, 0.36, 1);   /* LEGACY alias of ease-ink */
}
```

**Body background:** `linear-gradient(180deg, #12100B 0%, #100E0A 45%, #080706 100%) fixed`, `background-color: var(--color-canvas)`.

**Tone chip inks (suggestion cards — exact, warm-rebalanced).** Each chip: `background: <color>/10%`, `ring-1 ring-<color>/25%`, text at the full value below, folio small-caps, tracking 0.1em, radius `--radius-xs`. Define as `--color-tone-*`:

| Tone | Hex | Note |
|---|---|---|
| `--color-tone-dry` | `#B9B2A4` | |
| `--color-tone-playful` | `#E2B34E` | |
| `--color-tone-curious` | `#8FB0C9` | the only cool ink, chip-internal only |
| `--color-tone-flirty` | `#E5836E` | wax family — flirt is commitment |
| `--color-tone-sincere` | `#A9C48F` | |
| `--color-tone-bold` | `#B49CD8` | |
| unknown tone | `ink-secondary` on `--color-fill` | fallback |

**Pigment families (v1.1 — the grammar in Law 1).** Rungs mirror the accent family; `*-strong`/`*-deep` are never text:

| Token | Value | Role |
|---|---|---|
| `--color-garnet` | `#E5836E` | garnet text/icons (= seal-bright; ≥12px) |
| `--color-garnet-strong` | `#B04A38` | garnet fills/borders |
| `--color-garnet-soft/-faint` | 12% / 7% mix | wax washes |
| `--color-line-garnet` | `rgb(197 106 88 / 0.38)` | wax hairlines (`.rule-garnet`, `.kicker-garnet`) |
| `--color-laurel` | `#A9C48F` | laurel text/icons (~9:1) |
| `--color-laurel-strong` | `#7E9C66` | laurel fills/borders |
| `--color-laurel-deep` | `#3A4A2C` | pressed fills only |
| `--color-laurel-soft/-faint` | 12% / 7% mix | garden washes (targeted bubbles) |
| `--color-line-laurel` | `rgb(146 178 118 / 0.38)` | laurel hairlines (`.kicker-laurel`) |
| `--color-on-laurel` | `#131A0C` | text on laurel fills |

`--color-success*` are legacy aliases of laurel.

**Contrast invariants (hard):** never `accent-deep`, `seal`, `laurel-deep`, or `ink-faint` as functional text on canvas; plate fills ≥0.92 alpha under text; tone-chip text colors are exactly the values above; `seal-bright`/`garnet` only at ≥12px or icon sizes.

---

## 3. Typography

**Fonts (next/font/google, in `layout.tsx`):**

```ts
const fraunces = Fraunces({ subsets: ["latin"], axes: ["SOFT", "WONK", "opsz"], variable: "--font-fraunces" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument-sans" });
```

Inter is removed. Fraunces defaults: `font-optical-sizing: auto`, `font-variation-settings: "SOFT" 0, "WONK" 0` (note: SOFT drops from the current 50 to **0** — sharper serifs for the letterpress read). Keep the existing `.font-display` class (unlayered, same name) updated to SOFT 0; `.font-wonk` sets `"WONK" 1` and appears in exactly one place: the wordmark.

**Roles.** Fraunces = the voice: names, view/modal titles, marginalia, empty-state headings, anything Cyrano "says". Instrument Sans = the machinery: body, bubbles, labels, buttons, meta. **Timestamps and marginal notes are Fraunces italic** (`--text-marginalia`) — this is the signature; never set marginalia in the sans.

| Token | Font | Size/Line | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `--text-folio` | Instrument Sans | 11/16 | 500 | +0.08em, uppercase | kickers, section labels, tone chips, platform tags |
| `--text-marginalia` | Fraunces *italic* | 12/16 | 420 | 0 | timestamps, marginal notes, "№" folios |
| `--text-label` | Instrument Sans | 12/16 | 500 | 0 | buttons, chips, meta rows |
| `--text-body` | Instrument Sans | 14/21 | 400 | 0 | UI body, list previews |
| `--text-bubble` | Instrument Sans | 15/22 | 400 | 0 | message + suggestion text |
| `--text-title` | Instrument Sans | 16/22 | 600 | −0.01em | card/row titles |
| `--text-persona` | Fraunces *italic* | 24/28 | 480 | −0.015em | conversation-header name |
| `--text-modal` | Fraunces | 22/28 | 500 | −0.01em | modal titles |
| `--text-scene` | Fraunces | 30/36 | 420 | −0.015em | PromptsLab / ProfileScan view titles |
| `--text-display` | Fraunces | 34/40 | 460 | −0.015em | empty-state headings |
| `.text-spread` | Fraunces *italic* | clamp(40px,6vw,64px)/1.05 | 440 | −0.02em | dossier name ONLY |

- **Wordmark:** "Cyrano" in Fraunces italic 22px `"WONK" 1` — the only WONK in the app — over a folio kicker "ÉDITIONS · REPLY COPILOT" in `ink-muted`.
- **Drop cap** (`.drop-cap::first-letter`): Fraunces 500, 58px/48px float cap in `--color-accent`, 1px `--color-line-gilt` underline, `padding: 2px 10px 3px 0`. Used ONLY on: the empty-state paragraph, the dossier bio first paragraph, and suggestion card № 1's first line. Nowhere else. (If it proves fussy inside suggestion cards during build, the sanctioned fallback is: drop it from cards, keep empty state + dossier — do not invent a smaller cap.)
- **Numerals:** `tabular-nums` on all counts/times set in the sans; folio numbers ("№ 2") in Fraunces with `font-variant-numeric: oldstyle-nums`.

---

## 4. Surface language

**Canvas.** Body gradient above; `--color-canvas` remains the flat token for ring-offsets and `themeColor`.

**Backdrop — "The Reading Lamp"** (replaces the three blobs; delete all `cyrano-blob-*` keyframes). The app root (`.app-backdrop`) gets exactly two fixed, `z-index:-1`, `pointer-events:none` layers (pseudo-elements as today):

1. **Lamp** (`::before`): `radial-gradient(1100px 700px at 22% -8%, rgb(228 197 137 / 0.07), transparent 62%)` — warm pool upper-left. Breathes `transform: scale(1→1.04)` over 45s alternate, `--ease-ink`. On `.app-backdrop.speaking` (any LLM in flight/arriving) its opacity lifts 0.75 → 1 over 800ms — *the lamp turns up when Cyrano speaks*. Keep the existing `.speaking` class contract.
2. **Ember** (`::after`): `radial-gradient(900px 480px at 82% 108%, rgb(119 40 30 / 0.05), transparent 60%)` — static wax warmth, lower right. No animation.

**Grain:** one `body::after` fixed layer, `opacity: 0.035`, `mix-blend-mode: overlay`, background = inline data-URI SVG `feTurbulence` (fractalNoise, baseFrequency 0.9, 128×128 tile). Self-contained CSS, no asset files. If it moirés on any screen, drop to 0.02 — never remove.

**Plate (sticky chrome):** headers + composer dock use `background: var(--color-plate)` + `backdrop-filter: blur(14px) saturate(1.15)` + `--shadow-plate` inset + a 1px `--color-line` edge hairline. Replace `.glass-header`/`.glass-dock` recipes with one `.plate` class; `.glass-modal`/`.glass-drawer` die — modals/drawers become opaque `surface-high`/`surface` (see §8).

**Cards (flat, inline):** `bg-surface` + optional `background-image: linear-gradient(rgb(242 236 222 / 0.02), transparent)`, 1px `--color-line` border, `--radius-md`, `--shadow-plate` inset, **no drop shadow**.

**Floating layers:** `bg-surface-high`, 1px `--color-line-strong` border, `--shadow-md` (menus/toasts/toolbar) or `--shadow-lg` (modals/dossier), plus `--shadow-plate`.

**Rules:**
- Default separator: 1px `--color-line`.
- Gilt rule: 1px or 2px `--color-line-gilt`; when it "arrives", it **Rule Draws** (§6).
- **Double rule** (`.rule-double`, signature): `border-top: 2px solid var(--color-line-strong)` plus an `::after` 1px `--color-line` line positioned 3px below. Used ONLY under modal titles, dossier section heads, and the suggestions panel header.
- Kicker (`.kicker`): keep the existing 20×2px bar-above-label utility, recolored to `--color-line-gilt`, label in `--text-folio` `ink-muted`.
- `.rose-rule` is renamed `.gilt-rule` (keep `.rose-rule` as alias until converted): 2px top rule fading to transparent at ends, `rgb(228 197 137 / 0.34)` center; `.drawing` replays the scaleX draw-in.

**Radii:** bubbles are asymmetric — them `14px 14px 14px 4px`, me `14px 14px 4px 14px` (the 4px corner points at the speaker's margin). Everything else per the radius tokens.

**Spacing:** strict 4px grid. Rows `px-3 py-2.5`; cards `p-4`; panel gutters `px-4` (mobile) / `px-6` (≥sm); modals `p-6`; section stacks `space-y-2`; thread column `max-w-[44rem]` centered — the correspondence sits in white space like a magazine measure.

---

## 5. Component recipes

**Primary button ("letterpress"):** `bg-accent-strong text-on-accent rounded-[6px] px-3.5 py-1.5 text-label shadow-[--shadow-press]`. Hover: `bg-accent`. Active ("Kiss Impression"): `translate-y-[0.5px]`, shadow-press inverted (`inset 0 -1.5px 0 rgb(255 255 255/0.25), inset 0 1px 0 rgb(0 0 0/0.3)`), fill `color-mix(in oklch, var(--color-accent-strong) 82%, var(--color-accent-deep))`. No scale on press — replace `MotionButton`'s `whileTap scale` with the translate+shadow treatment (or `scale: 1` + class toggle).

**Ghost button:** `border border-[--color-line-strong] rounded-[6px] text-ink-secondary bg-transparent`; hover `border-[--color-line-gilt] bg-fill text-accent`.

**Destructive ghost:** same skeleton; hover `border-danger/40 bg-danger-soft text-danger`. Solid danger fill only on modal confirm buttons: `bg-danger text-[#2A0F08]`.

**Icon button:** 28×28 (visual), `rounded-[6px]`, `text-ink-secondary`; hover `bg-fill text-ink`; destructive icons hover `text-danger bg-danger-soft`. Always `.hit` on coarse pointer.

**Focus ring (everywhere):** `ring-2 ring-accent/60 ring-offset-2 ring-offset-canvas`. Global `:focus-visible` fallback: `outline: 2px solid var(--color-accent); outline-offset: 2px`.

**Inputs / textarea:** `bg-surface border border-[--color-line-strong] rounded-[6px] text-body text-ink placeholder:text-ink-muted px-3 py-2`. Focus: `border-[--color-line-gilt]` + `ring-[3px] ring-accent/12`, no outline. Textareas autogrow, min-h 44px.

**Chips / letterpress tags:** folio caps 10–11px, 1px `--color-line-strong` border, `--radius-xs`, no fill, `ink-muted`; active chip `bg-accent-soft border-[--color-line-gilt] text-accent`. Tone chips per §2 table. Targeting chips get a trailing × icon button.

**Kbd:** keep the `.kbd` recipe; recolor: 1px `--color-line-strong`, 2px bottom border, `--radius-xs`, `bg-fill`, `ink-secondary`, 11px tabular.

**Tooltips:** `bg-surface-high border border-[--color-line-strong] rounded-[6px] px-2 py-1 text-folio text-ink-secondary shadow-sm`, 300ms hover delay, fade 120ms `--ease-ink`, no arrow. Desktop only.

**List rows:** `--radius-md`, `px-3 py-2.5`; rest transparent; hover `bg-fill`; active `bg-fill-active` (+ Ribbon Mark where applicable §6). Title in `--text-body`/600 ink; meta in marginalia `ink-muted`.

**Tab indicator:** text-only folio caps tabs (`ink-muted`, active `text-accent`); a 2px champagne underline slides between tabs via `layoutId` (`"view-tab"`, aria-hidden) on `SPRING_MICRO`. No filled pill anywhere.

**Scrollbars:** keep thin recipe, recolor thumb to `rgb(242 236 222 / 0.14)`, hover `0.22`.

**Skeletons:** `.skeleton` keeps its structure; shimmer gradient warmed to `rgb(242 236 222 / 0.05)`.

**Status beam (NEW, global):** a fixed 2px top-edge bar, hidden at rest. While any LLM call is in flight (single in-flight counter in `page.tsx` covering suggestions, prompts, thread parse, scan), it shows an indeterminate champagne sweep: `linear-gradient(90deg, transparent, var(--color-accent), transparent)` at 30% width translating across, 1.6s linear loop. On settle it fades out 300ms. `pointer-events:none`, `aria-hidden`. Reduced motion: static 2px `--color-line-gilt` bar while in flight.

---

## 6. Motion vocabulary

Deliberate, weighted, brief — a press, not a bounce. Everything ≤350ms. Canonical exports in `src/components/motion.tsx` (keep the module as the single import point; legacy names stay as aliases):

```ts
export const EASE_INK = [0.22, 1, 0.36, 1] as const;                                  // canonical fades/slides
export const EASE_FADE = EASE_INK;                                                    // LEGACY alias
export const SPRING_MICRO:  Transition = { type: "spring", stiffness: 560, damping: 32 };            // tab ink, ribbon mark, toggles
export const SPRING_SETTLE: Transition = { type: "spring", stiffness: 300, damping: 30 };            // bubbles, list items
export const SPRING_SHEET:  Transition = { type: "spring", stiffness: 340, damping: 34 };            // modals, drawers, action sheet, panels
export const SPRING_STAMP:  Transition = { type: "spring", stiffness: 480, damping: 20, mass: 0.9 }; // wax seal ONLY (the one overshoot)
export const SPRING_MODAL = SPRING_SHEET;   // LEGACY alias
export const SPRING_TOAST = SPRING_SHEET;   // LEGACY alias
export const DUR = { hair: 0.12, leaf: 0.18, page: 0.24, plate: 0.32,
                     fast: 0.12, base: 0.18, slow: 0.24, exitFast: 0.12, exitBase: 0.15 } as const; // last five LEGACY
```

Rules: transform + opacity only (exception: ≤120ms blur on **Melt** exits, dropped under reduced motion). Variant factories (`fadeUp`, `viewVariants`, `listContainer`, `listItem`, `bubbleVariants`, `suggestionCardVariants`, `scrimVariants`, `modalVariants`, `drawerVariants`, `sheetVariants`, `toastVariants`, `collapseVariants`) keep their names and key shapes; retune to the springs above. Reserved `layoutId`s: `"view-tab"`, `"conv-ink"` (ribbon mark); both aria-hidden.

**Named micro-interactions (build exactly these):**

1. **Kiss Impression** — every primary button press: `translateY(0.5px)` + shadow-press inversion, 120ms `EASE_INK`. No scale.
2. **Ribbon Mark** — sidebar active conversation: a 2×20px champagne vertical rule at the row's left edge, `layoutId="conv-ink"`, slides between rows on `SPRING_MICRO`, glow `0 0 8px rgb(228 197 137 / 0.5)`.
3. **Folio Turn** — view switches (Replies/Prompts/Scan): outgoing `opacity→0, x→−8` (180ms), incoming `opacity 0→1, x 8→0` (240ms `EASE_INK`), `AnimatePresence mode="wait"`. Tab underline slides via `layoutId` on `SPRING_MICRO`. (Update `viewVariants` from y to x.)
4. **Ink Rise** — new bubble: `opacity 0→1, y 8→0` on `SPRING_SETTLE` (bubbles no longer slide on x or scale). Conversation mount cascades only the last 8 messages, 35ms stagger (keep existing `listItem` cap bookkeeping, set capAt for bubbles accordingly).
5. **Marginalia** — hovering a message row fades in its timestamp + action toolbar, `opacity 0→1` 120ms; **nothing moves or reflows**. Touch: actions live in the bottom sheet as today.
6. **Rule Draw** — any gilt hairline that "arrives" (suggestions panel top edge, header avatar ring on conversation switch): `scaleX 0→1`, transform-origin left, 260ms `EASE_INK`, once per arrival.
7. **Melt** — dismissals / cards being regenerated: `opacity→0, filter: blur(2px)`, 120ms.
8. **Match Strike** (copy-confirm): the copy icon swaps to a check that flares `--color-accent` bright, then cools to `--color-success` over ~400ms, holds 1s, reverts. Reduced motion: instant swap to sage check.

**Hover behavior:** rows/cards change fill and border only — no lift, no scale. **Press:** Kiss Impression on primaries; ghosts get `bg-fill-active` 80ms.

**Reduced motion (required — JS-gated via `useAppReducedMotion()` + `rm()`, and the CSS `prefers-reduced-motion` backstop as today):** all springs → `{ duration: 0 }`; enters become opacity-only ≤120ms; Ribbon Mark / tab ink jump without layout animation; Rule Draw renders complete; Wax Seal appears at scale 1 (color changes keep); lamp static at 0.85 opacity, no breathing — the `.speaking` opacity lift (opacity-only) is permitted and kept; shimmer/"Setting type…" text becomes static `ink-secondary`; conic rings hidden; grain unaffected (it's static).

---

## 7. Signature moments

### 7A. "Pulling the Proof" — how suggestions arrive
1. **Thinking:** below the composer, one Fraunces italic 13px line — *"Setting type…"* — with a champagne sheen sweeping through it (rebuild `.animate-thinking`: text-clip gradient `ink-muted → accent → ink-muted`, background-size 200%, 2.2s linear loop). The Generate button wears the 2px conic gilt ring (keep `.wick-ring` mechanics; gradient becomes `accent → accent-deep → accent`, 2.4s). The **status beam** (§5) runs. Simultaneously, mount the proofs panel with **3 skeleton galleys** (card-shaped `.skeleton` blocks at final card size) so layout is reserved and arrival is a cross-fade, not a reflow jump.
2. **Arrival:** panel rises `y 12→0, opacity 0→1` on `SPRING_SHEET`; its top edge **Rule Draws** a gilt hairline; the header reads **"THE PROOFS"** in folio caps with `.rule-double` beneath. Skeletons Melt out.
3. **The deal:** cards enter one at a time, 70ms stagger, each `y 10→0, opacity 0→1, rotate −0.6deg→0` on `SPRING_SETTLE` — hand-dealt, not machine-stacked. Each card carries `№ 1…` in Fraunces marginalia top-right; **card № 1's first line gets the drop cap**.
4. The **Reading Lamp turns up** (`.speaking`) for ~1.6s, then eases back.

Reduced motion: panel + cards fade in together (no stagger/rotate), drop cap and rules intact, lamp opacity-only.

### 7B. "The Wax Seal" — committing a reply
- **Queue:** the queue item enters with a 16px oxblood disc (`--color-seal` fill; emboss `inset 0 1px 2px rgb(0 0 0/0.5), inset 0 -1px 0 rgb(255 255 255/0.08)`; a 9px Fraunces initial of the person in `seal-bright`) that **stamps in** — `scale 0 → 1.12 → 1` on `SPRING_STAMP`, arriving 80ms after the row.
- **Mark sent:** the seal flashes `--color-success`; the row **Melts** toward the thread (`x→24, opacity→0`); the corresponding me-bubble **Ink Rises** with a 12px sage check-seal that fades after 1.6s.
- The motif recurs quietly: sidebar unsent-queue badge = seal-colored dot; dossier avatar = Fraunces initial on an oxblood emboss disc.

Reduced motion: seal appears at scale 1; color changes keep.

### 7C. "The Compositor's Rail" — desktop per-message actions
**The old cramped icon grid is banned.** On fine-pointer hover (or keyboard focus-within) of a message row, a single **floating pill toolbar** appears, anchored just above the bubble's top edge on the message's margin side (them → left-aligned, me → right-aligned), never overlapping the text of the previous bubble:

- Container: `bg-surface-high` (opaque), 1px `--color-line-strong` border, **fully rounded pill** (`rounded-full`), `--shadow-md` + `--shadow-plate`, `px-1 py-0.5`.
- Contents: 16px icon buttons at 28×28 — quote-reply, target, flip sender, reorder (up/down), edit — in `ink-secondary`, hover `text-accent bg-fill`; then a 1px vertical `--color-line` divider; then delete in `ink-secondary`, hover `text-danger bg-danger-soft`. Tooltips per §5 label each.
- Enter: `opacity 0→1, y 4→0`, 120ms `EASE_INK` (part of **Marginalia** — the timestamp fades in at the same moment in the margin). Exit: fade 100ms. No layout shift ever; the rail is absolutely positioned.
- Keyboard: the rail is reachable with Tab within the focused row; Escape returns focus to the row.
- Touch/coarse pointer: the rail never renders; long-press/tap opens the bottom action sheet exactly as today.

### 7D. Sheet & drawer physics
- Drawers (sidebar `<md`, facts `<xl`): slide on `SPRING_SHEET` (`drawerVariants` retuned), opaque `bg-surface`, edge hairline `--color-line-strong`, `--shadow-lg`; exit tween 180ms `EASE_INK`. Scrim below.
- Bottom action sheet (coarse pointer): `y 100%→0` on `SPRING_SHEET`, `bg-surface-high`, radius 20 top corners only, drag-handle bar 36×4px `--color-line-strong`, safe-area padded. Rows are list-row recipe at 44px min height; destructive row in danger at the bottom under a hairline.
- Scrim (all): `rgb(8 7 6 / 0.72)` + `backdrop-blur(8px)`, fade 180ms in / 150ms out.

---

## 8. Per-surface art direction

### Sidebar — "Table of Contents"
Masthead (h-16, `.plate`, bottom hairline): the heart glyph is replaced by a 24px seal-emboss monogram "C" (Fraunces, on a `--color-seal` disc, emboss per §7B); wordmark "Cyrano" Fraunces italic WONK 22px; kicker "ÉDITIONS · REPLY COPILOT" folio caps `ink-muted`. View tabs: text-only folio caps + Folio Turn underline (no pill). Search + sort keep behavior, restyled to input/chip recipes. Section label "CONVERSATIONS" uses `.kicker` (gilt bar + folio caps).
**Rows are TOC entries:** name (sans 14/600 `ink`) and relative time (Fraunces marginalia `ink-muted`) joined by a **dot leader** — a flex-1 element with `border-bottom: 1px dotted rgb(242 236 222 / 0.18)` baseline-aligned between them, hidden when the row is narrower than 220px. Second line: platform as a letterpress tag + last-message preview `ink-muted` truncated. Unsent-queue badge: 6px `--color-seal-bright` dot after the name. Active row `bg-fill-active` + **Ribbon Mark**; hover `bg-fill`. Skeletons: 5 rows, warmed shimmer, opacity cascading. Footer: "N people · stored locally" in marginalia italic `ink-muted`.

### Conversation header
`.plate` bar, bottom hairline. Avatar: 36px seal-emboss initial disc whose 1px gilt ring **Rule Draws** on conversation switch. Name in `--text-persona` Fraunces italic `ink`; platform letterpress tag beside it; actions (dossier, edit, import, delete) as icon buttons right. On mobile the drawer-open button sits left, `.hit`.

### Thread & bubbles — "The Correspondence"
Column `max-w-[44rem]` centered.
- **Them:** `bg-surface`, 1px `--color-line` border, radius `14/14/14/4`, `--text-bubble` `ink`.
- **Me:** `bg-accent-soft`, 1px `--color-line-gilt` border, radius `14/14/4/14`, `--text-bubble` `ink` — gilt-edged, never solid gold.
- **Context notes:** full-width editor's note — centered Fraunces italic 13px `ink-secondary`, an asterism `⁂` in `ink-faint` above, no bubble, no hairlines.
- **Quoted replies (Instagram-style preview inside the bubble top):** 2px champagne left rule + quoted excerpt in Fraunces italic 12px `ink-muted`, single line truncated; tap scrolls to source as today.
- **Timestamps:** Fraunces marginalia; ≥md in the margin beside the bubble, revealed by **Marginalia** hover; below the bubble on touch.
- **Targeted for reply:** bubble border swaps to full `--color-line-gilt` + a marginalia tag "¶ replying to this" in `accent` above the bubble.
- **Date/section dividers:** centered folio caps `ink-muted` flanked by 1px hairlines (`flex items-center gap-3`).
- **Editing state:** border `--color-line-gilt`, inner textarea per input recipe; delete confirms in danger. Desktop actions via the Compositor's Rail (§7C); touch via the action sheet.
- Entrances: **Ink Rise**; mount cascade last 8 only.

### Suggestions panel & cards — "The Galleys"
Panel header "THE PROOFS" folio caps + `.rule-double`; top edge gilt **Rule Draw** on arrival; arrival choreography per §7A (including skeleton galleys and the lamp).
Card: `bg-surface` + `linear-gradient(rgb(242 236 222 / 0.02), transparent)` overlay, 1px `--color-line` border, `--radius-md`, `p-4`, `--shadow-plate`, **no drop shadow**. Top row: tone chip left (tone inks §2); `№ n` Fraunces marginalia `ink-faint` right (oldstyle nums). Body `--text-bubble` `ink`; card № 1 gets the drop cap. **Multi-text options:** parts separated by a small centered `⁂` divider, and each part is individually copyable — a per-part row with a Fraunces oldstyle index gutter ("№ 1/3") and a 14px copy icon that plays **Match Strike** on copy. Bottom action rail behind a 1px top hairline: **Use** (small primary letterpress), **Queue** (ghost, label carries an 8px seal dot), **Redo** (ghost icon), **Copy** (whole card, Match Strike). Regenerating one card: **Melt** out → swap-in `y 4→0` 180ms; the regenerating card wears its own thin gilt conic ring. Error card: `bg-danger-soft` wash, Fraunces italic apology line, Retry ghost.

### Reply queue — "Outbox, sealed"
Collapsible tray under suggestions (`collapseVariants`). Header "SEALED & WAITING" folio caps + count in marginalia. Items: `--radius-md` rows — **Wax Seal** disc left (§7B), text truncated 2 lines `--text-body`, tone letterpress tag, actions right (Send → success treatment, Delete → danger ghost). Enter/exit per §7B.

### Targeting bar & composer — "The Writing Desk"
Docked `.plate` bar (blur allowed), 1px top hairline, safe-area padded.
- **Targeting chips** above the field: letterpress tags with × affordance, in a `collapseVariants` strip; "replying to N messages" in marginalia.
- **Quoted-reply preview strip** above the field: gilt left rule + Fraunces italic excerpt + ×.
- **Field:** one framed input (recipe §5), min-h 44px, autogrows to 5 lines.
- **Right rail:** "Add as me / them / note" split ghost; then **Generate** — the only lit object on the desk: primary letterpress + `--shadow-gilt`, conic gilt ring while thinking, `⌘↵` keycap hint (`.kbd`).
- **Steer field:** secondary framed input labeled with folio kicker "STEER"; avoid-list chips as letterpress tags.

### Mobile action sheet
Per §7D physics. Header: message excerpt in Fraunces italic `ink-muted`, single line. Actions as 44px rows with 16px icons: quote-reply, target, flip sender, move up/down, edit; hairline; delete in danger. Cancel is a full-width ghost at the bottom. Icons `ink-secondary`, labels `--text-body` `ink`.

### PromptsLab — "The Prompt Desk"
Folio kicker ("PROFILE PROMPTS") above a `--text-scene` Fraunces title "The Prompt Desk", generous `pt-10`. Prompt input, mood/language selectors, avoid field per input/chip recipes. Answers reuse the Galley card recipe **verbatim** — № folios, tone chips where applicable, Pulling-the-Proof arrival (skeletons, stagger, rotate, lamp), Match Strike copy.

### ProfileScan — "The Scanner"
Same kicker + scene-title pattern ("The Scanner"). Dropzone: 1.5px dashed `--color-line-strong` frame, `--radius-lg`, centered Fraunces italic "Lay the page here" in `ink-muted`; on dragover the dash goes `--color-line-gilt` and the lamp brightens (`.speaking`). Results are Galley cards; each extracted item shows **scan confidence as a tabular percentage** beside a small status dot (≥80% sage, 50–79% champagne, <50% `ink-muted`). Batch actions as ghost buttons.

### PersonDossier + facts — "The Profile Spread"
Full-screen sheet over scrim, `bg-canvas` with its own lamp gradient, enters `y 24→0` on `SPRING_SHEET`, `--shadow-lg`. **Masthead:** 64px oxblood seal-monogram; name in `.text-spread` Fraunces italic; beneath, marginalia "in conversation since {date} · {n} letters"; then a full-width `.rule-double`. **Pull-quote:** one standout fact rendered as Cyrano's aside — Fraunces italic 20px in `--color-accent`, set under the masthead with a short gilt rule above. Body ≥lg is a **two-column spread**: left 2/3 — bio/notes with `.drop-cap` on the first paragraph, then facts grouped under kicker-labeled sections; right 1/3 — marginalia column (stats, platform, last contact) in Fraunces italic `ink-muted`, hanging against a 1px left hairline. **Facts are index entries:** fact text left, category letterpress tag right, joined by dot leaders; edit/delete icons appear on row hover (Marginalia fade). `<lg`: single column; the marginalia column becomes a **telemetry strip** — a hairline-separated row of tabular-numeral stats (messages · facts · platform · first seen) under the masthead. The facts panel (xl drawer) uses the same index-entry rows at compact density with kicker headers and the same add-fact input recipe.

### Modals — "The Plates"
Scrim per §7D. Panel: opaque `bg-surface-high`, `--radius-xl` (20), 1px `--color-line-strong` border, `--shadow-lg` + `--shadow-plate`; enters `y 16→0, scale 0.98→1` on `SPRING_SHEET`. Title in `--text-modal` Fraunces with `.rule-double` beneath spanning the content width. Body inputs per §5. Footer actions right-aligned, primary letterpress last. Mobile `<sm`: bottom sheet, radius 20 top only, drag handle. Import-thread textarea gets marginalia helper text. Destructive modals: title stays cream; only the confirm button is danger.

### Empty states
`--text-display` Fraunces heading; one `.drop-cap` paragraph in `ink-secondary`; a single ghost CTA. No illustration — the typography is the illustration. The "no messages yet" mini-state may keep the `.drop-cap-sm` accent-first-letter treatment.

### Toast
`bg-[rgb(34_29_22_/_0.85)]` + `backdrop-blur(14px)`, `--radius-md`, `--shadow-md` + `--shadow-plate`, 1px `--color-line-strong` border. Left: an 8px dot — sage for success, seal-bright for commitment events, danger for errors. Message in `--text-body` `ink`; marginalia timestamp right. Enter/exit via `toastVariants` retuned to `SPRING_SHEET`.

---

## Build checklist (cross-cutting)

- [ ] `layout.tsx`: swap Inter → Instrument Sans; Fraunces axes `["SOFT","WONK","opsz"]`; `themeColor: #100E0A`.
- [ ] `globals.css`: full token swap per §2; delete blobs, add lamp/ember/grain; `.plate`, `.rule-double`, `.gilt-rule`, `.text-spread`, status-beam styles; retune `.animate-thinking`, `.wick-ring`, `.drop-cap`, `.kbd`, scrollbars, skeletons; keep `.hit`, reduced-motion backstop.
- [ ] `motion.tsx`: add `EASE_INK`, `SPRING_SHEET`, `SPRING_STAMP`, new `DUR` keys; retune existing variants (bubbles → Ink Rise, views → Folio Turn x-axis, cards → 70ms stagger + rotate); keep legacy exports as aliases; `MotionButton` press → Kiss Impression.
- [ ] `page.tsx`: single LLM in-flight counter driving the status beam + `.speaking`.
- [ ] Per-surface passes per §8; Compositor's Rail replaces the message icon grid on desktop.
- [ ] Review gates: champagne audit (≤3 lit objects at rest), color grammar (champagne = Cyrano, seal = commitment, neutral = match), contrast invariants (§2), blur count ≤4, drop-cap whitelist, `.rule-double` whitelist.

*Verification:* `npm run build` is the type gate; for visual QA drive the app with Playwright from the scratchpad (screenshots at 375px, 768px, 1280px, 1680px; light OS theme irrelevant — app is dark-only, `color-scheme: dark`).
