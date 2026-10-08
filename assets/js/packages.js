/* HEXORA — mobile app package cards (home page + the Mobile Apps service page).
   Prices come from config.js → packages (LKR at packageBaseRate, 369). The card shows them
   at the fallback rate; main.js then updates every [data-price-usd] with today's rate. */
(function (root) {
  "use strict";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function html(C, P) {
    const base = C.packageBaseRate || 369;
    return Object.keys(C.packages || {}).map((k, i) => {
      const p = C.packages[k], usd = p.lkr / base;
      return '<article class="price-card spot rv pkg-card" style="--rd:' + (i % 4) + '">' +
        "<h3>" + esc(p.label) + '</h3><span class="price-from">Package</span>' +
        '<div><div class="price-amt" data-price-usd="' + usd.toFixed(4) + '">' + P.formatLKR(P.packageLKR(C, p.lkr, C.fallbackRate)) + "</div>" +
        '<div class="price-usd">≈ USD ' + Math.round(usd) + (p.weeks ? " · සති " + Math.max(1, Math.round(p.weeks)) + " – " + Math.max(2, Math.round(p.weeks * 1.3)) : "") + "</div></div>" +
        "<ul>" + (p.includes || []).map(x => "<li>" + esc(x) + "</li>").join("") + "</ul>" +
        '<a class="btn" href="start-project.html?package=' + encodeURIComponent(k) + '">මේක තෝරගන්න</a></article>';
    }).join("");
  }
  root.HXPkg = { html: html };
})(window);
