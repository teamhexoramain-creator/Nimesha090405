/* HEXORA — scroll edge fade. Cards fade, lift and shrink a little as they come in at the bottom of the screen and as they leave at the top
   (like the lists on an iPhone), in both directions. It only changes `filter: opacity()`, `translate` and `scale`, so it never fights with the
   reveal animation (opacity/transform) or hover lifts. Off for "reduce motion".
   Public pages start it by themselves; the admin panel calls HXScrollFx.watch(root, selector, { top, bottom }). */
(function () {
  "use strict";
  if (window.HXScrollFx) return;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ZONE = 150, SHIFT = 18;
  const clamp = v => Math.max(0, Math.min(1, v));
  const num = (v, d) => (typeof v === "function" ? v() : v == null ? d : v);

  function watch(root, sel, opts) {
    if (reduce || !root) return { stop() {} };
    opts = opts || {};
    let raf = 0, touched = [];
    const reset = el => { el.style.removeProperty("filter"); el.style.removeProperty("translate"); el.style.removeProperty("scale"); };
    const run = () => {
      raf = 0;
      const top = num(opts.top, 0), bottom = num(opts.bottom, innerHeight);
      const els = Array.prototype.filter.call(root.querySelectorAll(sel), el => !el.closest(".hs"));
      const rects = els.map(el => el.getBoundingClientRect());   // read everything first, then write
      const now = [];
      els.forEach((el, i) => {
        const r = rects[i]; if (!r.height) return;
        const t = clamp((bottom - r.top) / ZONE), u = clamp((r.bottom - top) / ZONE), v = Math.min(t, u);
        if (v >= .995) { if (el.__fx) { reset(el); el.__fx = 0; } return; }
        const e = v * v * (3 - 2 * v), dy = (t < u ? 1 : -1) * (1 - e) * SHIFT;
        el.style.filter = "opacity(" + (.3 + .7 * e).toFixed(3) + ")";
        el.style.translate = "0 " + dy.toFixed(1) + "px";
        el.style.scale = (.97 + .03 * e).toFixed(4);
        el.__fx = 1; now.push(el);
      });
      touched.forEach(el => { if (!now.includes(el) && el.__fx) { reset(el); el.__fx = 0; } });
      touched = now;
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(run); };
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    const mo = new MutationObserver(queue); mo.observe(root, { childList: true, subtree: true });
    queue();
    return { stop() { removeEventListener("scroll", queue); removeEventListener("resize", queue); mo.disconnect(); touched.forEach(reset); } };
  }
  window.HXScrollFx = { watch: watch };

  // public pages
  function auto() {
    const hdr = document.querySelector(".site-header");
    if (!hdr || document.querySelector(".ad-shell")) return;
    watch(document.querySelector("main") || document.body,
      ".section-head, .price-card, .faq details, .cta-band, .term, .picker-wrap, .svc-box, .form-step, .acc-card, .acc-proj, .legal-sec, .terms-line, .sec-cta, .tabs, .timeline, .ladder, .svx, .hero-actions",
      { top: () => hdr.getBoundingClientRect().bottom, bottom: () => innerHeight });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto); else auto();
})();
