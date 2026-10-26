// Catalog page: reads the Catalog tab of the company sheet and lists goods,
// services, and stores, with sales from the sheet and an optional discount estimate.
(function () {
  "use strict";
  const { C, esc, fmt, fmtDate, parseNumber, saleNow, loadConstants, loadCatalog, imageSrc } = SI;
  const ROOT = window.SITE_ROOT || "";
  const $ = s => document.querySelector(s);
  const SALE_CHIP = "On sale";
  const BRAND_BG = "#050810";
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
  function tags(it) {
    return (saleNow(it) > 0 ? ' <span class="sale-tag">Sale</span>' : "") + (it.example ? ' <span class="ex">Example</span>' : "");
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
      ? `<span class="bulk">Order ${esc(fmt(it.bulk))} or more: <b>${fmt(now * (1 - b), "cr")}</b> ${esc(perUnit(it))} <small>(${fmt(b, "pct")} bulk discount${parts.length ? `, combined with ${parts.join(" and ")}` : ""})</small></span>` : "";
    return `<div class="price"><span class="list${parts.length ? " struck" : ""}">${fmt(it.price, "cr")}</span>${it.unit ? `<span class="unit">${esc(it.unit)}</span>` : ""}${disc}${ends}${bulk}</div>`;
  }
  function thumbHTML(it, cls) {
    cls = cls || "thumb";
    if (!it.image) return `<div class="${cls} empty" aria-hidden="true"><img src="${ROOT}assets/icon-192.png" alt=""></div>`;
    return `<div class="${cls}"><img src="${esc(imageSrc(it.image))}" alt="${esc(it.name)}" loading="lazy" onerror="this.parentNode.classList.add('empty');this.src='${ROOT}assets/icon-192.png';this.alt='';"></div>`;
  }
  function anySale() { return items.some(i => i.type === "good" && saleNow(i) > 0); }
  function renderChips() {
    const cats = ["All", ...(anySale() ? [SALE_CHIP] : []), ...new Set(items.filter(i => i.type === "good").map(i => i.category || "Other"))];
    if (!cats.includes(category)) category = "All";
    $("#chips").innerHTML = cats.map(c => `<button type="button" class="chip-btn${c === SALE_CHIP ? " chip-sale" : ""}" aria-pressed="${c === category}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
    $("#chips").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { category = b.dataset.c; renderChips(); renderGoods(); }));
  }
  function renderGoods() {
    const q = query.trim().toLowerCase();
    const list = items.filter(i => i.type === "good")
      .filter(i => category === "All" || (category === SALE_CHIP ? saleNow(i) > 0 : (i.category || "Other") === category))
      .filter(i => !q || (i.name + " " + i.description + " " + i.category).toLowerCase().includes(q));
    $("#goods-grid").innerHTML = list.length ? list.map(it => goodHTML(it, true)).join("")
      : `<p class="empty-msg">No goods match${q ? ` "${esc(query)}"` : ""}.</p>`;
    renderBrands();
  }
  function goodHTML(it, withBadge) {
    return `<article class="item${saleNow(it) > 0 ? " on-sale" : ""}">${thumbHTML(it)}<div class="item-body">
        <p class="cat">${esc(it.category || "Other")}${tags(it)}</p>
        ${withBadge ? badge(it) : ""}
        <h3>${esc(it.name)}</h3>
        ${it.description ? `<p class="desc">${esc(it.description)}</p>` : ""}
        ${priceHTML(it)}
      </div></article>`;
  }
  function svcHTML(it, withBadge) {
    return `<article class="svc">
        <div class="svc-main"><p class="cat">${esc(it.category || "Service")}${tags(it)}</p>${withBadge ? badge(it) : ""}<h3>${esc(it.name)}</h3>${it.description ? `<p class="desc">${esc(it.description)}</p>` : ""}</div>
        ${priceHTML(it)}
      </article>`;
  }
  function renderBrands() {
    const host = $("#brand-zones");
    if (!host) return;
    host.innerHTML = Object.values(brands).map(b => {
      const goods = items.filter(i => i.type === "good" && i.brand === b.key);
      const svcs = items.filter(i => i.type === "service" && i.brand === b.key);
      const logo = b.image ? `<img class="brand-logo" src="${esc(imageSrc(b.image))}" alt="${esc(b.name)} logo" loading="lazy">` : "";
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
    const list = items.filter(i => i.type === "service");
    $("#services-list").innerHTML = list.length ? list.map(it => svcHTML(it, true)).join("") : `<p class="empty-msg">No services are listed at the moment.</p>`;
  }
  function renderStores() {
    const list = items.filter(i => i.type === "store");
    $("#stores-list").innerHTML = list.length ? list.map(it => `<li class="store">
        ${thumbHTML(it, "store-img")}
        <div class="store-text">
          <span class="store-city">${esc(it.name)}${it.example ? ' <span class="ex">Example</span>' : ""}</span>
          <span class="store-nation">${esc(it.category)}</span>
          ${it.description ? `<span class="store-note">${esc(it.description)}</span>` : ""}
        </div>
      </li>`).join("") : `<li class="empty-msg">Store locations will be listed here.</li>`;
    $("#delivery-fee").textContent = "Delivery is charged at a rate quoted by a board member when you place the order.";
  }

  $("#q").addEventListener("input", e => { query = e.target.value; renderGoods(); });

  loadConstants().then(() => {
    renderDiscount();
    return loadCatalog();
  }).then(r => {
    items = r.items;
    buildBrands();
    if (r.updated) $("#cat-updated").textContent = `Last updated ${r.updated}.`;
    if (r.example) {
      const s = $("#cat-status");
      s.hidden = false;
      s.textContent = "These are example items. Connect the Catalog tab of the company sheet in js/config.js to show the real catalog.";
    }
    renderChips(); renderGoods(); renderServices(); renderStores();
    // Sections such as a division's are built after the page loads, so the browser
    // cannot jump to a link like index.html#brand-ihi by itself. Do it now.
    if (location.hash.length > 1) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) requestAnimationFrame(() => target.scrollIntoView());
    }
  }).catch(e => {
    $("#goods-grid").innerHTML = `<p class="empty-msg">The catalog could not be loaded (${esc(e.message)}). Please try again later.</p>`;
    $("#services-list").innerHTML = "";
    $("#stores-list").innerHTML = "";
  });
})();
