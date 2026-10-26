// Shared helpers: constants loading, CSV parsing, number formatting, math rendering.
(function () {
  "use strict";

  // ---------- CSV ----------
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", i = 0, q = false;
    text = String(text).replace(/\r\n?/g, "\n");
    while (i < text.length) {
      const c = text[i];
      if (q) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          q = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { q = true; i++; continue; }
      if (c === "," || c === "\t") { row.push(field); field = ""; i++; continue; }
      if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
      field += c; i++;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows.map(r => r.map(s => s.trim())).filter(r => r.some(s => s !== ""));
  }

  // Reads "0.25", "25%", "1,000", "Cr 1,000" and returns a number or NaN.
  function parseNumber(raw) {
    if (raw === null || raw === undefined) return NaN;
    let s = String(raw).trim().replace(/[,\s]/g, "").replace(/^cr/i, "");
    if (s === "") return NaN;
    let pct = false;
    if (s.endsWith("%")) { pct = true; s = s.slice(0, -1); }
    const n = Number(s);
    if (!isFinite(n)) return NaN;
    return pct ? n / 100 : n;
  }

  function parseBool(raw) {
    const s = String(raw || "").trim().toLowerCase();
    return ["y", "yes", "true", "1", "active", "x"].includes(s);
  }

  // ---------- Constants ----------
  const C = {};          // key -> value in use
  const meta = {};       // key -> { spec, from: "sheet" | "default" }
  const status = { source: "defaults", lastUpdated: null, warnings: [], loaded: false };

  CONSTANT_SPEC.forEach(s => { C[s.key] = s.value; meta[s.key] = { spec: s, from: "default" }; });

  async function loadConstants() {
    const url = (window.SHEET_CSV_URL || "").trim();
    if (!url) {
      status.source = "defaults";
      status.warnings.push("No constants sheet is configured, so the built-in starting values are in use.");
      status.loaded = true;
      return status;
    }
    try {
      const sep = url.includes("?") ? "&" : "?";
      const res = await fetch(url + sep + "nocache=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const rows = parseCSV(await res.text());
      const seen = new Set();
      rows.forEach(r => {
        const key = (r[0] || "").trim();
        if (!key || key.toLowerCase() === "key") return;
        if (key === "last_updated") { status.lastUpdated = r[1] || null; return; }
        const m = meta[key];
        if (!m) return; // unknown rows (notes, headings) are ignored
        seen.add(key);
        const n = parseNumber(r[1]);
        const s = m.spec;
        if (isNaN(n)) {
          status.warnings.push(`"${s.label}" in the sheet is not a number ("${r[1]}"). Using the starting value, ${fmtConst(s.key, s.value)}.`);
        } else if (n < s.min || n > s.max) {
          status.warnings.push(`"${s.label}" in the sheet (${r[1]}) is outside the allowed range of ${fmtConst(s.key, s.min)} to ${fmtConst(s.key, s.max)}. Using the starting value, ${fmtConst(s.key, s.value)}.`);
        } else {
          C[key] = n; m.from = "sheet";
        }
      });
      CONSTANT_SPEC.forEach(s => {
        if (!seen.has(s.key)) status.warnings.push(`"${s.label}" is missing from the sheet. Using the starting value, ${fmtConst(s.key, s.value)}.`);
      });
      if (C.decay_end <= C.decay_start) {
        status.warnings.push("Decay end is not later than decay start in the sheet. Using the starting values for both.");
        ["decay_start", "decay_end"].forEach(k => { C[k] = meta[k].spec.value; meta[k].from = "default"; });
      }
      status.source = "sheet";
    } catch (e) {
      status.source = "defaults";
      status.warnings.push("The constants sheet could not be loaded (" + e.message + "). The built-in starting values are in use, and they may be out of date.");
    }
    status.loaded = true;
    return status;
  }

  // ---------- Formatting ----------
  const nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nfn = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });
  const nfp = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

  function fmt(v, kind) {
    if (v === null || v === undefined || (typeof v === "number" && !isFinite(v))) return "—";
    if (typeof v !== "number") return String(v);
    switch (kind) {
      case "cr": return nf2.format(v) + " Cr";
      case "pct": return nfp.format(v * 100) + "%";
      case "int": return Math.round(v).toLocaleString("en-US");
      case "wk": return nfn.format(v) + (Math.abs(v) === 1 ? " week" : " weeks");
      case "units": return nfn.format(v) + " units";
      default: return nfn.format(v);
    }
  }
  function fmtConst(key, v) {
    const s = meta[key] && meta[key].spec;
    return s && s.pct ? fmt(v, "pct") : fmt(v);
  }

  // ---------- Math ----------
  function tex(src, display) {
    if (window.katex) {
      try {
        return katex.renderToString(src, { displayMode: display !== false, output: "mathml", throwOnError: false });
      } catch (e) { /* fall through */ }
    }
    const pre = document.createElement("code");
    pre.textContent = src;
    return pre.outerHTML;
  }

  // ---------- Section links ----------
  function secId(sec) { return "s" + String(sec).replace(/\./g, "-"); }
  function secLink(sec) {
    if (!sec) return "";
    return `<a class="sec" href="${window.SITE_ROOT || ""}policy/index.html#${secId(sec)}" title="Open §${sec} in the policy document">§${sec}</a>`;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- Catalog tab ----------
  // Dates may be written 2026-11-01 or 11/1/2026 (month first). Returns a Date,
  // null for an empty cell, or undefined for a date that cannot be read.
  function parseDate(raw, endOfDay) {
    const s = String(raw || "").trim();
    if (!s) return null;
    let y, m, d, k;
    if ((k = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { y = +k[1]; m = +k[2]; d = +k[3]; }
    else if ((k = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) { m = +k[1]; d = +k[2]; y = +k[3]; }
    else {
      const t = Date.parse(s);
      if (isNaN(t)) return undefined;
      const x = new Date(t); y = x.getFullYear(); m = x.getMonth() + 1; d = x.getDate();
    }
    const out = endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d);
    return isNaN(out) ? undefined : out;
  }
  function fmtDate(dt) {
    const opts = { month: "short", day: "numeric" };
    if (dt.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
    return dt.toLocaleDateString("en-US", opts);
  }
  // "20%", "20" and "0.2" all mean a 20% sale. Anything else means no sale.
  function parseSale(raw) {
    const s = String(raw || "").trim();
    let n = parseNumber(s);
    if (isNaN(n) || n <= 0) return 0;
    if (!s.endsWith("%") && n >= 1) n = n / 100;
    return n < 1 ? n : 0;
  }
  // The sale fraction that applies now, or 0. A sale with a date that cannot
  // be read is not shown, so a mistyped end date never advertises an old sale.
  function saleNow(it, now) {
    if (!it.sale) return 0;
    now = now || new Date();
    if (it.saleFrom === undefined || it.saleUntil === undefined) return 0;
    if (it.saleFrom && now < it.saleFrom) return 0;
    if (it.saleUntil && now > it.saleUntil) return 0;
    return it.sale;
  }

  function parseCatalog(text, example) {
    const rows = parseCSV(text);
    if (!rows.length) return { items: [], updated: null };
    const head = rows[0].map(h => h.toLowerCase().trim());
    const get = (r, name) => { const i = head.indexOf(name); return i >= 0 ? (r[i] || "").trim() : ""; };
    let updated = null;
    const out = [];
    rows.slice(1).forEach((r, idx) => {
      const id = get(r, "id");
      if (id.toLowerCase() === "last_updated") { updated = get(r, "name") || get(r, "price") || null; return; }
      const name = get(r, "name");
      if (!name) return;
      const vis = get(r, "visible");
      if (vis && !parseBool(vis)) return;
      const t = get(r, "type");
      const p = parseNumber(get(r, "price"));
      const sort = parseNumber(get(r, "sort"));
      const bulk = parseNumber(get(r, "bulk_min"));
      out.push({
        id, name, example,
        type: /^serv/i.test(t) ? "service" : /^(store|shop|location)/i.test(t) ? "store" : /^member/i.test(t) ? "member" : "good",
        category: get(r, "category"),
        price: isNaN(p) ? null : p,
        unit: get(r, "unit"),
        bulk: isNaN(bulk) || bulk <= 0 ? null : bulk,
        sale: parseSale(get(r, "sale")),
        saleFrom: parseDate(get(r, "sale_from"), false),
        saleUntil: parseDate(get(r, "sale_until"), true),
        description: get(r, "description"),
        image: get(r, "image"),
        sort: isNaN(sort) ? 1e9 + idx : sort
      });
    });
    // Categories appear in the order of their first item; items by sort, then name.
    const firstSort = {};
    out.forEach(i => { const k = i.type + "|" + i.category; firstSort[k] = Math.min(firstSort[k] ?? Infinity, i.sort); });
    out.sort((a, b) => (firstSort[a.type + "|" + a.category] - firstSort[b.type + "|" + b.category]) || (a.sort - b.sort) || a.name.localeCompare(b.name));
    return { items: out, updated };
  }

  async function loadCatalog() {
    const url = (window.CATALOG_CSV_URL || "").trim();
    const example = !url;
    const src = example ? (window.SITE_ROOT || "") + "catalog-template.csv" : url + (url.includes("?") ? "&" : "?") + "nocache=" + Date.now();
    const res = await fetch(src, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return Object.assign(parseCatalog(await res.text(), example), { example });
  }

  function imageSrc(img) {
    const root = window.SITE_ROOT || "";
    return /^https?:\/\//i.test(img) ? img : `${root}images/${img}`;
  }

  window.SI = { parseCSV, parseNumber, parseBool, C, meta, status, loadConstants, fmt, fmtConst, tex, secId, secLink, esc,
    parseDate, fmtDate, parseSale, saleNow, parseCatalog, loadCatalog, imageSrc };
})();
