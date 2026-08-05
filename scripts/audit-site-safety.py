#!/usr/bin/env python3
"""Read-only CCG site safety audit.

The audit concentrates on hand-maintained and newly introduced experience files.
It deliberately avoids rewriting content and skips cache/generated bulk where a
separate archive audit already exists.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
PROTECTED = {
    "index.html",
    "resources/css/intro.css",
    "js/index-intro.js",
    "games/games.json",
}
SKIP_PARTS = {"node_modules", ".git", "data/lemon-cache", "reports", "dist"}
CRITICAL_PAGES = [
    "home.html",
    "games/index.html",
    "games/publishers/index.html",
    "games/compare/index.html",
    "games/discover/index.html",
    "zzap64/index.html",
    "community/profile.html",
]
REQUIRED_NEW_PAGES = {
    "games/compare/index.html": "/games/compare/",
    "games/discover/index.html": "/games/discover/",
    "zzap64/index.html": "/zzap64/",
}
TEXT_BUDGETS = {
    ".js": 350_000,
    ".css": 300_000,
    ".html": 1_500_000,
    ".json": 3_000_000,
}
ASSET_BUDGETS = {
    ".png": 8_000_000,
    ".jpg": 8_000_000,
    ".jpeg": 8_000_000,
    ".webp": 8_000_000,
    ".gif": 8_000_000,
    ".mp3": 15_000_000,
    ".mp4": 35_000_000,
}
CRITICAL_SCRIPTS = [
    "js/ccg-nav-core.js",
    "js/ccg-global-search.js",
    "js/ccg-search-ranking.js",
    "js/ccg-recently-viewed.js",
    "js/ccg-archive-shortcuts.js",
    "js/ccg-platform-compare-link.js",
    "js/ccg-publisher-history.js",
    "js/ccg-amiga-identity.js",
    "js/ccg-recent-content.js",
    "js/ccg-personal-library-controls.js",
    "js/game-comparison.js",
    "js/game-discovery.js",
    "js/zzap64-awards.js",
    "resources/js/auth/profile-lists.js",
]


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def skipped(path: Path) -> bool:
    value = rel(path)
    return any(value == part or value.startswith(f"{part}/") for part in SKIP_PARTS)


def report_error(errors: list[str], message: str) -> None:
    errors.append(message)
    print(f"ERROR: {message}")


def report_warning(warnings: list[str], message: str) -> None:
    warnings.append(message)
    print(f"WARNING: {message}")


def check_required_files(errors: list[str]) -> None:
    required = [
        *PROTECTED,
        *CRITICAL_PAGES,
        *CRITICAL_SCRIPTS,
        "data/recent-content.json",
        "data/publisher-histories.json",
        "data/zzap64-awards/1985.json",
        "data/zzap64-awards/1986.json",
        "data/zzap64-awards/1987.json",
        "data/zzap64-awards/1988.json",
        "data/zzap64-awards/1989.json",
    ]
    for value in required:
        if not (ROOT / value).is_file():
            report_error(errors, f"Required file is missing: {value}")


def check_json(errors: list[str], warnings: list[str]) -> None:
    for path in ROOT.rglob("*.json"):
        if skipped(path):
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            report_error(errors, f"Invalid JSON in {rel(path)}: {exc}")
            continue
        if path.name in {"recent-content.json", "publisher-histories.json"} and not isinstance(data, list):
            report_error(errors, f"Expected a JSON list in {rel(path)}")
        if "zzap64-awards" in path.parts and not isinstance(data, list):
            report_error(errors, f"Expected a Zzap awards list in {rel(path)}")
        if path.name == "recent-content.json":
            for index, item in enumerate(data):
                if not isinstance(item, dict) or not all(item.get(key) for key in ("title", "date", "href", "type")):
                    report_error(errors, f"Recent content entry {index + 1} lacks required fields")
        if path.name == "publisher-histories.json":
            slugs = [str(item.get("slug", "")) for item in data if isinstance(item, dict)]
            duplicates = sorted(slug for slug, count in Counter(slugs).items() if slug and count > 1)
            if duplicates:
                report_error(errors, f"Duplicate publisher history slugs: {', '.join(duplicates)}")
        if path.name in {"1985.json", "1986.json", "1987.json", "1988.json", "1989.json"} and "zzap64-awards" in path.parts:
            if not data:
                report_warning(warnings, f"Zzap awards file is empty: {rel(path)}")


def html_ids(text: str) -> list[str]:
    return re.findall(r'\bid\s*=\s*["\']([^"\']+)["\']', text, flags=re.I)


def local_reference_target(page: Path, raw: str) -> Path | None:
    value = raw.strip()
    if not value or value.startswith(("#", "mailto:", "tel:", "javascript:", "data:", "//")):
        return None
    parsed = urlsplit(value)
    if parsed.scheme in {"http", "https"}:
        return None
    clean = parsed.path
    if not clean:
        return None
    if clean.startswith("/"):
        target = ROOT / clean.lstrip("/")
    else:
        target = page.parent / clean
    if clean.endswith("/"):
        target = target / "index.html"
    elif not target.suffix and target.is_dir():
        target = target / "index.html"
    return target.resolve()


def check_html(errors: list[str], warnings: list[str]) -> None:
    ref_pattern = re.compile(r'\b(?:href|src)\s*=\s*["\']([^"\']+)["\']', flags=re.I)
    for value in CRITICAL_PAGES:
        path = ROOT / value
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        ids = html_ids(text)
        duplicates = sorted(item for item, count in Counter(ids).items() if count > 1)
        if duplicates:
            report_error(errors, f"Duplicate HTML IDs in {value}: {', '.join(duplicates)}")
        if "<title" not in text.lower():
            report_error(errors, f"Missing title element in {value}")
        for raw in ref_pattern.findall(text):
            target = local_reference_target(path, raw)
            if target is None:
                continue
            try:
                target.relative_to(ROOT.resolve())
            except ValueError:
                continue
            if not target.exists():
                # Pretty game routes are generated/runtime-backed and may not exist as direct files.
                if re.match(r"^/games/[^/]+/$", urlsplit(raw).path):
                    continue
                report_warning(warnings, f"Missing local reference from {value}: {raw}")

    for value, canonical_path in REQUIRED_NEW_PAGES.items():
        path = ROOT / value
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        lowered = text.lower()
        if 'name="description"' not in lowered and "name='description'" not in lowered:
            report_error(errors, f"Missing meta description in {value}")
        if 'rel="canonical"' not in lowered and "rel='canonical'" not in lowered:
            report_error(errors, f"Missing canonical link in {value}")
        if canonical_path not in text:
            report_error(errors, f"Canonical route mismatch in {value}; expected {canonical_path}")


def check_sizes(errors: list[str], warnings: list[str]) -> None:
    for path in ROOT.rglob("*"):
        if not path.is_file() or skipped(path):
            continue
        suffix = path.suffix.lower()
        limit = TEXT_BUDGETS.get(suffix, ASSET_BUDGETS.get(suffix))
        if not limit:
            continue
        size = path.stat().st_size
        if size > limit:
            message = f"File exceeds {limit:,}-byte budget: {rel(path)} ({size:,} bytes)"
            if suffix in TEXT_BUDGETS and rel(path) in CRITICAL_SCRIPTS:
                report_error(errors, message)
            else:
                report_warning(warnings, message)


def check_script_basics(errors: list[str]) -> None:
    for value in CRITICAL_SCRIPTS:
        path = ROOT / value
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        if "<<<<<<<" in text or ">>>>>>>" in text or "=======" in text:
            report_error(errors, f"Merge conflict marker found in {value}")
        if text.count("{") != text.count("}"):
            report_error(errors, f"Unbalanced braces detected in {value}")
        if text.count("(") != text.count(")"):
            report_error(errors, f"Unbalanced parentheses detected in {value}")


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    check_required_files(errors)
    check_json(errors, warnings)
    check_html(errors, warnings)
    check_sizes(errors, warnings)
    check_script_basics(errors)
    print("\nCCG site safety summary")
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")
    if errors:
        return 1
    print("Read-only site safety checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
