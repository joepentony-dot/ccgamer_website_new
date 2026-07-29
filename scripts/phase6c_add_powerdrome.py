#!/usr/bin/env python3
"""Add and validate the first controlled real game record: Powerdrome.

The source insertion preserves every existing games.json object byte-for-byte and
places the new object according to the current sort-title order. The record is
intentionally unrated and has no dedicated video until the owner supplies them.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
GAMES_PATH = ROOT / "games" / "games.json"
THUMBNAIL_PATH = ROOT / "resources" / "images" / "thumbnails" / "all" / "powerdrome_phase6c.jpg"
SLUG = "powerdrome"
ID = "powerdrome"
SITE_URL = "https://www.cheekycommodoregamer.co.uk"

RECORD: dict[str, Any] = {
    "system": "AMIGA",
    "id": ID,
    "slug": SLUG,
    "title": "Powerdrome",
    "sorttitle": "Powerdrome",
    "year": 1989,
    "genres": ["racing"],
    "collections": [],
    "videoid": "",
    "thumbnail": "resources/images/thumbnails/all/powerdrome_phase6c.jpg",
    "pdf": "",
    "disk": [],
    "lemon": [],
    "description": (
        "Powerdrome is a futuristic first-person racing game released for the Commodore Amiga in 1989 by Electronic Arts. "
        "Designed and programmed by Michael Powell, it places the player inside an anti-gravity craft that pitches and rolls "
        "through demanding 3D circuits. Its high speed and aircraft-style handling reward careful control rather than simply "
        "holding the accelerator down."
    ),
    "ccg_rating": 0,
    "ccg_rating_reason": "Awaiting a dedicated Cheeky Commodore Gamer review; 0 is an unrated placeholder, not a verdict.",
    "credits": {
        "publisher": ["Electronic Arts"],
        "producer": "",
        "coder": ["Michael Powell"],
        "graphics": [],
        "musician": [],
        "re_releaser": [],
        "developer": "Michael Powell",
    },
    "developer": "Michael Powell",
    "_ccg_enforced": False,
    "_ccg_migrated": False,
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def stable_record_hash(record: Any) -> str:
    payload = json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def top_level_object_spans(text: str) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    depth = 0
    start: int | None = None
    in_string = False
    escaped = False

    for index, char in enumerate(text):
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
            continue
        if char == "{":
            if depth == 0:
                start = index
            depth += 1
            continue
        if char == "}":
            depth -= 1
            if depth < 0:
                raise SystemExit("games/games.json contains an unmatched closing brace")
            if depth == 0 and start is not None:
                spans.append((start, index + 1))
                start = None

    if in_string or depth != 0:
        raise SystemExit("games/games.json contains an incomplete string or object")
    return spans


def format_record(record: dict[str, Any]) -> str:
    rendered = json.dumps(record, ensure_ascii=False, indent=2)
    return "\n".join(f"  {line}" for line in rendered.splitlines())


def apply_record(baseline_path: Path, evidence_path: Path | None) -> dict[str, Any]:
    baseline_text = baseline_path.read_text(encoding="utf-8")
    current_text = GAMES_PATH.read_text(encoding="utf-8")
    if current_text != baseline_text:
        games = json.loads(current_text)
        matches = [game for game in games if game.get("id") == ID or game.get("slug") == SLUG]
        if len(matches) == 1 and matches[0] == RECORD:
            result = {
                "applied": False,
                "reason": "Powerdrome record already current",
                "baseline_count": len(json.loads(baseline_text)),
                "current_count": len(games),
            }
            if evidence_path:
                evidence_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
            return result
        raise SystemExit("games/games.json changed before the controlled Phase 6C insertion")

    baseline_games = json.loads(baseline_text)
    if not isinstance(baseline_games, list):
        raise SystemExit("games/games.json must contain an array")
    if any(game.get("id") == ID or game.get("slug") == SLUG for game in baseline_games):
        raise SystemExit("Powerdrome already exists in games/games.json")

    spans = top_level_object_spans(baseline_text)
    if len(spans) != len(baseline_games):
        raise SystemExit("Could not map every existing game object without rewriting the file")

    new_key = RECORD["sorttitle"].casefold()
    insertion_index = len(baseline_games)
    for index, game in enumerate(baseline_games):
        candidate = str(game.get("sorttitle") or game.get("title") or "").casefold()
        if candidate > new_key:
            insertion_index = index
            break

    rendered = format_record(RECORD)
    if insertion_index < len(spans):
        offset = spans[insertion_index][0]
        updated_text = baseline_text[:offset] + rendered + ",\n" + baseline_text[offset:]
    else:
        stripped = baseline_text.rstrip()
        if not stripped.endswith("]"):
            raise SystemExit("games/games.json does not end with an array terminator")
        closing = baseline_text.rfind("]")
        previous_end = spans[-1][1]
        between = baseline_text[previous_end:closing]
        if between.strip():
            raise SystemExit("Unexpected data between the final game and array terminator")
        updated_text = baseline_text[:previous_end] + ",\n" + rendered + baseline_text[previous_end:]

    GAMES_PATH.write_text(updated_text, encoding="utf-8")
    current_games = load_json(GAMES_PATH)
    without_new = [game for game in current_games if game.get("id") != ID]
    if without_new != baseline_games:
        raise SystemExit("An existing game record or its order changed during insertion")
    matches = [game for game in current_games if game.get("id") == ID and game.get("slug") == SLUG]
    if matches != [RECORD]:
        raise SystemExit("The inserted Powerdrome record does not match the reviewed source object")

    result = {
        "applied": True,
        "baseline_count": len(baseline_games),
        "current_count": len(current_games),
        "insertion_index": insertion_index,
        "existing_records_unchanged": True,
        "existing_record_hashes": {
            "before": hashlib.sha256("".join(stable_record_hash(game) for game in baseline_games).encode()).hexdigest(),
            "after": hashlib.sha256("".join(stable_record_hash(game) for game in without_new).encode()).hexdigest(),
        },
    }
    if evidence_path:
        evidence_path.parent.mkdir(parents=True, exist_ok=True)
        evidence_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return result


def anchor_count(html: str, href: str) -> int:
    pattern = re.compile(r'<a\b[^>]*\bhref=["\']' + re.escape(href) + r'["\']', re.I | re.S)
    return len(pattern.findall(html))


def schema_types(html: str) -> list[str]:
    match = re.search(
        r'<script\b[^>]*data-ccg-schema=["\']game-graph["\'][^>]*>(.*?)</script>',
        html,
        re.I | re.S,
    )
    if not match:
        return []
    payload = json.loads(match.group(1))
    graph = payload.get("@graph", []) if isinstance(payload, dict) else []
    return [str(node.get("@type")) for node in graph if isinstance(node, dict)]


def sitemap_count(path: Path, expected_url: str) -> int:
    count = 0
    root = ET.parse(path).getroot()
    for element in root.iter():
        if element.tag.endswith("loc") and (element.text or "").strip() == expected_url:
            count += 1
    return count


def validate_outputs(baseline_path: Path, link_evidence_path: Path, report_path: Path, evidence_path: Path) -> dict[str, Any]:
    baseline_games = load_json(baseline_path)
    current_games = load_json(GAMES_PATH)
    matches = [game for game in current_games if game.get("id") == ID or game.get("slug") == SLUG]
    without_new = [game for game in current_games if game.get("id") != ID]

    canonical_path = ROOT / "games" / SLUG / "index.html"
    redirect_path = ROOT / "games" / f"{SLUG}.html"
    canonical_html = canonical_path.read_text(encoding="utf-8") if canonical_path.exists() else ""
    redirect_html = redirect_path.read_text(encoding="utf-8") if redirect_path.exists() else ""
    href = f"/games/{SLUG}/"
    canonical_url = f"{SITE_URL}{href}"

    index_data = load_json(ROOT / "games" / "games-index.json")
    search_data = load_json(ROOT / "games" / "games-search.json")
    index_matches = [item for item in index_data if item.get("slug") == SLUG]
    search_matches = [item for item in search_data if item.get("slug") == SLUG]

    publisher_html = (ROOT / "games" / "publishers" / "electronic-arts" / "index.html").read_text(encoding="utf-8")
    developer_html = (ROOT / "games" / "developers" / "michael-powell" / "index.html").read_text(encoding="utf-8")
    year_html = (ROOT / "games" / "years" / "1989" / "index.html").read_text(encoding="utf-8")
    platform_html = (ROOT / "games" / "platforms" / "amiga" / "index.html").read_text(encoding="utf-8")
    downloads_html = (ROOT / "games" / "downloads" / "index.html").read_text(encoding="utf-8")
    link_evidence = load_json(link_evidence_path)
    link_summary = link_evidence.get("summary", {})

    checks = {
        "catalogue_incremented_once": len(current_games) == len(baseline_games) + 1,
        "existing_records_unchanged": without_new == baseline_games,
        "reviewed_record_once": matches == [RECORD],
        "temporary_thumbnail_is_jpeg": THUMBNAIL_PATH.exists() and THUMBNAIL_PATH.read_bytes().startswith(b"\xff\xd8\xff"),
        "canonical_wrapper_created": canonical_path.exists(),
        "legacy_redirect_created": redirect_path.exists(),
        "canonical_url_owned": f'href="{canonical_url}"' in canonical_html,
        "videogame_schema_once": schema_types(canonical_html).count("VideoGame") == 1,
        "breadcrumb_schema_once": schema_types(canonical_html).count("BreadcrumbList") == 1,
        "blank_video_does_not_invent_embed": "youtube.com/embed/" not in canonical_html,
        "legacy_redirect_noindex": 'content="noindex,follow"' in redirect_html,
        "legacy_redirect_targets_canonical": f'/games/{SLUG}/' in redirect_html,
        "games_index_once": len(index_matches) == 1,
        "games_search_once": len(search_matches) == 1,
        "publisher_archive_once": anchor_count(publisher_html, href) == 1,
        "developer_archive_once": anchor_count(developer_html, href) == 1,
        "year_archive_once": anchor_count(year_html, href) == 1,
        "amiga_archive_once": anchor_count(platform_html, href) == 1,
        "not_in_downloads_without_disk": anchor_count(downloads_html, href) == 0,
        "sitemap_once": sitemap_count(ROOT / "sitemap-games.xml", canonical_url) == 1,
        "zero_broken_links": link_summary.get("broken_internal_link_edges") == 0,
        "zero_indexable_orphans": link_summary.get("orphan_indexable_pages") == 0,
        "all_games_discoverable": link_summary.get("games_without_meaningful_static_discovery") == 0,
        "no_missing_game_routes": link_summary.get("canonical_game_pages_missing") == 0,
    }

    failures = [name for name, passed in checks.items() if not passed]
    evidence = {
        "candidate": {
            "title": RECORD["title"],
            "system": RECORD["system"],
            "year": RECORD["year"],
            "slug": RECORD["slug"],
            "rating_status": "unrated placeholder (0)",
            "video_status": "no dedicated video supplied",
            "thumbnail_status": "temporary owner-review asset from the CCG 1989 livestream",
        },
        "baseline_game_count": len(baseline_games),
        "current_game_count": len(current_games),
        "checks": checks,
        "passed": len(checks) - len(failures),
        "total": len(checks),
        "failures": failures,
    }
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")

    report = f"""# Phase 6C First Controlled Real Game Addition — Powerdrome

