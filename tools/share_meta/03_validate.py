# tools/share_meta/03_validate.py
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import List

BASE = "https://www.cheekycommodoregamer.co.uk"

RE_CANON = re.compile(r'<link[^>]+rel=[\'"]canonical[\'"][^>]*href=[\'"]([^\'"]+)', re.I)
RE_META = re.compile(
    r'<meta[^>]+(?:property|name)=[\'"]([^\'"]+)[\'"][^>]*content=[\'"]([^\'"]*)',
    re.I,
)
RE_REDIRECT = re.compile(r'window\.location\.replace\([\'"]([^\'"]+)[\'"]\)', re.I)

def extract_head(html: str) -> str:
    m = re.search(r"<head\b[^>]*>(.*?)</head>", html, flags=re.I | re.S)
    return m.group(1) if m else ""

def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="ignore")

def get_canonical(html: str) -> str:
    m = RE_CANON.search(html)
    return m.group(1).strip() if m else ""

def get_meta(html: str, key: str) -> str:
    head = extract_head(html)
    for k, v in RE_META.findall(head):
        if k.strip().lower() == key.lower():
            return v.strip()
    return ""

def get_redirect_id(html: str) -> str:
    m = RE_REDIRECT.search(html)
    if not m:
        return ""
    url = m.group(1)
    m2 = re.search(r"[?&]id=([^&]+)", url)
    return m2.group(1) if m2 else ""

def main() -> None:
    root = Path(".").resolve()
    games_json = root / "games" / "games.json"
    games = json.loads(games_json.read_text(encoding="utf-8"))

    bad: List[str] = []

    for g in games:
        slug = g.get("slug", "")
        gid = g.get("id", "")
        if not slug or not gid:
            continue

        want = f"{BASE}/games/{slug}/"
        for p in (root / "games" / f"{slug}.html", root / "games" / slug / "index.html"):
            if not p.exists():
                bad.append(f"missing:{p}")
                continue

            html = read_text(p)
            canon = get_canonical(html)
            ogurl = get_meta(html, "og:url")
            tw = get_meta(html, "twitter:card")
            ogimg = get_meta(html, "og:image")
            twimg = get_meta(html, "twitter:image")
            rid = get_redirect_id(html)

            if canon != want:
                bad.append(f"canonical:{p}")
            if ogurl != want:
                bad.append(f"ogurl:{p}")
            if not tw:
                bad.append(f"twittercard:{p}")
            if ogimg and not ogimg.startswith("https://"):
                bad.append(f"ogimg:{p}")
            if twimg and not twimg.startswith("https://"):
                bad.append(f"twimg:{p}")
            if rid and rid != gid:
                bad.append(f"redirect:{p}")

    print("=== Share Meta Validate ===")
    print("issues", len(bad))
    if bad:
        print("\n".join(bad[:80]))
        raise SystemExit(1)
    print("OK: All games conform to directory canonical + OG/Twitter + underscore redirect ID.")

if __name__ == "__main__":
    main()