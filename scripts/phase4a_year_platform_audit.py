#!/usr/bin/env python3
"""Read-only Phase 4A audit of year and platform archive coverage."""

from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from html import unescape
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[1]
SITE_ROOT = "https://www.cheekycommodoregamer.co.uk"
GAMES_PATH = ROOT / "games" / "games.json"
REPORT_DIR = ROOT / "docs" / "seo-baseline"
JSON_PATH = REPORT_DIR / "phase-4a-year-platform-archives.json"
MD_PATH = REPORT_DIR / "phase-4a-year-platform-archives.md"
STATIC_PAGES_PATH = ROOT / "tools" / "seo" / "static-pages.json"

TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)
H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.I | re.S)
CANONICAL_RE = re.compile(r"<link\b[^>]*rel\s*=\s*([\"'])canonical\1[^>]*>", re.I | re.S)
META_RE = re.compile(r"<meta\b[^>]*(?:name|property)\s*=\s*([\"'])(.*?)\1[^>]*>", re.I | re.S)
LINK_RE = re.compile(r"<a\b[^>]*href\s*=\s*([\"'])(.*?)\1", re.I | re.S)
SCRIPT_RE = re.compile(r"<script\b[^>]*src\s*=\s*([\"'])(.*?)\1", re.I | re.S)
YEAR_RE = re.compile(r"^(?:19|20)\d{2}$")
YEAR_ROUTE_RE = re.compile(
    r"^/games/(?:years?|release-years?|by-year)/((?:19|20)\d{2})/?$",
    re.I,
)
PLATFORM_ROUTE_RE = re.compile(
    r"^/games/(?:platforms?/)?(c64|commodore-64|amiga)/?$",
    re.I,
)


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


def extract_first(pattern: re.Pattern[str], html: str) -> str:
    match = pattern.search(html)
    return strip_tags(match.group(1)) if match else ""


def extract_canonical(html: str) -> str:
    match = CANONICAL_RE.search(html)
    return tag_attr(match.group(0), "href") if match else ""


def canonical_path(value: str) -> str:
    if not value:
        return ""
    parsed = urlparse(value)
    path = parsed.path or "/"
    path = re.sub(r"/{2,}", "/", path)
    if path != "/" and not path.endswith("/") and not path.endswith(".html"):
        path += "/"
    return path


def parse_year(value: object) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        year = int(value)
        return year if 1970 <= year <= 2099 else None
    text = str(value or "").strip()
    match = re.search(r"(?:19|20)\d{2}", text)
    if not match:
        return None
    year = int(match.group(0))
    return year if 1970 <= year <= 2099 else None


def normalize_platform(game: dict) -> str:
    raw_values = [game.get("system"), game.get("platform"), game.get("computer")]
    text = " ".join(str(value or "") for value in raw_values).strip().lower()
    if "amiga" in text:
        return "Amiga"
    if text == "c64" or "commodore 64" in text or "c-64" in text:
        return "C64"
    return "Other" if text else "Missing"


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


