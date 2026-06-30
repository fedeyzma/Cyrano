# Cyrano DM Exporter (userscript)

A [Violentmonkey](https://violentmonkey.github.io/) userscript that transcribes the **open DM conversation** on a dating/chat site into a clean text transcript you can copy or download — then paste into Cyrano's **Import** (which AI-parses it into a real conversation), or use anywhere.

## Install

1. Install the **Violentmonkey** extension (Firefox/Chrome/Edge).
2. Open `cyrano-dm-export.user.js`, copy its contents.
3. Violentmonkey → **+ → New script**, paste, save. (Re-paste to update an existing copy.)

Ships matching **Instagram, Tinder, Bumble, Hinge, Messenger, WhatsApp Web**. Add others with a `// @match` line, e.g. `// @match *://*.okcupid.com/*`.

## Use

1. Open a DM thread. Click the floating **✦ Transcript** button (bottom-right) — it auto-captures into an editable box.
2. Buttons:
   - **Capture** — re-grab the currently visible messages.
   - **Load older** — scrolls the thread up to pull older messages into the page first (chat apps only keep the visible part loaded).
   - **Pick area** — if it grabs the wrong region, click this then click the chat panel yourself (Esc cancels).
3. Review/edit, then **Copy** or **Download .txt**.

Speaker labels (`Me:` / `Them:`) are a best-effort guess from left/right alignment — fix any in the box, or don't bother: pasting into Cyrano's Import → **Auto-detect with AI** sorts out who said what and strips timestamps.

## Notes

- All UI uses scripted inline styles (no injected stylesheet), so it works under strict site CSPs like Instagram's.
- Everything stays in your browser — nothing is sent anywhere.
