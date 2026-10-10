/* HEXORA — customer account page (account.html): "මගේ projects".
   Customers make an account with their name, phone number and a 6-digit PIN, then see every
   project linked to it: the stage, how far it is done, the latest update from Hexora and the
   expected finish date. Requests sent from this browser before making the account are linked
   automatically (planner.js keeps a claim for each); other projects are linked from the admin panel. */
(function () {
  "use strict";
  // a PIN anyone would try first: one repeated digit, a run (123456 / 654321), pairs (121212, 112233) and a few famous ones
  const weakPin = p => /^(\d)\1+$/.test(p) || "0123456789".indexOf(p) !== -1 || "9876543210".indexOf(p) !== -1 || /^(\d\d)\1\1$/.test(p) || /^(\d)\1(\d)\2(\d)\3$/.test(p) || ["696969", "159753", "147258", "123321", "100000", "010203", "202020"].indexOf(p) !== -1;
  const FB = window.HXFB, C = window.HEXORA || {};
  const root = document.getElementById("acc-root");
  if (!root || !FB) return;

  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CLAIMS = "hx_claims_v1";
  const STAGES = FB.stages, stageOf = k => STAGES.find(s => s.key === k) || STAGES[0];
  const wa = text => (window.hxWhatsAppLink ? window.hxWhatsAppLink(text) : "https://wa.me/" + (C.whatsapp || "") + "?text=" + encodeURIComponent(text));
  const fmtDay = d => { if (!d) return ""; const x = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + "T00:00:00" : d); return isNaN(x) ? "" : x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); };
  let mode = "login", projects = null, profile = null, poll = null;

  function msg(text, ok) { const m = $("#acc-msg"); if (m) { m.textContent = text || ""; m.classList.toggle("ok", !!ok); } }

  /* ---------- login / sign up ---------- */
  function gate() {
    if (!FB.ready) {
      root.innerHTML = '<section class="acc-card acc-gate"><span class="eyebrow">Customer account</span><h1 class="display">මගේ projects</h1>' +
        '<p class="muted">Customer accounts තාම on කරලා නෑ. Project එක ගැන දැනගන්න WhatsApp එකෙන් අපිට message කරන්න.</p>' +
        '<a class="btn btn-wa" href="' + esc(wa("Hi Hexora! මගේ project එකේ status එක දැනගන්න ඕන.")) + '" target="_blank" rel="noopener">WhatsApp</a></section>';
      return;
    }
    clearInterval(poll); clearInterval(chatPoll);
    if (chatCtl) { chatCtl.destroy(); chatCtl = null; }
    if (mode === "forgot") return forgotScreen();
    const up = mode === "signup";
    root.innerHTML =
      '<section class="acc-card acc-gate">' +
        '<span class="eyebrow">Customer account</span><h1 class="display">මගේ <span class="grad-text">projects</span></h1>' +
        '<p class="muted">ඔයාගේ project එක කොච්චර දුරට ඉවරද, අපේ අලුත්ම updates මොනවද කියලා මෙතනින් බලන්න.</p>' +
        '<div class="acc-tabs" role="tablist">' +
          '<button type="button" role="tab" data-mode="login" aria-selected="' + !up + '">Login</button>' +
          '<button type="button" role="tab" data-mode="signup" aria-selected="' + up + '">Account එකක් හදන්න</button></div>' +
        '<form id="acc-form" class="acc-form" novalidate>' +
          (up ? '<div class="field"><label for="a-name">ඔයාගේ නම</label><input class="input" id="a-name" type="text" autocomplete="name" maxlength="100" placeholder="Ex: Kasun Perera"></div>' : "") +
          '<div class="field"><label for="a-phone">Phone number <span class="hint">(WhatsApp)</span></label><input class="input" id="a-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="07X XXX XXXX"></div>' +
          '<div class="field"><label for="a-pin">PIN <span class="hint">(digits 6' + (up ? ", ඔයාම තෝරගන්න" : "") + ')</span></label><input class="input acc-pin" id="a-pin" type="password" inputmode="numeric" maxlength="6" autocomplete="' + (up ? "new-password" : "current-password") + '"></div>' +
          (up ? '<div class="field"><label for="a-pin2">PIN එක ආයෙත් ගහන්න</label><input class="input acc-pin" id="a-pin2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>' : "") +
          '<p class="acc-msg" id="acc-msg" role="alert"></p>' +
          '<button class="btn btn-primary btn-block" type="submit">' + (up ? "Account එක හදන්න" : "Login") + "</button>" +
        "</form>" +
        '<p class="acc-help">' + (up ? "Project request එක එව්වේ මේ phone එකෙන් නම්, account එක හැදුවම ඒක එකපාරම මෙතන පේනවා.<br>⚠ මේ PIN එක බැංකු / phone PIN එකක් නෙවෙයි, මේ site එකට විතරක් අලුතෙන් හදපු එකක් වෙන්න ඕන."
          : '<button type="button" class="acc-link" data-mode="forgot">PIN එක අමතක උනාද?</button>') + "</p>" +
      "</section>";
    $("#a-phone").focus({ preventScroll: true });
  }

  /* ---------- forgot PIN: the request goes to the admin panel; once approved, the PIN shows up here ---------- */
  const PR = "hx_pinreq_v1";   // the request made from this browser: { id, at }. The long random id is the key to read the answer.
  const readPR = () => { try { const p = JSON.parse(localStorage.getItem(PR)); return p && Date.now() - p.at < 24 * 3600e3 ? p : null; } catch (e) { return null; } };
  const clearPR = () => { try { localStorage.removeItem(PR); } catch (e) { /* storage blocked */ } };
  function forgotScreen() {
    if (readPR()) return waitScreen();
    root.innerHTML = '<section class="acc-card acc-gate"><span class="eyebrow">PIN එක අමතක උනාද?</span><h1 class="display">PIN <span class="grad-text">request</span></h1>' +
      '<p class="muted">ඔයාගේ නමයි phone number එකයි ගහන්න. අපි ඔයාව check කරලා PIN එක මේ page එකටම එවනවා.</p>' +
      '<form id="forgot-form" class="acc-form" novalidate><div class="field"><label for="f-fname">ඔයාගේ නම</label><input class="input" id="f-fname" type="text" autocomplete="name" maxlength="100"></div>' +
      '<div class="field"><label for="f-fphone">Phone number</label><input class="input" id="f-fphone" type="tel" inputmode="tel" autocomplete="tel" placeholder="07X XXX XXXX"></div>' +
      '<p class="acc-msg" id="acc-msg" role="alert"></p><button class="btn btn-primary btn-block" type="submit">PIN එක request කරන්න</button></form>' +
      '<p class="acc-help"><button type="button" class="acc-link" data-mode="login">← Login එකට</button></p></section>';
  }
  async function forgot(form) {
    const name = $("#f-fname").value.trim(), phone = FB.phoneId($("#f-fphone").value), btn = form.querySelector("button[type=submit]");
    if (name.length < 2) return msg("ඔයාගේ නම ගහන්න.");
    if (!phone) return msg("Phone number එක හරියට ගහන්න (Ex: 077 123 4567).");
    btn.disabled = true; msg("");
    const id = FB.newId() + FB.newId();
    try {
      await FB.create("pinRequests", id, { name: name, phone: phone }, ["createdAt"]);
      try { localStorage.setItem(PR, JSON.stringify({ id: id, at: Date.now() })); } catch (e) { /* storage blocked */ }
      waitScreen();
    } catch (e) { btn.disabled = false; msg(FB.errText(e)); }
  }
  function waitScreen() {
    root.innerHTML = '<section class="acc-card acc-gate"><span class="eyebrow">PIN request</span><h1 class="display">ඔයාගේ <span class="grad-text">PIN</span></h1>' +
      '<div id="pin-box"><p class="acc-msg ok">✓ Request එක ගියා.</p><p class="muted">අපි check කරලා PIN එක මෙතනට එවනවා. මේ page එක open කරගෙන ඉන්න (හරි පස්සේ මේ phone එකෙන්ම ආයෙත් එන්න).</p></div>' +
      '<div class="acc-actions"><button class="btn" type="button" data-act="pin-check">Refresh</button><button class="btn" type="button" data-act="pin-new">අලුත් request එකක්</button></div>' +
      '<p class="acc-help">ඉක්මනට ඕන නම් <a href="' + esc(wa("Hi Hexora! මගේ account එකේ PIN එක අමතක උනා.")) + '" target="_blank" rel="noopener">WhatsApp එකෙන් කියන්න</a>.<br><button type="button" class="acc-link" data-mode="login">← Login එකට</button></p></section>';
    clearInterval(poll);
    poll = setInterval(() => { if (!$("#pin-box")) clearInterval(poll); else checkPin(); }, 8000);
    checkPin();
  }
  async function checkPin() {
    const r = readPR(); if (!r || !$("#pin-box")) return;
    try {
      const d = await FB.get("/pinRequests/" + encodeURIComponent(r.id));
      if (d && d.pin && $("#pin-box")) {
        clearInterval(poll);
        const extra = $(".acc-actions"); if (extra) extra.remove();
        $("#pin-box").innerHTML = '<p class="acc-msg ok">✓ ඔයාගේ PIN එක:</p><p class="acc-bigpin">' + esc(d.pin) + '</p><p class="muted">මේ PIN එකෙන් login වෙන්න. මේක වෙන කාටවත් කියන්න එපා.</p>' +
          '<button class="btn btn-primary btn-block" type="button" data-act="pin-login">Login වෙන්න</button>';
      }
    } catch (e) { /* not approved yet (or offline): try again later */ }
  }

  async function submit(form) {
    const up = mode === "signup", btn = form.querySelector("button[type=submit]");
    const name = up ? $("#a-name").value.trim() : "", phone = FB.phoneId($("#a-phone").value), pin = $("#a-pin").value;
    if (up && name.length < 2) return msg("ඔයාගේ නම ගහන්න.");
    if (!phone) return msg("Phone number එක හරියට ගහන්න (Ex: 077 123 4567).");
    if (!/^\d{6}$/.test(pin)) return msg("PIN එක digits 6ක් වෙන්න ඕන.");
    if (up && weakPin(pin)) return msg("මේ PIN එක ඉතා පහසුවෙන් අනුමාන කරන්න පුළුවන් (111111, 123456 වගේ). වෙන එකක් තෝරන්න.");
    if (up && pin !== $("#a-pin2").value) return msg("PIN දෙක සමාන නෑ.");
    btn.disabled = true; msg(up ? "Account එක හදනවා…" : "Login වෙනවා…", true);
    try {
      if (up) {
        await FB.signUp(phone, pin, name);
        // the account works even if the profile is not saved now; the name can be saved again in settings
        try { await FB.create("customers", FB.user().uid, { name: name, phone: phone, pin: pin }, ["createdAt"]); profile = { name: name, phone: phone }; }
        catch (e) { profile = null; }
      } else {
        await FB.signIn(phone, pin);
      }
      portal();
    } catch (e) {
      btn.disabled = false;
      msg(FB.errText(e));
    }
  }

  /* ---------- link requests sent from this browser before logging in ---------- */
  async function claimPending() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(CLAIMS)) || []; } catch (e) { return; }
    if (!list.length) return;
    const me = FB.user(), keep = [];
    for (const c of list) {
      // a request typed with another phone number is not this customer's (shared computer): leave it for its own owner
      if (c.phone && FB.phoneId(c.phone) !== me.phone) { keep.push(c); continue; }
      try { await FB.patch("/requests/" + encodeURIComponent(c.id), { uid: me.uid, proof: c.claim }, ["uid", "proof", "claim"], "currentDocument.exists=true"); }
      catch (e) { if (e.reason === "NETWORK") keep.push(c); }   // linked elsewhere or gone: forget it
    }
    try { if (keep.length) localStorage.setItem(CLAIMS, JSON.stringify(keep)); else localStorage.removeItem(CLAIMS); } catch (e) { /* storage blocked */ }
  }

  /* ---------- the customer's projects ---------- */
  const tabOfHash = () => (location.hash === "#settings" ? "settings" : "projects");
  let tab = tabOfHash(), chats = {}, openChat = null, chatCtl = null, chatPoll = null;
  const SEEN = "hx_chat_seen_v1";   // { projectId: time of the last message already seen }
  const seen = () => { try { return JSON.parse(localStorage.getItem(SEEN)) || {}; } catch (e) { return {}; } };
  const ms = iso => { const t = Date.parse(iso); return isNaN(t) ? 0 : t; };
  const unread = rid => { const c = chats[rid]; return !!c && c.lastFrom === "a" && ms(c.lastAt) > (seen()[rid] || 0); };
  function updateDots() {
    let any = false;
    (projects || []).forEach(r => { const u = unread(r.id); any = any || u; const d = root.querySelector('[data-dot="' + r.id + '"]'); if (d) d.hidden = !u; });
    const t = root.querySelector("[data-tab-dot]"); if (t) t.hidden = !any;
  }
  function markSeen(rid, iso) {
    const m = seen(); m[rid] = Math.max(m[rid] || 0, ms(iso));
    try { localStorage.setItem(SEEN, JSON.stringify(m)); } catch (e) { /* storage blocked */ }
    updateDots();
  }
  async function loadChats() {
    try { const rows = await FB.where("chats", "uid", FB.user().uid); chats = {}; rows.forEach(c => { chats[c.id] = c; }); updateDots(); }
    catch (e) { /* the dots just stay as they are */ }
  }
  function stopChat() {
    if (chatCtl) { chatCtl.destroy(); chatCtl = null; }
    openChat = null;
  }
  function toggleChat(rid) {
    const was = openChat;
    stopChat();
    root.querySelectorAll(".acc-chat").forEach(b => { b.hidden = true; b.innerHTML = ""; b.classList.remove("chat"); });
    root.querySelectorAll('[data-act="chat"]').forEach(b => b.setAttribute("aria-expanded", "false"));
    if (was === rid) return;
    const box = root.querySelector('[data-chat="' + rid + '"]'), btn = root.querySelector('[data-act="chat"][data-id="' + rid + '"]');
    if (!box || !window.HXChat) return;
    const me = FB.user(), A = window.HXChat.api(FB.fs, FB.db);
    openChat = rid; box.hidden = false; if (btn) btn.setAttribute("aria-expanded", "true");
    chatCtl = window.HXChat.mount(box, { me: "c", peer: "Hexora Developer", load: after => A.load(rid, after), send: m => A.send(rid, me.uid, "c", m), peek: () => A.peek(rid), touch: seen => A.touch(rid, me.uid, "c", seen), onSeen: last => markSeen(rid, last), errText: FB.errText });
  }

  async function portal() {
    const me = FB.user();
    if (!me) { mode = "login"; return gate(); }
    stopChat();
    root.innerHTML = '<section class="acc-card"><p class="muted">ඔයාගේ projects ගන්නවා…</p></section>';
    try {
      if (!profile) {
        profile = await FB.get("/customers/" + me.uid);
        if (profile) FB.setName(profile.name);
      }
      await claimPending();
      projects = (await FB.where("requests", "uid", me.uid)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      await loadChats();
      paint();
      clearInterval(chatPoll);
      chatPoll = setInterval(() => { if (document.visibilityState === "visible" && FB.user() && root.querySelector(".acc-tabs2")) loadChats(); }, 45000);
    } catch (e) {
      if (!FB.user()) { mode = "login"; gate(); msg(FB.errText(e)); return; }
      root.innerHTML = '<section class="acc-card"><p class="acc-msg">' + esc(FB.errText(e)) + '</p><button class="btn" type="button" data-act="reload">ආයෙත් try කරන්න</button> <button class="btn" type="button" data-act="logout">Logout</button></section>';
    }
  }
  const chatIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>';
  function card(r) {
    const st = stageOf(r.status), idx = STAGES.indexOf(st);
    const pct = st.key === "done" ? 100 : Math.max(0, Math.min(100, typeof r.progress === "number" ? r.progress : st.pct));
    const title = r.title || (r.track === "creative" ? "Logo, Design & Video project" : r.track === "pkg" ? "Mobile app project" : "App / Website project");
    return '<article class="acc-proj s-' + esc(st.key) + '">' +
      '<div class="acc-proj-top"><div><h2>' + esc(title) + "</h2><small>" + esc(r.ref || "") + (r.createdAt ? " · " + esc(fmtDay(r.createdAt)) : "") + "</small></div>" +
        '<span class="acc-stage">' + esc(st.label) + "</span></div>" +
      '<div class="acc-bar" role="progressbar" aria-label="ඉවර වෙලා තියෙන ප්‍රමාණය" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
      '<p class="acc-pct"><b>' + pct + "%</b> ඉවරයි</p>" +
      '<ol class="acc-steps">' + STAGES.map((s, i) => '<li class="' + (i < idx || st.key === "done" ? "done" : i === idx ? "now" : "") + '"' + (i === idx ? ' aria-current="step"' : "") + "><i></i><span>" + esc(s.short) + "</span></li>").join("") + "</ol>" +
      (st.key === "new" ? '<div class="acc-wait"><b>⏳ Pending · Under review</b><p>Hexora Developer කෙනෙක් ඔයා එක්ක ඉක්මනින්ම සම්බන්ධ වෙනවා. මද වේලාවක් රැඳී ඉන්න.</p></div>' : "") +
      (r.note ? '<div class="acc-note"><b>Hexora update</b><p>' + esc(r.note) + "</p>" + (r.updatedAt ? "<small>" + esc(fmtDay(r.updatedAt)) + "</small>" : "") + "</div>" : "") +
      '<dl class="acc-facts">' +
        (r.due ? "<div><dt>" + (st.key === "done" ? "ඉවර කළ දවස" : "ඉවර වෙන්න බලාපොරොත්තු වෙන දවස") + "</dt><dd>" + esc(fmtDay(r.due)) + "</dd></div>" : "") +
        (r.estimate ? "<div><dt>Estimate</dt><dd>" + esc(r.estimate) + "</dd></div>" : "") + "</dl>" +
      '<div class="acc-proj-actions"><button class="btn btn-primary acc-chat-btn" type="button" data-act="chat" data-id="' + esc(r.id) + '" aria-expanded="false">' + chatIcon + ' Hexora එක්ක chat කරන්න <i class="acc-dot" data-dot="' + esc(r.id) + '" hidden>අලුත්</i></button>' +
        '<a class="btn btn-wa acc-wa" href="' + esc(wa("Hi Hexora! මගේ project එක ගැන (" + (r.ref || title) + ")")) + '" target="_blank" rel="noopener">WhatsApp</a></div>' +
      '<div class="acc-chat" data-chat="' + esc(r.id) + '" hidden></div>' +
    "</article>";
  }
  function projectsHtml(me) {
    return projects.length ? '<div class="acc-list">' + projects.map(card).join("") + "</div>" :
      '<section class="acc-card acc-empty"><h2>තාම projects නෑ</h2><p class="muted">Project request එකක් එව්වම ඒක මෙතන පේනවා. WhatsApp එකෙන් කතා කරපු project එකක් නම්, අපි ඒක ඔයාගේ account එකට දාන්නම්.</p>' +
        '<div class="acc-actions"><a class="btn btn-primary" href="start-project.html">Project එක පටන් ගන්න</a>' +
        '<a class="btn btn-wa" href="' + esc(wa("Hi Hexora! මගේ project එක මගේ account එකට (" + FB.phoneLabel(me.phone) + ") දාන්න පුළුවන්ද?")) + '" target="_blank" rel="noopener">WhatsApp</a></div></section>';
  }
  function settingsHtml(me, name) {
    return '<section class="acc-card"><h2>Account</h2><p class="muted">Phone number එක: <b>' + esc(FB.phoneLabel(me.phone)) + "</b> (login වෙන්න use කරන්නේ මේක)</p>" +
        '<form id="name-form" class="acc-form"><div class="field"><label for="s-name">නම</label><input class="input" id="s-name" type="text" maxlength="100" value="' + esc(name) + '"></div>' +
        '<button class="btn" type="submit">නම save කරන්න</button></form></section>' +
      '<section class="acc-card"><h2>PIN එක මාරු කරන්න</h2>' +
        '<form id="pin-form" class="acc-form"><div class="field"><label for="s-pin">අලුත් PIN (digits 6)</label><input class="input acc-pin" id="s-pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>' +
        '<div class="field"><label for="s-pin2">ආයෙත් ගහන්න</label><input class="input acc-pin" id="s-pin2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>' +
        '<button class="btn" type="submit">PIN එක මාරු කරන්න</button></form></section>' +
      '<p class="acc-msg" id="acc-msg" role="status"></p>' +
      '<section class="acc-card"><h2>Logout</h2><p class="muted">මේ phone / browser එකෙන් logout වෙන්න.</p><div><button class="btn" type="button" data-act="logout">Logout</button></div></section>';
  }
  function paint() {
    stopChat();
    const me = FB.user(), name = (profile && profile.name) || me.name || "";
    root.innerHTML =
      '<section class="acc-head">' +
        '<div><span class="eyebrow">මගේ projects</span><h1 class="display">ආයුබෝවන්' + (name ? ", " + esc(name) : "") + "</h1>" +
          '<p class="muted">' + esc(FB.phoneLabel(me.phone)) + "</p></div>" +
        '<div class="acc-actions"><a class="btn btn-primary" href="start-project.html">අලුත් project එකක්</a>' +
          '<button class="btn" type="button" data-act="reload" aria-label="Refresh">↻</button></div>' +
      "</section>" +
      '<nav class="acc-tabs2" role="tablist" aria-label="Account menu">' +
        '<button type="button" role="tab" data-act="tab" data-tab="projects" aria-selected="' + (tab === "projects") + '">මගේ projects <i class="acc-dot" data-tab-dot hidden>අලුත්</i></button>' +
        '<button type="button" role="tab" data-act="tab" data-tab="settings" aria-selected="' + (tab === "settings") + '">Settings</button></nav>' +
      (tab === "settings" ? settingsHtml(me, name) : projectsHtml(me));
    updateDots();
  }

  async function saveName(form) {
    const name = $("#s-name").value.trim(), me = FB.user(), btn = form.querySelector("button");
    if (name.length < 2) return msg("නම අකුරු 2කට වඩා වෙන්න ඕන.");
    btn.disabled = true;
    try {
      if (profile) await FB.patch("/customers/" + me.uid, { name: name }, ["name"]);
      else await FB.create("customers", me.uid, { name: name, phone: me.phone }, ["createdAt"]);
      profile = Object.assign({ phone: me.phone }, profile, { name: name }); FB.setName(name);
      paint(); msg("නම save උනා ✓", true);
    } catch (e) { msg(FB.errText(e)); btn.disabled = false; }
  }
  async function savePin(form) {
    const a = $("#s-pin").value, b = $("#s-pin2").value, btn = form.querySelector("button");
    if (!/^\d{6}$/.test(a)) return msg("PIN එක digits 6ක් වෙන්න ඕන.");
    if (a !== b) return msg("PIN දෙක සමාන නෑ.");
    btn.disabled = true;
    try {
      await FB.changePin(a);
      // the admin panel shows the PIN to help customers who forget it; keep that copy in step
      try { await FB.patch("/customers/" + FB.user().uid, { pin: a }, ["pin"]); } catch (e) { /* profile missing: login still works */ }
      form.reset(); msg("PIN එක මාරු උනා ✓ ඊළඟ පාර අලුත් PIN එකෙන් login වෙන්න.", true);
    }
    catch (e) { msg(FB.errText(e)); }
    btn.disabled = false;
  }

  /* ---------- events ---------- */
  root.addEventListener("click", e => {
    const t = e.target.closest("[data-mode], [data-act]"); if (!t) return;
    if (t.dataset.mode) { mode = t.dataset.mode; gate(); return; }
    if (t.dataset.act === "logout") { try { localStorage.removeItem("hexora_project_draft_v2"); } catch (e) { /* storage blocked */ } stopChat(); clearInterval(chatPoll); FB.signOut(); profile = null; projects = null; chats = {}; tab = "projects"; mode = "login"; gate(); }
    if (t.dataset.act === "tab") {
      tab = t.dataset.tab; paint();
      try { history.replaceState(null, "", location.pathname + location.search + (tab === "settings" ? "#settings" : "")); } catch (err) { /* file:// */ }
    }
    if (t.dataset.act === "chat") toggleChat(t.dataset.id);
    if (t.dataset.act === "reload") portal();
    if (t.dataset.act === "pin-check") checkPin();
    if (t.dataset.act === "pin-new") { clearPR(); forgotScreen(); }
    if (t.dataset.act === "pin-login") { clearPR(); mode = "login"; gate(); }
  });
  root.addEventListener("submit", e => {
    e.preventDefault();
    if (e.target.id === "acc-form") submit(e.target);
    else if (e.target.id === "forgot-form") forgot(e.target);
    else if (e.target.id === "name-form") saveName(e.target);
    else if (e.target.id === "pin-form") savePin(e.target);
  });
  root.addEventListener("input", e => { if (e.target.classList.contains("acc-pin")) e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6); });

  window.addEventListener("hashchange", () => { const t = tabOfHash(); if (t !== tab && root.querySelector(".acc-tabs2")) { tab = t; paint(); } });   // Back / Forward
  if (FB.user()) portal(); else { mode = new URLSearchParams(location.search).get("new") ? "signup" : "login"; gate(); }
})();
