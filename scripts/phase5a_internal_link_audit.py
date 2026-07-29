#!/usr/bin/env python3
"""Read-only Phase 5A internal-link and orphan-page audit."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from html import unescape
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITE_ROOT = "https://www.cheekycommodoregamer.co.uk"
PHASE0_REPORT = ROOT / "docs" / "seo-baseline" / "phase-0-baseline.md"
PUBLIC_EXCLUDED = {
    ".git", ".github", "admin", "auth", "data", "docs", "node_modules",
    "resources", "scripts", "supabase", "templates", "tests", "tmp", "validation",
}
PUBLIC_EXCLUDED_NAME_PARTS = (
    "_backup_", ".backup.", ".bak.", "index_temp", "_temp.html", "-temp.html",
)
RESOLUTION_EXCLUDED = {".git", "node_modules"}
ANCHOR_RE = re.compile(r"<a\b(?P<attrs>[^>]*)>(?P<body>.*?)</a>", re.I | re.S)
BREADCRUMB_RE = re.compile(
    r"<nav\b[^>]*aria-label\s*=\s*([\"'])breadcrumb\1[^>]*>.*?</nav>", re.I | re.S
)
ARCHIVE_FAMILIES = {
    "genre", "publisher", "developer", "composer", "year", "platform",
    "collection", "downloads", "retro-special", "retro-event", "demo-music",
}
GAME_DISCOVERY_FAMILIES = {
    "genre", "publisher", "developer", "composer", "year", "platform",
    "collection", "downloads",
}
VAGUE_TEXT = {
    "click here", "here", "read more", "learn more", "more", "view", "open",
    "details", "visit", "go", "continue", "see more", "find out more",
}
PAGE_EXTENSIONS = {"", ".html", ".htm"}


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def is_public_html(path: Path) -> bool:
    relative = rel(path)
    if relative.split("/")[0] in PUBLIC_EXCLUDED:
        return False
    if any(token in relative.lower() for token in PUBLIC_EXCLUDED_NAME_PARTS):
        return False
    return path.suffix.lower() == ".html"


def is_resolution_html(path: Path) -> bool:
    relative = rel(path)
    return path.suffix.lower() == ".html" and relative.split("/")[0] not in RESOLUTION_EXCLUDED


def strip_tags(value: str) -> str:
    value = re.sub(r"<script\b.*?</script>|<style\b.*?</style>", " ", value or "", flags=re.I | re.S)
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", value))).strip()


def attr(text: str, name: str) -> str:
    match = re.search(rf"\b{re.escape(name)}\s*=\s*([\"'])(.*?)\1", text, re.I | re.S)
    return unescape(match.group(2)).strip() if match else ""


def tag_attr(html: str, pattern: str, name: str) -> str:
    match = re.search(pattern, html, re.I | re.S)
    return attr(match.group(0), name) if match else ""


def file_route(path: Path) -> str:
    relative = rel(path)
    if relative in {"index.html", "home.html"}:
        return "/"
    if relative.endswith("/index.html"):
        return "/" + relative[:-10]
    return "/" + relative


def physical_route(path: Path) -> str:
    return "/" + rel(path)


def normalise_route(value: str) -> str:
    path = unquote(urlparse(value).path or "/")
    path = re.sub(r"/{2,}", "/", path)
    if not path.startswith("/"):
        path = "/" + path
    if path.endswith("/index.html"):
        path = path[:-10]
    return path or "/"


def resolve_href(source_route: str, raw: str) -> str | None:
    raw = unescape(raw).strip()
    if not raw or raw.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None
    parsed = urlparse(raw)
    if parsed.scheme in {"http", "https"}:
        if parsed.netloc.lower() not in {
            "cheekycommodoregamer.co.uk", "www.cheekycommodoregamer.co.uk"
        }:
            return None
        return normalise_route(raw)
    if parsed.scheme or raw.startswith("//"):
        return None
    return normalise_route(urljoin(SITE_ROOT + source_route, raw))


def route_candidates(route: str) -> list[str]:
    route = normalise_route(route)
    result = [route]
    suffix = Path(urlparse(route).path).suffix.lower()
    if route != "/" and not suffix:
        if route.endswith("/"):
            result.append(route.rstrip("/") + ".html")
        else:
            result.extend([route + "/", route + ".html"])
    return list(dict.fromkeys(result))


def detect_redirect(html: str) -> bool:
    return bool(
        re.search(r"<meta\b[^>]*http-equiv\s*=\s*([\"'])refresh\1", html, re.I)
        or re.search(r"\b(?:window\.)?location\.(?:replace|assign)\s*\(", html, re.I)
    )


def load_games() -> list[dict]:
    payload = json.loads((ROOT / "games" / "games.json").read_text(encoding="utf-8"))
    games = payload if isinstance(payload, list) else payload.get("games", [])
    if not isinstance(games, list):
        raise ValueError("games/games.json does not contain a game list")
    return games


def family(relative: str, game_slugs: set[str], public: bool) -> str:
    prefixes = (
        ("games/years/", "year"), ("games/platforms/", "platform"),
        ("games/publishers/", "publisher"), ("games/developers/", "developer"),
        ("games/genres/", "genre"), ("games/collections/", "collection"),
        ("games/downloads/", "downloads"), ("music/", "composer"),
        ("retro-specials/", "retro-special"), ("retro-events/", "retro-event"),
        ("amiga-demo-music/", "demo-music"), ("quiz/", "quiz"),
        ("community/", "community"),
    )
    for prefix, label in prefixes:
        if relative.startswith(prefix):
            return label
    if relative == "games/index.html":
        return "games-hub"
    match = re.fullmatch(r"games/([^/]+)/index\.html", relative)
    if match and match.group(1) in game_slugs:
        return "canonical-game"
    if relative.startswith("games/"):
        return "game-support"
    return "other-public" if public else "excluded-utility"


def parse_sitemaps() -> tuple[set[str], dict[str, list[str]], list[str]]:
    all_routes: set[str] = set()
    by_file: dict[str, list[str]] = {}
    errors: list[str] = []
    for sitemap in sorted(ROOT.glob("sitemap*.xml")):
        routes: list[str] = []
        try:
            for elem in ET.parse(sitemap).getroot().iter():
                if not elem.tag.endswith("loc") or not elem.text:
                    continue
                value = elem.text.strip()
                parsed = urlparse(value)
                if parsed.netloc.lower() not in {
                    "cheekycommodoregamer.co.uk", "www.cheekycommodoregamer.co.uk"
                }:
                    continue
                route = normalise_route(value)
                routes.append(route)
                all_routes.add(route)
        except Exception as exc:
            errors.append(f"{rel(sitemap)}: {exc}")
        by_file[rel(sitemap)] = routes
    return all_routes, by_file, errors


def phase0_counts() -> dict[str, int]:
    if not PHASE0_REPORT.exists():
        return {}
    text = PHASE0_REPORT.read_text(encoding="utf-8", errors="ignore")
    patterns = {
        "indexable_pages": r"\| Indexable pages \| \*\*(\d+)\*\* \|",
        "orphan_pages": r"\| Indexable pages with no detected incoming link \| \*\*(\d+)\*\* \|",
        "broken_internal_links": r"\| Broken internal links \| \*\*(\d+)\*\* \|",
    }
    result = {}
    for key, pattern in patterns.items():
        match = re.search(pattern, text)
        if match:
            result[key] = int(match.group(1))
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-output", required=True)
    parser.add_argument("--report-output", required=True)
    args = parser.parse_args()

    games = load_games()
    game_slugs = {str(game.get("slug") or "").strip() for game in games}
    game_slugs.discard("")
    sitemap_routes, sitemap_by_file, sitemap_errors = parse_sitemaps()

    records: list[dict] = []
    public_records: list[dict] = []
    by_file: dict[str, dict] = {}
    by_route: dict[str, list[dict]] = defaultdict(list)
    for path in sorted(path for path in ROOT.rglob("*.html") if is_resolution_html(path)):
        html = path.read_text(encoding="utf-8", errors="ignore")
        relative = rel(path)
        public = is_public_html(path)
        route = file_route(path)
        robots = tag_attr(html, r"<meta\b[^>]*name\s*=\s*([\"'])robots\1[^>]*>", "content")
        canonical = tag_attr(html, r"<link\b[^>]*rel\s*=\s*([\"'])canonical\1[^>]*>", "href")
        title_match = re.search(r"<title\b[^>]*>(.*?)</title>", html, re.I | re.S)
        record = {
            "file": relative, "route": route, "physical_route": physical_route(path),
            "public": public, "family": family(relative, game_slugs, public),
            "title": strip_tags(title_match.group(1)) if title_match else "",
            "robots": robots, "indexable": public and "noindex" not in robots.lower(),
            "canonical": canonical, "canonical_path": normalise_route(canonical) if canonical else "",
            "redirect": detect_redirect(html), "in_sitemap": route in sitemap_routes,
            "html": html, "incoming": set(), "incoming_indexable": set(), "outgoing": set(),
        }
        records.append(record)
        if public:
            public_records.append(record)
        by_file[relative] = record
        by_route[route].append(record)
        if record["physical_route"] != route:
            by_route[record["physical_route"]].append(record)

    def target_record(route: str) -> dict | None:
        requested = normalise_route(route)
        options: list[dict] = []
        for candidate in route_candidates(requested):
            options.extend(by_route.get(candidate, []))
        if not options:
            return None
        exact_physical = [item for item in options if item["physical_route"] == requested]
        if exact_physical:
            options = exact_physical
        else:
            exact_route = [item for item in options if item["route"] == requested]
            if exact_route:
                options = exact_route
        options.sort(key=lambda item: (
            not item["public"], item["canonical_path"] != requested, item["redirect"],
            not item["indexable"], item["file"] == "index.html", item["file"],
        ))
        return options[0]

    broken: set[tuple[str, str]] = set()
    redirects: set[tuple[str, str]] = set()
    intentional_game_wrappers: set[tuple[str, str]] = set()
    noindex: set[tuple[str, str]] = set()
    aliases: set[tuple[str, str]] = set()
    redirect_destinations: set[str] = set()
    intentional_wrapper_destinations: set[str] = set()
    noindex_destinations: set[str] = set()
    alias_destinations: set[str] = set()
    noindex_destination_families: Counter[str] = Counter()
    navigation_issues: list[dict] = []
    vague_anchors: list[dict] = []

    for source in public_records:
        breadcrumb_ranges = [(m.start(), m.end()) for m in BREADCRUMB_RE.finditer(source["html"])]
        for match in ANCHOR_RE.finditer(source["html"]):
            href = attr(match.group("attrs"), "href")
            requested = resolve_href(source["route"], href)
            if requested is None or Path(urlparse(requested).path).suffix.lower() not in PAGE_EXTENSIONS:
                continue
            text = strip_tags(match.group("body"))
            if text.lower().strip(" .:;!?›»→") in VAGUE_TEXT:
                vague_anchors.append({"source": source["file"], "target": requested, "text": text})
            rel_values = set(attr(match.group("attrs"), "rel").lower().split())
            breadcrumb = any(start <= match.start() < end for start, end in breadcrumb_ranges)
            adjacent = bool({"prev", "next"}.intersection(rel_values))
            target = target_record(requested)
            if target is None:
                broken.add((source["file"], requested))
                if breadcrumb or adjacent:
                    navigation_issues.append({
                        "source": source["file"], "target": requested, "kind": "broken",
                        "context": "breadcrumb" if breadcrumb else "adjacent",
                    })
                continue

            source["outgoing"].add(requested)
            if target["public"] and source["file"] != target["file"]:
                target["incoming"].add(source["file"])
                if source["indexable"]:
                    target["incoming_indexable"].add(source["file"])

            is_game_wrapper = (
                target["family"] == "canonical-game"
                and target["canonical_path"] == target["route"]
                and target["redirect"]
            )
            issue_kinds = []
            if target["redirect"]:
                if is_game_wrapper:
                    intentional_game_wrappers.add((source["file"], requested))
                    intentional_wrapper_destinations.add(requested)
                else:
                    redirects.add((source["file"], requested))
                    redirect_destinations.add(requested)
                    issue_kinds.append("redirect")
            if target["public"] and not target["indexable"]:
                noindex.add((source["file"], requested))
                noindex_destinations.add(requested)
                noindex_destination_families[target["family"]] += 1
            if target["canonical_path"] and target["canonical_path"] != normalise_route(requested):
                aliases.add((source["file"], requested))
                alias_destinations.add(requested)
                issue_kinds.append("noncanonical-alias")
            if (breadcrumb or adjacent) and issue_kinds:
                navigation_issues.append({
                    "source": source["file"], "target": requested,
                    "kind": ",".join(issue_kinds),
                    "context": "breadcrumb" if breadcrumb else "adjacent",
                })

    for record in public_records:
        sources = [by_file[name] for name in sorted(record["incoming"])]
        record["incoming_count"] = len(sources)
        record["incoming_indexable_count"] = len(record["incoming_indexable"])
        record["incoming_families"] = sorted({item["family"] for item in sources})
        record["sitemap_only"] = record["indexable"] and record["route"] != "/" and not sources and record["in_sitemap"]
        record["archive_only"] = record["indexable"] and bool(sources) and all(item["family"] in ARCHIVE_FAMILIES for item in sources)
        record["noindex_sources_only"] = record["indexable"] and bool(sources) and all(not item["indexable"] for item in sources)

    indexable = [item for item in public_records if item["indexable"]]
    orphan = sorted([item for item in indexable if item["route"] != "/" and not item["incoming"]], key=lambda x: (x["family"], x["route"]))
    weak = sorted([item for item in indexable if item["route"] != "/" and len(item["incoming"]) == 1], key=lambda x: (x["family"], x["route"]))
    sitemap_only = [item for item in indexable if item["sitemap_only"]]
    archive_only = [item for item in indexable if item["archive_only"]]

    family_summary = {}
    for label in sorted({item["family"] for item in indexable}):
        items = [item for item in indexable if item["family"] == label]
        family_summary[label] = {
            "indexable": len(items),
            "orphan": sum(item["route"] != "/" and not item["incoming"] for item in items),
            "weak": sum(item["route"] != "/" and len(item["incoming"]) == 1 for item in items),
            "sitemap_only": sum(item["sitemap_only"] for item in items),
            "archive_only": sum(item["archive_only"] for item in items),
        }

    game_discovery = []
    missing_games = []
    undiscoverable_games = []
    single_dimension_games = []
    archive_counts = []
    for game in games:
        slug = str(game.get("slug") or "").strip()
        title = str(game.get("title") or slug).strip()
        if not slug:
            continue
        route = f"/games/{slug}/"
        target = target_record(route)
        if target is None or target["family"] != "canonical-game":
            missing_games.append({"slug": slug, "title": title, "route": route})
            continue
        sources = [by_file[name] for name in target["incoming"]]
        archive_routes = sorted({item["route"] for item in sources if item["family"] in GAME_DISCOVERY_FAMILIES})
        dimensions = sorted({item["family"] for item in sources if item["family"] in GAME_DISCOVERY_FAMILIES})
        meaningful = sorted({item["route"] for item in sources if item["family"] in GAME_DISCOVERY_FAMILIES or item["family"] == "games-hub"})
        result = {
            "slug": slug, "title": title, "route": route,
            "incoming_source_pages": len(target["incoming"]),
            "archive_route_count": len(archive_routes), "archive_routes": archive_routes,
            "discovery_dimensions": dimensions, "meaningful_discovery": bool(meaningful),
        }
        game_discovery.append(result)
        archive_counts.append(len(archive_routes))
        if not meaningful:
            undiscoverable_games.append(result)
        if len(dimensions) <= 1:
            single_dimension_games.append(result)

    expected_hubs = {
        "/games/years/": ["/games/"], "/games/platforms/": ["/games/"],
        "/games/publishers/": ["/games/"], "/games/developers/": ["/games/"],
        "/games/genres/": ["/games/"], "/games/collections/": ["/games/"],
        "/games/downloads/": ["/games/"], "/music/composers/": ["/music/"],
    }
    hub_checks = []
    for hub, parents in expected_hubs.items():
        hub_record = target_record(hub)
        linked_from = []
        for parent in parents:
            parent_record = target_record(parent)
            if parent_record and hub in parent_record["outgoing"]:
                linked_from.append(parent)
        hub_checks.append({
            "hub": hub, "exists": hub_record is not None, "expected_parents": parents,
            "linked_from": linked_from, "missing_parent_link": hub_record is not None and not linked_from,
        })

    summary = {
        "public_html_pages": len(public_records), "indexable_pages": len(indexable),
        "noindex_pages": len(public_records) - len(indexable),
        "orphan_indexable_pages": len(orphan), "weakly_linked_indexable_pages": len(weak),
        "sitemap_only_indexable_pages": len(sitemap_only),
        "archive_only_indexable_pages": len(archive_only),
        "broken_internal_link_edges": len(broken),
        "intentional_canonical_game_wrapper_redirect_destinations": len(intentional_wrapper_destinations),
        "other_redirect_destination_count": len(redirect_destinations),
        "noindex_destination_count": len(noindex_destinations),
        "noncanonical_alias_destination_count": len(alias_destinations),
        "breadcrumb_or_adjacent_navigation_issues": len(navigation_issues),
        "vague_anchor_occurrences": len(vague_anchors),
        "canonical_game_pages_expected": len(game_slugs),
        "canonical_game_pages_missing": len(missing_games),
        "games_without_meaningful_static_discovery": len(undiscoverable_games),
        "games_with_one_or_zero_discovery_dimensions": len(single_dimension_games),
        "minimum_archive_routes_per_game": min(archive_counts) if archive_counts else 0,
        "maximum_archive_routes_per_game": max(archive_counts) if archive_counts else 0,
        "sitemap_parse_errors": len(sitemap_errors),
    }
    phase0 = phase0_counts()

    def compact(item: dict) -> dict:
        return {
            "file": item["file"], "route": item["route"], "family": item["family"],
            "title": item["title"], "incoming_source_count": item["incoming_count"],
            "incoming_indexable_source_count": item["incoming_indexable_count"],
            "incoming_families": item["incoming_families"], "in_sitemap": item["in_sitemap"],
        }

    evidence = {
        "summary": summary,
        "phase0_comparison": {
            "phase0": phase0,
            "current": {
                "indexable_pages": summary["indexable_pages"],
                "orphan_pages": summary["orphan_indexable_pages"],
                "broken_internal_links": summary["broken_internal_link_edges"],
            },
            "note": "Phase 5A counts unique static source pages; Phase 0 counted raw incoming anchor occurrences.",
        },
        "family_summary": family_summary,
        "pages": [{
            **compact(item), "indexable": item["indexable"],
            "canonical_path": item["canonical_path"], "redirect": item["redirect"],
            "incoming_sources": sorted(item["incoming"]), "outgoing_targets": sorted(item["outgoing"]),
            "sitemap_only": item["sitemap_only"], "archive_only": item["archive_only"],
            "noindex_sources_only": item["noindex_sources_only"],
        } for item in public_records],
        "orphan_pages": [compact(item) for item in orphan],
        "weakly_linked_pages": [compact(item) for item in weak],
        "sitemap_only_pages": [compact(item) for item in sitemap_only],
        "archive_only_pages": [compact(item) for item in archive_only],
        "js_discovery_candidates": [compact(item) for item in sitemap_only],
        "link_issues": {
            "broken_edges": [{"source": a, "target": b} for a, b in sorted(broken)],
            "intentional_game_wrapper_redirect_edges": [{"source": a, "target": b} for a, b in sorted(intentional_game_wrappers)],
            "other_redirect_edges": [{"source": a, "target": b} for a, b in sorted(redirects)],
            "noindex_edges": [{"source": a, "target": b} for a, b in sorted(noindex)],
            "noncanonical_alias_edges": [{"source": a, "target": b} for a, b in sorted(aliases)],
            "breadcrumb_adjacent": navigation_issues,
            "noindex_destination_families": dict(noindex_destination_families),
        },
        "game_discovery": game_discovery, "missing_game_pages": missing_games,
        "undiscoverable_games": undiscoverable_games,
        "single_dimension_games": single_dimension_games,
        "hub_parent_checks": hub_checks, "vague_anchor_text": vague_anchors,
        "sitemaps": sitemap_by_file, "sitemap_errors": sitemap_errors,
        "limitations": [
            "Only static repository HTML anchors are counted; runtime-only links are possible JavaScript-dependent discovery gaps.",
            "External URLs were not requested.",
            "Phase 0 and Phase 5A use different incoming-link units.",
            "Canonical game wrapper redirects are reported separately from other redirect destinations because they are an established route design.",
        ],
    }

    json_output = Path(args.json_output)
    report_output = Path(args.report_output)
    if not json_output.is_absolute():
        json_output = ROOT / json_output
    if not report_output.is_absolute():
        report_output = ROOT / report_output
    json_output.parent.mkdir(parents=True, exist_ok=True)
    report_output.parent.mkdir(parents=True, exist_ok=True)
    json_output.write_text(json.dumps(evidence, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    md = [
        "# Phase 5A Internal Linking and Orphan Page Audit", "",
        "This is a read-only audit of static internal discovery after Phases 0–4. Public HTML, CSS, JavaScript and game data are not modified.", "",
        "## Executive summary", "", "| Check | Count |", "|---|---:|",
        f"| Public HTML pages audited | **{summary['public_html_pages']}** |",
        f"| Indexable pages | **{summary['indexable_pages']}** |",
        f"| Orphan indexable pages | **{summary['orphan_indexable_pages']}** |",
        f"| Weakly linked indexable pages | **{summary['weakly_linked_indexable_pages']}** |",
        f"| Sitemap-only indexable pages | **{summary['sitemap_only_indexable_pages']}** |",
        f"| Pages linked only from archive families | **{summary['archive_only_indexable_pages']}** |",
        f"| Broken internal link edges | **{summary['broken_internal_link_edges']}** |",
        f"| Intentional canonical game-wrapper redirect destinations | **{summary['intentional_canonical_game_wrapper_redirect_destinations']}** |",
        f"| Other redirect destinations receiving internal links | **{summary['other_redirect_destination_count']}** |",
        f"| Noindex destinations receiving internal links | **{summary['noindex_destination_count']}** |",
        f"| Noncanonical alias destinations receiving internal links | **{summary['noncanonical_alias_destination_count']}** |",
        f"| Breadcrumb or adjacent-navigation issues | **{summary['breadcrumb_or_adjacent_navigation_issues']}** |", "",
        "## Canonical game discovery", "",
        f"- Canonical game routes expected: **{summary['canonical_game_pages_expected']}**",
        f"- Canonical game routes missing: **{summary['canonical_game_pages_missing']}**",
        f"- Games without meaningful static archive or Browse Games discovery: **{summary['games_without_meaningful_static_discovery']}**",
        f"- Games with one or zero archive discovery dimensions: **{summary['games_with_one_or_zero_discovery_dimensions']}**",
        f"- Archive routes linking to a game: **{summary['minimum_archive_routes_per_game']}–{summary['maximum_archive_routes_per_game']}**", "",
        "## Results by route family", "",
        "| Route family | Indexable | Orphan | Weak | Sitemap only | Archive only |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for label, counts in family_summary.items():
        md.append(f"| {label} | **{counts['indexable']}** | **{counts['orphan']}** | **{counts['weak']}** | **{counts['sitemap_only']}** | **{counts['archive_only']}** |")

    md.extend(["", "## Comparison with Phase 0", ""])
    if phase0:
        md.extend([
            f"- Phase 0 indexable pages: **{phase0.get('indexable_pages', 'n/a')}**; Phase 5A: **{summary['indexable_pages']}**.",
            f"- Phase 0 orphan candidates: **{phase0.get('orphan_pages', 'n/a')}**; Phase 5A unique-source orphans: **{summary['orphan_indexable_pages']}**.",
            f"- Phase 0 broken internal links: **{phase0.get('broken_internal_links', 'n/a')}**; Phase 5A broken static link edges: **{summary['broken_internal_link_edges']}**.",
            "- The orphan figures are directional rather than identical because Phase 5A counts unique source pages.",
        ])
    else:
        md.append("The Phase 0 summary could not be parsed; current evidence remains complete in the workflow artifact.")

    def add_pages(title: str, items: list[dict]) -> None:
        md.extend(["", f"### {title}", ""])
        if not items:
            md.append("None detected.")
            return
        for item in items[:20]:
            md.append(f"- `{item['route']}` — {item['family']} — {item['incoming_source_count']} incoming source page(s)")
        if len(items) > 20:
            md.append(f"- …and {len(items) - 20} more in the JSON artifact")

    md.extend(["", "## Priority samples"])
    add_pages("Orphan indexable pages", [compact(item) for item in orphan])
    add_pages("Weakly linked indexable pages", [compact(item) for item in weak])
    add_pages("Sitemap-only or JavaScript-dependent discovery candidates", [compact(item) for item in sitemap_only])

    md.extend(["", "### Actionable broken, redirect, noindex and alias samples", ""])
    issue_samples = (
        [{"source": a, "target": b, "kind": "broken"} for a, b in sorted(broken)]
        + [{"source": a, "target": b, "kind": "redirect"} for a, b in sorted(redirects)]
        + [{"source": a, "target": b, "kind": "noindex"} for a, b in sorted(noindex)]
        + [{"source": a, "target": b, "kind": "noncanonical alias"} for a, b in sorted(aliases)]
    )
    if not issue_samples:
        md.append("None detected.")
    else:
        for item in issue_samples[:25]:
            md.append(f"- **{item['kind']}**: `{item['source']}` → `{item['target']}`")
        if len(issue_samples) > 25:
            md.append(f"- …and {len(issue_samples) - 25} more in the JSON artifact")

    md.extend([
        "", "## Redirect interpretation", "",
        f"- **{summary['intentional_canonical_game_wrapper_redirect_destinations']}** canonical game routes deliberately forward to the dynamic game shell while retaining their own canonical and schema.",
        f"- **{summary['other_redirect_destination_count']}** other redirect destinations receive static internal links and should be reviewed separately.",
        "", "## Hub and parent discovery checks", "",
    ])
    for item in hub_checks:
        if not item["exists"]:
            md.append(f"- `{item['hub']}` is missing.")
        elif item["missing_parent_link"]:
            md.append(f"- `{item['hub']}` is not statically linked from its expected parent: {', '.join(item['expected_parents'])}.")
        else:
            md.append(f"- `{item['hub']}` is linked from {', '.join(item['linked_from'])}.")

    md.extend(["", "## Anchor-text review", "", f"- Vague anchor-text occurrences detected: **{summary['vague_anchor_occurrences']}**."])
    for text, count in Counter(item["text"].strip() for item in vague_anchors).most_common(10):
        md.append(f"- `{text or '(empty)'}`: **{count}** occurrence(s)")

    md.extend([
        "", "## Recommended correction batches", "",
        "1. **Highest value, low risk:** correct confirmed broken links and links to noncanonical aliases or non-game redirect pages in tightly scoped route-family batches.",
        "2. **High value, low-to-medium risk:** add missing parent-to-hub links and static discovery for genuine sitemap-only indexable pages.",
        "3. **Medium risk:** strengthen orphan and one-source pages using existing archive hubs rather than new global-navigation changes.",
        "4. **Noindex review:** separate intentional thin-archive links from accidental links to utility or private pages before changing anything.",
        "5. **Copy refinement:** replace vague anchor labels only where the destination is ambiguous; do not bulk-rewrite established navigation.",
        "", "## Safety and scope", "",
        "- No public HTML, CSS or JavaScript changed.",
        "- `games/games.json` remained unchanged.",
        "- No routes, redirects, canonicals or navigation were changed.",
        "- Detailed page and link-graph evidence is stored only in the workflow artifact.",
        "", "## Limitations", "",
        "- Runtime-only links are not counted as static discovery and appear as possible JavaScript-dependent candidates.",
        "- External resources were not fetched.",
        "- Phase 0 and Phase 5A orphan counts use different incoming-link units.",
    ])
    report_output.write_text("\n".join(md) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
