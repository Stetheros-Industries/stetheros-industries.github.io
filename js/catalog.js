// Catalog page: reads the Catalog tab of the company sheet and lists goods,
// services, and stores, with sales from the sheet and an optional discount estimate.
(function () {
  "use strict";
  const { C, esc, fmt, fmtDate, parseNumber, saleNow, loadConstants, loadCatalog, imageSrc } = SI;
  const ROOT = window.SITE_ROOT || "";
  const $ = s => document.querySelector(s);
  const SALE_CHIP = "On sale";

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
    $("#goods-grid").innerHTML = list.length ? list.map(it => `<article class="item${saleNow(it) > 0 ? " on-sale" : ""}">${thumbHTML(it)}<div class="item-body">
        <p class="cat">${esc(it.category || "Other")}${tags(it)}</p>
        <h3>${esc(it.name)}</h3>
        ${it.description ? `<p class="desc">${esc(it.description)}</p>` : ""}
        ${priceHTML(it)}
      </div></article>`).join("")
      : `<p class="empty-msg">No goods match${q ? ` "${esc(query)}"` : ""}.</p>`;
  }
  function renderServices() {
    const list = items.filter(i => i.type === "service");
    $("#services-list").innerHTML = list.length ? list.map(it => `<article class="svc">
        <div class="svc-main"><p class="cat">${esc(it.category || "Service")}${tags(it)}</p><h3>${esc(it.name)}</h3>${it.description ? `<p class="desc">${esc(it.description)}</p>` : ""}</div>
        ${priceHTML(it)}
      </article>`).join("") : `<p class="empty-msg">No services are listed at the moment.</p>`;
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
    $("#stores-list").innerHTML = "";
  });
})();
