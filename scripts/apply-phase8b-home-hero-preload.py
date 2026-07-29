#!/usr/bin/env python3
"""Apply the bounded Phase 8B homepage hero preload correction."""

from __future__ import annotations

from pathlib import Path

HOME = Path("home.html")

REPLACEMENTS = (
    (
        '    <link rel="preload" as="image" href="resources/images/hero/ccg-hero-c64.png" media="(min-width: 1024px)" fetchpriority="high" type="image/png">',
        '    <link rel="preload" as="image" href="resources/images/hero/ccg-hero-c64.png" fetchpriority="high" type="image/png">',
    ),
    (
        '    <link rel="preload" as="image" href="resources/images/hero/ccg-hero-amiga.png" media="(min-width: 1024px)" fetchpriority="high" type="image/png">',
        '    <link rel="preload" as="image" href="resources/images/hero/ccg-hero-amiga.png" fetchpriority="high" type="image/png">',
    ),
)


def main() -> None:
    original = HOME.read_text(encoding="utf-8")
    updated = original

    for old, new in REPLACEMENTS:
        count = updated.count(old)
        if count != 1:
            raise SystemExit(f"Expected one exact preload line, found {count}: {old}")
        updated = updated.replace(old, new, 1)

    if updated == original:
        raise SystemExit("Phase 8B produced no homepage change.")

    for old, new in REPLACEMENTS:
        if old in updated:
            raise SystemExit(f"Desktop-only preload restriction remains: {old}")
        if updated.count(new) != 1:
            raise SystemExit(f"Corrected preload line count is not one: {new}")

    HOME.write_text(updated, encoding="utf-8")
    print("Applied Phase 8B: both existing hero preloads now apply on mobile and desktop.")


if __name__ == "__main__":
    main()
