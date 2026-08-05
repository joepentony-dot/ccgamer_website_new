#!/usr/bin/env python3
"""Read-only safety checks for hand-maintained CCG experience files."""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
PROTECTED = ["index.html", "resources/css/intro.css", "js/index-intro.js", "games/games.json"]
SKIP_PREFIXES = ("node_modules/", ".git/", "data/lemon-cache/", "reports/", "dist/")
CRITICAL_PAGES = [
    "home.html", "games/index.html", "games/publishers/index.html",
    "games/compare/index.html", "games/discover/index.html",
    "zzap64/index.html", "community/profile.html",
]
REQUIRED_NEW_PAGES = {
    "games/compare/index.html": "/games/compare/",
    "games/discover/index.html": "/games/discover/",
    "zzap64/index.html": "/zzap64/",
}
CRITICAL_SCRIPTS = [
    "js/ccg-nav-core.js", "js/ccg-global-search.js", "js/ccg-search-ranking.js",
    "js/ccg-recently-viewed.js", "js/ccg-archive-shortcuts.js",
    "js/ccg-platform-compare-link.js", "js/ccg-publisher-history.js",
    "js/ccg-amiga-identity.js", "js/ccg-recent-content.js",
    "js/ccg-personal-library-controls.js", "js/game-comparison.js",
    "js/game-discovery.js", "js/zzap64-awards.js",
    "resources/js/auth/profile-lists.js",
]
REQUIRED_DATA = [
    "data/recent-content.json", "data/publisher-histories.json",
    *[f"data/zzap64-awards/{year}.json" for year in range(1985, 1990)],
]
TEXT_BUDGETS = {".js": 350_000, ".css": 300_000, ".html": 1_500_000, ".json": 3_000_000}
ASSET_BUDGETS = {
    ".png": 8_000_000, ".jpg": 8_000_000, ".jpeg": 8_000_000,
    ".webp": 8_000_000, ".gif": 8_000_000, ".mp3": 15_000_000, ".mp4": 35_000_000,
}
CONFLICT_LINE = re.compile(r"^(?:<<<<<<< .+|=======|>>>>>>> .+)$", re.MULTILINE)


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def skipped(path: Path) -> bool:
    value = relative(path)
    return value.startswith(SKIP_PREFIXES)


def error(errors: list[str], message: str) -> None:
    errors.append(message)
    print(f"ERROR: {message}")


def warning(warnings: list[str], message: str) -> None:
    warnings.append(message)
    print(f"WARNING: {message}")


def check_required(errors: list[str]) -> None:
    for value in [*PROTECTED, *CRITICAL_PAGES, *CRITICAL_SCRIPTS, *REQUIRED_DATA]:
        if not (ROOT / value).is_file():
            error(errors, f"Required file is missing: {value}")


def check_json(errors: list[str], warnings: list[str]) -> None:
    for path in ROOT.rglob("*.json"):
        if skipped(path):
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            error(errors, f"Invalid JSON in {relative(path)}: {exc}")
            continue
        if path.name in {"recent-content.json", "publisher-histories.json"} and not isinstance(data, list):
            error(errors, f"Expected a JSON list in {relative(path)}")
        if "zzap64-awards" in path.parts:
            if not isinstance(data, list):
                error(errors, f"Expected a Zzap awards list in {relative(path)}")
            elif not data:
                warning(warnings, f"Zzap awards file is empty: {relative(path)}")
        if path.name == "recent-content.json" and isinstance(data, list):
            for index, item in enumerate(data, start=1):
                if not isinstance(item, dict) or not all(item.get(key) for key in ("title", "date", "href", "type")):
                    error(errors, f"Recent content entry {index} lacks required fields")
        if path.name == "publisher-histories.json" and isinstance(data, list):
            slugs = [str(item.get("slug", "")) for item in data if isinstance(item, dict)]
            duplicates = sorted(slug for slug, count in Counter(slugs).items() if slug and count > 1)
            if duplicates:
                error(errors, f"Duplicate publisher history slugs: {', '.join(duplicates)}")


def local_target(page: Path, raw: str) -> Path | None:
    value = raw.strip()
    if not value or value.startswith(("#", "mailto:", "tel:", "javascript:", "data:", "//")):
        return None
    parsed = urlsplit(value)
    if parsed.scheme in {"http", "https"} or not parsed.path:
        return None
    target = ROOT / parsed.path.lstrip("/") if parsed.path.startswith("/") else page.parent / parsed.path
    if parsed.path.endswith("/"):
        target /= "index.html"
    elif not target.suffix and target.is_dir():
        target /= "index.html"
    return target.resolve()


def check_html(errors: list[str], warnings: list[str]) -> None:
    id_pattern = re.compile(r'\bid\s*=\s*["\']([^"\']+)["\']', re.I)
    ref_pattern = re.compile(r'\b(?:href|src)\s*=\s*["\']([^"\']+)["\']', re.I)
    root = ROOT.resolve()
    for value in CRITICAL_PAGES:
        path = ROOT / value
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        duplicates = sorted(item for item, count in Counter(id_pattern.findall(text)).items() if count > 1)
        if duplicates:
            error(errors, f"Duplicate HTML IDs in {value}: {', '.join(duplicates)}")
        if "<title" not in text.lower():
            error(errors, f"Missing title element in {value}")
        if CONFLICT_LINE.search(text):
            error(errors, f"Merge conflict marker found in {value}")
        for raw in ref_pattern.findall(text):
            target = local_target(path, raw)
            if target is None:
                continue
            try:
                target.relative_to(root)
            except ValueError:
                continue
            if not target.exists() and not re.match(r"^/games/[^/]+/$", urlsplit(raw).path):
                warning(warnings, f"Missing local reference from {value}: {raw}")

    for value, route in REQUIRED_NEW_PAGES.items():
        path = ROOT / value
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        lowered = text.lower()
        if 'name="description"' not in lowered and "name='description'" not in lowered:
            error(errors, f"Missing meta description in {value}")
        if 'rel="canonical"' not in lowered and "rel='canonical'" not in lowered:
            error(errors, f"Missing canonical link in {value}")
        if route not in text:
            error(errors, f"Canonical route mismatch in {value}; expected {route}")


def check_scripts(errors: list[str]) -> None:
    for value in CRITICAL_SCRIPTS:
        path = ROOT / value
        if not path.is_file():
            continue
        if CONFLICT_LINE.search(path.read_text(encoding="utf-8", errors="replace")):
            error(errors, f"Merge conflict marker found in {value}")


def check_sizes(errors: list[str], warnings: list[str]) -> None:
    for path in ROOT.rglob("*"):
        if not path.is_file() or skipped(path):
            continue
        suffix = path.suffix.lower()
        limit = TEXT_BUDGETS.get(suffix, ASSET_BUDGETS.get(suffix))
        if not limit or path.stat().st_size <= limit:
            continue
        message = f"File exceeds {limit:,}-byte budget: {relative(path)} ({path.stat().st_size:,} bytes)"
        if suffix in TEXT_BUDGETS and relative(path) in CRITICAL_SCRIPTS:
            error(errors, message)
        else:
            warning(warnings, message)


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    check_required(errors)
    check_json(errors, warnings)
    check_html(errors, warnings)
    check_scripts(errors)
    check_sizes(errors, warnings)
    print("\nCCG site safety summary")
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")
    if errors:
        return 1
    print("Read-only site safety checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
