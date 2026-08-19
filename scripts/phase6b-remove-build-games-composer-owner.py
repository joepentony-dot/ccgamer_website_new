#!/usr/bin/env python3
"""Validate Phase 6B ownership without mutating the current publishing chain.

The historical Phase 6B helper used to normalize files in-place. That is unsafe in
modern PR validation because newer publishing features can be silently removed.
All migrations represented here have already landed; this file now checks their
contracts and leaves the working tree untouched.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    target = ROOT / path
    if not target.exists():
        raise SystemExit(f"Missing required file: {path}")
    return target.read_text(encoding="utf-8")


def require(path: str, tokens: list[str]) -> None:
    source = read(path)
    missing = [token for token in tokens if token not in source]
    if missing:
        raise SystemExit(f"{path} is missing required publishing ownership markers: {missing}")


def main() -> None:
    build = read("scripts/build-games.js")
    match = re.search(r"function main\(\) \{(.*?)\n\}", build, flags=re.S)
    if not match:
        raise SystemExit("Could not isolate scripts/build-games.js main function.")
    main_body = match.group(1)
    if "processChangedGamesOnly(games)" not in main_body:
        raise SystemExit("build-games.js no longer owns incremental game wrapper generation.")
    if re.search(r"composer|music/index|generateComposer", main_body, flags=re.I):
        raise SystemExit("build-games.js has regained composer archive publishing ownership.")

    require(
        "scripts/rebuild-games.js",
        [
            "build-magazine-review-chunks.js",
            "enforce-manual-only-game-pages.js",
            "generate-composer-pages.js",
            "mark-rerelease-publishers.js",
            "link-publisher-strength-genres.js",
            "generate-downloads-page.js",
            "validate-downloads-page.js",
            "generate-sitemaps.js",
        ],
    )
    require(
        "scripts/generate-composer-pages.js",
        ["data-generated-composer", "music-composer"],
    )
    require(
        "scripts/phase6b_games_editor_transaction.py",
        [
            '"pdf": f"https://example.com/{slug}-manual.pdf"',
            '"disk": []',
            '"manuals_archive_once"',
            '"game_media_panel_absent"',
            '"manual_only_policy_preserved"',
        ],
    )

    print("Phase 6B ownership contracts are current; no source files were rewritten.")


if __name__ == "__main__":
    main()
