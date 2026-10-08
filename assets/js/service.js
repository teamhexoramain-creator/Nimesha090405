/* HEXORA — service pages: service.html?s=<slug>  (no slug = all services)
   Text comes from services.js, prices from config.js. This file runs before
   main.js, so main.js still adds the reveal animations, live LKR prices and
   contact links to everything rendered here. */
(function () {
  "use strict";
  const C = window.HEXORA, P = window.HXPrice, S = window.HX_SERVICES;
  const root = document.getElementById("svc-root");
  if (!root || !C || !P || !S) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const lkrText = usd => P.formatLKR(P.smartRound(usd * C.fallbackRate, C));
  const money = usd => '<span data-price-usd="' + usd + '">' + lkrText(usd) + "</span>";
  const icon = inner => '<svg viewBox="0 0 24 24" aria-hidden="true">' + inner + "</svg>";
  const arrow = '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const bySlug = slug => S.list.find(x => x.slug === slug);
  const inCat = cat => S.list.filter(x => x.cat === cat);
  const link = s => "service.html?s=" + s.slug;

  /* ---------- prices from config.js ---------- */
  const POOLS = { type: "types", creative: "creative", feature: "features", extra: "extras", maint: "sizes", design: "design", package: "packages" };
  function refOf(ref) {
    for (const kind in POOLS) {
      if (!ref[kind]) continue;
      const item = (C[POOLS[kind]] || {})[ref[kind]];
      return item ? { kind: kind, key: ref[kind], item: item } : null;
    }
    return null;
  }
  function usdOf(ref) {
    const r = refOf(ref);
    if (!r) return null;
    if (r.kind === "package") return r.item.lkr / (C.packageBaseRate || 369);
    return r.kind === "maint" ? r.item.maintenanceUsd : r.item.usd;
  }
  const weeksText = w => { const lo = Math.max(1, Math.round(w)); return "සති " + lo + " – " + Math.max(lo + 1, Math.round(w * 1.3)); };
  const daysText = d => { const lo = Math.max(1, Math.round(d)); return "දවස් " + lo + " – " + Math.max(lo + 1, Math.ceil(d * 1.3)); };

  /* {support} {advance} {urgent} {feature:ai} {creative:photo} ... */
  function fill(text) {
    return esc(text).replace(/\{(\w+)(?::(\w+))?\}/g, (all, kind, key) => {
      if (!key) {
        if (kind === "support") { const m = C.freeSupportMonths || 1; return m + (m === 1 ? " month" : " months"); }
        if (kind === "advance") return (C.advancePercent || 50) + "%";
        if (kind === "urgent") return ((C.urgency.fast && C.urgency.fast.percent) || 25) + "%";
        return all;
      }
      const usd = usdOf({ [kind]: key });
      return usd == null ? all : money(usd);
    });
  }

  // the Mobile Apps page shows the app packages (set "packages" in the admin panel; old saved data without it: slug mobile-apps)
  const showPk = s => !!C.packages && (s.packages === true || (s.packages === undefined && s.slug === "mobile-apps"));
  const pricesOf = s => (s.prices || []).filter(r => !(showPk(s) && r.type && C.types[r.type] && C.types[r.type].kind !== "web"));
  function ctaHref(s) {
    if (showPk(s)) return "start-project.html?track=pkg";
    for (const ref of s.prices || []) {
      const r = refOf(ref);
      if (r && r.kind === "type") return "start-project.html?type=" + r.key;
      if (r && r.kind === "creative") return "start-project.html?track=creative&item=" + r.key;
    }
    return s.cat === "creative" ? "start-project.html?track=creative" : "start-project.html";
  }

  function priceCard(ref, i) {
    const r = refOf(ref);
    if (!r) return "";
    const it = r.item, hot = !!ref.featured;
    const amt = usd => '<div class="price-amt' + (hot ? " grad-text" : "") + '" data-price-usd="' + usd + '">' + lkrText(usd) + "</div>";
    let title = it.label, from = "පටන් ගන්නේ", price, sub, points = [], href = "start-project.html";
    if (r.kind === "type") {
      price = amt(it.usd); sub = "≈ USD " + it.usd;
      points = [it.note, weeksText(it.weeks) + " විතර (small)", it.includesAdmin ? "Admin panel include" : ""];
      href = "start-project.html?type=" + r.key;
    } else if (r.kind === "creative") {
      price = amt(it.usd); sub = "≈ USD " + it.usd + " · " + it.unit + " එකක්";
      points = [it.note, daysText(it.days) + " විතර"];
      href = "start-project.html?track=creative&item=" + r.key;
    } else if (r.kind === "package") {
      from = "Package"; price = amt(it.lkr / (C.packageBaseRate || 369)); sub = "≈ USD " + Math.round(it.lkr / (C.packageBaseRate || 369));
      points = it.includes || []; href = "start-project.html?package=" + r.key;
    } else if (r.kind === "feature") {
      from = "Add-on feature"; price = amt(it.usd); sub = "≈ USD " + it.usd;
      points = ["App / website / system එකකට එකතු කරන්න", "කාලයට සති " + it.weeks + " ක් එකතු වෙනවා"];
    } else if (r.kind === "extra") {
      from = "Launch extra"; price = amt(it.usd); sub = "≈ USD " + it.usd;
      points = [it.note];
    } else if (r.kind === "maint") {
      title = "Maintenance · " + it.label; from = "මාසයට";
      price = amt(it.maintenanceUsd); sub = "≈ USD " + it.maintenanceUsd + " · මාසයට";
      points = [it.note, "Updates, bug fixes, server checks"];
    } else if (r.kind === "design") {
      from = "Design";
      if (it.percent) {
        price = '<div class="price-amt' + (hot ? " grad-text" : "") + '">+' + it.percent + "%</div>";
        sub = "Project price එකට" + (it.usd ? " + " + money(it.usd) : "");
      } else if (it.usd) { price = amt(it.usd); sub = "≈ USD " + it.usd; }
      else { price = '<div class="price-amt">Free</div>'; sub = "Design charge එකක් නෑ"; }
      points = [it.note];
    }
    return '<article class="price-card spot rv' + (hot ? " featured" : "") + '" style="--rd:' + (i % 4) + '">' +
      "<h3>" + esc(title) + '</h3><span class="price-from">' + esc(from) + "</span>" +
      "<div>" + price + '<div class="price-usd">' + sub + "</div></div>" +
      "<ul>" + points.filter(Boolean).map(p => "<li>" + esc(p) + "</li>").join("") + "</ul>" +
      '<a class="btn' + (hot ? " btn-primary" : "") + '" href="' + esc(href) + '">Estimate ගන්න</a></article>';
  }

  /* ---------- animations (pure HTML + CSS, see style.css) ---------- */
  const ANIMS = {
    phone: '<div class="ph"><span class="ph-notch"></span><div class="ph-screen"><span class="ph-bar"></span><span class="ph-card"></span><span class="ph-card"></span><span class="ph-card"></span><span class="ph-btn"></span></div></div>',
    browser: '<div class="br"><div class="br-top"><i></i><i></i><i></i><span>oyage-business.lk</span></div><div class="br-body"><span class="br-nav"></span><span class="br-h1"></span><span class="br-p"></span><span class="br-cta"></span><div class="br-row"><span></span><span></span><span></span></div></div><span class="an-cursor"></span></div>',
    dashboard: '<div class="db"><div class="db-kpis"><div><small>Sales</small><b>LKR 248K</b></div><div><small>Orders</small><b>1,204</b></div><div><small>Users</small><b>36</b></div></div><div class="db-chart"><i style="--h:38%"></i><i style="--h:56%"></i><i style="--h:44%"></i><i style="--h:72%"></i><i style="--h:60%"></i><i style="--h:86%"></i><i style="--h:70%"></i></div></div>',
    backend: '<div class="be"><div class="be-db"><span></span><span></span><span></span><small>Database</small></div><div class="be-wire"><i></i><i></i><i></i></div><div class="be-panel"><div class="be-head"><span class="be-lock"></span>Admin</div><span class="be-row"></span><span class="be-row"></span><span class="be-row"></span></div></div>',
    chat: '<div class="ch"><div class="ch-top"><span class="ch-av"></span><b>AI Assistant</b><small>online</small></div><div class="ch-msg me m1">මගේ order එක කොහෙද?</div><div class="ch-msg bot m2"><span class="ch-dots"><i></i><i></i><i></i></span><span class="ch-txt">Order එක අද delivery වෙනවා.</span></div><div class="ch-msg me m3">Thank you!</div></div>',
    server: '<div class="sv"><div class="sv-rack"><div class="sv-u"><i></i><i></i><span></span></div><div class="sv-u"><i></i><i></i><span></span></div><div class="sv-u"><i></i><i></i><span></span></div><svg class="sv-pulse" viewBox="0 0 160 40"><polyline points="0,20 40,20 48,8 56,32 64,20 96,20 104,5 112,35 120,20 160,20"/></svg></div><ul class="sv-checks"><li>Updates</li><li>Bug fixes</li><li>Domain</li><li>Server checks</li></ul></div>',
    logo: '<div class="lg"><div class="lg-art"><svg class="lg-svg" viewBox="0 0 64 64"><circle class="lg-guide" cx="32" cy="32" r="30"/><path class="lg-guide" d="M2 32h60M32 2v60"/><path class="lg-hex" d="M32 3l26 15v28L32 61 6 46V18z"/></svg><span class="lg-mark"></span></div><div class="lg-sw"><i></i><i></i><i></i></div></div>',
    social: '<div class="so">' + '<div class="so-post"><span class="so-img"></span><span class="so-line"></span><span class="so-act"><i class="so-heart"></i><b>1.2K</b></span></div>'.repeat(3) + "</div>",
    photo: '<div class="pe"><div class="pe-scene pe-before"><i class="pe-clutter c1"></i><i class="pe-clutter c2"></i><i class="pe-prod"></i></div><div class="pe-scene pe-after"><i class="pe-prod"></i></div><span class="pe-line"></span><span class="pe-tag b">Before</span><span class="pe-tag a">After</span></div>',
    timeline: '<div class="vt"><div class="vt-screen"><span class="vt-play"></span><span class="vt-sub">Subtitles + music</span></div><div class="vt-tracks"><div class="vt-track"><b style="--x:0%;--w:30%"></b><b style="--x:32%;--w:38%"></b><b style="--x:72%;--w:28%"></b></div><div class="vt-track wave"><b style="--x:0%;--w:100%"></b></div><div class="vt-track subs"><b style="--x:6%;--w:18%"></b><b style="--x:30%;--w:22%"></b><b style="--x:58%;--w:16%"></b><b style="--x:80%;--w:14%"></b></div><span class="vt-head"></span></div></div>',
    uiux: '<div class="ux"><div class="ux-frame"><span class="ux-el ux-top"></span><span class="ux-el ux-img"></span><span class="ux-el ux-t1"></span><span class="ux-el ux-t2"></span><span class="ux-el ux-btn"></span></div><div class="ux-labels"><span class="w">Wireframe</span><span class="d">Design</span></div><span class="an-cursor"></span></div>'
  };
  const WITH_CHIPS = ["phone", "browser", "dashboard", "backend", "logo", "social"];

  function stageHtml(s) {
    if (s.video) {
      return '<div class="an an-video"><video autoplay muted loop playsinline preload="metadata" aria-label="' + esc(s.name) + ' example">' +
        '<source src="' + esc(s.video) + '" type="video/mp4"></video></div>';
    }
    const chips = WITH_CHIPS.indexOf(s.anim) === -1 ? "" :
      (s.tags || []).slice(0, 3).map((t, i) => '<span class="an-chip k' + (i + 1) + '">' + esc(t) + "</span>").join("");
    return '<div class="an an-' + esc(s.anim) + '" aria-hidden="true">' + (ANIMS[s.anim] || "") + chips + "</div>";
  }

  /* ---------- building blocks ---------- */
  function browseHtml(cur) {
    const cats = Object.keys(S.categories);
    return '<nav class="svc-browse" aria-label="Service categories"><div class="wrap">' +
      '<div class="cat-tabs" role="tablist">' + cats.map(k =>
        '<button type="button" role="tab" class="cat-tab ' + k + '" id="tab-' + k + '" aria-controls="chips-' + k + '" aria-selected="' + (k === cur.cat) + '">' +
        esc(S.categories[k].label) + " <span>" + inCat(k).length + "</span></button>").join("") + "</div>" +
      cats.map(k => '<div class="svc-chips ' + k + '" id="chips-' + k + '" role="tabpanel" aria-labelledby="tab-' + k + '"' + (k === cur.cat ? "" : " hidden") + ">" +
        inCat(k).map(s => '<a class="svc-chip" href="' + link(s) + '"' + (s === cur ? ' aria-current="page"' : "") + ">" + icon(s.icon) + esc(s.name) + "</a>").join("") +
        "</div>").join("") +
      "</div></nav>";
  }

  function card(s, i) {
    return '<article class="service spot rv' + (s.cat === "creative" ? " creative" : "") + '" style="--rd:' + (i % 3) + '">' +
      '<div class="hex-icon">' + icon(s.icon) + "</div>" +
      '<h3><a class="svc-link" href="' + link(s) + '">' + esc(s.name) + "</a></h3>" +
      "<p>" + fill(s.summary) + "</p>" +
      '<div class="tags">' + (s.tags || []).map(t => "<span>" + esc(t) + "</span>").join("") + "</div>" +
      '<span class="svc-more" aria-hidden="true">විස්තර බලන්න →</span></article>';
  }

  function ctaBand(s) {
    const wa = s ? "Hi Hexora! මට " + s.name + " ගැන කතා කරන්න ඕන." : "Hi Hexora! මට project එකක් ගැන කතා කරන්න ඕන.";
    return '<section><div class="wrap"><div class="cta-band rv"><div>' +
      '<h2 class="display">' + (s ? esc(s.name) + " ඕන ද?" : "Project එකක් තියෙනවද?") + "</h2>" +
      '<p class="lead">ප්‍රශ්න ටිකකට උත්තර දීලා විනාඩි 2කින් estimate price එකක් ගන්න. සල්ලි ඕන නෑ, commitment එකක් නෑ.</p></div>' +
      '<div class="cta-actions"><a class="btn btn-primary" href="' + esc(s ? ctaHref(s) : "start-project.html") + '">Estimate ගන්න</a>' +
      '<a class="btn btn-wa" data-wa-link="' + esc(wa) + '" href="https://wa.me/' + esc((C.whatsapp || "").replace(/\D/g, "")) + '" target="_blank" rel="noopener">WhatsApp කරන්න</a></div>' +
      "</div></div></section>";
  }

  /* ---------- one service ---------- */
  function detailHtml(s) {
    const cat = S.categories[s.cat];
    const others = inCat(s.cat).filter(x => x !== s);
    const faq = (s.faq || []).concat(S.commonFaq || []);
    return browseHtml(s) +
      '<section class="svc-hero"><div class="wrap svc-hero-grid">' +
        '<div class="svc-hero-copy">' +
          '<ol class="crumbs fade-up" style="--d:80ms"><li><a href="index.html">Home</a></li><li><a href="service.html">Services</a></li><li>' + esc(cat.label) + "</li></ol>" +
          '<h1 class="display" data-split style="--d:180ms">' + esc(s.name) + "</h1>" +
          '<p class="lead fade-up" style="--d:500ms">' + fill(s.intro) + "</p>" +
          '<div class="tags fade-up" style="--d:600ms">' + (s.tags || []).map(t => "<span>" + esc(t) + "</span>").join("") + "</div>" +
          '<div class="hero-actions fade-up" style="--d:700ms"><a class="btn btn-primary" href="' + esc(ctaHref(s)) + '">Estimate ගන්න' + arrow + "</a>" +
          '<a class="btn" href="#svc-pricing">Prices බලන්න</a></div>' +
        "</div>" +
        '<div class="svc-stage fade-up" style="--d:300ms"><div class="video-frame">' + stageHtml(s) + "</div></div>" +
      "</div></section>" +

      '<section id="svc-details" class="svc-section"><div class="wrap"><div class="svc-detail">' +
        '<div class="svc-box rv"><span class="eyebrow">මොකද ලැබෙන්නේ</span><h2 class="display">' + esc(s.name) + " එකේ තියෙන දේවල්</h2>" +
          '<ul class="inc-list">' + (s.includes || []).map(x => "<li>" + fill(x) + "</li>").join("") + "</ul></div>" +
        '<div class="svc-box rv" style="--rd:1"><span class="eyebrow">වැඩ කරන විදිය</span>' +
          '<ol class="mini-steps">' + (cat.steps || []).map((st, i) => '<li><span class="n">0' + (i + 1) + "</span><div><b>" + esc(st.t) + "</b><p>" + fill(st.d) + "</p></div></li>").join("") + "</ol></div>" +
      "</div></div></section>" +

      '<section id="svc-pricing" class="band"><div class="wrap">' +
        '<div class="section-head rv"><span class="eyebrow">Pricing</span><h2 class="display">' + esc(s.name) + " ගණන්</h2>" +
          '<p class="lead">මේක පටන් ගන්න ගණන්. අද dollar rate එකෙන් LKR වලට auto මාරු වෙනවා. Final price එක ඔයාට ඕන features, items ගණන අනුව වෙනස් වෙනවා.</p>' +
          '<span class="rate-pill" data-rate-pill><span class="live"></span><span data-rate-text>1 USD = LKR ' + Number(C.fallbackRate).toFixed(2) + " · approx.</span></span></div>" +
        (pricesOf(s).length ? '<div class="prices svc-prices">' + pricesOf(s).map(priceCard).join("") + "</div>" : "") +
        (showPk(s) && window.HXPkg ? '<div class="prices pkg-prices svc-prices">' + window.HXPkg.html(C, P) + "</div>" : "") +
      "</div></section>" +

      '<section id="svc-faq"><div class="wrap">' +
        '<div class="section-head center rv"><span class="eyebrow">FAQ</span><h2 class="display">' + esc(s.name) + " ගැන ප්‍රශ්න</h2></div>" +
        '<div class="faq rv">' + faq.map((f, i) => "<details" + (i ? "" : " open") + "><summary>" + esc(f.q) + '</summary><div class="ans"><div><p>' + fill(f.a) + "</p></div></div></details>").join("") + "</div>" +
      "</div></section>" +

      (others.length ? '<section class="band"><div class="wrap">' +
        '<div class="section-head rv"><span class="eyebrow">' + esc(cat.label) + '</span><h2 class="display">මේ category එකේ අනිත් services</h2></div>' +
        '<div class="services">' + others.map(card).join("") + "</div>" +
      "</div></section>" : "") +

      ctaBand(s);
  }

  /* ---------- all services ---------- */
  function hubHtml(missing) {
    return '<section class="svc-hero svc-hub"><div class="wrap">' +
      '<div class="section-head">' +
        (missing ? '<div class="form-alert" role="alert">මේ service එක හම්බුනේ නෑ. පහළ list එකෙන් service එකක් තෝරගන්න.</div>' : "") +
        '<ol class="crumbs fade-up" style="--d:80ms"><li><a href="index.html">Home</a></li><li>Services</li></ol>' +
        '<h1 class="display" data-split style="--d:150ms">ඔක්කොම services</h1>' +
        '<p class="lead fade-up" style="--d:450ms">Service එකක් තෝරගන්න. හැම එකකම animation එක, මොකද ලැබෙන්නේ, pricing සහ FAQ තියෙනවා.</p>' +
      "</div>" +
      Object.keys(S.categories).map(k =>
        '<div class="svc-group rv"><span class="svc-label ' + k + '">' + esc(S.categories[k].label) + '</span><p class="muted">' + esc(S.categories[k].note) + "</p></div>" +
        '<div class="services">' + inCat(k).map(card).join("") + "</div>").join("") +
      "</div></section>" + ctaBand(null);
  }

  /* ---------- render ---------- */
  const fromQuery = new URLSearchParams(location.search).get("s");
  const fromHash = location.hash.slice(1);
  const slug = fromQuery || (bySlug(fromHash) ? fromHash : "");
  const cur = slug ? bySlug(slug) : null;
  root.innerHTML = cur ? detailHtml(cur) : hubHtml(!!slug);

  document.title = (cur ? cur.name : "Services") + " | Hexora";
  const meta = $('meta[name="description"]');
  if (meta && cur) meta.setAttribute("content", cur.name + " — " + cur.summary);
  const navServices = $('.nav-links a[href="service.html"]');
  if (navServices && !cur) navServices.setAttribute("aria-current", "page");

  // category tabs: switch which services are listed
  $$(".cat-tab", root).forEach(tab => tab.addEventListener("click", () => {
    $$(".cat-tab", root).forEach(t => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
  }));
  // keep the current service visible in its scrolling row
  const curChip = $('.svc-chip[aria-current="page"]', root);
  if (curChip) { const row = curChip.parentElement; row.scrollLeft = curChip.offsetLeft - row.offsetLeft - (row.clientWidth - curChip.offsetWidth) / 2; }

  const vid = $(".an-video video", root);
  if (vid && reduce) { vid.removeAttribute("autoplay"); vid.pause(); vid.controls = true; }

  // service.html#slug links (no ?s=) switch service by reloading the page
  window.addEventListener("hashchange", () => {
    const next = location.hash.slice(1);
    if (!fromQuery && next !== slug && bySlug(next)) location.reload();
  });
})();
