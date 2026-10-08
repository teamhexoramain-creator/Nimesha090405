/* HEXORA — the service index (one row per service, two categories side by side or in tabs).
   Used by the home page (home.js) and the service pages (service.js), so a service added or changed in the
   admin panel shows up in both. */
(function (root) {
  "use strict";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const icon = inner => '<svg viewBox="0 0 24 24" aria-hidden="true">' + inner + "</svg>";
  const plain = t => esc(String(t || "").replace(/\{[^}]*\}/g, "").replace(/\s+/g, " ").trim());   // {price} placeholders are not shown in a one-line list

  // text(service) → HTML for the second line; default: the "short" line, or the summary without its {placeholders}
  function row(s, text) {
    return '<li><a class="svx-row" href="service.html?s=' + encodeURIComponent(s.slug) + '"><span class="hex-icon">' + icon(s.icon || "") + "</span>" +
      '<span class="svx-t"><b>' + esc(s.name) + "</b><small>" + (text ? text(s) : plain(s.short || s.summary)) + "</small></span>" +
      '<span class="svx-go" aria-hidden="true">→</span></a></li>';
  }
  // cats: category keys to show. items: show exactly these services (one category only).
  function indexHtml(S, cats, items, text) {
    const one = cats.length === 1, inCat = k => S.list.filter(x => x.cat === k);
    return '<div class="svx rv' + (one ? " svx-one" : "") + '"' + (one ? "" : " data-tabs") + ">" +
      (one ? "" : '<div class="svx-tabs" role="tablist" aria-label="Services categories">' + cats.map((k, i) =>
        '<button type="button" class="svx-tab ' + esc(k) + '" role="tab" id="svt-' + esc(k) + '" aria-controls="svx-' + esc(k) + '" aria-selected="' + (i === 0) + '"' + (i ? ' tabindex="-1"' : "") + ">" +
        esc(S.categories[k].label) + " <b>" + inCat(k).length + "</b></button>").join("") + "</div>") +
      '<div class="svx-cols">' + cats.map((k, i) =>
        '<div class="svx-panel ' + esc(k) + (i === 0 ? " on" : "") + '" id="svx-' + esc(k) + '"' + (one ? "" : ' role="tabpanel" aria-labelledby="svt-' + esc(k) + '"') + ">" +
        '<div class="svx-head"><span class="svc-label ' + esc(k) + '">' + esc(S.categories[k].label) + '</span><p class="muted">' + esc(S.categories[k].note) + "</p></div>" +
        '<ul class="svx-list">' + (items && one ? items : inCat(k)).map(s => row(s, text)).join("") + "</ul></div>").join("") + "</div></div>";
  }
  root.HXSvcUI = { row: row, indexHtml: indexHtml, esc: esc, icon: icon };
})(window);
