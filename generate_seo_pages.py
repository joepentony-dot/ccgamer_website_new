#!/usr/bin/env python3
"""
generate_seo_pages.py
---------------------
Offline SEO generator for Cheeky Commodore Gamer (GitHub Pages).

SAFE / ADDITIVE-ONLY BEHAVIOUR
-----------------------------
✔ Reads:   games/games.json
✔ Creates: games/seo/{id}.html            (SEO landing + redirect)

✖ Does NOT modify games.json
✖ Does NOT overwrite existing HTML
✖ Does NOT touch JS, loaders, routing, or navigation

IMPORTANT:
- Designed to be run after adding new games only

Usage:
  python generate_seo_pages.py --root .

Optional:
  python generate_seo_pages.py --dry-run
"""

from __future__ import annotations

import argparse
import html
import json
from pathlib import Path
from typing import Any, Dict, List

DEFAULT_DOMAIN = "https://www.cheekycommodoregamer.co.uk"



def to_abs_url(domain: str, path: str) -> str:
    """Convert repo-relative path to absolute URL."""
    return f"{domain.rstrip('/')}/{path.lstrip('/')}"


def make_description(title: str) -> str:
    return f"{title} on Commodore — screenshots, manual, downloads and video."


def resolve_mode(system: str) -> str:
    system_value = (system or "").strip().lower()
    return "amiga" if "amiga" in system_value else "c64"


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
    mode: str,
    interactive_href: str,
    browse_href: str,
) -> str:
    """SEO landing page that immediately redirects to the interactive game page."""
    safe_title = html.escape(title)
    safe_description = html.escape(description)
    safe_year = html.escape(year)
    safe_platform = html.escape(platform)
    safe_publisher = html.escape(publisher)
    safe_thumb_alt = html.escape(thumb_alt)
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

    <title>{safe_title} | Cheeky Commodore Gamer</title>
    <meta name="description" content="{safe_description}" />

    <link rel="canonical" href="{canonical_url}" />

    <meta property="og:title" content="{safe_title} | Cheeky Commodore Gamer" />
    <meta property="og:description" content="{safe_description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{og_url}" />
    <meta property="og:image" content="{og_image}" />

    <link rel="icon" href="../../favicon.ico" />

    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />

    <link rel="stylesheet" href="../../resources/css/ccg-master.css" />
    <link rel="stylesheet" href="../../resources/css/ccg-mode.css" />
    <link rel="stylesheet" href="../../resources/css/ccg-effects.css" />
    <link rel="stylesheet" href="../../resources/css/ccg-anim.css" />
    <link rel="stylesheet" href="../../resources/css/ccg-overlays.css" />
    <link rel="stylesheet" href="../../resources/css/ccg-cards.css" />
    <link rel="stylesheet" href="../../resources/css/games.css" />
    <link rel="stylesheet" href="../../resources/css/ccg-footer.css" />

    <script type="application/ld+json">
    {{
        "@context": "https://schema.org",
        "@type": "VideoGame",
        "name": "{safe_title}",
        "description": "{safe_description}",
        "datePublished": "{safe_year}",
        "gamePlatform": "{safe_platform}",
        "publisher": "{safe_publisher}",
        "image": "{schema_image}",
        "url": "{schema_url}"
    }}
    </script>
</head>
<body class="ccg-body" data-ccg-mode="{mode}" data-mode="{mode}">

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
                        alt="{safe_thumb_alt}"
                        loading="lazy"
                    />
                </div>

                <div class="game-hero__content">
                    <h1 class="game-hero__title">{safe_title}</h1>

                    <div class="game-hero__meta">
                        <span class="game-meta__item">{safe_year}</span>
                        <span class="game-meta__sep">•</span>
                        <span class="game-meta__item">{safe_platform}</span>
                        <span class="game-meta__sep">•</span>
                        <span class="game-meta__item">{safe_publisher}</span>
                    </div>
                </div>

            </div>
        </section>

        <section class="game-section">
            <p class="game-section__kicker">Overview</p>
            <h2 class="game-section__title">Game Summary</h2>

            <div class="game-description">
                {safe_description}
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

<script src="../../js/ccg-base.js" defer></script>

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

    created_seo = skipped = 0

    for g in games:
        game_id = str(g.get("id", "")).strip()
        if not game_id:
            skipped += 1
            continue

        title = str(g.get("title", game_id)).strip()
        year = str(g.get("year", ""))
        platform = str(g.get("system", "")).upper()
        publisher = str(g.get("developer", g.get("publisher", "")))
        thumb_rel = g.get("thumbnail", "resources/images/thumbnails/all/placeholder.jpg")
        mode = resolve_mode(str(g.get("system", "")))

        desc = make_description(title)

        # SEO file
        seo_name = game_id
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
            mode=mode,
            interactive_href=f"../game.html?id={game_id}",
            browse_href="../index.html",
        )

        if write_if_missing(seo_file, seo_html, args.dry_run):
            created_seo += 1

    print("=== CCG SEO Generation Report ===")
    print(f"SEO pages created: {created_seo}")
    print(f"Skipped entries: {skipped}")
    print("DRY RUN" if args.dry_run else "Done. Commit and push.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
