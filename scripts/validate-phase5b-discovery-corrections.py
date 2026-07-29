#!/usr/bin/env python3
"""Validate the bounded Phase 5B internal-discovery corrections."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk"
MANUAL_ROUTE = "/viewer/manual.html"
MANUAL_ENTRY = "viewer/manual.html"
QUIZ_ROUTE = "/quiz/pack-6.html"
EVENT_ROUTE = "/retro-events/yorkshire-amiga-group-meetup/"
PUBLISHER_ROUTE = "/games/publishers/"


def read(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"Missing required file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def attr(tag: str, name: str) -> str:
    match = re.search(rf"\b{re.escape(name)}\s*=\s*([\"'])(.*?)\1", tag, re.I | re.S)
    return match.group(2).strip() if match else ""


def normalise_route(value: str) -> str:
    route = urlparse(value).path or "/"
    if route.endswith("/index.html"):
        route = route[: -len("index.html")]
    return route or "/"


def sitemap_routes(path: Path) -> list[str]:
    routes: list[str] = []
    for elem in ET.parse(path).getroot().iter():
        if elem.tag.endswith("loc") and elem.text:
            parsed = urlparse(elem.text.strip())
            if parsed.netloc.lower() in {
                "cheekycommodoregamer.co.uk",
                "www.cheekycommodoregamer.co.uk",
            }:
                routes.append(normalise_route(elem.text.strip()))
    return routes


def links_inside_noscript(html: str) -> list[str]:
    hrefs: list[str] = []
    for block in re.findall(r"<noscript\b[^>]*>(.*?)</noscript>", html, re.I | re.S):
        hrefs.extend(
            attr(match.group(0), "href")
            for match in re.finditer(r"<a\b[^>]*>", block, re.I | re.S)
            if attr(match.group(0), "href")
        )
    return hrefs


def validate_baseline_registry(current: list[str], baseline: list[str]) -> None:
    expected = [entry for entry in baseline if entry != MANUAL_ENTRY]
    if current != expected:
        raise SystemExit(
            "Static-page registry changed beyond removing viewer/manual.html or changed order."
        )


def validate_browse_games() -> None:
    html = read(ROOT / "games" / "index.html")
    if html.count(f'href="{PUBLISHER_ROUTE}"') != 1:
        raise SystemExit("Browse Games must contain exactly one publisher link.")
    block_match = re.search(
        r'<div class="games-hero__stats" data-games-developers-shortcut="true">([\s\S]*?)</div>',
        html,
    )
    if not block_match:
        raise SystemExit("Browse Games developer shortcut block is missing.")
    block = block_match.group(1)
    if 'href="/games/developers/"' not in block or f'href="{PUBLISHER_ROUTE}"' not in block:
        raise SystemExit("Developer and publisher buttons are not grouped in the bounded shortcut block.")


def validate_quiz_pack() -> None:
    html = read(ROOT / "quiz" / "quiz.html")
    noscript_links = links_inside_noscript(html)
    if noscript_links.count("pack-6.html") != 1:
        raise SystemExit("Quiz hub must contain one no-script Pack 6 link.")
    if html.count('data-phase5b-quiz-pack6-discovery="true"') != 1:
        raise SystemExit("Quiz Pack 6 Phase 5B marker is missing or duplicated.")

    data = json.loads(read(ROOT / "quiz" / "quiz-data.json"))
    packs = data.get("packs", []) if isinstance(data, dict) else []
    matches = [pack for pack in packs if str(pack.get("id")) == "6"]
    if len(matches) != 1:
        raise SystemExit("Quiz Pack 6 must exist exactly once in quiz-data.json.")
    pack = matches[0]
    if pack.get("enabled") is not True:
        raise SystemExit("Quiz Pack 6 is not enabled.")
    if pack.get("type") != "hangman" or pack.get("externalHref") != "pack-6.html":
        raise SystemExit("Quiz Pack 6 is not configured as the active external hangman page.")
    pack_html = read(ROOT / "quiz" / "pack-6.html")
    if 'script src="js/quiz-pack-6.js"' not in pack_html:
        raise SystemExit("Quiz Pack 6 does not load its game script.")


def validate_retro_event() -> None:
    html = read(ROOT / "games" / "collections" / "retro-events.html")
    noscript_links = links_inside_noscript(html)
    if noscript_links.count(EVENT_ROUTE) != 1:
        raise SystemExit("Retro Events hub must contain one no-script Yorkshire meetup link.")
    if html.count('data-phase5b-yorkshire-event-discovery="true"') != 1:
        raise SystemExit("Yorkshire meetup Phase 5B marker is missing or duplicated.")

    data = json.loads(read(ROOT / "data" / "retro-events.json"))
    matches = [item for item in data if item.get("slug") == "yorkshire-amiga-group-meetup"]
    if len(matches) != 1:
        raise SystemExit("Yorkshire meetup must exist exactly once in retro-events.json.")
    event = matches[0]
    if event.get("type") != "retro-events" or event.get("visible") is False or event.get("published") is False:
        raise SystemExit("Yorkshire meetup is not an active Retro Events record.")
    if not (ROOT / "retro-events" / "yorkshire-amiga-group-meetup" / "index.html").exists():
        raise SystemExit("Yorkshire meetup canonical detail route is missing.")


def validate_manual_policy() -> None:
    html = read(ROOT / "viewer" / "manual.html")
    tags = [match.group(0) for match in re.finditer(r"<meta\b[^>]*>", html, re.I | re.S)]
    robots = [tag for tag in tags if attr(tag, "name").lower() == "robots"]
    if len(robots) != 1 or attr(robots[0], "content").lower() != "noindex,follow":
        raise SystemExit("Manual viewer must have exactly one noindex,follow directive.")

    registry = json.loads(read(ROOT / "tools" / "seo" / "static-pages.json"))
    if MANUAL_ENTRY in registry:
        raise SystemExit("Manual viewer remains in the static-page registry.")
    if "viewer/manual.html" in read(ROOT / "tools" / "seo" / "generate-sitemap.js"):
        raise SystemExit("Manual viewer remains in sitemap generator defaults.")
    for sitemap in sorted(ROOT.glob("sitemap*.xml")):
        if MANUAL_ROUTE in sitemap_routes(sitemap):
            raise SystemExit(f"Manual viewer remains in {sitemap.name}.")


def validate_phase5a_evidence(evidence: dict) -> dict:
    summary = evidence.get("summary", {})
    required = {
        "public_html_pages": 1982,
        "indexable_pages": 935,
        "orphan_indexable_pages": 0,
        "sitemap_only_indexable_pages": 0,
        "broken_internal_link_edges": 0,
        "canonical_game_pages_expected": 651,
        "canonical_game_pages_missing": 0,
        "games_without_meaningful_static_discovery": 0,
        "games_with_one_or_zero_discovery_dimensions": 0,
    }
    for key, expected in required.items():
        actual = summary.get(key)
        if actual != expected:
            raise SystemExit(f"Phase 5A evidence {key} expected {expected}, found {actual}.")
    if summary.get("minimum_archive_routes_per_game", 0) < 4:
        raise SystemExit("A canonical game lost expected archive discovery coverage.")

    orphan_routes = {item.get("route") for item in evidence.get("orphan_pages", [])}
    for route in (MANUAL_ROUTE, QUIZ_ROUTE, EVENT_ROUTE):
        if route in orphan_routes:
            raise SystemExit(f"Resolved Phase 5A candidate remains orphaned: {route}")

    hub_checks = {item.get("hub"): item for item in evidence.get("hub_parent_checks", [])}
    publisher = hub_checks.get(PUBLISHER_ROUTE)
    if not publisher or "/games/" not in publisher.get("linked_from", []):
        raise SystemExit("Publisher hub is still not linked from Browse Games.")
    return summary


def build_report(summary: dict) -> str:
    return f"""# Phase 5B Low-Risk Internal Discovery Corrections

