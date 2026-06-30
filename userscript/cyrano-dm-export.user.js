// ==UserScript==
// @name         Cyrano DM Exporter
// @namespace    cyrano.local
// @version      1.5.0
// @description  Transcribe the open DM conversation into a clean text transcript — copy or download.
// @author       Fred
// @match        *://*.instagram.com/*
// @match        *://*.tinder.com/*
// @match        *://*.bumble.com/*
// @match        *://*.hinge.co/*
// @match        *://web.whatsapp.com/*
// @match        *://*.messenger.com/*
// @grant        GM_setClipboard
// @run-at       document-idle
// @noframes
// ==/UserScript==

/*
 * Open a DM thread, click the floating "Transcript" button, Capture, then Copy
 * or Download. Add more sites with @match lines above.
 * All UI uses scripted inline styles (no injected <style>), so it survives the
 * strict Content-Security-Policy on sites like Instagram.
 */
(function () {
  "use strict";

  const ACCENT = "#fb7185";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let picked = null; // user-picked container override
  let panel = null;

  function el(tag, css, props) {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (props) Object.assign(e, props);
    return e;
  }
  function copyText(text) {
    try {
      GM_setClipboard(text);
      return true;
    } catch (_) {
      /* fall through */
    }
    try {
      navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      return false;
    }
  }

  const BTN =
    "appearance:none;flex:1;min-width:0;border:1px solid rgba(255,255,255,.14);background:transparent;color:#d4d4d8;border-radius:8px;padding:7px 10px;font:500 12px/1 system-ui,sans-serif;cursor:pointer";
  const PRIMARY =
    "appearance:none;flex:1;border:1px solid " +
    ACCENT +
    ";background:" +
    ACCENT +
    ";color:#1c0a0e;border-radius:8px;padding:8px 10px;font:600 12px/1 system-ui,sans-serif;cursor:pointer";

  /* ----------------------------- FAB ----------------------------- */
  const fab = el(
    "button",
    "position:fixed;right:18px;bottom:18px;z-index:2147483646;display:inline-flex;align-items:center;gap:6px;padding:9px 13px;border-radius:9999px;border:1px solid rgba(255,255,255,.18);background:#131316;color:#f4f4f5;font:600 12px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 24px -8px rgba(0,0,0,.6)",
    { title: "Transcribe this conversation" },
  );
  fab.append(
    el("span", "color:" + ACCENT + ";font-weight:700", { textContent: "✦" }),
    document.createTextNode(" Transcript"),
  );
  function mountFab() {
    if (document.body && !document.body.contains(fab)) document.body.appendChild(fab);
  }
  mountFab();
  setInterval(mountFab, 2000); // survive SPA re-renders that wipe siblings
  fab.addEventListener("click", () => {
    if (panel) {
      panel.remove();
      panel = null;
    } else {
      buildPanel();
    }
  });

  /* --------------------------- extraction --------------------------- */
  function vis(node) {
    return (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim();
  }
  function isNoise(t) {
    if (!t) return true;
    const x = t.trim();
    if (!x) return true;
    if (/^\d{1,2}:\d{2}\s?([ap]\.?m\.?)?$/i.test(x)) return true; // 9:42, 9:42 PM
    if (/^\d+\s?[smhdw]$/i.test(x)) return true; // 1h, 3h, 22h, 5m, 2d, 1w (inbox times)
    if (/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i.test(x) && x.length < 16) return true;
    if (/^(today|yesterday|active|seen|delivered|sent|read|now|online|typing)/i.test(x)) return true;
    if (/^(unread|new message|\d+\s+new messages?)$/i.test(x)) return true;
    if (/^(liked a message|reacted|you reacted|sent an attachment|you sent an attachment)/i.test(x)) return true;
    if (/^you replied to\b/i.test(x)) return true; // "You replied to <name>"
    if (/\breplied to you$/i.test(x)) return true; // "<name> replied to you"
    if (/^[•·\-—]+$/.test(x)) return true;
    return false;
  }

  // Profile a candidate: how many text bubbles sit left vs right of its centre.
  // A real thread has BOTH (my replies are right-aligned); the inbox list does not.
  function profileSides(container) {
    const cr = container.getBoundingClientRect();
    const center = cr.left + cr.width / 2;
    let left = 0;
    let right = 0;
    let total = 0;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        return [...node.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });
    let node;
    let scanned = 0;
    while ((node = walker.nextNode()) && scanned < 900) {
      scanned++;
      const r = node.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const t = vis(node);
      if (!t || t.length > 1200 || isNoise(t)) continue;
      total++;
      if ((r.left + r.right) / 2 > center + 16) right++;
      else left++;
    }
    return { left, right, total };
  }

  function findContainer() {
    if (picked && document.contains(picked)) return picked;
    const collect = (minW, minH) => {
      const out = [];
      document.querySelectorAll("div, main, section, ul").forEach((node) => {
        const s = getComputedStyle(node);
        if (!/(auto|scroll)/.test(s.overflowY)) return;
        if (node.scrollHeight <= node.clientHeight + 40) return;
        const r = node.getBoundingClientRect();
        if (r.width < minW || r.height < minH) return;
        out.push(node);
      });
      return out;
    };
    let cands = collect(300, 240);
    if (!cands.length) cands = collect(200, 200);
    if (!cands.length) return document.body;

    // Rank: two-sided (real thread) first, then rightmost pane, then most messages.
    let best = cands[0];
    let bestKey = [-1, -1, -1];
    for (const c of cands) {
      const p = profileSides(c);
      const r = c.getBoundingClientRect();
      const key = [Math.min(p.left, p.right), Math.round(r.left), p.total];
      for (let i = 0; i < key.length; i++) {
        if (key[i] !== bestKey[i]) {
          if (key[i] > bestKey[i]) {
            best = c;
            bestKey = key;
          }
          break;
        }
      }
    }
    return best;
  }
  // The element that actually carries the bubble background (blue for me, grey
  // for them) — used for reliable left/right alignment. Falls back to the leaf.
  function bubbleRect(leaf, container) {
    let node = leaf;
    for (let i = 0; i < 6 && node && node !== container; i++) {
      const bg = (getComputedStyle(node).backgroundColor || "").replace(/\s+/g, "");
      if (bg && bg !== "transparent" && bg !== "rgba(0,0,0,0)") {
        return node.getBoundingClientRect();
      }
      node = node.parentElement;
    }
    return leaf.getBoundingClientRect();
  }

  function extractStructured(container) {
    const cr = container.getBoundingClientRect();
    const seen = new Set();
    const raw = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        const direct = [...node.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        return direct ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    let node;
    while ((node = walker.nextNode())) {
      const r = node.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const text = vis(node);
      if (!text || text.length > 1200 || isNoise(text)) continue;
      const key = Math.round(r.top) + "|" + text;
      if (seen.has(key)) continue;
      seen.add(key);
      const fs = parseFloat(getComputedStyle(node).fontSize) || 0;
      const b = bubbleRect(node, container);
      raw.push({ top: r.top, left: b.left, right: b.right, text, fs });
    }

    // Reply-quote previews (and sender-name/labels) render in a SMALLER font
    // than real message bubbles. Keep only bubbles at/above the dominant
    // message font size — this catches quotes even when their original isn't
    // in the captured window (and fixes the wrong-side label that follows).
    if (raw.length > 4) {
      const counts = new Map();
      for (const it of raw) {
        const k = Math.round(it.fs);
        counts.set(k, (counts.get(k) || 0) + 1);
      }
      let dom = 0;
      let domN = 0;
      for (const [k, n] of counts) {
        if (n > domN) {
          domN = n;
          dom = k;
        }
      }
      const filtered = raw.filter((it) => it.fs >= dom - 1);
      if (filtered.length >= 2) {
        raw.length = 0;
        raw.push(...filtered);
      }
    }

    raw.sort((a, b) => a.top - b.top);
    const msgs = [];
    for (const it of raw) {
      const prev = msgs[msgs.length - 1];
      if (prev && (prev.text.includes(it.text) || it.text.includes(prev.text))) {
        if (it.text.length > prev.text.length) {
          prev.text = it.text;
          prev.left = it.left;
          prev.right = it.right;
        }
        continue;
      }
      msgs.push(it);
    }
    // Drop reply-quote previews: Instagram (and others) show a small quoted
    // snippet of the message being replied to, which otherwise duplicates it.
    // Skip a bubble whose text repeats an earlier message — either an exact
    // duplicate, or a truncated quote (ends with …/...) that prefixes an earlier one.
    const norm = (s) => s.replace(/[…]+$|\.{3,}$/g, "").trim().toLowerCase();
    const seenNorm = [];
    const deduped = [];
    for (const m of msgs) {
      const n = norm(m.text);
      const truncated = /[…]$|\.{3,}$/.test(m.text.trim());
      const isQuote =
        n.length >= 8 && seenNorm.some((s) => s === n || (truncated && s.startsWith(n)));
      if (isQuote) continue;
      seenNorm.push(n);
      deduped.push(m);
    }
    // Classify side from the message COLUMN's own extent (robust to container
    // padding/offset): a bubble hugging the right edge is mine, the left is theirs.
    let colLeft = Infinity;
    let colRight = -Infinity;
    for (const m of deduped) {
      if (m.left < colLeft) colLeft = m.left;
      if (m.right > colRight) colRight = m.right;
    }
    const colW = Math.max(1, colRight - colLeft);
    return deduped.map((m) => {
      const leftGap = m.left - colLeft;
      const rightGap = colRight - m.right;
      const role = leftGap > rightGap + colW * 0.08 ? "me" : "them";
      return { role, content: m.text };
    });
  }
  function extractRaw(container) {
    return (container.innerText || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !isNoise(l))
      .join("\n");
  }
  async function loadHistory(container, status) {
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
      status("Loading older messages… " + i);
    }
    container.scrollTop = container.scrollHeight;
    await sleep(250);
  }
  function startPick(onPick) {
    let hov = null;
    const clear = () => {
      if (hov) hov.style.outline = "";
    };
    const move = (e) => {
      clear();
      hov = e.target;
      if (hov && hov !== document.body) hov.style.outline = "2px solid " + ACCENT;
    };
    const click = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const t = e.target;
      cleanup();
      onPick(t);
    };
    const key = (e) => {
      if (e.key === "Escape") {
        cleanup();
        if (panel) panel.style.display = "";
      }
    };
    function cleanup() {
      clear();
      document.removeEventListener("mousemove", move, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("keydown", key, true);
    }
    document.addEventListener("mousemove", move, true);
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", key, true);
  }

  /* ----------------------------- panel ----------------------------- */
  function buildPanel() {
    panel = el(
      "div",
      "position:fixed;right:18px;bottom:64px;z-index:2147483647;width:360px;max-width:calc(100vw - 36px);max-height:calc(100vh - 96px);display:flex;flex-direction:column;gap:9px;padding:12px;background:#131316;color:#f4f4f5;border:1px solid rgba(255,255,255,.16);border-radius:14px;box-shadow:0 24px 60px -16px rgba(0,0,0,.7);font:13px system-ui,sans-serif",
    );

    const hd = el("div", "display:flex;align-items:center;justify-content:space-between");
    hd.appendChild(el("b", "font-size:13px", { textContent: "DM transcript" }));
    const x = el("button", "background:none;border:none;color:#8a8a93;cursor:pointer;font-size:15px", {
      textContent: "✕",
      title: "Close",
    });
    hd.appendChild(x);

    const row = el("div", "display:flex;gap:6px");
    const bCap = el("button", BTN, { textContent: "Capture" });
    const bHist = el("button", BTN, { textContent: "Load older" });
    const bPick = el("button", BTN, { textContent: "Pick area" });
    row.append(bCap, bHist, bPick);

    const ta = el(
      "textarea",
      "width:100%;box-sizing:border-box;min-height:200px;max-height:46vh;resize:vertical;padding:9px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.3);color:#f4f4f5;font:12px/1.5 ui-monospace,monospace;outline:none",
      { placeholder: "Transcript appears here. Edit freely, then Copy or Download." },
    );

    const row2 = el("div", "display:flex;gap:6px");
    const bSwap = el("button", BTN, { textContent: "Swap sides" });
    const bDl = el("button", BTN, { textContent: "Download" });
    const bCopy = el("button", PRIMARY, { textContent: "Copy" });
    row2.append(bSwap, bDl, bCopy);

    const st = el("div", "font-size:11px;color:#8a8a93;min-height:14px");
    panel.append(hd, row, ta, row2, st);
    document.body.appendChild(panel);
    const status = (m) => (st.textContent = m || "");

    function capture() {
      const c = findContainer();
      const msgs = extractStructured(c);
      if (msgs.length >= 2) {
        ta.value = msgs.map((m) => (m.role === "me" ? "Me: " : "Them: ") + m.content).join("\n");
        status(msgs.length + " messages. Side labels are a guess — fix any in the box.");
      } else {
        ta.value = extractRaw(c);
        status("Captured raw text (couldn't separate sides).");
      }
    }

    x.onclick = () => {
      panel.remove();
      panel = null;
    };
    bCap.onclick = capture;
    bHist.onclick = async () => {
      status("Loading older messages…");
      await loadHistory(findContainer(), status);
      capture();
    };
    bPick.onclick = () => {
      panel.style.display = "none";
      startPick((node) => {
        picked = node;
        panel.style.display = "";
        capture();
      });
    };
    bSwap.onclick = () => {
      ta.value = ta.value
        .split("\n")
        .map((l) =>
          l.startsWith("Me: ") ? "Them: " + l.slice(4) : l.startsWith("Them: ") ? "Me: " + l.slice(6) : l,
        )
        .join("\n");
      status("Swapped Me / Them.");
    };
    bCopy.onclick = () => {
      if (!ta.value.trim()) return status("Capture first.");
      status(copyText(ta.value) ? "Copied to clipboard." : "Copy failed — select all and Ctrl+C.");
    };
    bDl.onclick = () => {
      if (!ta.value.trim()) return status("Capture first.");
      const blob = new Blob([ta.value], { type: "text/plain" });
      const a = el("a", null, { href: URL.createObjectURL(blob), download: "dm-transcript.txt" });
      a.click();
      URL.revokeObjectURL(a.href);
      status("Downloaded.");
    };

    capture(); // auto-capture on open
  }
})();
