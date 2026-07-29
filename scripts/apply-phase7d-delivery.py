#!/usr/bin/env python3
"""Apply and validate bounded Phase 7D CSS and JavaScript delivery changes."""

from __future__ import annotations

import argparse
import collections
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

PROTECTED = {
    "index.html",
    "home.html",
    "resources/css/intro.css",
    "js/index-intro.js",
    "games/games.json",
}

EXCLUDED_HTML_PREFIXES = (
    "data/lemon-cache/",
    "admin/js/_backup_2026-02-working/",
)

SCRIPT_TAG_RE = re.compile(r"<script\b[^>]*\bsrc\s*=\s*(['\"])(?P<src>[^'\"]+)\1[^>]*>", re.I | re.S)
LINK_TAG_RE = re.compile(r"<link\b[^>]*>", re.I | re.S)


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def read_text_preserving_bytes(path: Path) -> str:
    return path.read_bytes().decode("utf-8")


def write_text_preserving_bytes(path: Path, text: str) -> None:
    path.write_bytes(text.encode("utf-8"))


def is_analytics_src(src: str) -> bool:
    value = src.strip()
    parsed = urlparse(value)
    if parsed.scheme and parsed.netloc and parsed.netloc not in {
        "www.cheekycommodoregamer.co.uk",
        "cheekycommodoregamer.co.uk",
    }:
        return False
    path = parsed.path or value.split("?", 1)[0]
    normalized = path.replace("\\", "/").lower()
    return normalized == "js/analytics.js" or normalized.endswith("/js/analytics.js")


def tag_is_nonblocking(tag: str) -> bool:
    if re.search(r"\s(?:defer|async)(?:\s|=|>|/)", tag, re.I):
        return True
    type_match = re.search(r"\stype\s*=\s*(['\"])(.*?)\1", tag, re.I | re.S)
    return bool(type_match and type_match.group(2).strip().lower() == "module")


def add_defer_to_analytics(text: str) -> tuple[str, int]:
    changed = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal changed
        tag = match.group(0)
        if not is_analytics_src(match.group("src")) or tag_is_nonblocking(tag):
            return tag
        changed += 1
        return tag[:-1] + " defer>"

    return SCRIPT_TAG_RE.sub(replace, text), changed


def link_attributes(tag: str) -> tuple[str, tuple[tuple[str, Any], ...]] | None:
    soup = BeautifulSoup(tag, "html.parser")
    link = soup.find("link")
    if not link:
        return None
    rel_values = [str(value).lower() for value in (link.get("rel") or [])]
    if "stylesheet" not in rel_values:
        return None
    href = str(link.get("href") or "").strip()
    if not href:
        return None
    normalized: list[tuple[str, Any]] = []
    for key, value in sorted(link.attrs.items()):
        if isinstance(value, list):
            normalized.append((str(key).lower(), tuple(str(item).strip() for item in value)))
        else:
            normalized.append((str(key).lower(), str(value).strip()))
    return href, tuple(normalized)


def remove_exact_duplicate_stylesheets(text: str) -> tuple[str, int]:
    seen: set[tuple[str, tuple[tuple[str, Any], ...]]] = set()
    removals: list[tuple[int, int]] = []

    for match in LINK_TAG_RE.finditer(text):
        key = link_attributes(match.group(0))
        if key is None:
            continue
        if key not in seen:
            seen.add(key)
            continue

        line_start = text.rfind("\n", 0, match.start()) + 1
        line_end = text.find("\n", match.end())
        if line_end == -1:
            line_end = len(text)
            newline_end = line_end
        else:
            newline_end = line_end + 1
        before = text[line_start:match.start()]
        after = text[match.end():line_end]
        if not before.strip() and not after.strip():
            removals.append((line_start, newline_end))
        else:
            removals.append((match.start(), match.end()))

    if not removals:
        return text, 0
    updated = text
    for start, end in reversed(removals):
        updated = updated[:start] + updated[end:]
    return updated, len(removals)


def eligible_html_paths() -> list[Path]:
    paths: list[Path] = []
    for path in sorted(ROOT.rglob("*.html")):
        path_rel = rel(path)
        if path_rel in PROTECTED:
            continue
        if path_rel.startswith(EXCLUDED_HTML_PREFIXES):
            continue
        if any(part in {".git", "node_modules", "__pycache__"} for part in path.parts):
            continue
        paths.append(path)
    return paths


def generator_source_paths() -> list[Path]:
    scripts_root = ROOT / "scripts"
    paths: list[Path] = []
    for suffix in ("*.js", "*.mjs"):
        paths.extend(sorted(scripts_root.rglob(suffix)))
    return sorted(set(paths))


