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
    tl.tabIndex = 0; tl.setAttribute("aria-label", "වැඩ කරන පියවර");   // a sideways-scrolling list on a phone must be reachable with the keyboard
    if (steps.length) tl.innerHTML = '<li class="tl-fill" aria-hidden="true"></li>' + steps.map((st, i) =>
      '<li class="tl-item rv"><span class="tl-dot">' + pad(i + 1) + '</span><div class="tl-body"><span class="tl-time">' + esc(st.time) + "</span><h3>" + esc(st.t) + "</h3><p>" + tok(st.d) + "</p></div></li>").join("");
    else gone("process");
  }

  const faq = S.home && S.home.faq, fq = $("home-faq");
  if (fq && Array.isArray(faq)) {
    const SHOW = 5;   // the first questions are enough for most people; the rest sit behind one button
    const one = (f, i) => "<details" + (i ? "" : " open") + (i >= SHOW ? ' class="faq-more" hidden' : "") + "><summary>" + esc(f.q) + '</summary><div class="ans"><div><p>' + tok(f.a) + "</p></div></div></details>";
    if (faq.length) {
      fq.innerHTML = faq.map(one).join("") + (faq.length > SHOW ? '<button type="button" class="btn faq-toggle" aria-expanded="false">තව ප්‍රශ්න ' + (faq.length - SHOW) + ' ක් බලන්න</button>' : "");
      const t = fq.querySelector(".faq-toggle");
      if (t) t.addEventListener("click", () => { const open = t.getAttribute("aria-expanded") !== "true"; fq.querySelectorAll(".faq-more").forEach(d => { d.hidden = !open; }); t.setAttribute("aria-expanded", String(open)); t.textContent = open ? "ඉතිරි ප්‍රශ්න හංගන්න" : "තව ප්‍රශ්න " + (faq.length - SHOW) + " ක් බලන්න"; });
    } else gone("faq");
  }
})();