## Status

**Draft owner review only. Do not merge until the temporary thumbnail, CCG rating and dedicated video decision are approved.**

## Source record

- Game: **Powerdrome**
- Platform: **Commodore Amiga**
- Release year: **1989**
- Publisher: **Electronic Arts**
- Designer/programmer and developer credit: **Michael Powell**
- Genre: **Racing**
- Dedicated YouTube game video: **not supplied**
- CCG rating: **0 — unrated placeholder, not a verdict**
- Thumbnail: **temporary Phase 6C review asset derived from the CCG 1989 livestream thumbnail**
- Manual/download: **not supplied**

## Transaction result

- Existing records preserved: **{str(checks['existing_records_unchanged']).lower()}**
- Catalogue count: **{len(baseline_games)} → {len(current_games)}**
- Validation checks passed: **{evidence['passed']} / {evidence['total']}**
- Broken internal links: **{link_summary.get('broken_internal_link_edges')}**
- Indexable orphan pages: **{link_summary.get('orphan_indexable_pages')}**
- Games without meaningful discovery: **{link_summary.get('games_without_meaningful_static_discovery')}**

## Generated discovery

Powerdrome is verified in its canonical wrapper, legacy redirect, index/search data, Electronic Arts archive, Michael Powell developer archive, 1989 archive, Amiga archive and game sitemap. It is correctly absent from the downloads archive because no download URL was supplied.

