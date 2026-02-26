# tools/share_meta/01_audit.py
from __future__ import annotations

import json
import re
from pathlib import Path
from dataclasses import dataclass
from typing import Optional, Dict, List, Tuple

BASE = "https://www.cheekycommodoregamer.co.uk"

RE_CANON = re.compile(r'<link[^>]+rel=[\'"]canonical[\'"][^>]*href=[\'"]([^\'"]+)', re.I)
RE_META = re.compile(
    r'<meta[^>]+(?:property|name)=[\'"]([^\'"]+)[\'"][^>]*content=[\'"]([^\'"]*)',
    re.I,
)
RE_REDIRECT = re.compile(r'window\.location\.replace\([\'"]([^\'"]+)[\'"]\)', re.I)

def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="ignore")

def extract_head(html: str) -> str:
    m = re.search(r"<head\b[^>]*>(.*?)</head>", html, flags=re.I | re.S)
    return m.group(1) if m else ""

def get_canonical(html: str) -> str:
    m = RE_CANON.search(html)
    return m.group(1).strip() if m else ""

def get_meta_map(html: str) -> Dict[str, str]:
    head = extract_head(html)
    out: Dict[str, str] = {}
    for k, v in RE_META.findall(head):
        out[k.strip()] = v.strip()
    return out

def get_redirect_id(html: str) -> str:
    m = RE_REDIRECT.search(html)
    if not m:
        return ""
    url = m.group(1)
    m2 = re.search(r"[?&]id=([^&]+)", url)
    return m2.group(1) if m2 else ""

def exists_pair(root: Path, slug: str) -> Tuple[Path, Path]:
    return root / "games" / f"{slug}.html", root / "games" / slug / "index.html"

@dataclass
class Issue:
    kind: str
    path: str
    detail: str

def main() -> None:
    root = Path(".").resolve()
    games_json = root / "games" / "games.json"
    if not games_json.exists():
        raise SystemExit("ERROR: games/games.json not found. Run this from repo root.")

    games = json.loads(games_json.read_text(encoding="utf-8"))
    issues: List[Issue] = []

    for g in games:
        slug = g.get("slug", "")
        gid = g.get("id", "")
        if not slug or not gid:
            continue

        html_p, idx_p = exists_pair(root, slug)
        want_url = f"{BASE}/games/{slug}/"

        for p in (html_p, idx_p):
            if not p.exists():
                issues.append(Issue("missing", str(p), "file does not exist"))
                continue

            html = read_text(p)
            canon = get_canonical(html)
            meta = get_meta_map(html)

            og_url = meta.get("og:url", "")
            tw_card = meta.get("twitter:card", "")
            og_img = meta.get("og:image", "")
            tw_img = meta.get("twitter:image", "")

            if canon != want_url:
                issues.append(Issue("canonical", str(p), f"{canon!r} != {want_url!r}"))
            if og_url != want_url:
                issues.append(Issue("og:url", str(p), f"{og_url!r} != {want_url!r}"))
            if not tw_card:
                issues.append(Issue("twitter:card", str(p), "missing twitter:card"))
            if og_img and not og_img.startswith("https://"):
                issues.append(Issue("og:image", str(p), f"not absolute https: {og_img!r}"))
            if tw_img and not tw_img.startswith("https://"):
                issues.append(Issue("twitter:image", str(p), f"not absolute https: {tw_img!r}"))

            rid = get_redirect_id(html)
            if rid and rid != gid:
                issues.append(Issue("redirect_id", str(p), f"{rid!r} != {gid!r}"))

    # Summary
    print("=== Share Meta Audit ===")
    print(f"BASE: {BASE}")
    print(f"Issues found: {len(issues)}")
    if issues:
        # show first 60
        for i, it in enumerate(issues[:60], 1):
            print(f"{i:02d}. {it.kind:12} {it.path} :: {it.detail}")
        if len(issues) > 60:
            print(f"... ({len(issues)-60} more)")
        raise SystemExit(1)

    print("OK: All checked game pages/stubs match the 20 Tons standard.")

if __name__ == "__main__":
    main()