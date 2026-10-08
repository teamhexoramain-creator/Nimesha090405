/* HEXORA — shared page behaviour and animations */
(function () {
  "use strict";
  const C = window.HEXORA || {};
  const P = window.HXPrice;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- preloader ---------- */
  const loader = $(".loader");
  if (loader) {
    const start = performance.now();
    const hide = () => setTimeout(() => loader.classList.add("done"), Math.max(0, 700 - (performance.now() - start)));
    if (document.readyState === "complete") hide(); else window.addEventListener("load", hide);
    setTimeout(() => loader.classList.add("done"), 2400);
  }

  /* ---------- logged-in customer? (account.js / fb.js keep the login in localStorage) ---------- */
  let cu = null;
  try { cu = JSON.parse(localStorage.getItem("hx_customer_v1")); } catch (e) { cu = null; }
  const loggedIn = !!(cu && cu.uid);
  $$("[data-auth-out]").forEach(el => { el.hidden = loggedIn; });
  $$("[data-auth-in]").forEach(el => { el.hidden = !loggedIn; });
  $$("[data-user-name]").forEach(el => { el.textContent = (cu && cu.name) || ""; });

  /* ---------- header state + scroll progress ---------- */
  const header = $(".site-header");
  const bar = $(".progress");
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (header) header.classList.toggle("scrolled", y > 12);
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

  /* ---------- mobile menu ---------- */
  const menuBtn = $(".menu-btn");
  if (menuBtn && header) {
    const set = open => {
      header.classList.toggle("menu-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Menu එක වහන්න" : "Menu එක අරින්න");
    };
    menuBtn.addEventListener("click", () => set(!header.classList.contains("menu-open")));
    $$(".nav-links a").forEach(a => a.addEventListener("click", () => set(false)));
    document.addEventListener("keydown", e => { if (e.key === "Escape") set(false); });
  }

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

  /* ---------- ambient background: hex grid + particles + pointer glow ---------- */
  const cv = $("#fx");
  if (cv && !reduce && cv.getContext) {
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = 0, H = 0, grid = null, parts = [], mx = -999, my = -999, tx = -999, ty = -999, running = true;
    const mobile = window.innerWidth < 700;

    function hexPath(c, cx, cy, r) {
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 180 * (60 * i - 90);
        const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
    }
    function build() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      grid = document.createElement("canvas"); grid.width = cv.width; grid.height = cv.height;
      const g = grid.getContext("2d"); g.scale(dpr, dpr);
      g.strokeStyle = "rgba(100,140,255,0.07)"; g.lineWidth = 1;
      const r = 32, w = Math.sqrt(3) * r;
      for (let row = -1; row < H / (r * 1.5) + 1; row++)
        for (let col = -1; col < W / w + 1; col++) { hexPath(g, col * w + (row % 2 ? w / 2 : 0), row * r * 1.5, r); g.stroke(); }
      const n = mobile ? 26 : 60;
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .15, vy: -(.05 + Math.random() * .2),
        r: .6 + Math.random() * 1.6, c: Math.random() < .5 ? "22,217,255" : "140,110,255", a: .2 + Math.random() * .5
      }));
    }
    function frame(t) {
      if (!running) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // grid revealed around the pointer (or a slow wandering spot on touch screens)
      if (!finePointer) { tx = W * (.5 + .35 * Math.sin(t / 5200)); ty = H * (.4 + .25 * Math.cos(t / 6100)); }
      mx += (tx - mx) * .08; my += (ty - my) * .08;
      ctx.save();
      const m = ctx.createRadialGradient(mx, my, 0, mx, my, 320);
      m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
      ctx.drawImage(grid, 0, 0, W, H);
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = m; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      ctx.globalAlpha = .35; ctx.drawImage(grid, 0, 0, W, H); ctx.globalAlpha = 1;
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + p.c + "," + p.a + ")"; ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    build();
    window.addEventListener("resize", () => { clearTimeout(build._t); build._t = setTimeout(build, 200); });
    window.addEventListener("pointermove", e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden; if (running) requestAnimationFrame(frame);
    });
    requestAnimationFrame(frame);
  }

  /* ---------- contact details from config ---------- */
  const wa = (C.whatsapp || "").replace(/\D/g, "");
  window.hxWhatsAppLink = text => "https://wa.me/" + wa + (text ? "?text=" + encodeURIComponent(text) : "");
  $$("[data-wa-link]").forEach(a => { a.href = window.hxWhatsAppLink(a.getAttribute("data-wa-link")); });
  $$("[data-email]").forEach(el => { el.textContent = C.email; if (el.tagName === "A") el.href = "mailto:" + C.email; });
  $$("[data-phone]").forEach(el => { el.textContent = C.phoneDisplay; if (el.tagName === "A") el.href = "tel:+" + wa; });
  $$("[data-phone-label]").forEach(el => { el.textContent = C.phoneDisplay; });
  $$("[data-facebook]").forEach(a => { if (C.facebook) a.href = C.facebook; else (a.closest("li") || a).hidden = true; });
  $$("[data-youtube]").forEach(a => { if (C.youtube) a.href = C.youtube; else (a.closest("li") || a).hidden = true; });
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
  const homePk = $("#home-packages");
  if (homePk && window.HXPkg && P && C.packages) homePk.innerHTML = window.HXPkg.html(C, P);
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
})();
