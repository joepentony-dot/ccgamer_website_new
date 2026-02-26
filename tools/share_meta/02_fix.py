# tools/share_meta/02_fix.py
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, Tuple

BASE = "https://www.cheekycommodoregamer.co.uk"

RE_HEAD = re.compile(r"(<head\b[^>]*>)(.*?)(</head>)", re.I | re.S)
RE_CANON = re.compile(r'<link[^>]+rel=[\'"]canonical[\'"][^>]*>', re.I)
RE_META_ANY = re.compile(r'<meta[^>]+(?:property|name)=[\'"]([^\'"]+)[\'"][^>]*>', re.I)
RE_TITLE = re.compile(r"<title\b[^>]*>.*?</title>", re.I | re.S)
RE_DESC = re.compile(r'<meta[^>]+name=[\'"]description[\'"][^>]*>', re.I)
RE_REDIRECT = re.compile(r'window\.location\.replace\([\'"][^\'"]+[\'"]\)', re.I)

def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="ignore")

def write_text(p: Path, txt: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(txt, encoding="utf-8")

def make_abs(url_or_path: str) -> str:
    s = (url_or_path or "").strip()
    if not s:
        return ""
    if s.startswith("https://"):
        return s
    if s.startswith("http://"):
        # force https if it's your own domain; otherwise keep (but better than relative)
        if "cheekycommodoregamer.co.uk" in s:
            return s.replace("http://", "https://", 1)
        return s
    # relative path
    if not s.startswith("/"):
        s = "/" + s
    return BASE + s

def extract_existing_meta(html: str) -> Dict[str, str]:
    head_match = RE_HEAD.search(html)
    head = head_match.group(2) if head_match else ""
    meta: Dict[str, str] = {}

    # title
    m = RE_TITLE.search(head)
    if m:
        t = re.sub(r"<\/?title[^>]*>", "", m.group(0), flags=re.I).strip()
        meta["title"] = re.sub(r"\s+", " ", t)

    # description
    m = re.search(r'<meta[^>]+name=[\'"]description[\'"][^>]*content=[\'"]([^\'"]*)', head, flags=re.I)
    if m:
        meta["description"] = m.group(1).strip()

    # og/twitter
    for k in ("og:title", "og:description", "og:image", "twitter:title", "twitter:description", "twitter:image"):
        m = re.search(
            rf'<meta[^>]+(?:property|name)=[\'"]{re.escape(k)}[\'"][^>]*content=[\'"]([^\'"]*)',
            head,
            flags=re.I,
        )
        if m:
            meta[k] = m.group(1).strip()

    return meta

def build_head_block(slug: str, meta: Dict[str, str], want_url: str) -> str:
    title = meta.get("title") or meta.get("og:title") or f"{slug} | Cheeky Commodore Gamer"
    desc = meta.get("description") or meta.get("og:description") or meta.get("twitter:description") or ""
    og_img = make_abs(meta.get("og:image") or meta.get("twitter:image") or "")

    # If still blank, leave blank rather than inventing a wrong path.
    # (You can later extend this to derive from games.json thumbnail fields if desired.)
    lines = []
    lines.append(f"<title>{html_escape(title)}</title>")
    if desc:
        lines.append(f'<meta name="description" content="{html_escape(desc)}">')
    lines.append(f'<link rel="canonical" href="{want_url}">')

    # Open Graph
    lines.append(f'<meta property="og:type" content="website">')
    lines.append(f'<meta property="og:site_name" content="Cheeky Commodore Gamer">')
    lines.append(f'<meta property="og:url" content="{want_url}">')
    lines.append(f'<meta property="og:title" content="{html_escape(title)}">')
    if desc:
        lines.append(f'<meta property="og:description" content="{html_escape(desc)}">')
    if og_img:
        lines.append(f'<meta property="og:image" content="{og_img}">')

    # Twitter
    lines.append(f'<meta name="twitter:card" content="summary_large_image">')
    lines.append(f'<meta name="twitter:title" content="{html_escape(title)}">')
    if desc:
        lines.append(f'<meta name="twitter:description" content="{html_escape(desc)}">')
    if og_img:
        lines.append(f'<meta name="twitter:image" content="{og_img}">')

    return "\n    ".join(lines)

def html_escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
         .replace("<", "&lt;")
         .replace(">", "&gt;")
         .replace('"', "&quot;")
    )