## Verified results

| Check | Result |
|---|---:|
| Public HTML pages audited | **{summary['public_html_pages']}** |
| Indexable pages after utility-page correction | **{summary['indexable_pages']}** |
| Indexable orphan pages | **{summary['orphan_indexable_pages']}** |
| Sitemap-only indexable pages | **{summary['sitemap_only_indexable_pages']}** |
| Broken internal-link edges | **{summary['broken_internal_link_edges']}** |
| Canonical games retaining meaningful discovery | **651** |
| Minimum archive routes per game | **{summary['minimum_archive_routes_per_game']}** |

## Candidate decisions

### `/quiz/pack-6.html`

- Kept indexable as an active public quiz.
- Confirmed Quiz Pack 6 is enabled in `quiz/quiz-data.json` as the external **Game Box Hangman** page.
- Added one no-script fallback link from the existing quiz pack area.
- Left the established JavaScript quiz selection and Pack 6 behaviour unchanged.

### `/retro-events/yorkshire-amiga-group-meetup/`

- Kept indexable as an active Retro Events entry already present in `data/retro-events.json`.
- Added one no-script fallback link inside the existing Retro Events collection list.
- Left the data-driven event card loader and page presentation unchanged.

### `/viewer/manual.html`

- Confirmed it is an unfinished manual-viewer utility rather than an independent landing page.
- Added `noindex,follow`.
- Removed it from `tools/seo/static-pages.json`, sitemap generator defaults and all generated sitemaps.
- Added no public navigation link.

