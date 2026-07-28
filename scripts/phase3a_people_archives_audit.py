#!/usr/bin/env python3
"""Read-only Phase 3A audit of developer and composer archive coverage."""

from __future__ import annotations

import json
import re
import unicodedata
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from html import unescape
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SITE_ROOT = "https://www.cheekycommodoregamer.co.uk"
GAMES_PATH = ROOT / "games" / "games.json"
REPORT_DIR = ROOT / "docs" / "seo-baseline"
JSON_PATH = REPORT_DIR / "phase-3a-people-archives.json"
MD_PATH = REPORT_DIR / "phase-3a-people-archives.md"

HTML_LINK_RE = re.compile(r"<a\b[^>]*href\s*=\s*([\"'])(.*?)\1", re.I | re.S)
TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)
META_RE = re.compile(r"<meta\b[^>]*(?:name|property)\s*=\s*([\"'])(.*?)\1[^>]*>", re.I | re.S)
CANONICAL_RE = re.compile(r"<link\b[^>]*rel\s*=\s*([\"'])canonical\1[^>]*>", re.I | re.S)
DATA_COMPOSER_RE = re.compile(r"data-composer-name\s*=\s*([\"'])(.*?)\1", re.I | re.S)
PROFILE_RE = re.compile(
    r'"(?P<slug>[a-z0-9-]+)"\s*:\s*\{\s*name\s*:\s*"(?P<name>[^"]+)"',
    re.I,
)
AUDIO_EXT_RE = re.compile(r"\.(?:mp3|ogg|wav|flac|sid|mod|xm|s3m)$", re.I)


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def strip_tags(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", unescape(value)).strip()


def tag_attr(tag: str, attr: str) -> str:
    match = re.search(rf"\b{re.escape(attr)}\s*=\s*([\"'])(.*?)\1", tag, re.I | re.S)
    return unescape(match.group(2)).strip() if match else ""


def extract_meta(html: str, key: str) -> str:
    for match in META_RE.finditer(html):
        tag = match.group(0)
        if match.group(2).strip().lower() == key.lower():
            return tag_attr(tag, "content")
    return ""


def extract_title(html: str) -> str:
    match = TITLE_RE.search(html)
    return strip_tags(match.group(1)) if match else ""


def extract_canonical(html: str) -> str:
    match = CANONICAL_RE.search(html)
    return tag_attr(match.group(0), "href") if match else ""


def normalize_name(value: object) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def slugify(value: object) -> str:
    return normalize_name(value).replace(" ", "-")


def values(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def developer_names(game: dict) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    credits = game.get("credits") if isinstance(game.get("credits"), dict) else {}
    fields = [
        ("developer", game.get("developer")),
        ("developers", game.get("developers")),
        ("developedBy", game.get("developedBy")),
        ("credits.developer", credits.get("developer")),
        ("credits.developers", credits.get("developers")),
    ]
    for source, raw in fields:
        for name in values(raw):
            if normalize_name(name):
                found.append((name, source))
    return found


def composer_names(game: dict) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    credits = game.get("credits") if isinstance(game.get("credits"), dict) else {}
    fields = [
        ("credits.musician", credits.get("musician")),
        ("musicBy", game.get("musicBy")),
        ("composers", game.get("composers")),
        ("composer", game.get("composer")),
    ]
    for source, raw in fields:
        for name in values(raw):
            if normalize_name(name) and not AUDIO_EXT_RE.search(name):
                found.append((name, source))

    legacy = game.get("music")
    if isinstance(legacy, list):
        for item in legacy:
            name = str(item or "").strip()
            if name and re.search(r"[A-Za-z]", name) and not AUDIO_EXT_RE.search(name):
                found.append((name, "music"))
    return found


def build_entity_index(games: list[dict], extractor) -> tuple[dict, Counter, Counter, int]:
    index: dict[str, dict] = {}
    source_counts: Counter[str] = Counter()
    variants: dict[str, Counter[str]] = defaultdict(Counter)
    games_with_credit = 0

    for game in games:
        game_slug = str(game.get("slug") or game.get("id") or "").strip()
        extracted = extractor(game)
        normalized_seen: set[str] = set()
        if extracted:
            games_with_credit += 1
        for raw_name, source in extracted:
            key = normalize_name(raw_name)
            if not key:
                continue
            source_counts[source] += 1
            variants[key][raw_name] += 1
            entity = index.setdefault(
                key,
                {
                    "name": raw_name,
                    "slug": slugify(raw_name),
                    "games": set(),
                    "sources": Counter(),
                    "variants": set(),
                },
            )
            entity["variants"].add(raw_name)
            entity["sources"][source] += 1
            if game_slug and key not in normalized_seen:
                entity["games"].add(game_slug)
                normalized_seen.add(key)

    for key, entity in index.items():
        preferred = variants[key].most_common(1)[0][0]
        entity["name"] = preferred
        entity["slug"] = slugify(preferred)
        entity["games"] = sorted(entity["games"])
        entity["sources"] = dict(entity["sources"])
        entity["variants"] = sorted(entity["variants"])
    duplicate_variant_groups = Counter(
        {key: len(entity["variants"]) for key, entity in index.items() if len(entity["variants"]) > 1}
    )
    return index, source_counts, duplicate_variant_groups, games_with_credit


def parse_sitemap_urls() -> set[str]:
    urls: set[str] = set()
    for path in ROOT.glob("sitemap*.xml"):
        try:
            root = ET.parse(path).getroot()
        except ET.ParseError:
            continue
        for loc in root.findall(".//{*}loc"):
            value = str(loc.text or "").strip()
            if value:
                urls.add(value)
    return urls


def local_path_from_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path or "/"
    path = re.sub(r"/{2,}", "/", path)
    return path


def page_record(path: Path, sitemap_urls: set[str]) -> dict:
    html = path.read_text(encoding="utf-8", errors="ignore")
    canonical = extract_canonical(html)
    robots = extract_meta(html, "robots")
    return {
        "file": rel(path),
        "title": extract_title(html),
        "canonical": canonical,
        "robots": robots,
        "indexable": "noindex" not in robots.lower(),
        "in_sitemap": canonical in sitemap_urls if canonical else False,
        "static_links": [unescape(match.group(2)).strip() for match in HTML_LINK_RE.finditer(html)],
    }


def composer_pages(sitemap_urls: set[str]) -> tuple[list[dict], dict[str, str]]:
    pages: list[dict] = []
    names_by_slug: dict[str, str] = {}
    music_dir = ROOT / "music"
    if not music_dir.exists():
        return pages, names_by_slug

    for path in sorted(music_dir.glob("*/index.html")):
        if path.parent.name == "composers":
            continue
        html = path.read_text(encoding="utf-8", errors="ignore")
        if 'data-ccg-page="music-composer"' not in html and "data-ccg-page='music-composer'" not in html:
            continue
        record = page_record(path, sitemap_urls)
        slug = path.parent.name
        name_match = DATA_COMPOSER_RE.search(html)
        name = unescape(name_match.group(2)).strip() if name_match else ""
        record.update({"slug": slug, "name": name})
        pages.append(record)
        if name:
            names_by_slug[slug] = name
    return pages, names_by_slug


def profile_registry() -> dict[str, str]:
    path = ROOT / "js" / "music-composer-pages.js"
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8", errors="ignore")
    return {match.group("slug"): match.group("name") for match in PROFILE_RE.finditer(text)}


def developer_archive_pages(sitemap_urls: set[str]) -> list[dict]:
    candidates: list[Path] = []
    for pattern in (
        "developers/**/*.html",
        "games/developers/**/*.html",
        "games/developer/**/*.html",
        "developer/**/*.html",
    ):
        candidates.extend(ROOT.glob(pattern))
    for path in (
        ROOT / "developers.html",
        ROOT / "games" / "developers.html",
        ROOT / "developer.html",
        ROOT / "games" / "developer.html",
    ):
        if path.exists():
            candidates.append(path)

    unique = sorted(set(candidates))
    return [page_record(path, sitemap_urls) for path in unique]


def internal_archive_links() -> dict:
    composer_hub = 0
    composer_profiles = 0
    developer_archive = 0
    sources: Counter[str] = Counter()
    for path in ROOT.rglob("*.html"):
        relative = rel(path)
        if relative.startswith(("admin/", "templates/", "resources/", "validation/")):
            continue
        html = path.read_text(encoding="utf-8", errors="ignore")
        for match in HTML_LINK_RE.finditer(html):
            href = unescape(match.group(2)).strip()
            parsed_path = local_path_from_url(href)
            if parsed_path == "/music/composers/":
                composer_hub += 1
                sources[relative] += 1
            elif re.fullmatch(r"/music/[a-z0-9-]+/", parsed_path):
                composer_profiles += 1
            if re.search(r"/(?:games/)?developers?(?:/|\.html|$)", parsed_path):
                developer_archive += 1
    return {
        "composer_hub_links": composer_hub,
        "composer_profile_links": composer_profiles,
        "developer_archive_links": developer_archive,
        "composer_hub_link_sources": dict(sources.most_common()),
    }


def serialise_entities(index: dict) -> list[dict]:
    records = []
    for key, entity in index.items():
        records.append(
            {
                "normalized": key,
                "name": entity["name"],
                "slug": entity["slug"],
                "game_count": len(entity["games"]),
                "games": entity["games"],
                "sources": entity["sources"],
                "variants": entity["variants"],
            }
        )
    return sorted(records, key=lambda item: (-item["game_count"], item["name"].lower()))


def main() -> None:
    games = json.loads(GAMES_PATH.read_text(encoding="utf-8"))
    if not isinstance(games, list):
        raise SystemExit("games/games.json must contain an array")

    developers, developer_sources, developer_variant_groups, games_with_developer = build_entity_index(
        games, developer_names
    )
    composers, composer_sources, composer_variant_groups, games_with_composer = build_entity_index(
        games, composer_names
    )

    sitemap_urls = parse_sitemap_urls()
    dedicated_composer_pages, composer_names_by_slug = composer_pages(sitemap_urls)
    profile_data = profile_registry()
    developer_pages = developer_archive_pages(sitemap_urls)
    links = internal_archive_links()

    dedicated_slugs = {page["slug"] for page in dedicated_composer_pages}
    credited_composer_slugs = {entity["slug"] for entity in composers.values()}
    profile_slugs = set(profile_data)
    dedicated_with_credits = sorted(dedicated_slugs & credited_composer_slugs)
    dynamic_only_slugs = sorted(credited_composer_slugs - dedicated_slugs)
    dedicated_without_credits = sorted(dedicated_slugs - credited_composer_slugs)
    profile_without_page = sorted(profile_slugs - dedicated_slugs)

    composer_hub_path = ROOT / "music" / "composers" / "index.html"
    composer_fallback_path = ROOT / "music" / "composer.html"
    composer_hub = page_record(composer_hub_path, sitemap_urls) if composer_hub_path.exists() else None
    composer_fallback = page_record(composer_fallback_path, sitemap_urls) if composer_fallback_path.exists() else None
    static_profile_links = []
    if composer_hub:
        static_profile_links = sorted(
            {
                local_path_from_url(link)
                for link in composer_hub["static_links"]
                if re.fullmatch(r"/music/[a-z0-9-]+/", local_path_from_url(link))
            }
        )

    summary = {
        "game_records": len(games),
        "games_with_developer_credit": games_with_developer,
        "unique_developer_entities": len(developers),
        "developer_archive_pages": len(developer_pages),
        "indexable_developer_archive_pages": sum(1 for page in developer_pages if page["indexable"]),
        "games_with_composer_credit": games_with_composer,
        "unique_composer_entities": len(composers),
        "dedicated_composer_pages": len(dedicated_composer_pages),
        "credited_composers_with_dedicated_page": len(dedicated_with_credits),
        "credited_composers_dynamic_only": len(dynamic_only_slugs),
        "dedicated_composer_pages_without_game_credit": len(dedicated_without_credits),
        "profile_registry_entries": len(profile_data),
        "profile_registry_entries_without_page": len(profile_without_page),
        "composer_hub_static_profile_links": len(static_profile_links),
        "developer_name_variant_groups": len(developer_variant_groups),
        "composer_name_variant_groups": len(composer_variant_groups),
    }

    findings = {
        "summary": summary,
        "developer_field_sources": dict(developer_sources),
        "composer_field_sources": dict(composer_sources),
        "developers": serialise_entities(developers),
        "composers": serialise_entities(composers),
        "developer_archive_pages": developer_pages,
        "dedicated_composer_pages": dedicated_composer_pages,
        "composer_profile_registry": profile_data,
        "composer_page_names": composer_names_by_slug,
        "credited_composer_slugs_with_dedicated_page": dedicated_with_credits,
        "credited_composer_slugs_dynamic_only": dynamic_only_slugs,
        "dedicated_composer_slugs_without_game_credit": dedicated_without_credits,
        "profile_registry_slugs_without_page": profile_without_page,
        "composer_hub": composer_hub,
        "composer_fallback": composer_fallback,
        "composer_hub_static_profile_links": static_profile_links,
        "internal_archive_links": links,
        "name_variant_groups": {
            "developers": {key: developers[key]["variants"] for key in developer_variant_groups},
            "composers": {key: composers[key]["variants"] for key in composer_variant_groups},
        },
        "limitations": [
            "The audit uses repository data and static HTML only; it does not execute browser JavaScript.",
            "Developer identity is based only on explicit developer fields and does not infer developers from publishers or programmers.",
            "Composer identity follows the fields consumed by the existing music archive JavaScript and excludes audio filenames.",
            "No biographical facts, aliases or credits are added by this audit.",
        ],
    }

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    JSON_PATH.write_text(json.dumps(findings, indent=2, ensure_ascii=False), encoding="utf-8")

    top_developers = findings["developers"][:15]
    top_composers = findings["composers"][:15]
    md = [
        "# Phase 3A Developer and Composer Archive Review",
        "",
        "This is a read-only repository audit. It does not alter public pages, game data, navigation, CSS, sitemaps or generators.",
        "",
        "## Executive summary",
        "",
        "| Check | Count |",
        "|---|---:|",
        f"| Game records | **{summary['game_records']}** |",
        f"| Games with developer credit | **{summary['games_with_developer_credit']}** |",
        f"| Unique developer entities | **{summary['unique_developer_entities']}** |",
        f"| Existing developer archive pages | **{summary['developer_archive_pages']}** |",
        f"| Indexable developer archive pages | **{summary['indexable_developer_archive_pages']}** |",
        f"| Games with composer credit | **{summary['games_with_composer_credit']}** |",
        f"| Unique composer entities | **{summary['unique_composer_entities']}** |",
        f"| Dedicated composer pages | **{summary['dedicated_composer_pages']}** |",
        f"| Credited composers with dedicated page | **{summary['credited_composers_with_dedicated_page']}** |",
        f"| Credited composers using dynamic fallback only | **{summary['credited_composers_dynamic_only']}** |",
        f"| Static composer links in composer hub HTML | **{summary['composer_hub_static_profile_links']}** |",
        "",
        "## Developer archive finding",
        "",
    ]
    if developer_pages:
        md.append(
            f"The repository contains **{len(developer_pages)}** developer-route HTML files, of which "
            f"**{summary['indexable_developer_archive_pages']}** are indexable."
        )
    else:
        md.append(
            "No developer hub or dedicated developer archive pages were detected, despite explicit developer credits in the game database."
        )

    md.extend(["", "### Most represented developer credits", ""])
    if top_developers:
        md.extend(f"- {item['name']}: **{item['game_count']}** games" for item in top_developers)
    else:
        md.append("No explicit developer credits were detected.")

    md.extend(
        [
            "",
            "## Composer archive finding",
            "",
            f"The composer hub exists and the fallback composer shell is {'present' if composer_fallback else 'missing'}. "
            f"The fallback shell is {'noindex' if composer_fallback and not composer_fallback['indexable'] else 'indexable or missing'}. "
            f"Only **{summary['credited_composers_with_dedicated_page']}** credited composers currently have dedicated static pages; "
            f"**{summary['credited_composers_dynamic_only']}** credited composer entities rely on the JavaScript query-string fallback.",
            "",
            "### Most represented composer credits",
            "",
        ]
    )
    if top_composers:
        md.extend(f"- {item['name']}: **{item['game_count']}** games" for item in top_composers)
    else:
        md.append("No composer credits were detected.")

    md.extend(
        [
            "",
            "## Discoverability",
            "",
            f"- Static composer-profile links in the composer hub HTML: **{len(static_profile_links)}**",
            f"- Repository links to the composer hub: **{links['composer_hub_links']}**",
            f"- Repository links to dedicated composer routes: **{links['composer_profile_links']}**",
            f"- Repository links to developer archive routes: **{links['developer_archive_links']}**",
            "",
            "## Recommended implementation split",
            "",
            "1. **Phase 3B — Developer archive foundation:** create a crawlable developer hub and static developer pages from explicit existing credits, with normalization reviewed before route creation.",
            "2. **Phase 3C — Composer archive expansion:** replace query-string-only discovery with static canonical composer routes for credited names, preserving the existing featured pages and player behaviour.",
            "3. **Phase 3D — People archive validation:** add permanent checks for route coverage, canonical uniqueness, sitemap membership and links from the relevant hubs.",
            "",
            "## Explicit exclusions",
            "",
            "- No public HTML was changed.",
            "- `games/games.json` was not changed.",
            "- No names, aliases, biographies or credits were invented.",
            "- The homepage and intro-loader stack were not changed.",
            "",
            "## Rollback",
            "",
            "Revert the Phase 3A squash merge commit. The PR adds only audit tooling, workflow and a concise report.",
        ]
    )
    MD_PATH.write_text("\n".join(md) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
