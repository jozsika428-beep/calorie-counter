#!/usr/bin/env python3
"""Rebuild calorie-counter.html: a fully self-contained single-file version of the app.

Inlines styles.css, foods-fallback.js and app.js into index.html, removes the
PWA/service-worker bits (they don't work from file://) and embeds the built-in
food list: foods.json if it exists and is valid, otherwise the fallback list.

Usage:  python3 build-single.py
"""
import base64, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
def read(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as f:
        return f.read()

def valid_foods():
    path = os.path.join(HERE, "foods.json")
    if not os.path.exists(path):
        return None, "foods.json not found"
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        return None, f"foods.json is not valid JSON ({e})"
    if not isinstance(data, list):
        return None, "foods.json is not a JSON array"
    good = []
    for item in data:
        if isinstance(item, dict) and isinstance(item.get("name"), str) and item["name"].strip():
            try:
                float(item.get("kcal"))
                good.append(item)
            except (TypeError, ValueError):
                pass
    if not good:
        return None, "foods.json has no valid items"
    return good, f"foods.json OK ({len(good)} of {len(data)} items valid)"

def safe_js(text):
    # prevent a literal </script> inside inlined code/data from closing the tag
    return re.sub(r"</(script)", r"<\\/\1", text, flags=re.I)

def main():
    html = read("index.html")
    css = read("styles.css")
    app = read("app.js")
    fallback = read("foods-fallback.js")
    foods, msg = valid_foods()

    # favicon as data URI instead of manifest/service worker links
    fav = ""
    fav_path = os.path.join(HERE, "icons", "favicon-32.png")
    if os.path.exists(fav_path):
        with open(fav_path, "rb") as f:
            fav = '<link rel="icon" type="image/png" href="data:image/png;base64,' + base64.b64encode(f.read()).decode() + '">'
    html = re.sub(r"<!--PWA-START-->.*?<!--PWA-END-->", fav, html, flags=re.S)

    # bundled fonts: inline fonts.css with each woff2 as a base64 data URI (works from file://, offline)
    fcss = read(os.path.join("fonts", "fonts.css"))
    def font_uri(m):
        with open(os.path.join(HERE, "fonts", m.group(1)), "rb") as f:
            return "url(data:font/woff2;base64," + base64.b64encode(f.read()).decode() + ")"
    fcss = re.sub(r"url\(([\w.-]+\.woff2)\)", font_uri, fcss)
    html = html.replace('<link rel="stylesheet" href="fonts/fonts.css">', "<style>\n" + fcss + "\n</style>")
    html = html.replace('<link rel="stylesheet" href="styles.css">', "<style>\n" + css + "\n</style>")
    if foods is not None:
        data_js = "window.EMBEDDED_FOODS = " + json.dumps(foods, ensure_ascii=False, separators=(",", ":")) + ";"
    else:
        data_js = fallback
    head = "window.SINGLE_FILE = true;\n" + data_js
    html = html.replace('<script src="foods-fallback.js"></script>', "<script>\n" + safe_js(head) + "\n</script>")
    html = html.replace('<script src="app.js"></script>', "<script>\n" + safe_js(app) + "\n</script>")

    if 'src="app.js"' in html or 'href="styles.css"' in html or 'fonts.css' in html:
        sys.exit("build failed: could not inline all assets (did index.html change?)")
    out = os.path.join(HERE, "calorie-counter.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"{msg}; embedded {'foods.json' if foods is not None else 'fallback list'}")
    print(f"wrote {out} ({os.path.getsize(out) // 1024} KB)")

if __name__ == "__main__":
    main()
