#!/usr/bin/env python3
"""Read-only Phase 0 SEO and repository baseline audit.

The script scans repository files and writes reports only to:
- docs/phase0-seo-baseline.json
- docs/phase0-seo-baseline.md

It does not fetch external URLs and does not modify public website files.
"""

from __future__ import annotations

import json
import posixpath
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse, urlunparse

ROOT = Path(__file__).resolve().parents[1]
SITE_ROOT = "https://www.cheekycommodoregamer.co.uk"
SITE_HOST = urlparse(SITE_ROOT).netloc
REPORT_JSON = ROOT / "docs" / "phase0-seo-baseline.json"
REPORT_MD = ROOT / "docs" / "phase0-seo-baseline.md"

EXCLUDED_TOP_LEVEL = {
    ".git",
    ".github",
    "admin",
    "auth",
    "node_modules",
    "supabase",
    "tests",
    "tmp",
}
EXCLUDED_PATH_PARTS = {
    "_archive",
    "_backup",
    "backup",
    "backups",
    "data/lemon-cache",
}
IGNORED_LINK_SCHEMES = ("mailto:", "tel:", "javascript:", "data:", "blob:")
ASSET_EXTENSIONS = {
    ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg",
    ".ico", ".pdf", ".mp3", ".ogg", ".wav", ".mp4", ".webm", ".json", ".xml",
    ".txt", ".zip", ".d64", ".t64", ".tap", ".crt", ".adf", ".lha",
}


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(value or "")).strip()