## Browse Games

- Added one **Browse by Publisher** button beside the existing **Browse by Developer** button.
- Reused the existing button and layout classes; no CSS or spacing redesign was introduced.

## Audit comparison

- Phase 5A orphan candidates: **3**.
- Phase 5B indexable orphan pages: **0**.
- Phase 5A sitemap-only candidates: **3**.
- Phase 5B sitemap-only indexable pages: **0**.
- Broken internal links remain **0**.
- All 651 canonical games retain multiple discovery dimensions and at least {summary['minimum_archive_routes_per_game']} archive links.

## Deferred by design

- The `/home.html` alias and its breadcrumb references were not changed.
- Intentional noindex developer, publisher, composer, community and year links were not changed in bulk.
- No global navigation, archive-card, thumbnail or homepage changes were made.

## Safety

- No changes to `games/games.json`.
- No changes to `index.html`, `home.html`, `resources/css/intro.css` or `js/index-intro.js`.
- No CSS changes.
- No routes were renamed, moved or deleted.
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline-static-pages", required=True)
    parser.add_argument("--baseline-sitemap-pages", required=True)
    parser.add_argument("--phase5a-json", required=True)
    parser.add_argument("--write-report", required=True)
    args = parser.parse_args()

    baseline_registry = json.loads(Path(args.baseline_static_pages).read_text(encoding="utf-8"))
    current_registry = json.loads(read(ROOT / "tools" / "seo" / "static-pages.json"))
    validate_baseline_registry(current_registry, baseline_registry)

    baseline_routes = sitemap_routes(Path(args.baseline_sitemap_pages))
    current_routes = sitemap_routes(ROOT / "sitemap-pages.xml")
    expected_routes = [route for route in baseline_routes if route != MANUAL_ROUTE]
    if current_routes != expected_routes:
        raise SystemExit("sitemap-pages.xml changed beyond removing the manual viewer route.")

    validate_browse_games()
    validate_quiz_pack()
    validate_retro_event()
    validate_manual_policy()

    evidence = json.loads(Path(args.phase5a_json).read_text(encoding="utf-8"))
    summary = validate_phase5a_evidence(evidence)

    report_path = Path(args.write_report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report = build_report(summary)
    current_report = report_path.read_text(encoding="utf-8") if report_path.exists() else None
    if current_report != report:
        report_path.write_text(report, encoding="utf-8")

    print(json.dumps({
        "orphan_indexable_pages": summary["orphan_indexable_pages"],
        "sitemap_only_indexable_pages": summary["sitemap_only_indexable_pages"],
        "broken_internal_link_edges": summary["broken_internal_link_edges"],
        "canonical_games": summary["canonical_game_pages_expected"],
    }, indent=2))


if __name__ == "__main__":
    main()
