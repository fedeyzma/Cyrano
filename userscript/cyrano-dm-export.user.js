// ==UserScript==
// @name         Cyrano DM Exporter
// @namespace    cyrano.local
// @version      1.0.0
// @description  Transcribe an open DM conversation and export it — copy, download, or send straight to Cyrano (which AI-parses it into a conversation).
// @author       Fred
// @match        *://*.instagram.com/*
// @match        *://*.tinder.com/*
// @match        *://*.bumble.com/*
// @match        *://*.hinge.co/*
// @match        *://web.whatsapp.com/*
// @match        *://*.messenger.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @connect      *
// @run-at       document-idle
// @noframes
// ==/UserScript==

/*
 * Add more sites by adding @match lines above (e.g. // @match *://*.okcupid.com/*).
 * Default flow: open a DM thread → click the Cyrano button → Capture → Send to Cyrano.
 * Cyrano's AI parser fixes speakers/timestamps, so even a rough capture works.
 */
(function () {
  "use strict";

  const cfg = {
    url: GM_getValue("cyrano_url", "http://localhost:3000"),
    platform: GM_getValue("cyrano_platform", ""),
    name: "",
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ACCENT = "#fb7185";

  /* ----------------------------- styles ----------------------------- */
  const style = document.createElement("style");
  style.textContent = `
    .cy-fab{position:fixed;right:18px;bottom:18px;z-index:2147483646;display:inline-flex;align-items:center;gap:6px;
      padding:9px 13px;border-radius:9999px;border:1px solid rgba(255,255,255,.14);background:#131316;color:#f4f4f5;
      font:600 12px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 24px -8px rgba(0,0,0,.6)}
    .cy-fab:hover{border-color:${ACCENT}66;color:${ACCENT}}
    .cy-fab b{color:${ACCENT}}
    .cy-panel{position:fixed;right:18px;bottom:64px;z-index:2147483647;width:380px;max-width:calc(100vw - 36px);
      max-height:calc(100vh - 96px);display:flex;flex-direction:column;background:#131316;color:#f4f4f5;
      border:1px solid rgba(255,255,255,.14);border-radius:14px;box-shadow:0 24px 60px -16px rgba(0,0,0,.7);
      font-family:ui-sans-serif,system-ui,sans-serif;overflow:hidden}
    .cy-hd{display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-bottom:1px solid rgba(255,255,255,.07)}
    .cy-hd b{font-size:13px}.cy-hd b i{color:${ACCENT};font-style:normal}
    .cy-x{background:none;border:none;color:#8a8a93;cursor:pointer;font-size:16px;line-height:1;padding:4px}
    .cy-x:hover{color:#f4f4f5}
    .cy-body{padding:11px 13px;overflow:auto;display:flex;flex-direction:column;gap:9px}
    .cy-row{display:flex;gap:6px;flex-wrap:wrap}
    .cy-btn{flex:1;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:7px 10px;
      border-radius:8px;border:1px solid rgba(255,255,255,.13);background:transparent;color:#d4d4d8;
      font:500 12px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer;transition:.15s}
    .cy-btn:hover{background:rgba(255,255,255,.06);color:#f4f4f5}
    .cy-btn.cy-primary{background:${ACCENT};border-color:${ACCENT};color:#1c0a0e;font-weight:600}
    .cy-btn.cy-primary:hover{background:#f43f5e}
    .cy-btn:disabled{opacity:.4;cursor:not-allowed}
    .cy-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#8a8a93;font-weight:600}
    .cy-in{width:100%;box-sizing:border-box;padding:7px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.1);
      background:rgba(0,0,0,.3);color:#f4f4f5;font:13px ui-sans-serif,system-ui,sans-serif;outline:none}
    .cy-in:focus{border-color:${ACCENT}80}
    .cy-ta{width:100%;box-sizing:border-box;min-height:150px;max-height:40vh;resize:vertical;padding:9px;
      border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.3);color:#f4f4f5;
      font:12px/1.5 ui-monospace,monospace;outline:none}
    .cy-ta:focus{border-color:${ACCENT}80}
    .cy-st{font-size:11px;color:#8a8a93;min-height:14px}
    .cy-2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    .cy-pick{outline:2px solid ${ACCENT} !important;outline-offset:-2px !important;cursor:crosshair !important}
  `;
  document.head.appendChild(style);

  /* ----------------------------- FAB ----------------------------- */
  const fab = document.createElement("button");
  fab.className = "cy-fab";
  fab.innerHTML = "<b>✦</b> Cyrano";
  fab.title = "Export this conversation to Cyrano";
  document.body.appendChild(fab);

  let panel = null;
  let picked = null; // user-picked container override

  fab.addEventListener("click", () => {
    if (panel) {
      panel.remove();
      panel = null;
      return;
    }
    buildPanel();
  });

  /* --------------------------- extraction --------------------------- */
  function vis(el) {
    return (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function isNoise(t) {
    if (!t || t.length < 1) return true;
    if (/^(today|yesterday|active now|seen|delivered|sent|read|now|online|typing\.{0,3})$/i.test(t)) return true;
    if (/^\d{1,2}:\d{2}\s?([ap]\.?m\.?)?$/i.test(t)) return true; // 9:42, 9:42 PM
    if (/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i.test(t) && t.length < 16) return true;
    if (/^[•·•\-—]+$/.test(t)) return true;
    return false;
  }

  function findContainer() {
    if (picked && document.contains(picked)) return picked;
    let best = document.body;
    let bestScore = 0;
    document.querySelectorAll("div, main, section, ul").forEach((el) => {
      const s = getComputedStyle(el);
      if (!/(auto|scroll)/.test(s.overflowY)) return;
      if (el.scrollHeight <= el.clientHeight + 40) return;
      const r = el.getBoundingClientRect();
      if (r.width < 220 || r.height < 220) return;
      // score: descendants that carry text, weighted by visible area
      const score = el.querySelectorAll("*").length;
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    });
    return best;
  }

  // Structured extraction: each text-bearing leaf becomes a message; side by horizontal alignment.
  function extractStructured(container) {
    const cr = container.getBoundingClientRect();
    const center = cr.left + cr.width / 2;
    const seen = new Set();
    const raw = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
      acceptNode(el) {
        const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        return direct ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    let el;
    while ((el = walker.nextNode())) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const text = vis(el);
      if (!text || text.length > 1200 || isNoise(text)) continue;
      const key = Math.round(r.top) + "|" + text;
      if (seen.has(key)) continue;
      seen.add(key);
      raw.push({ top: r.top, cx: (r.left + r.right) / 2, text });
    }
    raw.sort((a, b) => a.top - b.top);

    const msgs = [];
    for (const it of raw) {
      const prev = msgs[msgs.length - 1];
      if (prev && (prev.text.includes(it.text) || it.text.includes(prev.text))) {
        if (it.text.length > prev.text.length) {
          prev.text = it.text;
          prev.cx = it.cx;
        }
        continue;
      }
      msgs.push(it);
    }
    return msgs.map((m) => ({ role: m.cx > center ? "me" : "them", content: m.text }));
  }

  function extractRaw(container) {
    return (container.innerText || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !isNoise(l))
      .join("\n");
  }

  function toLabeled(msgs) {
    return msgs.map((m) => (m.role === "me" ? "Me: " : "Them: ") + m.content).join("\n");
  }

  async function loadHistory(container, statusFn) {
    let last = -1;
    let stable = 0;
    for (let i = 0; i < 80 && stable < 3; i++) {
      container.scrollTop = 0;
      await sleep(450);
      const h = container.scrollHeight;
      if (h === last) stable++;
      else {
        stable = 0;
        last = h;
      }
      statusFn("Loading history… " + i);
    }
    container.scrollTop = container.scrollHeight;
    await sleep(250);
  }

  /* ----------------------------- panel ----------------------------- */
  function buildPanel() {
    panel = document.createElement("div");
    panel.className = "cy-panel";
    panel.innerHTML = `
      <div class="cy-hd"><b><i>✦</i> Cyrano — export DM</b><button class="cy-x" title="Close">✕</button></div>
      <div class="cy-body">
        <div class="cy-row">
          <button class="cy-btn" data-act="capture">Capture</button>
          <button class="cy-btn" data-act="full">Load history + capture</button>
          <button class="cy-btn" data-act="pick">Pick area</button>
        </div>
        <textarea class="cy-ta" placeholder="Captured transcript appears here. Edit freely — Cyrano's AI parser fixes speakers and strips noise on import."></textarea>
        <div class="cy-row">
          <label style="flex:2"><span class="cy-lbl">Her name (optional)</span>
            <input class="cy-in" data-f="name" placeholder="e.g. Sofia"></label>
          <label style="flex:1"><span class="cy-lbl">Platform</span>
            <input class="cy-in" data-f="platform" placeholder="Hinge"></label>
        </div>
        <label><span class="cy-lbl">Cyrano URL</span>
          <input class="cy-in" data-f="url" placeholder="http://localhost:3000"></label>
        <div class="cy-2">
          <button class="cy-btn" data-act="copy">Copy</button>
          <button class="cy-btn" data-act="download">Download .txt</button>
        </div>
        <button class="cy-btn cy-primary" data-act="send" style="width:100%">Send to Cyrano →</button>
        <div class="cy-st"></div>
      </div>`;
    document.body.appendChild(panel);

    const ta = panel.querySelector(".cy-ta");
    const st = panel.querySelector(".cy-st");
    const fName = panel.querySelector('[data-f="name"]');
    const fPlatform = panel.querySelector('[data-f="platform"]');
    const fUrl = panel.querySelector('[data-f="url"]');
    fPlatform.value = cfg.platform;
    fUrl.value = cfg.url;
    const status = (m) => (st.textContent = m || "");

    fPlatform.addEventListener("change", () => GM_setValue("cyrano_platform", (cfg.platform = fPlatform.value.trim())));
    fUrl.addEventListener("change", () => GM_setValue("cyrano_url", (cfg.url = fUrl.value.trim())));

    function capture() {
      const container = findContainer();
      const msgs = extractStructured(container);
      if (msgs.length >= 2) {
        ta.value = toLabeled(msgs);
        status(msgs.length + " messages captured. Review, then export. (Roughly aligned — the import fixes it.)");
      } else {
        ta.value = extractRaw(container);
        status("Captured raw text — Cyrano's AI parser will sort out who said what.");
      }
    }

    panel.querySelector(".cy-x").addEventListener("click", () => {
      panel.remove();
      panel = null;
    });

    panel.addEventListener("click", async (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (!act) return;
      if (act === "capture") capture();
      else if (act === "full") {
        status("Scrolling to load full history…");
        await loadHistory(findContainer(), status);
        capture();
      } else if (act === "pick") {
        panel.style.display = "none";
        startPick((el) => {
          picked = el;
          panel.style.display = "";
          status("Chat area set. Capturing…");
          capture();
        });
      } else if (act === "copy") {
        if (!ta.value.trim()) return status("Nothing to copy — Capture first.");
        GM_setClipboard(ta.value);
        status("Copied to clipboard. Paste into Cyrano → Import.");
      } else if (act === "download") {
        if (!ta.value.trim()) return status("Nothing to download — Capture first.");
        const blob = new Blob([ta.value], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "cyrano-dm-" + (fName.value.trim() || "export") + ".txt";
        a.click();
        URL.revokeObjectURL(a.href);
        status("Downloaded.");
      } else if (act === "send") {
        const text = ta.value.trim();
        if (!text) return status("Nothing to send — Capture first.");
        const url = (fUrl.value.trim() || "http://localhost:3000").replace(/\/+$/, "");
        status("Sending to Cyrano…");
        GM_xmlhttpRequest({
          method: "POST",
          url: url + "/api/intake",
          headers: { "Content-Type": "application/json" },
          data: JSON.stringify({ transcript: text, name: fName.value.trim(), platform: fPlatform.value.trim() }),
          timeout: 120000,
          onload(res) {
            if (res.status >= 200 && res.status < 300) {
              let d = {};
              try { d = JSON.parse(res.responseText); } catch (_) {}
              status("Imported " + (d.messageCount ?? "?") + " messages → “" + (d.name || "conversation") + "”. Opening Cyrano…");
              window.open(url, "_blank");
            } else if (res.status === 502) {
              status("Cyrano couldn't parse it. Try 'Copy' and paste into Import instead.");
            } else {
              status("Cyrano returned HTTP " + res.status + ".");
            }
          },
          onerror() { status("Could not reach Cyrano at " + url + " (is it running?)."); },
          ontimeout() { status("Timed out talking to Cyrano."); },
        });
      }
    });

    capture(); // auto-capture on open
  }

  /* --------------------------- pick mode --------------------------- */
  function startPick(onPick) {
    let hovered = null;
    const move = (e) => {
      if (hovered) hovered.classList.remove("cy-pick");
      hovered = e.target;
      if (hovered && hovered !== document.body) hovered.classList.add("cy-pick");
    };
    const click = (e) => {
      e.preventDefault();
      e.stopPropagation();
      cleanup();
      const el = e.target;
      if (el) el.classList.remove("cy-pick");
      onPick(el);
    };
    const key = (e) => {
      if (e.key === "Escape") {
        cleanup();
        if (panel) panel.style.display = "";
      }
    };
    function cleanup() {
      if (hovered) hovered.classList.remove("cy-pick");
      document.removeEventListener("mousemove", move, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("keydown", key, true);
    }
    document.addEventListener("mousemove", move, true);
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", key, true);
  }
})();
