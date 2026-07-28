#!/usr/bin/env python3
"""Read-only Phase 0 SEO and site-integrity audit.

The script inventories repository HTML, canonical/indexing state, internal links,
local assets, sitemap membership, JSON-LD validity, image alt text and game
record resource fields. It writes reports only under docs/seo-baseline/.
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from html import unescape
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITE_ROOT = "https://www.cheekycommodoregamer.co.uk"
OUTPUT_DIR = ROOT / "docs" / "seo-baseline"

EXCLUDED_TOP_LEVEL = {
    ".git", ".github", "admin", "auth", "node_modules", "supabase",
    "tests", "tmp", "validation", "data",
}
EXCLUDED_NAME_PARTS = ("_backup_", ".backup.", ".bak.")
HTML_ATTR_RE = re.compile(r"\b(?:href|src)\s*=\s*([\"'])(.*?)\1", re.I | re.S)
IMG_RE = re.compile(r"<img\b[^>]*>", re.I | re.S)
A_RE = re.compile(r"<a\b[^>]*href\s*=\s*([\"'])(.*?)\1[^>]*>", re.I | re.S)
JSONLD_RE = re.compile(
    r"<script\b[^>]*type\s*=\s*([\"'])application/ld\+json\1[^>]*>(.*?)</script>",
    re.I | re.S,
)


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def included_html(path: Path) -> bool:
    relative = rel(path)
    parts = relative.split("/")
    if parts[0] in EXCLUDED_TOP_LEVEL:
        return False
    if any(token in relative.lower() for token in EXCLUDED_NAME_PARTS):
        return False
    return path.suffix.lower() == ".html"


def strip_tags(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", unescape(value)).strip()


def extract_text(pattern: str, html: str) -> str:
    match = re.search(pattern, html, re.I | re.S)
    return strip_tags(match.group(1)) if match else ""


def extract_tag_attr(html: str, selector_pattern: str, attr: str) -> str:
    match = re.search(selector_pattern, html, re.I | re.S)
    if not match:
        return ""
    tag = match.group(0)
    attr_match = re.search(rf"\b{re.escape(attr)}\s*=\s*([\"'])(.*?)\1", tag, re.I | re.S)
    return unescape(attr_match.group(2)).strip() if attr_match else ""


def file_to_path(path: Path) -> str:
    relative = rel(path)
    if relative in {"index.html", "home.html"}:
        return "/"
    if relative.endswith("/index.html"):
        return "/" + relative[:-10]
    return "/" + relative


def normalise_url_path(value: str) -> str:
    parsed = urlparse(value)
    path = unquote(parsed.path or "/")
    path = re.sub(r"/{2,}", "/", path)
    if path.endswith("/index.html"):
        path = path[:-10]
    return path or "/"


def canonical_url_for_path(path: str) -> str:
    return SITE_ROOT + path


def resolve_local_target(source_path: str, raw: str) -> tuple[str | None, str | None]:
    raw = unescape(raw).strip()
    if not raw or raw.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None, None

    parsed = urlparse(raw)
    if parsed.scheme in {"http", "https"}:
        if parsed.netloc.lower() not in {
            "cheekycommodoregamer.co.uk", "www.cheekycommodoregamer.co.uk"
        }:
            return None, None
        return normalise_url_path(raw), "internal"
    if parsed.scheme:
        return None, None

    base_url = SITE_ROOT + source_path
    joined = urljoin(base_url, raw)
    return normalise_url_path(joined), "internal"


def path_candidates(url_path: str) -> list[Path]:
    clean = url_path.lstrip("/")
    candidates: list[Path] = []
    if not clean:
        return [ROOT / "home.html", ROOT / "index.html"]
    direct = ROOT / clean
    candidates.append(direct)
    if url_path.endswith("/"):
        candidates.append(ROOT / clean / "index.html")
    elif not Path(clean).suffix:
        candidates.extend([ROOT / f"{clean}.html", ROOT / clean / "index.html"])
    return candidates


def local_target_exists(url_path: str) -> bool:
    return any(candidate.exists() for candidate in path_candidates(url_path))


def classify(relative: str) -> str:
    if relative.startswith("games/publishers/"):
        return "publisher"
    if relative.startswith("games/downloads/"):
        return "downloads"
    if relative.startswith("games/genres/"):
        return "genre"
    if relative.startswith("games/collections/"):
        return "collection"
    if relative.startswith("games/"):
        return "game"
    if relative.startswith("retro-specials/"):
        return "retro-special"
    if relative.startswith("retro-events/"):
        return "event"
    if relative.startswith("amiga-demo-music/"):
        return "demo-music"
    return "static"


def parse_sitemaps() -> tuple[set[str], list[str]]:
    urls: set[str] = set()
    errors: list[str] = []
    for sitemap in sorted(ROOT.glob("sitemap*.xml")):
        try:
            tree = ET.parse(sitemap)
            root = tree.getroot()
            for elem in root.iter():
                if elem.tag.endswith("loc") and elem.text:
                    value = elem.text.strip()
                    parsed = urlparse(value)
                    if parsed.netloc.lower() in {
                        "cheekycommodoregamer.co.uk", "www.cheekycommodoregamer.co.uk"
                    }:
                        urls.add(normalise_url_path(value))
        except Exception as exc:  # audit must report, not crash on one sitemap
            errors.append(f"{rel(sitemap)}: {exc}")
    return urls, errors


def load_games() -> tuple[list[dict], list[str]]:
    path = ROOT / "games" / "games.json"
    if not path.exists():
        return [], ["games/games.json is missing"]
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [], [f"games/games.json is invalid JSON: {exc}"]
    games = payload if isinstance(payload, list) else payload.get("games", [])
    if not isinstance(games, list):
        return [], ["games/games.json does not contain a game list"]
    return games, []


def resource_urls(value) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if value is None:
        return []
    text = str(value).strip()
    return [text] if text else []


def main() -> None:
    html_files = sorted(path for path in ROOT.rglob("*.html") if included_html(path))
    sitemap_paths, sitemap_errors = parse_sitemaps()

    records: list[dict] = []
    path_to_record: dict[str, dict] = {}
    canonical_groups: dict[str, list[dict]] = defaultdict(list)
    incoming: Counter[str] = Counter()
    broken_internal_links: list[dict] = []
    missing_local_assets: list[dict] = []
    invalid_jsonld: list[dict] = []

    for path in html_files:
        html = path.read_text(encoding="utf-8", errors="ignore")
        relative = rel(path)
        url_path = file_to_path(path)
        title = extract_text(r"<title[^>]*>(.*?)</title>", html)
        description = extract_tag_attr(
            html, r"<meta\b[^>]*name\s*=\s*([\"'])description\1[^>]*>", "content"
        )
        robots = extract_tag_attr(
            html, r"<meta\b[^>]*name\s*=\s*([\"'])robots\1[^>]*>", "content"
        )
        canonical = extract_tag_attr(
            html, r"<link\b[^>]*rel\s*=\s*([\"'])canonical\1[^>]*>", "href"
        )
        h1_count = len(re.findall(r"<h1\b", html, re.I))
        indexable = "noindex" not in robots.lower()
        canonical_path = normalise_url_path(canonical) if canonical else ""

        image_tags = IMG_RE.findall(html)
        images_missing_alt = 0
        images_empty_alt = 0
        for tag in image_tags:
            alt_match = re.search(r"\balt\s*=\s*([\"'])(.*?)\1", tag, re.I | re.S)
            if not alt_match:
                images_missing_alt += 1
            elif not alt_match.group(2).strip():
                images_empty_alt += 1

        schema_types: list[str] = []
        for _, block in JSONLD_RE.findall(html):
            try:
                payload = json.loads(block.strip())
                objects = payload if isinstance(payload, list) else [payload]
                for obj in objects:
                    if not isinstance(obj, dict):
                        continue
                    graph = obj.get("@graph")
                    if isinstance(graph, list):
                        objects.extend(item for item in graph if isinstance(item, dict))
                    schema_type = obj.get("@type")
                    if isinstance(schema_type, list):
                        schema_types.extend(str(item) for item in schema_type)
                    elif schema_type:
                        schema_types.append(str(schema_type))
            except Exception as exc:
                invalid_jsonld.append({"file": relative, "error": str(exc)})

        out_paths: list[str] = []
        for _, raw in A_RE.findall(html):
            target, kind = resolve_local_target(url_path, raw)
            if kind != "internal" or target is None:
                continue
            out_paths.append(target)
            incoming[target] += 1
            if not local_target_exists(target):
                broken_internal_links.append({"source": relative, "href": raw, "resolved": target})

        for _, raw in HTML_ATTR_RE.findall(html):
            target, kind = resolve_local_target(url_path, raw)
            if kind != "internal" or target is None:
                continue
            parsed = urlparse(raw)
            suffix = Path(parsed.path).suffix.lower()
            if suffix and suffix != ".html" and not local_target_exists(target):
                missing_local_assets.append({"source": relative, "reference": raw, "resolved": target})

        record = {
            "file": relative,
            "page_type": classify(relative),
            "url_path": url_path,
            "url": canonical_url_for_path(url_path),
            "indexable": indexable,
            "robots": robots,
            "canonical": canonical,
            "canonical_path": canonical_path,
            "title": title,
            "title_length": len(title),
            "meta_description": description,
            "meta_description_length": len(description),
            "h1_count": h1_count,
            "schema_types": sorted(set(schema_types)),
            "images": len(image_tags),
            "images_missing_alt": images_missing_alt,
            "images_empty_alt": images_empty_alt,
            "internal_links_out": len(out_paths),
            "internal_links_in": 0,
            "in_sitemap": url_path in sitemap_paths or canonical_path in sitemap_paths,
        }
        records.append(record)
        path_to_record[url_path] = record
        if canonical_path:
            canonical_groups[canonical_path].append(record)

    for record in records:
        record["internal_links_in"] = incoming[record["url_path"]]

    indexable_records = [record for record in records if record["indexable"]]
    title_counts = Counter(record["title"] for record in indexable_records if record["title"])
    meta_counts = Counter(
        record["meta_description"] for record in indexable_records if record["meta_description"]
    )

    duplicate_titles = [
        record for record in indexable_records
        if record["title"] and title_counts[record["title"]] > 1
    ]
    duplicate_meta = [
        record for record in indexable_records
        if record["meta_description"] and meta_counts[record["meta_description"]] > 1
    ]
    missing_titles = [record for record in indexable_records if not record["title"]]
    missing_meta = [record for record in indexable_records if not record["meta_description"]]
    missing_canonicals = [record for record in indexable_records if not record["canonical"]]
    h1_issues = [record for record in indexable_records if record["h1_count"] != 1]
    sitemap_missing = [record for record in indexable_records if not record["in_sitemap"]]
    sitemap_noncanonical = sorted(
        path for path in sitemap_paths
        if path in path_to_record
        and path_to_record[path]["canonical_path"]
        and path_to_record[path]["canonical_path"] != path
    )
    orphan_pages = [
        record for record in indexable_records
        if record["url_path"] != "/" and record["internal_links_in"] == 0
    ]
    duplicate_indexable_canonicals = {
        canonical: [record["file"] for record in group if record["indexable"]]
        for canonical, group in canonical_groups.items()
        if sum(1 for record in group if record["indexable"]) > 1
    }

    games, game_errors = load_games()
    game_audit = {
        "records": len(games),
        "missing_slug": 0,
        "missing_title": 0,
        "missing_thumbnail": 0,
        "missing_local_thumbnail_file": 0,
        "games_with_downloads": 0,
        "download_links": 0,
        "malformed_download_links": [],
        "duplicate_download_links": [],
        "games_with_manuals": 0,
        "malformed_manual_links": [],
        "games_with_videos": 0,
    }
    download_owners: dict[str, list[str]] = defaultdict(list)
    for game in games:
        slug = str(game.get("slug") or "").strip()
        title = str(game.get("title") or "").strip()
        label = title or slug or "(unnamed game)"
        if not slug:
            game_audit["missing_slug"] += 1
        if not title:
            game_audit["missing_title"] += 1
        thumbnail = str(game.get("thumbnail") or "").strip()
        if not thumbnail:
            game_audit["missing_thumbnail"] += 1
        elif not urlparse(thumbnail).scheme:
            thumb_path = normalise_url_path(thumbnail)
            if not local_target_exists(thumb_path):
                game_audit["missing_local_thumbnail_file"] += 1

        downloads = resource_urls(game.get("disk"))
        if downloads:
            game_audit["games_with_downloads"] += 1
        game_audit["download_links"] += len(downloads)
        for download in downloads:
            download_owners[download].append(label)
            parsed = urlparse(download)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                game_audit["malformed_download_links"].append({"game": label, "url": download})

        manuals = resource_urls(game.get("pdf"))
        if manuals:
            game_audit["games_with_manuals"] += 1
        for manual in manuals:
            parsed = urlparse(manual)
            if parsed.scheme in {"http", "https"}:
                if not parsed.netloc:
                    game_audit["malformed_manual_links"].append({"game": label, "url": manual})
            elif not local_target_exists(normalise_url_path(manual)):
                game_audit["malformed_manual_links"].append({"game": label, "url": manual})

        if str(game.get("videoId") or game.get("videoid") or "").strip():
            game_audit["games_with_videos"] += 1

    game_audit["duplicate_download_links"] = [
        {"url": url, "games": owners}
        for url, owners in sorted(download_owners.items())
        if len(owners) > 1
    ]

    summary = {
        "scope": "Repository-static Phase 0 baseline",
        "html_pages": len(records),
        "indexable_pages": len(indexable_records),
        "noindex_pages": len(records) - len(indexable_records),
        "duplicate_indexable_titles": len(duplicate_titles),
        "duplicate_indexable_meta_descriptions": len(duplicate_meta),
        "duplicate_indexable_canonical_groups": len(duplicate_indexable_canonicals),
        "missing_titles": len(missing_titles),
        "missing_meta_descriptions": len(missing_meta),
        "missing_canonicals": len(missing_canonicals),
        "h1_issues": len(h1_issues),
        "orphan_indexable_pages": len(orphan_pages),
        "indexable_pages_missing_from_sitemaps": len(sitemap_missing),
        "noncanonical_sitemap_urls": len(sitemap_noncanonical),
        "broken_internal_links": len(broken_internal_links),
        "missing_local_assets": len(missing_local_assets),
        "invalid_jsonld_blocks": len(invalid_jsonld),
        "images_missing_alt_attribute": sum(record["images_missing_alt"] for record in records),
        "sitemap_parse_errors": len(sitemap_errors),
        "game_data_errors": len(game_errors),
    }

    findings = {
        "summary": summary,
        "pages": records,
        "duplicate_indexable_canonicals": duplicate_indexable_canonicals,
        "duplicate_titles": duplicate_titles,
        "duplicate_meta_descriptions": duplicate_meta,
        "missing_titles": missing_titles,
        "missing_meta_descriptions": missing_meta,
        "missing_canonicals": missing_canonicals,
        "h1_issues": h1_issues,
        "orphan_pages": orphan_pages,
        "sitemap_missing": sitemap_missing,
        "sitemap_noncanonical": sitemap_noncanonical,
        "broken_internal_links": broken_internal_links,
        "missing_local_assets": missing_local_assets,
        "invalid_jsonld": invalid_jsonld,
        "sitemap_errors": sitemap_errors,
        "game_errors": game_errors,
        "game_audit": game_audit,
        "limitations": [
            "External URLs were syntax-checked but not requested over the network.",
            "Google Search Console impressions, clicks and indexing status are outside repository scope.",
            "Decorative images with empty alt text are counted separately and are not automatically errors.",
        ],
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "phase-0-baseline.json").write_text(
        json.dumps(findings, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    md = [
        "# Phase 0 SEO and Site-Integrity Baseline",
        "",
        "This report is generated from the current repository without changing public pages.",
        "",
        "## Executive summary",
        "",
        "| Check | Count |",
        "|---|---:|",
    ]
    labels = {
        "html_pages": "HTML pages audited",
        "indexable_pages": "Indexable pages",
        "noindex_pages": "Noindex pages",
        "duplicate_indexable_titles": "Indexable pages with duplicate titles",
        "duplicate_indexable_meta_descriptions": "Indexable pages with duplicate meta descriptions",
        "duplicate_indexable_canonical_groups": "Canonical URLs claimed by multiple indexable pages",
        "missing_titles": "Indexable pages missing titles",
        "missing_meta_descriptions": "Indexable pages missing meta descriptions",
        "missing_canonicals": "Indexable pages missing canonicals",
        "h1_issues": "Indexable pages without exactly one H1",
        "orphan_indexable_pages": "Indexable pages with no detected incoming link",
        "indexable_pages_missing_from_sitemaps": "Indexable pages absent from sitemaps",
        "noncanonical_sitemap_urls": "Sitemap URLs that canonicalise elsewhere",
        "broken_internal_links": "Broken internal links",
        "missing_local_assets": "Missing local assets",
        "invalid_jsonld_blocks": "Invalid JSON-LD blocks",
        "images_missing_alt_attribute": "Images missing an alt attribute",
    }
    for key, label in labels.items():
        md.append(f"| {label} | **{summary[key]}** |")

    md.extend([
        "",
        "## Game database inventory",
        "",
        f"- Game records: **{game_audit['records']}**",
        f"- Games with downloads: **{game_audit['games_with_downloads']}**",
        f"- Download links recorded: **{game_audit['download_links']}**",
        f"- Malformed download links: **{len(game_audit['malformed_download_links'])}**",
        f"- Duplicate download URLs: **{len(game_audit['duplicate_download_links'])}**",
        f"- Games with manuals: **{game_audit['games_with_manuals']}**",
        f"- Malformed or missing manual references: **{len(game_audit['malformed_manual_links'])}**",
        f"- Games with videos: **{game_audit['games_with_videos']}**",
        f"- Games missing thumbnails: **{game_audit['missing_thumbnail']}**",
        f"- Missing local thumbnail files: **{game_audit['missing_local_thumbnail_file']}**",
        "",
        "## Highest-priority technical findings",
        "",
        "1. Canonical collisions and sitemap inconsistencies should be resolved before archive expansion.",
        "2. Broken internal links and missing local assets should be corrected in small batches.",
        "3. Orphan-page results should be reviewed manually because generated navigation can be injected by JavaScript.",
        "4. Duplicate title and description results should be separated into genuine duplicates and intentional redirect stubs.",
        "5. Remote downloads, manuals and YouTube URLs require a separately throttled network check to avoid provider rate limits.",
        "",
        "## Priority samples",
        "",
    ])

    def add_sample_section(title: str, items: list, formatter, limit: int = 25) -> None:
        md.extend([f"### {title}", ""])
        if not items:
            md.extend(["None detected.", ""])
            return
        for item in items[:limit]:
            md.append(f"- {formatter(item)}")
        if len(items) > limit:
            md.append(f"- …and {len(items) - limit} more in the JSON report")
        md.append("")

    add_sample_section(
        "Broken internal links",
        broken_internal_links,
        lambda item: f"`{item['source']}` → `{item['href']}`",
    )
    add_sample_section(
        "Indexable orphan-page candidates",
        orphan_pages,
        lambda item: f"`{item['file']}`",
    )
    add_sample_section(
        "Indexable pages missing from sitemaps",
        sitemap_missing,
        lambda item: f"`{item['file']}`",
    )
    add_sample_section(
        "Missing local assets",
        missing_local_assets,
        lambda item: f"`{item['source']}` → `{item['reference']}`",
    )

    md.extend([
        "## Repository and PR housekeeping",
        "",
        "- Obsolete draft PR #1150 was closed without merging.",
        "- PR #1144 remains open only as a reference source; it is stale, non-mergeable and too large for safe direct use.",
        "- Future corrections should be rebuilt from current `main` as focused pull requests.",
        "",
        "## Limitations",
        "",
        "- External resources were not fetched, so this report does not claim that every remote download, manual or video is reachable.",
        "- Search Console data is not available from the repository.",
        "- The JSON report contains the complete page-level evidence used for later phases.",
        "",
        "## Phase 1 gate",
        "",
        "No canonical or indexing change should begin until this baseline has been reviewed and approved.",
    ])

    (OUTPUT_DIR / "phase-0-baseline.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
