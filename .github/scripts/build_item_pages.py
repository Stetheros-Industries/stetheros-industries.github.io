"""Build a small page for every good and service, at item/<key>/index.html.

When an item link is pasted into Discord (or a similar app), the app reads the page's
preview tags and shows the item's name, price, description, and picture. A visitor who
opens the link is sent straight to the item's window in the catalog.

Reads the Catalog tab from the link in js/config.js (or catalog-template.csv when no link
is set). Runs on a schedule (see .github/workflows/site-files.yml), so pages follow the
sheet within about an hour. Pages for items that are removed or hidden are deleted.
"""
import csv, html, io, json, os, re, shutil, sys, urllib.request
from datetime import date

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
SITE = os.environ.get("SITE_URL", "https://stetheros-industries.github.io").rstrip("/")
OUT = os.path.join(ROOT, "item")


def config_value(name):
    with open(os.path.join(ROOT, "js", "config.js"), encoding="utf-8") as f:
        m = re.search(r"window\." + name + r'\s*=\s*"([^"]*)"', f.read())
    return m.group(1).strip() if m else ""


def load_rows():
    url = "" if os.environ.get("CATALOG_FILE") else config_value("CATALOG_CSV_URL")
    if url:
        req = urllib.request.Request(url, headers={"User-Agent": "stetheros-site-builder"})
        with urllib.request.urlopen(req, timeout=30) as r:
            text = r.read().decode("utf-8-sig")
    else:
        with open(os.environ.get("CATALOG_FILE") or os.path.join(ROOT, "catalog-template.csv"), encoding="utf-8-sig") as f:
            text = f.read()
    rows = list(csv.reader(io.StringIO(text)))
    if not rows:
        return []
    head = [h.strip().lower() for h in rows[0]]
    return [{h: (r[i].strip() if i < len(r) else "") for i, h in enumerate(head)} for r in rows[1:]]


def number(raw):
    s = re.sub(r"[,\s]", "", raw or "")
    s = re.sub(r"^cr", "", s, flags=re.I)
    pct = s.endswith("%")
    s = s.rstrip("%")
    try:
        n = float(s)
    except ValueError:
        return None
    return n / 100 if pct else n


def parse_date(raw):
    s = (raw or "").strip()
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})", s) or None
    try:
        if m:
            return date(int(m[1]), int(m[2]), int(m[3]))
        m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})", s)
        if m:
            return date(int(m[3]), int(m[1]), int(m[2]))
    except ValueError:
        return False
    return None if not s else False


def sale_now(r):
    raw = r.get("sale", "")
    n = number(raw)
    if not n or n <= 0:
        return 0
    if not raw.strip().endswith("%") and n >= 1:
        n /= 100
    if n >= 1:
        return 0
    start, end, today = parse_date(r.get("sale_from")), parse_date(r.get("sale_until")), date.today()
    if start is False or end is False or (start and today < start) or (end and today > end):
        return 0
    return n


def truthy(s):
    return s.strip().lower() in ("y", "yes", "true", "1", "active", "x")


def kind(t):
    t = t.lower()
    return "service" if t.startswith("serv") else "brand" if t.startswith(("brand", "division")) else \
        "good" if not t or not re.match(r"^(store|shop|location|member|nation|compact|notice|announce|banner)", t) else "other"


def money(n):
    return f"{n:,.2f} Cr"


def slug(filename):
    return re.sub(r"[^a-z0-9]+", "-", os.path.splitext(filename)[0].lower()).strip("-")


def picture(img):
    if not img:
        return f"{SITE}/assets/share-card.png", 1200, 630
    if re.match(r"^https?://", img, re.I):
        return img, None, None
    og = os.path.join("images", "og", slug(img) + ".jpg")
    if os.path.exists(os.path.join(ROOT, og)):
        return f"{SITE}/{og}", 1200, 630
    return f"{SITE}/images/{urllib.request.quote(img)}", None, None


def main():
    rows = load_rows()
    brands = {}
    for r in rows:
        if kind(r.get("type", "")) == "brand":
            colors = re.findall(r"#[0-9a-fA-F]{6}\b", r.get("category", ""))
            brands[(r.get("id") or r.get("name", "")).upper()] = {"name": r.get("name", ""), "color": colors[0] if colors else None}

    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    made = 0
    for r in rows:
        name = r.get("name", "")
        k = kind(r.get("type", ""))
        if not name or k not in ("good", "service") or (r.get("id", "").lower() == "last_updated"):
            continue
        if r.get("visible") and not truthy(r["visible"]):
            continue
        key = re.sub(r"[^A-Za-z0-9_-]+", "-", r.get("id") or name)
        price, unit = number(r.get("price")), r.get("unit", "")
        per = "" if not unit else " each" if unit.lower() == "each" else f" per {unit}"
        if price is None:
            price_text = "Quoted by a board member" if key.upper() == "DELIVERY" else "Quoted" if k == "service" else "Price on request"
        else:
            s = sale_now(r)
            price_text = f"{money(price * (1 - s))}{per}" + (f" ({round(s * 100)}% off, was {money(price)})" if s else "")
        brand = brands.get(r.get("brand", "").upper())
        cats = " · ".join(c.strip() for c in re.split(r"[,;]", r.get("category", "")) if c.strip())
        desc_bits = [price_text + "."]
        if r.get("description"):
            desc_bits.append(r["description"])
        if brand:
            desc_bits.append(f"From {brand['name']}, a branded division of Stetheros Industries.")
        description = " ".join(desc_bits)
        title = f"{name} · Stetheros Industries"
        img, w, h = picture(r.get("image", ""))
        target = f"../../index.html#item-{key}"
        e = lambda s: html.escape(s, quote=True)
        size = f'\n<meta property="og:image:width" content="{w}">\n<meta property="og:image:height" content="{h}">' if w else ""
        page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Stetheros Industries{(' · ' + cats) if cats else ''}">
<meta property="og:title" content="{e(name)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:url" content="{SITE}/item/{key}/">
<meta property="og:image" content="{e(img)}">{size}
<meta property="og:image:alt" content="{e(name)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="{e((brand or {}).get('color') or '#c4561f')}">
<link rel="icon" type="image/png" href="../../assets/icon-192.png">
<meta http-equiv="refresh" content="0; url={target}">
<script>location.replace({json.dumps(target)});</script>
<style>body{{background:#0f151b;color:#e5eaef;font:16px system-ui,sans-serif;padding:40px}}a{{color:#79a6dd}}</style>
</head>
<body>
<p>Opening <a href="{target}">{e(name)}</a> in the Stetheros Industries catalog…</p>
</body>
</html>
"""
        os.makedirs(os.path.join(OUT, key), exist_ok=True)
        with open(os.path.join(OUT, key, "index.html"), "w", encoding="utf-8") as f:
            f.write(page)
        made += 1
    print(f"{made} item page(s) written")


if __name__ == "__main__":
    main()