def static_pages() -> set[str]:
    if not STATIC_PAGES_PATH.exists():
        return set()
    try:
        data = json.loads(STATIC_PAGES_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return set()
    return {str(item).strip() for item in data if str(item).strip()} if isinstance(data, list) else set()


def route_from_file(path: Path) -> str:
    relative = rel(path)
    if relative.endswith("/index.html"):
        return "/" + relative[: -len("index.html")]
    return "/" + relative


def page_record(path: Path, sitemap_urls: set[str], registered_pages: set[str]) -> dict:
    html = path.read_text(encoding="utf-8", errors="ignore")
    canonical = extract_canonical(html)
    robots = extract_meta(html, "robots")
    route = route_from_file(path)
    return {
        "file": rel(path),
        "route": route,
        "canonical": canonical,
        "canonical_path": canonical_path(canonical),
        "title": extract_first(TITLE_RE, html),
        "h1": extract_first(H1_RE, html),
        "robots": robots,
        "indexable": "noindex" not in robots.lower(),
        "in_sitemap": canonical in sitemap_urls if canonical else False,
        "in_static_registry": rel(path) in registered_pages,
        "html": html,
    }


def year_from_page(record: dict) -> int | None:
    candidates = [record["canonical_path"], record["route"]]
    for candidate in candidates:
        match = YEAR_ROUTE_RE.match(candidate)
        if match:
            return int(match.group(1))
        parts = [part for part in candidate.strip("/").split("/") if part]
        if len(parts) >= 2 and parts[0] == "games" and YEAR_RE.match(parts[-1]):
            if any(part in {"year", "years", "by-year", "release-year", "release-years"} for part in parts[1:-1]):
                return int(parts[-1])
    file_name = Path(record["file"]).stem
    parent_name = Path(record["file"]).parent.name
    if YEAR_RE.match(file_name) and any(token in record["file"].lower() for token in ("year", "years")):
        return int(file_name)
    if YEAR_RE.match(parent_name) and any(token in record["file"].lower() for token in ("year", "years")):
        return int(parent_name)
    return None


def platform_from_page(record: dict) -> str | None:
    candidates = [record["canonical_path"], record["route"]]
    for candidate in candidates:
        match = PLATFORM_ROUTE_RE.match(candidate)
        if match:
            return "Amiga" if match.group(1).lower() == "amiga" else "C64"
    return None


def scan_archive_pages(sitemap_urls: set[str], registered_pages: set[str]) -> tuple[list[dict], list[dict]]:
    years: list[dict] = []
    platforms: list[dict] = []
    for path in sorted(ROOT.rglob("*.html")):
        relative = rel(path)
        if relative.startswith(("admin/", "templates/", "validation/")):
            continue
        record = page_record(path, sitemap_urls, registered_pages)
        year = year_from_page(record)
        if year is not None:
            copy = {key: value for key, value in record.items() if key != "html"}
            copy["year"] = year
            years.append(copy)
        platform = platform_from_page(record)
        if platform:
            copy = {key: value for key, value in record.items() if key != "html"}
            copy["platform"] = platform
            platforms.append(copy)
    return years, platforms


def scan_links() -> dict:
    year_static: Counter[str] = Counter()
    platform_static: Counter[str] = Counter()
    year_query: Counter[str] = Counter()
    platform_query: Counter[str] = Counter()
    source_counts: Counter[str] = Counter()

    for path in ROOT.rglob("*.html"):
        relative = rel(path)
        if relative.startswith(("admin/", "templates/", "validation/")):
            continue
        html = path.read_text(encoding="utf-8", errors="ignore")
        for match in LINK_RE.finditer(html):
            href = unescape(match.group(2)).strip()
            parsed = urlparse(href)
            route = canonical_path(parsed.path)
            year_match = YEAR_ROUTE_RE.match(route)
            platform_match = PLATFORM_ROUTE_RE.match(route)
            if year_match:
                year_static[year_match.group(1)] += 1
                source_counts[relative] += 1
            if platform_match:
                platform_static["Amiga" if platform_match.group(1).lower() == "amiga" else "C64"] += 1
                source_counts[relative] += 1
            query = parse_qs(parsed.query)
            for key in ("year", "releaseYear", "release-year"):
                for value in query.get(key, []):
                    if YEAR_RE.match(value):
                        year_query[value] += 1
            for key in ("platform", "system", "computer"):
                for value in query.get(key, []):
                    lowered = value.lower()
                    if "amiga" in lowered:
                        platform_query["Amiga"] += 1
                    elif lowered == "c64" or "commodore" in lowered:
                        platform_query["C64"] += 1

    return {
        "static_year_links": dict(sorted(year_static.items())),
        "static_platform_links": dict(platform_static),
        "query_year_links": dict(sorted(year_query.items())),
        "query_platform_links": dict(platform_query),
        "top_static_link_sources": dict(source_counts.most_common(20)),
    }


def filter_capabilities() -> dict:
    files: list[Path] = []
    for candidate in (ROOT / "games" / "index.html", ROOT / "complete-index.html"):
        if candidate.exists():
            files.append(candidate)
    games_index = ROOT / "games" / "index.html"
    if games_index.exists():
        html = games_index.read_text(encoding="utf-8", errors="ignore")
        for match in SCRIPT_RE.finditer(html):
            src = unescape(match.group(2)).strip().split("?", 1)[0]
            if not src or src.startswith(("http://", "https://", "//")):
                continue
            candidate = (ROOT / src.lstrip("/")) if src.startswith("/") else (games_index.parent / src).resolve()
            try:
                candidate.relative_to(ROOT)
            except ValueError:
                continue
            if candidate.exists() and candidate.suffix.lower() == ".js":
                files.append(candidate)

    records = []
    for path in sorted(set(files)):
        text = path.read_text(encoding="utf-8", errors="ignore")
        lower = text.lower()
        records.append(
            {
                "file": rel(path),
                "mentions_year": bool(re.search(r"\byear\b", lower)),
                "mentions_platform_or_system": bool(re.search(r"\b(platform|system|computer)\b", lower)),
                "has_year_control": bool(re.search(r"(?:id|name|data-[\w-]*)\s*=\s*[\"'][^\"']*year", lower)),
                "has_platform_control": bool(re.search(r"(?:id|name|data-[\w-]*)\s*=\s*[\"'][^\"']*(?:platform|system)", lower)),
            }
        )
    return {
        "files_checked": records,
        "year_filter_detected": any(item["has_year_control"] for item in records),
        "platform_filter_detected": any(item["has_platform_control"] for item in records),
    }


def render_markdown(data: dict) -> str:
    summary = data["summary"]
    years = data["year_counts"]
    platform_counts = data["platform_counts"]
    year_rows = "\n".join(
        f"| {item['year']} | {item['total']} | {item['c64']} | {item['amiga']} |"
        for item in years
    )
    existing_years = data["existing_year_pages"]
    existing_platforms = data["existing_platform_pages"]
    missing_years = ", ".join(str(year) for year in data["recommendations"]["years_without_static_route"]) or "None"
    return f"""# Phase 4A Year and Platform Archive Audit

## Results

| Check | Count |
|---|---:|
| Game records scanned | **{summary['game_records']}** |
| Records with a usable release year | **{summary['games_with_year']}** |
| Records missing a usable release year | **{summary['games_missing_year']}** |
| Distinct release years | **{summary['distinct_years']}** |
| C64 records | **{platform_counts.get('C64', 0)}** |
| Amiga records | **{platform_counts.get('Amiga', 0)}** |
| Other or missing platform records | **{platform_counts.get('Other', 0) + platform_counts.get('Missing', 0)}** |
| Existing static year archive pages | **{len(existing_years)}** |
| Existing static platform archive pages | **{len(existing_platforms)}** |

## Release-year coverage

| Year | Total | C64 | Amiga |
|---:|---:|---:|---:|
{year_rows}

Years represented in the game data without a detected static year archive: **{missing_years}**.

## Existing route findings

- Static year archive pages detected: **{len(existing_years)}**
- Static platform archive pages detected: **{len(existing_platforms)}**
- Static links to year archives: **{sum(data['links']['static_year_links'].values())}**
- Static links to platform archives: **{sum(data['links']['static_platform_links'].values())}**
- Query-string year links: **{sum(data['links']['query_year_links'].values())}**
- Query-string platform links: **{sum(data['links']['query_platform_links'].values())}**
- Year filter control detected on the current browse surface: **{'Yes' if data['filter_capabilities']['year_filter_detected'] else 'No'}**
- Platform filter control detected on the current browse surface: **{'Yes' if data['filter_capabilities']['platform_filter_detected'] else 'No'}**

## Recommended implementation split

### Phase 4B — Archive foundations

- Add a crawlable year hub and a crawlable platform hub.
- Add stable C64 and Amiga archive routes.
- Add one static route for each represented release year.
- Render static game links so the archives remain useful without JavaScript.
- Use the existing game data only; do not invent or repair release years in this phase.

### Phase 4C — Discovery integration

- Add bounded links from Browse Games to the new hubs.
- Add previous/next year navigation and platform cross-links.
- Register indexable routes in the sitemap and static-page registry.
- Preserve existing game, developer, composer and downloads workflows.

### Phase 4D — Permanent validation

- Verify route uniqueness, canonical consistency, robots policy, sitemap membership and game-link coverage.
- Detect future records with missing or unsupported platform/year values.
- Prevent archive workflows from reordering or removing each other’s registry entries.

## Explicit exclusions

- No public HTML was changed by this audit.
- No game record was changed.
- No release year or platform was inferred beyond the existing source fields.
- The homepage and intro-loader stack remain untouched.
"""


def main() -> None:
    games = json.loads(GAMES_PATH.read_text(encoding="utf-8"))
    if not isinstance(games, list):
        raise SystemExit("games/games.json must contain an array")

    year_counts: dict[int, Counter[str]] = defaultdict(Counter)
    platform_counts: Counter[str] = Counter()
    missing_year: list[str] = []
    unsupported_platform: list[dict] = []

    for game in games:
        slug = str(game.get("slug") or game.get("id") or "").strip()
        year = parse_year(game.get("year") if game.get("year") is not None else game.get("releaseYear"))
        platform = normalize_platform(game)
        platform_counts[platform] += 1
        if year is None:
            missing_year.append(slug)
        else:
            year_counts[year]["total"] += 1
            year_counts[year][platform.lower()] += 1
        if platform not in {"C64", "Amiga"}:
            unsupported_platform.append({"slug": slug, "platform": platform})

    sitemap_urls = parse_sitemap_urls()
    registered_pages = static_pages()
    year_pages, platform_pages = scan_archive_pages(sitemap_urls, registered_pages)
    existing_year_values = {item["year"] for item in year_pages}
    represented_years = sorted(year_counts)

    year_records = [
        {
            "year": year,
            "total": year_counts[year]["total"],
            "c64": year_counts[year]["c64"],
            "amiga": year_counts[year]["amiga"],
            "other": year_counts[year]["other"] + year_counts[year]["missing"],
        }
        for year in represented_years
    ]

    data = {
        "summary": {
            "game_records": len(games),
            "games_with_year": len(games) - len(missing_year),
            "games_missing_year": len(missing_year),
            "distinct_years": len(represented_years),
            "earliest_year": represented_years[0] if represented_years else None,
            "latest_year": represented_years[-1] if represented_years else None,
        },
        "platform_counts": dict(platform_counts),
        "year_counts": year_records,
        "missing_year_slugs": sorted(filter(None, missing_year)),
        "unsupported_platform_records": unsupported_platform,
        "existing_year_pages": year_pages,
        "existing_platform_pages": platform_pages,
        "links": scan_links(),
        "filter_capabilities": filter_capabilities(),
        "recommendations": {
            "years_without_static_route": [year for year in represented_years if year not in existing_year_values],
            "platforms_without_static_route": [
                platform
                for platform in ("C64", "Amiga")
                if not any(item["platform"] == platform for item in platform_pages)
            ],
            "suggested_year_route_count": len(represented_years),
            "suggested_platform_route_count": 2,
        },
    }

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    JSON_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    MD_PATH.write_text(render_markdown(data), encoding="utf-8")
    print(json.dumps(data["summary"], indent=2))


if __name__ == "__main__":
    main()
