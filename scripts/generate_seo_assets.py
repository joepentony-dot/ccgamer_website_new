#!/usr/bin/env python3
import html
import json
import os
import re
from datetime import date

BASE_URL = "https://www.cheekycommodoregamer.co.uk"
GAMES_JSON = "games/games.json"
OUTPUT_DIR = "games/seo"


def strip_html(text: str) -> str:
    if not text:
        return ""
    return re.sub(r"<[^>]*>", "", str(text)).strip()


def resolve_thumb(raw: str) -> str:
    if not raw:
        return "resources/images/thumbnails/all/1942.jpg"
    t = str(raw).lstrip("/")
    t = (
        t.replace("resources/images/thumbnails/all/", "")
        .replace("resources/images/thumbnails/", "")
        .replace("resources/images/", "")
    )
    return f"resources/images/thumbnails/all/{t}"


def seo_slug(game_id: str) -> str:
    slug = str(game_id).strip().replace("/", "-")
    slug = slug.replace(":", "_").replace("*", "")
    slug = re.sub(r"[?\"<>|]", "", slug)
    slug = re.sub(r"__+", "_", slug).strip("_")
    return slug


page_template = """<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"UTF-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
    <title>{title} | Cheeky Commodore Gamer</title>
    <meta name=\"description\" content=\"{description}\" />
    <link rel=\"canonical\" href=\"{canonical}\" />
    <meta property=\"og:title\" content=\"{title} | Cheeky Commodore Gamer\" />
    <meta property=\"og:description\" content=\"{description}\" />
    <meta property=\"og:type\" content=\"website\" />
    <meta property=\"og:url\" content=\"{canonical}\" />
    <meta property=\"og:image\" content=\"{base_url}/{thumb}\" />

    <link rel=\"icon\" href=\"../../favicon.ico\" />
    <link href=\"https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap\" rel=\"stylesheet\" />
    <link rel=\"stylesheet\" href=\"../../resources/css/ccg-master.css\" />
    <link rel=\"stylesheet\" href=\"../../resources/css/ccg-mode.css\" />
    <link rel=\"stylesheet\" href=\"../../resources/css/ccg-effects.css\" />
    <link rel=\"stylesheet\" href=\"../../resources/css/ccg-anim.css\" />
    <link rel=\"stylesheet\" href=\"../../resources/css/ccg-overlays.css\" />
    <link rel=\"stylesheet\" href=\"../../resources/css/ccg-cards.css\" />
    <link rel=\"stylesheet\" href=\"../../resources/css/games.css\" />
    <link rel=\"stylesheet\" href=\"../../resources/css/ccg-footer.css\" />

    <script type=\"application/ld+json\">{json_ld}</script>
</head>
<body class=\"ccg-body\" data-ccg-mode=\"c64\" data-mode=\"c64\">
<div class=\"ccg-bg\">
    <div class=\"ccg-bg-starfield\"></div>
    <div class=\"ccg-bg-grid\"></div>
    <div class=\"ccg-bg-crt-overlay\"></div>
</div>

<div class=\"ccg-page\">
    <main class=\"ccg-main\">
        <section class=\"game-hero\">
            <div class=\"game-hero__inner\">
                <div class=\"game-hero__media\">
                    <img class=\"game-hero__thumb\" src=\"../../{thumb}\" alt=\"{title} cover\" loading=\"lazy\" />
                </div>
                <div class=\"game-hero__content\">
                    <h1 class=\"game-hero__title\">{title}</h1>
                    <div class=\"game-hero__meta\">
                        <span class=\"game-meta__item\">{year}</span>
                        <span class=\"game-meta__sep\">•</span>
                        <span class=\"game-meta__item\">{system}</span>
                        <span class=\"game-meta__sep\">•</span>
                        <span class=\"game-meta__item\">{developer}</span>
                    </div>
                </div>
            </div>
        </section>

        <section class=\"game-section\">
            <p class=\"game-section__kicker\">Overview</p>
            <h2 class=\"game-section__title\">Game Summary</h2>
            <div class=\"game-description\">{description_html}</div>
        </section>

        <section class=\"game-section\">
            <p class=\"game-section__kicker\">Explore</p>
            <h2 class=\"game-section__title\">More Details</h2>
            <div class=\"game-downloads\">
                <a class=\"ccg-btn ccg-btn--primary\" href=\"../game.html?id={game_id}\">View the full interactive game page</a>
                <a class=\"ccg-btn ccg-btn--ghost\" href=\"../index.html\">Browse all games</a>
            </div>
        </section>
    </main>

    <footer class=\"ccg-footer\">
        <p class=\"ccg-footer__text\">© <span data-ccg-year></span> Cheeky Commodore Gamer. Not affiliated with Commodore, Amiga or publishers.</p>
    </footer>
</div>
<script src=\"../../js/ccg-base.js\" defer></script>
</body>
</html>
"""


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(GAMES_JSON, "r", encoding="utf-8") as f:
        games = json.load(f)

    sitemap_urls = []

    for game in games:
        game_id = str(game.get("id", "")).strip()
        if not game_id:
            continue
        slug = seo_slug(game_id)

        title = str(game.get("title") or "Game").strip()
        year = str(game.get("year") or "Unknown year").strip()
        system = str(game.get("system") or "Commodore").strip()
        developer = str(game.get("developer") or "Unknown developer").strip()
        description = strip_html(game.get("description") or "").strip()
        if not description:
            description = f"{title} on Commodore — screenshots, manual, downloads and video."
        description = description[:160]

        thumb = resolve_thumb(game.get("thumbnail") or game.get("thumb") or game.get("cover"))

        json_ld = {
            "@context": "https://schema.org",
            "@type": "VideoGame",
            "name": title,
            "description": description,
            "datePublished": str(game.get("year") or ""),
            "gamePlatform": system,
            "publisher": developer,
            "image": f"{BASE_URL}/{thumb}",
            "url": f"{BASE_URL}/games/seo/{slug}.html",
        }

        page_html = page_template.format(
            title=html.escape(title),
            description=html.escape(description),
            description_html=html.escape(description),
            canonical=f"{BASE_URL}/games/seo/{slug}.html",
            base_url=BASE_URL,
            thumb=thumb,
            year=html.escape(year),
            system=html.escape(system),
            developer=html.escape(developer),
            game_id=html.escape(game_id),
            json_ld=html.escape(json.dumps(json_ld, ensure_ascii=False)),
        )

        out_path = os.path.join(OUTPUT_DIR, f"{slug}.html")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(page_html)

        sitemap_urls.append(f"{BASE_URL}/games/seo/{slug}.html")

    static_urls = [
        f"{BASE_URL}/",
        f"{BASE_URL}/home.html",
        f"{BASE_URL}/games/index.html",
        f"{BASE_URL}/games/genres/index.html",
        f"{BASE_URL}/games/collections/index.html",
        f"{BASE_URL}/complete-index.html",
        f"{BASE_URL}/about.html",
        f"{BASE_URL}/contact.html",
        f"{BASE_URL}/emulation.html",
        f"{BASE_URL}/quiz/quiz.html",
    ]

    sitemap_entries = static_urls + sitemap_urls

    sitemap = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"]
    for url in sitemap_entries:
        sitemap.append("  <url>")
        sitemap.append(f"    <loc>{url}</loc>")
        sitemap.append(f"    <lastmod>{date.today().isoformat()}</lastmod>")
        sitemap.append("  </url>")

    sitemap.append("</urlset>")

    with open("sitemap.xml", "w", encoding="utf-8") as f:
        f.write("\n".join(sitemap))


if __name__ == "__main__":
    main()
