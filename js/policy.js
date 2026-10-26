// Policy page: renders policy.md (the Markdown export of the policy document),
// puts the formulas back where the export left image placeholders, adds an
// anchor to every section and clause, and links every "§" reference.
(function () {
  "use strict";
  const doc = document.getElementById("doc");
  const toc = document.getElementById("toc");

  function placeholderToDiv(md) {
    // The export writes each image as a line like: &#91;image: Formula: …\]
    return md.replace(/^&#91;image:[ \t]*(.*?)\\?\][ \t]*$/gm, (m, alt) =>
      `\n<div class="fig-ph" data-alt="${alt.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"></div>\n`);
  }

  function mathBlock(tex) {
    const d = document.createElement("div");
    d.className = "math";
    d.innerHTML = SI.tex(tex, true);
    return d;
  }

  function slug(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  function enhance() {
    let sec = null;
    const used = {};
    const tocItems = [];
    Array.from(doc.children).forEach(el => {
      const tag = el.tagName;
      if (tag === "H2") {
        const t = el.textContent.trim();
        const m = t.match(/^§(\d+)\b/);
        el.id = m ? "s" + m[1] : slug(t);
        if (m) sec = m[1];
        tocItems.push(`<li><a href="#${el.id}">${SI.esc(t)}</a></li>`);
      } else if (tag === "P") {
        const first = el.firstElementChild;
        const m = first && first.tagName === "STRONG" && el.firstChild === first && first.textContent.match(/^§(\d+(?:\.\d+)?)/);
        if (m) { sec = m[1]; el.id = SI.secId(sec); }
      } else if (tag === "DIV" && el.classList.contains("fig-ph")) {
        const alt = el.dataset.alt || "";
        if (/logo/i.test(alt)) {
          const img = document.createElement("img");
          img.src = (window.SITE_ROOT || "") + "assets/logo.png"; img.alt = alt; img.className = "logo";
          el.replaceWith(img);
        } else if (sec && DOC_FORMULAS[sec] && !used[sec]) {
          used[sec] = true; el.replaceWith(mathBlock(DOC_FORMULAS[sec]));
        } else {
          el.className = "fig-missing"; el.textContent = alt + " (shown in the PDF version)";
        }
      } else if (tag === "PRE") {
        if (sec && DOC_FORMULAS[sec] && !used[sec]) { used[sec] = true; el.replaceWith(mathBlock(DOC_FORMULAS[sec])); }
      } else if (tag === "TABLE") {
        const w = document.createElement("div"); w.className = "tablewrap";
        el.replaceWith(w); w.appendChild(el);
      }
    });
    toc.innerHTML = tocItems.join("");

    // Link "§4.3" style references (but not a clause's own label or headings).
    const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!/§\d/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (p.closest("h1, h2, h3, a, .math, pre")) return NodeFilter.FILTER_REJECT;
        if (p.tagName === "STRONG" && p.parentElement.id && p.parentElement.firstChild === p) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const frag = document.createDocumentFragment();
      let last = 0;
      n.nodeValue.replace(/§(\d+)(?:\.(\d+))?/g, (m, a, b, idx) => {
        frag.appendChild(document.createTextNode(n.nodeValue.slice(last, idx)));
        const id = b && document.getElementById(`s${a}-${b}`) ? `s${a}-${b}` : `s${a}`;
        const link = document.createElement("a");
        link.href = "#" + id; link.className = "ref"; link.textContent = m;
        frag.appendChild(link);
        last = idx + m.length;
      });
      frag.appendChild(document.createTextNode(n.nodeValue.slice(last)));
      n.replaceWith(frag);
    });

    if (location.hash) {
      const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t) t.scrollIntoView();
    }
  }

  fetch("policy.md", { cache: "no-store" })
    .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
    .then(md => {
      doc.innerHTML = marked.parse(placeholderToDiv(md), { gfm: true });
      enhance();
    })
    .catch(e => {
      doc.innerHTML = `<p>The policy document could not be loaded (${SI.esc(e.message)}). If you opened this file directly from your computer, use the published site instead; browsers block this page from reading files on disk.</p>`;
    });
})();
