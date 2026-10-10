/* HEXORA — shared page behaviour and animations */
(function () {
  "use strict";
  const C = window.HEXORA || {};
  const P = window.HXPrice;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* the preloader is handled in nav.js (it must not wait for Firebase) */

  /* the menu, current page, anchor links and the login state in the header live in nav.js (it loads before this file) */

  /* ---------- package ladder + "from" prices (built first so every later step sees them) ---------- */
  const homePk = $("#home-packages");
  if (homePk && window.HXPkg && P && C.packages) homePk.innerHTML = window.HXPkg.html(C, P);
  // [data-from-pkg]: the cheapest package, as a "from" price
  const pkgLkr = Object.keys(C.packages || {}).map(k => C.packages[k].lkr).filter(Boolean);
  if (pkgLkr.length) $$("[data-from-pkg]").forEach(el => el.setAttribute("data-price-usd", (Math.min.apply(null, pkgLkr) / (C.packageBaseRate || 369)).toFixed(4)));

  /* ---------- tabs: [data-tabs] (pricing) and [data-ladder] (packages) ---------- */
  function tabset(tabs, panelOf, after) {
    const pick = (t, focus) => {
      tabs.forEach(x => {
        const on = x === t, p = panelOf(x);
        x.setAttribute("aria-selected", String(on)); x.tabIndex = on ? 0 : -1;
        if (p) p.classList.toggle("on", on);
      });
      if (focus) t.focus();
      if (after) after(t);
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => pick(t, false));
      t.addEventListener("keydown", e => {
        const k = e.key, n = tabs.length;
        const go = k === "ArrowRight" || k === "ArrowDown" ? (i + 1) % n : k === "ArrowLeft" || k === "ArrowUp" ? (i + n - 1) % n : k === "Home" ? 0 : k === "End" ? n - 1 : -1;
        if (go < 0) return;
        e.preventDefault(); pick(tabs[go], true);
      });
    });
  }
  $$("[data-tabs]").forEach(root => {
    const tabs = $$(":scope > [role='tablist'] > [role='tab']", root);
    tabset(tabs, t => document.getElementById(t.getAttribute("aria-controls")));
  });
  $$("[data-ladder]").forEach(root => {
    const tabs = $$(".rung", root);
    tabset(tabs, t => document.getElementById(t.getAttribute("aria-controls")), t => {
      // on a phone the details sit under the list: make sure they come into view
      if (window.matchMedia("(max-width: 899px)").matches) {
        const p = document.getElementById(t.getAttribute("aria-controls")), r = p && p.getBoundingClientRect();
        if (r && (r.top > window.innerHeight * 0.8 || r.bottom < 0)) p.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      }
    });
  });

  /* ---------- a whole price card is a button: clicking its badge, price or empty space opens the card's link ---------- */
  document.addEventListener("click", e => {
    const card = e.target.closest(".price-card, [data-card]");
    if (!card || e.target.closest("a, button, input, select, textarea, label, summary")) return;
    if (window.getSelection && String(window.getSelection())) return;   // the visitor is selecting text
    const go = card.querySelector("a[href]");
    if (go) go.click();
  });

  /* ---------- scroll progress ---------- */
  const bar = $(".progress");
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (bar) {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, y / h) : 0) + ")";
      }
      updateTimeline();
      revealPassed();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  /* ---------- reveal on scroll ---------- */
  const rvs = $$(".rv");
  if (reduce || !("IntersectionObserver" in window)) {
    rvs.forEach(el => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    rvs.forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.96) el.classList.add("in");
      else io.observe(el);
    });
  }

  // safety net: anything already scrolled past (fast scroll, anchor jumps) is shown too
  function revealPassed() {
    const lim = window.innerHeight * 0.96;
    $$(".rv:not(.in)").forEach(el => { if (el.getBoundingClientRect().top < lim) el.classList.add("in"); });
  }

  /* ---------- spotlight cards ---------- */
  if (finePointer) {
    $$(".spot").forEach(card => {
      card.addEventListener("pointermove", e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- 3D (hero mark, service tiles) ----------
     Loaded only when a 3D spot is about to be seen, after the page has loaded, and only where it can be drawn
     (WebGL, not "save data", not a very low-memory phone). Elsewhere the picture fallback simply stays. */
  const spots = $$("[data-3d]");
  const can3d = spots.length > 0 && (() => {
    if (navigator.connection && navigator.connection.saveData) return false;
    if (navigator.deviceMemory && navigator.deviceMemory < 3) return false;
    try {   // a throw-away context, given back at once (browsers allow only a few at a time)
      const gl = document.createElement("canvas").getContext("webgl");
      const lose = gl && gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
      return !!gl;
    } catch (e) { return false; }
  })();
  if (can3d) {
    let lib = null;
    const load3d = () => lib || (lib = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "assets/js/hx3d.js"; s.onload = () => (window.HX3D ? res(window.HX3D) : rej()); s.onerror = rej; document.head.appendChild(s); }));
    const idle = cb => (window.requestIdleCallback ? requestIdleCallback(cb, { timeout: 1500 }) : setTimeout(cb, 200));
    const begin = () => idle(() => {
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return; io.unobserve(e.target);
        load3d().then(H => { if (H.mount(e.target, { kind: e.target.getAttribute("data-3d"), icon: e.target.getAttribute("data-icon") || "" })) e.target.classList.add("hx3d-live"); }).catch(() => {});
      }), { rootMargin: "200px" });
      spots.forEach(s => io.observe(s));
    });
    if (document.readyState === "complete") begin(); else window.addEventListener("load", begin, { once: true });
  }

  /* ---------- hero video ---------- */
  const video = can3d ? null : $("#hero-video");   // with 3D the mark replaces the video (it is not even downloaded)
  if (can3d) { const vt = $("#video-toggle"); if (vt) vt.hidden = true; }
  const vBtn = $("#video-toggle");
  if (video) {
    const playIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>';
    const pauseIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/></svg>';
    let userPaused = false;
    const tryPlay = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };
    const sync = () => {
      if (!vBtn) return;
      vBtn.innerHTML = video.paused ? playIcon : pauseIcon;
      vBtn.setAttribute("aria-label", video.paused ? "Video එක play කරන්න" : "Video එක pause කරන්න");
    };
    video.muted = true;
    if (reduce) { video.removeAttribute("autoplay"); video.pause(); userPaused = true; } else tryPlay();
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    if (vBtn) vBtn.addEventListener("click", () => {
      if (video.paused) { userPaused = false; tryPlay(); } else { userPaused = true; video.pause(); }
    });
    sync();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting && !userPaused) tryPlay(); else if (!e.isIntersecting) video.pause();
      }), { threshold: 0.15 }).observe(video);
    }

    // 3D tilt + glare following the pointer
    const stage = $(".stage"), frame = $(".video-frame"), glare = $(".video-glare");
    if (stage && frame && finePointer && !reduce) {
      stage.addEventListener("pointermove", e => {
        const r = stage.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        frame.style.setProperty("--ry", ((x - .5) * 10).toFixed(2) + "deg");
        frame.style.setProperty("--rx", ((.5 - y) * 8).toFixed(2) + "deg");
        if (glare) { glare.style.setProperty("--gx", (x * 100) + "%"); glare.style.setProperty("--gy", (y * 100) + "%"); }
      });
      stage.addEventListener("pointerleave", () => { frame.style.setProperty("--rx", "0deg"); frame.style.setProperty("--ry", "0deg"); });
    }
  }

  /* ---------- process timeline fill ---------- */
  const tl = $(".timeline");
  const tlFill = $(".tl-fill");
  const tlItems = $$(".tl-item");
  function updateTimeline() {
    if (!tl || !tlFill) return;
    const r = tl.getBoundingClientRect();
    const mid = window.innerHeight * 0.62;
    const p = Math.max(0, Math.min(1, (mid - r.top) / r.height));
    tlFill.style.setProperty("--p", reduce ? 1 : p.toFixed(3));
    tlItems.forEach(it => {
      const ir = it.getBoundingClientRect();
      it.classList.toggle("on", reduce || ir.top + 30 < mid);
    });
  }

  /* ---------- ambient background ----------
     The still hex grid is plain CSS (body::before). With a mouse, this canvas lights up the patch of grid under the pointer.
     Nothing moves on its own: it draws only while the pointer moves, and only that small patch, never the whole screen. */
  const cv = $("#fx");
  if (cv && !reduce && finePointer && cv.getContext) {
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const R = 300, SZ = R * 2;   // spotlight radius and its box, in css px
    let W = 0, H = 0, grid = null, spot = null, sctx = null, mask = null;
    let mx = -999, my = -999, tx = -999, ty = -999, ticking = false;

    // one hexagon outline, same lattice as the CSS grid (radius 32)
    function hexGrid() {
      grid = document.createElement("canvas"); grid.width = cv.width; grid.height = cv.height;
      const g = grid.getContext("2d"); g.scale(dpr, dpr);
      g.strokeStyle = "rgba(100,140,255,0.07)"; g.lineWidth = 1;
      const r = 32, w = Math.sqrt(3) * r;
      g.beginPath();
      for (let row = -1; row < H / (r * 1.5) + 1; row++)
        for (let col = -1; col < W / w + 1; col++) {
          const cx = col * w + (row % 2 ? w / 2 : 0), cy = row * r * 1.5;
          for (let i = 0; i < 6; i++) {
            const a = Math.PI / 180 * (60 * i - 90), x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
            i ? g.lineTo(x, y) : g.moveTo(x, y);
          }
          g.closePath();
        }
      g.stroke();
    }
    function build() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      grid = null; spot = null;   // rebuilt on the next mouse move
    }
    function patch() {   // the bright grid around the pointer, built in a small off-screen canvas
      if (!grid) hexGrid();
      if (!spot) {
        spot = document.createElement("canvas"); spot.width = spot.height = Math.round(SZ * dpr);
        sctx = spot.getContext("2d");
        mask = sctx.createRadialGradient(R * dpr, R * dpr, 0, R * dpr, R * dpr, R * dpr);
        mask.addColorStop(0, "rgba(0,0,0,1)"); mask.addColorStop(1, "rgba(0,0,0,0)");
      }
      sctx.globalCompositeOperation = "source-over";
      sctx.clearRect(0, 0, spot.width, spot.height);
      sctx.drawImage(grid, Math.round((mx - R) * dpr), Math.round((my - R) * dpr), spot.width, spot.height, 0, 0, spot.width, spot.height);
      sctx.globalCompositeOperation = "destination-in";
      sctx.fillStyle = mask; sctx.fillRect(0, 0, spot.width, spot.height);
    }
    function frame() {
      mx += (tx - mx) * .2; my += (ty - my) * .2;
      const done = Math.abs(tx - mx) < .5 && Math.abs(ty - my) < .5;
      if (done) { mx = tx; my = ty; }
      patch();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(spot, Math.round(mx - R), Math.round(my - R), SZ, SZ);
      ticking = !done && !document.hidden;
      if (ticking) requestAnimationFrame(frame);
    }
    build();
    let rt = 0;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (Math.abs(window.innerWidth - W) > 1 || Math.abs(window.innerHeight - H) > 160) build(); }, 200); });
    window.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      if (mx < -900) { mx = e.clientX; my = e.clientY; }
      tx = e.clientX; ty = e.clientY;
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
  }

  /* ---------- contact details from config ---------- */
  const wa = (C.whatsapp || "").replace(/\D/g, "");
  window.hxWhatsAppLink = text => "https://wa.me/" + wa + (text ? "?text=" + encodeURIComponent(text) : "");
  $$("[data-wa-link]").forEach(a => { a.href = window.hxWhatsAppLink(a.getAttribute("data-wa-link")); });
  $$("[data-email]").forEach(el => { el.textContent = C.email; if (el.tagName === "A") el.href = "mailto:" + C.email; });
  $$("[data-phone]").forEach(el => { el.textContent = C.phoneDisplay; if (el.tagName === "A") el.href = "tel:+" + wa; });
  $$("[data-phone-label]").forEach(el => { el.textContent = C.phoneDisplay; });
  const https = u => /^https:\/\//i.test(u || "") ? u : "";   // only https links from the admin panel are used
  $$("[data-facebook]").forEach(a => { if (https(C.facebook)) { a.href = C.facebook; (a.closest("li") || a).hidden = false; } });
  $$("[data-youtube]").forEach(a => { if (https(C.youtube)) { a.href = C.youtube; (a.closest("li") || a).hidden = false; } });
  $$("[data-advance]").forEach(el => el.textContent = (C.advancePercent || 50) + "%");
  $$("[data-support]").forEach(el => { const m = C.freeSupportMonths || 1; el.textContent = m + (m === 1 ? " month" : " months"); });
  $$("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

  /* ---------- notice bar (set from the admin panel) ---------- */
  const N = C.notice || {};
  let noticeClosed = "";
  try { noticeClosed = sessionStorage.getItem("hx_notice_closed") || ""; } catch (e) { /* storage blocked */ }
  if (N.show && N.text && noticeClosed !== N.text) {
    const bar = document.createElement("div");
    bar.className = "notice-bar"; bar.setAttribute("role", "status");
    const txt = document.createElement("span"); txt.textContent = N.text; bar.appendChild(txt);
    if (N.link && /^(https:\/\/|[\w-]+\.html)/.test(N.link)) {
      const a = document.createElement("a"); a.href = N.link; a.textContent = N.linkText || "බලන්න →";
      if (/^https:/.test(N.link)) { a.target = "_blank"; a.rel = "noopener"; }
      bar.appendChild(a);
    }
    const x = document.createElement("button");
    x.type = "button"; x.className = "notice-close"; x.setAttribute("aria-label", "Notice එක වහන්න"); x.textContent = "×";
    x.addEventListener("click", () => { bar.remove(); try { sessionStorage.setItem("hx_notice_closed", N.text); } catch (e) { /* ignore */ } });
    bar.appendChild(x);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  /* ---------- live prices on the home page ---------- */
  // prices appear with a short rise, always showing the real number (a count-up from 0 would flash wrong prices)
  function countUp(el, to) {
    el.textContent = P.formatLKR(to);
    if (reduce) return;
    el.classList.remove("price-in"); void el.offsetWidth; el.classList.add("price-in");
  }
  // an element shows a price either by project type (data-price-type) or a plain USD amount (data-price-usd)
  const usdOf = el => {
    const t = C.types && C.types[el.getAttribute("data-price-type")];
    if (t) return t.usd;
    const v = parseFloat(el.getAttribute("data-price-usd"));
    return isNaN(v) ? null : v;
  };
  const priceEls = $$("[data-price-type], [data-price-usd]").filter(el => usdOf(el) != null);
  const pills = $$("[data-rate-pill]");
  if (P && (priceEls.length || pills.length)) {
    const lkrOf = (el, rate) => P.smartRound(usdOf(el) * rate, C);
    priceEls.forEach(el => { el.textContent = P.formatLKR(lkrOf(el, C.fallbackRate)); });
    P.getRate(C).then(res => {
      pills.forEach(p => {
        p.classList.toggle("offline", !res.live);
        const txt = p.querySelector("[data-rate-text]");
        if (txt) txt.textContent = "1 USD = LKR " + res.rate.toFixed(2) + (res.live ? " · අද rate එක" : " · approx.");
      });
      if ("IntersectionObserver" in window && !reduce) {
        const io = new IntersectionObserver(es => es.forEach(e => {
          if (!e.isIntersecting) return;
          countUp(e.target, lkrOf(e.target, res.rate)); io.unobserve(e.target);
        }), { threshold: .4 });
        priceEls.forEach(el => { el.textContent = P.formatLKR(lkrOf(el, res.rate)); io.observe(el); });
      } else priceEls.forEach(el => countUp(el, lkrOf(el, res.rate)));
      $$("[data-usd-type]").forEach(el => { const t = C.types[el.getAttribute("data-usd-type")]; if (t) el.textContent = "≈ USD " + t.usd; });
    });
  }

  /* ---------- floating WhatsApp button steps aside at the footer ---------- */
  const waFloat = $(".wa-float"), footEnd = $(".foot-bottom");
  if (waFloat && footEnd && "IntersectionObserver" in window) {
    new IntersectionObserver(es => es.forEach(e => waFloat.classList.toggle("away", e.isIntersecting)), { threshold: 0 }).observe(footEnd);
  }

  onScroll();
  window.dispatchEvent(new Event("hx:ready"));   // nav.js re-aligns a #link target now that the lists are built
})();
