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
  // icons are small SVG shapes typed in the admin panel: only plain shapes with plain attributes are drawn (no scripts, handlers or links)
  const SHAPES = /^(?:\s*<(?:path|circle|rect|line|polyline|polygon|ellipse)(?:\s+(?!on|href|xlink)[a-z-]+="[^"<>]*")*\s*\/?>)*\s*$/i;
  const icon = inner => '<svg viewBox="0 0 24 24" aria-hidden="true">' + (SHAPES.test(inner || "") ? inner : "") + "</svg>";
  const arrow = '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const bySlug = slug => S.list.find(x => x.slug === slug);
  const inCat = cat => S.list.filter(x => x.cat === cat);
  const link = s => "service.html?s=" + encodeURIComponent(s.slug);

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

  /* ---------- the picture next to the service name ---------- */
  function stageHtml(s) {
    if (s.video) {
      return '<div class="an an-video"><video autoplay muted loop playsinline preload="metadata" aria-label="' + esc(s.name) + ' example">' +
        '<source src="' + esc(s.video) + '" type="video/mp4"></video></div>';
    }
    // a 3D glass tile with the service's icon (main.js loads the 3D only where it can be drawn; until then the logo mark shows)
    return '<div class="an an-3d" data-3d="tile" data-icon="' + esc(SHAPES.test(s.icon || "") ? s.icon || "" : "") + '" aria-hidden="true"></div>';
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

  // the service index (shared with the home page): the one-line text may use {price} placeholders here
  const indexHtml = (cats, items) => window.HXSvcUI.indexHtml(S, cats, items, s => fill(s.short || s.summary));

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
        (showPk(s) && window.HXPkg ? '<div class="rv">' + window.HXPkg.html(C, P) + "</div>" : "") +
      "</div></section>" +

      '<section id="svc-faq"><div class="wrap faq-wrap">' +
        '<div class="faq-left"><div class="section-head rv"><span class="eyebrow">FAQ</span><h2 class="display">' + esc(s.name) + " ගැන ප්‍රශ්න</h2>" +
          '<p class="lead">උත්තරයක් හම්බුනේ නැත්නම් කෙලින්ම අහන්න, Developer කෙනෙක් ඉක්මනට reply කරනවා.</p></div>' +
          '<div class="faq-side"><button class="btn btn-primary" type="button" data-open-chat>Chat කරන්න</button><a class="btn" href="' + esc(ctaHref(s)) + '">Estimate ගන්න</a></div></div>' +
        '<div class="faq rv">' + faq.map((f, i) => "<details" + (i ? "" : " open") + "><summary>" + esc(f.q) + '</summary><div class="ans"><div><p>' + fill(f.a) + "</p></div></div></details>").join("") + "</div>" +
      "</div></section>" +

      (others.length ? '<section class="band"><div class="wrap">' +
        '<div class="section-head rv"><span class="eyebrow">' + esc(cat.label) + '</span><h2 class="display">මේ category එකේ අනිත් services</h2></div>' +
        indexHtml([s.cat], others) +
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
      indexHtml(Object.keys(S.categories)) +
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
