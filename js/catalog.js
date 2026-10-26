// Catalog page: reads the Catalog tab of the company sheet and lists goods and
// services, with an optional discount estimate.
(function () {
  "use strict";
  const { C, esc, fmt, parseCSV, parseNumber, parseBool, loadConstants } = SI;
  const ROOT = window.SITE_ROOT || "";
  const $ = s => document.querySelector(s);

  let items = [], category = "All", query = "", discount = 0, discChoice = "none";
  try { discChoice = localStorage.getItem("si-disc") || "none"; } catch (e) { /* storage blocked */ }

  // ---------- discount ----------
  function presets() {
    const d = C.citizen_discount;
    return [
      { id: "none", label: "No discount", value: 0 },
      { id: "home", label: `Prunia citizen or government (${fmt(d, "pct")})`, value: d },
      { id: "plan", label: `Economic Plan nation (${fmt(d, "pct")})`, value: d },
      { id: "custom", label: "Other discount", value: null }
    ];
  }
  function renderDiscount() {
    const seg = $("#disc-seg");
    seg.innerHTML = presets().map(p => `<button type="button" data-d="${p.id}" aria-pressed="${p.id === discChoice}">${esc(p.label)}</button>`).join("");
    seg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { discChoice = b.dataset.d; applyDiscount(); }));
    $("#disc-custom").addEventListener("input", applyDiscount);
    applyDiscount();
  }
  function applyDiscount() {
    try { localStorage.setItem("si-disc", discChoice); } catch (e) { /* ignore */ }
    const p = presets().find(x => x.id === discChoice) || presets()[0];
    $("#disc-seg").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.d === p.id)));
    const custom = $(".disc-custom");
    custom.hidden = p.id !== "custom";
    if (p.id === "custom") {
      const inp = $("#disc-custom");
      const n = parseNumber(inp.value);
      const ok = !isNaN(n) && n >= 0 && n <= 100;
      inp.classList.toggle("bad", !ok);
      discount = ok ? n / 100 : 0;
    } else discount = p.value;
    renderGoods(); renderServices();
  }

  // ---------- catalog ----------
  function perUnit(it) { return !it.unit ? "" : /^each$/i.test(it.unit) ? "each" : `per ${it.unit}`; }
  function priceHTML(it) {
    if (it.price === null) {
      const label = it.id.toUpperCase() === "DELIVERY" ? "Quoted by a board member" : it.type === "service" ? "Quoted" : "Price on request";
      return `<div class="price"><span class="list">${label}</span>${it.unit ? `<span class="unit">${esc(it.unit)}</span>` : ""}</div>`;
    }
    const d = it.type === "good" ? discount : 0;
    const disc = d > 0 ? `<span class="disc">${fmt(it.price * (1 - d), "cr")} <small>with ${fmt(d, "pct")} off</small></span>` : "";
    const b = C.bulk_discount;
    const bulk = it.type === "good" && it.bulk && b > 0
      ? `<span class="bulk">Order ${esc(SI.fmt(it.bulk))} or more: <b>${fmt(it.price * (1 - d) * (1 - b), "cr")}</b> ${esc(perUnit(it))} <small>(${fmt(b, "pct")} bulk discount${d > 0 ? ", combined with yours" : ""})</small></span>` : "";
    return `<div class="price"><span class="list${d > 0 ? " struck" : ""}">${fmt(it.price, "cr")}</span>${it.unit ? `<span class="unit">${esc(it.unit)}</span>` : ""}${disc}${bulk}</div>`;
  }
  function thumbHTML(it) {
    if (!it.image) return `<div class="thumb empty" aria-hidden="true"><img src="${ROOT}assets/icon-192.png" alt=""></div>`;
    const src = /^https?:\/\//i.test(it.image) ? it.image : `${ROOT}images/${it.image}`;
    return `<div class="thumb"><img src="${esc(src)}" alt="${esc(it.name)}" loading="lazy" onerror="this.parentNode.classList.add('empty');this.src='${ROOT}assets/icon-192.png';this.alt='';"></div>`;
  }
  function renderChips() {
    const cats = ["All", ...new Set(items.filter(i => i.type === "good").map(i => i.category || "Other"))];
    $("#chips").innerHTML = cats.map(c => `<button type="button" class="chip-btn" aria-pressed="${c === category}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
    $("#chips").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { category = b.dataset.c; renderChips(); renderGoods(); }));
  }
  function renderGoods() {
    const q = query.trim().toLowerCase();
    const list = items.filter(i => i.type === "good")
      .filter(i => category === "All" || (i.category || "Other") === category)
      .filter(i => !q || (i.name + " " + i.description + " " + i.category).toLowerCase().includes(q));
    $("#goods-grid").innerHTML = list.length ? list.map(it => `<article class="item">${thumbHTML(it)}<div class="item-body">
        <p class="cat">${esc(it.category || "Other")}${it.example ? ' <span class="ex">Example</span>' : ""}</p>
        <h3>${esc(it.name)}</h3>
        ${it.description ? `<p class="desc">${esc(it.description)}</p>` : ""}
        ${priceHTML(it)}
      </div></article>`).join("")
      : `<p class="empty-msg">No goods match${q ? ` "${esc(query)}"` : ""}.</p>`;
  }
  function renderServices() {
    const list = items.filter(i => i.type === "service");
    $("#services-list").innerHTML = list.length ? list.map(it => `<article class="svc">
        <div class="svc-main"><p class="cat">${esc(it.category || "Service")}${it.example ? ' <span class="ex">Example</span>' : ""}</p><h3>${esc(it.name)}</h3>${it.description ? `<p class="desc">${esc(it.description)}</p>` : ""}</div>
        ${priceHTML(it)}
      </article>`).join("") : `<p class="empty-msg">No services are listed at the moment.</p>`;
  }
  function renderStores() {
    const list = items.filter(i => i.type === "store");
    $("#stores-list").innerHTML = list.length ? list.map(it => `<li class="store">
        <span class="store-city">${esc(it.name)}${it.example ? ' <span class="ex">Example</span>' : ""}</span>
        <span class="store-nation">${esc(it.category)}</span>
        ${it.description ? `<span class="store-note">${esc(it.description)}</span>` : ""}
      </li>`).join("") : `<li class="empty-msg">Store locations will be listed here.</li>`;
    $("#delivery-fee").textContent = "Delivery is charged at a rate quoted by a board member when you place the order.";
  }

  function parseCatalog(text, example) {
    const rows = parseCSV(text);
    if (!rows.length) return { items: [], updated: null };
    const head = rows[0].map(h => h.toLowerCase().trim());
    const col = name => head.indexOf(name);
    const get = (r, name) => { const i = col(name); return i >= 0 ? (r[i] || "").trim() : ""; };
    let updated = null;
    const out = [];
    rows.slice(1).forEach((r, idx) => {
      const id = get(r, "id");
      if (id.toLowerCase() === "last_updated") { updated = get(r, "name") || get(r, "price") || null; return; }
      const name = get(r, "name");
      if (!name) return;
      const vis = get(r, "visible");
      if (vis && !parseBool(vis)) return;
      const p = parseNumber(get(r, "price"));
      const sort = parseNumber(get(r, "sort"));
      out.push({
        id, name, example,
        type: /^serv/i.test(get(r, "type")) ? "service" : /^(store|shop|location)/i.test(get(r, "type")) ? "store" : "good",
        category: get(r, "category"),
        price: isNaN(p) ? null : p,
        unit: get(r, "unit"),
        bulk: (() => { const n = parseNumber(get(r, "bulk_min")); return isNaN(n) || n <= 0 ? null : n; })(),
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
    const src = example ? ROOT + "catalog-template.csv" : url + (url.includes("?") ? "&" : "?") + "nocache=" + Date.now();
    const res = await fetch(src, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return Object.assign(parseCatalog(await res.text(), example), { example });
  }

  $("#q").addEventListener("input", e => { query = e.target.value; renderGoods(); });

  loadConstants().then(() => {
    renderDiscount();
    return loadCatalog();
  }).then(r => {
    items = r.items;
    if (r.updated) $("#cat-updated").textContent = `Last updated ${r.updated}.`;
    if (r.example) {
      const s = $("#cat-status");
      s.hidden = false;
      s.textContent = "These are example items. Connect the Catalog tab of the company sheet in js/config.js to show the real catalog.";
    }
    renderChips(); renderGoods(); renderServices(); renderStores();
  }).catch(e => {
    $("#goods-grid").innerHTML = `<p class="empty-msg">The catalog could not be loaded (${esc(e.message)}). Please try again later.</p>`;
    $("#services-list").innerHTML = "";
  });
})();