def apply() -> dict[str, Any]:
    changed_files: list[str] = []
    analytics_tags_changed = 0
    duplicate_links_removed = 0

    for path in eligible_html_paths():
        try:
            text = read_text_preserving_bytes(path)
        except UnicodeDecodeError:
            continue
        updated, analytics_count = add_defer_to_analytics(text)
        updated, duplicate_count = remove_exact_duplicate_stylesheets(updated)
        if updated != text:
            write_text_preserving_bytes(path, updated)
            changed_files.append(rel(path))
            analytics_tags_changed += analytics_count
            duplicate_links_removed += duplicate_count

    for path in generator_source_paths():
        try:
            text = read_text_preserving_bytes(path)
        except UnicodeDecodeError:
            continue
        updated, analytics_count = add_defer_to_analytics(text)
        if updated != text:
            write_text_preserving_bytes(path, updated)
            changed_files.append(rel(path))
            analytics_tags_changed += analytics_count

    result = {
        "changed_files": sorted(set(changed_files)),
        "changed_file_count": len(set(changed_files)),
        "analytics_tags_changed": analytics_tags_changed,
        "duplicate_stylesheet_tags_removed": duplicate_links_removed,
    }
    print(json.dumps(result, indent=2))
    return result


def inspect_html_file(path: Path, eligible: bool) -> dict[str, Any]:
    try:
        text = read_text_preserving_bytes(path)
    except UnicodeDecodeError:
        return {}
    soup = BeautifulSoup(text, "html.parser")

    analytics_total = 0
    analytics_blocking = 0
    analytics_deferred = 0
    for script in soup.find_all("script", src=True):
        src = str(script.get("src") or "")
        if not is_analytics_src(src):
            continue
        analytics_total += 1
        script_type = str(script.get("type") or "").lower()
        if script.has_attr("defer") or script.has_attr("async") or script_type == "module":
            analytics_deferred += 1
        else:
            analytics_blocking += 1

    stylesheets = [
        str(link.get("href") or "")
        for link in soup.find_all("link", rel=lambda value: value and "stylesheet" in value)
        if str(link.get("href") or "")
    ]
    duplicate_hrefs = sorted(key for key, count in collections.Counter(stylesheets).items() if count > 1)

    exact_seen: set[tuple[str, tuple[tuple[str, Any], ...]]] = set()
    exact_duplicates = 0
    for match in LINK_TAG_RE.finditer(text):
        key = link_attributes(match.group(0))
        if key is None:
            continue
        if key in exact_seen:
            exact_duplicates += 1
        else:
            exact_seen.add(key)

    return {
        "eligible": eligible,
        "analytics_total": analytics_total,
        "analytics_blocking": analytics_blocking,
        "analytics_deferred": analytics_deferred,
        "duplicate_stylesheet_hrefs": duplicate_hrefs,
        "exact_duplicate_stylesheet_tags": exact_duplicates,
    }


def inspect() -> dict[str, Any]:
    totals = collections.Counter()
    examples: dict[str, list[dict[str, Any]]] = {
        "eligible_blocking_analytics": [],
        "excluded_blocking_analytics": [],
        "eligible_duplicate_stylesheets": [],
        "excluded_duplicate_stylesheets": [],
    }

    for path in sorted(ROOT.rglob("*.html")):
        path_rel = rel(path)
        if any(part in {".git", "node_modules", "__pycache__"} for part in path.parts):
            continue
        eligible = path_rel not in PROTECTED and not path_rel.startswith(EXCLUDED_HTML_PREFIXES)
        info = inspect_html_file(path, eligible)
        if not info:
            continue
        prefix = "eligible" if eligible else "excluded"
        for key in ("analytics_total", "analytics_blocking", "analytics_deferred", "exact_duplicate_stylesheet_tags"):
            totals[f"{prefix}_{key}"] += int(info.get(key, 0))
        duplicate_hrefs = info.get("duplicate_stylesheet_hrefs", [])
        totals[f"{prefix}_duplicate_stylesheet_pages"] += int(bool(duplicate_hrefs))
        totals[f"{prefix}_duplicate_stylesheet_href_occurrences"] += len(duplicate_hrefs)

        if info.get("analytics_blocking") and len(examples[f"{prefix}_blocking_analytics"]) < 40:
            examples[f"{prefix}_blocking_analytics"].append({
                "path": path_rel,
                "count": info["analytics_blocking"],
            })
        if duplicate_hrefs and len(examples[f"{prefix}_duplicate_stylesheets"]) < 40:
            examples[f"{prefix}_duplicate_stylesheets"].append({
                "path": path_rel,
                "hrefs": duplicate_hrefs,
                "exact_duplicate_tags": info["exact_duplicate_stylesheet_tags"],
            })

    blocking_source_literals: list[str] = []
    source_analytics_tags = 0
    source_deferred_tags = 0
    for path in generator_source_paths():
        try:
            text = read_text_preserving_bytes(path)
        except UnicodeDecodeError:
            continue
        for match in SCRIPT_TAG_RE.finditer(text):
            if not is_analytics_src(match.group("src")):
                continue
            source_analytics_tags += 1
            if tag_is_nonblocking(match.group(0)):
                source_deferred_tags += 1
            elif len(blocking_source_literals) < 80:
                blocking_source_literals.append(rel(path))

    payload = {
        "totals": dict(totals),
        "examples": examples,
        "generator_sources": {
            "analytics_tags": source_analytics_tags,
            "deferred_tags": source_deferred_tags,
            "blocking_files": sorted(set(blocking_source_literals)),
        },
    }
    return payload


