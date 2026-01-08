#!/usr/bin/env python3
"""
generate_seo_pages.py
---------------------
Offline generator for Cheeky Commodore Gamer (GitHub Pages) SEO landing pages.

What it does (SAFE / ADDITIVE-ONLY):
- Reads:   ccgamer_website_new/games/games.json
- Creates: ccgamer_website_new/games/seo/{id}.html              (if missing)
- Creates: ccgamer_website_new/games/{slug}/index.html          (if missing)

What it will NOT do:
- It will NOT modify games.json
- It will NOT overwrite any existing HTML files
- It will NOT change your site's JS, routing, or loaders

Usage (run from repo root):
  python generate_seo_pages.py

Optional:
  python generate_seo_pages.py --root "C:\\path\\to\\ccgamer_website_new"
  python generate_seo_pages.py --domain "https://www.cheekycommodoregamer.co.uk"
  python generate_seo_pages.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List

DEFAULT_DOMAIN = "https://www.cheekycommodoregamer.co.uk"


def slugify_fallback(value: str) -> str:
    """Fallback slugify if a game has no 'slug' field."""
    v = (value or "").strip().lower()
    v = v.replace("_", "-")
    v = re.sub(r"[^a-z0-9\-]+", "-", v)
    v = re.sub(r"-{2,}", "-", v).strip("-")
    return v or "game"

def safe_filename(value: str) -> str:
    """
    Make a Windows-safe filename from an ID.
    Replaces illegal characters with hyphens.
    """
    return re.sub(r'[\\/:*?"<>|]+', '-', value)

def to_abs_url(domain: str, path: str) -> str:
    """Join domain with a repo-relative path like 'resources/images/..'."""
    p = (path or "").lstrip("/")
    return f"{domain.rstrip('/')}/{p}"


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
    h1: str,
    interactive_href: str,
    browse_href: str,
    favicon_href: str = "../../favicon.ico",
    css_prefix: str = "../../",
    js_base_href: str = "../../js/ccg-base.js",
) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />

    <!-- Auto-redirect SEO page to full interactive game page -->
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

    <link rel="icon" href="{favicon_href}" />

    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />

    <link rel="stylesheet" href="{css_prefix}resources/css/ccg-master.css" />
    <link rel="stylesheet" href="{css_prefix}resources/css/ccg-mode.css" />
    <link rel="stylesheet" href="{css_prefix}resources/css/ccg-effects.css" />
    <link rel="stylesheet" href="{css_prefix}resources/css/ccg-anim.css" />
    <link rel="stylesheet" href="{css_prefix}resources/css/ccg-overlays.css" />
    <link rel="stylesheet" href="{css_prefix}resources/css/ccg-cards.css" />
    <link rel="stylesheet" href="{css_prefix}resources/css/games.css" />
    <link rel="stylesheet" href="{css_prefix}resources/css/ccg-footer.css" />

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
<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">

<div class="ccg-bg">
    <div class="ccg-bg-starfield"></div>
    <div class="ccg-bg-grid"></div>
    <div class="ccg-bg-crt-overlay"></div>
</div>

<div class="ccg-page">
    <main class="ccg-main">

        <section class="game-hero">
            <div class="game-hero__inner">

                <div class="game-hero__media">
                    <img
                        class="game-hero__thumb"
                        src="{thumb_src_rel}"
                        alt="{thumb_alt}"
                        loading="lazy"
                    />
                </div>

                <div class="game-hero__content">
                    <h1 class="game-hero__title">{h1}</h1>

                    <div class="game-hero__meta">
                        <span class="game-meta__item">{year}</span>
                        <span class="game-meta__sep">•</span>
                        <span class="game-meta__item">{platform}</span>
                        <span class="game-meta__sep">•</span>
                        <span class="game-meta__item">{publisher}</span>
                    </div>
                </div>

            </div>
        </section>

        <section class="game-section">
            <p class="game-section__kicker">Overview</p>
            <h2 class="game-section__title">Game Summary</h2>

            <div class="game-description">
                {description}
            </div>
        </section>

        <section class="game-section">
            <p class="game-section__kicker">Explore</p>
            <h2 class="game-section__title">More Details</h2>

            <div class="game-downloads">
                <a class="ccg-btn ccg-btn--primary"
                   href="{interactive_href}">
                    View the full interactive game page
                </a>

                <a class="ccg-btn ccg-btn--ghost"
                   href="{browse_href}">
                    Browse all games
                </a>
            </div>
        </section>

    </main>

    <footer class="ccg-footer">
        <p class="ccg-footer__text">
            © <span data-ccg-year></span> Cheeky Commodore Gamer.
            Not affiliated with Commodore, Amiga or publishers.
        </p>
    </footer>
</div>

<script src="{js_base_href}" defer></script>

</body>
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
    raise ValueError(f"Unsupported games.json shape in {json_path}")


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
    ap.add_argument("--root", default="ccgamer_website_new", help="Path to repo root folder (default: ccgamer_website_new)")
    ap.add_argument("--domain", default=DEFAULT_DOMAIN, help=f"Public site domain (default: {DEFAULT_DOMAIN})")
    ap.add_argument("--dry-run", action="store_true", help="Do not write files, just report what would be generated")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    games_json = root / "games" / "games.json"
    if not games_json.exists():
        raise FileNotFoundError(f"Could not find games.json at: {games_json}")

    domain = args.domain.rstrip("/")
    games = load_games(games_json)

    seo_dir = root / "games" / "seo"
    created_seo = 0
    created_pretty = 0
    skipped = 0

    for g in games:
        game_id = str(g.get("id", "")).strip()
        if not game_id:
            skipped += 1
            continue

        slug = str(g.get("slug", "")).strip()
        if not slug:
            slug = slugify_fallback(game_id)

        title = str(g.get("title", game_id)).strip() or game_id
        year = str(g.get("year", "")).strip() or ""
        platform = str(g.get("system", "")).strip().upper() or ""
        publisher = str(g.get("developer", "")).strip() or ""
        thumb_rel = str(g.get("thumbnail", "")).lstrip("/")  # e.g. resources/images/thumbnails/all/x.jpg
        if not thumb_rel:
            thumb_rel = "resources/images/thumbnails/all/placeholder.jpg"

        desc = make_description(title)

        # 1) SEO file (keeps your existing /games/seo/ pattern)
        seo_filename = safe_filename(game_id)
        seo_file = seo_dir / f"{seo_filename}.html"
        seo_url = f"{domain}/games/seo/{seo_filename}.html"
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
            h1=title,
            interactive_href=f"../game.html?id={game_id}",
            browse_href="../index.html",
        )

        if write_if_missing(seo_file, seo_html, args.dry_run):
            created_seo += 1

        # 2) Pretty URL folder index (THIS enables /games/{slug}/)
        pretty_dir = root / "games" / slug
        pretty_index = pretty_dir / "index.html"
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
            h1=title,
            interactive_href=f"../game.html?id={game_id}",
            browse_href="../index.html",
        )

        if write_if_missing(pretty_index, pretty_html, args.dry_run):
            created_pretty += 1

    print("=== CCG SEO Generation Report ===")
    print(f"Repo root: {root}")
    print(f"games.json: {games_json}")
    print(f"SEO pages created: {created_seo}  (games/seo/)")
    print(f"Pretty URL pages created: {created_pretty}  (games/{{slug}}/index.html)")
    print(f"Skipped entries (missing id): {skipped}")
    if args.dry_run:
        print("DRY RUN: No files were written.")
    else:
        print("Done. Commit and push the generated files to publish them.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
