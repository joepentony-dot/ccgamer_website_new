#!/usr/bin/env python3
"""Stabilize Phase 4A JSON report ordering without changing audit values."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT_PATH = ROOT / "docs" / "seo-baseline" / "phase-4a-year-platform-archives.json"


def sorted_mapping(value: object) -> dict:
    if not isinstance(value, dict):
        return {}
    return {key: value[key] for key in sorted(value)}


def main() -> None:
    data = json.loads(REPORT_PATH.read_text(encoding="utf-8"))

    if isinstance(data.get("platform_counts"), dict):
        data["platform_counts"] = sorted_mapping(data["platform_counts"])

    links = data.get("links")
    if isinstance(links, dict):
        for key in (
            "static_year_links",
            "static_platform_links",
            "query_year_links",
            "query_platform_links",
        ):
            if isinstance(links.get(key), dict):
                links[key] = sorted_mapping(links[key])

        sources = links.get("top_static_link_sources")
        if isinstance(sources, dict):
            ordered_sources = sorted(
                sources.items(),
                key=lambda item: (-int(item[1]), str(item[0])),
            )
            links["top_static_link_sources"] = dict(ordered_sources)

    next_content = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    current_content = REPORT_PATH.read_text(encoding="utf-8")
    if current_content != next_content:
        REPORT_PATH.write_text(next_content, encoding="utf-8")
        print("[phase4a-stabilize] Normalized deterministic report ordering.")
    else:
        print("[phase4a-stabilize] Report ordering already deterministic.")


if __name__ == "__main__":
    main()
