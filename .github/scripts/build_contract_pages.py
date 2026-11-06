"""Build a small page for every open contract job, at contractors/<id>/index.html.

When a job's link is pasted into Discord (or a similar app), the preview shows the job's
title, pay, place, deadline, and description, and the picture if it has one. Opening the
link goes to the job on the Contractors page.

Reads the Contracts tab from CONTRACTS_CSV_URL in js/config.js. Without that link, it reads
rows with type "contract" from the Catalog tab, or contracts-template.csv when no sheet is
connected. Jobs that are closed, hidden, or past their deadline get no page, and pages
for them are deleted.
"""
import csv, html, io, json, os, re, shutil, sys, urllib.request
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_item_pages import config_value, number, parse_date, truthy, money, picture, SITE  # noqa: E402

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = os.path.join(ROOT, "contractors")
ALIASES = {"pay": "price", "location": "locations", "where": "locations", "job": "name", "kind": "category", "time": "time_allowed", "time allowed": "time_allowed", "open until": "deadline", "paid by": "paid_by"}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "stetheros-site-builder"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8-sig")


def rows_of(text):
    rows = list(csv.reader(io.StringIO(text)))
    if not rows:
        return []
    head = [ALIASES.get(h.strip().lower(), h.strip().lower()) for h in rows[0]]
    return [{h: (r[i].strip() if i < len(r) else "") for i, h in enumerate(head)} for r in rows[1:]]


def load_jobs():
    if os.environ.get("CONTRACTS_FILE"):
        with open(os.environ["CONTRACTS_FILE"], encoding="utf-8-sig") as f:
            return rows_of(f.read())
    url = config_value("CONTRACTS_CSV_URL")
    if url:
        return rows_of(fetch(url))
    cat = config_value("CATALOG_CSV_URL")
    if cat:
        return [r for r in rows_of(fetch(cat)) if re.match(r"^(contract|job|bounty)", r.get("type", ""), re.I)]
    with open(os.path.join(ROOT, "contracts-template.csv"), encoding="utf-8-sig") as f:
        return rows_of(f.read())


def main():
    jobs = load_jobs()  # a failed download stops here, before any page is removed
    for d in os.listdir(OUT):
        if os.path.isdir(os.path.join(OUT, d)):
            shutil.rmtree(os.path.join(OUT, d))
    made, today = 0, date.today()
    e = lambda s: html.escape(s, quote=True)
    for r in jobs:
        name = r.get("name", "")
        if not name or (r.get("visible") and not truthy(r["visible"])):
            continue
        if re.match(r"^(closed|filled|done|complete|cancel)", r.get("status", ""), re.I):
            continue
        due = parse_date(r.get("deadline"))
        if due and due < today:
            continue
        key = re.sub(r"[^A-Za-z0-9_-]+", "-", r.get("id") or name)
        pay, unit = number(r.get("price")), r.get("unit", "")
        facts = [f"Pay: {money(pay)}{(' ' + unit) if unit else ''}" if pay is not None else "Pay agreed when you claim it"]
        if r.get("time_allowed") or r.get("time"):
            facts.append(f"Time to finish: {r.get('time_allowed') or r.get('time')}")
        if r.get("locations"):
            facts.append(f"Where: {r['locations']}")
        if due:
            facts.append(f"Open until {due.strftime('%b')} {due.day}")
        if re.match(r"^(taken|claimed|in progress|progress|assigned)", r.get("status", ""), re.I):
            facts.append("Taken")
        desc = " · ".join(facts) + "." + (" " + r["description"] if r.get("description") else "")
        img, w, h = picture(r.get("image", ""))
        large = bool(r.get("image"))
        if not large:
            img, w, h = f"{SITE}/assets/icon-192.png", None, None
        size = f'\n<meta property="og:image:width" content="{w}">\n<meta property="og:image:height" content="{h}">' if w else ""
        kind = " · ".join(c.strip() for c in re.split(r"[,;]", r.get("category", "")) if c.strip())
        target = f"../index.html#job-{key}"
        page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(name)} · Contract job · Stetheros Industries</title>
<meta name="description" content="{e(desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Stetheros Industries · Contract job{(' · ' + e(kind)) if kind else ''}">
<meta property="og:title" content="{e(name)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{SITE}/contractors/{key}/">
<meta property="og:image" content="{e(img)}">{size}
<meta name="twitter:card" content="{'summary_large_image' if large else 'summary'}">
<meta name="theme-color" content="#c4561f">
<link rel="icon" type="image/png" href="../../assets/icon-192.png">
<meta http-equiv="refresh" content="0; url={target}">
<script>location.replace({json.dumps(target)});</script>
<style>body{{background:#0f151b;color:#e5eaef;font:16px system-ui,sans-serif;padding:40px}}a{{color:#79a6dd}}</style>
</head>
<body>
<p>Opening <a href="{target}">{e(name)}</a> on the Stetheros Industries contract jobs page…</p>
</body>
</html>
"""
        os.makedirs(os.path.join(OUT, key), exist_ok=True)
        with open(os.path.join(OUT, key, "index.html"), "w", encoding="utf-8") as f:
            f.write(page)
        made += 1
    print(f"{made} contract job page(s) written")


if __name__ == "__main__":
    main()
