/* HEXORA — Firebase helper for the customer pages (REST, no SDK).
   Customer accounts: phone number + a 6-digit PIN. Firebase Auth keeps each one as an
   email/password user c<phone>@<projectId>.firebaseapp.com (no email is ever sent to it).
   The login stays in this browser until the customer logs out. Used by account.js and planner.js. */
(function () {
  "use strict";
  const F = window.HX_FIREBASE || {};
  const KEY = "hx_customer_v1";
  const ready = !!(F.apiKey && F.projectId);
  const DB = "projects/" + F.projectId + "/databases/(default)";

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } }
  };

  // 0771234567 / +94 77 123 4567 / 771234567 → 94771234567 ("" if it is not a phone number)
  function phoneId(p) {
    let d = String(p || "").replace(/\D/g, "");
    if (/^00/.test(d)) d = d.slice(2);   // 0094 77 123 4567 → 94771234567
    if (/^0\d{9}$/.test(d)) d = "94" + d.slice(1);
    else if (/^7\d{8}$/.test(d)) d = "94" + d;
    return /^\d{10,15}$/.test(d) ? d : "";
  }
  // 94771234567 → 077 123 4567 (other countries: +<digits>)
  const phoneLabel = id => /^94\d{9}$/.test(id) ? "0" + id.slice(2, 4) + " " + id.slice(4, 7) + " " + id.slice(7) : "+" + id;
  const emailFor = id => "c" + id + "@" + F.projectId + ".firebaseapp.com";

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
  const post = body => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  /* ---------- customer login ---------- */
  let S = store.get(KEY);   // { uid, phone, name, id, refresh, exp }
  function keep(j, extra) {
    S = Object.assign({}, S, extra, {
      uid: j.localId || j.user_id || (S && S.uid), id: j.idToken || j.id_token, refresh: j.refreshToken || j.refresh_token,
      exp: Date.now() + (Number(j.expiresIn || j.expires_in) || 3600) * 1000
    });
    store.set(KEY, S);
    tell();
  }
  const tell = () => { try { window.dispatchEvent(new Event("hx:auth")); } catch (e) { /* old browser */ } };   // nav.js updates the header
  const auth = (path, body) => http("https://identitytoolkit.googleapis.com/v1/accounts:" + path + "?key=" + encodeURIComponent(F.apiKey), post(body));
  async function signUp(phone, pin, name) { keep(await auth("signUp", { email: emailFor(phone), password: pin, returnSecureToken: true }), { phone: phone, name: name }); }
  async function signIn(phone, pin) { S = null; keep(await auth("signInWithPassword", { email: emailFor(phone), password: pin, returnSecureToken: true }), { phone: phone }); }
  function signOut() { S = null; store.del(KEY); tell(); }
  async function token() {
    if (!S) { const er = new Error("signed out"); er.reason = "UNAUTHENTICATED"; throw er; }
    if (Date.now() > S.exp - 5 * 60000) {
      try {
        keep(await http("https://securetoken.googleapis.com/v1/token?key=" + encodeURIComponent(F.apiKey), {
          method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(S.refresh)
        }));
      } catch (e) { if (e.status === 400 || e.status === 401) signOut(); throw e; }   // account deleted or PIN changed elsewhere
    }
    return S.id;
  }
  async function changePin(pin) { keep(await auth("update", { idToken: await token(), password: pin, returnSecureToken: true })); }
  function setName(name) { if (S) { S.name = name; store.set(KEY, S); tell(); } }

  /* ---------- Firestore ---------- */
  async function fs(method, path, body, query) {
    const headers = {};
    if (S) headers.Authorization = "Bearer " + await token();
    if (body) headers["Content-Type"] = "application/json";
    return http("https://firestore.googleapis.com/v1/" + DB + "/documents" + path + "?key=" + encodeURIComponent(F.apiKey) + (query ? "&" + query : ""),
      { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  const val = v => typeof v === "number" ? { integerValue: String(Math.round(v)) } : typeof v === "boolean" ? { booleanValue: v } : { stringValue: String(v == null ? "" : v) };
  const toFields = o => { const f = {}; Object.keys(o).forEach(k => { f[k] = val(o[k]); }); return f; };
  const unval = v => !v ? null : "stringValue" in v ? v.stringValue : "timestampValue" in v ? v.timestampValue : "booleanValue" in v ? v.booleanValue :
    "integerValue" in v ? Number(v.integerValue) : "doubleValue" in v ? v.doubleValue : null;
  const fromDoc = d => { const o = { id: d.name.split("/").pop() }; Object.keys(d.fields || {}).forEach(k => { o[k] = unval(d.fields[k]); }); return o; };
  const mask = keys => keys.map(k => "updateMask.fieldPaths=" + encodeURIComponent(k)).join("&");
  // a new document; serverTime: field names set to the Firestore server's clock
  function create(coll, id, data, serverTime) {
    return fs("POST", ":commit", { writes: [{ update: { name: DB + "/documents/" + coll + "/" + id, fields: toFields(data) }, currentDocument: { exists: false },
      updateTransforms: (serverTime || []).map(f => ({ fieldPath: f, setToServerValue: "REQUEST_TIME" })) }] });
  }
  const patch = (path, data, keys, extra) => fs("PATCH", path, { fields: toFields(data) }, mask(keys || Object.keys(data)) + (extra ? "&" + extra : ""));
  async function get(path) { try { return fromDoc(await fs("GET", path)); } catch (e) { if (e.status === 404) return null; throw e; } }
  async function where(coll, field, value) {
    const rows = await fs("POST", ":runQuery", { structuredQuery: { from: [{ collectionId: coll }], where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: val(value) } } } });
    return (rows || []).filter(r => r.document).map(r => fromDoc(r.document));
  }
  function newId() {
    const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", r = new Uint8Array(20);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(r);
    else for (let i = 0; i < r.length; i++) r[i] = Math.floor(Math.random() * 256);
    return Array.from(r, n => abc[n % abc.length]).join("");
  }

  function errText(e) {
    const m = (e.msg || e.message || "") + " " + (e.reason || "");
    if (/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test(m)) return "Phone number එක හරි PIN එක හරි වැරදියි.";
    if (/EMAIL_EXISTS/.test(m)) return "මේ phone number එකට දැනටමත් account එකක් තියෙනවා. Login වෙන්න.";
    if (/TOO_MANY_ATTEMPTS/.test(m)) return "වැරදි PIN ගොඩක් ගැහුව නිසා ටික වෙලාවකට lock කරලා. පස්සේ try කරන්න.";
    if (/OPERATION_NOT_ALLOWED|ADMIN_ONLY_OPERATION/.test(m)) return "Account හදන එක දැනට off කරලා. WhatsApp එකෙන් අපිට කියන්න.";
    if (/USER_DISABLED/.test(m)) return "මේ account එක disable කරලා. WhatsApp එකෙන් අපිට කියන්න.";
    if (/WEAK_PASSWORD/.test(m)) return "PIN එක digits 6ක් වෙන්න ඕන.";
    if (/TOKEN_EXPIRED|INVALID_REFRESH_TOKEN|USER_NOT_FOUND|UNAUTHENTICATED|CREDENTIAL_TOO_OLD/.test(m)) return "Login එක පරණ වෙලා. ආයෙත් login වෙන්න.";
    if (/PERMISSION_DENIED/.test(m)) return "මේක බලන්න permission නෑ.";
    if (/NETWORK/.test(m)) return "Internet connection එක බලලා ආයෙත් try කරන්න.";
    return "මොකක් හරි වැරැද්දක් උනා. ආයෙත් try කරන්න.";
  }

  // project stages, in order (the admin panel sets one; pct = progress shown when no % is set)
  const stages = [
    { key: "new", label: "Pending · Under review", short: "Review", pct: 5 },
    { key: "contacted", label: "කතා කරලා plan කරනවා", short: "Plan", pct: 15 },
    { key: "design", label: "Design කරනවා", short: "Design", pct: 35 },
    { key: "building", label: "හදනවා", short: "හදනවා", pct: 60 },
    { key: "testing", label: "Check කරනවා", short: "Check", pct: 85 },
    { key: "done", label: "ඉවරයි", short: "ඉවරයි", pct: 100 }
  ];

  window.HXFB = {
    ready: ready, stages: stages, phoneId: phoneId, phoneLabel: phoneLabel,
    user: () => (S ? { uid: S.uid, phone: S.phone, name: S.name || "" } : null),
    signUp: signUp, signIn: signIn, signOut: signOut, changePin: changePin, setName: setName, token: token,
    fs: fs, db: DB, create: create, patch: patch, get: get, where: where, newId: newId, errText: errText
  };
})();
