/* HEXORA — exchange rate + price maths (no page code here, so it is easy to test) */
(function (root) {
  "use strict";

  const KEY = "hexora_usd_lkr_v1";

  function roundLKR(lkr, step) {
    step = step || 500;
    return Math.round(lkr / step) * step;
  }

  function formatLKR(lkr) {
    return "LKR " + Math.round(lkr).toLocaleString("en-US");
  }

  function readCache(maxHours) {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || "null");
      if (c && c.rate > 0 && Date.now() - c.at < maxHours * 3600e3) return c;
    } catch (e) { /* storage blocked */ }
    return null;
  }

  function writeCache(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* ignore */ }
  }

  /* Resolves { rate, date, live } — never rejects. */
  function getRate(cfg) {
    const fallback = { rate: cfg.fallbackRate, date: null, live: false };
    const cached = readCache(cfg.rateCacheHours || 12);
    if (cached) return Promise.resolve({ rate: cached.rate, date: cached.date, live: true });
    if (!root.fetch) return Promise.resolve(fallback);

    const ctrl = "AbortController" in root ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 6000);
    return fetch(cfg.rateApi, { signal: ctrl ? ctrl.signal : undefined, cache: "no-store" })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(j => {
        const rate = j && j.rates && Number(j.rates.LKR);
        if (!rate || rate < 50 || rate > 5000) return fallback;
        const date = j.time_last_update_utc ? new Date(j.time_last_update_utc).toISOString() : new Date().toISOString();
        const out = { rate: Math.round(rate * 100) / 100, date: date, live: true };
        writeCache({ rate: out.rate, date: out.date, at: Date.now() });
        return out;
      })
      .catch(() => fallback)
      .finally(() => clearTimeout(timer));
  }

  /*
   * sel = { type, size, features: [], design, extras: [], urgency }
   * Returns USD and LKR figures plus a line-by-line breakdown.
   */
  function estimate(cfg, sel, rate) {
    const lines = [];
    const type = cfg.types[sel.type];
    const size = cfg.sizes[sel.size];
    const urg = cfg.urgency[sel.urgency] || cfg.urgency.normal;
    const design = cfg.design[sel.design] || null;
    if (!type || !size) return null;

    let usd = type.usd * size.priceX;
    let weeks = type.weeks * size.weeksX;
    lines.push({ label: type.label + " · " + size.label, usd: usd });

    (sel.features || []).forEach(k => {
      const f = cfg.features[k];
      if (!f) return;
      if (k === "admin" && type.includesAdmin) return;
      usd += f.usd; weeks += f.weeks;
      lines.push({ label: f.label, usd: f.usd });
    });

    (sel.extras || []).forEach(k => {
      const x = cfg.extras[k];
      if (!x || x.for.indexOf(type.kind) === -1) return;
      usd += x.usd;
      lines.push({ label: x.label, usd: x.usd });
    });

    if (design && (design.percent || design.usd)) {
      const d = usd * design.percent / 100 + design.usd;
      usd += d; weeks += 1;
      lines.push({ label: design.label, usd: d });
    }

    if (urg.percent) {
      const u = usd * urg.percent / 100;
      usd += u;
      lines.push({ label: "Urgent delivery (+" + urg.percent + "%)", usd: u });
    }
    weeks = weeks * (urg.weeksX || 1);

    const step = cfg.roundTo || 500;
    const lowLKR = roundLKR(usd * rate, step);
    const highLKR = roundLKR(usd * rate * (cfg.rangeSpread || 1.25), step);
    const wLow = Math.max(1, Math.round(weeks));
    const wHigh = Math.max(wLow + 1, Math.round(weeks * 1.3));

    return {
      usd: Math.round(usd),
      usdHigh: Math.round(usd * (cfg.rangeSpread || 1.25)),
      lowLKR: lowLKR,
      highLKR: highLKR,
      advanceLKR: roundLKR(lowLKR * (cfg.advancePercent || 50) / 100, step),
      maintenanceLKR: roundLKR(size.maintenanceUsd * rate, step),
      weeksLow: wLow,
      weeksHigh: wHigh,
      lines: lines.map(l => ({ label: l.label, usd: Math.round(l.usd), lkr: roundLKR(l.usd * rate, step) }))
    };
  }

  /* LKR price written for 1 USD = packageBaseRate (369) → LKR at today's rate */
  function packageLKR(cfg, baseLkr, rate) {
    return smartRound(baseLkr * rate / (cfg.packageBaseRate || 369), cfg);
  }

  /*
   * Mobile app package + add-ons. sel = { pkg, addons: [keys], qty: { key: n }, urgency }
   * The package and add-ons are priced in LKR at cfg.packageBaseRate, then scaled by today's rate.
   */
  function estimatePackage(cfg, sel, rate) {
    const p = (cfg.packages || {})[sel.pkg];
    if (!p) return null;
    const urg = cfg.urgency[sel.urgency] || cfg.urgency.normal;
    const adds = cfg.addons || {};
    const lines = [{ label: p.label, base: p.lkr }];
    let base = p.lkr, weeks = p.weeks || 1;
    (sel.addons || []).forEach(k => {
      const a = adds[k];
      if (!a || a.qty) return;
      base += a.lkr; weeks += a.weeks || 0;
      lines.push({ label: a.label, base: a.lkr });
    });
    Object.keys(sel.qty || {}).forEach(k => {
      const a = adds[k], n = Math.max(0, Math.min(50, Math.floor(sel.qty[k] || 0)));
      if (!a || !a.qty || !n) return;
      base += a.lkr * n; weeks += (a.weeks || 0) * n;
      lines.push({ label: a.label + " × " + n, base: a.lkr * n });
    });
    if (urg.percent) {
      const u = base * urg.percent / 100;
      base += u;
      lines.push({ label: "Urgent delivery (+" + urg.percent + "%)", base: u });
    }
    weeks = weeks * (urg.weeksX || 1);
    const total = packageLKR(cfg, base, rate);
    const wLow = Math.max(1, Math.round(weeks));
    return {
      usd: Math.round(base / (cfg.packageBaseRate || 369)),
      totalLKR: total,
      advanceLKR: smartRound(total * (cfg.advancePercent || 50) / 100, cfg),
      weeksLow: wLow,
      weeksHigh: Math.max(wLow + 1, Math.round(weeks * 1.3)),
      lines: lines.map(l => ({ label: l.label, lkr: packageLKR(cfg, l.base, rate) }))
    };
  }

  /* Small amounts round to 100, bigger ones to cfg.roundTo (500) */
  function smartRound(lkr, cfg) {
    return roundLKR(lkr, lkr < 20000 ? 100 : (cfg.roundTo || 500));
  }

  /*
   * Design & video: items = { logo: 1, reel: 4, ... }, urgencyKey = "normal" | "fast"
   */
  function estimateCreative(cfg, items, urgencyKey, rate) {
    const urg = cfg.urgency[urgencyKey] || cfg.urgency.normal;
    const lines = [];
    let usd = 0, days = 0, units = 0;
    Object.keys(items || {}).forEach(k => {
      const it = cfg.creative[k], q = Math.max(0, Math.floor(items[k] || 0));
      if (!it || !q) return;
      const u = it.usd * q;
      usd += u; units += q;
      days += it.days + it.extraDays * (q - 1);
      lines.push({ key: k, label: it.label + " × " + q, qty: q, usd: u });
    });
    if (!units) return null;
    if (urg.percent) {
      const x = usd * urg.percent / 100;
      usd += x;
      lines.push({ label: "Urgent delivery (+" + urg.percent + "%)", usd: x });
    }
    days = days * (urg.weeksX || 1);
    const totalLKR = smartRound(usd * rate, cfg);
    const dLow = Math.max(1, Math.round(days));
    return {
      usd: Math.round(usd),
      totalLKR: totalLKR,
      advanceLKR: smartRound(totalLKR * (cfg.advancePercent || 50) / 100, cfg),
      daysLow: dLow,
      daysHigh: Math.max(dLow + 1, Math.ceil(days * 1.3)),
      units: units,
      lines: lines.map(l => ({ key: l.key, label: l.label, qty: l.qty, usd: Math.round(l.usd), lkr: smartRound(l.usd * rate, cfg) }))
    };
  }

  root.HXPrice = { getRate: getRate, estimate: estimate, estimateCreative: estimateCreative, estimatePackage: estimatePackage, packageLKR: packageLKR, roundLKR: roundLKR, smartRound: smartRound, formatLKR: formatLKR };
  if (typeof module !== "undefined") module.exports = root.HXPrice;
})(typeof window !== "undefined" ? window : globalThis);
