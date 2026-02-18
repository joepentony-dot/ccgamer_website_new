import json
from datetime import date

BASE_URL = "https://www.cheekycommodoregamer.co.uk/games/"
GAMES_JSON = "games.json"
OUTPUT_FILE = "sitemap-games.xml"

today = date.today().isoformat()

with open(GAMES_JSON, "r", encoding="utf-8") as f:
    games = json.load(f)

urls = []
for game in games:
    slug = game.get("slug")
    if not slug:
        continue
    urls.append(f"{BASE_URL}{slug}.html")

urls = sorted(set(urls))

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
    f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')

    for url in urls:
        f.write("  <url>\n")
        f.write(f"    <loc>{url}</loc>\n")
        f.write(f"    <lastmod>{today}</lastmod>\n")
        f.write("    <changefreq>weekly</changefreq>\n")
        f.write("    <priority>0.6</priority>\n")
        f.write("  </url>\n")

    f.write("</urlset>\n")

print(f"✅ sitemap-games.xml regenerated ({len(urls)} URLs)")