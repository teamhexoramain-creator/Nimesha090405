/* HEXORA — project chat (used by account.js for customers and admin.js for the admin).
   Messages live in Firestore: requests/<project>/messages/<id>  { from: "c"|"a", kind: "text"|"image"|"audio", text, data, mime, dur, createdAt }
   and one summary doc per project in chats/<project>  { uid, lastAt, lastFrom, lastText }  (for the unread dots).
   Photos are shrunk in the browser and voice notes are limited to 90 s, then both are saved as base64 inside the
   message (Firebase Storage needs a paid plan). Firestore has no live feed over plain REST, so an open chat asks
   for new messages every few seconds. */
(function (root) {
  "use strict";
  const IMG = ["image/jpeg", "image/png", "image/webp"], AUD = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg"];
  const B64 = /^[A-Za-z0-9+/=]+$/;
  const MAX_IMG = 350000, MAX_AUD = 450000, MAX_SEC = 90, POLL = 6000;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const mmss = n => Math.floor(n / 60) + ":" + String(Math.floor(n % 60)).padStart(2, "0");

  /* ---------- Firestore side. fs(method, path, body) talks to .../documents, db = "projects/<id>/databases/(default)" ---------- */
  function api(fs, db) {
    const fromDoc = d => { const o = { id: d.name.split("/").pop() }; Object.keys(d.fields || {}).forEach(k => { const v = d.fields[k]; o[k] = v.stringValue != null ? v.stringValue : v.timestampValue != null ? v.timestampValue : v.integerValue != null ? Number(v.integerValue) : null; }); return o; };
    return {
      // after = createdAt of the newest message already shown. No `after`: the latest 30, oldest first.
      async load(rid, after) {
        const q = { from: [{ collectionId: "messages" }], orderBy: [{ field: { fieldPath: "createdAt" }, direction: after ? "ASCENDING" : "DESCENDING" }], limit: after ? 100 : 30 };
        if (after) q.where = { fieldFilter: { field: { fieldPath: "createdAt" }, op: "GREATER_THAN", value: { timestampValue: after } } };
        const rows = await fs("POST", "/requests/" + encodeURIComponent(rid) + ":runQuery", { structuredQuery: q });
        const out = (rows || []).filter(r => r.document).map(r => fromDoc(r.document));
        return after ? out : out.reverse();
      },
      // writes the message and the project's chat summary in one commit
      async send(rid, uid, from, m) {
        const f = { from: { stringValue: from }, kind: { stringValue: m.kind }, text: { stringValue: m.text || "" } };
        if (m.data) { f.data = { stringValue: m.data }; f.mime = { stringValue: m.mime }; }
        if (m.dur) f.dur = { integerValue: String(Math.round(m.dur)) };
        const last = m.kind === "image" ? "📷 Photo" : m.kind === "audio" ? "🎤 Voice message" : (m.text || "").slice(0, 100);
        const id = newId(), doc = db + "/documents/";
        await fs("POST", ":commit", { writes: [
          { update: { name: doc + "requests/" + rid + "/messages/" + id, fields: f }, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" }] },
          { update: { name: doc + "chats/" + rid, fields: { uid: { stringValue: uid }, lastFrom: { stringValue: from }, lastText: { stringValue: last } } }, updateTransforms: [{ fieldPath: "lastAt", setToServerValue: "REQUEST_TIME" }] }
        ] });
      }
    };
  }
  function newId() {
    const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", r = new Uint8Array(20);
    if (root.crypto && crypto.getRandomValues) crypto.getRandomValues(r); else for (let i = 0; i < r.length; i++) r[i] = Math.floor(Math.random() * 256);
    return Array.from(r, n => abc[n % abc.length]).join("");
  }

  /* ---------- photo: shrink to a small JPEG ---------- */
  async function shrink(file) {
    if (!/^image\//.test(file.type)) throw new Error("not-image");
    let src;
    try { src = await createImageBitmap(file); }
    catch (e) {
      src = await new Promise((ok, no) => { const im = new Image(), u = URL.createObjectURL(file); im.onload = () => { URL.revokeObjectURL(u); ok(im); }; im.onerror = () => no(new Error("bad-image")); im.src = u; });
    }
    let w = src.width, h = src.height, scale = Math.min(1, 1100 / Math.max(w, h));
    for (let round = 0; round < 5; round++) {
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(w * scale)); cv.height = Math.max(1, Math.round(h * scale));
      cv.getContext("2d").drawImage(src, 0, 0, cv.width, cv.height);
      for (const q of [0.72, 0.6, 0.48]) {
        const b64 = cv.toDataURL("image/jpeg", q).split(",")[1];
        if (b64 && b64.length <= MAX_IMG) return { kind: "image", mime: "image/jpeg", data: b64 };
      }
      scale *= 0.75;
    }
    throw new Error("too-big");
  }
  const toBase64 = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1] || ""); r.onerror = () => no(new Error("read")); r.readAsDataURL(blob); });

  /* ---------- the chat box ---------- */
  function mount(box, o) {
    const me = o.me, st = { last: "", ids: new Set(), loaded: false, loading: false, busy: false, rec: null };
    const recOk = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && root.MediaRecorder);
    box.classList.add("chat");
    box.innerHTML =
      '<div class="chat-log" role="log" aria-live="polite" tabindex="0"><p class="chat-empty">Messages ගන්නවා…</p></div>' +
      '<p class="chat-note" role="alert"></p>' +
      '<div class="chat-rec" hidden><i class="chat-dot"></i><span class="chat-time">0:00</span><button type="button" class="chat-x" data-c="rec-cancel">Cancel</button><button type="button" class="chat-ok" data-c="rec-send">Send</button></div>' +
      '<form class="chat-bar">' +
        '<button type="button" class="chat-ic" data-c="photo" aria-label="Photo එකක් යවන්න" title="Photo"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/></svg></button>' +
        '<input type="file" accept="image/*" hidden>' +
        '<textarea rows="1" maxlength="1000" placeholder="Message එකක් ලියන්න…" aria-label="Message"></textarea>' +
        (recOk ? '<button type="button" class="chat-ic" data-c="mic" aria-label="Voice message එකක් යවන්න" title="Voice"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>' : "") +
        '<button type="submit" class="chat-send">Send</button>' +
      "</form>";
    const $ = s => box.querySelector(s);
    const log = $(".chat-log"), note = $(".chat-note"), bar = $(".chat-bar"), ta = $("textarea"), file = $('input[type="file"]'), recBox = $(".chat-rec");
    const setNote = t => { note.textContent = t || ""; };
    const fmtTime = iso => { const d = new Date(iso); if (isNaN(d)) return ""; const t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); return d.toDateString() === new Date().toDateString() ? t : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " · " + t; };

    function bubble(m) {
      let body;
      if (m.kind === "image" && IMG.indexOf(m.mime) !== -1 && B64.test(m.data || "")) body = '<img class="chat-img" alt="Photo" src="data:' + m.mime + ";base64," + m.data + '">';
      else if (m.kind === "audio" && AUD.indexOf(m.mime) !== -1 && B64.test(m.data || "")) body = '<audio controls preload="metadata" src="data:' + m.mime + ";base64," + m.data + '"></audio>' + (m.dur ? '<small class="chat-dur">' + mmss(m.dur) + "</small>" : "");
      else if (m.kind === "text") body = "<p>" + esc(m.text) + "</p>";
      else body = '<p class="chat-bad">(මේ message එක පෙන්නන්න බෑ)</p>';
      return '<div class="chat-m ' + (m.from === me ? "me" : "them") + '">' + body + "<time>" + esc(fmtTime(m.createdAt)) + "</time></div>";
    }

    async function refresh() {
      if (!box.isConnected) return destroy();
      if (st.loading) return;
      st.loading = true;
      try {
        const rows = await o.load(st.last);
        const fresh = rows.filter(m => !st.ids.has(m.id));
        const first = !st.loaded;
        if (first) log.innerHTML = "";
        if (fresh.length) {
          const nearEnd = first || log.scrollHeight - log.scrollTop - log.clientHeight < 90;
          const emp = log.querySelector(".chat-empty"); if (emp) emp.remove();
          fresh.forEach(m => { st.ids.add(m.id); log.insertAdjacentHTML("beforeend", bubble(m)); st.last = m.createdAt; });
          if (nearEnd) log.scrollTop = log.scrollHeight;
          if (o.onSeen) o.onSeen(st.last, fresh.some(m => m.from !== me));
        } else if (first) log.innerHTML = '<p class="chat-empty">තාම messages නෑ. පළවෙනි message එක ඔයා යවන්න.</p>';
        st.loaded = true; setNote("");
      } catch (e) { setNote(o.errText ? o.errText(e) : "Messages ගන්න බෑ."); }
      st.loading = false;
    }

    async function send(m) {
      if (st.busy) return;
      st.busy = true; bar.classList.add("busy"); setNote("");
      try { await o.send(m); await refresh(); return true; }
      catch (e) { setNote(o.errText ? o.errText(e) : "යවන්න බැරි උනා."); return false; }
      finally { st.busy = false; bar.classList.remove("busy"); }
    }

    /* text */
    ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; });
    ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !root.matchMedia("(pointer: coarse)").matches) { e.preventDefault(); bar.requestSubmit(); } });
    bar.addEventListener("submit", async e => {
      e.preventDefault();
      const text = ta.value.trim(); if (!text) return;
      if (await send({ kind: "text", text: text })) { ta.value = ""; ta.style.height = "auto"; }
    });

    /* photo */
    $('[data-c="photo"]').addEventListener("click", () => file.click());
    file.addEventListener("change", async () => {
      const f = file.files && file.files[0]; file.value = "";
      if (!f) return;
      setNote("Photo එක සූදානම් කරනවා…");
      try { await send(await shrink(f)); }
      catch (e) { setNote(e.message === "too-big" ? "Photo එක ලොකු වැඩියි. පොඩි එකක් try කරන්න." : "මේ photo එක කියවන්න බෑ (JPG / PNG / WebP වලින් try කරන්න)."); }
    });

    /* voice */
    const mic = $('[data-c="mic"]');
    function stopTracks() { if (st.rec && st.rec.stream) st.rec.stream.getTracks().forEach(t => t.stop()); }
    function recUi(on) { recBox.hidden = !on; bar.hidden = on; }
    async function startRec() {
      if (st.rec) return;
      setNote("");
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) { return setNote("Microphone එක use කරන්න permission දෙන්න ඕන."); }
      const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
      const type = types.find(t => root.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || "";
      let mr;
      try { mr = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 }); }
      catch (e) { stream.getTracks().forEach(t => t.stop()); return setNote("මේ browser එකේ voice record කරන්න බෑ."); }
      const rec = st.rec = { mr: mr, stream: stream, chunks: [], t0: Date.now(), send: false, mime: (mr.mimeType || type || "audio/webm").split(";")[0] };
      mr.ondataavailable = e => { if (e.data && e.data.size) rec.chunks.push(e.data); };
      mr.onstop = async () => {
        stopTracks(); clearInterval(rec.tick); st.rec = null; recUi(false);
        if (!rec.send) return;
        const blob = new Blob(rec.chunks, { type: rec.mime }), dur = Math.min(MAX_SEC, (Date.now() - rec.t0) / 1000);
        if (AUD.indexOf(rec.mime) === -1) return setNote("මේ browser එකේ voice format එක support නෑ.");
        const data = await toBase64(blob).catch(() => "");
        if (!data) return setNote("Voice message එක කියවන්න බැරි උනා.");
        if (data.length > MAX_AUD) return setNote("Voice message එක දිග වැඩියි. තත්පර 90 ට අඩුවෙන් try කරන්න.");
        send({ kind: "audio", mime: rec.mime, data: data, dur: dur });
      };
      recUi(true);
      const tm = $(".chat-time");
      tm.textContent = "0:00";
      rec.tick = setInterval(() => { const s = (Date.now() - rec.t0) / 1000; tm.textContent = mmss(s); if (s >= MAX_SEC) finish(true); }, 250);
      mr.start();
    }
    function finish(sendIt) { const r = st.rec; if (!r) return; r.send = sendIt; if (r.mr.state !== "inactive") r.mr.stop(); }
    if (mic) mic.addEventListener("click", startRec);
    recBox.addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (b) finish(b.dataset.c === "rec-send"); });

    /* photo lightbox */
    log.addEventListener("click", e => {
      const im = e.target.closest(".chat-img"); if (!im) return;
      const ov = document.createElement("div"); ov.className = "chat-lightbox"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Photo");
      ov.innerHTML = '<img alt="Photo"><button type="button" aria-label="Close">×</button>'; ov.firstChild.src = im.src;
      const close = () => { ov.remove(); document.removeEventListener("keydown", onKey); };
      const onKey = ev => { if (ev.key === "Escape") close(); };
      ov.addEventListener("click", close); document.addEventListener("keydown", onKey); document.body.appendChild(ov);
    });

    const timer = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, POLL);
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    function destroy() { clearInterval(timer); document.removeEventListener("visibilitychange", onVis); if (st.rec) { st.rec.send = false; try { st.rec.mr.stop(); } catch (e) { /* already stopped */ } stopTracks(); } }
    refresh();
    return { destroy: destroy, refresh: refresh };
  }

  root.HXChat = { api: api, mount: mount };
})(window);
