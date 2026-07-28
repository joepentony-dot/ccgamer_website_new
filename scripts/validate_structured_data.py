#!/usr/bin/env python3
"""Validate static JSON-LD across public site HTML.

This is a non-mutating validation gate. It rejects empty JSON-LD blocks,
invalid JSON, unresolved template tokens and critical structural problems in
VideoObject, BreadcrumbList and VideoGame markup.
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime
from pathlib import Path

from phase0_site_audit import JSONLD_RE, ROOT, extract_tag_attr, included_html

PUBLIC_EXCLUDED_PREFIXES = ("templates/", "scripts/templates/", "resources/", "tools/")
ABSOLUTE_HTTP_RE = re.compile(r"^https?://", re.I)
TEMPLATE_TOKEN_RE = re.compile(r"{{[^{}]+}}")
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


def validate_video_object(obj: dict) -> list[str]:
    issues: list[str] = []
    for key in ("name", "thumbnailUrl", "uploadDate"):
        if not str(obj.get(key) or "").strip():
            issues.append(f"VideoObject missing required property: {key}")

    thumbnails = obj.get("thumbnailUrl")
    values = thumbnails if isinstance(thumbnails, list) else [thumbnails]
    if any(value and not is_absolute_http(value) for value in values):
        issues.append("VideoObject thumbnailUrl is not an absolute HTTP(S) URL")

    if obj.get("uploadDate") and not is_iso_datetime(obj.get("uploadDate")):
        issues.append("VideoObject uploadDate is not valid ISO 8601")

    if obj.get("duration") and not ISO_DURATION_RE.fullmatch(str(obj.get("duration")).strip()):
        issues.append("VideoObject duration is not valid ISO 8601 duration syntax")

    for key in ("contentUrl", "embedUrl", "url"):
        if obj.get(key) and not is_absolute_http(obj.get(key)):
            issues.append(f"VideoObject {key} is not an absolute HTTP(S) URL")

    return issues


def validate_breadcrumb(obj: dict) -> list[str]:
    issues: list[str] = []
    items = obj.get("itemListElement")
    if not isinstance(items, list) or len(items) < 2:
        return ["BreadcrumbList must contain at least two ListItem entries"]

    positions: list[int] = []
    for index, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            issues.append(f"Breadcrumb entry {index} is not an object")
            continue
        if "ListItem" not in schema_types(item.get("@type")):
            issues.append(f"Breadcrumb entry {index} is not a ListItem")
        if not str(item.get("name") or "").strip():
            issues.append(f"Breadcrumb entry {index} is missing name")
        position = item.get("position")
        if not isinstance(position, int) or position < 1:
            issues.append(f"Breadcrumb entry {index} has an invalid position")
        else:
            positions.append(position)
        if index < len(items):
            target = item.get("item")
            if not target:
                issues.append(f"Breadcrumb entry {index} is missing item")
            elif isinstance(target, str) and not is_absolute_http(target):
                issues.append(f"Breadcrumb entry {index} item is not an absolute HTTP(S) URL")

    if positions and positions != list(range(1, len(positions) + 1)):
        issues.append("Breadcrumb positions are not sequential from 1")
    return issues


def validate_video_game(obj: dict) -> list[str]:
    issues: list[str] = []
    if not str(obj.get("name") or "").strip():
        issues.append("VideoGame is missing name")
    if not str(obj.get("url") or "").strip():
        issues.append("VideoGame is missing url")
    elif not is_absolute_http(obj.get("url")):
        issues.append("VideoGame url is not an absolute HTTP(S) URL")
    if obj.get("datePublished") and not YEAR_OR_DATE_RE.fullmatch(str(obj.get("datePublished")).strip()):
        issues.append("VideoGame datePublished is not a year or ISO-style date")
    return issues


def audit_structured_data() -> dict:
    invalid: list[dict] = []
    empty: list[dict] = []
    unresolved_tokens: list[dict] = []
    structural: list[dict] = []
    typed_objects = 0
    blocks_checked = 0
    pages_checked = 0

    html_files = sorted(path for path in ROOT.rglob("*.html") if is_public_html(path))
    for path in html_files:
        pages_checked += 1
        relative = rel(path)
        html = path.read_text(encoding="utf-8", errors="ignore")
        canonical = extract_tag_attr(
            html, r"<link\b[^>]*rel\s*=\s*([\"'])canonical\1[^>]*>", "href"
        )

        for block_index, (_, raw_block) in enumerate(JSONLD_RE.findall(html), start=1):
            blocks_checked += 1
            block = raw_block.strip()
            if not block:
                empty.append({"file": relative, "block": block_index})
                continue
            tokens = TEMPLATE_TOKEN_RE.findall(block)
            if tokens:
                unresolved_tokens.append(
                    {"file": relative, "block": block_index, "tokens": sorted(set(tokens))}
                )
                continue
            try:
                payload = json.loads(block)
            except Exception as exc:
                invalid.append({"file": relative, "block": block_index, "error": str(exc)})
                continue

            for obj in flatten_schema(payload):
                object_types = schema_types(obj.get("@type"))
                typed_objects += len(object_types)
                issues: list[str] = []
                if "VideoObject" in object_types:
                    issues.extend(validate_video_object(obj))
                if "BreadcrumbList" in object_types:
                    issues.extend(validate_breadcrumb(obj))
                if "VideoGame" in object_types:
                    issues.extend(validate_video_game(obj))
                for issue in issues:
                    structural.append(
                        {
                            "file": relative,
                            "block": block_index,
                            "types": object_types,
                            "canonical": canonical,
                            "issue": issue,
                        }
                    )

    summary = {
        "public_html_pages": pages_checked,
        "jsonld_blocks": blocks_checked,
        "typed_jsonld_objects": typed_objects,
        "invalid_jsonld_blocks": len(invalid),
        "empty_jsonld_blocks": len(empty),
        "unresolved_template_blocks": len(unresolved_tokens),
        "critical_structural_issues": len(structural),
    }
    return {
        "summary": summary,
        "invalid_jsonld": invalid,
        "empty_jsonld": empty,
        "unresolved_templates": unresolved_tokens,
        "structural_issues": structural,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-output", type=Path)
    args = parser.parse_args()

    report = audit_structured_data()
    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print(json.dumps(report["summary"], indent=2))
    failures = (
        report["invalid_jsonld"]
        + report["empty_jsonld"]
        + report["unresolved_templates"]
        + report["structural_issues"]
    )
    if failures:
        print(json.dumps(failures[:50], indent=2, ensure_ascii=False))
        raise SystemExit(f"Structured-data validation failed with {len(failures)} issue(s).")


if __name__ == "__main__":
    main()
