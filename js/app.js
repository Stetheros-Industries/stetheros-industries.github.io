// Calculator page: renders the cards for the chosen mode and recomputes on input.
(function () {
  "use strict";
  const { C, meta, status, fmt, fmtConst, tex, secLink, esc, parseNumber, parseCSV } = SI;
  const $ = (s, r) => (r || document).querySelector(s);

  let mode = "member";
  try { mode = localStorage.getItem("si-mode") || "member"; } catch (e) { /* storage blocked */ }
  if (["#board", "#member", "#government"].includes(location.hash)) mode = location.hash.slice(1);
  if (!["member", "board", "government"].includes(mode)) mode = "member";

  // ---------- constants panel ----------
  function renderStatus() {
    const s = $("#const-status");
    const src = status.source === "sheet"
      ? `Constants loaded from the company sheet${status.lastUpdated ? `, last updated ${esc(status.lastUpdated)}` : ""}.`
      : "Using the built-in starting values.";
    const tone = status.warnings.length ? (status.source === "sheet" ? "warn" : "neutral") : "good";
    s.className = "const-status tone-" + tone;
    s.innerHTML = `<span class="dot" aria-hidden="true"></span><span>${src}</span>` +
      (status.warnings.length ? ` <button type="button" class="linkish" id="show-const">${status.warnings.length} note${status.warnings.length > 1 ? "s" : ""}</button>` : "");
    const b = $("#show-const");
    if (b) b.addEventListener("click", () => { $("#constants").open = true; $("#constants").scrollIntoView({ behavior: "smooth" }); });

    $("#const-warnings").innerHTML = status.warnings.map(w => `<li>${esc(w)}</li>`).join("");
    $("#const-table tbody").innerHTML = CONSTANT_SPEC.map(sp =>
      `<tr><td>${esc(sp.label)}</td><td class="numc">${fmtConst(sp.key, C[sp.key])}</td><td>${sp.section ? secLink(sp.section) : "Catalog"}</td>` +
      `<td><span class="src src-${meta[sp.key].from}">${meta[sp.key].from === "sheet" ? "Sheet" : "Starting value"}</span></td></tr>`
    ).join("");
  }

  // ---------- cards ----------
  function inputHTML(calc, inp) {
    const id = `${calc.id}-${inp.id}`;
    const hint = inp.hint ? `<span class="hint">${esc(inp.hint)}</span>` : "";
    if (inp.type === "sel") {
      return `<label class="field" for="${id}"><span class="lbl">${esc(inp.label)}</span>
        <select id="${id}" data-k="${inp.id}">${inp.options.map(([val, txt]) => `<option value="${esc(val)}"${val === inp.value ? " selected" : ""}>${esc(txt)}</option>`).join("")}</select>${hint}</label>`;
    }
    if (inp.type === "yn") {
      return `<label class="field" for="${id}"><span class="lbl">${esc(inp.label)}</span>
        <select id="${id}" data-k="${inp.id}"><option value="yes"${inp.value === "yes" ? " selected" : ""}>Yes</option><option value="no"${inp.value === "no" ? " selected" : ""}>No</option></select>${hint}</label>`;
    }
    const suffix = inp.type === "pct" ? `<span class="suffix">%</span>` : "";
    return `<label class="field" for="${id}"><span class="lbl">${esc(inp.label)}</span>
      <span class="inwrap"><input id="${id}" data-k="${inp.id}" data-t="${inp.type}" type="text" inputmode="decimal" autocomplete="off" value="${esc(inp.value)}">${suffix}</span>${hint}</label>`;
  }

  function howHTML(calc) {
    const blocks = calc.formulas.map(fid => {
      const f = FORMULAS[fid];
      if (!f) return "";
      const syms = Object.entries(f.symbols || {}).map(([sym, key]) =>
        `<tr><td class="sym">${tex(sym.replace(/_(\w+)/, "_{$1}").replace("d_{min}", "d_{\\min}"), false)}</td><td>${esc(meta[key].spec.label)}</td><td class="numc">${fmtConst(key, C[key])}</td><td>${meta[key].spec.section ? secLink(meta[key].spec.section) : "Catalog"}</td></tr>`).join("");
      return `<div class="formula">
        <div class="f-head"><h4>${esc(f.title)}</h4><span class="f-secs">${f.sections.map(secLink).join(" ")}</span></div>
        ${f.derived ? `<p class="derived">The document states this rule in words. The formula is written out here for the calculator.</p>` : ""}
        <div class="math">${tex(f.tex, true)}</div>
        ${f.legend ? `<p class="legend">${esc(f.legend)}</p>` : ""}
        <p>${esc(f.plain)}</p>
        ${syms ? `<table class="symtab"><thead><tr><th>Symbol</th><th>Constant</th><th>Value in use</th><th>Set in</th></tr></thead><tbody>${syms}</tbody></table>` : ""}
      </div>`;
    }).join("");
    return `<details class="how"><summary>How this is calculated</summary><div class="how-body">${blocks}</div></details>`;
  }

  function cardHTML(calc) {
    const t = calc.table;
    return `<section class="calc" id="c-${calc.id}" aria-labelledby="h-${calc.id}">
      <header class="calc-head"><h3 id="h-${calc.id}">${esc(calc.title)}</h3><span class="secs">${calc.sections.map(secLink).join(" ")}</span></header>
      <p class="intro">${esc(calc.intro)}</p>
      <div class="io">
        <form class="inputs" autocomplete="off" onsubmit="return false">
          ${calc.inputs.map(i => inputHTML(calc, i)).join("")}
          ${t ? `<label class="field wide" for="${calc.id}-rows"><span class="lbl">${esc(t.label)}</span>
            <textarea id="${calc.id}-rows" rows="${Math.max(3, t.example.split("\n").length + 1)}" spellcheck="false">${esc(t.example)}</textarea>
            <span class="hint">Comma- or tab-separated, so rows pasted from a spreadsheet work. <button type="button" class="linkish" data-example>Restore the example</button></span></label>` : ""}
        </form>
        <div class="results" aria-live="polite"></div>
      </div>
      <div class="outwrap"></div>
      ${howHTML(calc)}
    </section>`;
  }

  function readInputs(calc, el) {
    const v = {};
    calc.inputs.forEach(i => {
      const f = el.querySelector(`[data-k="${i.id}"]`);
      if (i.type === "yn" || i.type === "sel") v[i.id] = f.value;
      else {
        let n = parseNumber(f.value);
        if (i.type === "pct") n = n / 100;
        v[i.id] = n;
        f.classList.toggle("bad", isNaN(n));
      }
    });
    let rows = [];
    if (calc.table) rows = parseCSV(el.querySelector("textarea").value)
      .filter(r => !(r.length && /^(week|good|member|nation|buyer|asset|name)$/i.test(r[0]) && isNaN(parseNumber(r[1]))));
    return { v, rows };
  }

  function toCSV(out) {
    const q = s => /[",\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : String(s);
    const lines = [out.columns.map(q).join(",")];
    out.rows.forEach(r => lines.push(r.map((c, i) => q(typeof c === "number" ? (out.kinds[i] === "pct" ? (c * 100).toFixed(2) + "%" : +c.toFixed(4)) : (c ?? ""))).join(",")));
    return lines.join("\n");
  }

  function update(calc, el) {
    const { v, rows } = readInputs(calc, el);
    let r;
    try { r = calc.compute(v, C, rows); } catch (e) { r = { results: [], status: { tone: "bad", text: "Check the inputs: " + e.message } }; }
    const res = el.querySelector(".results");
    res.innerHTML =
      (r.status ? `<p class="chip tone-${r.status.tone}">${esc(r.status.text)}</p>` : "") +
      `<dl>${(r.results || []).map(x => `<div class="row${x.strong ? " strong" : ""}"><dt>${esc(x.label)}</dt><dd>${esc(fmt(x.value, x.kind))}</dd></div>`).join("")}</dl>` +
      ((r.notes || []).length ? `<ul class="notes">${r.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : "");
    const ow = el.querySelector(".outwrap");
    if (r.out) {
      ow.innerHTML = `<div class="tablewrap"><table class="out"><thead><tr>${r.out.columns.map((c, i) => `<th${r.out.kinds[i] ? ' class="numc"' : ""}>${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${r.out.rows.map(row => `<tr>${row.map((c, i) => `<td class="${typeof c === "number" ? "numc" : ""}">${esc(c === null || c === undefined ? "—" : (typeof c === "number" ? fmt(c, r.out.kinds[i]) : c))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
        <div class="outbtns"><button type="button" class="btn" data-copy>Copy as CSV</button><button type="button" class="btn ghost" data-dl>Download CSV</button><span class="copied" role="status"></span></div>`;
      const csv = toCSV(r.out);
      ow.querySelector("[data-copy]").onclick = () => {
        const done = t => { ow.querySelector(".copied").textContent = t; };
        if (navigator.clipboard) navigator.clipboard.writeText(csv).then(() => done("Copied."), () => done("Copy was blocked; select the table instead."));
        else done("Copy is not available in this browser.");
      };
      ow.querySelector("[data-dl]").onclick = () => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `stetheros-${calc.id}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
      };
    } else ow.innerHTML = "";
  }

  function render() {
    const list = CALCULATORS.filter(c => c.modes.includes(mode));
    $("#cards").innerHTML = list.map(cardHTML).join("");
    $("#index").innerHTML = list.map(c => `<li><a href="#c-${c.id}"><span>${esc(c.title)}</span><span class="ix-sec">§${c.sections[0]}</span></a></li>`).join("");
    $("#jump").innerHTML = `<option value="">Jump to a calculator…</option>` + list.map(c => `<option value="c-${c.id}">${esc(c.title)}</option>`).join("");
    document.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    $("#mode-note").textContent = {
      member: "These are estimates. Actual payouts come from the ledger (§1.3).",
      board: "Board tools work out actual figures from ledger values. They are a calculation aid, not a ruling: decisions are made under §9.",
      government: "These show how the company's agreements with nations work out: the citizen discount, the profit pool, the sales-tax terms, and the resale review (§11). Actual figures come from the company's ledger."
    }[mode];
    list.forEach(calc => {
      const el = $("#c-" + calc.id);
      el.querySelector("form").addEventListener("input", () => update(calc, el));
      const ex = el.querySelector("[data-example]");
      if (ex) ex.addEventListener("click", () => { el.querySelector("textarea").value = calc.table.example; update(calc, el); });
      update(calc, el);
    });
  }

  document.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => {
    mode = b.dataset.mode;
    try { localStorage.setItem("si-mode", mode); } catch (e) { /* ignore */ }
    render();
  }));
  $("#jump").addEventListener("change", e => { const t = document.getElementById(e.target.value); if (t) t.scrollIntoView({ behavior: "smooth" }); });

  SI.loadConstants().then(() => { renderStatus(); render(); });
})();
