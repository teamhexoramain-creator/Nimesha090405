/* HEXORA — navigation: the menu, anchor links, the current page / section, back to top, and who is logged in.
   This file is loaded straight from each page (not through boot.js), so the menu works the moment the page shows,
   even when Firebase is slow and the other page scripts are still waiting.
   Pieces:
   • Phone menu: a drawer under the header with a dim backdrop, page scroll locked behind it. It closes with a tap
     outside, Escape, a link, the Tab key leaving it, a bigger screen, or Back / Forward.
   • Links to a part of a page (#pricing …) land with the section just under the header, and are put right again
     once the page has finished building (the lists are built by script) unless the visitor has already scrolled.
   • Short addresses for the pricing tabs and the packages: index.html#pricing-web, #pricing-design, #pkg-firebase.
   • The menu shows the page you are on; on the home page it also follows the section you are reading.
   • A "back to top" button on long pages. • The header follows the login (also in other tabs) without a reload. */
(function () {
  "use strict";
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = window.matchMedia("(max-width: 900px)");
  const header = $(".site-header"), btn = $(".menu-btn");
  const behavior = smooth => (smooth && !reduce ? "smooth" : "instant");

  /* ---------- who is logged in (the header must not flash "Login" for a customer) ---------- */
  function applyAuth() {
    let cu = null;
    try { cu = JSON.parse(localStorage.getItem("hx_customer_v1")); } catch (e) { cu = null; }
    const on = !!(cu && cu.uid);
    root.classList.toggle("auth-in", on);
    $$("[data-auth-out]").forEach(el => { el.hidden = on; });
    $$("[data-auth-in]").forEach(el => { el.hidden = !on; });
    $$("[data-user-name]").forEach(el => { el.textContent = (cu && cu.name) || ""; });
    return on;
  }
  applyAuth();
  window.addEventListener("hx:auth", applyAuth);
  window.addEventListener("storage", e => { if (e.key === "hx_customer_v1") applyAuth(); });   // logged in or out in another tab

  /* ---------- header: shadow after scrolling, its height for the page styles ---------- */
  const syncHead = () => {
    if (!header) return;
    root.style.setProperty("--hh", Math.round(header.getBoundingClientRect().height) + "px");
    header.classList.toggle("scrolled", window.scrollY > 12);
  };
  syncHead();
  if (header && "ResizeObserver" in window) new ResizeObserver(syncHead).observe(header);

  /* ---------- the menu link of the page you are on ---------- */
  (function () {
    const here = location.pathname.split("/").pop() || "index.html";
    $$(".nav-links a[href]").forEach(a => {
      const h = a.getAttribute("href");
      if (h.indexOf("#") === -1 && h.split("?")[0] === here && !a.classList.contains("nav-cta") && !a.classList.contains("nav-reg")) a.setAttribute("aria-current", "page");
    });
  })();

  /* ---------- phone menu ---------- */
  let backdrop = null;
  const isOpen = () => !!header && header.classList.contains("menu-open");
  function setMenu(open, giveFocusBack) {
    if (!header || !btn) return;
    open = !!open && phone.matches;
    header.classList.toggle("menu-open", open);
    root.classList.toggle("menu-lock", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Menu එක වහන්න" : "Menu එක අරින්න");
    if (backdrop) backdrop.hidden = !open;
    if (!open && giveFocusBack) btn.focus({ preventScroll: true });
  }
  if (header && btn) {
    backdrop = document.createElement("div");
    backdrop.className = "nav-backdrop"; backdrop.hidden = true; backdrop.setAttribute("aria-hidden", "true");
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", () => setMenu(false, true));
    btn.addEventListener("click", () => setMenu(!isOpen()));
    $$(".nav-links a").forEach(a => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen()) { e.preventDefault(); setMenu(false, true); } });
    document.addEventListener("pointerdown", e => { if (isOpen() && !header.contains(e.target)) setMenu(false); });
    header.addEventListener("focusout", () => setTimeout(() => { if (isOpen() && !header.contains(document.activeElement)) setMenu(false); }, 0));   // Tab moved on
    const leave = () => { if (!phone.matches) setMenu(false); };   // turned the phone sideways / bigger window
    if (phone.addEventListener) phone.addEventListener("change", leave); else if (phone.addListener) phone.addListener(leave);
    window.addEventListener("pageshow", e => { if (e.persisted) { setMenu(false); applyAuth(); } });   // Back to a remembered page
    window.addEventListener("hashchange", () => setMenu(false));
  }

  /* ---------- links to a part of a page ---------- */
  const idOf = hash => { try { return decodeURIComponent((hash || "").replace(/^#/, "")); } catch (e) { return ""; } };
  // returns the element to bring into view; the short addresses select their tab / package first
  function target(hash, select) {
    const id = idOf(hash);
    if (!id) return null;
    let m = id.match(/^pricing-(app|web|design)$/);
    if (m) { const t = $("#pt-" + m[1]); if (t) { if (select && t.getAttribute("aria-selected") !== "true") t.click(); return t.closest("section[id]") || t; } return null; }
    m = id.match(/^pkg-([\w-]+)$/);
    if (m) { const r = $("#rung-" + m[1]); if (r) { if (select && r.getAttribute("aria-selected") !== "true") r.click(); return r.closest("section[id]") || r; } return null; }
    return document.getElementById(id);
  }
  const isAlias = hash => /^#?(pricing-(app|web|design)|pkg-[\w-]+)$/.test(hash || "");
  const marginOf = el => parseFloat(getComputedStyle(el).scrollMarginTop) || ((header ? header.getBoundingClientRect().height : 0) + 12);
  function bring(el, smooth) {
    const top = el.getBoundingClientRect().top + window.scrollY - marginOf(el);
    window.scrollTo({ top: Math.max(0, top), behavior: behavior(smooth) });
  }
  // the page grows while its lists are built: until the visitor scrolls or goes to another link, keep the linked section where it belongs
  let touched = false;
  const settleUntil = Date.now() + 3000;
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach(ev => window.addEventListener(ev, () => { touched = true; }, { passive: true, once: true }));
  window.addEventListener("hashchange", () => {
    touched = true;   // a new link was followed on purpose: the browser (or the line below, for the short addresses) takes it from here
    if (isAlias(location.hash)) { const el = target(location.hash, true); if (el) bring(el, true); }
  });
  function settle() {
    if (touched || !location.hash || Date.now() > settleUntil) return;
    const el = target(location.hash, true);
    if (!el) return;
    const d = el.getBoundingClientRect().top - marginOf(el);
    if (Math.abs(d) > 4) window.scrollTo({ top: window.scrollY + d, behavior: "instant" });
    spy();
  }
  [0, 300, 900, 2000].forEach(t => setTimeout(settle, t));
  window.addEventListener("load", settle);
  window.addEventListener("hx:ready", settle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);

  // the short addresses follow what the visitor picks (shareable, and a refresh keeps it), without adding history entries
  document.addEventListener("click", e => {
    const tab = e.target.closest("#pricing .tabs-bar [role='tab']"), rung = e.target.closest(".rung");
    let h = "";
    if (tab && /^pt-(app|web|design)$/.test(tab.id)) h = "#pricing-" + tab.id.slice(3);
    else if (rung && /^rung-[\w-]+$/.test(rung.id)) h = "#pkg-" + rung.id.slice(5);
    if (h && history.replaceState) { try { history.replaceState(null, "", location.pathname + location.search + h); } catch (err) { /* file:// */ } }
  });

  // the logo on the page you are already on goes back to the top, instead of doing nothing
  const brand = $(".brand");
  if (brand) brand.addEventListener("click", e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    let same = false;
    try { const u = new URL(brand.href, location.href); same = u.pathname === location.pathname && u.search === location.search; } catch (err) { same = false; }
    if (!same) return;
    e.preventDefault(); setMenu(false);
    window.scrollTo({ top: 0, behavior: behavior(true) });
    if (location.hash && history.replaceState) { try { history.replaceState(null, "", location.pathname + location.search); } catch (err) { /* file:// */ } }
  });

  /* ---------- which section of the home page you are reading ---------- */
  const spyLinks = $$('.nav-links a[href^="#"]');
  const spySecs = spyLinks.map(a => $(a.getAttribute("href"))).filter(Boolean);
  function spy() {
    if (!spySecs.length) return;
    const line = window.innerHeight * 0.38, bottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    let cur = null;
    spySecs.forEach(s => { if (s.getBoundingClientRect().top <= line) cur = s; });
    if (bottom && !cur) cur = spySecs[spySecs.length - 1];
    spyLinks.forEach(a => {
      if (cur && a.getAttribute("href") === "#" + cur.id) a.setAttribute("aria-current", "location"); else if (a.getAttribute("aria-current") === "location") a.removeAttribute("aria-current");
    });
  }

  /* ---------- Sinhala is never letter-spaced ----------
     The small caps-style labels (eyebrows, times, price captions, badges) are tracked out for Latin letters, but tracking pulls
     Sinhala's joined letters apart. A label that contains Sinhala gets class "si" (letter-spacing: 0). Runs again for content built later. */
  const SI = /[\u0D80-\u0DFF]/, LABELS = ".eyebrow, .picker-cap, .tl-time, .price-from, .badge, .pkg-badge, .rung-badge, .est-label, .foot-h, .svc-label, .video-tag, .chip, .rate-pill, .tags span, .ad-pill";
  const tagSi = () => $$(LABELS).forEach(el => { const on = SI.test(el.textContent); if (el.classList.contains("si") !== on) el.classList.toggle("si", on); });
  tagSi();
  window.addEventListener("hx:ready", tagSi);
  if ("MutationObserver" in window) {
    let q = 0;
    new MutationObserver(() => { if (!q) q = setTimeout(() => { q = 0; tagSi(); }, 250); }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- back to top ---------- */
  const up = document.createElement("button");
  up.type = "button"; up.className = "to-top"; up.setAttribute("aria-label", "පිටුවේ උඩට යන්න");
  up.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(up);
  up.addEventListener("click", () => { window.scrollTo({ top: 0, behavior: behavior(true) }); });

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      syncHead(); spy();
      up.classList.toggle("show", window.scrollY > window.innerHeight * 1.2);
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
})();
