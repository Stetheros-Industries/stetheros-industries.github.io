// About page: lists the company's members from the Catalog tab (rows with type "member").
(function () {
  "use strict";
  const { esc, loadCatalog } = SI;
  const ul = document.querySelector("#member-list");
  if (!ul) return;
  loadCatalog().then(r => {
    const list = r.items.filter(i => i.type === "member");
    ul.innerHTML = list.length
      ? list.map(m => `<li><span class="m-name">${esc(m.name)}</span>${m.category ? ` <span class="m-role">(${esc(m.category)})</span>` : ""}</li>`).join("")
      : `<li class="muted">The member list will appear here.</li>`;
  }).catch(() => {
    ul.innerHTML = `<li class="muted">The member list could not be loaded. Please try again later.</li>`;
  });
})();
