#!/usr/bin/env python3
"""
generate_seo_pages.py
---------------------
Offline SEO + pretty-URL generator for Cheeky Commodore Gamer (GitHub Pages).

SAFE / ADDITIVE-ONLY BEHAVIOUR
-----------------------------
✔ Reads:   games/games.json
✔ Creates: games/seo/{id}.html            (SEO landing + redirect)
✔ Creates: games/{slug}/index.html        (Pretty URL entry)

✖ Does NOT modify games.json
✖ Does NOT overwrite existing HTML
✖ Does NOT touch JS, loaders, routing, or navigation

IMPORTANT:
- Explicitly excludes non-game navigation routes (genres, collections)
- Designed to be run after adding new games only

Usage:
  python generate_seo_pages.py --root .

Optional:
  python generate_seo_pages.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List

DEFAULT_DOMAIN = "https://www.cheekycommodoregamer.co.uk"

# Slugs that must NEVER be treated as games
NON_GAME_SLUGS = {"genres", "collections"}


def slugify_fallback(value: str) -> str:
    """Generate a safe slug if none is provided."""
    v = (value or "").strip().lower()
    v = v.replace("_", "-")
    v = re.sub(r"[^a-z0-9\-]+", "-", v)
    v = re.sub(r"-{2,}", "-", v).strip("-")
    return v or "game"


def safe_filename(value: str) -> str:
    """Windows-safe filename for SEO HTML."""
    return re.sub(r'[\\/:*?"<>|]+', "-", value)


def to_abs_url(domain: str, path: str) -> str:
    """Convert repo-relative path to absolute URL."""
    return f"{domain.rstrip('/')}/{path.lstrip('/')}"


def make_description(title: str) -> str:
    return f"{title} on Commodore — screenshots, manual, downloads and video."


def seo_template(
    *,
    title: str,
    description: str,
    canonical_url: str,
    og_url: str,
    og_image: str,
    year: str,
    platform: str,
    publisher: str,
    schema_url: str,
    schema_image: str,
    thumb_src_rel: str,
    thumb_alt: str,
    interactive_href: str,
    browse_href: str,
) -> str:
    """SEO landing page that immediately redirects to the interactive game page."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />

    <!-- SEO landing page → redirect to interactive game page -->
    <script>
      (function () {{
        var target = "{interactive_href}";
        if (target) {{
          window.location.replace(target);
        }}
      }})();
    </script>

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>{title} | Cheeky Commodore Gamer</title>
    <meta name="description" content="{description}" />

    <link rel="canonical" href="{canonical_url}" />

    <meta property="og:title" content="{title} | Cheeky Commodore Gamer" />
    <meta property="og:description" content="{description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{og_url}" />
    <meta property="og:image" content="{og_image}" />

    <script type="application/ld+json">
    {{
        "@context": "https://schema.org",
        "@type": "VideoGame",
        "name": "{title}",
        "description": "{description}",
        "datePublished": "{year}",
        "gamePlatform": "{platform}",
        "publisher": "{publisher}",
        "image": "{schema_image}",
        "url": "{schema_url}"
    }}
    </script>
</head>
<body></body>
</html>
"""


def load_games(json_path: Path) -> List[Dict[str, Any]]:
    data = json.loads(json_path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("games", "items", "data"):
            if key in data and isinstance(data[key], list):
                return data[key]
    raise ValueError("Unsupported games.json format")


def write_if_missing(path: Path, content: str, dry_run: bool) -> bool:
    if path.exists():
        return False
    if dry_run:
        return True
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="Path to repo root")
    ap.add_argument("--domain", default=DEFAULT_DOMAIN)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    games_json = root / "games" / "games.json"
    if not games_json.exists():
        raise FileNotFoundError(f"games.json not found: {games_json}")

    games = load_games(games_json)
    domain = args.domain.rstrip("/")

    created_seo = created_pretty = skipped = 0

    for g in games:
        game_id = str(g.get("id", "")).strip()
        if not game_id:
            skipped += 1
            continue

        slug = str(g.get("slug", "")).strip() or slugify_fallback(game_id)

        # 🚫 CRITICAL SAFETY CHECK
        if slug in NON_GAME_SLUGS:
            continue

        title = str(g.get("title", game_id)).strip()
        year = str(g.get("year", ""))
        platform = str(g.get("system", "")).upper()
        publisher = str(g.get("developer", ""))
        thumb_rel = g.get("thumbnail", "resources/images/thumbnails/all/placeholder.jpg")

        desc = make_description(title)

        # SEO file
        seo_name = safe_filename(game_id)
        seo_file = root / "games" / "seo" / f"{seo_name}.html"
        seo_url = f"{domain}/games/seo/{seo_name}.html"

        seo_html = seo_template(
            title=title,
            description=desc,
            canonical_url=seo_url,
            og_url=seo_url,
            og_image=to_abs_url(domain, thumb_rel),
            year=year,
            platform=platform,
            publisher=publisher,
            schema_url=seo_url,
            schema_image=to_abs_url(domain, thumb_rel),
            thumb_src_rel=f"../../{thumb_rel}",
            thumb_alt=f"{title} cover",
            interactive_href=f"../game.html?id={game_id}",
            browse_href="../index.html",
        )

        if write_if_missing(seo_file, seo_html, args.dry_run):
            created_seo += 1

        # Pretty URL
        pretty_index = root / "games" / slug / "index.html"
        pretty_url = f"{domain}/games/{slug}/"

        pretty_html = seo_template(
            title=title,
            description=desc,
            canonical_url=pretty_url,
            og_url=pretty_url,
            og_image=to_abs_url(domain, thumb_rel),
            year=year,
            platform=platform,
            publisher=publisher,
            schema_url=pretty_url,
            schema_image=to_abs_url(domain, thumb_rel),
            thumb_src_rel=f"../../{thumb_rel}",
            thumb_alt=f"{title} cover",
            interactive_href=f"../game.html?id={game_id}",
            browse_href="../index.html",
        )

        if write_if_missing(pretty_index, pretty_html, args.dry_run):
            created_pretty += 1

    print("=== CCG SEO Generation Report ===")
    print(f"SEO pages created: {created_seo}")
    print(f"Pretty URL pages created: {created_pretty}")
    print(f"Skipped entries: {skipped}")
    print("DRY RUN" if args.dry_run else "Done. Commit and push.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
