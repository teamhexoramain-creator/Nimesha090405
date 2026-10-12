/* HEXORA — editable page texts.
   The admin panel (Pages tab) saves a list of text changes: { "original text": "new text" }. This file puts them on every public page.
   • The key is the text as it is written (or drawn by the page's own script), so one change covers every place, on every page, where that text appears:
     a footer line or a button label is edited once.
   • Page text, form hints (placeholder), screen-reader / tooltip labels (aria-label, title) and image descriptions (alt) can all be changed. Only as plain text, never HTML.
   • The lists the site draws itself (steps, FAQ, packages, services, estimate options) are included: their texts are matched as they are drawn.
   • Numbers the site works out (prices, rates, advance %, phone / e-mail / WhatsApp links) are not text changes: in the preview a click on them
     opens the tab where they are set (Prices / Contact).
   • With ?hxedit=1 inside the admin panel's preview frame (same site only) this file lets you click any text and type right there, and talks to the panel. */
(function () {
  "use strict";
  const base = (location.pathname.split("/").pop() || "index.html").replace(/[?#].*$/, "") || "index.html";
  const which = new URLSearchParams(location.search).get("s");
  const PAGE = base + (which ? "?s=" + which : "");
  const texts = window.HX_TEXTS && typeof window.HX_TEXTS === "object" ? window.HX_TEXTS : {};
  let editing = false;
  try { editing = /[?&]hxedit=1(&|$)/.test(location.search) && window.parent !== window && window.parent.location.origin === location.origin; } catch (e) { editing = false; }
  if (!editing && !Object.keys(texts).length) return;

  // never touched: code, form boxes, the chat widget's own parts, and anything marked data-no-edit
  const SKIP = "script,style,noscript,svg,canvas,textarea,input,.numpad,.lc,.toast,.loader,[data-no-edit],[contenteditable]";
  // numbers and links the site works out from its settings: edited in the tab named here
  const PRICE_SEL = "[data-price-usd],[data-price-type],[data-usd-type],[data-rate-text],[data-rate-pill],[data-from-pkg],[data-advance],[data-support],.price-amt,.price-usd";
  const CONTACT_SEL = "[data-phone],[data-phone-label],[data-wa-link],[data-email]";   // a label on these ("WhatsApp කරන්න") is ordinary text; the number / address itself is not
  const COMP = PRICE_SEL + "," + CONTACT_SEL;
  const compOf = (el, text) => (el.closest(PRICE_SEL) ? "prices" : el.closest(CONTACT_SEL) && /[\d@]/.test(text) ? "contact" : null);
  const ATTRS = ["placeholder", "aria-label", "title", "alt"];
  const norm = s => s.replace(/\s+/g, " ").trim();
  const has = Object.prototype.hasOwnProperty;
  const ok = s => /[\p{L}\p{N}]/u.test(s);

  let items = [];   // text: { node, key, pre, post }   attribute: { el, attr, key }
  function collect() {
    const seenN = new Set();
    items.forEach(it => { if (it.node) seenN.add(it.node); });
    const out = items.filter(it => (it.node ? it.node.isConnected : it.el.isConnected));
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = w.nextNode())) {
      if (seenN.has(n)) continue;
      const p = n.parentElement; if (!p || p.closest(SKIP)) continue;
      const raw = n.nodeValue, key = norm(raw);
      if (!key || !ok(key) || compOf(p, key)) continue;
      const m = raw.match(/^(\s*)[\s\S]*?(\s*)$/);
      out.push({ node: n, key: key, pre: m ? m[1] : "", post: m ? m[2] : "" });
    }
    document.querySelectorAll("[placeholder],[aria-label],[title],img[alt]").forEach(el => {
      if (el.closest("[data-no-edit],.numpad,.toast,.loader") || el.closest(PRICE_SEL)) return;
      ATTRS.forEach(attr => {
        if (!el.hasAttribute(attr)) return;
        el.__hxa = el.__hxa || {};
        if (el.__hxa[attr] === undefined) { const v = norm(el.getAttribute(attr)); if (!v || !ok(v)) return; el.__hxa[attr] = v; out.push({ el: el, attr: attr, key: v }); }
      });
    });
    items = out;
  }
  const meta = () => document.querySelector('meta[name="description"]');
  const orig = { title: document.title, desc: meta() ? meta().getAttribute("content") || "" : "" };
  const TK = "@title|" + PAGE, DK = "@desc|" + PAGE;
  const valueFor = (map, key) => (has.call(map, key) && typeof map[key] === "string" && map[key] !== "" ? map[key] : key);

  function apply(map) {
    items.forEach(it => {
      const v = valueFor(map, it.key);
      if (it.node) { const next = it.pre + v + it.post; if (it.node.nodeValue !== next) it.node.nodeValue = next; }
      else if (it.el.getAttribute(it.attr) !== v) it.el.setAttribute(it.attr, v);
    });
    document.title = has.call(map, TK) && typeof map[TK] === "string" && map[TK] !== "" ? map[TK] : orig.title;
    const m = meta(); if (m) m.setAttribute("content", has.call(map, DK) && typeof map[DK] === "string" && map[DK] !== "" ? map[DK] : orig.desc);
  }
  let current = texts, raf = 0;
  const refresh = () => { collect(); apply(current); };
  const later = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; refresh(); }); };
  // the site draws parts of its pages itself (lists, estimate, login screens, ...) and redraws them: the texts are applied again each time
  const watch = () => { if (window.MutationObserver) new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };

  if (!editing) {
    refresh(); addEventListener("load", refresh); watch();
    return;
  }

  /* ---------- admin preview mode ---------- */
  const style = document.createElement("style");
  style.textContent = "html.hxe .rv,html.hxe .fade-up{opacity:1!important;transform:none!important;animation:none!important}html.hxe [style*='opacity(']{filter:none!important;translate:none!important;scale:none!important}" +
    ".hxe-over{outline:2px dashed #FF5A4A!important;outline-offset:2px!important;cursor:pointer!important}.hxe-hl{outline:3px solid #FF5A4A!important;outline-offset:4px!important;background:rgba(255,90,74,.12)!important}" +
    ".hxe-goto{outline:2px dashed #7aa7ff!important;outline-offset:2px!important;cursor:pointer!important}" +
    ".hxe-ed{position:fixed;z-index:2147483000;box-sizing:border-box;margin:0;padding:6px 8px;color:#fff;background:#0a0a0b;border:2px solid #FF5A4A;border-radius:10px;outline:0;resize:none;overflow:hidden;text-transform:none;box-shadow:0 12px 40px rgba(0,0,0,.6),0 0 0 4px rgba(255,90,74,.25)}" +
    ".hxe-bar{position:fixed;z-index:2147483001;display:flex;gap:6px;font:700 11px/1 system-ui,sans-serif}.hxe-bar button{border:0;border-radius:8px;padding:6px 9px;color:#fff;background:#1c1c1f;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5)}.hxe-bar button[data-a=ok]{background:#E5252A}";
  document.head.appendChild(style); document.documentElement.classList.add("hxe");
  const post = m => { try { window.parent.postMessage(Object.assign({ hx: 1 }, m), location.origin); } catch (e) { /* no parent */ } };
  const kindOf = it => (it.node ? "text" : it.attr === "placeholder" ? "placeholder" : it.attr === "alt" ? "alt" : "label");
  const itemsOf = () => {
    const count = {}, kind = {}, order = [];
    items.forEach(it => { if (!has.call(count, it.key)) { count[it.key] = 0; kind[it.key] = kindOf(it); order.push(it.key); } count[it.key]++; });
    return { page: PAGE, items: order.map(k => ({ key: k, n: count[k], kind: kind[k] })), title: { key: TK, orig: orig.title }, desc: { key: DK, orig: orig.desc } };
  };
  let last = "";
  const report = () => { refresh(); const m = itemsOf(), s = JSON.stringify(m); if (s !== last) { last = s; post(Object.assign({ type: "nodes" }, m)); } };
  const reportLater = (() => { let t = 0; return () => { clearTimeout(t); t = setTimeout(report, 150); }; })();
  report(); addEventListener("load", () => { report(); setTimeout(report, 1200); setTimeout(report, 3500); });
  if (window.MutationObserver) new MutationObserver(() => { if (!ed) reportLater(); }).observe(document.body, { childList: true, subtree: true });
  post({ type: "ready", page: PAGE });

  addEventListener("message", e => {
    if (e.origin !== location.origin || e.source !== window.parent || !e.data || e.data.hx !== 1) return;
    const d = e.data;
    if (d.type === "set" && d.map && typeof d.map === "object") { current = d.map; refresh(); }
    else if (d.type === "hl") {
      const it = items.find(x => x.key === d.key); const el = it && (it.node ? it.node.parentElement : it.el); if (!el) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" }); el.classList.add("hxe-hl"); setTimeout(() => el.classList.remove("hxe-hl"), 1800);
    }
  });

  // a click on a text (or a form hint, or an image) opens a box right there on the page; links and buttons do nothing while editing
  const elOf = it => (it.node ? it.node.parentElement : it.el);
  const textAt = ev => {
    const t = ev.target; if (!t || !t.closest) return null;
    const own = t.closest("input[placeholder],textarea[placeholder],img[alt]");
    if (own) { const a = own.matches("img") ? "alt" : "placeholder"; const hit = items.find(i => i.el === own && i.attr === a); if (hit) return hit; }
    let node = null;
    try {
      if (document.caretPositionFromPoint) { const c = document.caretPositionFromPoint(ev.clientX, ev.clientY); node = c && c.offsetNode; }
      else if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(ev.clientX, ev.clientY); node = r && r.startContainer; }
    } catch (x) { node = null; }
    let it = node && items.find(n => n.node === node);
    if (!it) { it = items.find(n => n.node && n.node.parentElement === t); if (!it) it = items.find(n => n.node && t.contains(n.node)); }
    return it;
  };
  const compAt = ev => { const t = ev.target && ev.target.closest ? ev.target.closest(COMP) : null; if (!t) return null; const tab = compOf(t, norm(t.textContent || "")); return tab ? { el: t, tab: tab } : null; };
  const curText = it => (it.node ? it.node.nodeValue.slice(it.pre.length, it.node.nodeValue.length - it.post.length) : it.el.getAttribute(it.attr));
  const setKey = (key, v) => { const val = v === "" ? key : v; items.forEach(it => { if (it.key !== key) return; if (it.node) { const next = it.pre + val + it.post; if (it.node.nodeValue !== next) it.node.nodeValue = next; } else it.el.setAttribute(it.attr, val); }); };
  // what the panel will hold after this edit, so a redraw of the page does not put the old text back
  const remember = (key, value) => { current = Object.assign({}, current); if (value === "") delete current[key]; else current[key] = value; };
  let ed = null;
  function place() {
    if (!ed) return;
    let b;
    if (ed.it.node) { const r = document.createRange(); r.selectNodeContents(ed.it.node); b = r.getBoundingClientRect(); } else b = ed.it.el.getBoundingClientRect();
    const pad = 8, vw = document.documentElement.clientWidth;
    const w = Math.min(vw - 16, Math.max(b.width + pad * 2, 200)), left = Math.max(8, Math.min(b.left - pad, vw - w - 8));
    ed.ta.style.width = w + "px"; ed.ta.style.left = left + "px"; ed.ta.style.top = Math.max(30, b.top - 6) + "px";
    ed.ta.style.height = "auto"; ed.ta.style.height = ed.ta.scrollHeight + "px";
    ed.bar.style.left = left + "px"; ed.bar.style.top = Math.max(4, Math.max(30, b.top - 6) - 26) + "px";
  }
  function endEdit(keep) {
    if (!ed) return;
    const e = ed; ed = null;
    const v = keep ? e.ta.value.replace(/\s*\n\s*/g, " ").trim() : e.start;
    e.ta.remove(); e.bar.remove();
    const value = v === "" || v === e.it.key ? "" : v;
    remember(e.it.key, value); setKey(e.it.key, value); post({ type: "edit", key: e.it.key, value: value }); reportLater();
  }
  function startEdit(it) {
    if (ed && ed.it === it) return;
    if (ed) endEdit(true);
    const cs = getComputedStyle(elOf(it)), ta = document.createElement("textarea"), bar = document.createElement("div");
    ta.className = "hxe-ed"; ta.value = curText(it); ta.rows = 1; ta.spellcheck = false; ta.setAttribute("aria-label", "Edit text"); ta.setAttribute("data-no-edit", "");
    ta.style.cssText = "font-family:" + cs.fontFamily + ";font-size:" + cs.fontSize + ";font-weight:" + cs.fontWeight + ";line-height:" + cs.lineHeight + ";letter-spacing:" + cs.letterSpacing + ";text-align:" + (cs.textAlign === "start" ? "left" : cs.textAlign) + ";";
    bar.className = "hxe-bar"; bar.setAttribute("data-no-edit", "");
    bar.innerHTML = '<button type="button" data-a="ok">✓ Enter</button><button type="button" data-a="reset">↺ මුල් text එක</button><button type="button" data-a="x">Esc</button>';
    document.body.appendChild(ta); document.body.appendChild(bar);
    ed = { it: it, ta: ta, bar: bar, start: curText(it) };
    ta.addEventListener("input", () => { const v = ta.value.replace(/\n/g, " "), val = v.trim() === it.key ? "" : v; remember(it.key, val); setKey(it.key, v); post({ type: "edit", key: it.key, value: val }); place(); });
    ta.addEventListener("keydown", ev => {
      if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); endEdit(true); }
      else if (ev.key === "Escape") { ev.preventDefault(); endEdit(false); }
    });
    ta.addEventListener("blur", () => setTimeout(() => { if (ed && ed.ta === ta && document.activeElement !== ta && !bar.contains(document.activeElement)) endEdit(true); }, 0));
    bar.addEventListener("pointerdown", ev => ev.preventDefault());   // pressing these must not close the box before it acts
    bar.addEventListener("click", ev => {
      const a = ev.target.closest("button"); if (!a) return;
      if (a.dataset.a === "ok") endEdit(true);
      else if (a.dataset.a === "x") endEdit(false);
      else if (a.dataset.a === "reset") { ta.value = it.key; endEdit(true); }
    });
    place(); ta.focus(); ta.select();
  }
  addEventListener("scroll", place, { passive: true }); addEventListener("resize", place);
  let over = null;
  document.addEventListener("mouseover", ev => {
    if (over) { over.classList.remove("hxe-over", "hxe-goto"); over = null; }
    const c = compAt(ev); if (c) { over = c.el; c.el.classList.add("hxe-goto"); return; }
    const it = textAt(ev), el = it && elOf(it); if (el) { over = el; el.classList.add("hxe-over"); }
  }, true);
  document.addEventListener("click", ev => {
    if (ev.target.closest && ev.target.closest(".hxe-ed,.hxe-bar")) return;
    ev.preventDefault(); ev.stopPropagation();
    const c = compAt(ev); if (c) { endEdit(true); post({ type: "goto", tab: c.tab }); return; }
    const it = textAt(ev); if (it) startEdit(it); else endEdit(true);
  }, true);
  document.addEventListener("submit", ev => ev.preventDefault(), true);
})();
