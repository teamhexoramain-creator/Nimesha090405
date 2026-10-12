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
    ".hxe-over{outline:2px dashed #FF5A4A!important;outline-offset:2px!important;cursor:pointer!important}.hxe-hl{outline:3px solid #FF5A4A!important;outline-offset:4px!important;background:rgba(255,90,74,.12)!important}" +
    ".hxe-ed{position:fixed;z-index:2147483000;box-sizing:border-box;margin:0;padding:6px 8px;color:#fff;background:#0a0a0b;border:2px solid #FF5A4A;border-radius:10px;outline:0;resize:none;overflow:hidden;text-transform:none;box-shadow:0 12px 40px rgba(0,0,0,.6),0 0 0 4px rgba(255,90,74,.25)}" +
    ".hxe-bar{position:fixed;z-index:2147483001;display:flex;gap:6px;font:700 11px/1 system-ui,sans-serif}.hxe-bar button{border:0;border-radius:8px;padding:6px 9px;color:#fff;background:#1c1c1f;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5)}.hxe-bar button[data-a=ok]{background:#E5252A}";
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

  // a click on a text opens a box right there on the page (same font, same place); links and buttons do nothing while editing
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
  const curText = it => it.node.nodeValue.slice(it.pre.length, it.node.nodeValue.length - it.post.length);
  const setKey = (key, v) => {   // every place this text appears on the page changes together
    const val = v === "" ? key : v;
    nodes.forEach(it => { if (it.key === key) { const next = it.pre + val + it.post; if (it.node.nodeValue !== next) it.node.nodeValue = next; } });
  };
  let ed = null;
  function place() {
    if (!ed) return;
    const r = document.createRange(); r.selectNodeContents(ed.it.node);
    const b = r.getBoundingClientRect(), pad = 8, vw = document.documentElement.clientWidth;
    const w = Math.min(vw - 16, Math.max(b.width + pad * 2, 200)), left = Math.max(8, Math.min(b.left - pad, vw - w - 8));
    ed.ta.style.width = w + "px"; ed.ta.style.left = left + "px"; ed.ta.style.top = Math.max(4, b.top - 6) + "px";
    ed.ta.style.height = "auto"; ed.ta.style.height = ed.ta.scrollHeight + "px";
    ed.bar.style.left = left + "px"; ed.bar.style.top = Math.max(2, b.top - 6 - 26) + "px";
  }
  function endEdit(keep) {
    if (!ed) return;
    const e = ed; ed = null;
    const v = keep ? e.ta.value.replace(/\s*\n\s*/g, " ").trim() : e.start;
    e.ta.remove(); e.bar.remove();
    const value = v === "" || v === e.it.key ? "" : v;
    setKey(e.it.key, value); post({ type: "edit", key: e.it.key, value: value });
  }
  function startEdit(it) {
    if (ed && ed.it === it) return;
    if (ed) endEdit(true);
    const cs = getComputedStyle(it.node.parentElement), ta = document.createElement("textarea"), bar = document.createElement("div");
    ta.className = "hxe-ed"; ta.value = curText(it); ta.rows = 1; ta.spellcheck = false; ta.setAttribute("aria-label", "Edit text"); ta.setAttribute("data-no-edit", "");
    ta.style.cssText = "font-family:" + cs.fontFamily + ";font-size:" + cs.fontSize + ";font-weight:" + cs.fontWeight + ";line-height:" + cs.lineHeight + ";letter-spacing:" + cs.letterSpacing + ";text-align:" + (cs.textAlign === "start" ? "left" : cs.textAlign) + ";";
    bar.className = "hxe-bar"; bar.setAttribute("data-no-edit", "");
    bar.innerHTML = '<button type="button" data-a="ok">✓ Enter</button><button type="button" data-a="reset">↺ මුල් text එක</button><button type="button" data-a="x">Esc</button>';
    document.body.appendChild(ta); document.body.appendChild(bar);
    ed = { it: it, ta: ta, bar: bar, start: curText(it) };
    ta.addEventListener("input", () => { setKey(it.key, ta.value.replace(/\n/g, " ")); post({ type: "edit", key: it.key, value: ta.value.replace(/\n/g, " ").trim() === it.key ? "" : ta.value.replace(/\n/g, " ") }); place(); });
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
  document.addEventListener("mouseover", ev => { const it = textAt(ev), el = it && it.node.parentElement; if (over && over !== el) over.classList.remove("hxe-over"); over = el || null; if (el) el.classList.add("hxe-over"); }, true);
  document.addEventListener("click", ev => {
    if (ev.target.closest && ev.target.closest(".hxe-ed,.hxe-bar")) return;
    ev.preventDefault(); ev.stopPropagation();
    const it = textAt(ev); if (it) startEdit(it); else endEdit(true);
  }, true);
  document.addEventListener("submit", ev => ev.preventDefault(), true);
})();
