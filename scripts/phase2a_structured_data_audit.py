#!/usr/bin/env python3
"""Read-only Phase 2A structured-data and metadata audit."""

from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path

from phase0_site_audit import (
    JSONLD_RE,
    ROOT,
    extract_tag_attr,
    extract_text,
    file_to_path,
    included_html,
    normalise_url_path,
)

OUTPUT_DIR = ROOT / "docs" / "seo-baseline"
JSON_PATH = OUTPUT_DIR / "phase-2a-structured-data.json"
MD_PATH = OUTPUT_DIR / "phase-2a-structured-data.md"
PUBLIC_EXCLUDED_PREFIXES = ("templates/", "scripts/templates/", "resources/", "tools/")
ABSOLUTE_HTTP_RE = re.compile(r"^https?://", re.I)
ISO_DURATION_RE = re.compile(
    r"^P(?=\d|T\d)(?:\d+Y)?(?:\d+M)?(?:\d+D)?"
    r"(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$"
)
YEAR_OR_DATE_RE = re.compile(r"^\d{4}(?:-\d{2}(?:-\d{2})?)?(?:T.*)?$")


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def is_public_html(path: Path) -> bool:
    relative = rel(path)
    return included_html(path) and not relative.startswith(PUBLIC_EXCLUDED_PREFIXES)


def is_absolute_http(value: object) -> bool:
    return bool(ABSOLUTE_HTTP_RE.match(str(value or "").strip()))


def is_iso_datetime(value: object) -> bool:
    text = str(value or "").strip()
    if not text:
        return False
    try:
        datetime.fromisoformat(text.replace("Z", "+00:00"))
        return True
    except ValueError:
        return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", text))