## Owner decisions before merge

1. Approve or replace `resources/images/thumbnails/all/powerdrome_phase6c.jpg`.
2. Supply a CCG rating from 1–10, or explicitly approve retaining 0 as an unrated public state.
3. Supply a dedicated Powerdrome YouTube video ID, or explicitly approve publishing without a video.
4. Supply manual and download URLs only when verified and intended for public use.

## Safety

- No previous game object was edited or reordered.
- No existing game route was renamed or removed.
- No homepage or intro-loader file was changed.
- The publishing command was repeated and produced deterministic output.
- This pull request must remain unmerged until explicit approval.
"""
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")

    if failures:
        raise SystemExit("Phase 6C validation failed: " + ", ".join(failures))
    return evidence


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--validate", action="store_true")
    parser.add_argument("--baseline", required=True)
    parser.add_argument("--link-evidence")
    parser.add_argument("--evidence")
    parser.add_argument("--report")
    args = parser.parse_args()

    baseline = Path(args.baseline)
    if args.apply:
        result = apply_record(baseline, Path(args.evidence) if args.evidence else None)
        print(json.dumps(result, indent=2))
    if args.validate:
        if not args.link_evidence or not args.evidence or not args.report:
            raise SystemExit("--validate requires --link-evidence, --evidence and --report")
        result = validate_outputs(
            baseline,
            Path(args.link_evidence),
            Path(args.report),
            Path(args.evidence),
        )
        print(json.dumps(result, indent=2))
    if not args.apply and not args.validate:
        parser.error("choose --apply and/or --validate")


if __name__ == "__main__":
    main()
