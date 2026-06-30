# Cyrano DM Exporter (userscript)

A [Violentmonkey](https://violentmonkey.github.io/) userscript that transcribes the **open DM conversation** on a dating/chat site and exports it — copy, download, or send it straight into Cyrano (which AI-parses the dump into a real conversation).

## Install

1. Install the **Violentmonkey** browser extension (Chrome/Edge/Firefox).
2. Open `cyrano-dm-export.user.js` in this folder, copy its contents.
3. Violentmonkey → **+ → New script**, paste, save. (Or drag the file onto the Violentmonkey dashboard.)

Ships matching **Instagram, Tinder, Bumble, Hinge, Messenger, WhatsApp Web**. Add others by adding a `// @match` line in the metadata block, e.g. `// @match *://*.okcupid.com/*`.

## Use

1. Open a DM thread on a supported site.
2. Click the **✦ Cyrano** button (bottom-right). It auto-captures the visible thread into an editable box.
3. Options:
   - **Capture** — re-grab the currently visible messages.
   - **Load history + capture** — scrolls the thread to the top to pull in older messages first (chat apps only keep the visible part in the page).
   - **Pick area** — if auto-detect grabs the wrong region, click this then click the chat panel yourself (Esc cancels).
4. Review/edit the transcript, optionally set **her name** + **platform**, then:
   - **Send to Cyrano →** creates a conversation in Cyrano (AI-parsed) and opens it.
   - **Copy** — paste into Cyrano's own **Import** dialog instead.
   - **Download .txt** — keep a file.

Speaker labels from the page are a rough guess (based on left/right alignment); you don't need them to be perfect — Cyrano's importer sorts out who said what and strips timestamps. If a capture looks messy, just send the raw text.

## How "Send to Cyrano" works

The script POSTs the transcript to Cyrano's `POST /api/intake`, which runs it through the same AI thread-parser as the in-app importer and creates the conversation. It uses Violentmonkey's `GM_xmlhttpRequest`, which bypasses browser CORS and mixed-content rules — so a site on `https://` can reach your local Cyrano on `http://localhost:3000`.

- Set the **Cyrano URL** field if Cyrano isn't on `http://localhost:3000` (e.g. your Docker host's LAN IP).
- The script's `// @connect *` grant allows it to reach whatever URL you configure.

## Privacy

Everything stays between your browser and your own Cyrano instance — the transcript is only sent to the Cyrano URL you set. Nothing goes to any third party.
