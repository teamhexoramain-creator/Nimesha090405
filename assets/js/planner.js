/* HEXORA — "Project eka patan ganna" form + live estimate
   Two tracks: "dev" (apps / websites / systems) and "creative" (logo, design, video). */
(function () {
  "use strict";
  const C = window.HEXORA, P = window.HXPrice;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const form = $("#project-form");
  if (!form || !C || !P) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DRAFT = "hexora_project_draft_v2";
  const MAXQ = 99;

  let rate = { rate: C.fallbackRate, date: null, live: false };
  let last = null;

  const lkr = usd => P.formatLKR(P.smartRound(usd * rate.rate, C));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtDate = d => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  /* ---------- build option tiles from config ---------- */
  function tile(type, name, value, title, sub, priceHtml) {
    return '<label class="opt"><input type="' + type + '" name="' + name + '" value="' + value + '">' +
      '<span class="opt-box"><span class="tick"></span><span class="t">' + esc(title) + '</span>' +
      (priceHtml ? '<span class="p" data-p="' + name + ':' + value + '">' + priceHtml + "</span>" : "") +
      (sub ? '<span class="s">' + esc(sub) + "</span>" : "") + "</span></label>";
  }
  function crItem(k, it) {
    return '<div class="cr-item" data-key="' + k + '">' +
      '<button type="button" class="cr-info" data-toggle="' + k + '"><span class="t">' + esc(it.label) + '</span>' +
      '<span class="s">' + esc(it.note) + '</span><span class="p" data-p="creative:' + k + '"></span></button>' +
      '<div class="qty"><button type="button" data-d="-1" aria-label="' + esc(it.label) + ' අඩු කරන්න">−</button>' +
      '<input type="number" inputmode="numeric" min="0" max="' + MAXQ + '" value="0" name="cr-' + k + '" aria-label="' + esc(it.label) + ' ගණන">' +
      '<button type="button" data-d="1" aria-label="' + esc(it.label) + ' වැඩි කරන්න">+</button></div></div>';
  }
  function buildOptions() {
    $("#opt-type").innerHTML = Object.entries(C.types).map(([k, t]) => tile("radio", "type", k, t.label, t.note, "")).join("");
    $("#opt-size").innerHTML = Object.entries(C.sizes).map(([k, s]) => tile("radio", "size", k, s.label, s.note, s.priceX === 1 ? "" : "×" + s.priceX)).join("");
    $("#opt-features").innerHTML = Object.entries(C.features).map(([k, f]) => tile("checkbox", "features", k, f.label, "", "+")).join("");
    $("#opt-design").innerHTML = Object.entries(C.design).map(([k, d]) => tile("radio", "design", k, d.label, d.note, "+")).join("");
    $("#opt-extras").innerHTML = Object.entries(C.extras).map(([k, x]) => tile("checkbox", "extras", k, x.label, x.note, "+")).join("");
    $("#opt-urgency").innerHTML = Object.entries(C.urgency).map(([k, u]) => tile("radio", "urgency", k, u.label, u.note, u.percent ? "+" + u.percent + "%" : "")).join("");
    $("#opt-creative").innerHTML = Object.entries(C.creative || {}).map(([k, it]) => crItem(k, it)).join("");
  }
  function refreshPriceTags() {
    Object.entries(C.features).forEach(([k, f]) => { const el = $('[data-p="features:' + k + '"]'); if (el) el.textContent = "+" + lkr(f.usd); });
    Object.entries(C.extras).forEach(([k, x]) => { const el = $('[data-p="extras:' + k + '"]'); if (el) el.textContent = "+" + lkr(x.usd); });
    Object.entries(C.design).forEach(([k, d]) => {
      const el = $('[data-p="design:' + k + '"]'); if (!el) return;
      el.textContent = d.percent ? "+" + d.percent + "%" + (d.usd ? " +" + lkr(d.usd) : "") : (d.usd ? "+" + lkr(d.usd) : "Free");
    });
    Object.entries(C.creative || {}).forEach(([k, it]) => {
      const el = $('[data-p="creative:' + k + '"]'); if (el) el.textContent = lkr(it.usd) + " / " + it.unit;
    });
  }

  /* ---------- read selection ---------- */
  const val = name => { const el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ""; };
  const vals = name => $$('input[name="' + name + '"]:checked', form).map(i => i.value);
  const track = () => val("track") || "dev";
  function qtyOf(k) {
    const el = form.querySelector('input[name="cr-' + k + '"]');
    const n = el ? parseInt(el.value, 10) : 0;
    return isNaN(n) ? 0 : Math.min(MAXQ, Math.max(0, n));
  }
  function creativeItems() {
    const out = {};
    Object.keys(C.creative || {}).forEach(k => { const q = qtyOf(k); if (q) out[k] = q; });
    return out;
  }
  function selection() {
    return { type: val("type"), size: val("size"), features: vals("features"), design: val("design"), extras: vals("extras"), urgency: val("urgency") || "normal" };
  }

  /* ---------- show the parts that belong to the chosen track ---------- */
  function applyTrack() {
    const t = track();
    $$("[data-track]", form).forEach(el => { el.hidden = el.getAttribute("data-track") !== t; });
    $$("[data-dev-only]").forEach(el => { el.hidden = t !== "dev"; });
    const mb = $("#est-maint-box"); if (mb) mb.hidden = t !== "dev";
    const note = $(".estimate .est-note");
    if (note) note.textContent = t === "dev"
      ? "මේක estimate එකක්. Final price එක free call එකෙන් පස්සේ fixed quote එකක් විදියට දෙනවා. Google / Apple / domain fees වෙනම."
      : "මේක estimate එකක්. Revisions include. Final price එක chat එකෙන් confirm කරලා වැඩ පටන් ගන්නවා.";
  }

  /* ---------- enable / disable dev options that don't fit the type ---------- */
  function applyRules() {
    const t = C.types[val("type")];
    const adminBox = form.querySelector('input[name="features"][value="admin"]');
    if (adminBox) {
      const inc = !!(t && t.includesAdmin);
      adminBox.disabled = inc;
      if (inc) adminBox.checked = false;
      const s = adminBox.parentElement.querySelector(".s");
      const box = adminBox.parentElement.querySelector(".opt-box");
      if (inc && !s) box.insertAdjacentHTML("beforeend", '<span class="s">මේ type එකට දැනටම include</span>');
      if (!inc && s) s.remove();
    }
    $$('input[name="extras"]', form).forEach(i => {
      const x = C.extras[i.value];
      const ok = !t || x.for.indexOf(t.kind) !== -1;
      i.disabled = !ok;
      if (!ok) i.checked = false;
    });
    $$(".cr-item", form).forEach(el => el.classList.toggle("on", qtyOf(el.getAttribute("data-key")) > 0));
  }

  /* ---------- number animation ---------- */
  function tweenText(el, from, to, fmt) {
    if (reduce || from === to || from == null) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 500;
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
  }
  const rnd = v => P.formatLKR(P.roundLKR(v, 100));
  const totalHtml = (lo, hi, sub) => rnd(lo) + '<span class="to">' + (hi != null ? "දක්වා " + rnd(hi) : sub) + "</span>";

  /* ---------- current estimate (either track) in one shape ---------- */
  function currentEstimate() {
    if (track() === "creative") {
      const e = P.estimateCreative(C, creativeItems(), val("urgency") || "normal", rate.rate);
      if (!e) return null;
      return { kind: "creative", lo: e.totalLKR, hi: null, usdText: "≈ USD " + e.usd, time: "දවස් " + e.daysLow + " – " + e.daysHigh,
        advance: e.advanceLKR, lines: e.lines, raw: e };
    }
    const e = P.estimate(C, selection(), rate.rate);
    if (!e) return null;
    return { kind: "dev", lo: e.lowLKR, hi: e.highLKR, usdText: "≈ USD " + e.usd.toLocaleString("en-US") + " – " + e.usdHigh.toLocaleString("en-US"),
      time: "සති " + e.weeksLow + " – " + e.weeksHigh, advance: e.advanceLKR, lines: e.lines, maintenance: e.maintenanceLKR, raw: e };
  }

  /* ---------- render estimate ---------- */
  function render() {
    applyRules();
    const e = currentEstimate();
    const total = $("#est-total"), bar = $("#bar-total");
    if (!e) {
      total.textContent = track() === "creative" ? "Items තෝරගන්න" : "Type & size තෝරගන්න";
      bar.textContent = track() === "creative" ? "Items තෝරගන්න" : "Type එක තෝරගන්න";
      $("#est-usd").textContent = "";
      ["#est-weeks", "#est-adv", "#est-maint"].forEach(s => $(s).textContent = "—");
      $("#est-lines").innerHTML = "";
      last = null;
      updateStepper();
      return;
    }
    const prev = last && last.kind === e.kind ? last : null;
    const sub = "Estimate · revisions include";
    if (!reduce && prev) {
      const t0 = performance.now(), dur = 550;
      const step = t => {
        const k = Math.min(1, (t - t0) / dur), q = 1 - Math.pow(1 - k, 3);
        const lo = prev.lo + (e.lo - prev.lo) * q;
        const hi = e.hi == null ? null : prev.hi + (e.hi - prev.hi) * q;
        total.innerHTML = totalHtml(lo, hi, sub);
        if (k < 1) requestAnimationFrame(step); else total.innerHTML = totalHtml(e.lo, e.hi, sub);
      };
      requestAnimationFrame(step);
      if (prev.lo !== e.lo) { total.classList.remove("bump"); void total.offsetWidth; total.classList.add("bump"); }
    } else total.innerHTML = totalHtml(e.lo, e.hi, sub);

    $("#est-usd").textContent = e.usdText;
    $("#est-weeks").textContent = e.time;
    tweenText($("#est-adv"), prev ? prev.advance : null, e.advance, rnd);
    if (e.maintenance != null) $("#est-maint").textContent = P.formatLKR(e.maintenance) + " / මාසයට";
    $("#est-lines").innerHTML = e.lines.map(l => "<li><span>" + esc(l.label) + "</span><b>" + P.formatLKR(l.lkr) + "</b></li>").join("");
    bar.textContent = P.formatLKR(e.lo) + (e.hi != null ? " +" : "");
    last = e;
    updateStepper();
  }

  function showRate() {
    const box = $("#est-rate");
    box.classList.toggle("offline", !rate.live);
    const d = rate.date ? new Date(rate.date) : null;
    $("#est-rate-text").textContent = "1 USD = LKR " + rate.rate.toFixed(2) + (rate.live && d ? " · updated " + fmtDate(d) : " · approx. rate");
  }

  /* ---------- stepper / completed sections ---------- */
  function stepDone(n) {
    const v = id => ($("#" + id).value || "").trim();
    const dev = track() === "dev";
    switch (n) {
      case 1: return v("f-name").length > 1 && phoneOk(v("f-phone"));
      case 2: return v("f-desc").length >= 15;
      case 3: return dev ? (!!val("type") && !!val("size")) : Object.keys(creativeItems()).length > 0;
      case 4: return dev && vals("features").length > 0;
      case 5: return dev && !!val("design");
      case 6: return !!val("urgency") && (!!v("f-budget") || !!v("f-deadline"));
    }
    return false;
  }
  function updateStepper() {
    for (let n = 1; n <= 6; n++) {
      const d = stepDone(n);
      const chip = $('[data-stepper="' + n + '"]'); if (chip) chip.classList.toggle("done", d);
      const fs = $('[data-step="' + n + '"]'); if (fs) fs.classList.toggle("complete", d);
    }
  }

  /* ---------- validation ---------- */
  function phoneOk(p) {
    const d = (p || "").replace(/[^\d+]/g, "");
    return /^(?:\+?94|0)?7\d{8}$/.test(d) || /^(?:\+?94|0)\d{9}$/.test(d) || /^\+\d{8,15}$/.test(d);
  }
  const emailBad = em => !!em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
  function checks() {
    const dev = track() === "dev";
    return {
      name: $("#f-name").value.trim().length < 2,
      phone: !phoneOk($("#f-phone").value),
      email: emailBad($("#f-email").value.trim()),
      desc: $("#f-desc").value.trim().length < 15,
      type: dev && !val("type"),
      size: dev && !val("size"),
      creative: !dev && Object.keys(creativeItems()).length === 0
    };
  }
  function validate() {
    const c = checks(), errs = [];
    Object.keys(c).forEach(k => {
      const el = $('[data-field="' + k + '"]');
      if (el) el.classList.toggle("invalid", c[k]);
      if (c[k] && el) errs.push(el);
    });
    return errs;
  }
  function validateField(f) {
    const k = f.getAttribute("data-field"), c = checks();
    if (k in c) f.classList.toggle("invalid", c[k]);
  }

  /* ---------- draft (per browser) ---------- */
  function saveDraft() {
    try {
      const data = {};
      $$("input, textarea, select", form).forEach(el => {
        if (!el.name) return;
        if (el.type === "radio") { if (el.checked) data[el.name] = el.value; }
        else if (el.type === "checkbox") { (data[el.name] = data[el.name] || []); if (el.checked) data[el.name].push(el.value); }
        else data[el.name] = el.value;
      });
      localStorage.setItem(DRAFT, JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }
  function loadDraft() {
    try {
      const data = JSON.parse(localStorage.getItem(DRAFT) || "null");
      if (!data) return false;
      Object.entries(data).forEach(([k, v]) => {
        $$('[name="' + k + '"]', form).forEach(el => {
          if (el.type === "radio") el.checked = el.value === v;
          else if (el.type === "checkbox") el.checked = Array.isArray(v) && v.indexOf(el.value) !== -1;
          else el.value = v;
        });
      });
      return true;
    } catch (e) { return false; }
  }

  /* ---------- message ---------- */
  function makeRef() {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    return "HX-" + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + "-" + Math.floor(1000 + Math.random() * 9000);
  }
  function buildMessage(ref) {
    const v = id => ($("#" + id).value || "").trim();
    const est = currentEstimate();
    const dl = v("f-deadline") ? fmtDate(new Date(v("f-deadline") + "T00:00:00")) : "-";
    const rd = rate.live && rate.date ? fmtDate(new Date(rate.date)) : "approx.";
    const urg = C.urgency[val("urgency") || "normal"];
    const L = [];
    L.push("*HEXORA – New Project Request*");
    L.push("Ref: " + ref);
    L.push("Date: " + new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }));
    L.push("");
    L.push("*Customer*");
    L.push("Name: " + v("f-name"));
    L.push("WhatsApp: " + v("f-phone"));
    L.push("Email: " + (v("f-email") || "-"));
    L.push("Business: " + (v("f-business") || "-"));
    L.push("Contact කරන්න: " + (val("contact") || "WhatsApp"));
    L.push("");
    L.push("*Idea*");
    L.push("Name: " + (v("f-appname") || "-"));
    L.push("For: " + (v("f-users") || "-"));
    L.push("Description: " + v("f-desc"));
    L.push("Examples: " + (v("f-refs") || "-"));
    L.push("");
    if (est.kind === "dev") {
      const sel = selection(), t = C.types[sel.type], s = C.sizes[sel.size];
      const feats = sel.features.filter(k => !(k === "admin" && t.includesAdmin)).map(k => C.features[k].label);
      if (t.includesAdmin) feats.unshift("Admin Panel (included)");
      const extras = sel.extras.map(k => C.extras[k].label);
      L.push("*Project — App / Website / System*");
      L.push("Type: " + t.label + " (" + s.label + " – " + s.note + ")");
      L.push("Features: " + (feats.length ? feats.join(", ") : "-"));
      L.push("Design: " + (C.design[sel.design] ? C.design[sel.design].label : "-"));
      L.push("Extras: " + (extras.length ? extras.join(", ") : "-"));
    } else {
      L.push("*Project — Logo, Design & Video*");
      est.raw.lines.filter(l => l.key).forEach(l => {
        L.push("• " + l.label + " = " + P.formatLKR(l.lkr));
      });
    }
    L.push("Speed: " + urg.label);
    L.push("Deadline: " + dl);
    L.push("Budget: " + (v("f-budget") || "-"));
    L.push("");
    L.push("*Estimate*");
    if (est.kind === "dev") L.push(P.formatLKR(est.lo) + " – " + P.formatLKR(est.hi) + " (" + est.usdText + ")");
    else L.push(P.formatLKR(est.lo) + " (" + est.usdText + ")");
    L.push("Time: " + est.time);
    L.push("Advance (" + C.advancePercent + "%): " + P.formatLKR(est.advance));
    if (est.kind === "dev") L.push("Maintenance: " + P.formatLKR(est.maintenance) + " / මාසයට (optional)");
    L.push("Rate: 1 USD = LKR " + rate.rate.toFixed(2) + " (" + rd + ")");
    return L.join("\n");
  }

  /* ---------- toast + copy ---------- */
  let toastT;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2400);
  }
  function selectText(el) {
    const r = document.createRange(); r.selectNodeContents(el);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function copy(text) {
    const pre = $("#summary-text");
    const fallback = () => {
      selectText(pre);
      let ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      toast(ok ? "Copy කළා ✓" : "Text එක select කළා — Copy කරන්න");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast("Copy කළා ✓"), fallback);
    } else fallback();
  }

  function burst() {
    if (reduce) return;
    const b = $("#burst"); b.innerHTML = "";
    for (let i = 0; i < 18; i++) {
      const a = (Math.PI * 2 * i) / 18, d = 70 + Math.random() * 90;
      const s = document.createElement("i");
      s.style.setProperty("--tx", Math.cos(a) * d + "px");
      s.style.setProperty("--ty", Math.sin(a) * d + "px");
      s.style.left = "62px"; s.style.top = "70px";
      s.style.animationDelay = (Math.random() * 120) + "ms";
      b.appendChild(s);
    }
  }

  /* ---------- events ---------- */
  let draftT;
  const queueDraft = () => { clearTimeout(draftT); draftT = setTimeout(saveDraft, 300); };
  function setQty(k, q) {
    const el = form.querySelector('input[name="cr-' + k + '"]'); if (!el) return;
    el.value = Math.min(MAXQ, Math.max(0, q));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  form.addEventListener("click", e => {
    const stepBtn = e.target.closest(".qty button[data-d]");
    if (stepBtn) {
      const k = stepBtn.closest(".cr-item").getAttribute("data-key");
      setQty(k, qtyOf(k) + parseInt(stepBtn.getAttribute("data-d"), 10));
      return;
    }
    const info = e.target.closest(".cr-info");
    if (info) { const k = info.getAttribute("data-toggle"); setQty(k, qtyOf(k) > 0 ? 0 : 1); }
  });
  form.addEventListener("input", e => {
    const f = e.target.closest("[data-field]"); if (f && f.classList.contains("invalid")) validateField(f);
    queueDraft();
    if (e.target.name === "track") { applyTrack(); last = null; render(); return; }
    if (e.target.matches('input[type="radio"], input[type="checkbox"], input[type="number"]')) render(); else updateStepper();
  });
  form.addEventListener("change", e => {
    if (e.target.matches('input[type="number"]')) { const k = e.target.name.slice(3); setQty(k, qtyOf(k)); }
    if (e.target.matches("select, input[type=date]")) updateStepper();
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const errs = validate();
    const alert = $("#form-alert");
    if (errs.length) {
      alert.textContent = "රතු කරපු තැනවල් " + errs.length + " ක හදන්න.";
      alert.hidden = false;
      const first = errs[0];
      first.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      const inp = first.querySelector("input, textarea"); if (inp) setTimeout(() => inp.focus({ preventScroll: true }), 350);
      return;
    }
    alert.hidden = true;
    const ref = makeRef();
    const msg = buildMessage(ref);
    $("#ref-id").textContent = ref;
    $("#summary-text").textContent = msg;
    $("#send-wa").href = window.hxWhatsAppLink(msg);
    const plain = msg.replace(/\*/g, "");
    $("#send-email").href = "mailto:" + C.email + "?subject=" + encodeURIComponent("New project request – " + ref) + "&body=" + encodeURIComponent(plain);
    $("#copy-btn").onclick = () => copy(plain);
    form.hidden = true;
    $("#summary").hidden = false;
    burst();
    $("#summary").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  });

  $("#edit-btn").addEventListener("click", () => {
    $("#summary").hidden = true; form.hidden = false;
    form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  });

  /* ---------- start ---------- */
  buildOptions();
  refreshPriceTags();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  $("#f-deadline").min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const hadDraft = loadDraft();
  const q = new URLSearchParams(location.search);
  const pick = (name, v) => { const el = form.querySelector('input[name="' + name + '"][value="' + v + '"]'); if (el) el.checked = true; };
  const qTrack = q.get("track"), qType = q.get("type"), qItem = q.get("item");
  if (qType && C.types[qType]) { pick("track", "dev"); pick("type", qType); }
  if (qTrack === "creative" || (qItem && C.creative && C.creative[qItem])) {
    pick("track", "creative");
    if (qItem && C.creative[qItem] && !qtyOf(qItem)) form.querySelector('input[name="cr-' + qItem + '"]').value = 1;
  }
  if (!val("track")) pick("track", "dev");
  if (!val("type") && !hadDraft) pick("type", "cross");
  if (!val("size")) pick("size", "small");
  if (!val("design")) pick("design", "ready");
  if (!val("urgency")) pick("urgency", "normal");
  applyTrack();
  showRate();
  render();

  P.getRate(C).then(r => {
    rate = r;
    showRate();
    refreshPriceTags();
    last = null;   // jump straight to the new numbers
    render();
  });
})();
