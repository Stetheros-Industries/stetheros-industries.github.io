// About page: lists the company's members (rows with type "member") and its branded
// divisions (rows with type "brand") from the Catalog tab of the company sheet.
(function () {
  "use strict";
  const { esc, loadCatalog, imageSrc } = SI;
  const ul = document.querySelector("#member-list");
  const divSec = document.querySelector("#divisions");
  const divList = document.querySelector("#division-list");
  const hexes = s => String(s || "").match(/#[0-9a-f]{3}(?:[0-9a-f]{3})?\b/gi) || [];
  const slug = k => "brand-" + k.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  function renderDivisions(items) {
    if (!divSec || !divList) return;
    const brands = items.filter(i => i.type === "brand");
    divSec.hidden = !brands.length;
    divList.innerHTML = brands.map(b => {
      const c = hexes(b.category);
      const key = (b.id || b.name).toUpperCase();
      const vars = `--b-acc:${c[0] || "#2563ff"};--b-bg:${c[2] || "#050810"}`;
      const logo = b.image ? `<img src="${esc(imageSrc(b.image))}" alt="${esc(b.name)} logo" loading="lazy">` : "";
      return `<article class="division" style="${vars}">${logo}<div>
          <p class="kicker">A branded division of Stetheros Industries</p>
          <h3>${esc(b.name)}</h3>
          ${b.description ? `<p>${esc(b.description)}</p>` : ""}
          <p>It sells under its own name and logo but is part of the company in every respect: its goods are sold through Stetheros shops at company prices, and its members are paid and share in profit like every other member (<a href="../policy/index.html#s3-8">§3.8</a>).</p>
          <p><a href="../index.html#${slug(key)}">See its goods and services →</a></p>
        </div></article>`;
    }).join("");
  }

  loadCatalog().then(r => {
    const list = r.items.filter(i => i.type === "member");
    if (ul) ul.innerHTML = list.length
      ? list.map(m => `<li><span class="m-name">${esc(m.name)}</span>${m.category ? ` <span class="m-role">(${esc(m.category)})</span>` : ""}</li>`).join("")
      : `<li class="muted">The member list will appear here.</li>`;
    renderDivisions(r.items);
  }).catch(() => {
    if (ul) ul.innerHTML = `<li class="muted">The member list could not be loaded. Please try again later.</li>`;
  });
})();
