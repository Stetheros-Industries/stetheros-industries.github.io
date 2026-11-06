// Contractors page: paid jobs open to people outside the company, one row each on the
// Contracts tab of the company sheet (CONTRACTS_CSV_URL in js/config.js).
//   name         the job
//   category     the kind of job (Mining, Hauling, Building, ...); several, separated by commas
//   pay, unit    the pay, e.g. 200 and "per stack delivered"; leave pay empty for "agreed when claimed"
//   description  one or two sentences
//   details      requirements; lines starting with "- " become bullet points
//   location     where the work is (free text)
//   time_allowed how long the contractor has to finish once the job is claimed, e.g. "5 days"
//   payment      when the pay is due, e.g. "half up front"; empty means after the work is checked
//   paid_by      for a job a member pays from their own funds (§8.6), that member
//   deadline     the last day the job is open to claim; it disappears after that day
//   status       empty or "open"; "taken" shows the job as taken; "closed" or "filled" hides it
//   contact      who to message; empty means the Sales role
//   listed       date posted (shows a New label for 8 days); image optional
(function () {
  "use strict";
  const { esc, fmt, fmtDate, loadContracts, imgAttrs } = SI;
  const $ = s => document.querySelector(s);
  const list = $("#job-list"), chipsHost = $("#chips-jobs"), status = $("#jobs-status");
  const DISCORD = window.DISCORD_URL || "https://discord.gg/qZYwghHq5J";
  const DAY = 86400000;
  let jobs = [], cat = "All", query = "";

  const catsOf = j => String(j.category || "").split(/[,;]/).map(s => s.trim()).filter(Boolean);
  const keyOf = j => String(j.id || j.name).replace(/[^A-Za-z0-9_-]+/g, "-");
  function state(j) {
    const s = j.status || "";
    if (/^(closed|filled|done|complete|cancel)/.test(s)) return "closed";
    if (/^(taken|claimed|in progress|progress|assigned)/.test(s)) return "taken";
    return "open";
  }

  function detailsHTML(text) {
    return String(text).split(/\n\s*\n/).map(block => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length && lines.every(l => l.startsWith("- "))) return `<ul>${lines.map(l => `<li>${esc(l.slice(2))}</li>`).join("")}</ul>`;
      const out = []; let bullets = [];
      lines.forEach(l => {
        if (l.startsWith("- ")) bullets.push(`<li>${esc(l.slice(2))}</li>`);
        else { if (bullets.length) { out.push(`<ul>${bullets.join("")}</ul>`); bullets = []; } out.push(`<p>${esc(l)}</p>`); }
      });
      if (bullets.length) out.push(`<ul>${bullets.join("")}</ul>`);
      return out.join("");
    }).join("");
  }

  function deadlineHTML(j) {
    if (!(j.deadline instanceof Date)) return "";
    const left = Math.ceil((j.deadline - Date.now()) / DAY);
    const when = left <= 0 ? "today" : left === 1 ? "1 day left" : `${left} days left`;
    return `<div><dt>Open until</dt><dd>${esc(fmtDate(j.deadline))} <span class="${left <= 3 ? "soon" : "muted"}">(${when})</span></dd></div>`;
  }

  function jobHTML(j) {
    const key = keyOf(j), st = state(j);
    const pay = j.price === null ? "Agreed when you claim it" : `<b>${fmt(j.price, "cr")}</b>${j.unit ? ` ${esc(j.unit)}` : ""}`;
    const where = j.locations && j.locations.length ? `<div><dt>Where</dt><dd>${esc(j.locations.join(", "))}</dd></div>` : "";
    const contact = j.contact ? `<strong>${esc(j.contact)}</strong>` : `someone with the <strong>@Sales</strong> role`;
    return `<article class="job${st === "taken" ? " is-taken" : ""}" id="job-${esc(key)}">
      ${j.image ? `<div class="job-thumb"><img ${imgAttrs(j.image, "thumb")} alt="" loading="lazy" onerror="if(!SI.imgRetry(this)){this.onerror=null;this.parentNode.remove();}"></div>` : ""}
      <div class="job-main">
        ${catsOf(j).length ? `<p class="cat">${esc(catsOf(j).join(" · "))}</p>` : ""}
        <h3>${esc(j.name)}${SI.isNew(j) ? ' <span class="new-tag">New</span>' : ""}${st === "taken" ? ' <span class="taken-tag">Taken</span>' : ""}${j.example ? ' <span class="ex">Example</span>' : ""}</h3>
        ${j.description ? `<p class="desc">${esc(j.description)}</p>` : ""}
        <dl class="job-facts"><div><dt>Pay</dt><dd>${pay}</dd></div>${j.timeAllowed ? `<div><dt>Time to finish</dt><dd>${esc(j.timeAllowed)}</dd></div>` : ""}${where}${deadlineHTML(j)}</dl>
        <p class="job-terms">${j.payment ? `Paid ${esc(j.payment.replace(/^paid\s+/i, ""))}.` : "Paid after the work is checked."}${j.paidBy ? ` This job is paid by ${esc(j.paidBy)}, not by the company.` : ""} <a href="../policy/index.html#s8-6">Terms (§8.6)</a></p>
        ${j.details ? `<details class="job-details"><summary>Requirements and details</summary>${detailsHTML(j.details)}</details>` : ""}
        <div class="job-actions">
          ${st === "taken"
            ? `<p class="job-claim">Someone is working on this job. Message ${contact} on Discord if you would like to be next.</p>`
            : `<p class="job-claim">To claim it, message ${contact} on Discord.</p>`}
          <a class="btn" href="${esc(DISCORD)}" target="_blank" rel="noopener" data-discord data-job="${esc(key)}">Open Discord</a>
          <button type="button" class="btn ghost" data-copy-job="${esc(key)}">Copy link</button>
        </div>
      </div>
    </article>`;
  }

  function visible() {
    const now = Date.now();
    return jobs.filter(j => state(j) !== "closed" && !(j.deadline instanceof Date && j.deadline.getTime() < now));
  }
  function renderChips() {
    const cats = [...new Set(visible().flatMap(catsOf))];
    if (cats.length < 2) { chipsHost.hidden = true; cat = "All"; return; }
    if (!cats.includes(cat)) cat = "All";
    chipsHost.hidden = false;
    chipsHost.innerHTML = ["All", ...cats].map(c => `<button type="button" class="chip-btn" aria-pressed="${c === cat}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
    chipsHost.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { cat = b.dataset.c; renderChips(); render(); }));
  }
  function render() {
    const q = query.trim().toLowerCase();
    const shown = visible()
      .filter(j => cat === "All" || catsOf(j).includes(cat))
      .filter(j => !q || [j.name, j.description, j.category, j.details, (j.locations || []).join(" ")].join(" ").toLowerCase().includes(q))
      .sort((a, b) => (state(a) === "taken") - (state(b) === "taken"));
    if (shown.length) { list.innerHTML = shown.map(jobHTML).join(""); return; }
    list.innerHTML = visible().length
      ? `<p class="muted">No jobs match your search.</p>`
      : `<div class="no-jobs"><p><strong>No contract jobs are open right now.</strong> New jobs are posted on our Discord server as well as here, so join it to hear about them first.</p></div>`;
  }

  // A link to one job (#job-<id>) scrolls to it and outlines it.
  function focusHash() {
    const m = location.hash.match(/^#job-(.+)$/);
    const el = m && document.getElementById("job-" + decodeURIComponent(m[1]));
    document.querySelectorAll(".job.is-target").forEach(x => x.classList.remove("is-target"));
    if (el) { el.classList.add("is-target"); el.scrollIntoView({ block: "start" }); }
  }
  document.addEventListener("click", e => {
    const c = e.target.closest("[data-copy-job]");
    if (c) {
      // Each job has its own page at contractors/<id>/, which gives the link a preview of
      // the job in Discord and then opens it here.
      const url = new URL(encodeURIComponent(c.dataset.copyJob) + "/", location.href.split("#")[0].replace(/[^/]*$/, "")).href;
      SI.copyText(url, () => { c.textContent = "Link copied"; setTimeout(() => { c.textContent = "Copy link"; }, 1800); });
    }
    const d = e.target.closest("[data-job]");
    if (d && window.siTrack) window.siTrack("job-" + d.dataset.job, "Contract job: claim clicked");
  });
  $("#q-jobs").addEventListener("input", e => { query = e.target.value; render(); });

  loadContracts().then(r => {
    jobs = r.items;
    if (r.example) { status.hidden = false; status.textContent = "Showing example jobs: the company sheet is not connected yet."; }
    renderChips(); render(); focusHash();
    window.addEventListener("hashchange", focusHash);
  }).catch(() => {
    list.innerHTML = `<p class="muted">The jobs could not be loaded. Please try again later.</p>`;
  });
})();