def schema_types(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    text = str(value or "").strip()
    return [text] if text else []


def flatten_schema(payload: object) -> list[dict]:
    objects: list[dict] = []
    queue: list[object] = payload if isinstance(payload, list) else [payload]
    while queue:
        item = queue.pop(0)
        if not isinstance(item, dict):
            continue
        objects.append(item)
        graph = item.get("@graph")
        if isinstance(graph, list):
            queue.extend(graph)
    return objects


def extract_meta(html: str, *, property_name: str = "", name: str = "") -> str:
    if property_name:
        pattern = rf"<meta\b[^>]*property\s*=\s*([\"']){re.escape(property_name)}\1[^>]*>"
    else:
        pattern = rf"<meta\b[^>]*name\s*=\s*([\"']){re.escape(name)}\1[^>]*>"
    return extract_tag_attr(html, pattern, "content")


def validate_video_object(obj: dict, canonical: str) -> tuple[list[str], list[str]]:
    critical: list[str] = []
    warnings: list[str] = []
    for key in ("name", "thumbnailUrl", "uploadDate"):
        if not obj.get(key):
            critical.append(f"missing required VideoObject property: {key}")

    thumbnails = obj.get("thumbnailUrl")
    values = thumbnails if isinstance(thumbnails, list) else [thumbnails]
    if any(value and not is_absolute_http(value) for value in values):
        critical.append("VideoObject thumbnailUrl is not an absolute HTTP(S) URL")
    if obj.get("uploadDate") and not is_iso_datetime(obj.get("uploadDate")):
        critical.append("VideoObject uploadDate is not valid ISO 8601")
    if obj.get("duration") and not ISO_DURATION_RE.fullmatch(str(obj.get("duration")).strip()):
        warnings.append("VideoObject duration is not valid ISO 8601 duration syntax")
    if not obj.get("description"):
        warnings.append("VideoObject description is missing")
    if not obj.get("contentUrl") and not obj.get("embedUrl"):
        warnings.append("VideoObject has neither contentUrl nor embedUrl")
    for key in ("contentUrl", "embedUrl", "url"):
        if obj.get(key) and not is_absolute_http(obj.get(key)):
            warnings.append(f"VideoObject {key} is not an absolute HTTP(S) URL")
    if canonical and obj.get("url"):
        if normalise_url_path(str(obj.get("url"))) != normalise_url_path(canonical):
            warnings.append("VideoObject url does not match the page canonical")
    return critical, warnings


def validate_breadcrumb(obj: dict) -> tuple[list[str], list[str]]:
    critical: list[str] = []
    warnings: list[str] = []
    items = obj.get("itemListElement")
    if not isinstance(items, list) or len(items) < 2:
        return ["BreadcrumbList must contain at least two ListItem entries"], warnings

    valid_positions: list[int] = []
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            critical.append(f"Breadcrumb entry {index + 1} is not an object")
            continue
        if "ListItem" not in schema_types(item.get("@type")):
            critical.append(f"Breadcrumb entry {index + 1} is not a ListItem")
        if not str(item.get("name") or "").strip():
            critical.append(f"Breadcrumb entry {index + 1} is missing name")
        position = item.get("position")
        if not isinstance(position, int) or position < 1:
            critical.append(f"Breadcrumb entry {index + 1} has an invalid position")
        else:
            valid_positions.append(position)
        if index < len(items) - 1:
            target = item.get("item")
            if not target:
                critical.append(f"Breadcrumb entry {index + 1} is missing item")
            elif isinstance(target, str) and not is_absolute_http(target):
                warnings.append(f"Breadcrumb entry {index + 1} item is not an absolute URL")

    if valid_positions and valid_positions != list(range(1, len(valid_positions) + 1)):
        critical.append("Breadcrumb positions are not sequential from 1")
    return critical, warnings


def validate_video_game(obj: dict, canonical: str) -> tuple[list[str], list[str]]:
    critical: list[str] = []
    warnings: list[str] = []
    for key in ("name", "url"):
        if not obj.get(key):
            critical.append(f"VideoGame is missing {key}")
    if obj.get("url") and not is_absolute_http(obj.get("url")):
        critical.append("VideoGame url is not an absolute HTTP(S) URL")
    if canonical and obj.get("url"):
        if normalise_url_path(str(obj.get("url"))) != normalise_url_path(canonical):
            warnings.append("VideoGame url does not match the page canonical")
    if not obj.get("description"):
        warnings.append("VideoGame description is missing")
    if not obj.get("gamePlatform"):
        warnings.append("VideoGame gamePlatform is missing")
    if obj.get("datePublished") and not YEAR_OR_DATE_RE.fullmatch(str(obj.get("datePublished")).strip()):
        warnings.append("VideoGame datePublished is not a year or ISO-style date")
    if obj.get("author") and obj.get("publisher") and obj.get("author") == obj.get("publisher"):
        warnings.append(
            "VideoGame author duplicates publisher; authorship should represent the creator, not automatically the publisher"
        )
    aggregate = obj.get("aggregateRating")
    if isinstance(aggregate, dict) and str(aggregate.get("ratingCount") or "").strip() == "1":
        warnings.append(
            "AggregateRating uses ratingCount 1; a single editorial score should usually be represented as Review instead"
        )
    return critical, warnings


def load_games() -> list[dict]:
    payload = json.loads((ROOT / "games" / "games.json").read_text(encoding="utf-8"))
    return payload if isinstance(payload, list) else payload.get("games", [])


def main() -> None:
    games = load_games()
    active_slugs = {str(game.get("slug") or "").strip() for game in games if str(game.get("slug") or "").strip()}
    canonical_game_files = {f"games/{slug}/index.html" for slug in active_slugs}
    html_files = sorted(path for path in ROOT.rglob("*.html") if is_public_html(path))

    pages: list[dict] = []
    type_counter: Counter[str] = Counter()
    invalid_blocks: list[dict] = []
    empty_blocks: list[dict] = []
    schema_critical: list[dict] = []
    schema_warnings: list[dict] = []
    metadata_issues: list[dict] = []
    indexable_game_pages = 0
    indexable_game_pages_with_jsonld = 0

    for path in html_files:
        html = path.read_text(encoding="utf-8", errors="ignore")
        relative = rel(path)
        robots = extract_meta(html, name="robots")
        indexable = "noindex" not in robots.lower()
        canonical = extract_tag_attr(
            html, r"<link\b[^>]*rel\s*=\s*([\"'])canonical\1[^>]*>", "href"
        )
        title = extract_text(r"<title[^>]*>(.*?)</title>", html)
        description = extract_meta(html, name="description")
        og_url = extract_meta(html, property_name="og:url")
        og_title = extract_meta(html, property_name="og:title")
        og_description = extract_meta(html, property_name="og:description")
        og_image = extract_meta(html, property_name="og:image")
        twitter_card = extract_meta(html, name="twitter:card")

        page_objects: list[dict] = []
        blocks = JSONLD_RE.findall(html)
        for block_index, (_, raw_block) in enumerate(blocks, start=1):
            block = raw_block.strip()
            if not block:
                empty_blocks.append({"file": relative, "block": block_index})
                continue
            try:
                page_objects.extend(flatten_schema(json.loads(block)))
            except Exception as exc:
                invalid_blocks.append({"file": relative, "block": block_index, "error": str(exc)})

        page_types: list[str] = []
        for obj in page_objects:
            object_types = schema_types(obj.get("@type"))
            page_types.extend(object_types)
            type_counter.update(object_types)
            critical: list[str] = []
            warnings: list[str] = []
            if "VideoObject" in object_types:
                critical, warnings = validate_video_object(obj, canonical)
            elif "BreadcrumbList" in object_types:
                critical, warnings = validate_breadcrumb(obj)
            elif "VideoGame" in object_types:
                critical, warnings = validate_video_game(obj, canonical)
            schema_critical.extend(
                {"file": relative, "type": object_types, "issue": issue} for issue in critical
            )
            schema_warnings.extend(
                {"file": relative, "type": object_types, "issue": issue} for issue in warnings
            )

        if indexable:
            if canonical and not is_absolute_http(canonical):
                metadata_issues.append({"file": relative, "issue": "canonical is not an absolute HTTP(S) URL"})
            if og_url and canonical and normalise_url_path(og_url) != normalise_url_path(canonical):
                metadata_issues.append({"file": relative, "issue": "og:url does not match canonical"})
            if og_image and not is_absolute_http(og_image):
                metadata_issues.append({"file": relative, "issue": "og:image is not an absolute HTTP(S) URL"})
            if og_title and title and og_title != title:
                metadata_issues.append({"file": relative, "issue": "og:title differs from HTML title"})
            if og_description and description and og_description != description:
                metadata_issues.append({"file": relative, "issue": "og:description differs from meta description"})
            if og_image and not twitter_card:
                metadata_issues.append({"file": relative, "issue": "Open Graph image exists but twitter:card is missing"})

        if indexable and relative in canonical_game_files:
            indexable_game_pages += 1
            if page_objects:
                indexable_game_pages_with_jsonld += 1

        pages.append(
            {
                "file": relative,
                "url_path": file_to_path(path),
                "indexable": indexable,
                "canonical": canonical,
                "title": title,
                "schema_types": sorted(set(page_types)),
                "jsonld_blocks": len(blocks),
                "parsed_schema_objects": len(page_objects),
            }
        )

    video_data = {
        "game_records": len(games),
        "games_with_video_id": 0,
        "games_with_upload_date": 0,
        "games_with_duration": 0,
    }
    for game in games:
        if str(game.get("videoId") or game.get("videoid") or "").strip():
            video_data["games_with_video_id"] += 1
        if str(game.get("videoUploadDate") or game.get("uploadDate") or "").strip():
            video_data["games_with_upload_date"] += 1
        if str(game.get("videoDuration") or game.get("duration") or "").strip():
            video_data["games_with_duration"] += 1

    generator = (ROOT / "scripts" / "generate-slug-pages.js").read_text(encoding="utf-8")
    canonical_template = generator.split("function buildCanonicalHtml", 1)[-1].split(
        "function writeTextFileIfChanged", 1
    )[0]
    generator_findings = {
        "defines_video_game_builder": "function buildVideoGameSchema" in generator,
        "defines_video_object_builder": "function buildVideoObjectSchema" in generator,
        "defines_breadcrumb_builder": "function buildBreadcrumbSchema" in generator,
        "video_game_builder_call_count": generator.count("buildVideoGameSchema("),
        "video_object_builder_call_count": generator.count("buildVideoObjectSchema("),
        "breadcrumb_builder_call_count": generator.count("buildBreadcrumbSchema("),
        "canonical_template_contains_jsonld": "application/ld+json" in canonical_template,
    }

    summary = {
        "html_pages_audited": len(pages),
        "indexable_pages": sum(1 for page in pages if page["indexable"]),
        "jsonld_objects": sum(type_counter.values()),
        "invalid_jsonld_blocks": len(invalid_blocks),
        "empty_jsonld_placeholders": len(empty_blocks),
        "schema_critical_issues": len(schema_critical),
        "schema_warnings": len(schema_warnings),
        "metadata_consistency_issues": len(metadata_issues),
        "pages_with_video_object": sum(1 for page in pages if "VideoObject" in page["schema_types"]),
        "video_object_required_property_gaps": sum(
            1 for item in schema_critical if "VideoObject" in item["type"]
        ),
        "breadcrumb_critical_issues": sum(
            1 for item in schema_critical if "BreadcrumbList" in item["type"]
        ),
        "indexable_game_pages": indexable_game_pages,
        "indexable_game_pages_with_static_jsonld": indexable_game_pages_with_jsonld,
    }

    findings = {
        "summary": summary,
        "schema_type_inventory": dict(type_counter.most_common()),
        "generator_findings": generator_findings,
        "video_data_availability": video_data,
        "invalid_jsonld": invalid_blocks,
        "empty_jsonld_placeholders": empty_blocks,
        "schema_critical": schema_critical,
        "schema_warnings": schema_warnings,
        "metadata_issues": metadata_issues,
        "pages": pages,
        "audit_rules": {
            "VideoObject": "Google-required name, thumbnailUrl and uploadDate; absolute media URLs and valid dates checked.",
            "BreadcrumbList": "At least two ordered ListItem entries with names, positions and navigable items.",
            "VideoGame": "Schema.org structural and semantic consistency; not treated as a guaranteed Google rich-result type.",
        },
        "limitations": [
            "This is a repository-static audit and does not execute client-side JavaScript.",
            "External URLs and YouTube metadata were not requested over the network.",
            "Rich Results Test and Search Console validation remain deployment-stage checks.",
        ],
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    JSON_PATH.write_text(json.dumps(findings, indent=2, ensure_ascii=False), encoding="utf-8")

    labels = {
        "html_pages_audited": "Public HTML pages audited",
        "indexable_pages": "Indexable pages",
        "jsonld_objects": "Typed JSON-LD objects",
        "invalid_jsonld_blocks": "Invalid JSON-LD blocks",
        "empty_jsonld_placeholders": "Empty JSON-LD placeholders",
        "schema_critical_issues": "Critical schema issues",
        "schema_warnings": "Schema warnings",
        "metadata_consistency_issues": "Metadata consistency issues",
        "pages_with_video_object": "Pages containing VideoObject",
        "video_object_required_property_gaps": "VideoObject required-property gaps",
        "breadcrumb_critical_issues": "Breadcrumb critical issues",
        "indexable_game_pages": "Indexable canonical game pages",
        "indexable_game_pages_with_static_jsonld": "Canonical game pages with static JSON-LD",
    }
    md = [
        "# Phase 2A Structured-Data and Metadata Review",
        "",
        "This is a read-only repository audit. It does not alter public pages, game data, sitemaps or generators.",
        "",
        "## Executive summary",
        "",
        "| Check | Count |",
        "|---|---:|",
    ]
    md.extend(f"| {label} | **{summary[key]}** |" for key, label in labels.items())
    md.extend(["", "## Schema type inventory", ""])
    if type_counter:
        md.extend(f"- `{schema_type}`: **{count}**" for schema_type, count in type_counter.most_common())
    else:
        md.append("No typed static JSON-LD objects were detected.")

    md.extend(
        [
            "",
            "## Generator findings",
            "",
            f"- `generate-slug-pages.js` defines a VideoGame builder: **{generator_findings['defines_video_game_builder']}**",
            f"- It defines a VideoObject builder: **{generator_findings['defines_video_object_builder']}**",
            f"- It defines a BreadcrumbList builder: **{generator_findings['defines_breadcrumb_builder']}**",
            f"- VideoGame builder occurrences: **{generator_findings['video_game_builder_call_count']}**",
            f"- VideoObject builder occurrences: **{generator_findings['video_object_builder_call_count']}**",
            f"- Breadcrumb builder occurrences: **{generator_findings['breadcrumb_builder_call_count']}**",
            f"- Canonical game wrapper template contains static JSON-LD: **{generator_findings['canonical_template_contains_jsonld']}**",
            "",
            "A call count of one means the function is defined but not called elsewhere in that file.",
            "",
            "## Video metadata availability in games.json",
            "",
            f"- Game records: **{video_data['game_records']}**",
            f"- Games with a video ID: **{video_data['games_with_video_id']}**",
            f"- Games with a stored upload date: **{video_data['games_with_upload_date']}**",
            f"- Games with a stored duration: **{video_data['games_with_duration']}**",
            "",
            "VideoObject markup must not invent upload dates or durations. Records lacking those fields require verified enrichment or omission of VideoObject until the required data is available.",
            "",
            "## Recommended correction batches",
            "",
            "1. **Phase 2B — schema validity:** fix invalid blocks and empty placeholders; add permanent validation gates.",
            "2. **Phase 2C — canonical game schema:** connect the existing VideoGame and Breadcrumb builders to canonical game output, using a single maintainable `@graph`.",
            "3. **Phase 2D — video eligibility:** emit VideoObject only where a verified upload date exists; then add duration where verified.",
            "4. **Phase 2E — metadata consistency:** align canonical, Open Graph and Twitter fields without rewriting page content.",
            "",
            "## Priority samples",
            "",
            "### Invalid JSON-LD",
            "",
        ]
    )
    if invalid_blocks:
        md.extend(
            f"- `{item['file']}` block {item['block']}: {item['error']}"
            for item in invalid_blocks[:20]
        )
    else:
        md.append("None detected.")

    md.extend(["", "### Critical schema issues", ""])
    if schema_critical:
        md.extend(f"- `{item['file']}` — {item['issue']}" for item in schema_critical[:30])
        if len(schema_critical) > 30:
            md.append(f"- …and {len(schema_critical) - 30} more in the JSON artifact")
    else:
        md.append("None detected.")

    md.extend(["", "### Metadata consistency issues", ""])
    if metadata_issues:
        md.extend(f"- `{item['file']}` — {item['issue']}" for item in metadata_issues[:30])
        if len(metadata_issues) > 30:
            md.append(f"- …and {len(metadata_issues) - 30} more in the JSON artifact")
    else:
        md.append("None detected.")

    md.extend(
        [
            "",
            "## Explicit exclusions",
            "",
            "- No public HTML was changed.",
            "- `games/games.json` was not changed.",
            "- The intro-loader stack was not changed.",
            "- No schema was added merely to increase counts.",
            "- No dates, durations, ratings or authorship facts were invented.",
            "",
            "## Rollback",
            "",
            "Revert the Phase 2A squash merge commit. The PR adds only the audit tooling, workflow and concise report.",
            "",
        ]
    )
    MD_PATH.write_text("\n".join(md), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
