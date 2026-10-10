/* HEXORA — shared page behaviour and animations */
(function () {
  "use strict";
  const C = window.HEXORA || {};
  const P = window.HXPrice;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- preloader (only on the first page of a visit) ---------- */
  const loader = $(".loader");
  if (loader) {
    const start = performance.now();
    const hide = () => setTimeout(() => { loader.classList.add("done"); try { sessionStorage.setItem("hx_seen", "1"); } catch (e) { /* storage blocked */ } }, Math.max(0, 700 - (performance.now() - start)));
    if (document.readyState === "complete") hide(); else window.addEventListener("load", hide);
    setTimeout(() => loader.classList.add("done"), 2400);
  }

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

  /* ---------- split headings into words ---------- */
  $$("[data-split]").forEach(el => {
    if (reduce) return;
    let i = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement("span"); w.className = "w";
            const inner = document.createElement("span"); inner.textContent = part; inner.style.setProperty("--i", i++);
            w.appendChild(inner); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          // keep styled spans (like .grad-text) as one word
          const w = document.createElement("span"); w.className = "w";
          const inner = document.createElement("span"); inner.style.setProperty("--i", i++);
          n.replaceWith(w); inner.appendChild(n); w.appendChild(inner);
        }
      });
    };
    walk(el);
    el.classList.add("split");
  });

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

  /* ---------- hero video ---------- */
  const video = $("#hero-video");
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
     The still hex grid is plain CSS (body::before). This canvas only draws what moves: a few drifting dots and, with a mouse,
     a brighter patch of grid under the pointer. It runs at ~30 fps and redraws only that small patch, never the whole screen
     (the old full-screen version cost ~100 ms a frame on a mid-range phone). */
  const cv = $("#fx");
  if (cv && !reduce && cv.getContext) {
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, finePointer ? 1.5 : 1);
    const R = 300, SZ = R * 2;   // spotlight radius and its box, in css px
    let W = 0, H = 0, grid = null, spot = null, sctx = null, mask = null, parts = [];
    let mx = -999, my = -999, tx = -999, ty = -999, moved = false, running = true, last = 0;

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
      grid = null;   // rebuilt on the first mouse move
      const n = W < 700 ? 20 : 46;
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .3, vy: -(.1 + Math.random() * .4),   // px per 33 ms frame
        r: .6 + Math.random() * 1.6, c: Math.random() < .5 ? "22,217,255" : "140,110,255", a: .2 + Math.random() * .5
      }));
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
    function frame(t) {
      if (!running) return;
      requestAnimationFrame(frame);
      if (t - last < 32) return;   // ~30 fps: the slow drift looks the same, half the work
      const dt = Math.min(3, (t - last) / 33); last = t;
      if (moved) {
        mx += (tx - mx) * .2; my += (ty - my) * .2;
        if (Math.abs(tx - mx) < .5 && Math.abs(ty - my) < .5) { mx = tx; my = ty; moved = false; }
        patch();
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (spot && mx > -900) ctx.drawImage(spot, Math.round(mx - R), Math.round(my - R), SZ, SZ);
      for (const p of parts) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + p.c + "," + p.a + ")"; ctx.fill();
      }
    }
    build();
    let rt = 0;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (Math.abs(window.innerWidth - W) > 1 || Math.abs(window.innerHeight - H) > 160) { build(); spot = null; } }, 200); });
    if (finePointer) window.addEventListener("pointermove", e => { if (mx < -900) { mx = e.clientX; my = e.clientY; } tx = e.clientX; ty = e.clientY; moved = true; }, { passive: true });
    document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) requestAnimationFrame(frame); });
    requestAnimationFrame(frame);
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
  function countUp(el, to) {
    if (reduce) { el.textContent = P.formatLKR(to); return; }
    const dur = 1200, t0 = performance.now(), step100 = to < 20000 ? 10 : 100;
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = P.formatLKR(Math.round((to * e) / step100) * step100);
      if (k < 1) requestAnimationFrame(step); else el.textContent = P.formatLKR(to);
    };
    requestAnimationFrame(step);
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