def is_excluded(path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    parts = rel.split("/")
    if parts and parts[0] in EXCLUDED_TOP_LEVEL:
        return True
    low = rel.lower()
    return any(token in low for token in EXCLUDED_PATH_PARTS)


def page_url_for_file(path: Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    if rel == "index.html":
        return "/"
    if rel.endswith("/index.html"):
        return "/" + rel[:-10]
    return "/" + rel


def normalize_path(path: str, keep_trailing: bool = False) -> str:
    path = re.sub(r"/{2,}", "/", path or "/")
    trailing = keep_trailing or path.endswith("/")
    normalized = posixpath.normpath(path)
    if not normalized.startswith("/"):
        normalized = "/" + normalized
    if normalized == "/.":
        normalized = "/"
    if trailing and normalized != "/" and not normalized.endswith("/"):
        normalized += "/"
    return normalized


def normalize_site_url(value: str, base_url: str | None = None) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    absolute = urljoin(base_url or SITE_ROOT + "/", value)
    parsed = urlparse(absolute)
    if parsed.netloc and parsed.netloc.lower() != SITE_HOST.lower():
        return absolute
    path = normalize_path(parsed.path or "/", keep_trailing=(parsed.path or "").endswith("/"))
    return urlunparse(("https", SITE_HOST, path, "", "", ""))


def path_has_double_slash(value: str) -> bool:
    value = (value or "").strip()
    if not value:
        return False
    parsed = urlparse(urljoin(SITE_ROOT + "/", value))
    return "//" in (parsed.path or "")


def canonical_repo_file_for_path(url_path: str) -> Path | None:
    path = normalize_path(url_path, keep_trailing=url_path.endswith("/"))
    rel = path.lstrip("/")
    candidates: list[Path] = []

    if path == "/":
        candidates.extend([ROOT / "index.html", ROOT / "home.html"])
    elif path.endswith("/"):
        candidates.append(ROOT / rel / "index.html")
    else:
        candidates.append(ROOT / rel)
        if not Path(rel).suffix:
            candidates.extend([ROOT / f"{rel}.html", ROOT / rel / "index.html"])

    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return candidate
    return None


def local_asset_file(source_file: Path, raw_value: str) -> Path | None:
    raw = (raw_value or "").strip()
    if not raw or raw.startswith(IGNORED_LINK_SCHEMES) or raw.startswith("#"):
        return None

    absolute = urljoin(SITE_ROOT + page_url_for_file(source_file), raw)
    parsed = urlparse(absolute)
    if parsed.netloc and parsed.netloc.lower() != SITE_HOST.lower():
        return None

    rel = normalize_path(parsed.path or "/").lstrip("/")
    if not rel:
        return ROOT / "index.html"
    return ROOT / rel


@dataclass
class ParsedPage:
    title: str = ""
    meta_description: str = ""
    robots: str = ""
    canonical: str = ""
    h1_values: list[str] = field(default_factory=list)
    links: list[str] = field(default_factory=list)
    images: list[dict[str, str]] = field(default_factory=list)
    assets: list[str] = field(default_factory=list)
    jsonld_blocks: list[str] = field(default_factory=list)
    meta_refresh: str = ""
    has_js_redirect: bool = False
    og_title: bool = False
    og_description: bool = False
    og_image: bool = False
    twitter_card: bool = False


class AuditHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.page = ParsedPage()
        self._capture: str | None = None
        self._capture_parts: list[str] = []
        self._script_type = ""

    @staticmethod
    def attrs_dict(attrs: list[tuple[str, str | None]]) -> dict[str, str]:
        return {str(k).lower(): str(v or "") for k, v in attrs}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        data = self.attrs_dict(attrs)

        if tag == "title":
            self._capture = "title"
            self._capture_parts = []
        elif tag == "h1":
            self._capture = "h1"
            self._capture_parts = []
        elif tag == "a" and data.get("href"):
            self.page.links.append(data["href"])
        elif tag == "img":
            src = data.get("src") or data.get("data-src") or ""
            self.page.images.append({
                "src": src,
                "alt": data.get("alt", ""),
                "width": data.get("width", ""),
                "height": data.get("height", ""),
                "loading": data.get("loading", ""),
            })
            if src:
                self.page.assets.append(src)
            for item in data.get("srcset", "").split(","):
                candidate = item.strip().split(" ")[0]
                if candidate:
                    self.page.assets.append(candidate)
        elif tag == "script":
            src = data.get("src", "")
            if src:
                self.page.assets.append(src)
            self._script_type = data.get("type", "").lower()
            if self._script_type == "application/ld+json":
                self._capture = "jsonld"
                self._capture_parts = []
        elif tag == "link":
            rel = data.get("rel", "").lower()
            href = data.get("href", "")
            if "canonical" in rel:
                self.page.canonical = href
            elif href and any(token in rel for token in ("stylesheet", "icon", "preload", "modulepreload")):
                self.page.assets.append(href)
        elif tag == "meta":
            name = data.get("name", "").lower()
            prop = data.get("property", "").lower()
            http_equiv = data.get("http-equiv", "").lower()
            content = data.get("content", "")
            if name == "description":
                self.page.meta_description = content
            elif name == "robots":
                self.page.robots = content
            elif name == "twitter:card":
                self.page.twitter_card = True
            elif prop == "og:title":
                self.page.og_title = True
            elif prop == "og:description":
                self.page.og_description = True
            elif prop == "og:image":
                self.page.og_image = True
            elif http_equiv == "refresh":
                self.page.meta_refresh = content

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        ending_capture = (
            (tag == "title" and self._capture == "title")
            or (tag == "h1" and self._capture == "h1")
            or (tag == "script" and self._capture == "jsonld")
        )
        if ending_capture:
            value = clean_text("".join(self._capture_parts))
            if self._capture == "title":
                self.page.title = value
            elif self._capture == "h1":
                self.page.h1_values.append(value)
            elif self._capture == "jsonld":
                self.page.jsonld_blocks.append("".join(self._capture_parts).strip())
            self._capture = None
            self._capture_parts = []
        if tag == "script":
            self._script_type = ""

    def handle_data(self, data: str) -> None:
        if self._capture:
            self._capture_parts.append(data)


def parse_html(path: Path) -> ParsedPage:
    html = path.read_text(encoding="utf-8", errors="ignore")
    parser = AuditHTMLParser()
    try:
        parser.feed(html)
    except Exception:
        pass
    parser.page.has_js_redirect = bool(
        re.search(r"(?:window\.)?location\.(?:replace|assign)\s*\(", html, re.I)
        or re.search(r"(?:window\.)?location\.href\s*=", html, re.I)
    )
    return parser.page


def classify_page(rel: str) -> str:
    if rel.startswith("games/publishers/"):
        return "publisher"
    if rel.startswith("games/downloads/"):
        return "downloads"
    if rel.startswith("games/genres/"):
        return "genre"
    if rel.startswith("games/collections/"):
        return "collection"
    if rel.startswith("games/"):
        return "game"
    if rel.startswith("retro-specials/"):
        return "retro-special"
    if rel.startswith("retro-events/"):
        return "retro-event"
    if rel.startswith("amiga-demo-music/"):
        return "amiga-demo"
    if rel.startswith("quiz/"):
        return "quiz"
    return "static"


def load_sitemap_urls() -> tuple[set[str], list[dict[str, str]]]:
    urls: set[str] = set()
    errors: list[dict[str, str]] = []
    for path in sorted(ROOT.glob("sitemap*.xml")):
        try:
            tree = ET.parse(path)
            for node in tree.getroot().iter():
                if node.tag.endswith("loc") and node.text:
                    urls.add(normalize_site_url(node.text.strip()))
        except Exception as exc:
            errors.append({"file": path.name, "error": str(exc)})
    return urls, errors


def jsonld_types(block: Any) -> list[str]:
    types: list[str] = []
    if isinstance(block, list):
        for item in block:
            types.extend(jsonld_types(item))
    elif isinstance(block, dict):
        value = block.get("@type")
        if isinstance(value, list):
            types.extend(str(v) for v in value)
        elif value:
            types.append(str(value))
        if block.get("@graph"):
            types.extend(jsonld_types(block["@graph"]))
    return types


def audit_games_data() -> dict[str, Any]:
    path = ROOT / "games" / "games.json"
    result: dict[str, Any] = {
        "exists": path.exists(),
        "records": 0,
        "duplicate_slugs": [],
        "missing_required_fields": [],
        "missing_local_thumbnails": [],
        "local_download_references_missing": [],
        "local_manual_references_missing": [],
    }
    if not path.exists():
        return result

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        result["parse_error"] = str(exc)
        return result

    games = payload if isinstance(payload, list) else payload.get("games", [])
    if not isinstance(games, list):
        result["parse_error"] = "Expected a list or an object containing a games list."
        return result

    result["records"] = len(games)
    slug_counts = Counter(str(game.get("slug", "")).strip() for game in games if isinstance(game, dict))
    result["duplicate_slugs"] = sorted(slug for slug, count in slug_counts.items() if slug and count > 1)

    for index, game in enumerate(games):
        if not isinstance(game, dict):
            result["missing_required_fields"].append({"index": index, "fields": ["record-not-object"]})
            continue
        slug = str(game.get("slug", "")).strip()
        title = str(game.get("title", "")).strip()
        system = str(game.get("system") or game.get("platform") or "").strip()
        missing = [name for name, value in (("slug", slug), ("title", title), ("system", system)) if not value]
        if missing:
            result["missing_required_fields"].append({"index": index, "slug": slug, "title": title, "fields": missing})

        thumbnail = str(game.get("thumbnail", "")).strip()
        if thumbnail and not urlparse(thumbnail).netloc and not thumbnail.startswith(IGNORED_LINK_SCHEMES):
            thumb_file = ROOT / normalize_path(thumbnail).lstrip("/")
            if not thumb_file.exists():
                result["missing_local_thumbnails"].append({"slug": slug, "path": thumbnail})

        for field_name, output_name in (
            ("disk", "local_download_references_missing"),
            ("pdf", "local_manual_references_missing"),
        ):
            raw = game.get(field_name)
            values = raw if isinstance(raw, list) else [raw]
            for value in values:
                text = str(value or "").strip()
                if not text or urlparse(text).netloc or text.startswith(IGNORED_LINK_SCHEMES):
                    continue
                candidate = ROOT / normalize_path(text).lstrip("/")
                if not candidate.exists():
                    result[output_name].append({"slug": slug, "path": text})
    return result


def main() -> int:
    html_files = sorted(p for p in ROOT.rglob("*.html") if p.is_file() and not is_excluded(p))
    sitemap_urls, sitemap_errors = load_sitemap_urls()

    pages: list[dict[str, Any]] = []
    url_to_record: dict[str, dict[str, Any]] = {}
    raw_internal_links: list[dict[str, str]] = []
    broken_assets: list[dict[str, str]] = []
    double_slash_refs: list[dict[str, str]] = []
    invalid_jsonld: list[dict[str, str]] = []

    for path in html_files:
        parsed = parse_html(path)
        rel = path.relative_to(ROOT).as_posix()
        page_url = normalize_site_url(page_url_for_file(path))
        canonical = normalize_site_url(parsed.canonical, page_url) if parsed.canonical else ""
        indexable = "noindex" not in parsed.robots.lower()
        redirect_stub = bool(parsed.meta_refresh or parsed.has_js_redirect)

        schema_types: list[str] = []
        invalid_count = 0
        for position, block in enumerate(parsed.jsonld_blocks, start=1):
            try:
                schema_types.extend(jsonld_types(json.loads(block)))
            except Exception as exc:
                invalid_count += 1
                invalid_jsonld.append({"file": rel, "block": str(position), "error": str(exc)})

        normalized_links: list[str] = []
        for raw in parsed.links:
            if raw.startswith(IGNORED_LINK_SCHEMES) or raw.startswith("#"):
                continue
            if path_has_double_slash(raw):
                double_slash_refs.append({"file": rel, "type": "link", "value": raw})
            absolute = urljoin(page_url, raw)
            target = urlparse(absolute)
            if target.netloc and target.netloc.lower() != SITE_HOST.lower():
                continue
            normalized = normalize_site_url(absolute)
            normalized_links.append(normalized)
            raw_internal_links.append({"source": page_url, "source_file": rel, "raw": raw, "target": normalized})

        if parsed.canonical and path_has_double_slash(parsed.canonical):
            double_slash_refs.append({"file": rel, "type": "canonical", "value": parsed.canonical})

        for raw_asset in parsed.assets:
            if not raw_asset or raw_asset.startswith(IGNORED_LINK_SCHEMES):
                continue
            if path_has_double_slash(raw_asset):
                double_slash_refs.append({"file": rel, "type": "asset", "value": raw_asset})
            target_file = local_asset_file(path, raw_asset)
            if target_file is not None and not target_file.exists():
                broken_assets.append({
                    "file": rel,
                    "reference": raw_asset,
                    "resolved": target_file.relative_to(ROOT).as_posix() if ROOT in target_file.parents else str(target_file),
                })

        record = {
            "file": rel,
            "route_url": page_url,
            "page_type": classify_page(rel),
            "title": parsed.title,
            "title_length": len(parsed.title),
            "meta_description": parsed.meta_description,
            "meta_description_length": len(parsed.meta_description),
            "h1_values": parsed.h1_values,
            "h1_count": len(parsed.h1_values),
            "canonical_url": canonical,
            "robots": parsed.robots,
            "indexable": indexable,
            "redirect_stub": redirect_stub,
            "internal_links_out": sorted(set(normalized_links)),
            "internal_links_in": 0,
            "schema_types": sorted(set(schema_types)),
            "invalid_jsonld_blocks": invalid_count,
            "open_graph_complete": parsed.og_title and parsed.og_description and parsed.og_image,
            "twitter_card": parsed.twitter_card,
            "image_count": len(parsed.images),
            "images_missing_alt": sum(1 for image in parsed.images if image.get("alt", "") == ""),
            "images_missing_dimensions": sum(
                1 for image in parsed.images
                if image.get("src") and (not image.get("width") or not image.get("height"))
            ),
            "in_sitemap": page_url in sitemap_urls or (canonical and canonical in sitemap_urls),
        }
        pages.append(record)
        url_to_record[page_url] = record

    broken_internal_links: list[dict[str, str]] = []
    incoming = Counter()
    for link in raw_internal_links:
        target_url = link["target"]
        target_path = urlparse(target_url).path
        if target_url in url_to_record:
            incoming[target_url] += 1
            continue
        if canonical_repo_file_for_path(target_path) is None:
            if Path(target_path).suffix.lower() in ASSET_EXTENSIONS:
                continue
            broken_internal_links.append(link)

    for record in pages:
        record["internal_links_in"] = incoming[record["route_url"]]

    indexable_pages = [page for page in pages if page["indexable"]]
    indexable_non_redirect = [page for page in indexable_pages if not page["redirect_stub"]]
    title_counts = Counter(page["title"] for page in indexable_non_redirect if page["title"])
    meta_counts = Counter(page["meta_description"] for page in indexable_non_redirect if page["meta_description"])
    canonical_groups: dict[str, list[str]] = defaultdict(list)

    for page in pages:
        page["duplicate_title"] = bool(page["title"] and title_counts[page["title"]] > 1)
        page["duplicate_meta_description"] = bool(
            page["meta_description"] and meta_counts[page["meta_description"]] > 1
        )
        if page["indexable"] and page["canonical_url"]:
            canonical_groups[page["canonical_url"]].append(page["file"])

    duplicate_canonical_groups = {
        canonical: files for canonical, files in canonical_groups.items() if len(files) > 1
    }
    missing_canonical = [page["file"] for page in indexable_non_redirect if not page["canonical_url"]]
    canonical_targets_missing: list[dict[str, str]] = []
    canonical_mismatches: list[dict[str, str]] = []

    for page in pages:
        canonical = page["canonical_url"]
        if not canonical:
            continue
        parsed = urlparse(canonical)
        if parsed.netloc.lower() != SITE_HOST.lower():
            canonical_targets_missing.append({"file": page["file"], "canonical": canonical, "reason": "external-host"})
            continue
        if canonical_repo_file_for_path(parsed.path) is None:
            canonical_targets_missing.append({
                "file": page["file"],
                "canonical": canonical,
                "reason": "repository-target-missing",
            })
        if page["indexable"] and not page["redirect_stub"] and canonical != page["route_url"]:
            canonical_mismatches.append({
                "file": page["file"],
                "route": page["route_url"],
                "canonical": canonical,
            })

    orphan_pages = [
        page["file"] for page in indexable_non_redirect
        if page["internal_links_in"] == 0
        and page["route_url"] not in {SITE_ROOT + "/", SITE_ROOT + "/home.html"}
    ]

    canonical_indexable_urls = {
        page["canonical_url"] or page["route_url"] for page in indexable_non_redirect
    }
    missing_from_sitemap = sorted(canonical_indexable_urls - sitemap_urls)
    sitemap_unknown_urls = sorted(
        url for url in sitemap_urls
        if urlparse(url).netloc.lower() == SITE_HOST.lower()
        and canonical_repo_file_for_path(urlparse(url).path) is None
    )
    sitemap_noncanonical = sorted(
        page["route_url"] for page in indexable_non_redirect
        if page["route_url"] in sitemap_urls
        and page["canonical_url"]
        and page["canonical_url"] != page["route_url"]
    )

    game_data = audit_games_data()
    issue_counts = {
        "html_pages_scanned": len(pages),
        "indexable_pages": len(indexable_pages),
        "noindex_pages": len(pages) - len(indexable_pages),
        "redirect_stubs": sum(1 for page in pages if page["redirect_stub"]),
        "duplicate_indexable_titles": sum(1 for page in indexable_non_redirect if page["duplicate_title"]),
        "duplicate_indexable_meta_descriptions": sum(
            1 for page in indexable_non_redirect if page["duplicate_meta_description"]
        ),
        "indexable_pages_missing_title": sum(1 for page in indexable_non_redirect if not page["title"]),
        "indexable_pages_missing_meta_description": sum(
            1 for page in indexable_non_redirect if not page["meta_description"]
        ),
        "indexable_pages_missing_h1": sum(1 for page in indexable_non_redirect if page["h1_count"] == 0),
        "indexable_pages_multiple_h1": sum(1 for page in indexable_non_redirect if page["h1_count"] > 1),
        "indexable_pages_missing_canonical": len(missing_canonical),
        "duplicate_canonical_groups": len(duplicate_canonical_groups),
        "canonical_targets_missing": len(canonical_targets_missing),
        "indexable_canonical_mismatches": len(canonical_mismatches),
        "orphan_indexable_pages": len(orphan_pages),
        "broken_internal_links": len(broken_internal_links),
        "broken_local_assets": len(broken_assets),
        "invalid_jsonld_blocks": len(invalid_jsonld),
        "double_slash_references": len(double_slash_refs),
        "indexable_pages_missing_from_sitemap": len(missing_from_sitemap),
        "unknown_urls_in_sitemaps": len(sitemap_unknown_urls),
        "noncanonical_urls_in_sitemaps": len(sitemap_noncanonical),
        "images_missing_alt": sum(page["images_missing_alt"] for page in pages),
        "images_missing_dimensions": sum(page["images_missing_dimensions"] for page in pages),
        "games_json_records": game_data.get("records", 0),
        "duplicate_game_slugs": len(game_data.get("duplicate_slugs", [])),
        "games_missing_required_fields": len(game_data.get("missing_required_fields", [])),
        "games_missing_local_thumbnails": len(game_data.get("missing_local_thumbnails", [])),
    }

    report = {
        "audit": {
            "name": "CCG Phase 0 SEO Baseline",
            "version": 1,
            "site_root": SITE_ROOT,
            "read_only": True,
            "external_network_checks": False,
        },
        "counts": issue_counts,
        "findings": {
            "missing_canonical": missing_canonical,
            "duplicate_canonical_groups": duplicate_canonical_groups,
            "canonical_targets_missing": canonical_targets_missing,
            "canonical_mismatches": canonical_mismatches,
            "orphan_pages": orphan_pages,
            "broken_internal_links": broken_internal_links,
            "broken_local_assets": broken_assets,
            "invalid_jsonld": invalid_jsonld,
            "double_slash_references": double_slash_refs,
            "missing_from_sitemap": missing_from_sitemap,
            "sitemap_unknown_urls": sitemap_unknown_urls,
            "sitemap_noncanonical_urls": sitemap_noncanonical,
            "sitemap_parse_errors": sitemap_errors,
        },
        "games_data": game_data,
        "pages": pages,
    }

    REPORT_JSON.parent.mkdir(parents=True, exist_ok=True)
    REPORT_JSON.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    priorities = [
        ("Critical", "Broken internal links", issue_counts["broken_internal_links"]),
        ("Critical", "Broken local assets", issue_counts["broken_local_assets"]),
        ("Critical", "Canonical targets missing", issue_counts["canonical_targets_missing"]),
        ("High", "Duplicate canonical groups", issue_counts["duplicate_canonical_groups"]),
        ("High", "Indexable pages missing canonical", issue_counts["indexable_pages_missing_canonical"]),
        ("High", "Indexable pages missing from sitemap", issue_counts["indexable_pages_missing_from_sitemap"]),
        ("High", "Unknown URLs in sitemaps", issue_counts["unknown_urls_in_sitemaps"]),
        ("High", "Invalid JSON-LD blocks", issue_counts["invalid_jsonld_blocks"]),
        ("Medium", "Orphan indexable pages", issue_counts["orphan_indexable_pages"]),
        ("Medium", "Duplicate indexable titles", issue_counts["duplicate_indexable_titles"]),
        ("Medium", "Duplicate indexable meta descriptions", issue_counts["duplicate_indexable_meta_descriptions"]),
        ("Medium", "Images missing dimensions", issue_counts["images_missing_dimensions"]),
        ("Low", "Images with empty or missing alt", issue_counts["images_missing_alt"]),
    ]

    md = [
        "# CCG Phase 0 SEO Baseline",
        "",
        "> Read-only repository audit. No public website page, game record, navigation item or generated archive is modified by this script.",
        "",
        "## Scope",
        "",
        f"- HTML pages scanned: **{issue_counts['html_pages_scanned']}**",
        f"- Indexable pages detected: **{issue_counts['indexable_pages']}**",
        f"- Noindex pages detected: **{issue_counts['noindex_pages']}**",
        f"- Redirect-style stubs detected: **{issue_counts['redirect_stubs']}**",
        f"- `games.json` records: **{issue_counts['games_json_records']}**",
        "- External URLs were recorded but not requested.",
        "",
        "## Priority summary",
        "",
        "| Priority | Finding | Count |",
        "|---|---|---:|",
    ]
    for priority, label, count in priorities:
        md.append(f"| {priority} | {label} | {count} |")

    md.extend(["", "## Technical counts", "", "| Check | Count |", "|---|---:|"])
    for key, value in issue_counts.items():
        md.append(f"| `{key}` | {value} |")

    def add_examples(title: str, items: list[Any], limit: int = 40) -> None:
        md.extend(["", f"## {title}", ""])
        if not items:
            md.append("No findings.")
            return
        for item in items[:limit]:
            if isinstance(item, str):
                md.append(f"- `{item}`")
            else:
                md.append(f"- `{json.dumps(item, ensure_ascii=False)}`")
        if len(items) > limit:
            md.append(f"- …and {len(items) - limit} more. See the JSON report for the full list.")

    add_examples("Broken internal-link examples", broken_internal_links)
    add_examples("Broken local-asset examples", broken_assets)
    add_examples("Canonical-target examples", canonical_targets_missing)
    add_examples("Orphan-page examples", orphan_pages)
    add_examples("Sitemap omissions", missing_from_sitemap)
    add_examples("Invalid JSON-LD examples", invalid_jsonld)
    add_examples("Game-data issues", game_data.get("missing_required_fields", []) + game_data.get("missing_local_thumbnails", []))

    md.extend([
        "",
        "## Interpretation rules",
        "",
        "- Duplicate title and description counts include only indexable, non-redirect pages.",
        "- A legacy redirect or `noindex` stub is not automatically treated as duplicate indexable content.",
        "- Local link and asset checks are repository-based; they do not confirm the status of external Google Drive, YouTube or third-party URLs.",
        "- Empty image alt text is reported for review but may be intentional for decorative images.",
        "- Findings are a baseline for later PRs, not automatic instructions to delete or redirect files.",
        "",
        "## Phase 0 next step",
        "",
        "Review and classify the findings into safe correction batches. No correction should be merged as part of this baseline PR.",
        "",
        "Full machine-readable inventory: `docs/phase0-seo-baseline.json`.",
    ])

    REPORT_MD.write_text("\n".join(md) + "\n", encoding="utf-8")
    print(json.dumps(issue_counts, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
