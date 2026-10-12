/* HEXORA — editable page texts.
   The admin panel (Pages tab) saves a list of text changes: { "original text": "new text" }. This file puts them on every public page.
   • The key is the text as it is written in the page's HTML, so one change covers every place (and every page) where that text appears —
     a phone number or a footer line is edited once.
   • Only the text of the page is changed (as plain text, never as HTML). Prices, contact links and the lists that have their own admin tabs
     (home steps, FAQ, packages, services) are not touched here.
   • With ?hxedit=1 inside the admin panel's preview frame, this file lists the page's texts to the panel, shows what a click on a text is, and
     takes live changes from the panel (same site only). Nothing here runs the editor for a normal visitor. */
(function () {
  "use strict";
  const PAGE = ((location.pathname.split("/").pop() || "index.html").replace(/[?#].*$/, "")) || "index.html";
  const texts = window.HX_TEXTS && typeof window.HX_TEXTS === "object" ? window.HX_TEXTS : {};
  let editing = false;
  try { editing = /[?&]hxedit=1(&|$)/.test(location.search) && window.parent !== window && window.parent.location.origin === location.origin; } catch (e) { editing = false; }
  if (!editing && !Object.keys(texts).length) return;

  // never touched: code, form boxes, widgets, and anything the site fills in itself from other settings
  const SKIP = "script,style,noscript,svg,canvas,textarea,input,select,option,code,pre,.numpad,.lc,.wa-float,.toast,.loader,[data-no-edit],[contenteditable]";
  const DYN = "#home-steps,#home-faq,#home-packages,#svc-root,#summary,#estimate,.opt-group,.est-bar,.pk-panel,.rung,[data-price-usd],[data-price-type],[data-usd-type],[data-rate-text],[data-rate-pill],[data-advance],[data-support],[data-phone],[data-phone-label],[data-wa-link],[data-email],[data-user-name],[data-from-pkg],.price-amt,.price-usd";
  const DYN_NAMES = [["#home-steps", "steps"], ["#home-faq", "faq"], ["#home-packages", "packages"], ["#svc-root", "services"], ["#summary", "estimate"], [".opt-group", "estimate"]];
  const norm = s => s.replace(/\s+/g, " ").trim();
  const has = Object.prototype.hasOwnProperty;
  const ok = s => /[\p{L}\p{N}]/u.test(s);

  let nodes = [];   // { node, key, pre, post }
  function collect() {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), seen = new Set(nodes.map(n => n.node)), out = nodes.slice();
    let n;
    while ((n = w.nextNode())) {
      if (seen.has(n)) continue;
      const p = n.parentElement; if (!p || p.closest(SKIP) || p.closest(DYN)) continue;
      const raw = n.nodeValue, key = norm(raw);
      if (!key || !ok(key)) continue;
      const m = raw.match(/^(\s*)[\s\S]*?(\s*)$/);
      out.push({ node: n, key: key, pre: m ? m[1] : "", post: m ? m[2] : "" });
    }
    nodes = out;
  }
  const meta = () => document.querySelector('meta[name="description"]');
  const orig = { title: document.title, desc: meta() ? meta().getAttribute("content") || "" : "" };
  const TK = "@title|" + PAGE, DK = "@desc|" + PAGE;

  function apply(map) {
    nodes.forEach(it => {
      const v = has.call(map, it.key) && typeof map[it.key] === "string" ? map[it.key] : it.key;
      const next = it.pre + v + it.post;
      if (it.node.nodeValue !== next) it.node.nodeValue = next;
    });
    document.title = has.call(map, TK) && typeof map[TK] === "string" ? map[TK] : orig.title;
    const m = meta(); if (m) m.setAttribute("content", has.call(map, DK) && typeof map[DK] === "string" ? map[DK] : orig.desc);
  }
  const run = () => { collect(); apply(texts); };

  // the login / account screens are drawn by account.js and redrawn when you switch screens: the texts are applied again each time
  const live = document.getElementById("acc-root");
  const watchLive = fn => { if (live && window.MutationObserver) { let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; fn(); }); }).observe(live, { childList: true, subtree: true }); } };
  if (!editing) {
    run(); addEventListener("load", run); watchLive(run);
    return;
  }

  /* ---------- admin preview mode ---------- */
  let pending = texts;
  const style = document.createElement("style");
  style.textContent = "html.hxe .rv,html.hxe .fade-up{opacity:1!important;transform:none!important;animation:none!important}html.hxe [style*='opacity(']{filter:none!important;translate:none!important;scale:none!important}" +
    ".hxe-over{outline:2px dashed #FF5A4A!important;outline-offset:2px!important;cursor:pointer!important}.hxe-hl{outline:3px solid #FF5A4A!important;outline-offset:4px!important;background:rgba(255,90,74,.12)!important}";
  document.head.appendChild(style); document.documentElement.classList.add("hxe");
  const post = m => { try { window.parent.postMessage(Object.assign({ hx: 1 }, m), location.origin); } catch (e) { /* no parent */ } };
  const itemsOf = () => {
    const count = {}, order = [];
    nodes.forEach(it => { if (!has.call(count, it.key)) { count[it.key] = 0; order.push(it.key); } count[it.key]++; });
    const dyn = []; DYN_NAMES.forEach(([sel, name]) => { if (document.querySelector(sel) && dyn.indexOf(name) < 0) dyn.push(name); });
    return { page: PAGE, items: order.map(k => ({ key: k, n: count[k] })), title: { key: TK, orig: orig.title }, desc: { key: DK, orig: orig.desc }, dyn: dyn };
  };
  let last = "";
  const report = () => { collect(); apply(pending); const m = itemsOf(), s = JSON.stringify(m); if (s !== last) { last = s; post(Object.assign({ type: "nodes" }, m)); } };
  watchLive(report);
  report(); addEventListener("load", () => { report(); setTimeout(report, 1200); setTimeout(report, 3500); });
  post({ type: "ready", page: PAGE });

  addEventListener("message", e => {
    if (e.origin !== location.origin || e.source !== window.parent || !e.data || e.data.hx !== 1) return;
    const d = e.data;
    if (d.type === "set" && d.map && typeof d.map === "object") { pending = d.map; collect(); apply(pending); }
    else if (d.type === "hl") {
      const it = nodes.find(x => x.key === d.key); const el = it && it.node.parentElement; if (!el) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" }); el.classList.add("hxe-hl"); setTimeout(() => el.classList.remove("hxe-hl"), 1800);
    }
  });

  // a click on a text asks the panel to open that text; links and buttons do nothing while editing
  const textAt = ev => {
    let node = null;
    try {
      if (document.caretPositionFromPoint) { const c = document.caretPositionFromPoint(ev.clientX, ev.clientY); node = c && c.offsetNode; }
      else if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(ev.clientX, ev.clientY); node = r && r.startContainer; }
    } catch (x) { node = null; }
    let it = node && nodes.find(n => n.node === node);
    if (!it) { const el = ev.target.closest && ev.target; it = el && nodes.find(n => n.node.parentElement === el); if (!it && el) it = nodes.find(n => el.contains(n.node)); }
    return it;
  };
  let over = null;
  document.addEventListener("mouseover", ev => { const it = textAt(ev), el = it && it.node.parentElement; if (over && over !== el) over.classList.remove("hxe-over"); over = el || null; if (el) el.classList.add("hxe-over"); }, true);
  document.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); const it = textAt(ev); if (it) post({ type: "focus", key: it.key }); }, true);
  document.addEventListener("submit", ev => ev.preventDefault(), true);
})();
