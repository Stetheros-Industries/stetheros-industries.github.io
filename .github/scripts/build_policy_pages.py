"""Build a small page for every section and clause of the policy, at policy/<number>/.

A link such as https://stetheros-industries.github.io/policy/8.5/ shows a preview of that
clause (its number, title, and opening words) when pasted into Discord or a similar app,
and opens the policy page at the clause. Discord never sees the part of a link after "#",
so policy/index.html#s8-5 alone would always show the same preview.

Reads policy/policy.md. Pages for clauses that no longer exist are deleted.
"""
import html, json, os, re, shutil, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
SITE = os.environ.get("SITE_URL", "https://stetheros-industries.github.io").rstrip("/")
POLICY = os.path.join(ROOT, "policy")
LIMIT = 300  # characters of clause text in the preview


def plain(md):
    s = re.sub(r"&#91;image:.*?\\?\]", "", md)
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)       # links -> their text
    s = re.sub(r"(\*\*|__|\*|`)", "", s)                  # bold, italics, code
    s = s.replace("\\", "")                                 # markdown escapes
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def clip(s):
    if len(s) <= LIMIT:
        return s
    cut = s[:LIMIT].rsplit(" ", 1)[0].rstrip(",;:")
    return cut + "…"


def blocks(md):
    """Paragraph-sized blocks, keeping list items and table rows as their own lines."""
    out, cur = [], []
    for line in md.split("\n"):
        if not line.strip():
            if cur:
                out.append("\n".join(cur)); cur = []
        else:
            cur.append(line)
    if cur:
        out.append("\n".join(cur))
    return out


def entries(md):
    found, section = [], None
    bl = blocks(md)
    for i, b in enumerate(bl):
        h = re.match(r"^##\s+§(\d+)\s+(.*)$", b)
        if h:
            section = (h.group(1), plain(h.group(2)))
            # A section's preview is its "What this section does" note.
            nxt = bl[i + 1] if i + 1 < len(bl) else ""
            desc = plain(re.sub(r"^>\s*", "", nxt, flags=re.M)).replace("What this section does. ", "")
            found.append((h.group(1), f"§{h.group(1)} {plain(h.group(2))}", desc, None))
            continue
        c = re.match(r"^\*\*§(\d+\.\d+)\s+(.*?)\.?\*\*\s*(.*)$", b, re.S)
        if c:
            num, title, rest = c.group(1), plain(c.group(2)), c.group(3)
            text = plain(rest)
            # A clause that is only a heading (its text is a list or table): use what follows.
            j = i + 1
            while len(text) < 120 and j < len(bl) and not re.match(r"^(##|\*\*§)", bl[j]):
                if not bl[j].lstrip().startswith(("|", "```", "&#91;")):
                    text = (text + " " + plain(re.sub(r"^\s*\d+\.\s+", "", bl[j], flags=re.M))).strip()
                j += 1
            found.append((num, f"§{num} {title}", text, section))
    return found


def page(num, title, desc, section):
    anchor = "s" + num.replace(".", "-")
    target = f"../index.html#{anchor}"
    e = lambda s: html.escape(s, quote=True)
    site_name = "Stetheros Industries · Policy" + (f" · §{section[0]} {section[1]}" if section else "")
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)} · Stetheros Industries</title>
<meta name="description" content="{e(clip(desc))}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="{e(site_name)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(clip(desc))}">
<meta property="og:url" content="{SITE}/policy/{num}/">
<meta property="og:image" content="{SITE}/assets/icon-192.png">
<meta property="og:image:alt" content="Stetheros Industries logo">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#c4561f">
<link rel="icon" type="image/png" href="../../assets/icon-192.png">
<meta http-equiv="refresh" content="0; url={target}">
<script>location.replace({json.dumps(target)});</script>
<style>body{{background:#0f151b;color:#e5eaef;font:16px system-ui,sans-serif;padding:40px}}a{{color:#79a6dd}}</style>
</head>
<body>
<p>Opening <a href="{target}">{e(title)}</a> in the Stetheros Industries policy document…</p>
</body>
</html>
"""


def main():
    with open(os.path.join(POLICY, "policy.md"), encoding="utf-8") as f:
        md = f.read()
    for d in os.listdir(POLICY):  # only the generated folders: 8, 8.5, ...
        if re.fullmatch(r"\d+(\.\d+)?", d) and os.path.isdir(os.path.join(POLICY, d)):
            shutil.rmtree(os.path.join(POLICY, d))
    made = 0
    for num, title, desc, section in entries(md):
        os.makedirs(os.path.join(POLICY, num), exist_ok=True)
        with open(os.path.join(POLICY, num, "index.html"), "w", encoding="utf-8") as f:
            f.write(page(num, title, desc, section))
        made += 1
    print(f"{made} policy page(s) written")


if __name__ == "__main__":
    main()
