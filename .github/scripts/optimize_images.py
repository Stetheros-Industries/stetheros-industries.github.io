"""Make small, fast copies of every catalog picture in images/.

For each picture, writes:
  images/opt/<name>.webp    up to 1600 px wide, for the item window and division logos
  images/thumb/<name>.webp  up to 640 px wide, for catalog cards and store rows
  images/og/<name>.jpg      up to 1200 x 1200, uncropped, for link previews in Discord and similar apps

<name> is the file name in lower case with anything other than letters and digits
turned into dashes, so "Large Wind Turbine 4_3.png" becomes "large-wind-turbine-4-3".
The website asks for these copies first and falls back to the original file.

A picture is processed only when it is new or its contents changed (images/opt/sources.json
records a fingerprint of each). Copies of pictures that were deleted are removed.
The originals are never changed.
"""
import hashlib, json, os, re, sys
from PIL import Image, ImageOps

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
SRC = os.path.join(ROOT, "images")
EXTS = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp")
DIRS = {"opt": ".webp", "thumb": ".webp", "og": ".jpg"}
MANIFEST = os.path.join(SRC, "opt", "sources.json")
VERSION = 2  # raise to rebuild every copy after changing the sizes below


def slug(filename):
    base = os.path.splitext(filename)[0]
    return re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")


def fingerprint(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return f"{VERSION}:{h.hexdigest()}"


def fit(im, width):
    if im.width <= width:
        return im.copy()
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def main():
    for d in DIRS:
        os.makedirs(os.path.join(SRC, d), exist_ok=True)
    try:
        with open(MANIFEST) as f:
            seen = json.load(f)
    except (OSError, ValueError):
        seen = {}

    keep, made, now = set(), 0, {}
    for name in sorted(os.listdir(SRC)):
        path = os.path.join(SRC, name)
        if not os.path.isfile(path) or not name.lower().endswith(EXTS):
            continue
        key = slug(name)
        if not key:
            continue
        keep.add(key)
        outs = {d: os.path.join(SRC, d, key + ext) for d, ext in DIRS.items()}
        fp = fingerprint(path)
        now[name] = fp
        if seen.get(name) == fp and all(os.path.exists(o) for o in outs.values()):
            continue
        try:
            with Image.open(path) as im:
                im = ImageOps.exif_transpose(im)
                alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
                im = im.convert("RGBA" if alpha else "RGB")
                fit(im, 1600).save(outs["opt"], "WEBP", quality=82, method=6)
                fit(im, 640).save(outs["thumb"], "WEBP", quality=78, method=6)
                flat = im
                if alpha:  # link previews have no transparency: put the picture on the site's dark background
                    flat = Image.new("RGB", im.size, (15, 21, 27))
                    flat.paste(im, mask=im.split()[-1])
                # Keep the picture's own shape so previews show all of it, not a wide crop.
                og = flat.convert("RGB")
                og.thumbnail((1200, 1200), Image.LANCZOS)
                og.save(outs["og"], "JPEG", quality=84, optimize=True, progressive=True)
        except Exception as e:  # a broken upload should not stop the others
            print(f"skipped {name}: {e}")
            now.pop(name, None)
            continue
        made += 1
        print(f"optimized {name} -> {key}")

    removed = 0
    for d, ext in DIRS.items():
        for f in os.listdir(os.path.join(SRC, d)):
            if f.endswith(ext) and f[: -len(ext)] not in keep:
                os.remove(os.path.join(SRC, d, f))
                removed += 1

    with open(MANIFEST, "w") as f:
        json.dump(now, f, indent=1, sort_keys=True)
        f.write("\n")
    print(f"{made} picture(s) optimized, {removed} old copy(ies) removed")


if __name__ == "__main__":
    main()
