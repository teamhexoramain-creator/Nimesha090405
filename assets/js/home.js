/* HEXORA — builds the changeable parts of the home page from the data in services.js (or what the admin panel saved):
   the service index, the process steps and the FAQ. Runs before main.js, which adds the reveal animations and tabs. */
(function () {
  "use strict";
  const S = window.HX_SERVICES, C = window.HEXORA || {}, U = window.HXSvcUI;
  if (!S || !U || !S.list || !S.categories) return;
  const esc = U.esc, pad = n => String(n).padStart(2, "0");
  const months = C.freeSupportMonths || 1;
  // {support} → "1 month", {advance} → "50%"
  const tok = t => esc(t).replace(/\{support\}/g, months + (months === 1 ? " month" : " months")).replace(/\{advance\}/g, (C.advancePercent || 50) + "%");
  const $ = id => document.getElementById(id);

  const sv = $("home-services");
  if (sv) sv.innerHTML = U.indexHtml(S, Object.keys(S.categories));

  // a list the admin emptied: the whole section goes away instead of showing a heading with nothing under it
  const gone = id => { const el = $(id); if (el) el.hidden = true; };
  const steps = S.home && S.home.steps, tl = $("home-steps");
  if (tl && Array.isArray(steps)) {
    if (steps.length) tl.innerHTML = '<li class="tl-fill" aria-hidden="true"></li>' + steps.map((st, i) =>
      '<li class="tl-item rv"><span class="tl-dot">' + pad(i + 1) + '</span><div class="tl-body"><span class="tl-time">' + esc(st.time) + "</span><h3>" + esc(st.t) + "</h3><p>" + tok(st.d) + "</p></div></li>").join("");
    else gone("process");
  }

  const faq = S.home && S.home.faq, fq = $("home-faq");
  if (fq && Array.isArray(faq)) {
    if (faq.length) fq.innerHTML = faq.map((f, i) => "<details" + (i ? "" : " open") + "><summary>" + esc(f.q) + '</summary><div class="ans"><div><p>' + tok(f.a) + "</p></div></div></details>").join("");
    else gone("faq");
  }
})();
