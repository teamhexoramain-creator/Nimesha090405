/* HEXORA — mobile app packages as a "ladder": a list of the 9 packages on one side and the chosen package's
   details on the other (home page + the Mobile Apps service page). Prices come from config.js → packages
   (LKR at packageBaseRate, 369). They are shown at the fallback rate; main.js then updates every
   [data-price-usd] with today's rate and wires the ladder up (clicking a package shows its details). */
(function (root) {
  "use strict";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const weeks = p => { if (!p.weeks) return ""; const lo = Math.max(1, Math.round(p.weeks)); return "සති " + lo + " – " + Math.max(lo + 1, Math.round(p.weeks * 1.3)); };   // same range as the estimate (pricing.js)

  function html(C, P) {
    const base = C.packageBaseRate || 369, keys = Object.keys(C.packages || {});
    if (!keys.length) return "";
    const first = keys.find(k => C.packages[k].badge) || keys[0];   // the most popular package is open to begin with
    let rungs = "", panels = "";
    keys.forEach(k => {
      const p = C.packages[k], usd = p.lkr / base, hot = !!p.badge, on = k === first;
      const amt = P.formatLKR(P.packageLKR(C, p.lkr, C.fallbackRate)), href = "start-project.html?package=" + encodeURIComponent(k);
      rungs += '<button type="button" class="rung' + (hot ? " hot" : "") + '" role="tab" id="rung-' + esc(k) + '" aria-controls="pk-' + esc(k) + '" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '">' +
        '<span class="rung-name">' + esc(p.label) + "</span>" +
        '<span class="rung-price" data-price-usd="' + usd.toFixed(4) + '">' + amt + "</span>" +
        '<span class="rung-meta">' + esc(weeks(p)) + "</span>" +
        (hot ? '<span class="rung-badge">' + esc(p.badge) + '</span><svg class="rung-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>' : "") + "</button>";
      panels += '<div class="pk-panel pkg-card' + (hot ? " hot" : "") + (on ? " on" : "") + '" role="tabpanel" id="pk-' + esc(k) + '" aria-labelledby="rung-' + esc(k) + '" data-card>' +
        '<div class="pk-head"><h3>' + esc(p.label) + '</h3><span class="price-from">Package</span>' +
        (hot ? '<a class="pk-badge" href="' + href + '">' + esc(p.badge) + " →</a>" : "") + "</div>" +
        '<div class="pk-price"><div class="price-amt' + (hot ? " grad-text" : "") + '" data-price-usd="' + usd.toFixed(4) + '">' + amt + "</div>" +
        '<div class="price-usd">≈ USD ' + Math.round(usd) + (weeks(p) ? " · " + esc(weeks(p)) : "") + "</div></div>" +
        '<ul class="pk-list">' + (p.includes || []).map(x => "<li>" + esc(x) + "</li>").join("") + "</ul>" +
        '<a class="btn btn-primary" href="' + href + '">මේක තෝරගන්න</a></div>';
    });
    return '<div class="ladder" data-ladder><div class="ladder-list" role="tablist" aria-label="App packages" aria-orientation="vertical">' + rungs + '</div><div class="ladder-panel">' + panels + "</div></div>";
  }
  root.HXPkg = { html: html };
})(window);
