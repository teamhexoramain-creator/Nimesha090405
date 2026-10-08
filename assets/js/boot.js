/* HEXORA — loads the content saved from the admin panel, then the page scripts.
   The admin panel saves prices, contact, services and the notice bar to Firestore
   (site/content). This file puts that copy into window.HEXORA / window.HX_SERVICES
   and then loads the scripts listed in data-load, in order.
   • A copy is kept in this browser. If it is less than 10 minutes old the page starts with it
     right away, and the fresh copy fetched in the background is used from the next page.
   • No Firebase set up, offline or slow (> 3 s): the last copy in this browser, or the
     built-in config.js / services.js, is used. The site never waits on Firebase for long. */
(function () {
  "use strict";
  const me = document.currentScript;
  const scripts = ((me && me.getAttribute("data-load")) || "").split(/\s+/).filter(Boolean);
  const base = me && me.src ? me.src.replace(/[^/?#]*([?#].*)?$/, "") : "assets/js/";
  const F = window.HX_FIREBASE || {};
  const KEY = "hx_content_v1", FRESH = 10 * 60000, WAIT = 3000;
  let started = false;

  function readCache() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function writeCache(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* storage blocked */ } }

  // Fields added to the built-in packages / add-ons after the admin saved them (badge, ...) are filled in; a field the admin cleared stays cleared.
  function fillMissing(saved, builtin) {
    if (!saved || !builtin) return;
    Object.keys(builtin).forEach(k => { if (saved[k] && typeof saved[k] === "object") Object.keys(builtin[k]).forEach(f => { if (saved[k][f] === undefined) saved[k][f] = builtin[k][f]; }); });
  }
  // Saved values win; keys that only exist in the built-in files (added later in code) are kept.
  function apply(c) {
    if (!c) return;
    try {
      const conf = c.config ? JSON.parse(c.config) : null, svc = c.services ? JSON.parse(c.services) : null;
      if (conf && typeof conf === "object") {
        const built = window.HEXORA || {};
        fillMissing(conf.packages, built.packages); fillMissing(conf.addons, built.addons);
        window.HEXORA = Object.assign({}, built, conf);
      }
      if (svc && Array.isArray(svc.list)) window.HX_SERVICES = Object.assign({}, window.HX_SERVICES, svc);
    } catch (e) { /* a broken copy: keep the built-in data */ }
  }
  function start(c) {
    if (started) return;
    started = true;
    apply(c);
    scripts.forEach(src => {
      const s = document.createElement("script");
      s.src = base + src; s.async = false;   // run in the listed order
      document.body.appendChild(s);
    });
  }

  if (!F.projectId || !window.fetch) return start(null);

  const cache = readCache();
  const fresh = cache && Date.now() - cache.at < FRESH;
  if (fresh) start(cache);

  const url = "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(F.projectId) +
    "/databases/(default)/documents/site/content?mask.fieldPaths=config&mask.fieldPaths=services" +
    (F.apiKey ? "&key=" + encodeURIComponent(F.apiKey) : "");
  const ctrl = "AbortController" in window ? new AbortController() : null;
  const timer = setTimeout(() => { start(cache); if (ctrl) setTimeout(() => ctrl.abort(), 10000); }, WAIT);

  fetch(url, { cache: "no-store", signal: ctrl ? ctrl.signal : undefined })
    .then(r => (r.ok ? r.json() : r.status === 404 ? null : Promise.reject(r.status)))
    .then(doc => {
      const f = (doc && doc.fields) || {};
      const c = f.config && f.services ? { at: Date.now(), config: f.config.stringValue, services: f.services.stringValue } : null;
      if (c) writeCache(c);
      else try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
      clearTimeout(timer);
      start(c);
    })
    .catch(() => { clearTimeout(timer); start(cache); });
})();
