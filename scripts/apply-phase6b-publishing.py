#!/usr/bin/env python3
"""Validate the already-landed Phase 6B publishing contracts without rewriting them.

Phase 6B began life as a migration helper. The repository has since moved on to a
larger authoritative publishing chain (magazine reviews, re-release publishers,
PDF manuals and additional SEO guards). A validation workflow must never replace
that newer chain with an old frozen copy, so this script is deliberately read-only.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    target = ROOT / path
    if not target.exists():
        raise SystemExit(f"Missing required file: {path}")
    return target.read_text(encoding="utf-8")


def require_tokens(path: str, tokens: list[str]) -> None:
    source = read(path)
    missing = [token for token in tokens if token not in source]
    if missing:
        raise SystemExit(f"{path} is missing Phase 6B publishing contracts: {missing}")


def reject_tokens(path: str, tokens: list[str]) -> None:
    source = read(path)
    present = [token for token in tokens if token in source]
    if present:
        raise SystemExit(f"{path} still contains retired Phase 6B assumptions: {present}")


def main() -> None:
    require_tokens(
        "scripts/rebuild-games.js",
        [
            "validate-games-source.js",
            "audit-game-manuals.js",
            "build-magazine-review-chunks.js",
            "audit-magazine-review-coverage.js",
            "build-games.js",
            "enforce-manual-only-game-pages.js",
            "prepare-seo-game-routes.js",
            "prepare-seo-genre-links.js",
            "generate-publisher-pages.js",
            "mark-rerelease-publishers.js",
            "materialize-publisher-histories-tolerant.js",
            "link-publisher-strength-genres.js",
            "generate-developer-pages.js",
            "generate-composer-pages.js",
            "generate-year-platform-pages.js",
            "integrate-year-platform-discovery.js",
            "ensure-downloads-discovery-links.js",
            "generate-downloads-page.js",
            "update-downloads-static-pages.js",
            "generate-sitemaps.js",
            "validate-sitemaps.js",
            "verify-seo.mjs",
            "validate-seo-game-routes.js",
            "validate-seo-genre-links.js",
            "validate-year-platform-discovery.js",
        ],
    )
    require_tokens(
        "admin/js/games-editor.js",
        ["node scripts/rebuild-games.js", "GAME_SCHEMA_JSON"],
    )
    reject_tokens("admin/js/games-editor.js", ["/admin/api/rebuild-games"])
    require_tokens("admin/templates/game-landing-template.html", ["{{GAME_SCHEMA_JSON}}"])

    reject_tokens(
        "scripts/generate-year-platform-pages.js",
        ["!== 651", "!== 552", "!== 99", "!== 15"],
    )
    reject_tokens(
        "scripts/validate-year-platform-discovery.js",
        ["!== 651", "!== 552", "!== 99", "years.length !== 15"],
    )

    print("Phase 6B source contracts are current; validation made no repository changes.")


if __name__ == "__main__":
    main()