def upsert_head(html: str, head_block: str) -> str:
    m = RE_HEAD.search(html)
    if not m:
        # minimal wrap if missing head (rare)
        return f"<!doctype html>\n<html>\n<head>\n    {head_block}\n</head>\n<body>\n</body>\n</html>\n"

    open_tag, inner, close_tag = m.group(1), m.group(2), m.group(3)

    # Remove existing canonical/meta tags we manage
    inner2 = inner
    inner2 = RE_CANON.sub("", inner2)
    # remove managed metas by key
    def strip_meta(match: re.Match) -> str:
        tag = match.group(0)
        k = match.group(1).strip()
        managed = {
            "og:type","og:site_name","og:url","og:title","og:description","og:image",
            "twitter:card","twitter:title","twitter:description","twitter:image",
        }
        if k.lower() == "description":
            # name="description" tags handled separately by RE_DESC
            return tag
        if k in managed:
            return ""
        return tag

    inner2 = RE_META_ANY.sub(strip_meta, inner2)
    inner2 = RE_DESC.sub("", inner2)
    inner2 = RE_TITLE.sub("", inner2)

    # Insert our block near top of head (keep any other existing tags/scripts/styles)
    new_inner = f"\n    {head_block}\n{inner2.strip()}\n"
    return html[:m.start()] + open_tag + new_inner + close_tag + html[m.end():]

def fix_redirect_id(html: str, game_id: str) -> str:
    # If there is a replace(...) call, standardise it to underscore id
    repl = f'window.location.replace("/games/game.html?id={game_id}")'
    if RE_REDIRECT.search(html):
        return RE_REDIRECT.sub(repl, html, count=1)
    return html

def make_stub(slug: str, game_id: str, head_block: str) -> str:
    # Minimal SEO/share stub that Facebook can scrape, with redirect for humans.
    return f"""<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    {head_block}
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
<script>
{ '    ' }window.location.replace("/games/game.html?id={game_id}");
</script>
<noscript>
    <p><a href="/games/game.html?id={game_id}">Open {html_escape(slug)}</a></p>
</noscript>
</body>
</html>
"""

def main() -> None:
    root = Path(".").resolve()
    games_json = root / "games" / "games.json"
    if not games_json.exists():
        raise SystemExit("ERROR: games/games.json not found. Run this from repo root.")

    games = json.loads(games_json.read_text(encoding="utf-8"))
    changed = 0
    created = 0

    for g in games:
        slug = g.get("slug", "")
        gid = g.get("id", "")
        if not slug or not gid:
            continue

        want_url = f"{BASE}/games/{slug}/"
        html_p = root / "games" / f"{slug}.html"
        idx_p = root / "games" / slug / "index.html"

        # Use existing metadata (prefer .html, else index) as source
        meta: Dict[str, str] = {}
        if html_p.exists():
            meta = extract_existing_meta(read_text(html_p))
        elif idx_p.exists():
            meta = extract_existing_meta(read_text(idx_p))

        head_block = build_head_block(slug, meta, want_url)

        # Ensure compatibility page exists
        if not html_p.exists():
            write_text(html_p, make_stub(slug, gid, head_block))
            created += 1
        else:
            before = read_text(html_p)
            after = fix_redirect_id(upsert_head(before, head_block), gid)
            if after != before:
                write_text(html_p, after)
                changed += 1

        # Ensure directory index exists
        if not idx_p.exists():
            write_text(idx_p, make_stub(slug, gid, head_block))
            created += 1
        else:
            before = read_text(idx_p)
            after = fix_redirect_id(upsert_head(before, head_block), gid)
            if after != before:
                write_text(idx_p, after)
                changed += 1

    print("=== Share Meta Fix ===")
    print(f"Changed files: {changed}")
    print(f"Created files: {created}")
    print("Done. Now run: python tools/share_meta/03_validate.py")

if __name__ == "__main__":
    main()