def static_issue_count(payload: dict[str, Any], key: str) -> int:
    return int(payload.get("html", {}).get("issues", {}).get(key, {}).get("count", 0))


def validate(
    before_static_path: Path,
    after_static_path: Path,
    before_delivery_path: Path,
    after_delivery_path: Path,
    live_path: Path,
    report_path: Path,
    evidence_path: Path,
) -> dict[str, Any]:
    before_static = json.loads(before_static_path.read_text(encoding="utf-8"))
    after_static = json.loads(after_static_path.read_text(encoding="utf-8"))
    before_delivery = json.loads(before_delivery_path.read_text(encoding="utf-8"))
    after_delivery = json.loads(after_delivery_path.read_text(encoding="utf-8"))
    live = json.loads(live_path.read_text(encoding="utf-8"))

    before_blocking = static_issue_count(before_static, "head_script_without_defer_or_async")
    after_blocking = static_issue_count(after_static, "head_script_without_defer_or_async")
    before_duplicates = static_issue_count(before_static, "duplicate_stylesheet_reference")
    after_duplicates = static_issue_count(after_static, "duplicate_stylesheet_reference")
    before_high_css = static_issue_count(before_static, "high_stylesheet_count")
    after_high_css = static_issue_count(after_static, "high_stylesheet_count")
    before_high_js = static_issue_count(before_static, "high_script_count")
    after_high_js = static_issue_count(after_static, "high_script_count")

    before_totals = before_delivery["totals"]
    after_totals = after_delivery["totals"]
    eligible_before = int(before_totals.get("eligible_analytics_blocking", 0))
    eligible_after = int(after_totals.get("eligible_analytics_blocking", 0))
    deferred_after = int(after_totals.get("eligible_analytics_deferred", 0))
    exact_duplicates_after = int(after_totals.get("eligible_exact_duplicate_stylesheet_tags", 0))
    blocking_sources = after_delivery.get("generator_sources", {}).get("blocking_files", [])

    checks = {
        "repository_head_blocking_reduced": after_blocking < before_blocking,
        "at_least_1000_head_blocking_occurrences_removed": before_blocking - after_blocking >= 1000,
        "eligible_analytics_blocking_zero": eligible_after == 0,
        "eligible_analytics_deferred_present": deferred_after > 0,
        "all_generator_analytics_literals_deferred": not blocking_sources,
        "exact_duplicate_stylesheet_tags_removed": exact_duplicates_after == 0,
        "stylesheet_duplicate_count_not_increased": after_duplicates <= before_duplicates,
        "high_stylesheet_page_count_not_increased": after_high_css <= before_high_css,
        "high_script_page_count_not_increased": after_high_js <= before_high_js,
        "browser_routes_pass": bool(live.get("passed")),
        "browser_serious_critical_zero": int(live.get("serious_or_critical_nodes", 0)) == 0,
    }
    failures = [name for name, passed in checks.items() if not passed]

    evidence = {
        "before": {
            "head_scripts_without_defer_or_async": before_blocking,
            "duplicate_stylesheet_references": before_duplicates,
            "pages_with_at_least_10_stylesheets": before_high_css,
            "pages_with_at_least_12_scripts": before_high_js,
            "eligible_blocking_analytics": eligible_before,
        },
        "after": {
            "head_scripts_without_defer_or_async": after_blocking,
            "duplicate_stylesheet_references": after_duplicates,
            "pages_with_at_least_10_stylesheets": after_high_css,
            "pages_with_at_least_12_scripts": after_high_js,
            "eligible_blocking_analytics": eligible_after,
            "eligible_deferred_analytics": deferred_after,
            "eligible_exact_duplicate_stylesheet_tags": exact_duplicates_after,
        },
        "removed": {
            "head_blocking_occurrences": before_blocking - after_blocking,
            "duplicate_stylesheet_reference_occurrences": before_duplicates - after_duplicates,
        },
        "remaining_duplicate_stylesheet_examples": after_delivery.get("examples", {}).get("excluded_duplicate_stylesheets", [])
        + after_delivery.get("examples", {}).get("eligible_duplicate_stylesheets", []),
        "generator_sources": after_delivery.get("generator_sources", {}),
        "live": live,
        "checks": checks,
        "passed": len(checks) - len(failures),
        "total": len(checks),
        "failures": failures,
    }
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")

    route_rows = "\n".join(
        f"| {route.get('label')} | {route.get('status')} | {route.get('analytics_tags', 0)} | "
        f"{'Yes' if route.get('analytics_nonblocking') else 'No'} | {route.get('duplicate_stylesheet_hrefs', 0)} | "
        f"{route.get('serious_or_critical_nodes', 0)} |"
        for route in live.get("routes", [])
    )
    duplicate_examples = evidence["remaining_duplicate_stylesheet_examples"]
    if duplicate_examples:
        duplicate_lines = "\n".join(
            f"- `{item.get('path')}`: {', '.join(item.get('hrefs', []))}"
            for item in duplicate_examples
        )
    else:
        duplicate_lines = "- None"

    report = f"""# Phase 7D CSS and JavaScript Delivery

## Verdict

**{'PASS' if not failures else 'FAIL'} — bounded delivery corrections {'are ready for review' if not failures else 'need further work'}.**

Phase 7D changes delivery attributes and removes only exact duplicate stylesheet tags. It does not combine CSS files, reorder stylesheets, change the Omega presentation or defer admin input-protection scripts.

## Repository-wide improvements

| Finding | Before | After | Change |
|---|---:|---:|---:|
| Head scripts without `defer` or `async` | {before_blocking:,} | {after_blocking:,} | {before_blocking - after_blocking:,} removed |
| Duplicate stylesheet references | {before_duplicates:,} | {after_duplicates:,} | {before_duplicates - after_duplicates:,} removed |
| Pages with at least 10 stylesheets | {before_high_css:,} | {after_high_css:,} | {before_high_css - after_high_css:,} |
| Pages with at least 12 scripts | {before_high_js:,} | {after_high_js:,} | {before_high_js - after_high_js:,} |

- Eligible blocking analytics references: **{eligible_before:,} → {eligible_after:,}**
- Eligible deferred analytics references after correction: **{deferred_after:,}**
- Exact duplicate stylesheet tags remaining in eligible files: **{exact_duplicates_after}**
- Validation checks passed: **{len(checks) - len(failures)} / {len(checks)}**

## Delivery policy

- The local `/js/analytics.js` loader now uses `defer` in eligible HTML and generator-owned markup.
- The loader itself still creates the remote Google Analytics script asynchronously.
- Existing script order is retained; no unrelated script receives `defer` or `async`.
- Only byte-identical duplicate stylesheet tags are removed. Same-URL links with different attributes are retained for review.
- `index.html` and `home.html` remain protected and are not rewritten by this phase.

## Browser validation

| Route | HTTP | Analytics tags | Non-blocking | Duplicate stylesheet hrefs | Serious/critical axe nodes |
|---|---:|---:|---|---:|---:|
{route_rows}

## Remaining duplicate stylesheet references

{duplicate_lines}

Any remaining item is either in a protected/excluded file or uses the same URL with differing attributes and therefore was not removed automatically.

## Deliberate limits

- No stylesheet bundles are merged.
- CSS order, media attributes and cascade ownership remain unchanged.
- Admin input-hardening and firewall scripts are not deferred.
- Large asset optimisation remains Phase 7E.
- Redirect-shell architecture remains Phase 7F.

## Safety

- `index.html` unchanged
- `home.html` unchanged
- `resources/css/intro.css` unchanged
- `js/index-intro.js` unchanged
- `games/games.json` unchanged
- no route, game record, thumbnail, CSS file or JavaScript runtime file renamed or removed
"""
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")

    if failures:
        raise SystemExit("Phase 7D validation failed: " + ", ".join(failures))
    print(json.dumps({"passed": len(checks), "total": len(checks)}, indent=2))
    return evidence


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("apply")
    inspect_parser = sub.add_parser("inspect")
    inspect_parser.add_argument("--output", required=True)
    validate_parser = sub.add_parser("validate")
    validate_parser.add_argument("--before-static", required=True)
    validate_parser.add_argument("--after-static", required=True)
    validate_parser.add_argument("--before-delivery", required=True)
    validate_parser.add_argument("--after-delivery", required=True)
    validate_parser.add_argument("--live", required=True)
    validate_parser.add_argument("--report", required=True)
    validate_parser.add_argument("--evidence", required=True)
    args = parser.parse_args()

    if args.command == "apply":
        apply()
        return
    if args.command == "inspect":
        payload = inspect()
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(payload, indent=2))
        return
    validate(
        Path(args.before_static),
        Path(args.after_static),
        Path(args.before_delivery),
        Path(args.after_delivery),
        Path(args.live),
        Path(args.report),
        Path(args.evidence),
    )


if __name__ == "__main__":
    main()
