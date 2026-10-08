/* HEXORA — project chat (used by account.js for customers and admin.js for the admin).
   Messages live in Firestore: requests/<project>/messages/<id>  { from: "c"|"a", kind: "text"|"image"|"audio", text, data, mime, dur, wave, createdAt }
   and one summary doc per project in chats/<project>:
     uid, lastAt, lastFrom, lastText            → the "new message" dots
     custSeenAt / adminSeenAt                   → "Seen" ticks (when each side last had the chat open and read it)
     custOnlineAt                               → customer online; the admin's online time is in site/presence
   Photos are shrunk in the browser and voice notes are limited to 90 s, then both are saved as base64 inside the message
   (Firebase Storage needs a paid plan). Firestore has no live feed over plain REST, so an open chat asks for new
   messages every few seconds. All times that are compared come from the server (readTime), never the phone's clock. */
(function (root) {
  "use strict";
  const IMG = ["image/jpeg", "image/png", "image/webp"], AUD = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg"];
  const B64 = /^[A-Za-z0-9+/=]+$/;
  const MAX_IMG = 350000, MAX_AUD = 450000, MAX_SEC = 90, POLL = 6000, BEAT = 25000, ONLINE_MS = 75000, BARS = 40;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const mmss = n => Math.floor(n / 60) + ":" + String(Math.floor(n % 60)).padStart(2, "0");
  const ms = iso => { const t = Date.parse(iso); return isNaN(t) ? 0 : t; };

  /* ---------- Firestore side. fs(method, path, body) talks to .../documents, db = "projects/<id>/databases/(default)" ---------- */
  function api(fs, db) {
    const doc = db + "/documents/";
    const fromFields = (f, id) => { const o = { id: id }; Object.keys(f || {}).forEach(k => { const v = f[k]; o[k] = v.stringValue != null ? v.stringValue : v.timestampValue != null ? v.timestampValue : v.integerValue != null ? Number(v.integerValue) : null; }); return o; };
    const fromDoc = d => fromFields(d.fields, d.name.split("/").pop());
    return {
      // after = createdAt of the newest message already shown. No `after`: the latest 30, oldest first.
      async load(rid, after) {
        const q = { from: [{ collectionId: "messages" }], orderBy: [{ field: { fieldPath: "createdAt" }, direction: after ? "ASCENDING" : "DESCENDING" }], limit: after ? 100 : 30 };
        if (after) q.where = { fieldFilter: { field: { fieldPath: "createdAt" }, op: "GREATER_THAN", value: { timestampValue: after } } };
        const rows = await fs("POST", "/requests/" + encodeURIComponent(rid) + ":runQuery", { structuredQuery: q });
        const out = (rows || []).filter(r => r.document).map(r => fromDoc(r.document));
        return after ? out : out.reverse();
      },
      // writes the message and the project's chat summary (only those fields) in one commit
      async send(rid, uid, from, m) {
        const f = { from: { stringValue: from }, kind: { stringValue: m.kind }, text: { stringValue: m.text || "" } };
        if (m.data) { f.data = { stringValue: m.data }; f.mime = { stringValue: m.mime }; }
        if (m.dur) f.dur = { integerValue: String(Math.round(m.dur)) };
        if (m.wave) f.wave = { stringValue: m.wave };
        const last = m.kind === "image" ? "📷 Photo" : m.kind === "audio" ? "🎤 Voice message" : (m.text || "").slice(0, 100);
        const id = newId();
        await fs("POST", ":commit", { writes: [
          { update: { name: doc + "requests/" + rid + "/messages/" + id, fields: f }, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" }] },
          { update: { name: doc + "chats/" + rid, fields: { uid: { stringValue: uid }, lastFrom: { stringValue: from }, lastText: { stringValue: last } } }, updateMask: { fieldPaths: ["uid", "lastFrom", "lastText"] }, updateTransforms: [{ fieldPath: "lastAt", setToServerValue: "REQUEST_TIME" }] }
        ] });
      },
      // "I am here" (customer: custOnlineAt) and/or "I have read everything" (custSeenAt / adminSeenAt)
      async touch(rid, uid, who, seen) {
        const tf = [];
        if (who === "c") tf.push({ fieldPath: "custOnlineAt", setToServerValue: "REQUEST_TIME" });
        if (seen) tf.push({ fieldPath: who === "c" ? "custSeenAt" : "adminSeenAt", setToServerValue: "REQUEST_TIME" });
        if (!tf.length) return;
        await fs("POST", ":commit", { writes: [{ update: { name: doc + "chats/" + rid, fields: { uid: { stringValue: uid } } }, updateMask: { fieldPaths: ["uid"] }, updateTransforms: tf }] });
      },
      // the chat summary + the admin's presence, with the server's clock
      async peek(rid) {
        const rows = await fs("POST", ":batchGet", { documents: [doc + "chats/" + rid, doc + "site/presence"] });
        const out = { chat: null, presence: null, now: "" };
        (rows || []).forEach(r => {
          if (r.readTime && !out.now) out.now = r.readTime;
          if (!r.found) return;
          const o = fromDoc(r.found), n = r.found.name;
          if (/\/chats\/[^/]+$/.test(n)) out.chat = o; else if (/\/site\/presence$/.test(n)) out.presence = o;
        });
        return out;
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

  /* ---------- voice bubble: play button, waveform, time (like WhatsApp) ---------- */
  const playSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>', pauseSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
  function levelsOf(m) {   // 0..1 per bar; real levels when the sender's phone saved them, otherwise a steady pattern from the id
    const out = [];
    if (/^[0-9]{8,80}$/.test(m.wave || "")) { for (let i = 0; i < BARS; i++) out.push(Number(m.wave[Math.floor(i * m.wave.length / BARS)]) / 9); return out; }
    let h = 2166136261; String(m.id).split("").forEach(c => { h = Math.imul(h ^ c.charCodeAt(0), 16777619); });
    for (let i = 0; i < BARS; i++) { h = Math.imul(h ^ (h >>> 15), 2246822507); out.push(0.2 + ((h >>> 0) % 1000) / 1250); }
    return out;
  }
  function voiceHtml(m) {
    const bars = levelsOf(m).map(l => '<i style="height:' + Math.round(5 + Math.min(1, l) * 23) + 'px"></i>').join("");
    return '<div class="chat-voice" data-dur="' + (Number(m.dur) || 0) + '"><button type="button" class="vp-btn" aria-label="Play">' + playSvg + "</button>" +
      '<div class="vp-wave" role="slider" tabindex="0" aria-label="Voice message" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' + bars + "</div>" +
      '<div class="vp-side"><span class="vp-time">' + mmss(Number(m.dur) || 0) + '</span><button type="button" class="vp-speed" hidden>1×</button></div>' +
      '<audio preload="metadata" src="data:' + m.mime + ";base64," + m.data + '"></audio></div>';
  }
  function wireVoice(box) {
    const au = box.querySelector("audio"), btn = box.querySelector(".vp-btn"), wave = box.querySelector(".vp-wave"), time = box.querySelector(".vp-time"), sp = box.querySelector(".vp-speed");
    const bars = Array.from(wave.children), total = () => Number(box.dataset.dur) || (isFinite(au.duration) ? au.duration : 0);
    const paint = () => {
      const t = total(), p = t ? Math.min(1, au.currentTime / t) : 0;
      bars.forEach((b, i) => b.classList.toggle("on", i < Math.round(p * bars.length)));
      wave.setAttribute("aria-valuenow", String(Math.round(p * 100)));
      time.textContent = mmss(au.paused && au.currentTime === 0 ? t : au.currentTime);
    };
    const state = () => { btn.innerHTML = au.paused ? playSvg : pauseSvg; btn.setAttribute("aria-label", au.paused ? "Play" : "Pause"); box.classList.toggle("playing", !au.paused); sp.hidden = au.paused && au.currentTime === 0; };
    btn.addEventListener("click", () => {
      if (au.paused) { document.querySelectorAll(".chat-voice audio").forEach(a => { if (a !== au) a.pause(); }); au.play().catch(() => {}); } else au.pause();
    });
    wave.addEventListener("click", e => { const r = wave.getBoundingClientRect(), t = total(); if (t && r.width) { au.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * t; paint(); } });
    wave.addEventListener("keydown", e => { if (e.key === "ArrowRight") au.currentTime += 3; else if (e.key === "ArrowLeft") au.currentTime = Math.max(0, au.currentTime - 3); });
    sp.addEventListener("click", () => { const next = au.playbackRate === 1 ? 1.5 : au.playbackRate === 1.5 ? 2 : 1; au.playbackRate = next; sp.textContent = next + "×"; });
    ["timeupdate", "play", "pause", "seeked"].forEach(ev => au.addEventListener(ev, () => { paint(); state(); }));
    au.addEventListener("ended", () => { au.currentTime = 0; paint(); state(); sp.hidden = true; });
  }

  /* ---------- the chat box ---------- */
  function mount(box, o) {
    const me = o.me, st = { last: "", ids: new Set(), loaded: false, loading: false, busy: false, rec: null, otherSeen: "", mySeen: 0, lastOther: 0, beatAt: 0 };
    const recOk = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && root.MediaRecorder);
    box.classList.add("chat");
    box.innerHTML =
      '<div class="chat-head"><span class="chat-peer">' + esc(o.peer || "") + '</span><span class="chat-status" aria-live="polite"><i class="chat-on"></i><em></em></span></div>' +
      '<div class="chat-log" role="log" aria-live="polite" tabindex="0"><p class="chat-empty">Messages ගන්නවා…</p></div>' +
      '<p class="chat-note" role="alert"></p>' +
      '<div class="chat-rec" hidden><i class="chat-dot"></i><span class="chat-time">0:00</span><span class="chat-live" aria-hidden="true"></span><button type="button" class="chat-x" data-c="rec-cancel">Cancel</button><button type="button" class="chat-ok" data-c="rec-send">Send</button></div>' +
      '<form class="chat-bar">' +
        '<button type="button" class="chat-ic" data-c="photo" aria-label="Photo එකක් යවන්න" title="Photo"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/></svg></button>' +
        '<input type="file" accept="image/*" hidden>' +
        '<textarea rows="1" maxlength="1000" placeholder="Message එකක් ලියන්න…" aria-label="Message"></textarea>' +
        (recOk ? '<button type="button" class="chat-ic" data-c="mic" aria-label="Voice message එකක් යවන්න" title="Voice"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>' : "") +
        '<button type="submit" class="chat-send">Send</button>' +
      "</form>";
    const $ = s => box.querySelector(s);
    const log = $(".chat-log"), note = $(".chat-note"), bar = $(".chat-bar"), ta = $("textarea"), file = $('input[type="file"]'), recBox = $(".chat-rec"), statusEl = $(".chat-status");
    const setNote = t => { note.textContent = t || ""; };
    const fmtTime = iso => { const d = new Date(iso); if (isNaN(d)) return ""; const t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); return d.toDateString() === new Date().toDateString() ? t : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " · " + t; };
    const visible = () => box.isConnected && !box.hidden && document.visibilityState === "visible";

    function bubble(m) {
      let body;
      if (m.kind === "image" && IMG.indexOf(m.mime) !== -1 && B64.test(m.data || "")) body = '<img class="chat-img" alt="Photo" src="data:' + m.mime + ";base64," + m.data + '">';
      else if (m.kind === "audio" && AUD.indexOf(m.mime) !== -1 && B64.test(m.data || "")) body = voiceHtml(m);
      else if (m.kind === "text") body = "<p>" + esc(m.text) + "</p>";
      else body = '<p class="chat-bad">(මේ message එක පෙන්නන්න බෑ)</p>';
      const mine = m.from === me;
      return '<div class="chat-m ' + (mine ? "me" : "them") + '" data-id="' + esc(m.id) + '" data-t="' + esc(m.createdAt) + '">' + body +
        '<div class="chat-meta"><time>' + esc(fmtTime(m.createdAt)) + "</time>" + (mine ? '<span class="chat-tick" aria-label="Sent">✓</span>' : "") + "</div></div>";
    }
    function ticks() {   // ✓ sent, ✓✓ seen (blue). The newest seen one also says "Seen".
      const at = ms(st.otherSeen);
      let lastSeen = null;
      log.querySelectorAll(".chat-m.me").forEach(el => {
        const t = el.querySelector(".chat-tick"), seen = !!at && ms(el.dataset.t) <= at;
        t.textContent = seen ? "✓✓" : "✓"; t.classList.toggle("seen", seen); t.classList.remove("last");
        t.setAttribute("aria-label", seen ? "Seen" : "Sent");
        if (seen) lastSeen = t;
      });
      if (lastSeen) lastSeen.classList.add("last");
    }
    const rel = d => d < 3600e3 ? Math.max(1, Math.round(d / 60e3)) + " min ago" : d < 86400e3 ? Math.round(d / 3600e3) + " h ago" : Math.round(d / 86400e3) + " days ago";
    function status(meta) {
      if (!meta) return;
      const at = me === "c" ? meta.presence && meta.presence.adminOnlineAt : meta.chat && meta.chat.custOnlineAt;
      const age = ms(meta.now) - ms(at), on = !!at && age < ONLINE_MS;
      statusEl.classList.toggle("online", on);
      statusEl.querySelector("em").textContent = on ? "Online" : at ? "Last seen " + rel(age) : "Offline";
    }

    async function touch(seen) {
      if (!o.touch || !visible()) return;
      st.beatAt = Date.now();
      try { await o.touch(!!seen); } catch (e) { /* the next beat tries again */ }
    }
    async function refresh() {
      if (!box.isConnected) return destroy();
      if (st.loading) return;
      st.loading = true;
      try {
        const [rows, meta] = await Promise.all([o.load(st.last), o.peek ? o.peek().catch(() => null) : null]);
        const fresh = rows.filter(m => !st.ids.has(m.id));
        const first = !st.loaded;
        if (first) log.innerHTML = "";
        if (fresh.length) {
          const nearEnd = first || log.scrollHeight - log.scrollTop - log.clientHeight < 90;
          const emp = log.querySelector(".chat-empty"); if (emp) emp.remove();
          fresh.forEach(m => {
            st.ids.add(m.id); log.insertAdjacentHTML("beforeend", bubble(m)); st.last = m.createdAt;
            if (m.from !== me) st.lastOther = Math.max(st.lastOther, ms(m.createdAt));
            if (m.kind === "audio") { const v = log.querySelector('[data-id="' + m.id + '"] .chat-voice'); if (v) wireVoice(v); }
          });
          if (nearEnd) log.scrollTop = log.scrollHeight;
          if (o.onSeen) o.onSeen(st.last, fresh.some(m => m.from !== me));
        } else if (first) log.innerHTML = '<p class="chat-empty">තාම messages නෑ. පළවෙනි message එක ඔයා යවන්න.</p>';
        st.loaded = true; setNote("");
        if (meta) {
          st.otherSeen = (me === "c" ? meta.chat && meta.chat.adminSeenAt : meta.chat && meta.chat.custSeenAt) || "";
          status(meta); ticks();
        } else ticks();
        // read everything the other side sent → tell them (once per new message), and say we are here every 25 s
        if (st.lastOther > st.mySeen && visible()) { st.mySeen = st.lastOther; touch(true); }
        else if (Date.now() - st.beatAt > BEAT) touch(false);
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

    /* voice: record (with a live level meter), then send. The levels are kept so the receiver sees the same waveform. */
    const mic = $('[data-c="mic"]'), live = $(".chat-live");
    live.innerHTML = "<i></i>".repeat(24);
    function stopTracks() { if (st.rec && st.rec.stream) st.rec.stream.getTracks().forEach(t => t.stop()); }
    function recUi(on) { recBox.hidden = !on; bar.hidden = on; }
    const waveOf = levels => {
      if (levels.length < 4) return "";
      let s = "";
      for (let i = 0; i < BARS; i++) { const a = Math.floor(i * levels.length / BARS), b = Math.max(a + 1, Math.floor((i + 1) * levels.length / BARS)); let mx = 0; for (let j = a; j < b && j < levels.length; j++) mx = Math.max(mx, levels[j]); s += String(Math.min(9, Math.round(Math.sqrt(mx) * 9))); }
      return s;
    };
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
      const rec = st.rec = { mr: mr, stream: stream, chunks: [], t0: Date.now(), send: false, levels: [], mime: (mr.mimeType || type || "audio/webm").split(";")[0] };
      mr.ondataavailable = e => { if (e.data && e.data.size) rec.chunks.push(e.data); };
      const AC = root.AudioContext || root.webkitAudioContext;
      if (AC) {
        try {
          rec.ac = new AC(); const an = rec.ac.createAnalyser(); an.fftSize = 512; rec.ac.createMediaStreamSource(stream).connect(an);
          const buf = new Uint8Array(an.fftSize), bars = Array.from(live.children);
          rec.meter = setInterval(() => {
            an.getByteTimeDomainData(buf); let pk = 0; for (let i = 0; i < buf.length; i++) pk = Math.max(pk, Math.abs(buf[i] - 128));
            rec.levels.push(Math.min(1, pk / 90));
            const tail = rec.levels.slice(-bars.length); bars.forEach((b, i) => { const v = tail[i - (bars.length - tail.length)]; b.style.height = Math.round(4 + (v || 0) * 22) + "px"; });
          }, 100);
        } catch (e) { rec.ac = null; }
      }
      mr.onstop = async () => {
        stopTracks(); clearInterval(rec.tick); clearInterval(rec.meter); if (rec.ac) rec.ac.close().catch(() => {});
        st.rec = null; recUi(false);
        if (!rec.send) return;
        const blob = new Blob(rec.chunks, { type: rec.mime }), dur = Math.min(MAX_SEC, (Date.now() - rec.t0) / 1000);
        if (AUD.indexOf(rec.mime) === -1) return setNote("මේ browser එකේ voice format එක support නෑ.");
        const data = await toBase64(blob).catch(() => "");
        if (!data) return setNote("Voice message එක කියවන්න බැරි උනා.");
        if (data.length > MAX_AUD) return setNote("Voice message එක දිග වැඩියි. තත්පර 90 ට අඩුවෙන් try කරන්න.");
        send({ kind: "audio", mime: rec.mime, data: data, dur: dur, wave: waveOf(rec.levels) });
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
    const onVis = () => { if (document.visibilityState === "visible") { st.mySeen = 0; refresh(); } };
    document.addEventListener("visibilitychange", onVis);
    function destroy() {
      clearInterval(timer); document.removeEventListener("visibilitychange", onVis);
      document.querySelectorAll(".chat-voice audio").forEach(a => { if (box.contains(a)) a.pause(); });
      if (st.rec) { st.rec.send = false; try { st.rec.mr.stop(); } catch (e) { /* already stopped */ } stopTracks(); }
    }
    refresh();
    return { destroy: destroy, refresh: refresh };
  }

  root.HXChat = { api: api, mount: mount };
})(window);
