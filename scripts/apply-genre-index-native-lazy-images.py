#!/usr/bin/env python3
"""Apply and validate the genre-index native image loading policy.

The first six genre cards stay eager so desktop/tablet initial content is not
artificially delayed. The remaining nine cards use browser-native lazy loading.
Only the known genre-card <img> tags are allowed to change. The operation is
idempotent so the corrected PR head can be validated without further edits.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "games" / "genres" / "index.html"

# filename, alt, width, height, should_lazy
EXPECTED = [
    ("action-adventure.png", "Action Adventure", 460, 215, False),
    ("adventure.png", "Adventure", 460, 215, False),
    ("arcade.png", "Arcade", 460, 215, False),
    ("casino.png", "Casino Games", 460, 215, False),
    ("fighting.png", "Fighting Games", 460, 215, False),
    ("horror.png", "Horror", 460, 215, False),
    ("miscellaneous.png", "Miscellaneous", 460, 213, True),
    ("platform.png", "Platform", 460, 215, True),
    ("puzzle.png", "Puzzle", 460, 215, True),
    ("racing.png", "Racing", 460, 215, True),
    ("rpg.png", "RPG", 460, 215, True),
    ("quiz.png", "Quiz Games", 460, 215, True),
    ("shooting.png", "Shooting", 460, 215, True),
    ("sports.png", "Sports", 460, 215, True),
    ("strategy.png", "Strategy", 460, 215, True),
]

GRID_RE = re.compile(
    r'(<div class="ccg-genre-grid">)(?P<body>.*?)(</div>)',
    re.DOTALL,
)
IMG_RE = re.compile(r"<img\s+[^>]*>", re.IGNORECASE)
ATTR_RE = re.compile(r'([:\w-]+)="([^"]*)"')


def attrs(tag: str) -> dict[str, str]:
    return {key.lower(): value for key, value in ATTR_RE.findall(tag)}


def locate_grid(html: str) -> tuple[re.Match[str], list[str]]:
    match = GRID_RE.search(html)
    if not match:
        raise SystemExit("Genre index grid was not found")
    tags = IMG_RE.findall(match.group("body"))
    if len(tags) != len(EXPECTED):
        raise SystemExit(
            f"Expected {len(EXPECTED)} genre-card images, found {len(tags)}"
        )
    return match, tags


def validate_tags(tags: list[str], *, require_policy: bool) -> None:
    for index, (tag, expected) in enumerate(zip(tags, EXPECTED, strict=True), start=1):
        filename, alt, width, height, should_lazy = expected
        values = attrs(tag)
        expected_src = f"../../resources/images/genres/{filename}"

        checks = {
            "src": expected_src,
            "alt": alt,
            "width": str(width),
            "height": str(height),
        }
        for key, expected_value in checks.items():
            actual = values.get(key)
            if actual != expected_value:
                raise SystemExit(
                    f"Genre card {index} {key} changed: expected {expected_value!r}, got {actual!r}"
                )

        if values.get("fetchpriority", "").lower() == "high" and should_lazy:
            raise SystemExit(f"Lazy genre card {index} must not use fetchpriority=high")

        if require_policy:
            loading = values.get("loading", "").lower()
            if should_lazy and loading != "lazy":
                raise SystemExit(f"Genre card {index} must use loading=lazy")
            if not should_lazy and loading == "lazy":
                raise SystemExit(f"Initial genre card {index} must remain eager")


def corrected_tag(tag: str, *, should_lazy: bool) -> str:
    # Remove an existing loading attribute from this known tag, then apply the
    # exact desired policy. Other attributes and their order remain untouched.
    corrected = re.sub(r'\s+loading="[^"]*"', "", tag, flags=re.IGNORECASE)
    if should_lazy:
        corrected = corrected[:-1].rstrip() + ' loading="lazy">'
    return corrected


def apply_policy() -> bool:
    html = HTML_PATH.read_text(encoding="utf-8")
    grid_match, tags = locate_grid(html)
    validate_tags(tags, require_policy=False)

    corrected_body = grid_match.group("body")
    for tag, expected in zip(tags, EXPECTED, strict=True):
        replacement = corrected_tag(tag, should_lazy=expected[4])
        if corrected_body.count(tag) != 1:
            raise SystemExit("A genre-card image tag was not uniquely addressable")
        corrected_body = corrected_body.replace(tag, replacement, 1)

    corrected_grid = (
        grid_match.group(1) + corrected_body + grid_match.group(3)
    )
    corrected_html = html[: grid_match.start()] + corrected_grid + html[grid_match.end() :]

    _, corrected_tags = locate_grid(corrected_html)
    validate_tags(corrected_tags, require_policy=True)

    if corrected_html == html:
        print("Genre index image loading policy already matches the expected state.")
        return False

    HTML_PATH.write_text(corrected_html, encoding="utf-8")
    print("Applied genre index image loading policy: 6 eager, 9 lazy.")
    return True


def validate_policy() -> None:
    html = HTML_PATH.read_text(encoding="utf-8")
    _, tags = locate_grid(html)
    validate_tags(tags, require_policy=True)
    print("Validated genre index image loading policy: 6 eager, 9 lazy.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("apply", "validate"))
    args = parser.parse_args()

    if args.mode == "apply":
        apply_policy()
    else:
        validate_policy()


if __name__ == "__main__":
    main()
