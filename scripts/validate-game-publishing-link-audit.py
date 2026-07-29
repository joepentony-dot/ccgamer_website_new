#!/usr/bin/env python3
"""Reject internal-link regressions after the authoritative game rebuild."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("evidence")
    args = parser.parse_args()

    payload = json.loads(Path(args.evidence).read_text(encoding="utf-8"))
    summary = payload.get("summary", {})
    expected_zero = [
        "orphan_indexable_pages",
        "sitemap_only_indexable_pages",
        "broken_internal_link_edges",
        "canonical_game_pages_missing",
        "games_without_meaningful_static_discovery",
        "games_with_one_or_zero_discovery_dimensions",
    ]
    failures = {
        key: summary.get(key)
        for key in expected_zero
        if summary.get(key) != 0
    }
    expected_games = summary.get("canonical_game_pages_expected")
    if not isinstance(expected_games, int) or expected_games <= 0:
        failures["canonical_game_pages_expected"] = expected_games
    minimum_routes = summary.get("minimum_archive_routes_per_game")
    if not isinstance(minimum_routes, int) or minimum_routes < 4:
        failures["minimum_archive_routes_per_game"] = minimum_routes

    if failures:
        broken = payload.get("link_issues", {}).get("broken_edges", [])[:20]
        discovery = payload.get("game_discovery", [])
        weakest = sorted(
            discovery,
            key=lambda item: (item.get("archive_route_count", 0), item.get("slug", "")),
        )[:20]
        diagnostic = {
            "failures": failures,
            "broken_edge_examples": broken,
            "minimum_discovery_examples": [
                {
                    "slug": item.get("slug"),
                    "archive_route_count": item.get("archive_route_count"),
                    "discovery_dimensions": item.get("discovery_dimensions"),
                    "archive_routes": item.get("archive_routes"),
                }
                for item in weakest
                if item.get("archive_route_count") == minimum_routes
            ],
        }
        raise SystemExit(f"Game publishing link audit failed: {json.dumps(diagnostic, ensure_ascii=False)}")

    print(json.dumps({
        "canonical_games": expected_games,
        "minimum_archive_routes_per_game": minimum_routes,
        "orphan_indexable_pages": summary.get("orphan_indexable_pages"),
        "broken_internal_link_edges": summary.get("broken_internal_link_edges"),
    }, indent=2))


if __name__ == "__main__":
    main()
