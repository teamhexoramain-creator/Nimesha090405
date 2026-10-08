/* HEXORA — live chat for visitors, behind the green chat button (and any [data-open-chat] button).
   A visitor who is not logged in gives a name and a phone number first, so the admin can tell who is writing,
   then chats (text, photos, voice) with the developer. The chat is guests/<id> in Firestore; <id> is a long random
   key kept in this browser (localStorage), so closing the page and coming back continues the same chat.
   A logged-in customer skips the form: their account name and phone number are used. Same chat box as the project
   chat (chat.js). If Firebase is not set up, the green button simply opens WhatsApp as before. */
(function () {
  "use strict";
  const FB = window.HXFB, HC = window.HXChat, C = window.HEXORA || {};
  const btn = document.querySelector(".wa-float");
  if (!btn || !FB || !FB.ready || !HC) return;

  const KEY = "hx_guest_v1", SEEN = "hx_guest_seen_v1", ONLINE_MS = 75000;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ms = iso => { const t = Date.parse(iso); return isNaN(t) ? 0 : t; };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  };
  const A = HC.api(FB.fs, FB.db, "guest");
  const wa = "https://wa.me/" + String(C.whatsapp || "").replace(/\D/g, "") + "?text=" + encodeURIComponent("Hi Hexora! මට project එකක් ගැන කතා කරන්න ඕන.");
  let guest = store.get(KEY);   // { id, name, phone }
  let panel = null, ctl = null, isOpen = false, dot = null;

  const device = () => {
    const u = navigator.userAgent;
    const os = /iPhone|iPad|iPod/.test(u) ? "iPhone" : /Android/.test(u) ? "Android" : /Windows/.test(u) ? "Windows" : /Mac OS/.test(u) ? "Mac" : /Linux/.test(u) ? "Linux" : "";
    const br = /Edg\//.test(u) ? "Edge" : /OPR\//.test(u) ? "Opera" : /Firefox\//.test(u) ? "Firefox" : /Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : "";
    return [os, br].filter(Boolean).join(" · ");
  };
  const pageName = () => ((location.pathname.split("/").pop() || "index.html") + location.search).slice(0, 150);

  /* ---------- unread dot on the green button ---------- */
  function ensureDot() {
    if (dot) return dot;
    dot = document.createElement("i"); dot.className = "lc-dot"; dot.hidden = true; dot.textContent = "1";
    btn.appendChild(dot);
    return dot;
  }
  const seenAt = () => (store.get(SEEN) || {})[guest && guest.id] || 0;
  function markSeen(iso) { if (!guest) return; const m = store.get(SEEN) || {}; m[guest.id] = Math.max(m[guest.id] || 0, ms(iso)); store.set(SEEN, m); ensureDot().hidden = true; }
  async function checkUnread() {
    if (!guest || isOpen || document.visibilityState !== "visible") return;
    try {
      const p = await A.peek(guest.id);
      ensureDot().hidden = !(p.chat && p.chat.lastFrom === "a" && ms(p.chat.lastAt) > seenAt());
    } catch (e) { /* not now */ }
  }

  /* ---------- the panel ---------- */
  function build() {
    panel = document.createElement("div");
    panel.className = "lc"; panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Hexora chat");
    panel.innerHTML =
      '<header class="lc-head"><div><b>Hexora</b><small>Live chat · Developer කෙනෙක් එක්ක කතා කරන්න</small></div><button type="button" class="lc-x" aria-label="Chat එක වහන්න">×</button></header>' +
      '<div class="lc-body"></div>' +
      '<footer class="lc-foot"><a href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp එකෙනුත් කතා කරන්න ↗</a></footer>';
    document.body.appendChild(panel);
    panel.querySelector(".lc-x").addEventListener("click", close);
    panel.addEventListener("submit", e => { if (e.target.id === "lc-form") { e.preventDefault(); begin(e.target); } });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen && !document.querySelector(".chat-lightbox")) close(); });
  }
  const body = () => panel.querySelector(".lc-body");

  async function presenceLine() {   // "Online" / "Offline" for the form step
    try {
      const rows = await FB.fs("POST", ":batchGet", { documents: [FB.db + "/documents/site/presence"] });
      const r = (rows || [])[0] || {}, at = r.found && r.found.fields && r.found.fields.adminOnlineAt && r.found.fields.adminOnlineAt.timestampValue;
      return { on: !!at && ms(r.readTime) - ms(at) < ONLINE_MS };
    } catch (e) { return { on: false }; }
  }

  function formHtml() {
    return '<form id="lc-form" class="lc-form" novalidate>' +
      '<p class="lc-status" id="lc-pres"><i></i><em>…</em></p>' +
      '<p class="lc-hint">ඔයා කවුද කියලා Developer ට දැනගන්න පුළුවන් වෙන්න නමයි phone number එකයි ඕන. Login වෙන්න ඕන නෑ.</p>' +
      '<div class="field"><label for="lc-name">ඔයාගේ නම</label><input class="input" id="lc-name" type="text" autocomplete="name" maxlength="100" placeholder="Ex: Kasun Perera"></div>' +
      '<div class="field"><label for="lc-phone">Phone number <span class="hint">(WhatsApp)</span></label><input class="input" id="lc-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="07X XXX XXXX"></div>' +
      '<div class="field"><label for="lc-msg">මොකක්ද දැනගන්න ඕන? <span class="hint">(optional)</span></label><textarea class="input" id="lc-msg" rows="2" maxlength="1000" placeholder="Ex: Mobile app එකක් හදන්න කොච්චර යයිද?"></textarea></div>' +
      '<p class="lc-err" id="lc-err" role="alert"></p>' +
      '<button class="btn btn-primary btn-block" type="submit">Chat පටන් ගන්න</button>' +
      '<p class="lc-fine">Account එකක් තියෙනවද? <a href="account.html">Login</a> · <a href="account.html?new=1">Register</a></p></form>';
  }

  function showChat() {
    body().innerHTML = "";
    const box = document.createElement("div"); body().appendChild(box);
    ctl = HC.mount(box, {
      me: "c", peer: "Hexora Developer",
      load: after => A.load(guest.id, after), send: m => A.send(guest.id, null, "c", m),
      peek: () => A.peek(guest.id), touch: seen => A.touch(guest.id, null, "c", seen),
      onSeen: last => markSeen(last), errText: FB.errText
    });
  }

  async function begin(form) {
    const err = form.querySelector("#lc-err"), go = form.querySelector("button[type=submit]");
    const name = form.querySelector("#lc-name").value.trim(), phone = FB.phoneId(form.querySelector("#lc-phone").value), first = form.querySelector("#lc-msg").value.trim();
    err.textContent = "";
    if (name.length < 2) return void (err.textContent = "ඔයාගේ නම ගහන්න.");
    if (!phone) return void (err.textContent = "Phone number එක හරියට ගහන්න (Ex: 077 123 4567).");
    go.disabled = true;
    try {
      await create(name, phone);
      showChat();
      if (first) await A.send(guest.id, null, "c", { kind: "text", text: first });
    } catch (e) { go.disabled = false; err.textContent = FB.errText(e); }
  }
  async function create(name, phone) {
    const id = FB.newId() + FB.newId(), me = FB.user();
    const data = { gid: id, name: name, phone: phone, page: pageName(), device: device(), lastFrom: "c", lastText: "(chat පටන් ගත්තා)" };
    if (me) data.uid = me.uid;
    await FB.create("guests", id, data, ["createdAt", "lastAt"]);
    guest = { id: id, name: name, phone: phone };
    store.set(KEY, guest);
    startPolling();
  }
  let polling = false;
  function startPolling() { if (polling) return; polling = true; ensureDot(); setInterval(checkUnread, 45000); }

  async function open() {
    if (!panel) build();
    isOpen = true; panel.hidden = false; btn.setAttribute("aria-expanded", "true"); btn.classList.add("lc-open");
    if (dot) dot.hidden = true;
    if (guest) { showChat(); return; }
    const me = FB.user();
    if (me) {   // a logged-in customer: no form, the account says who they are
      body().innerHTML = '<p class="lc-hint">Chat එක පටන් ගන්නවා…</p>';
      try { await create(me.name || "Customer", me.phone); showChat(); return; }
      catch (e) { /* fall through to the form */ }
    }
    body().innerHTML = formHtml();
    const f = body().querySelector("#lc-form");
    if (me) { f.querySelector("#lc-name").value = me.name || ""; f.querySelector("#lc-phone").value = FB.phoneLabel(me.phone); }
    presenceLine().then(p => { const el = body().querySelector("#lc-pres"); if (el) { el.classList.toggle("online", p.on); el.querySelector("em").textContent = p.on ? "Developer Online" : "Developer දැන් Online නෑ, message එකක් දාන්න. ඉක්මනට reply කරනවා"; } });
    setTimeout(() => { const n = f.querySelector("#lc-name"); if (n) n.focus({ preventScroll: true }); }, 50);
  }
  function close() {
    isOpen = false; if (panel) panel.hidden = true;
    if (ctl) { ctl.destroy(); ctl = null; }
    btn.setAttribute("aria-expanded", "false"); btn.classList.remove("lc-open"); btn.focus({ preventScroll: true });
  }

  btn.setAttribute("aria-label", "Hexora එක්ක chat කරන්න"); btn.setAttribute("aria-haspopup", "dialog"); btn.setAttribute("aria-expanded", "false");
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-open-chat], .wa-float");
    if (!t) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;   // "open in a new tab" still goes to WhatsApp
    e.preventDefault();
    isOpen ? close() : open();
  });
  if (guest) { startPolling(); checkUnread(); }
})();
