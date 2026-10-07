/* HEXORA — admin panel (admin.html)
   1. PIN screen. The PIN is checked against a PBKDF2 hash in admin-pin.js.
      It only hides the panel; it is not what protects the site.
   2. GitHub token. This is what really allows changes. It is kept on this
      device only, encrypted with the PIN, and sent only to api.github.com.
   3. Saving rewrites assets/js/config.js, services.js or admin-pin.js through
      the GitHub contents API. The hosting rebuilds the site from that branch. */
(function () {
  "use strict";
  const A = window.HX_ADMIN, P = window.HXPrice;
  const root = document.getElementById("admin-root");
  if (!root || !A || !P) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));
  const PATHS = { config: "assets/js/config.js", services: "assets/js/services.js", pin: "assets/js/admin-pin.js" };
  const KEYS = { token: "hx_admin_token_v1", branch: "hx_admin_branch_v1", tries: "hx_admin_tries_v1" };
  const PIN_LEN = 6, MAX_TRIES = 5, LOCK_MS = 60000, IDLE_MS = 30 * 60000, PIN_ITER = 250000;
  const ANIMS = ["phone", "browser", "dashboard", "backend", "chat", "server", "logo", "social", "photo", "timeline", "uiux"];
  const S = { pin: "", token: "", branch: "", defaultBranch: "", files: {}, data: {}, saved: {}, tab: "home", svc: 0, last: Date.now() };

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } }
  };

  /* ---------- crypto (Web Crypto) ---------- */
  const enc = new TextEncoder(), dec = new TextDecoder();
  const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
  const unhex = h => new Uint8Array((h.match(/../g) || []).map(x => parseInt(x, 16)));
  const randHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
  async function pbkdf2(secret, saltHex, iterations) {
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
    return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unhex(saltHex), iterations: iterations }, key, 256);
  }
  const pinHash = async (pin, salt, iter) => hex(await pbkdf2(pin, salt, iter));
  async function aesKey(pin, salt) {
    return crypto.subtle.importKey("raw", await pbkdf2(pin, salt, 150000), "AES-GCM", false, ["encrypt", "decrypt"]);
  }
  async function sealToken(token, pin) {
    const salt = randHex(16), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, await aesKey(pin, salt), enc.encode(token));
    return { salt: salt, iv: hex(iv), ct: hex(ct), at: new Date().toISOString() };
  }
  async function openToken(box, pin) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unhex(box.iv) }, await aesKey(pin, box.salt), unhex(box.ct));
    return dec.decode(pt);
  }

  /* ---------- GitHub contents API ---------- */
  const repoPath = () => "/repos/" + A.repo.owner + "/" + A.repo.name;
  async function gh(path, opts) {
    opts = opts || {};
    const headers = { Accept: "application/vnd.github+json", Authorization: "Bearer " + S.token, "X-GitHub-Api-Version": "2022-11-28" };
    if (opts.body) headers["Content-Type"] = "application/json";
    const r = await fetch("https://api.github.com" + path, { method: opts.method || "GET", headers: headers, body: opts.body, cache: "no-store" });
    if (!r.ok) {
      const e = new Error("GitHub " + r.status); e.status = r.status;
      try { e.detail = (await r.json()).message; } catch (x) { /* no body */ }
      throw e;
    }
    return r.status === 204 ? null : r.json();
  }
  const b64encode = text => { let bin = ""; enc.encode(text).forEach(b => { bin += String.fromCharCode(b); }); return btoa(bin); };
  const b64decode = b64 => dec.decode(Uint8Array.from(atob(String(b64).replace(/\s/g, "")), c => c.charCodeAt(0)));
  async function readFile(path, ref) {
    const j = await gh(repoPath() + "/contents/" + path + "?ref=" + encodeURIComponent(ref || S.branch));
    return { text: b64decode(j.content), sha: j.sha };
  }
  function writeFile(path, text, sha, message) {
    const body = { message: message, content: b64encode(text), branch: S.branch };
    if (sha) body.sha = sha;
    return gh(repoPath() + "/contents/" + path, { method: "PUT", body: JSON.stringify(body) });
  }
  // the data files are our own plain "window.X = {...}" scripts
  function evalData(text, name) {
    const w = {};
    new Function("window", text)(w);
    if (!w[name]) throw new Error(name + " not found");
    return w[name];
  }

  /* ---------- files written back to the repo ---------- */
  const CONFIG_HEAD = "/* ==========================================================================\n" +
    "   HEXORA — SITE SETTINGS\n" +
    "   Saved from the admin panel (admin.html). You can still edit it by hand.\n" +
    "   --------------------------------------------------------------------------\n" +
    "   • All prices are in US DOLLARS (USD).\n" +
    "   • The site gets today's USD → LKR rate automatically and shows LKR.\n" +
    "   • If the live rate can't be loaded, \"fallbackRate\" is used.\n" +
    "   ========================================================================== */\n\n";
  const SERVICES_HEAD = "/* ==========================================================================\n" +
    "   HEXORA — SERVICES  (each service gets its own page: service.html?s=<slug>)\n" +
    "   Saved from the admin panel (admin.html). You can still edit it by hand.\n" +
    "   --------------------------------------------------------------------------\n" +
    "   • \"prices\" points to items in config.js: { type }, { creative }, { feature },\n" +
    "     { extra }, { maint } or { design }. featured: true highlights one card.\n" +
    "   • Text can use {support}, {advance}, {urgent} or a price like {creative:photo}.\n" +
    "   • anim = phone, browser, dashboard, backend, chat, server, logo, social, photo,\n" +
    "     timeline or uiux. video = \"assets/video/file.mp4\" shows a video instead.\n" +
    "   ========================================================================== */\n\n";
  const PIN_HEAD = "/* HEXORA — admin panel lock (admin.html).\n" +
    "   Only a PBKDF2-SHA256 hash of the PIN is stored here, never the PIN itself.\n" +
    "   Change the PIN from the admin panel: Security tab. */\n";
  const fileText = {
    config: o => CONFIG_HEAD + "window.HEXORA = " + JSON.stringify(o, null, 2) + ";\n",
    services: o => SERVICES_HEAD + "window.HX_SERVICES = " + JSON.stringify(o, null, 2) + ";\n",
    pin: o => PIN_HEAD + "window.HX_ADMIN = " + JSON.stringify(o, null, 2) + ";\n"
  };
  const dirty = k => S.saved[k] != null && JSON.stringify(S.data[k]) !== S.saved[k];
  const anyDirty = () => dirty("config") || dirty("services");

  /* ---------- small helpers ---------- */
  const icon = (inner, cls) => '<svg class="' + (cls || "ad-ico") + '" viewBox="0 0 24 24" aria-hidden="true">' + inner + "</svg>";
  const I = {
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    del: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', back: '<path d="M14 6l-6 6 6 6"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>', plus: '<path d="M12 5v14M5 12h14"/>'
  };
  const lkr = usd => P.formatLKR(P.smartRound((Number(usd) || 0) * (Number(S.data.config.fallbackRate) || 0), S.data.config));
  const fmtDate = iso => { const d = new Date(iso); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); };
  function get(path) { return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), S.data); }
  function set(path, val) {
    const ks = path.split("."), last = ks.pop();
    ks.reduce((o, k) => o[k], S.data)[last] = val;
  }
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
    if (e.status === 401) return "GitHub token එක වැරදියි හරි expire වෙලා.";
    if (e.status === 403) return "GitHub token එකට මේ repo එක වෙනස් කරන්න permission නෑ (Contents: Read and write).";
    if (e.status === 404) return "Repo එක හරි file එක හම්බුනේ නෑ. Token එකට " + A.repo.name + " repo එකට access දීලා තියෙනවද බලන්න.";
    if (e.status === 409 || e.status === 422) return "GitHub එකේ file එක මේ අතරේ වෙනස් වෙලා. Reload කරලා ආයෙත් try කරන්න.";
    return (e.detail || e.message || "Error") + "";
  }

  /* ==================== 1. PIN screen ==================== */
  function lockScreen(msg) {
    S.token = ""; S.pin = "";
    if (!window.crypto || !crypto.subtle) {
      root.innerHTML = gate('<h1>Admin</h1><p class="ad-gate-msg">මේ page එක https:// හරි localhost හරහා open කරන්න. (Browser එකේ secure crypto නෑ.)</p>');
      return;
    }
    root.innerHTML = gate(
      '<span class="logo-part lp-mark ad-gate-mark" aria-hidden="true"></span>' +
      "<h1>Admin</h1><p class=\"muted\">PIN එක ගහන්න</p>" +
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
      const ok = (await pinHash(entry, A.pin.salt, A.pin.iterations)) === A.pin.hash;
      busy = false;
      if (ok) { store.del(KEYS.tries); S.pin = entry; afterPin(); return; }
      tries.n += 1;
      if (tries.n >= MAX_TRIES) { tries.n = 0; tries.until = Date.now() + LOCK_MS; }
      store.set(KEYS.tries, tries);
      msgEl.textContent = tries.until > Date.now() ? "වැරදි PIN " + MAX_TRIES + "ක්. තත්පර " + LOCK_MS / 1000 + "ක් ඉන්න." : "PIN එක වැරදියි. (" + (MAX_TRIES - tries.n) + " පාරක් ඉතුරුයි)";
      $("#pin-dots").classList.remove("shake"); void $("#pin-dots").offsetWidth; $("#pin-dots").classList.add("shake");
      entry = ""; input.value = ""; paint();
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
  const gate = inner => '<section class="ad-gate"><div class="ad-gate-card">' + inner + "</div></section>";

  async function afterPin() {
    const box = store.get(KEYS.token);
    if (!box) return connectScreen();
    try { S.token = await openToken(box, S.pin); loadAll(); }
    catch (e) { connectScreen("මේ device එකේ තියෙන token එක දැන් තියෙන PIN එකෙන් අරින්න බෑ (PIN එක මාරු කරලා වගේ). Token එක ආයෙත් දාන්න."); }
  }

  /* ==================== 2. connect GitHub (once per device) ==================== */
  function connectScreen(msg) {
    root.innerHTML = gate(
      "<h1>GitHub connect කරන්න</h1>" +
      '<p class="muted">Admin panel එකෙන් කරන වෙනස් GitHub එකේ <b>' + esc(A.repo.owner + "/" + A.repo.name) + "</b> repo එකට save වෙනවා. ඒකට මේ device එකේ එක පාරක් GitHub token එකක් දාන්න ඕන.</p>" +
      '<ol class="ad-steps">' +
        '<li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com → Fine-grained token</a> එකක් හදන්න.</li>' +
        "<li>Repository access: <b>Only select repositories</b> → <b>" + esc(A.repo.name) + "</b></li>" +
        "<li>Permissions → Repository → <b>Contents: Read and write</b></li>" +
        "<li>Generate කරලා token එක copy කරලා පහළ දාන්න.</li>" +
      "</ol>" +
      '<form id="connect-form" class="ad-connect"><label for="tok">GitHub token</label>' +
      '<input class="input" id="tok" type="password" autocomplete="off" placeholder="github_pat_…" required>' +
      '<p class="ad-hint">Token එක save වෙන්නේ මේ device එකේ විතරයි, PIN එකෙන් encrypt කරලා. ඒක යවන්නේ api.github.com එකට විතරයි.</p>' +
      '<p class="ad-gate-msg" id="connect-msg" role="alert">' + esc(msg || "") + "</p>" +
      '<button class="btn btn-primary btn-block" type="submit">Connect කරන්න</button></form>' +
      '<button class="ad-back" type="button" id="relock">' + icon(I.lock) + " Lock කරන්න</button>");
    $("#relock").addEventListener("click", () => lockScreen());
    $("#connect-form").addEventListener("submit", async e => {
      e.preventDefault();
      const tok = $("#tok").value.trim(), m = $("#connect-msg"), btn = e.target.querySelector("button[type=submit]");
      if (!tok) return;
      btn.disabled = true; m.textContent = "Check කරනවා…";
      S.token = tok;
      try {
        const repo = await gh(repoPath());
        if (!repo.permissions || !repo.permissions.push) { const er = new Error("no push"); er.status = 403; throw er; }
        store.set(KEYS.token, await sealToken(tok, S.pin));
        loadAll(repo);
      } catch (err) { S.token = ""; m.textContent = errText(err); btn.disabled = false; }
    });
    $("#tok").focus();
  }

  /* ==================== 3. load data from the repo ==================== */
  async function loadAll(repo) {
    root.innerHTML = gate('<p class="muted">GitHub එකෙන් data ගන්නවා…</p>');
    try {
      repo = repo || await gh(repoPath());
      S.defaultBranch = repo.default_branch;
      S.branch = store.get(KEYS.branch) || repo.default_branch;
      const [c, s, p] = await Promise.all([readFile(PATHS.config), readFile(PATHS.services), readFile(PATHS.pin).catch(() => null)]);
      S.data.config = evalData(c.text, "HEXORA"); S.files.config = c.sha;
      S.data.services = evalData(s.text, "HX_SERVICES"); S.files.services = s.sha;
      S.data.pin = p ? evalData(p.text, "HX_ADMIN") : clone(A); S.files.pin = p ? p.sha : null;
      if (!S.data.config.notice) S.data.config.notice = { show: false, text: "", linkText: "", link: "" };
      S.saved = { config: JSON.stringify(S.data.config), services: JSON.stringify(S.data.services) };
      S.svc = Math.min(S.svc, S.data.services.list.length - 1);
      panel();
    } catch (e) {
      if (e.status === 401) { store.del(KEYS.token); return connectScreen(errText(e)); }
      root.innerHTML = gate("<h1>Data ගන්න බැරි උනා</h1>" +
        '<p class="ad-gate-msg">' + esc(errText(e)) + "</p>" +
        '<p class="muted">Branch: <b>' + esc(S.branch) + "</b>. Site එකේ අලුත් version එක (services.js එක්ක) තියෙන්නේ වෙන branch එකක නම්, ඒක තෝරන්න.</p>" +
        '<div class="ad-connect"><select class="input" id="br-pick"><option>' + esc(S.branch) + "</option></select>" +
        '<button class="btn btn-primary" type="button" id="br-go">ඒ branch එකෙන් ගන්න</button>' +
        '<button class="btn" type="button" id="retry">ආයෙත් try කරන්න</button></div>' +
        '<button class="ad-back" type="button" id="relock">' + icon(I.lock) + " Lock කරන්න</button>");
      $("#retry").addEventListener("click", () => loadAll());
      $("#relock").addEventListener("click", () => lockScreen());
      $("#br-go").addEventListener("click", () => { store.set(KEYS.branch, $("#br-pick").value); loadAll(); });
      gh(repoPath() + "/branches?per_page=100").then(bs => {
        $("#br-pick").innerHTML = bs.map(b => '<option' + (b.name === S.branch ? " selected" : "") + ">" + esc(b.name) + "</option>").join("");
      }).catch(() => { /* keep the single option */ });
    }
  }

  /* ==================== 4. the panel ==================== */
  const TABS = [["home", "Dashboard"], ["notice", "Notice"], ["contact", "Contact"], ["prices", "Prices"], ["services", "Services"], ["history", "History"], ["security", "Security"]];
  function panel() {
    root.innerHTML =
      '<div class="ad-shell">' +
        '<header class="ad-top"><a class="ad-brand" href="index.html" target="_blank" rel="noopener"><span class="logo-part lp-mark ad-brand-mark" aria-hidden="true"></span><b>Admin</b></a>' +
          '<span class="ad-pill" title="Save වෙන තැන">' + esc(A.repo.name) + " · " + esc(S.branch) + "</span>" +
          '<span class="ad-top-end"><a class="btn ad-small" href="index.html" target="_blank" rel="noopener">Site එක ' + icon(I.ext) + "</a>" +
          '<button class="btn ad-small" type="button" data-act="lock">' + icon(I.lock) + " Lock</button></span></header>" +
        '<nav class="ad-tabs" role="tablist" aria-label="Admin sections">' + TABS.map(([k, t]) =>
          '<button type="button" role="tab" data-act="tab" data-tab="' + k + '" aria-selected="' + (k === S.tab) + '">' + t + "</button>").join("") + "</nav>" +
        '<section class="ad-main" id="ad-main"></section>' +
        '<div class="ad-savebar" id="ad-savebar" hidden><div class="ad-save-info" id="ad-save-info"></div>' +
          '<input class="input" id="commit-msg" type="text" maxlength="72" placeholder="මොකද වෙනස් කළේ? (optional)">' +
          '<button class="btn" type="button" data-act="discard">Discard</button>' +
          '<button class="btn btn-primary" type="button" data-act="save" id="save-btn">Save to GitHub</button></div>' +
        '<div class="toast" id="ad-toast" role="status"></div>' +
      "</div>";
    renderTab();
    updateSaveBar();
  }
  function renderTab() {
    const main = $("#ad-main"); if (!main) return;
    const y = window.scrollY;
    main.innerHTML = VIEWS[S.tab]();
    $$(".ad-tabs [data-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === S.tab)));
    if (S.tab === "history") loadHistory();
    if (S.tab === "security") loadBranches();
    window.scrollTo(0, y);
    refreshLive();
  }

  /* ---------- form builders ---------- */
  function field(path, label, o) {
    o = o || {};
    const v = get(path), id = "f-" + path.replace(/[^\w]/g, "-"), t = o.type || "text";
    const attrs = ' id="' + id + '" data-path="' + path + '"' + (o.rerender ? " data-rerender" : "");
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
      (o.lkr ? '<small class="ad-lkr" data-lkr="' + path + '"></small>' : "") + (o.hint ? '<small class="ad-hint">' + esc(o.hint) + "</small>" : "") + "</div>";
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
    return card("Hexora admin",
      '<div class="ad-stats">' + stat(s.list.length, "Services", "services") + stat(count, "Price items", "prices") +
        stat(c.notice && c.notice.show ? "On" : "Off", "Notice bar", "notice") + stat(esc(c.phoneDisplay || "—"), "WhatsApp", "contact") + "</div>" +
      '<p class="ad-note">Save කළාම GitHub එකේ <b>' + esc(S.branch) + "</b> branch එකට commit එකක් යනවා. Site එක host කරලා තියෙන තැන (GitHub Pages / Netlify) ඒ branch එකෙන් auto update වෙනවා, ඒකට විනාඩියක් දෙකක් යයි.</p>",
      "GitHub එකට connect වෙලා: " + esc(A.repo.owner + "/" + A.repo.name)) +
    card("Project requests", '<p class="ad-note">Customersලා form එකෙන් එවන requests දැනට එන්නේ WhatsApp / Email වලට. ඒවා මෙතන list එකක් විදියට බලන්න database එකක් (Firebase හරි Google Sheets) ඕන.</p>');
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
    { key: "types", title: "Project types", note: "Small project එකක patan ganne price එක (USD).", fixed: true,
      fields: [["label", "Name"], ["note", "Note"], ["usd", "USD", "num", 1], ["weeks", "Weeks", "num"], ["kind", "Kind", "kind"], ["includesAdmin", "Admin panel include", "bool"]] },
    { key: "sizes", title: "Size", note: "Small = ×1. Medium / Large price එකයි කාලයයි ගුණ වෙනවා.", fixed: true,
      fields: [["label", "Name"], ["note", "Note"], ["priceX", "Price ×", "num"], ["weeksX", "Time ×", "num"], ["maintenanceUsd", "Maintenance USD / මාසයට", "num", 1]] },
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
    return g.fields.map(([f, label, type, money]) => {
      const p = base + "." + f;
      if (type === "kind") return field(p, label, { type: "select", options: [["web", "Web"], ["app", "App"], ["both", "App + Web"]] });
      if (type === "bool") return field(p, label, { type: "bool" });
      if (type === "for") {
        const cur = get(p) || [];
        return '<div class="ad-field"><span class="ad-label">' + label + '</span><div class="ad-flags">' + [["app", "App"], ["web", "Web"], ["both", "Both"]].map(([k, t]) =>
          '<label class="ad-check"><input type="checkbox" data-path="' + p + '" data-type="flag" data-flag="' + k + '"' + (cur.indexOf(k) !== -1 ? " checked" : "") + "><span>" + t + "</span></label>").join("") + "</div></div>";
      }
      return field(p, label, { type: type === "num" ? "num" : "text", lkr: !!money });
    }).join("");
  }
  VIEWS.prices = () => {
    const c = S.data.config;
    return card("General", grid(
        field("config.fallbackRate", "Fallback rate (LKR for 1 USD)", { type: "num", hint: "Live rate එක load නොවුණොත් use කරනවා." }) +
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
  const POOLS = { type: "types", creative: "creative", feature: "features", extra: "extras", maint: "sizes", design: "design" };
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
        [["type", "Project type"], ["creative", "Design & Video item"], ["feature", "Feature"], ["extra", "Launch extra"], ["maint", "Maintenance"], ["design", "Design"]].map(([k, t]) =>
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
        '<svg class="ad-ico" viewBox="0 0 24 24" aria-hidden="true">' + (x.icon || "") + "</svg><span data-live=\"services.list." + j + '.name">' + esc(x.name || "(නමක් නෑ)") + "</span></button>").join("")).join("") +
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
    '<div id="history-list" class="ad-history"><p class="muted">GitHub එකෙන් ගන්නවා…</p></div>',
    "config.js / services.js වල අන්තිම වෙනස් 10. වැරදීමක් උනොත් කලින් version එකකට ආපහු යන්න පුළුවන්.");
  async function loadHistory() {
    const box = $("#history-list"); if (!box) return;
    try {
      const lists = await Promise.all([PATHS.config, PATHS.services].map(p =>
        gh(repoPath() + "/commits?path=" + encodeURIComponent(p) + "&sha=" + encodeURIComponent(S.branch) + "&per_page=10")
          .then(cs => cs.map((c, idx) => ({ path: p, sha: c.sha, current: idx === 0, msg: (c.commit.message || "").split("\n")[0], date: c.commit.author.date, who: c.commit.author.name, url: c.html_url })))));
      const all = lists[0].concat(lists[1]).sort((a, b) => b.date.localeCompare(a.date));
      if (!$("#history-list")) return;
      box.innerHTML = all.length ? all.map(c =>
        '<div class="ad-hist"><div><b>' + esc(c.msg) + '</b><small>' + esc(fmtDate(c.date)) + " · " + esc(c.who) + ' · <code>' + esc(c.path.split("/").pop()) + "</code></small></div>" +
        '<div class="ad-hist-actions"><a class="btn ad-small" href="' + esc(c.url) + '" target="_blank" rel="noopener">GitHub ' + icon(I.ext) + "</a>" +
        (c.current ? '<span class="ad-pill ok">දැන් තියෙන්නේ</span>' : '<button type="button" class="btn ad-small" data-act="restore" data-path="' + esc(c.path) + '" data-sha="' + esc(c.sha) + '">මේකට ආපහු යන්න</button>') +
        "</div></div>").join("") : '<p class="muted">Commits නෑ.</p>';
    } catch (e) { box.innerHTML = '<p class="ad-gate-msg">' + esc(errText(e)) + "</p>"; }
  }

  VIEWS.security = () => {
    const box = store.get(KEYS.token);
    return card("PIN එක මාරු කරන්න",
      '<form id="pin-form" class="ad-grid">' +
        '<div class="ad-field"><label for="pin-new">අලුත් PIN (digits 6)</label><input class="input" id="pin-new" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>' +
        '<div class="ad-field"><label for="pin-new2">ආයෙත් ගහන්න</label><input class="input" id="pin-new2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>' +
        '<div class="ad-field wide"><button class="btn btn-primary" type="submit">PIN එක save කරන්න</button></div></form>',
      "අලුත් PIN එකේ hash එක admin-pin.js එකට save වෙනවා. Site එක update උනාට පස්සේ අලුත් PIN එක වැඩ කරයි. අනිත් devices වල token එක ආයෙත් දාන්න වෙනවා.") +
    card("Branch",
      '<div class="ad-add"><select class="input" id="branch-pick"><option>' + esc(S.branch) + '</option></select><button type="button" class="btn ad-small" data-act="set-branch">මේ branch එක use කරන්න</button></div>',
      "Save වෙන්නේ මේ branch එකට. Repo එකේ default branch එක: <b>" + esc(S.defaultBranch) + "</b>. Site එක host කරලා තියෙන්නේ මේ branch එකෙන්ද කියලා බලන්න.") +
    card("GitHub connection",
      '<p class="ad-note">Token එක මේ device එකේ encrypt කරලා තියෙනවා' + (box && box.at ? " (" + esc(fmtDate(box.at)) + " ඉඳන්)" : "") + ". Device එක වෙන කෙනෙක්ට දෙනවා නම් disconnect කරන්න.</p>" +
      '<button type="button" class="btn ad-small" data-act="disconnect">Disconnect කරන්න</button>',
      "විනාඩි 30ක් use නොකළොත් admin panel එක auto-lock වෙනවා (save නොකරපු වෙනස් නැත්නම්).");
  };
  async function loadBranches() {
    try {
      const bs = await gh(repoPath() + "/branches?per_page=100");
      const sel = $("#branch-pick"); if (!sel) return;
      sel.innerHTML = bs.map(b => '<option' + (b.name === S.branch ? " selected" : "") + ">" + esc(b.name) + "</option>").join("");
    } catch (e) { /* keep current */ }
  }

  /* ---------- live bits (LKR previews, names, icon) ---------- */
  function refreshLive() {
    $$("[data-lkr]").forEach(el => { el.textContent = "≈ " + lkr(get(el.dataset.lkr)); });
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
    $("#ad-save-info").innerHTML = "<b>Save නොකරපු වෙනස්:</b> " + files.map(f => "<code>" + f + ".js</code>").join(", ") +
      (errs.length ? '<span class="ad-bad">' + esc(errs[0]) + (errs.length > 1 ? " (+" + (errs.length - 1) + ")" : "") + "</span>" : "");
    $("#save-btn").disabled = !!errs.length;
  }
  async function saveAll(btn) {
    const errs = problems();
    if (errs.length) return toast(errs[0], true);
    const note = ($("#commit-msg").value || "").trim();
    const jobs = [["config", "update site settings"], ["services", "update services"]].filter(j => dirty(j[0]));
    btn.disabled = true; btn.textContent = "Save වෙනවා…";
    try {
      for (const [k, def] of jobs) {
        const r = await writeFile(PATHS[k], fileText[k](S.data[k]), S.files[k], "Admin: " + (note || def));
        S.files[k] = r.content.sha; S.saved[k] = JSON.stringify(S.data[k]);
      }
      $("#commit-msg").value = "";
      toast("GitHub එකට save උනා ✓ Site එක update වෙන්න විනාඩියක් දෙකක් යයි.");
    } catch (e) {
      toast("Save වුණේ නෑ: " + errText(e), true);
    }
    btn.textContent = "Save to GitHub";
    updateSaveBar();
  }

  /* ---------- events ---------- */
  root.addEventListener("input", e => {
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
  root.addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.refkind) {
      const old = get(t.dataset.refkind), k = t.value, pool = S.data.config[POOLS[k]] || {};
      const fresh = {}; fresh[k] = Object.keys(pool)[0]; if (old.featured) fresh.featured = true;
      set(t.dataset.refkind, fresh); renderTab(); updateSaveBar(); return;
    }
    if (t.dataset.refkey) { const r = get(t.dataset.refkey); r[refKind(r)] = t.value; updateSaveBar(); return; }
    if (t.closest("[data-rerender]") || (t.dataset.path && /\.(cat|anim)$/.test(t.dataset.path))) renderTab();
  });
  root.addEventListener("submit", async e => {
    if (e.target.id !== "pin-form") return;
    e.preventDefault();
    const a = $("#pin-new").value, b = $("#pin-new2").value, btn = e.target.querySelector("button");
    if (!/^\d{6}$/.test(a)) return toast("PIN එක digits 6ක් වෙන්න ඕන.", true);
    if (a !== b) return toast("PIN දෙක සමාන නෑ.", true);
    btn.disabled = true;
    try {
      const admin = clone(S.data.pin), salt = randHex(16);
      admin.pin = { salt: salt, iterations: PIN_ITER, hash: await pinHash(a, salt, PIN_ITER) };
      const r = await writeFile(PATHS.pin, fileText.pin(admin), S.files.pin, "Admin: change admin PIN");
      S.files.pin = r.content.sha; S.data.pin = admin; A.pin = admin.pin;
      store.set(KEYS.token, await sealToken(S.token, a)); S.pin = a;
      e.target.reset();
      toast("PIN එක මාරු උනා ✓ Site එක update උනාට පස්සේ අලුත් PIN එකෙන් log වෙන්න.");
    } catch (err) { toast("PIN එක save වුණේ නෑ: " + errText(err), true); }
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
        if (!armed(b, "ඇත්තටම? ආයෙත් ඔබන්න")) return;
        S.data.config = JSON.parse(S.saved.config); S.data.services = JSON.parse(S.saved.services);
        S.svc = Math.min(S.svc, S.data.services.list.length - 1); renderTab(); updateSaveBar(); break;
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
      case "arr-add": get(d.path) ? get(d.path).push(JSON.parse(d.tpl)) : set(d.path, [JSON.parse(d.tpl)]); renderTab(); updateSaveBar(); break;
      case "arr-del": if (!armed(b, "මකන්නද?")) return; get(d.path).splice(Number(d.i), 1); renderTab(); updateSaveBar(); break;
      case "arr-move": {
        const arr = get(d.path), i = Number(d.i), j = i + Number(d.dir);
        if (j < 0 || j >= arr.length) return;
        arr.splice(j, 0, arr.splice(i, 1)[0]); renderTab(); updateSaveBar(); break;
      }
      case "restore": {
        if (anyDirty()) return toast("මුලින් save නොකරපු වෙනස් save හරි discard හරි කරන්න.", true);
        if (!armed(b, "ඇත්තටම? ආයෙත් ඔබන්න")) return;
        b.disabled = true;
        try {
          const k = d.path === PATHS.config ? "config" : "services";
          const old = await readFile(d.path, d.sha);
          await writeFile(d.path, old.text, S.files[k], "Admin: restore " + d.path.split("/").pop() + " to " + d.sha.slice(0, 7));
          toast("කලින් version එකට ආපහු ගියා ✓");
          loadAll();
        } catch (err) { toast(errText(err), true); b.disabled = false; }
        break;
      }
      case "set-branch": {
        const v = $("#branch-pick").value;
        if (anyDirty()) return toast("මුලින් save නොකරපු වෙනස් save හරි discard හරි කරන්න.", true);
        if (v === S.defaultBranch) store.del(KEYS.branch); else store.set(KEYS.branch, v);
        loadAll(); break;
      }
      case "disconnect":
        if (!armed(b, "ඇත්තටම? ආයෙත් ඔබන්න")) return;
        store.del(KEYS.token); store.del(KEYS.branch); S.token = ""; connectScreen(); break;
    }
  });

  // unsaved-changes guard + idle auto-lock
  window.addEventListener("beforeunload", e => { if (S.token && anyDirty()) { e.preventDefault(); e.returnValue = ""; } });
  ["pointerdown", "keydown"].forEach(ev => window.addEventListener(ev, () => { S.last = Date.now(); }, { passive: true }));
  setInterval(() => { if (S.token && !anyDirty() && Date.now() - S.last > IDLE_MS) lockScreen("විනාඩි 30ක් use නොකළ නිසා lock උනා."); }, 30000);

  lockScreen();
})();
