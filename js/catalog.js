// Catalog page: reads the Catalog tab of the company sheet and lists goods,
// services, and stores, with sales from the sheet and an optional discount estimate.
(function () {
  "use strict";
  const { C, esc, fmt, fmtDate, parseNumber, saleNow, loadConstants, loadCatalog, imageSrc, imageVariant, imgAttrs, copyText } = SI;
  const ROOT = window.SITE_ROOT || "";
  const $ = s => document.querySelector(s);
  const SALE_CHIP = "On sale";
  const NEW_CHIP = "New";
  const BRAND_BG = "#050810";
  const DISCORD = window.DISCORD_URL || "https://discord.gg/qZYwghHq5J";
  let brands = {};

  // ---------- branded divisions (§3.8) ----------
  // A row of type "brand": id = the key used in the brand column, name, image = logo,
  // description = a short line, category = up to three colors: accent, highlight, background.
  function hexes(s) { return (String(s || "").match(/#[0-9a-f]{3}(?:[0-9a-f]{3})?\b/gi) || []); }
  function buildBrands() {
    brands = {};
    items.filter(i => i.type === "brand").forEach(b => {
      const key = (b.id || b.name).toUpperCase();
      const c = hexes(b.category);
      brands[key] = { key, name: b.name, image: b.image, description: b.description, example: b.example,
        accent: c[0] || "#2563ff", highlight: c[1] || c[0] || "#2563ff", bg: c[2] || BRAND_BG };
    });
  }
  function brandOf(it) { return it.brand && brands[it.brand] ? brands[it.brand] : null; }
  function slug(k) { return "brand-" + k.toLowerCase().replace(/[^a-z0-9]+/g, "-"); }
  function brandVars(b) { return `--b-acc:${b.accent};--b-hi:${b.highlight};--b-bg:${b.bg}`; }
  function badge(it) {
    const b = brandOf(it);
    return b ? `<a class="brand-badge" href="#${slug(b.key)}" style="${brandVars(b)}"><span class="chev" aria-hidden="true"></span>${esc(b.name)}</a>` : "";
  }

  // A good or service may list several categories, separated by commas: "Metals, Components".
  function catsOf(it) {
    const list = String(it.category || "").split(/[,;]/).map(s => s.trim()).filter(Boolean);
    return list.length ? list : [it.type === "service" ? "Service" : "Other"];
  }
  function catLine(it) { return esc(catsOf(it).join(" · ")); }

  let items = [], category = "All", query = "", discount = 0, discChoice = "none";
  try { discChoice = localStorage.getItem("si-disc") || "none"; } catch (e) { /* storage blocked */ }

  // ---------- discount ----------
  function presets() {
    const d = C.citizen_discount;
    return [
      { id: "none", label: "No discount", value: 0 },
      { id: "home", label: `Prunian citizen or government (${fmt(d, "pct")})`, value: d },
      { id: "plan", label: `Stetheros Compact nation (${fmt(d, "pct")})`, value: d },
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
    renderCompactList();
    renderGoods(); renderServices();
    const od = $("#order-dialog");
    if (od && od.open) renderOrder();
  }
  // The Stetheros Compact nations (rows of type "nation" on the Catalog tab), shown
  // under the discount picker when the Compact discount is chosen and at least one exists.
  function renderCompactList() {
    const box = $("#compact-list");
    if (!box) return;
    const nations = items.filter(i => i.type === "nation");
    const show = discChoice === "plan" && nations.length > 0;
    box.hidden = !show;
    if (!show) return;
    box.innerHTML = `<p class="compact-h">Stetheros Compact nations</p>
      <ul class="compact-nations">${nations.map(n => `<li>${esc(n.name)}${n.example ? ' <span class="ex">Example</span>' : ""}${n.description ? ` <span class="compact-note">${esc(n.description)}</span>` : ""}</li>`).join("")}</ul>
      <p class="fine">Citizens and governments of these nations receive the discount, and may resell discounted goods only to each other and to Prunians (<a href="policy/index.html#s11-6">§11.6</a>).</p>`;
  }

  // ---------- catalog ----------
  function perUnit(it) { return !it.unit ? "" : /^each$/i.test(it.unit) ? "each" : `per ${it.unit}`; }
  function tags(it) {
    return (SI.isNew(it) ? ' <span class="new-tag">New</span>' : "") + (saleNow(it) > 0 ? ' <span class="sale-tag">Sale</span>' : "") + (it.example ? ' <span class="ex">Example</span>' : "");
  }
  // Stock from the "stock" column. Cards show only what a buyer needs to know before
  // opening the item; the item window also shows "In stock".
  const STOCK = { in: "In stock", low: "Low stock", out: "Out of stock", order: "Made to order" };
  function stockTag(it, all) {
    if (!it.stock || (it.stock === "in" && !all)) return "";
    return `<span class="stock stock-${it.stock}">${STOCK[it.stock]}</span>`;
  }
  function priceHTML(it) {
    if (it.price === null) {
      const label = it.id.toUpperCase() === "DELIVERY" ? "Quoted by a board member" : it.type === "service" ? "Quoted" : "Price on request";
      return `<div class="price"><span class="list">${label}</span>${it.unit ? `<span class="unit">${esc(it.unit)}</span>` : ""}</div>`;
    }
    const s = saleNow(it);
    const d = it.type === "good" ? discount : 0;
    const now = it.price * (1 - s) * (1 - d);
    const parts = [];
    if (s > 0) parts.push(`the ${fmt(s, "pct")} sale`);
    if (d > 0) parts.push(`your ${fmt(d, "pct")} discount`);
    const disc = parts.length ? `<span class="disc">${fmt(now, "cr")} <small>with ${parts.join(" and ")}</small></span>` : "";
    const ends = s > 0 && it.saleUntil ? `<span class="sale-ends">Sale ends ${esc(fmtDate(it.saleUntil))}</span>` : "";
    const b = C.bulk_discount;
    const bulk = it.type === "good" && it.bulk && b > 0
      ? `<span class="bulk">Order ${esc(fmt(it.bulk))} or more: <b>${fmt(now * (1 - b), "cr")}</b> <span class="per">${esc(perUnit(it))}</span> <small>(${fmt(b, "pct")} bulk discount${parts.length ? `, combined with ${parts.join(" and ")}` : ""})</small></span>` : "";
    return `<div class="price"><span class="list${parts.length ? " struck" : ""}">${fmt(it.price, "cr")}</span>${it.unit ? `<span class="unit">${esc(it.unit)}</span>` : ""}${disc}${ends}${bulk}</div>`;
  }
  function thumbHTML(it, cls) {
    cls = cls || "thumb";
    if (!it.image) return `<div class="${cls} empty" aria-hidden="true"><img src="${ROOT}assets/icon-192.png" alt=""></div>`;
    return `<div class="${cls}"><img ${imgAttrs(it.image, "thumb")} alt="${esc(it.name)}" loading="lazy" onerror="if(!SI.imgRetry(this)){this.onerror=null;this.parentNode.classList.add('empty');this.src='${ROOT}assets/icon-192.png';this.alt='';}"></div>`;
  }
  // ---------- filters and search (goods and services each have their own) ----------
  function anySale(type) { return items.some(i => i.type === type && saleNow(i) > 0); }
  function anyNew(type) { return items.some(i => i.type === type && SI.isNew(i)); }
  function matches(i, cat, q) {
    const inCat = cat === "All" || (cat === SALE_CHIP ? saleNow(i) > 0 : cat === NEW_CHIP ? SI.isNew(i) : catsOf(i).includes(cat));
    return inCat && (!q || (i.name + " " + i.description + " " + i.category + " " + (i.details || "")).toLowerCase().includes(q));
  }
  function chipsFor(type, host, current, onPick) {
    const cats = ["All", ...(anyNew(type) ? [NEW_CHIP] : []), ...(anySale(type) ? [SALE_CHIP] : []), ...new Set(items.filter(i => i.type === type).flatMap(catsOf))];
    if (!cats.includes(current)) current = "All";
    host.innerHTML = cats.map(c => `<button type="button" class="chip-btn${c === SALE_CHIP ? " chip-sale" : c === NEW_CHIP ? " chip-new" : ""}" aria-pressed="${c === current}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
    host.querySelectorAll("button").forEach(b => b.addEventListener("click", () => onPick(b.dataset.c)));
    return current;
  }
  let svcCategory = "All", svcQuery = "", goodsSort = "featured", svcSort = "featured", hideOut = false;
  // Sorting. "Featured" is the order set in the sheet's sort column.
  function nowPrice(it) { return it.price === null ? null : it.price * (1 - saleNow(it)); }
  function sorted(list, how) {
    const by = {
      featured: () => 0,
      new: (a, b) => (b.listed ? b.listed.getTime() : -Infinity) - (a.listed ? a.listed.getTime() : -Infinity),
      "price-asc": (a, b) => (nowPrice(a) ?? Infinity) - (nowPrice(b) ?? Infinity),
      "price-desc": (a, b) => (nowPrice(b) ?? -Infinity) - (nowPrice(a) ?? -Infinity),
      name: (a, b) => a.name.localeCompare(b.name)
    }[how] || (() => 0);
    return list.map((it, i) => [it, i]).sort((x, y) => by(x[0], y[0]) || x[1] - y[1]).map(x => x[0]);
  }
  function renderTools() {
    const ho = $("#hide-out-wrap");
    if (ho) ho.hidden = !items.some(i => i.type === "good" && i.stock === "out");
    const anyListed = type => items.some(i => i.type === type && i.listed instanceof Date);
    [["#sort-goods", "good"], ["#sort-svc", "service"]].forEach(([sel, type]) => {
      const el = $(sel);
      if (!el) return;
      const opt = el.querySelector('option[value="new"]');
      if (opt) opt.hidden = opt.disabled = !anyListed(type);
    });
  }
  function renderChips() {
    category = chipsFor("good", $("#chips"), category, c => { category = c; renderChips(); renderGoods(); });
    const sc = $("#chips-svc");
    if (sc) svcCategory = chipsFor("service", sc, svcCategory, c => { svcCategory = c; renderChips(); renderServices(); });
  }
  function renderGoods() {
    const q = query.trim().toLowerCase();
    const list = sorted(items.filter(i => i.type === "good").filter(i => matches(i, category, q)).filter(i => !(hideOut && i.stock === "out")), goodsSort);
    $("#goods-grid").innerHTML = list.length ? list.map(it => goodHTML(it, true)).join("")
      : `<p class="empty-msg">No goods match${q ? ` "${esc(query)}"` : ""}.</p>`;
    renderBrands();
  }
  function goodHTML(it, withBadge) {
    return `<article class="item${saleNow(it) > 0 ? " on-sale" : ""}${it.stock === "out" ? " is-out" : ""}"><div class="thumb-open" data-item="${esc(itemKey(it))}" aria-hidden="true">${thumbHTML(it)}</div><div class="item-body">
        <p class="cat">${catLine(it)}${tags(it)}</p>
        ${withBadge ? badge(it) : ""}
        <h3>${titleBtn(it)}</h3>
        ${it.description ? `<p class="desc">${esc(it.description)}</p>` : ""}
        ${stockTag(it)}
        ${priceHTML(it)}
        ${moreBtn(it)}
      </div></article>`;
  }
  function svcHTML(it, withBadge) {
    return `<article class="svc"><div class="thumb-open svc-thumb" data-item="${esc(itemKey(it))}" aria-hidden="true">${thumbHTML(it)}</div>
        <div class="svc-main"><p class="cat">${catLine(it)}${tags(it)}</p>${withBadge ? badge(it) : ""}<h3>${titleBtn(it)}</h3>${it.description ? `<p class="desc">${esc(it.description)}</p>` : ""}${stockTag(it)}${moreBtn(it)}</div>
        ${priceHTML(it)}
      </article>`;
  }
  function renderBrands() {
    const host = $("#brand-zones");
    if (!host) return;
    host.innerHTML = Object.values(brands).map(b => {
      const goods = items.filter(i => i.type === "good" && i.brand === b.key);
      const svcs = items.filter(i => i.type === "service" && i.brand === b.key);
      const logo = b.image ? `<img class="brand-logo" ${imgAttrs(b.image, "opt")} onerror="SI.imgRetry(this)" alt="${esc(b.name)} logo" loading="lazy">` : "";
      return `<section class="brand-zone" id="${slug(b.key)}" style="${brandVars(b)}" aria-labelledby="${slug(b.key)}-h">
        <div class="wrap brand-inner">
          <header class="brand-head">${logo}<div>
            <p class="brand-kicker">A branded division of Stetheros Industries${b.example ? ' <span class="ex">Example</span>' : ""}</p>
            <h2 id="${slug(b.key)}-h">${esc(b.name)}</h2>
            ${b.description ? `<p class="brand-desc">${esc(b.description)}</p>` : ""}
            <p class="brand-note">Sold through Stetheros Industries shops, at the same prices, discounts, and terms as every other company good (<a href="policy/index.html#s3-8">§3.8</a>).</p>
          </div></header>
          ${goods.length ? `<h3 class="brand-sub">Goods</h3><div class="grid">${goods.map(it => goodHTML(it, false)).join("")}</div>` : ""}
          ${svcs.length ? `<h3 class="brand-sub">Services</h3><div class="services">${svcs.map(it => svcHTML(it, false)).join("")}</div>` : ""}
          ${!goods.length && !svcs.length ? `<p class="empty-msg">Goods from ${esc(b.name)} will be listed here.</p>` : ""}
        </div>
      </section>`;
    }).join("");
  }
  function renderServices() {
    const all = items.filter(i => i.type === "service");
    const q = svcQuery.trim().toLowerCase();
    const list = sorted(all.filter(i => matches(i, svcCategory, q)), svcSort);
    $("#services-list").innerHTML = list.length ? list.map(it => svcHTML(it, true)).join("")
      : all.length ? `<p class="empty-msg">No services match${q ? ` "${esc(svcQuery)}"` : ""}.</p>`
      : `<p class="empty-msg">No services are listed at the moment.</p>`;
  }
  // Stores can be filtered by nation; the drop-down appears when stores span two or more nations.
  let storeNation = "";
  function renderStoreFilter() {
    const sel = $("#store-nation");
    if (!sel) return;
    const nations = [...new Set(items.filter(i => i.type === "store").map(i => i.category.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    sel.closest("label").hidden = nations.length < 2;
    if (!nations.includes(storeNation)) storeNation = "";
    sel.innerHTML = `<option value="">All nations</option>` + nations.map(n => `<option value="${esc(n)}"${n === storeNation ? " selected" : ""}>${esc(n)}</option>`).join("");
  }
  // The "coords" column holds the store's in-game coordinates, such as "1200 64 -340"
  // (X Y Z) or "1200 -340" (X Z). The "map" column may hold a link to a web map.
  function coordNums(s) { return (String(s || "").match(/-?\d+(?:\.\d+)?/g) || []); }
  function coordsHTML(it) {
    const n = coordNums(it.coords);
    const map = /^https?:\/\//i.test(it.map) ? `<a class="store-map" href="${esc(it.map)}" target="_blank" rel="noopener">Open map</a>` : "";
    if (n.length < 2 && !map) return "";
    const axes = n.length === 2 ? ["X", "Z"] : ["X", "Y", "Z"];
    const shown = n.length >= 2 ? n.slice(0, 3).map((v, i) => `<span><i>${axes[i]}</i> ${esc(v)}</span>`).join("") : "";
    return `<span class="store-coords">${shown}${shown ? `<button type="button" class="copy-coords" data-coords="${esc(n.slice(0, 3).join(" "))}" aria-label="Copy the coordinates of ${esc(it.name)}">Copy</button>` : ""}${map}</span>`;
  }
  function renderStores() {
    const list = items.filter(i => i.type === "store" && (!storeNation || i.category.trim() === storeNation));
    $("#stores-list").innerHTML = list.length ? list.map(it => `<li class="store">
        ${thumbHTML(it, "store-img")}
        <div class="store-text">
          <span class="store-city">${esc(it.name)}${it.example ? ' <span class="ex">Example</span>' : ""}</span>
          <span class="store-nation">${esc(it.category)}</span>
          ${it.description ? `<span class="store-note">${esc(it.description)}</span>` : ""}
          ${coordsHTML(it)}
        </div>
      </li>`).join("") : `<li class="empty-msg">Store locations will be listed here.</li>`;
    $("#delivery-fee").textContent = "Delivery is charged at a rate quoted by a board member when you place the order.";
  }

  $("#q").addEventListener("input", e => { query = e.target.value; renderGoods(); });
  if ($("#store-nation")) $("#store-nation").addEventListener("change", e => { storeNation = e.target.value; renderStores(); });
  if ($("#q-svc")) $("#q-svc").addEventListener("input", e => { svcQuery = e.target.value; renderServices(); });
  if ($("#sort-goods")) $("#sort-goods").addEventListener("change", e => { goodsSort = e.target.value; renderGoods(); });
  if ($("#sort-svc")) $("#sort-svc").addEventListener("change", e => { svcSort = e.target.value; renderServices(); });
  if ($("#hide-out")) $("#hide-out").addEventListener("change", e => { hideOut = e.target.checked; renderGoods(); });
  document.addEventListener("click", e => {
    const b = e.target.closest(".copy-coords");
    if (!b) return;
    copyText(b.dataset.coords, () => { b.textContent = "Copied"; setTimeout(() => { b.textContent = "Copy"; }, 1600); });
  });

  // ---------- announcement banner ----------
  // A row of type "notice": name = the headline, description = the text, and the optional
  // sale_from and sale_until dates set when it shows. category may be "warning" or "sale"
  // to change its color. Visitors can dismiss a notice; a changed notice shows again.
  function noticeId(n) { return "si-notice-" + (n.id || n.name) + "-" + (n.name + n.description).length; }
  function renderNotices() {
    const host = $("#site-notices");
    if (!host) return;
    const now = new Date();
    const live = items.filter(n => n.type === "notice"
      && n.saleFrom !== undefined && n.saleUntil !== undefined
      && !(n.saleFrom && now < n.saleFrom) && !(n.saleUntil && now > n.saleUntil)
      && !(() => { try { return localStorage.getItem(noticeId(n)); } catch (e) { return null; } })());
    host.hidden = !live.length;
    host.innerHTML = live.map(n => {
      const tone = /warn|alert|urgent/i.test(n.category) ? " warn" : /sale|promo/i.test(n.category) ? " sale" : "";
      return `<div class="site-notice${tone}" data-nid="${esc(noticeId(n))}" role="status">
        <p><strong>${esc(n.name)}</strong>${n.description ? ` ${esc(n.description)}` : ""}${n.saleUntil ? ` <span class="notice-until">Until ${esc(fmtDate(n.saleUntil))}.</span>` : ""}</p>
        <button type="button" class="notice-x" aria-label="Dismiss this notice">&times;</button></div>`;
    }).join("");
    host.querySelectorAll(".notice-x").forEach(b => b.addEventListener("click", () => {
      const box = b.closest(".site-notice");
      try { localStorage.setItem(box.dataset.nid, "1"); } catch (e) { /* ignore */ }
      box.remove();
      host.hidden = !host.children.length;
    }));
  }

  // ---------- order list ----------
  // Visitors collect goods and services in a list kept in their own browser, then copy it
  // as a message for the Sales role on Discord. Nothing is sent anywhere by the site.
  let order = [];
  let orderMeta = { name: "", where: "", note: "" };
  function saveOrder() {
    try { localStorage.setItem("si-order", JSON.stringify(order)); localStorage.setItem("si-order-meta", JSON.stringify(orderMeta)); } catch (e) { /* ignore */ }
  }
  function loadOrder() {
    try {
      const o = JSON.parse(localStorage.getItem("si-order") || "[]");
      const m = JSON.parse(localStorage.getItem("si-order-meta") || "{}");
      order = Array.isArray(o) ? o.filter(l => l && byKey(l.k) && l.q > 0) : [];
      orderMeta = Object.assign(orderMeta, m && typeof m === "object" ? m : {});
    } catch (e) { order = []; }
  }
  function byKey(k) { return items.find(i => (i.type === "good" || i.type === "service") && itemKey(i) === k); }
  function qtyOf(k) { const l = order.find(x => x.k === k); return l ? l.q : 0; }
  function setQty(k, q) {
    order = order.filter(l => l.k !== k);
    if (q > 0) order.push({ k, q });
    saveOrder(); renderOrderFab();
    const od = $("#order-dialog");
    if (od && od.open) renderOrder();
  }
  // The estimated price per unit, with the sale, the visitor's discount (goods only), and,
  // from the bulk quantity up, the bulk discount, each applied in turn (§3.2).
  function lineFor(it, q) {
    if (it.price === null) return { it, q, unit: null, total: null, full: null, bulk: false, discs: [] };
    const d = it.type === "good" ? discount : 0;
    const sale = saleNow(it);
    let unit = it.price * (1 - sale) * (1 - d);
    const bulk = it.type === "good" && it.bulk && C.bulk_discount > 0 && q >= it.bulk;
    if (bulk) unit *= 1 - C.bulk_discount;
    const discs = [];
    if (sale > 0) discs.push(`${fmt(sale, "pct")} sale`);
    if (d > 0) discs.push(`${fmt(d, "pct")} ${customerDiscName()} discount`);
    if (bulk) discs.push(`${fmt(C.bulk_discount, "pct")} bulk discount`);
    return { it, q, unit, total: unit * q, full: it.price * q, bulk, discs };
  }
  function unitWord(it) { return it.unit ? (/^each$/i.test(it.unit) ? "" : it.unit) : ""; }
  function orderControlsHTML(it, msg) {
    if (!it) return "";
    const have = qtyOf(itemKey(it));
    const unit = unitWord(it);
    const bulk = it.type === "good" && it.bulk && C.bulk_discount > 0 ? ` <span class="hint">Bulk price from ${esc(fmt(it.bulk))}.</span>` : "";
    return `<div class="dlg-order">
      <label for="dlg-qty"><span>Quantity${unit ? ` <small>(${esc(unit)})</small>` : ""}</span>
        <input id="dlg-qty" type="text" inputmode="decimal" autocomplete="off" value="${have || (it.type === "good" && it.bulk ? "1" : "1")}"></label>
      <button type="button" class="btn" data-add>${have ? "Update order list" : "Add to order list"}</button>
      ${have ? `<button type="button" class="btn ghost" data-remove>Remove</button>` : ""}
      ${order.length ? `<button type="button" class="linkish" data-open-order>View order list (${order.length})</button>` : ""}
      ${bulk}${msg ? `<span class="dlg-order-msg" role="status">${esc(msg)}</span>` : ""}
    </div>`;
  }
  function renderOrderFab() {
    const fab = $("#order-fab");
    if (!fab) return;
    fab.hidden = !order.length;
    fab.querySelector("[data-count]").textContent = order.length;
    document.body.classList.toggle("has-order", order.length > 0);
  }
  // The customer's discount, named for the order: "Prunian citizen or government", and so on.
  function customerDiscName() {
    return { home: "Prunian citizen or government", plan: "Stetheros Compact", custom: "other" }[discChoice] || "customer";
  }
  function discountLabel() {
    const p = presets().find(x => x.id === discChoice);
    if (!discount || !p || p.id === "none") return "";
    return p.id === "custom" ? `Other discount (${fmt(discount, "pct")})` : p.label;
  }
  function stores() { return items.filter(i => i.type === "store"); }
  function renderOrder() {
    const od = $("#order-dialog");
    const lines = order.map(l => lineFor(byKey(l.k), l.q)).filter(l => l.it);
    const priced = lines.filter(l => l.total !== null);
    const sum = priced.reduce((a, l) => a + l.total, 0);
    const full = priced.reduce((a, l) => a + l.full, 0);
    const saved = full - sum;
    const quoted = lines.length - priced.length;
    const where = [["", "Choose…"], ...stores().map(s => [`store:${s.name}`, `Pick up at ${s.name}${s.category ? `, ${s.category}` : ""}`]), ["delivery", "Delivery (rate quoted by a board member)"]];
    const disc = discountLabel();
    od.innerHTML = `<div class="dlg-head"><div><p class="cat">Kept in this browser only</p><h2 id="order-title">Your order list</h2></div>
        <button type="button" class="dlg-close" data-close aria-label="Close">&times;</button></div>
      ${lines.length ? `<div class="tablewrap"><table class="order-table"><thead><tr><th>Item</th><th class="numc">Quantity</th><th class="numc">Estimate</th><th><span class="visually-hidden">Remove</span></th></tr></thead><tbody>
        ${lines.map(l => `<tr data-k="${esc(itemKey(l.it))}"><td><button type="button" class="title-btn" data-item="${esc(itemKey(l.it))}">${esc(l.it.name)}</button>${unitWord(l.it) ? `<small>${esc(unitWord(l.it))}</small>` : ""}${l.discs.length ? `<small class="ol-discs">${esc(l.discs.join(" · "))}</small>` : ""}${l.it.stock === "out" ? ' <span class="stock stock-out">Out of stock</span>' : ""}</td>
          <td class="numc"><input class="ol-qty" type="text" inputmode="decimal" value="${esc(String(l.q))}" aria-label="Quantity of ${esc(l.it.name)}"></td>
          <td class="numc">${l.total === null ? (l.it.type === "service" ? "Quoted" : "On request") : fmt(l.total, "cr")}</td>
          <td><button type="button" class="ol-x" aria-label="Remove ${esc(l.it.name)}">&times;</button></td></tr>`).join("")}
        </tbody><tfoot>${saved > 0.005 ? `<tr class="full"><th colspan="2">Without discounts</th><td class="numc"><s>${fmt(full, "cr")}</s></td><td></td></tr>` : ""}
          <tr><th colspan="2">Estimated total${quoted ? `, plus ${quoted} quoted item${quoted > 1 ? "s" : ""}` : ""}</th><td class="numc"><b>${fmt(sum, "cr")}</b></td><td></td></tr>
          ${saved > 0.005 ? `<tr class="full save"><th colspan="2">You save</th><td class="numc">${fmt(saved, "cr")}</td><td></td></tr>` : ""}</tfoot></table></div>
        <p class="fine">${disc ? `Includes your discount: ${esc(disc)}. ` : "No customer discount is included; choose one at the top of the catalog if it applies to you. "}Sales and bulk prices are applied where they apply. This is an estimate: the Sales role confirms the final price.</p>
        <div class="order-form">
          <label><span>Your in-game name</span><input id="ol-name" type="text" autocomplete="off" value="${esc(orderMeta.name)}"></label>
          <label><span>Preferred pickup or delivery</span><select id="ol-where">${where.map(([v, t]) => `<option value="${esc(v)}"${v === orderMeta.where ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>
            <span class="where-note">Pickup may not be possible for large orders or certain items. The member who fulfills your order will tell you how it will be delivered.</span></label>
          <label class="wide"><span>Note (optional)</span><textarea id="ol-note" rows="2">${esc(orderMeta.note)}</textarea></label>
        </div>
        <ol class="order-steps"><li>Copy the order.</li><li>Join our Discord server and send it to someone with the <strong>@Sales</strong> role${lines.some(l => l.it.contact) ? ", or to the contact named on an item" : ""}.</li></ol>
        <div class="dlg-actions"><button type="button" class="btn" data-copy-order>Copy order</button><a class="btn ghost" href="${esc(DISCORD)}" target="_blank" rel="noopener" data-discord>Open the Discord server</a><button type="button" class="linkish" data-clear>Clear the list</button></div>`
      : `<p>Your order list is empty. Open any good or service to add it.</p>`}`;
  }
  function orderText() {
    const lines = order.map(l => lineFor(byKey(l.k), l.q)).filter(l => l.it);
    const sum = lines.filter(l => l.total !== null).reduce((a, l) => a + l.total, 0);
    const full = lines.filter(l => l.total !== null).reduce((a, l) => a + l.full, 0);
    const quoted = lines.filter(l => l.total === null).length;
    const out = ["**Order for Stetheros Industries**"];
    if (orderMeta.name) out.push(`Name: ${orderMeta.name}`);
    if (orderMeta.where === "delivery") out.push("Delivery: please quote a delivery rate");
    else if (orderMeta.where.startsWith("store:")) out.push(`Preferred pickup: ${orderMeta.where.slice(6)}`);
    const disc = discountLabel();
    if (disc) out.push(`Customer discount claimed: ${disc}`);
    out.push("");
    lines.forEach(l => {
      const u = unitWord(l.it);
      const what = `${fmt(l.q)} × ${l.it.name}${u ? ` (${u})` : ""}`;
      const price = l.total === null ? "to be quoted" : `${fmt(l.total, "cr")}${l.discs.length ? ` (${l.discs.join(", ")})` : ""}`;
      out.push(`- ${what}: ${price}${l.it.contact ? ` [contact ${l.it.contact}]` : ""}`);
    });
    out.push("", `Estimated total: ${fmt(sum, "cr")}${quoted ? `, plus ${quoted} item${quoted > 1 ? "s" : ""} to be quoted` : ""}${orderMeta.where === "delivery" ? ", plus delivery" : ""}`);
    if (full - sum > 0.005) out.push(`Without discounts: ${fmt(full, "cr")} (saving ${fmt(full - sum, "cr")})`);
    if (orderMeta.note.trim()) out.push(`Note: ${orderMeta.note.trim()}`);
    return out.join("\n");
  }
  function openOrder() {
    const od = $("#order-dialog");
    if (!od) return;
    renderOrder();
    if (!od.open) od.showModal();
    track("order-list", "Order list opened");
  }
  (function wireOrder() {
    const od = $("#order-dialog"), fab = $("#order-fab");
    if (!od || !fab) return;
    fab.addEventListener("click", openOrder);
    closeOnBackdrop(od);
    od.addEventListener("click", e => {
      if (e.target.closest("[data-close]")) { od.close(); return; }
      const x = e.target.closest(".ol-x");
      if (x) { setQty(x.closest("tr").dataset.k, 0); return; }
      if (e.target.closest(".title-btn")) { od.close(); return; } // the item window opens from the shared handler
      if (e.target.closest("[data-clear]")) { order = []; saveOrder(); renderOrderFab(); renderOrder(); return; }
      const c = e.target.closest("[data-copy-order]");
      if (c) {
        const missing = !orderMeta.where;
        copyText(orderText(), () => { c.textContent = "Order copied"; setTimeout(() => { c.textContent = "Copy order"; }, 2000); });
        track("order-copied", "Order copied");
        if (missing) od.querySelector("#ol-where").classList.add("bad");
      }
    });
    od.addEventListener("change", e => {
      if (e.target.classList.contains("ol-qty")) {
        const q = parseNumber(e.target.value);
        if (q > 0) setQty(e.target.closest("tr").dataset.k, q); else e.target.classList.add("bad");
      }
    });
    od.addEventListener("input", e => {
      if (e.target.id === "ol-name") orderMeta.name = e.target.value;
      else if (e.target.id === "ol-where") { orderMeta.where = e.target.value; e.target.classList.remove("bad"); }
      else if (e.target.id === "ol-note") orderMeta.note = e.target.value;
      else return;
      saveOrder();
    });
  })();

  // ---------- item details (a pop-up window, one at a time) ----------
  // An item gets a "More info" button when its row has text in "details" or files in "gallery".
  function hasMore(it) { return !!(it.details || it.gallery.length); }
  function itemKey(it) { return String(it.id || it.name).replace(/[^A-Za-z0-9_-]+/g, "-"); }
  // Every good and service opens its window (with a shareable link) from its name or picture.
  function titleBtn(it) {
    return `<button type="button" class="title-btn" data-item="${esc(itemKey(it))}" title="Open ${esc(it.name)}">${esc(it.name)}</button>`;
  }
  function moreBtn(it) {
    return hasMore(it) ? `<button type="button" class="more-btn" data-item="${esc(itemKey(it))}">More info</button>` : "";
  }
  // Plain text from the sheet: blank lines separate paragraphs, lines starting "- " are bullets.
  function detailsHTML(s) {
    const out = []; let para = [], list = [];
    const flushP = () => { if (para.length) out.push(`<p>${para.map(esc).join("<br>")}</p>`); para = []; };
    const flushL = () => { if (list.length) out.push(`<ul>${list.map(l => `<li>${esc(l)}</li>`).join("")}</ul>`); list = []; };
    String(s).split("\n").forEach(raw => {
      const l = raw.trim();
      if (!l) { flushP(); flushL(); return; }
      const m = l.match(/^[-*\u2022]\s+(.*)$/);
      if (m) { flushP(); list.push(m[1]); } else { flushL(); para.push(l); }
    });
    flushP(); flushL();
    return out.join("");
  }
  function contactHTML(it) {
    const who = it.contact ? `<strong>${esc(it.contact)}</strong>` : `someone with the <strong>@Sales</strong> role`;
    const what = it.type === "service"
      ? `To book this service, join our Discord server and message ${who}. You pay when you book, and the payment is held in escrow until the job is done (<a href="policy/index.html#s8-4">§8.4</a>).`
      : `Buy it at any Stetheros Industries shop (<a href="#stores" data-close>store locations</a>). For a custom or bulk order, join our Discord server and message ${who}.`;
    return `<div class="dlg-contact"><p>${what}</p>
      <div class="dlg-actions"><a class="btn" href="${esc(DISCORD)}" target="_blank" rel="noopener" data-discord>Join the Discord server</a>
      <button type="button" class="btn ghost" data-copy>Copy link to this item</button></div></div>`;
  }
  function dialogHTML(it) {
    const seen = new Set();
    const pics = [it.image, ...it.gallery].filter(p => p && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()));
    const media = pics.length ? `<div class="dlg-media">
        <div class="dlg-main"><img ${imgAttrs(pics[0], "opt")} alt="${esc(it.name)}" onerror="SI.imgRetry(this)"></div>
        ${pics.length > 1 ? `<div class="dlg-thumbs">${pics.map((p, i) => `<button type="button" data-pic="${esc(p)}" aria-pressed="${i === 0}" aria-label="Picture ${i + 1} of ${pics.length}"><img ${imgAttrs(p, "thumb")} alt="" onerror="if(!SI.imgRetry(this)){this.onerror=null;this.parentNode.hidden=true;}"></button>`).join("")}</div>` : ""}
      </div>` : "";
    return `<div class="dlg-head"><div>
        <p class="cat">${catLine(it)}${tags(it)}</p>
        ${badge(it)}
        <h2 id="dlg-title">${esc(it.name)}</h2></div>
        <button type="button" class="dlg-close" data-close aria-label="Close" autofocus>&times;</button></div>
      ${media}
      ${it.description ? `<p class="dlg-desc">${esc(it.description)}</p>` : ""}
      ${stockTag(it, true) ? `<p class="dlg-stock">${stockTag(it, true)}</p>` : ""}
      ${priceHTML(it)}
      ${orderControlsHTML(it)}
      ${it.details ? `<div class="dlg-details">${detailsHTML(it.details)}</div>` : ""}
      ${contactHTML(it)}`;
  }
  const track = (path, title) => window.siTrack && window.siTrack(path, title);
  // A dialog closes when the visitor clicks the dimmed area around it: the press and the
  // release must both land outside the window. A click on empty space inside the window,
  // or a drag (such as selecting text in a box) that ends outside it, does not close it.
  function outsideBox(d, e) {
    const r = d.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  }
  function closeOnBackdrop(d) {
    let pressedOutside = false;
    d.addEventListener("pointerdown", e => { pressedOutside = e.target === d && outsideBox(d, e); });
    d.addEventListener("click", e => {
      if (pressedOutside && e.target === d && outsideBox(d, e)) d.close();
      pressedOutside = false;
    });
  }
  function currentItem() { return items.find(i => (i.type === "good" || i.type === "service") && itemKey(i) === dlg.dataset.item); }
  const dlg = $("#item-dialog");
  function openItem(key) {
    const it = items.find(i => (i.type === "good" || i.type === "service") && itemKey(i) === key);
    if (!it || !dlg) return false;
    const b = brandOf(it);
    dlg.className = "item-dialog" + (b ? " dlg-brand" : "");
    dlg.setAttribute("style", b ? brandVars(b) : "");
    dlg.innerHTML = dialogHTML(it);
    dlg.dataset.item = key;
    if (!dlg.open) dlg.showModal();
    track("item-" + key, it.name);
    dlg.scrollTop = 0;
    history.replaceState(null, "", "#item-" + key);
    return true;
  }
  if (dlg) {
    closeOnBackdrop(dlg);
    dlg.addEventListener("click", e => {
      if (e.target.closest("[data-close]") || e.target.closest(".brand-badge")) { dlg.close(); return; }
      const pic = e.target.closest("[data-pic]");
      if (pic) {
        const main = dlg.querySelector(".dlg-main img");
        main.removeAttribute("data-orig"); main.removeAttribute("data-tried");
        const small = imageVariant(pic.dataset.pic, "opt"), orig = imageSrc(pic.dataset.pic);
        if (small !== orig) main.setAttribute("data-fallback", orig); else main.removeAttribute("data-fallback");
        main.src = small;
        dlg.querySelectorAll("[data-pic]").forEach(x => x.setAttribute("aria-pressed", String(x === pic)));
      }
      const copy = e.target.closest("[data-copy]");
      if (copy) {
        // Each item has its own page at /item/<key>/, which shows a preview with the item's
        // name, price, and picture when the link is pasted into Discord, then opens this window.
        const url = new URL(ROOT + "item/" + encodeURIComponent(dlg.dataset.item) + "/", location.href).href;
        copyText(url, () => { copy.textContent = "Link copied"; setTimeout(() => { copy.textContent = "Copy link to this item"; }, 2000); });
      }
      const add = e.target.closest("[data-add]");
      if (add) {
        const q = parseNumber(dlg.querySelector("#dlg-qty").value);
        if (!(q > 0)) { dlg.querySelector("#dlg-qty").classList.add("bad"); return; }
        setQty(dlg.dataset.item, q);
        dlg.querySelector(".dlg-order").outerHTML = orderControlsHTML(currentItem(), "Added to your order list.");
      }
      const rem = e.target.closest("[data-remove]");
      if (rem) {
        setQty(dlg.dataset.item, 0);
        dlg.querySelector(".dlg-order").outerHTML = orderControlsHTML(currentItem(), "Removed from your order list.");
      }
      if (e.target.closest("[data-open-order]")) { dlg.close(); openOrder(); }
    });
    dlg.addEventListener("close", () => {
      if (location.hash.startsWith("#item-")) history.replaceState(null, "", location.pathname + location.search);
    });
  }
  window.addEventListener("hashchange", () => {
    if (location.hash.startsWith("#item-")) openItem(decodeURIComponent(location.hash.slice(6)));
  });
  document.addEventListener("click", e => {
    const btn = e.target.closest(".more-btn, .title-btn, .thumb-open");
    if (btn) openItem(btn.dataset.item);
  });

  loadConstants().then(() => {
    renderDiscount();
    return loadCatalog();
  }).then(r => {
    items = r.items;
    buildBrands();
    renderCompactList();
    if (r.updated) $("#cat-updated").textContent = `Last updated ${r.updated}.`;
    if (r.example) {
      const s = $("#cat-status");
      s.hidden = false;
      s.textContent = "These are example items. Connect the Catalog tab of the company sheet in js/config.js to show the real catalog.";
    }
    renderNotices(); renderTools();
    renderChips(); renderGoods(); renderServices(); renderStoreFilter(); renderStores();
    loadOrder(); renderOrderFab();
    // Sections such as a division's are built after the page loads, so the browser
    // cannot jump to a link like index.html#brand-ihi by itself. Do it now.
    if (location.hash.startsWith("#item-")) openItem(decodeURIComponent(location.hash.slice(6)));
    else if (location.hash.length > 1) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) requestAnimationFrame(() => target.scrollIntoView());
    }
  }).catch(e => {
    $("#goods-grid").innerHTML = `<p class="empty-msg">The catalog could not be loaded (${esc(e.message)}). Please try again later.</p>`;
    $("#services-list").innerHTML = "";
    $("#stores-list").innerHTML = "";
  });
})();
