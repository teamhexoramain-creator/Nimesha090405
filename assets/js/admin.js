/* HEXORA — admin panel (admin.html), backed by Firebase (REST, no SDK).
   • Log in: the 6-digit PIN is the password of one Firebase Auth user
     (HX_FIREBASE.adminEmail). Firebase checks it; the PIN is not in the site code.
   • Content: prices, contact, services and the notice bar are saved to
     Firestore (site/content). The public pages load them through boot.js.
   • Requests: the project form saves every request to Firestore (requests).
   • History: every save also keeps a copy in Firestore (history). */
(function () {
  "use strict";
  const F = window.HX_FIREBASE || {}, P = window.HXPrice;
  const root = document.getElementById("admin-root");
  if (!root || !P) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));
  const KEYS = { tries: "hx_admin_tries_v1" };
  const PIN_LEN = 6, MAX_TRIES = 5, LOCK_MS = 60000, IDLE_MS = 30 * 60000;
  const ANIMS = ["phone", "browser", "dashboard", "backend", "chat", "server", "logo", "social", "photo", "timeline", "uiux"];
  // project stages (shared with the customer page through fb.js); admin labels in English
  const STAGES = (window.HXFB && window.HXFB.stages) || [{ key: "new", pct: 5 }, { key: "contacted", pct: 15 }, { key: "design", pct: 35 }, { key: "building", pct: 60 }, { key: "testing", pct: 85 }, { key: "done", pct: 100 }];
  const STAGE_EN = { new: "New", contacted: "Contacted", design: "Design", building: "Building", testing: "Testing", done: "Done" };
  const FILTERS = [["all", "All"], ["new", "New"], ["active", "Active"], ["done", "Done"]];
  const inFilter = (r, f) => f === "all" || (f === "active" ? r.status !== "new" && r.status !== "done" : r.status === f);
  const S = { auth: null, content: { exists: false, updateTime: "" }, data: {}, saved: {}, reqs: null, customers: [], pinReqs: [], chats: {}, chatMax: "", chatOpen: null, show: {}, newOpen: false, reqFilter: "all", tab: "home", svc: 0, last: Date.now() };
  const ready = !!(F.apiKey && F.projectId && F.adminEmail);

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } }
  };

  /* ---------- Firebase REST ---------- */
  async function http(url, opts) {
    let r;
    try { r = await fetch(url, Object.assign({ cache: "no-store" }, opts)); }
    catch (e) { const er = new Error("network"); er.reason = "NETWORK"; throw er; }
    const body = r.status === 204 ? null : await r.json().catch(() => null);
    if (!r.ok) {
      const x = (body && body.error) || {};
      const er = new Error(x.message || "HTTP " + r.status);
      er.status = r.status; er.reason = String(x.status || ""); er.msg = String(x.message || "");
      throw er;
    }
    return body;
  }
  const json = body => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  function setAuth(id, refresh, expiresIn, email) {
    S.auth = { id: id, refresh: refresh, exp: Date.now() + (Number(expiresIn) || 3600) * 1000, email: email || (S.auth && S.auth.email) || F.adminEmail };
  }
  async function signIn(pin) {
    const j = await http("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + encodeURIComponent(F.apiKey),
      json({ email: F.adminEmail, password: pin, returnSecureToken: true }));
    setAuth(j.idToken, j.refreshToken, j.expiresIn, j.email);
  }
  async function idToken() {
    if (!S.auth) { const er = new Error("signed out"); er.reason = "UNAUTHENTICATED"; throw er; }
    if (Date.now() > S.auth.exp - 5 * 60000) {
      const j = await http("https://securetoken.googleapis.com/v1/token?key=" + encodeURIComponent(F.apiKey), {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(S.auth.refresh)
      });
      setAuth(j.id_token, j.refresh_token, j.expires_in);
    }
    return S.auth.id;
  }
  async function changePin(pin) {
    const j = await http("https://identitytoolkit.googleapis.com/v1/accounts:update?key=" + encodeURIComponent(F.apiKey),
      json({ idToken: await idToken(), password: pin, returnSecureToken: true }));
    setAuth(j.idToken, j.refreshToken, j.expiresIn);
  }
  const DOCS = () => "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(F.projectId) + "/databases/(default)/documents";
  async function fs(method, path, body, query) {
    const headers = { Authorization: "Bearer " + await idToken() };
    if (body) headers["Content-Type"] = "application/json";
    return http(DOCS() + path + (query ? "?" + query : ""), { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  const val = v => v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === "boolean" ? { booleanValue: v } :
    typeof v === "number" ? { integerValue: String(Math.round(v)) } : { stringValue: String(v == null ? "" : v) };
  const toFields = o => { const f = {}; Object.keys(o).forEach(k => { f[k] = val(o[k]); }); return f; };
  const unval = v => !v ? null : "stringValue" in v ? v.stringValue : "timestampValue" in v ? v.timestampValue : "booleanValue" in v ? v.booleanValue :
    "integerValue" in v ? Number(v.integerValue) : "doubleValue" in v ? v.doubleValue : null;
  const fromDoc = d => { const o = { id: d.name.split("/").pop(), updateTime: d.updateTime }; Object.keys(d.fields || {}).forEach(k => { o[k] = unval(d.fields[k]); }); return o; };
  const mask = keys => keys.map(k => "updateMask.fieldPaths=" + encodeURIComponent(k)).join("&");
  async function query(coll, orderBy, limit) {
    const rows = await fs("POST", ":runQuery", { structuredQuery: { from: [{ collectionId: coll }], orderBy: [{ field: { fieldPath: orderBy }, direction: "DESCENDING" }], limit: limit } });
    return (rows || []).filter(r => r.document).map(r => fromDoc(r.document));
  }

  /* ---------- small helpers ---------- */
  const dirty = k => S.saved[k] != null && JSON.stringify(S.data[k]) !== S.saved[k];
  const anyDirty = () => dirty("config") || dirty("services");
  const icon = (inner, cls) => '<svg class="' + (cls || "ad-ico") + '" viewBox="0 0 24 24" aria-hidden="true">' + inner + "</svg>";
  const I = {
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    del: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', back: '<path d="M14 6l-6 6 6 6"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    reload: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', unlink: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  const lkr = usd => P.formatLKR(P.smartRound((Number(usd) || 0) * (Number(S.data.config.fallbackRate) || 0), S.data.config));
  const fmtDate = iso => { if (!iso) return "—"; const d = new Date(iso); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); };
  function get(path) { return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), S.data); }
  function set(path, v) { const ks = path.split("."), last = ks.pop(); ks.reduce((o, k) => o[k], S.data)[last] = v; }
  let toastT;
  function toast(msg, bad) {
    const t = $("#ad-toast"); if (!t) return;
    t.textContent = msg; t.classList.toggle("bad", !!bad); t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), bad ? 6000 : 3500);
  }
  // two-step confirm on the same button (no browser dialogs)
  function armed(btn, text) {
    if (btn.dataset.armed) return true;
    btn.dataset.armed = "1"; btn.dataset.label = btn.innerHTML; btn.textContent = text; btn.classList.add("armed");
    setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.innerHTML = btn.dataset.label; btn.classList.remove("armed"); } }, 3500);
    return false;
  }
  function errText(e) {
    const m = (e.msg || e.message || "") + " " + (e.reason || "");
    if (/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test(m)) return "PIN එක වැරදියි.";
    if (/TOO_MANY_ATTEMPTS/.test(m)) return "වැරදි PIN ගොඩක් ගැහුව නිසා Firebase එක ටික වෙලාවකට lock කරලා. පස්සේ try කරන්න.";
    if (/USER_DISABLED/.test(m)) return "Firebase එකේ admin account එක disable කරලා.";
    if (/PERMISSION_DENIED/.test(m)) return "Firebase rules වලින් permission නෑ. Rules වල admin email එක හරිද බලන්න.";
    if (/FAILED_PRECONDITION|ABORTED|ALREADY_EXISTS/.test(m)) return "මේ අතරේ වෙන තැනකින් data වෙනස් වෙලා. Reload කරලා ආයෙත් try කරන්න.";
    if (/CREDENTIAL_TOO_OLD|TOKEN_EXPIRED|UNAUTHENTICATED/.test(m)) return "Login එක පරණ වෙලා. Lock කරලා ආයෙත් log වෙන්න.";
    if (/WEAK_PASSWORD/.test(m)) return "PIN එක අඩුම තරමේ digits 6ක් වෙන්න ඕන.";
    if (/API_KEY|API key/i.test(m)) return "Firebase apiKey එක වැරදියි (firebase-config.js).";
    if (/NETWORK/.test(m)) return "Internet / Firebase එකට connect වෙන්න බැරි උනා.";
    return (e.msg || e.message || "Error") + "";
  }
  const gate = inner => '<section class="ad-gate"><div class="ad-gate-card">' + inner + "</div></section>";

  /* ==================== 1. PIN screen ==================== */
  function lockScreen(msg) {
    S.auth = null; stopChat(); clearInterval(chatTimer); clearInterval(presenceTimer);
    if (!ready) {
      root.innerHTML = gate("<h1>Firebase setup</h1>" +
        '<p class="muted">Admin panel එක වැඩ කරන්න Firebase project එකක් ඕන. <code>assets/js/firebase-config.js</code> එකේ apiKey, projectId, adminEmail තාම දාලා නෑ.</p>' +
        '<p class="ad-note">Steps ටික README එකේ "Admin panel" කොටසේ තියෙනවා.</p><a class="ad-back" href="index.html">← Site එකට</a>');
      return;
    }
    root.innerHTML = gate(
      '<span class="logo-part lp-mark ad-gate-mark" aria-hidden="true"></span>' +
      '<h1>Admin</h1><p class="muted">PIN එක ගහන්න</p>' +
      '<div class="pin-dots" id="pin-dots" aria-hidden="true">' + "<i></i>".repeat(PIN_LEN) + "</div>" +
      '<input class="pin-input" id="pin-input" type="password" inputmode="numeric" autocomplete="off" maxlength="' + PIN_LEN + '" aria-label="PIN">' +
      '<p class="ad-gate-msg" id="pin-msg" role="alert">' + esc(msg || "") + "</p>" +
      '<div class="pin-pad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => '<button type="button" data-key="' + n + '">' + n + "</button>").join("") +
      '<span></span><button type="button" data-key="0">0</button><button type="button" data-key="back" aria-label="මකන්න">' + icon(I.back) + "</button></div>" +
      '<a class="ad-back" href="index.html">← Site එකට</a>');
    let entry = "", busy = false;
    const input = $("#pin-input"), dots = $$("#pin-dots i"), msgEl = $("#pin-msg");
    const paint = () => dots.forEach((d, i) => d.classList.toggle("on", i < entry.length));
    async function check() {
      const tries = store.get(KEYS.tries) || { n: 0, until: 0 };
      if (Date.now() < tries.until) { msgEl.textContent = "Lock එක ඇරෙන්න තත්පර " + Math.ceil((tries.until - Date.now()) / 1000) + "ක් ඉන්න."; entry = ""; input.value = ""; paint(); return; }
      busy = true; msgEl.textContent = "Check කරනවා…";
      try {
        await signIn(entry);
        store.del(KEYS.tries); busy = false; loadAll(); return;
      } catch (e) {
        busy = false;
        const wrong = /INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test((e.msg || "") + e.message);
        if (wrong) {
          tries.n += 1;
          if (tries.n >= MAX_TRIES) { tries.n = 0; tries.until = Date.now() + LOCK_MS; }
          store.set(KEYS.tries, tries);
          msgEl.textContent = tries.until > Date.now() ? "වැරදි PIN " + MAX_TRIES + "ක්. තත්පර " + LOCK_MS / 1000 + "ක් ඉන්න." : "PIN එක වැරදියි. (" + (MAX_TRIES - tries.n) + " පාරක් ඉතුරුයි)";
        } else msgEl.textContent = errText(e);
        $("#pin-dots").classList.remove("shake"); void $("#pin-dots").offsetWidth; $("#pin-dots").classList.add("shake");
        entry = ""; input.value = ""; paint();
      }
    }
    function press(k) {
      if (busy) return;
      if (k === "back") entry = entry.slice(0, -1);
      else if (entry.length < PIN_LEN) entry += k;
      input.value = entry; paint();
      if (entry.length === PIN_LEN) check();
    }
    root.querySelector(".pin-pad").addEventListener("click", e => { const b = e.target.closest("[data-key]"); if (b) press(b.dataset.key); input.focus({ preventScroll: true }); });
    input.addEventListener("input", () => { if (busy) { input.value = entry; return; } entry = input.value.replace(/\D/g, "").slice(0, PIN_LEN); input.value = entry; paint(); if (entry.length === PIN_LEN) check(); });
    input.focus({ preventScroll: true });
  }

  /* ==================== 2. load content ==================== */
  // keys added to config.js after the data was saved (packages, add-ons…) are filled in from the built-in file
  function normalize() {
    const c = S.data.config, d = window.HEXORA || {};
    if (!c.notice) c.notice = { show: false, text: "", linkText: "", link: "" };
    ["packages", "addons", "packageBaseRate"].forEach(k => { if (c[k] == null && d[k] != null) c[k] = clone(d[k]); });
    if (S.data.services && S.data.services.list) S.data.services.list.forEach(x => { if (x.packages === undefined && x.slug === "mobile-apps") x.packages = true; });
  }
  async function loadAll() {
    root.innerHTML = gate('<p class="muted">Firebase එකෙන් data ගන්නවා…</p>');
    try {
      let doc = null;
      try { doc = fromDoc(await fs("GET", "/site/content")); } catch (e) { if (e.status !== 404) throw e; }
      if (doc && doc.config && doc.services) {
        S.data.config = JSON.parse(doc.config); S.data.services = JSON.parse(doc.services);
        S.content = { exists: true, updateTime: doc.updateTime, updatedAt: doc.updatedAt };
        normalize();
        S.saved = { config: JSON.stringify(S.data.config), services: JSON.stringify(S.data.services) };
      } else {
        // first run: start from the site's built-in config.js / services.js and offer to publish them
        S.data.config = clone(window.HEXORA); S.data.services = clone(window.HX_SERVICES);
        S.content = { exists: !!doc, updateTime: doc ? doc.updateTime : "" };
        normalize();
        S.saved = { config: "", services: "" };
      }
      S.svc = Math.min(S.svc, S.data.services.list.length - 1);
      panel();
      loadRequests();
      clearInterval(chatTimer); chatTimer = setInterval(pollChats, 45000);
      clearInterval(presenceTimer); beatPresence(); presenceTimer = setInterval(beatPresence, 25000);
    } catch (e) {
      root.innerHTML = gate("<h1>Data ගන්න බැරි උනා</h1><p class=\"ad-gate-msg\">" + esc(errText(e)) + "</p>" +
        '<div class="ad-connect"><button class="btn btn-primary" type="button" id="retry">ආයෙත් try කරන්න</button></div>' +
        '<button class="ad-back" type="button" id="relock">' + icon(I.lock) + " Lock කරන්න</button>");
      $("#retry").addEventListener("click", () => loadAll());
      $("#relock").addEventListener("click", () => lockScreen());
    }
  }
  async function loadRequests() {
    try {
      const both = await Promise.all([query("requests", "createdAt", 300), query("customers", "createdAt", 500).catch(() => []), query("pinRequests", "createdAt", 100).catch(() => []), query("chats", "lastAt", 300).catch(() => [])]);
      S.reqs = both[0]; S.customers = both[1]; S.pinReqs = both[2];
      S.chats = {}; both[3].forEach(c => { S.chats[c.id] = c; if (!S.chatMax || ms(c.lastAt) > ms(S.chatMax)) S.chatMax = c.lastAt; });
    }
    catch (e) { S.reqs = null; S.reqErr = errText(e); }
    paintTabs();
    if (S.tab === "requests" || S.tab === "home") renderTab();
  }

  /* ==================== 3. the panel ==================== */
  /* ---------- chats: unread dots, polling, the chat box inside a project card ---------- */
  const SEEN = "hx_admin_seen_v1";   // { projectId: time of the last customer message already read }
  const seenMap = () => store.get(SEEN) || {};
  const ms = iso => { const t = Date.parse(iso); return isNaN(t) ? 0 : t; };
  const isUnread = rid => { const c = S.chats[rid]; return !!c && c.lastFrom === "c" && ms(c.lastAt) > (seenMap()[rid] || 0); };
  const unreadCount = () => Object.keys(S.chats).filter(isUnread).length;
  function markSeen(rid, iso) { const m = seenMap(); m[rid] = Math.max(m[rid] || 0, ms(iso)); store.set(SEEN, m); chatDots(); }
  function chatDots() {
    $$("[data-adot]").forEach(el => { el.hidden = !isUnread(el.dataset.adot); });
    paintTabs();
  }
  let chatTimer = null, chatCtl = null, presenceTimer = null;
  // "Hexora Developer: Online" for customers: while this panel is open and in use, write the server time to site/presence every 25 s
  async function beatPresence() {
    if (!S.auth || document.visibilityState !== "visible" || Date.now() - S.last > 5 * 60000) return;
    try {
      await fs("POST", ":commit", { writes: [{ update: { name: "projects/" + F.projectId + "/databases/(default)/documents/site/presence", fields: { v: { stringValue: "1" } } }, updateMask: { fieldPaths: ["v"] }, updateTransforms: [{ fieldPath: "adminOnlineAt", setToServerValue: "REQUEST_TIME" }] }] });
    } catch (e) { /* the next beat tries again */ }
  }
  async function pollChats() {
    if (!S.auth || document.visibilityState !== "visible") return;
    try {
      const rows = S.chatMax ? await fs("POST", ":runQuery", { structuredQuery: { from: [{ collectionId: "chats" }], where: { fieldFilter: { field: { fieldPath: "lastAt" }, op: "GREATER_THAN", value: { timestampValue: S.chatMax } } }, orderBy: [{ field: { fieldPath: "lastAt" }, direction: "ASCENDING" }], limit: 100 } })
        : await fs("POST", ":runQuery", { structuredQuery: { from: [{ collectionId: "chats" }], orderBy: [{ field: { fieldPath: "lastAt" }, direction: "ASCENDING" }], limit: 100 } });
      const fresh = (rows || []).filter(r => r.document).map(r => fromDoc(r.document));
      if (!fresh.length) return;
      fresh.forEach(c => { S.chats[c.id] = c; if (!S.chatMax || ms(c.lastAt) > ms(S.chatMax)) S.chatMax = c.lastAt; });
      chatDots();
      fresh.filter(c => c.lastFrom === "c" && isUnread(c.id)).forEach(c => { const el = $('[data-chatnote="' + c.id + '"]'); if (el) el.textContent = "💬 " + (c.lastText || ""); });
    } catch (e) { /* try again next time */ }
  }
  function stopChat() { if (chatCtl) { chatCtl.destroy(); chatCtl = null; } }
  function openChatBox(rid) {
    stopChat();
    const r = (S.reqs || []).find(x => x.id === rid), box = $('[data-chat="' + rid + '"]');
    $$(".ad-chat").forEach(b => { if (b !== box) { b.hidden = true; b.innerHTML = ""; b.classList.remove("chat"); } });
    $$('[data-act="chat"]').forEach(b => b.setAttribute("aria-expanded", String(b.dataset.id === rid)));
    if (!r || !r.uid || !box || !window.HXChat) return;
    box.hidden = false;
    const A = window.HXChat.api(fs, "projects/" + F.projectId + "/databases/(default)");
    const cust = S.customers.find(c => c.id === r.uid);
    chatCtl = window.HXChat.mount(box, { me: "a", peer: cust ? cust.name : (r.name || "Customer"), load: after => A.load(rid, after), send: m => A.send(rid, r.uid, "a", m), peek: () => A.peek(rid), touch: seen => A.touch(rid, r.uid, "a", seen), onSeen: last => markSeen(rid, last), errText: errText });
  }

  const TABS = [["home", "Dashboard"], ["requests", "Requests"], ["customers", "Customers"], ["notice", "Notice"], ["contact", "Contact"], ["prices", "Prices"], ["services", "Services"], ["history", "History"], ["security", "Security"]];
  const newCount = () => (S.reqs || []).filter(r => r.status === "new").length;
  function panel() {
    root.innerHTML =
      '<div class="ad-shell">' +
        '<header class="ad-top"><a class="ad-brand" href="index.html" target="_blank" rel="noopener"><span class="logo-part lp-mark ad-brand-mark" aria-hidden="true"></span><b>Admin</b></a>' +
          '<span class="ad-pill" title="Firebase project">' + esc(F.projectId) + "</span>" +
          '<span class="ad-top-end"><a class="btn ad-small" href="index.html" target="_blank" rel="noopener">Site එක ' + icon(I.ext) + "</a>" +
          '<button class="btn ad-small" type="button" data-act="lock">' + icon(I.lock) + " Lock</button></span></header>" +
        '<nav class="ad-tabs" role="tablist" aria-label="Admin sections" id="ad-tabs"></nav>' +
        '<section class="ad-main" id="ad-main"></section>' +
        '<div class="ad-savebar" id="ad-savebar" hidden><div class="ad-save-info" id="ad-save-info"></div>' +
          '<input class="input" id="commit-msg" type="text" maxlength="80" placeholder="මොකද වෙනස් කළේ? (optional)">' +
          '<button class="btn" type="button" data-act="discard">Discard</button>' +
          '<button class="btn btn-primary" type="button" data-act="save" id="save-btn">Save කරන්න</button></div>' +
        '<div class="toast" id="ad-toast" role="status"></div>' +
      "</div>";
    paintTabs(); renderTab(); updateSaveBar();
  }
  function paintTabs() {
    const nav = $("#ad-tabs"); if (!nav) return;
    const n = newCount();
    nav.innerHTML = TABS.map(([k, t]) => '<button type="button" role="tab" data-act="tab" data-tab="' + k + '" aria-selected="' + (k === S.tab) + '">' + t +
      (k === "requests" && (n + unreadCount()) ? ' <span class="ad-badge">' + (n + unreadCount()) + "</span>" : "") +
      (k === "customers" && S.pinReqs.length ? ' <span class="ad-badge">' + S.pinReqs.length + "</span>" : "") + "</button>").join("");
  }
  function renderTab() {
    const main = $("#ad-main"); if (!main) return;
    const y = window.scrollY;
    main.innerHTML = VIEWS[S.tab]();
    $$("#ad-tabs [data-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === S.tab)));
    if (S.tab === "history") loadHistory();
    stopChat();
    if (S.tab === "requests" && S.chatOpen && $('[data-chat="' + S.chatOpen + '"]')) openChatBox(S.chatOpen);
    window.scrollTo(0, y);
    refreshLive();
  }

  /* ---------- form builders ---------- */
  function field(path, label, o) {
    o = o || {};
    const v = get(path), id = "f-" + path.replace(/[^\w]/g, "-"), t = o.type || "text";
    const attrs = ' id="' + id + '" data-path="' + path + '"';
    let control;
    if (t === "bool") {
      return '<div class="ad-field' + (o.wide ? " wide" : "") + '"><label class="ad-check"><input type="checkbox"' + attrs + ' data-type="bool"' + (v ? " checked" : "") + "><span>" + esc(label) + "</span></label>" + (o.hint ? '<small class="ad-hint">' + esc(o.hint) + "</small>" : "") + "</div>";
    } else if (t === "area" || t === "lines") {
      control = '<textarea class="input"' + attrs + ' data-type="' + (t === "lines" ? "lines" : "text") + '" rows="' + (o.rows || 3) + '">' + esc(t === "lines" ? (v || []).join("\n") : v) + "</textarea>";
    } else if (t === "select") {
      control = '<select class="input"' + attrs + ' data-type="text">' + o.options.map(op => '<option value="' + esc(op[0]) + '"' + (op[0] === (v == null ? "" : v) ? " selected" : "") + ">" + esc(op[1]) + "</option>").join("") + "</select>";
    } else {
      const num = t === "num";
      control = '<input class="input"' + attrs + ' data-type="' + (num ? "num" : t === "list" ? "list" : "text") + '" type="' + (num ? "number" : "text") + '"' + (num ? ' step="any" inputmode="decimal"' : "") +
        ' value="' + esc(t === "list" ? (v || []).join(", ") : (v == null ? "" : v)) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + ">";
    }
    return '<div class="ad-field' + (o.wide ? " wide" : "") + '"><label for="' + id + '">' + esc(label) + "</label>" + control +
      (o.lkr ? '<small class="ad-lkr" data-lkr="' + path + '"></small>' : "") + (o.lkrNow ? '<small class="ad-lkr" data-lkrnow="' + path + '"></small>' : "") + (o.hint ? '<small class="ad-hint">' + esc(o.hint) + "</small>" : "") + "</div>";
  }
  const card = (title, body, note) => '<section class="ad-card"><div class="ad-card-head"><h2>' + title + "</h2>" + (note ? "<p>" + note + "</p>" : "") + "</div>" + body + "</section>";
  const grid = inner => '<div class="ad-grid">' + inner + "</div>";
  const mini = (act, ico, label, data) => '<button type="button" class="ad-mini" data-act="' + act + '" aria-label="' + esc(label) + '" title="' + esc(label) + '"' + (data || "") + ">" + icon(ico) + "</button>";

  /* ---------- views ---------- */
  const VIEWS = {};

  VIEWS.home = () => {
    const c = S.data.config, s = S.data.services;
    const count = ["types", "sizes", "features", "design", "extras", "creative", "urgency"].reduce((n, g) => n + Object.keys(c[g] || {}).length, 0);
    const stat = (n, t, tab) => '<button type="button" class="ad-stat" data-act="tab" data-tab="' + tab + '"><b>' + n + "</b><span>" + t + "</span></button>";
    const first = S.saved.config === "" ? card("පළවෙනි පාර", '<p class="ad-note">Firebase එකේ තාම site data නෑ. දැන් පේන්නේ site එකේ තියෙන data. පහළ <b>Save කරන්න</b> එබුවම මේ data Firebase එකට යනවා, ඊට පස්සේ මෙතනින් කරන වෙනස් site එකේ පේනවා.</p>') : "";
    return first + card("Hexora admin",
      '<div class="ad-stats">' + stat(S.reqs ? newCount() : "…", "අලුත් requests", "requests") + stat(S.reqs ? S.reqs.filter(r => inFilter(r, "active")).length : "…", "දැන් කරන projects", "requests") +
        stat(s.list.length, "Services", "services") +
        stat(count, "Price items", "prices") + stat(c.notice && c.notice.show ? "On" : "Off", "Notice bar", "notice") + "</div>" +
      '<p class="ad-note">Save කළාම වෙනස් Firebase එකට යනවා. Site එකට අලුතෙන් එන අයට එකපාරම පේනවා. දැනටමත් site එකේ ඉන්න අයට ඊළඟ page එකේ ඉඳන් පේනවා.' +
        (S.content.updatedAt ? " අන්තිමට save කළේ: " + esc(fmtDate(S.content.updatedAt)) + "." : "") + "</p>",
      "Firebase project: " + esc(F.projectId));
  };

  VIEWS.requests = () => {
    if (!S.reqs) return card("Projects & requests", S.reqErr ? '<p class="ad-gate-msg">' + esc(S.reqErr) + '</p><button type="button" class="btn ad-small" data-act="reload-reqs">' + icon(I.reload) + " ආයෙත් try කරන්න</button>" : '<p class="muted">Requests ගන්නවා…</p>');
    const counts = {}; FILTERS.forEach(([k]) => { counts[k] = S.reqs.filter(r => inFilter(r, k)).length; });
    const list = S.reqs.filter(r => inFilter(r, S.reqFilter));
    return card("Projects & requests",
      '<div class="ad-add"><div class="ad-filters" role="group" aria-label="Filter">' + FILTERS.map(([k, t]) =>
        '<button type="button" data-act="req-filter" data-f="' + k + '" aria-pressed="' + (S.reqFilter === k) + '">' + t + " <span>" + counts[k] + "</span></button>").join("") + "</div>" +
        '<button type="button" class="btn ad-small" data-act="req-new">' + icon(I.plus) + " New project</button>" +
        '<button type="button" class="btn ad-small" data-act="reload-reqs">' + icon(I.reload) + " Refresh</button></div>" +
      (S.newOpen ? newProjectForm() : "") +
      (list.length ? '<div class="ad-reqs">' + list.map(reqCard).join("") + "</div>" : '<p class="muted">මෙතන projects නෑ.</p>'),
      "Project form එකෙන් එන requests සහ ඔයා හදන projects. Stage එක, %, ඉවර වෙන දවස සහ update එක customer ට එයාගේ account එකේ (මගේ projects) පේනවා. " +
      "Customer accounts: " + S.customers.length + ".");
  };
  const waNum = p => { let d = String(p || "").replace(/\D/g, ""); if (/^0\d{9}$/.test(d)) d = "94" + d.slice(1); return d.length >= 10 ? d : ""; };
  const phoneLabel = id => window.HXFB ? window.HXFB.phoneLabel(id) : id;
  const stageOf = k => STAGES.find(x => x.key === k) || STAGES[0];
  const pctOf = r => r.status === "done" ? 100 : typeof r.progress === "number" ? r.progress : stageOf(r.status).pct;
  const custOpt = (c, extra) => '<option value="' + esc(c.id) + '">' + esc((c.name || "—") + " · " + phoneLabel(c.phone) + (extra || "")) + "</option>";
  function linkBox(r) {
    if (r.uid) {
      const c = S.customers.find(x => x.id === r.uid);
      return '<div class="ad-req-link linked">' + icon(I.user) + "<span>Customer account: <b>" + esc(c ? c.name : "linked") + "</b>" + (c ? " · " + esc(phoneLabel(c.phone)) : "") + "</span>" +
        mini("req-unlink", I.unlink, "Account එකෙන් අයින් කරන්න", ' data-id="' + esc(r.id) + '"') + "</div>";
    }
    if (!S.customers.length) return '<div class="ad-req-link"><span class="ad-hint">Customer account එකක් නෑ. Status එක online බලන්න customer ට "මගේ projects" page එකෙන් account එකක් හදාගන්න කියන්න.</span></div>';
    const ph = waNum(r.phone), match = S.customers.filter(c => c.phone === ph), rest = S.customers.filter(c => c.phone !== ph);
    return '<div class="ad-req-link">' + icon(I.user) + '<select class="input" data-link="' + esc(r.id) + '" aria-label="Customer account">' +
      (match.length ? "" : '<option value="">Customer account එකකට link කරන්න…</option>') +
      match.map(c => custOpt(c, " (phone එක match)")).join("") + rest.map(c => custOpt(c)).join("") + "</select>" +
      '<button type="button" class="btn ad-small" data-act="req-link" data-id="' + esc(r.id) + '">Link</button></div>';
  }
  function reqCard(r) {
    const wa = waNum(r.phone), id = esc(r.id), pct = pctOf(r), fid = k => ' id="rq-' + k + "-" + id + '"';
    return '<article class="ad-req s-' + esc(r.status) + '" data-id="' + id + '">' +
      '<div class="ad-req-head"><div><b>' + esc(r.title || r.name || "—") + "</b><small>" + (r.title ? esc(r.name) + " · " : "") + esc(fmtDate(r.createdAt)) + " · <code>" + esc(r.ref) + "</code></small></div>" +
        '<span class="ad-pill">' + esc(STAGE_EN[r.status] || r.status) + " · " + pct + "%</span></div>" +
      '<div class="ad-req-meta">' + [r.track === "creative" ? "Logo, Design & Video" : r.track === "pkg" ? "Mobile App package" : "App / Website / System", r.estimate, r.business, r.contact ? "Contact: " + r.contact : ""].filter(Boolean).map(x => "<span>" + esc(x) + "</span>").join("") + "</div>" +
      linkBox(r) +
      '<div class="ad-grid tight ad-req-edit">' +
        '<div class="ad-field"><label for="rq-status-' + id + '">Stage</label><select class="input"' + fid("status") + ' data-rf="status">' +
          STAGES.map(x => '<option value="' + x.key + '"' + (x.key === r.status ? " selected" : "") + ">" + (STAGE_EN[x.key] || x.key) + "</option>").join("") + "</select></div>" +
        '<div class="ad-field"><label for="rq-progress-' + id + '">ඉවර වෙලා <output data-pct>' + pct + '%</output></label><input class="ad-range" type="range" min="0" max="100" step="5"' + fid("progress") + ' data-rf="progress" value="' + pct + '"></div>' +
        '<div class="ad-field"><label for="rq-due-' + id + '">ඉවර වෙන දවස</label><input class="input" type="date"' + fid("due") + ' data-rf="due" value="' + esc(r.due || "") + '"></div>' +
        '<div class="ad-field"><label for="rq-title-' + id + '">Project එකේ නම</label><input class="input"' + fid("title") + ' data-rf="title" maxlength="100" value="' + esc(r.title || "") + '"></div>' +
        '<div class="ad-field wide"><label for="rq-note-' + id + '">Customer ට update එක</label><textarea class="input" rows="2" maxlength="1000"' + fid("note") + ' data-rf="note" placeholder="Ex: Home screen design එක ඉවරයි. ඊළඟට login page එක.">' + esc(r.note || "") + "</textarea>" +
          '<small class="ad-hint">Customer ට එයාගේ account එකේ පේනවා.' + (r.updatedAt ? " අන්තිම update එක: " + esc(fmtDate(r.updatedAt)) : "") + "</small></div></div>" +
      '<div class="ad-req-actions">' +
        (wa ? '<a class="btn btn-wa ad-small" href="https://wa.me/' + wa + '" target="_blank" rel="noopener">WhatsApp</a>' : "") +
        (r.phone ? '<a class="btn ad-small" href="tel:' + esc(String(r.phone).replace(/[^\d+]/g, "")) + '">Call</a>' : "") +
        (r.email ? '<a class="btn ad-small" href="mailto:' + esc(r.email) + '">Email</a>' : "") +
        '<button type="button" class="btn btn-primary ad-small" data-act="req-save" data-id="' + id + '">Update</button>' +
        (r.uid ? '<button type="button" class="btn ad-small ad-chat-btn" data-act="chat" data-id="' + id + '" aria-expanded="false">💬 Chat <span class="ad-badge" data-adot="' + id + '"' + (isUnread(r.id) ? "" : " hidden") + ">අලුත්</span></button>" : "") +
        mini("req-del", I.del, "මකන්න", ' data-id="' + id + '"') + "</div>" +
      (r.uid ? '<p class="ad-chat-note" data-chatnote="' + id + '">' + (S.chats[r.id] ? "💬 " + esc(S.chats[r.id].lastText || "") : "") + '</p><div class="ad-chat" data-chat="' + id + '" hidden></div>'
        : '<p class="ad-chat-note">Chat කරන්න මේ project එක customer ගේ account එකකට link කරන්න.</p>') +
      (r.message ? "<details><summary>සම්පූර්ණ request එක</summary><pre>" + esc(r.message) + "</pre></details>" : "") + "</article>";
  }
  function newProjectForm() {
    return '<form class="ad-newproj" id="newproj-form"><b>New project</b><div class="ad-grid tight">' +
      '<div class="ad-field"><label for="np-title">Project එකේ නම</label><input class="input" id="np-title" maxlength="100" required></div>' +
      '<div class="ad-field"><label for="np-name">Customer ගේ නම</label><input class="input" id="np-name" maxlength="100" required></div>' +
      '<div class="ad-field"><label for="np-phone">Phone</label><input class="input" id="np-phone" type="tel" maxlength="30" placeholder="07X XXX XXXX"></div>' +
      '<div class="ad-field"><label for="np-track">Type</label><select class="input" id="np-track"><option value="dev">App / Website / System</option><option value="creative">Logo, Design & Video</option></select></div>' +
      '<div class="ad-field"><label for="np-uid">Customer account</label><select class="input" id="np-uid"><option value="">— පස්සේ link කරන්නම් —</option>' + S.customers.map(c => custOpt(c)).join("") + "</select></div>" +
      '</div><div class="ad-add"><button class="btn btn-primary ad-small" type="submit">Create</button><button class="btn ad-small" type="button" data-act="req-new">Cancel</button></div></form>';
  }
  async function patchReq(r, data, keys) {
    await fs("PATCH", "/requests/" + encodeURIComponent(r.id), { fields: toFields(data) }, mask(keys));
    keys.forEach(k => { if (k in data) r[k] = data[k] instanceof Date ? data[k].toISOString() : data[k]; else delete r[k]; });
  }

  VIEWS.customers = () => {
    const byPhone = p => S.customers.find(c => c.phone === p);
    const norm = x => String(x || "").trim().toLowerCase().replace(/\s+/g, " ");
    const reqs = S.pinReqs.map(r => {
      const c = byPhone(r.phone), wa = "https://wa.me/" + encodeURIComponent(r.phone) + "?text=" +
        encodeURIComponent("Hi " + (c ? c.name : r.name) + "! ඔයාගේ Hexora account එකේ PIN එක: " + (c && c.pin || "") + "\nමේක වෙන කාටවත් කියන්න එපා.");
      return '<article class="ad-req s-new"><div class="ad-req-head"><div><b>' + esc(r.name) + "</b><small>" + esc(phoneLabel(r.phone)) + " · " + esc(fmtDate(r.createdAt)) + "</small></div></div>" +
        (c ? '<div class="ad-req-meta"><span>Account: ' + esc(c.name) + "</span><span>" + (norm(c.name) === norm(r.name) ? "✓ නම ගැලපෙනවා" : "⚠ නම වෙනස්") + "</span></div>" +
            (c.pin ? '<p class="ad-pinline">PIN: <code class="ad-pin">' + esc(c.pin) + "</code></p>" : '<p class="ad-hint">මේ account එකේ PIN එක save වෙලා නෑ (පරණ account එකක්). Firebase → Authentication එකෙන් ඒ user ව delete කරන්න, customer ට අලුත් account එකක් හදන්න කියන්න.</p>')
          : '<p class="ad-hint">මේ phone number එකට account එකක් නෑ.</p>') +
        (c && c.pin ? '<p class="ad-hint">නම ගැලපෙනවා නම් <b>App එකට යවන්න</b> (customer ගේ page එකේ පැයක් ඇතුළත PIN එක පේනවා). සැක නම් WhatsApp එකෙන් යවන්න.</p>' : "") +
        '<div class="ad-req-actions">' + (c && c.pin ? '<button type="button" class="btn btn-primary ad-small" data-act="pin-send" data-id="' + esc(r.id) + '">' + (r.sentAt ? "ආයෙත් App එකට යවන්න" : "App එකට PIN එක යවන්න") + "</button>" + (r.sentAt ? '<span class="ad-pill ok">App එකට යැව්වා ' + esc(fmtDate(r.sentAt)) + "</span>" : "") + '<a class="btn btn-wa ad-small" href="' + esc(wa) + '" target="_blank" rel="noopener">PIN එක WhatsApp කරන්න</a>' : "") +
        '<button type="button" class="btn ad-small" data-act="pin-done" data-id="' + esc(r.id) + '">එව්වා ✓ (list එකෙන් අයින් කරන්න)</button></div></article>';
    });
    const list = S.customers.map(c => '<div class="ad-hist"><div><b>' + esc(c.name || "—") + "</b><small>" + esc(phoneLabel(c.phone)) + " · " + esc(fmtDate(c.createdAt)) + "</small></div>" +
      '<div class="ad-hist-actions">' + (c.pin ? '<code class="ad-pin">' + (S.show[c.id] ? esc(c.pin) : "••••••") + "</code>" +
        '<button type="button" class="btn ad-small" data-act="pin-show" data-id="' + esc(c.id) + '">' + (S.show[c.id] ? "හංගන්න" : "PIN බලන්න") + "</button>" : '<span class="ad-hint">PIN නෑ</span>') + "</div></div>").join("");
    return card("PIN requests", reqs.length ? '<div class="ad-reqs">' + reqs.join("") + "</div>" : '<p class="muted">PIN requests නෑ.</p>',
        "Customer ට PIN එක අමතක උනාම \"PIN එක අමතක උනාද?\" එබුවම මෙතන පේනවා. PIN එක යවන්න ඕන account එකේ phone number එකටමයි. Customer ටයිප් කරපු එකට නෙවෙයි.") +
      card("Customer accounts (" + S.customers.length + ")", S.customers.length ? '<div class="ad-history">' + list + "</div>" : '<p class="muted">තාම accounts නෑ.</p>',
        "PIN එක customer ගේ secret එකක්. WhatsApp එකෙන් ඒ customer ට විතරක් එවන්න.");
  };

  VIEWS.notice = () => {
    const n = S.data.config.notice;
    return card("Notice bar", grid(
        field("config.notice.show", "Site එකේ උඩින්ම පෙන්නන්න", { type: "bool", wide: true }) +
        field("config.notice.text", "Text", { wide: true, ph: "Ex: අවුරුදු offer! Logo design 20% off" }) +
        field("config.notice.linkText", "Link text (optional)", { ph: "Ex: බලන්න →" }) +
        field("config.notice.link", "Link (optional)", { ph: "start-project.html හරි https://…" })) +
      '<div class="ad-preview"><span class="ad-hint">Preview</span><div class="notice-bar static"><span data-live="config.notice.text">' + esc(n.text || "Notice text") + "</span>" +
      (n.link ? '<a href="#" data-live="config.notice.linkText">' + esc(n.linkText || "බලන්න →") + "</a>" : "") + "</div></div>",
      "Offers, holidays වගේ දේවල් හැම page එකකම උඩින්ම පෙන්නන්න. Visitor ට ඒක වහන්න පුළුවන්.");
  };

  VIEWS.contact = () => card("Contact details", grid(
      field("config.whatsapp", "WhatsApp number", { ph: "94766792617", hint: "රටේ code එකත් එක්ක, digits විතරයි (Ex: 94766792617)." }) +
      field("config.phoneDisplay", "Phone (site එකේ පෙන්නන විදිය)", { ph: "076 679 2617" }) +
      field("config.email", "Email", { ph: "teamhexoramain@gmail.com" }) +
      field("config.facebook", "Facebook page link", { ph: "https://facebook.com/…", hint: "හිස්ව තිබ්බොත් site එකේ පෙන්නන්නේ නෑ." }) +
      field("config.youtube", "YouTube channel link", { ph: "https://youtube.com/@…", hint: "හිස්ව තිබ්බොත් site එකේ පෙන්නන්නේ නෑ." })),
    "Site එකේ හැම තැනම WhatsApp, call, email buttons මේවා use කරනවා.");

  const GROUPS = [
    { key: "types", title: "Project types", note: "Small project එකක පටන් ගන්නේ price එක (USD).", fixed: true,
      fields: [["label", "Name"], ["note", "Note"], ["usd", "USD", "num", 1], ["weeks", "Weeks", "num"], ["kind", "Kind", "kind"], ["includesAdmin", "Admin panel include", "bool"]] },
    { key: "sizes", title: "Size", note: "Small = ×1. Medium / Large price එකයි කාලයයි ගුණ වෙනවා.", fixed: true,
      fields: [["label", "Name"], ["note", "Note"], ["priceX", "Price ×", "num"], ["weeksX", "Time ×", "num"], ["maintenanceUsd", "Maintenance USD / මාසයට", "num", 1]] },
    { key: "packages", title: "Mobile app packages", note: "LKR prices (Package price list rate එකට). Customer ට site එකේ අද rate එකට වෙනස් වෙලා පේනවා. Includes: line එකකට එකක්.", base: true,
      fields: [["label", "Name"], ["lkr", "Price (LKR)", "num", 0, "lkr"], ["weeks", "Weeks", "num"], ["includes", "Includes (line එකකට එකක්)", "lines"]], tpl: { label: "New package", lkr: 10000, weeks: 1, includes: [] } },
    { key: "addons", title: "Package add-ons", note: "Package එකකට customer ට එකතු කරන්න පුළුවන් පොඩි වෙනස්කම්. \"Qty\" = customer ට කීයක් ඕනද කියලා තෝරන්න පුළුවන්.", base: true,
      fields: [["label", "Name"], ["note", "Note"], ["lkr", "Price (LKR)", "num", 0, "lkr"], ["weeks", "Weeks", "num"], ["qty", "Qty (ගණනක් තෝරන්න)", "bool"]], tpl: { label: "New add-on", note: "", lkr: 2000, weeks: 0.3 } },
    { key: "features", title: "Features", note: "Project එකට එකතු වෙන add-ons.",
      fields: [["label", "Name"], ["usd", "USD", "num", 1], ["weeks", "Weeks", "num"]], tpl: { label: "New feature", usd: 30, weeks: 0.5 } },
    { key: "design", title: "Design", note: "Percent = project price එකේ %. USD = ඊට අමතරව.", fixed: true,
      fields: [["label", "Name"], ["note", "Note"], ["percent", "%", "num"], ["usd", "USD", "num", 1]] },
    { key: "extras", title: "Launch extras", note: "Store publish, hosting setup වගේ දේවල්.",
      fields: [["label", "Name"], ["note", "Note"], ["usd", "USD", "num", 1], ["for", "Project kind", "for"]], tpl: { label: "New extra", note: "", usd: 15, for: ["app", "web", "both"] } },
    { key: "creative", title: "Design & Video items", note: "Item එකකට price එක. Days = පළවෙනි එකට, +Days = ඊට පස්සේ හැම එකකටම.",
      fields: [["label", "Name"], ["note", "Note"], ["usd", "USD", "num", 1], ["unit", "Unit (logo, post…)"], ["days", "Days", "num"], ["extraDays", "+Days each", "num"]], tpl: { label: "New item", note: "", usd: 10, unit: "item", days: 1, extraDays: 0.5 } },
    { key: "urgency", title: "Speed", note: "Urgent කළාම price එකට % එකතු වෙනවා, කාලය × වෙනවා.", fixed: true,
      fields: [["label", "Name"], ["note", "Note"], ["percent", "%", "num"], ["weeksX", "Time ×", "num"]] }
  ];
  function itemFields(g, key) {
    const base = "config." + g.key + "." + key;
    return g.fields.map(([f, label, type, money, lkrMode]) => {
      const p = base + "." + f;
      if (type === "lines") return field(p, label, { type: "lines", rows: 5, wide: true });
      if (type === "kind") return field(p, label, { type: "select", options: [["web", "Web"], ["app", "App"], ["both", "App + Web"]] });
      if (type === "bool") return field(p, label, { type: "bool" });
      if (type === "for") {
        const cur = get(p) || [];
        return '<div class="ad-field"><span class="ad-label">' + label + '</span><div class="ad-flags">' + [["app", "App"], ["web", "Web"], ["both", "Both"]].map(([k, t]) =>
          '<label class="ad-check"><input type="checkbox" data-path="' + p + '" data-type="flag" data-flag="' + k + '"' + (cur.indexOf(k) !== -1 ? " checked" : "") + "><span>" + t + "</span></label>").join("") + "</div></div>";
      }
      return field(p, label, { type: type === "num" ? "num" : "text", lkr: !!money, lkrNow: lkrMode === "lkr" });
    }).join("");
  }
  VIEWS.prices = () => {
    const c = S.data.config;
    return card("General", grid(
        field("config.fallbackRate", "Fallback rate (LKR for 1 USD)", { type: "num", hint: "Live rate එක load නොවුණොත් use කරනවා." }) +
        field("config.packageBaseRate", "Package price list rate", { type: "num", hint: "Packages / add-ons වල LKR prices ලියලා තියෙන්නේ 1 USD = මේ rate එකට. අද rate එක මේකට වඩා වැඩි නම් prices වැඩි වෙනවා, අඩු නම් අඩු වෙනවා." }) +
        field("config.roundTo", "LKR round to", { type: "num", hint: "LKR 20,000 ට වැඩි prices මේකට round වෙනවා." }) +
        field("config.advancePercent", "Advance %", { type: "num" }) +
        field("config.freeSupportMonths", "Free support (months)", { type: "num" }) +
        field("config.rangeSpread", "Estimate range ×", { type: "num", hint: "Estimate එකේ උපරිම = අවම × මේක." }) +
        field("config.rateCacheHours", "Rate cache (hours)", { type: "num" }) +
        field("config.rateApi", "Exchange rate API", { wide: true })),
      "හැම price එකක්ම USD. Site එක ඒවා LKR වලට හරවනවා. පහළ පේන LKR එක fallback rate එකෙන්.") +
    GROUPS.map(g => card(g.title,
      '<div class="ad-items">' + Object.keys(c[g.key] || {}).map(k =>
        '<div class="ad-item"><div class="ad-item-head"><code class="ad-key">' + esc(k) + "</code>" +
          (g.fixed ? "" : mini("del-key", I.del, "මකන්න", ' data-group="' + g.key + '" data-key="' + esc(k) + '"')) + "</div>" +
        '<div class="ad-grid tight">' + itemFields(g, k) + "</div></div>").join("") + "</div>" +
      (g.fixed ? "" : '<div class="ad-add"><input class="input" id="newkey-' + g.key + '" placeholder="අලුත් key එක (ex: seo)" maxlength="20"><button type="button" class="btn ad-small" data-act="add-key" data-group="' + g.key + '">' + icon(I.plus) + " Add</button></div>"),
      g.note)).join("");
  };

  /* services */
  const POOLS = { type: "types", creative: "creative", feature: "features", extra: "extras", maint: "sizes", design: "design", package: "packages" };
  const refKind = r => Object.keys(POOLS).find(k => r[k] != null);
  const refOk = r => { const k = refKind(r); return !!(k && (S.data.config[POOLS[k]] || {})[r[k]]); };
  function refsTo(group, key) {
    const kind = Object.keys(POOLS).find(k => POOLS[k] === group);
    return S.data.services.list.filter(s => (s.prices || []).some(r => r[kind] === key)).map(s => s.name);
  }
  function arrayEditor(path, render, addLabel, tpl) {
    const arr = get(path) || [];
    return '<div class="ad-list">' + arr.map((x, i) =>
      '<div class="ad-list-item"><div class="ad-list-body">' + render(path + "." + i, x, i) + "</div>" +
      '<div class="ad-list-actions">' + mini("arr-move", I.up, "උඩට", ' data-path="' + path + '" data-i="' + i + '" data-dir="-1"') +
        mini("arr-move", I.down, "පහළට", ' data-path="' + path + '" data-i="' + i + '" data-dir="1"') +
        mini("arr-del", I.del, "මකන්න", ' data-path="' + path + '" data-i="' + i + '"') + "</div></div>").join("") + "</div>" +
      '<button type="button" class="btn ad-small" data-act="arr-add" data-path="' + path + '" data-tpl="' + esc(JSON.stringify(tpl)) + '">' + icon(I.plus) + " " + addLabel + "</button>";
  }
  function priceRef(p, r) {
    const kind = refKind(r) || "type", pool = S.data.config[POOLS[kind]] || {};
    return '<div class="ad-grid tight">' +
      '<div class="ad-field"><label>Kind</label><select class="input" data-refkind="' + p + '">' +
        [["type", "Project type"], ["package", "App package"], ["creative", "Design & Video item"], ["feature", "Feature"], ["extra", "Launch extra"], ["maint", "Maintenance"], ["design", "Design"]].map(([k, t]) =>
          '<option value="' + k + '"' + (k === kind ? " selected" : "") + ">" + t + "</option>").join("") + "</select></div>" +
      '<div class="ad-field"><label>Item</label><select class="input" data-refkey="' + p + '">' +
        Object.keys(pool).map(k => '<option value="' + esc(k) + '"' + (k === r[kind] ? " selected" : "") + ">" + esc(pool[k].label || k) + "</option>").join("") + "</select></div>" +
      field(p + ".featured", "Highlight කරන්න", { type: "bool" }) + "</div>";
  }
  const faqItem = p => field(p + ".q", "ප්‍රශ්නය", { wide: true }) + field(p + ".a", "උත්තරය", { type: "area", rows: 3, wide: true });
  VIEWS.services = () => {
    const sv = S.data.services, list = sv.list, i = Math.max(0, Math.min(S.svc, list.length - 1)), s = list[i], base = "services.list." + i;
    const cats = Object.keys(sv.categories);
    const side = '<nav class="ad-svc-list" aria-label="Services">' + cats.map(ck =>
      '<span class="ad-svc-cat">' + esc(sv.categories[ck].label) + "</span>" +
      list.map((x, j) => x.cat !== ck ? "" : '<button type="button" data-act="pick-svc" data-i="' + j + '"' + (j === i ? ' aria-current="true"' : "") + ">" +
        '<svg class="ad-ico" viewBox="0 0 24 24" aria-hidden="true">' + (x.icon || "") + '</svg><span data-live="services.list.' + j + '.name">' + esc(x.name || "(නමක් නෑ)") + "</span></button>").join("")).join("") +
      '<button type="button" class="btn ad-small" data-act="add-svc">' + icon(I.plus) + " අලුත් service</button></nav>";
    const form = !s ? "<p>Service එකක් නෑ.</p>" :
      '<div class="ad-svc-form">' +
        card(esc(s.name || "Service"),
          grid(field(base + ".name", "Name") +
            field(base + ".slug", "Link (slug)", { hint: "service.html?s=" + s.slug + " — මාරු කළොත් home page එකේ card link එකත් මාරු කරන්න ඕන." }) +
            field(base + ".cat", "Category", { type: "select", options: cats.map(k => [k, sv.categories[k].label]) }) +
            field(base + ".anim", "Animation", { type: "select", options: [["", "— (video එක use කරනවා)"]].concat(ANIMS.map(a => [a, a])) }) +
            field(base + ".video", "Video (optional)", { ph: "assets/video/file.mp4", hint: "දැම්මොත් animation එක වෙනුවට video එක පේනවා." }) +
            field(base + ".tags", "Tags (comma වලින්)", { type: "list" }) +
            field(base + ".packages", "Mobile app packages පෙන්නන්න", { type: "bool", hint: "ටික් කළොත් මේ service page එකේ App packages ටික (Pricing කොටසේ) පේනවා. Mobile Apps page එකට on." }) +
            field(base + ".summary", "Summary (card එකේ)", { type: "area", rows: 2, wide: true }) +
            field(base + ".intro", "Intro (page එකේ උඩ)", { type: "area", rows: 3, wide: true }) +
            field(base + ".includes", "මොකද ලැබෙන්නේ (line එකකට එකක්)", { type: "lines", rows: 5, wide: true }) +
            '<div class="ad-field wide"><label for="f-icon">Icon (SVG paths)</label><div class="ad-icon-row"><textarea class="input" id="f-icon" data-path="' + base + '.icon" data-type="text" rows="2">' + esc(s.icon || "") + '</textarea><svg class="ad-icon-prev" viewBox="0 0 24 24" aria-hidden="true" data-live-svg="' + base + '.icon">' + (s.icon || "") + "</svg></div></div>"),
          'Text එකේ {support}, {advance}, {urgent} හරි {creative:photo} වගේ price එකක් දාන්න පුළුවන්. <a href="service.html?s=' + esc(s.slug) + '" target="_blank" rel="noopener">දැන් තියෙන page එක බලන්න ↗</a>') +
        card("Prices", arrayEditor(base + ".prices", priceRef, "Price එකක් add කරන්න", { type: Object.keys(S.data.config.types)[0] }), "Prices ගන්නේ Prices tab එකෙන්. මෙතන තෝරන්නේ මේ page එකේ පෙන්නන ඒවා විතරයි.") +
        card("FAQ", arrayEditor(base + ".faq", faqItem, "ප්‍රශ්නයක් add කරන්න", { q: "", a: "" })) +
        '<div class="ad-danger"><button type="button" class="btn ad-small" data-act="del-svc">' + icon(I.del) + " මේ service එක මකන්න</button></div>" +
      "</div>";
    return '<div class="ad-svc-layout">' + side + form + "</div>" +
      cats.map(ck => card("Category: " + esc(sv.categories[ck].label),
        grid(field("services.categories." + ck + ".label", "Name") + field("services.categories." + ck + ".note", "Note")) +
        '<span class="ad-label">වැඩ කරන විදිය (steps)</span>' +
        arrayEditor("services.categories." + ck + ".steps", p => grid(field(p + ".t", "Step") + field(p + ".d", "Details", { type: "area", rows: 2 })), "Step එකක් add කරන්න", { t: "", d: "" }))).join("") +
      card("හැම service එකකම FAQ", arrayEditor("services.commonFaq", faqItem, "ප්‍රශ්නයක් add කරන්න", { q: "", a: "" }), "මේවා හැම service page එකකම FAQ එකේ අගට එකතු වෙනවා.");
  };

  VIEWS.history = () => card("History",
    '<div id="history-list" class="ad-history"><p class="muted">Firebase එකෙන් ගන්නවා…</p></div>',
    "Save කරපු අන්තිම versions 20. කලින් version එකක් load කරලා Save කළොත් site එක ඒ version එකට යනවා.");
  async function loadHistory() {
    const box = $("#history-list"); if (!box) return;
    try {
      const rows = await query("history", "at", 20);
      if (!$("#history-list")) return;
      S.hist = rows;
      const shown = {};
      box.innerHTML = rows.length ? rows.map((h, i) => {
        const current = !shown[h.file] && h.json === S.saved[h.file]; shown[h.file] = 1;
        return '<div class="ad-hist"><div><b>' + esc(h.note || (h.file === "config" ? "Site settings" : "Services")) + "</b><small>" + esc(fmtDate(h.at)) + " · " + esc(h.by || "") + " · <code>" + esc(h.file) + "</code></small></div>" +
          '<div class="ad-hist-actions">' + (current ? '<span class="ad-pill ok">දැන් තියෙන්නේ</span>' : '<button type="button" class="btn ad-small" data-act="restore" data-i="' + i + '">මේක load කරන්න</button>') + "</div></div>";
      }).join("") : '<p class="muted">තාම save කරලා නෑ.</p>';
    } catch (e) { box.innerHTML = '<p class="ad-gate-msg">' + esc(errText(e)) + "</p>"; }
  }

  VIEWS.security = () => card("PIN එක මාරු කරන්න",
      '<form id="pin-form" class="ad-grid">' +
        '<div class="ad-field"><label for="pin-new">අලුත් PIN (digits 6)</label><input class="input" id="pin-new" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>' +
        '<div class="ad-field"><label for="pin-new2">ආයෙත් ගහන්න</label><input class="input" id="pin-new2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>' +
        '<div class="ad-field wide"><button class="btn btn-primary" type="submit">PIN එක save කරන්න</button></div></form>',
      "PIN එක Firebase එකේ admin account එකේ password එක. මාරු කළාම ඊළඟ පාර අලුත් PIN එකෙන් log වෙන්න.") +
    card("Account",
      '<p class="ad-note">Firebase project: <b>' + esc(F.projectId) + "</b><br>Admin account: <b>" + esc(F.adminEmail) + "</b></p>",
      "විනාඩි 30ක් use නොකළොත් admin panel එක auto-lock වෙනවා (save නොකරපු වෙනස් නැත්නම්).");

  /* ---------- live bits (LKR previews, names, icon) ---------- */
  function refreshLive() {
    $$("[data-lkr]").forEach(el => { el.textContent = "≈ " + lkr(get(el.dataset.lkr)); });
    $$("[data-lkrnow]").forEach(el => { const c = S.data.config; el.textContent = "අද rate එකට (" + (Number(c.fallbackRate) || 0) + "): ≈ " + P.formatLKR(P.packageLKR(c, Number(get(el.dataset.lkrnow)) || 0, Number(c.fallbackRate) || 0)); });
    $$("[data-live]").forEach(el => { const v = get(el.dataset.live); el.textContent = v || (el.dataset.live.endsWith("linkText") ? "බලන්න →" : el.dataset.live.endsWith(".name") ? "(නමක් නෑ)" : ""); });
    $$("[data-live-svg]").forEach(el => { el.innerHTML = get(el.dataset.liveSvg) || ""; });
  }

  /* ---------- save bar + checks ---------- */
  function problems() {
    const out = [], c = S.data.config, sv = S.data.services;
    if (!/^\d{10,15}$/.test(c.whatsapp || "")) out.push("Contact: WhatsApp number එක digits 10–15ක් වෙන්න ඕන (Ex: 94766792617).");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email || "")) out.push("Contact: Email එක හරියට දාන්න.");
    ["facebook", "youtube"].forEach(k => { if (c[k] && !/^https:\/\//.test(c[k])) out.push("Contact: " + k + " link එක https:// වලින් පටන් ගන්න ඕන."); });
    if (c.notice.link && !/^(https:\/\/|[\w-]+\.html)/.test(c.notice.link)) out.push("Notice: link එක https://… හරි page.html විදියට දාන්න.");
    if (c.notice.show && !c.notice.text) out.push("Notice: පෙන්නන්න text එකක් දාන්න.");
    if (!(c.fallbackRate > 0)) out.push("Prices: fallback rate එක 0ට වඩා වැඩි වෙන්න ඕන.");
    const seen = {};
    sv.list.forEach((s, i) => {
      const n = s.name || "Service " + (i + 1);
      if (!s.name) out.push("Services: service " + (i + 1) + " එකට නමක් නෑ.");
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.slug || "")) out.push("Services: " + n + " — slug එකට a-z, 0-9, - විතරයි.");
      else if (seen[s.slug]) out.push("Services: slug \"" + s.slug + "\" දෙපාරක් තියෙනවා.");
      seen[s.slug] = 1;
      if (!s.video && ANIMS.indexOf(s.anim) === -1) out.push("Services: " + n + " — animation එකක් හරි video එකක් තෝරන්න.");
      (s.prices || []).forEach(r => { if (!refOk(r)) out.push("Services: " + n + " — Prices tab එකේ නැති price එකක් තියෙනවා."); });
    });
    return out;
  }
  function updateSaveBar() {
    const bar = $("#ad-savebar"); if (!bar) return;
    const files = ["config", "services"].filter(dirty);
    bar.hidden = !files.length;
    if (!files.length) return;
    const errs = problems();
    const names = { config: "Site settings", services: "Services" };
    $("#ad-save-info").innerHTML = "<b>Save නොකරපු වෙනස්:</b> " + files.map(f => names[f]).join(", ") +
      (errs.length ? '<span class="ad-bad">' + esc(errs[0]) + (errs.length > 1 ? " (+" + (errs.length - 1) + ")" : "") + "</span>" : "");
    $("#save-btn").disabled = !!errs.length;
  }
  async function saveAll(btn) {
    const errs = problems();
    if (errs.length) return toast(errs[0], true);
    const note = ($("#commit-msg").value || "").trim();
    const files = ["config", "services"].filter(dirty), now = new Date();
    const fields = { updatedAt: now, updatedBy: S.auth.email };
    files.forEach(k => { fields[k] = JSON.stringify(S.data[k]); });
    const pre = S.content.exists ? "currentDocument.updateTime=" + encodeURIComponent(S.content.updateTime) : "currentDocument.exists=false";
    btn.disabled = true; btn.textContent = "Save වෙනවා…";
    try {
      const doc = await fs("PATCH", "/site/content", { fields: toFields(fields) }, mask(Object.keys(fields)) + "&" + pre);
      S.content = { exists: true, updateTime: doc.updateTime, updatedAt: now.toISOString() };
      files.forEach(k => { S.saved[k] = fields[k]; });
      // this browser's copy for boot.js, so the site shows the change here right away
      store.set("hx_content_v1", { at: Date.now(), config: S.saved.config, services: S.saved.services });
      $("#commit-msg").value = "";
      toast("Save උනා ✓ Site එකට එන අයට අලුත් data පේනවා.");
      // keep a copy for the History tab (a failure here does not undo the save)
      Promise.all(files.map(k => fs("POST", "/history", { fields: toFields({ file: k, json: fields[k], note: note, at: now, by: S.auth.email }) }))).catch(() => {});
    } catch (e) {
      toast("Save වුණේ නෑ: " + errText(e), true);
    }
    btn.textContent = "Save කරන්න";
    updateSaveBar();
    if (S.tab === "home") renderTab();
  }

  async function createProject(form) {
    const v = id => $("#" + id).value.trim(), btn = form.querySelector("[type=submit]");
    if (!v("np-title") || v("np-name").length < 2) return toast("Project එකේ නමයි customer ගේ නමයි ඕන.", true);
    const d = new Date(), p = n => String(n).padStart(2, "0"), now = new Date();
    const data = { ref: "HX-" + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + "-" + Math.floor(1000 + Math.random() * 9000),
      title: v("np-title").slice(0, 100), name: v("np-name").slice(0, 100), phone: v("np-phone").slice(0, 30), track: v("np-track"),
      contact: "WhatsApp", status: "contacted", progress: stageOf("contacted").pct, createdAt: now, updatedAt: now };
    if (v("np-uid")) data.uid = v("np-uid");
    btn.disabled = true;
    try {
      const doc = await fs("POST", "/requests", { fields: toFields(data) });
      S.reqs.unshift(fromDoc(doc)); S.newOpen = false; S.reqFilter = "all"; paintTabs(); renderTab(); toast("Project එක හැදුවා ✓");
    } catch (err) { toast(errText(err), true); btn.disabled = false; }
  }

  /* ---------- events ---------- */
  root.addEventListener("input", e => {
    if (e.target.dataset.rf === "progress") { e.target.closest(".ad-field").querySelector("[data-pct]").textContent = e.target.value + "%"; return; }
    const el = e.target.closest("[data-path]"); if (!el) return;
    let v;
    switch (el.dataset.type) {
      case "num": v = el.value === "" ? 0 : Number(el.value); if (isNaN(v)) return; break;
      case "bool": v = el.checked; break;
      case "list": v = el.value.split(",").map(x => x.trim()).filter(Boolean); break;
      case "lines": v = el.value.split("\n").map(x => x.trim()).filter(Boolean); break;
      case "flag": v = (get(el.dataset.path) || []).filter(x => x !== el.dataset.flag); if (el.checked) v.push(el.dataset.flag); break;
      default: v = el.value;
    }
    if (el.dataset.path.endsWith(".video") && !v) { const o = get(el.dataset.path.replace(/\.video$/, "")); delete o.video; }
    else set(el.dataset.path, v);
    refreshLive();
    updateSaveBar();
  });
  root.addEventListener("change", async e => {
    const t = e.target;
    if (t.dataset.refkind) {
      const old = get(t.dataset.refkind), k = t.value, pool = S.data.config[POOLS[k]] || {};
      const fresh = {}; fresh[k] = Object.keys(pool)[0]; if (old.featured) fresh.featured = true;
      set(t.dataset.refkind, fresh); renderTab(); updateSaveBar(); return;
    }
    if (t.dataset.refkey) { const r = get(t.dataset.refkey); r[refKind(r)] = t.value; updateSaveBar(); return; }
    if (t.dataset.rf === "status") {
      // moving to a later stage pulls the % up to that stage's usual value
      const range = t.closest(".ad-req").querySelector('[data-rf="progress"]'), st = stageOf(t.value);
      range.value = st.key === "done" ? 100 : Math.max(Number(range.value) || 0, st.pct);
      range.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    if (t.dataset.path && /\.(cat|anim)$/.test(t.dataset.path)) renderTab();
  });
  root.addEventListener("submit", async e => {
    if (e.target.id === "newproj-form") { e.preventDefault(); createProject(e.target); return; }
    if (e.target.id !== "pin-form") return;
    e.preventDefault();
    const a = $("#pin-new").value, b = $("#pin-new2").value, btn = e.target.querySelector("button");
    if (!/^\d{6}$/.test(a)) return toast("PIN එක digits 6ක් වෙන්න ඕන.", true);
    if (a !== b) return toast("PIN දෙක සමාන නෑ.", true);
    btn.disabled = true;
    try { await changePin(a); e.target.reset(); toast("PIN එක මාරු උනා ✓ ඊළඟ පාර අලුත් PIN එකෙන් log වෙන්න."); }
    catch (err) { toast("PIN එක මාරු වුණේ නෑ: " + errText(err), true); }
    btn.disabled = false;
  });
  root.addEventListener("click", async e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const d = b.dataset;
    switch (d.act) {
      case "tab": S.tab = d.tab; renderTab(); break;
      case "lock": if (anyDirty() && !armed(b, "Save නොකරපු වෙනස් නැති වෙනවා. ආයෙත් ඔබන්න")) return; lockScreen(); break;
      case "save": saveAll(b); break;
      case "discard":
        if (S.saved.config === "") return toast("පළවෙනි පාර නිසා discard කරන්න දෙයක් නෑ. Save කරන්න.", true);
        if (!armed(b, "ඇත්තටම? ආයෙත් ඔබන්න")) return;
        S.data.config = JSON.parse(S.saved.config); S.data.services = JSON.parse(S.saved.services); normalize();
        S.svc = Math.min(S.svc, S.data.services.list.length - 1); renderTab(); updateSaveBar(); break;
      case "reload-reqs": S.reqs = null; S.reqErr = ""; renderTab(); loadRequests(); break;
      case "req-filter": S.reqFilter = d.f; renderTab(); break;
      case "chat": S.chatOpen = S.chatOpen === d.id ? null : d.id; if (S.chatOpen) openChatBox(S.chatOpen); else openChatBox(null); break;
      case "pin-show": S.show[d.id] = !S.show[d.id]; renderTab(); break;
      case "pin-send": {
        const r = S.pinReqs.find(x => x.id === d.id), c = r && S.customers.find(x => x.phone === r.phone);
        if (!c || !c.pin) return;
        if (!armed(b, "ඇත්තටම? ආයෙත් ඔබන්න")) return;
        const at = new Date();
        try { await fs("PATCH", "/pinRequests/" + encodeURIComponent(r.id), { fields: toFields({ pin: c.pin, sentAt: at }) }, mask(["pin", "sentAt"])); r.pin = c.pin; r.sentAt = at.toISOString(); renderTab(); toast("App එකට යැව්වා ✓ Customer ගේ page එකේ පැයක් ඇතුළත PIN එක පේනවා."); }
        catch (err) { toast(errText(err), true); }
        break;
      }
      case "pin-done":
        try { await fs("DELETE", "/pinRequests/" + encodeURIComponent(d.id)); S.pinReqs = S.pinReqs.filter(r => r.id !== d.id); paintTabs(); renderTab(); toast("List එකෙන් අයින් කළා."); }
        catch (err) { toast(errText(err), true); }
        break;
      case "req-new": S.newOpen = !S.newOpen; renderTab(); if (S.newOpen) $("#np-title").focus(); break;
      case "req-save": {
        const r = S.reqs.find(x => x.id === d.id), box = b.closest(".ad-req"); if (!r) return;
        const v = k => box.querySelector('[data-rf="' + k + '"]').value;
        const data = { status: v("status"), progress: Number(v("progress")) || 0, due: v("due"), title: v("title").trim().slice(0, 100), note: v("note").trim().slice(0, 1000), updatedAt: new Date() };
        b.disabled = true;
        try { await patchReq(r, data, Object.keys(data)); paintTabs(); renderTab(); toast("Update උනා ✓ Customer ට පේනවා."); }
        catch (err) { toast(errText(err), true); b.disabled = false; }
        break;
      }
      case "req-link": {
        const r = S.reqs.find(x => x.id === d.id), uid = $('[data-link="' + d.id + '"]').value; if (!r) return;
        if (!uid) return toast("Customer account එකක් තෝරන්න.", true);
        try { await patchReq(r, { uid: uid }, ["uid"]); renderTab(); toast("Account එකට link උනා ✓"); }
        catch (err) { toast(errText(err), true); }
        break;
      }
      case "req-unlink": {
        const r = S.reqs.find(x => x.id === d.id); if (!r) return;
        if (!armed(b, "Unlink?")) return;
        try { await patchReq(r, {}, ["uid"]); renderTab(); toast("Account එකෙන් අයින් කළා."); }
        catch (err) { toast(errText(err), true); }
        break;
      }
      case "req-del": {
        if (!armed(b, "මකන්නද?")) return;
        try { await fs("DELETE", "/requests/" + encodeURIComponent(d.id)); S.reqs = S.reqs.filter(r => r.id !== d.id); paintTabs(); renderTab(); toast("Request එක මැකුවා."); }
        catch (err) { toast(errText(err), true); }
        break;
      }
      case "add-key": {
        const inp = $("#newkey-" + d.group), key = (inp.value || "").trim(), g = GROUPS.find(x => x.key === d.group);
        if (!/^[a-z][a-z0-9]{1,19}$/.test(key)) return toast("Key එක a-z / 0-9 අකුරු 2–20ක් වෙන්න ඕන (ex: seo).", true);
        if (S.data.config[d.group][key]) return toast("\"" + key + "\" දැනටමත් තියෙනවා.", true);
        S.data.config[d.group][key] = clone(g.tpl); renderTab(); updateSaveBar(); break;
      }
      case "del-key": {
        const used = refsTo(d.group, d.key);
        if (used.length) return toast("මේක මේ services වල prices වල use වෙනවා: " + used.join(", ") + ". මුලින් ඒවායින් අයින් කරන්න.", true);
        if (!armed(b, "මකන්නද?")) return;
        delete S.data.config[d.group][d.key]; renderTab(); updateSaveBar(); break;
      }
      case "pick-svc": S.svc = Number(d.i); renderTab(); break;
      case "add-svc": {
        const list = S.data.services.list;
        let n = list.length + 1; while (list.some(s => s.slug === "new-service-" + n)) n++;
        list.push({ slug: "new-service-" + n, cat: Object.keys(S.data.services.categories)[0], name: "New service", anim: "phone",
          icon: '<path d="M12 2l8.7 5v10L12 22l-8.7-5V7z"/>', summary: "", intro: "", tags: [], includes: [], prices: [], faq: [] });
        S.svc = list.length - 1; renderTab(); updateSaveBar();
        toast("අලුත් service එක service pages වල පේනවා. Home page එකේ card එකක් ඕන නම් index.html එකට එකතු කරන්න ඕන.");
        break;
      }
      case "del-svc":
        if (!armed(b, "ඇත්තටම මකන්නද? ආයෙත් ඔබන්න")) return;
        S.data.services.list.splice(S.svc, 1); S.svc = 0; renderTab(); updateSaveBar(); break;
      case "arr-add": if (get(d.path)) get(d.path).push(JSON.parse(d.tpl)); else set(d.path, [JSON.parse(d.tpl)]); renderTab(); updateSaveBar(); break;
      case "arr-del": if (!armed(b, "මකන්නද?")) return; get(d.path).splice(Number(d.i), 1); renderTab(); updateSaveBar(); break;
      case "arr-move": {
        const arr = get(d.path), i = Number(d.i), j = i + Number(d.dir);
        if (j < 0 || j >= arr.length) return;
        arr.splice(j, 0, arr.splice(i, 1)[0]); renderTab(); updateSaveBar(); break;
      }
      case "restore": {
        const h = S.hist && S.hist[Number(d.i)]; if (!h) return;
        S.data[h.file] = JSON.parse(h.json); normalize();
        S.svc = Math.min(S.svc, S.data.services.list.length - 1);
        updateSaveBar(); loadHistory();
        toast("ඒ version එක load උනා. Save කළොත් site එක ඒ version එකට යනවා.");
        break;
      }
    }
  });

  // unsaved-changes guard + idle auto-lock
  window.addEventListener("beforeunload", e => { if (S.auth && anyDirty()) { e.preventDefault(); e.returnValue = ""; } });
  ["pointerdown", "keydown"].forEach(ev => window.addEventListener(ev, () => { S.last = Date.now(); }, { passive: true }));
  setInterval(() => { if (S.auth && !anyDirty() && Date.now() - S.last > IDLE_MS) lockScreen("විනාඩි 30ක් use නොකළ නිසා lock උනා."); }, 30000);

  lockScreen();
})();
