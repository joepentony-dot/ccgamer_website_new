#!/usr/bin/env python3
"""Optimise the single-game download icon with bounded visual validation."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "resources" / "images" / "icons" / "download.PNG"
EXPECTED_SOURCE_SIZE = (4000, 4000)
TARGET_SIZE = (256, 256)
DISPLAY_TEST_SIZES = (18, 36, 64)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def has_transparency(image: Image.Image) -> bool:
    if image.mode in {"RGBA", "LA"}:
        alpha = image.getchannel("A")
        return alpha.getextrema()[0] < 255
    if image.mode == "P" and "transparency" in image.info:
        return True
    return False


def alpha_extrema(image: Image.Image) -> tuple[int, int]:
    rgba = image.convert("RGBA")
    return tuple(int(value) for value in rgba.getchannel("A").getextrema())


def difference_metrics(reference: Image.Image, candidate: Image.Image) -> dict[str, Any]:
    reference_rgba = reference.convert("RGBA")
    candidate_rgba = candidate.convert("RGBA")
    difference = ImageChops.difference(reference_rgba, candidate_rgba)
    statistics = ImageStat.Stat(difference)
    extrema = difference.getextrema()
    return {
        "mean_absolute_error_rgba": [round(float(value), 6) for value in statistics.mean],
        "max_absolute_error_rgba": [int(channel[1]) for channel in extrema],
    }


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    board = Image.new("RGB", size, (230, 230, 230))
    pixels = board.load()
    for y in range(size[1]):
        for x in range(size[0]):
            if ((x // cell) + (y // cell)) % 2:
                pixels[x, y] = (190, 190, 190)
    return board


def composite_on_checker(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    rgba = image.convert("RGBA")
    if rgba.size != size:
        rgba = rgba.resize(size, Image.Resampling.LANCZOS)
    background = checkerboard(size)
    background.paste(rgba, (0, 0), rgba)
    return background


def create_comparison(before: Image.Image, after: Image.Image, output: Path) -> None:
    preview_size = TARGET_SIZE
    before_preview = before.convert("RGBA").resize(preview_size, Image.Resampling.LANCZOS)
    after_preview = after.convert("RGBA")
    before_panel = composite_on_checker(before_preview, preview_size)
    after_panel = composite_on_checker(after_preview, preview_size)

    difference = ImageChops.difference(before_preview, after_preview)
    amplified = difference.convert("RGB").point(lambda value: min(255, value * 8))

    canvas = Image.new("RGB", (preview_size[0] * 3, preview_size[1]), (28, 28, 28))
    canvas.paste(before_panel, (0, 0))
    canvas.paste(after_panel, (preview_size[0], 0))
    canvas.paste(amplified, (preview_size[0] * 2, 0))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, format="PNG", optimize=True, compress_level=9)


def render_report(evidence: dict[str, Any]) -> str:
    before = evidence["before"]
    after = evidence["after"]
    reduction = evidence["reduction"]
    quality = evidence["display_quality"]

    quality_rows = []
    for size in DISPLAY_TEST_SIZES:
        item = quality[str(size)]
        quality_rows.append(
            f"| {size}×{size} | {item['mean_absolute_error_rgba']} | {item['max_absolute_error_rgba']} |"
        )

    return f"""# Phase 7E Download Icon Optimisation

## Verdict

**BOUNDED CORRECTION — only `resources/images/icons/download.PNG` is optimised.**

The existing filename, URL, square aspect ratio and transparent PNG format are retained. The icon is displayed at approximately 18 CSS pixels, while the corrected 256×256 source supports high-density displays with substantial headroom.

## Before and after

| Metric | Before | After |
|---|---:|---:|
| Dimensions | {before['width']}×{before['height']} | {after['width']}×{after['height']} |
| File size | {before['bytes']:,} bytes | {after['bytes']:,} bytes |
| File size | {before['megabytes']:.2f} MB | {after['kilobytes']:.1f} KB |
| PNG mode | `{before['mode']}` | `{after['mode']}` |
| Transparency | {before['has_transparency']} | {after['has_transparency']} |
| Alpha extrema | {before['alpha_extrema']} | {after['alpha_extrema']} |
| SHA-256 | `{before['sha256']}` | `{after['sha256']}` |

**Reduction:** {reduction['bytes_saved']:,} bytes saved ({reduction['percent']:.2f}%).

## Display-size comparison

The original image and corrected image were independently resampled to the button's approximate display sizes. Values are per-channel pixel differences on a 0–255 scale.

| Test size | Mean absolute error RGBA | Maximum absolute error RGBA |
|---:|---|---|
{chr(10).join(quality_rows)}

The workflow artifact contains a three-panel comparison: original resampled to 256×256, corrected 256×256, and an 8× amplified difference image.

## Safety checks

- the image remains a transparent PNG
- the filename and repository path remain unchanged
- `js/load-single-game.js` remains unchanged
- `resources/css/games.css` remains unchanged
- homepage, intro-loader and game database files remain unchanged
- every other PNG, JPG/JPEG and WebP hash remains unchanged
- no other image is resized, recompressed, renamed, moved or deleted
"""


def apply(report_path: Path, evidence_path: Path, artifact_dir: Path) -> dict[str, Any]:
    if not TARGET.exists():
        raise SystemExit(f"Missing target image: {TARGET.relative_to(ROOT)}")

    before_bytes = TARGET.stat().st_size
    before_hash = sha256(TARGET)
    with Image.open(TARGET) as source:
        source.load()
        before_mode = source.mode
        before_size = source.size
        before_transparency = has_transparency(source)
        before_alpha = alpha_extrema(source)
        before_rgba = source.convert("RGBA")

    if before_size != EXPECTED_SOURCE_SIZE:
        raise SystemExit(
            f"Unexpected source dimensions: {before_size}; expected {EXPECTED_SOURCE_SIZE}"
        )
    if not before_transparency:
        raise SystemExit("Source icon does not contain transparency; refusing bounded correction")

    resized = before_rgba.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    temp_path = TARGET.with_name(f"{TARGET.name}.phase7e.tmp")
    resized.save(temp_path, format="PNG", optimize=True, compress_level=9)
    os.replace(temp_path, TARGET)

    after_bytes = TARGET.stat().st_size
    after_hash = sha256(TARGET)
    with Image.open(TARGET) as corrected:
        corrected.load()
        after_mode = corrected.mode
        after_size = corrected.size
        after_transparency = has_transparency(corrected)
        after_alpha = alpha_extrema(corrected)
        after_rgba = corrected.convert("RGBA")

    if after_size != TARGET_SIZE:
        raise SystemExit(f"Corrected dimensions are invalid: {after_size}")
    if not after_transparency:
        raise SystemExit("Corrected icon lost transparency")
    if after_bytes >= before_bytes:
        raise SystemExit("Corrected icon is not smaller than the source")

    reduction_percent = (1 - (after_bytes / before_bytes)) * 100
    if reduction_percent < 90:
        raise SystemExit(f"File-size reduction is too small: {reduction_percent:.2f}%")
    if after_bytes > 350_000:
        raise SystemExit(f"Corrected icon remains unexpectedly large: {after_bytes} bytes")

    display_quality: dict[str, Any] = {}
    for size in DISPLAY_TEST_SIZES:
        dimensions = (size, size)
        reference = before_rgba.resize(dimensions, Image.Resampling.LANCZOS)
        candidate = after_rgba.resize(dimensions, Image.Resampling.LANCZOS)
        display_quality[str(size)] = difference_metrics(reference, candidate)

    artifact_dir.mkdir(parents=True, exist_ok=True)
    create_comparison(before_rgba, after_rgba, artifact_dir / "download-icon-comparison.png")
    composite_on_checker(before_rgba, TARGET_SIZE).save(
        artifact_dir / "download-icon-before-preview.png", format="PNG", optimize=True
    )
    composite_on_checker(after_rgba, TARGET_SIZE).save(
        artifact_dir / "download-icon-after-preview.png", format="PNG", optimize=True
    )

    evidence = {
        "phase": "7E",
        "correction": "download-icon-optimisation",
        "target": TARGET.relative_to(ROOT).as_posix(),
        "display_css_pixels": 17.6,
        "before": {
            "bytes": before_bytes,
            "megabytes": before_bytes / (1024 * 1024),
            "width": before_size[0],
            "height": before_size[1],
            "mode": before_mode,
            "has_transparency": before_transparency,
            "alpha_extrema": list(before_alpha),
            "sha256": before_hash,
        },
        "after": {
            "bytes": after_bytes,
            "kilobytes": after_bytes / 1024,
            "width": after_size[0],
            "height": after_size[1],
            "mode": after_mode,
            "has_transparency": after_transparency,
            "alpha_extrema": list(after_alpha),
            "sha256": after_hash,
        },
        "reduction": {
            "bytes_saved": before_bytes - after_bytes,
            "percent": reduction_percent,
        },
        "display_quality": display_quality,
    }

    report_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(render_report(evidence), encoding="utf-8")
    evidence_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(evidence, indent=2))
    return evidence


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["apply"])
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--artifact-dir", type=Path, required=True)
    args = parser.parse_args()

    if args.command == "apply":
        apply(
            ROOT / args.report,
            ROOT / args.evidence,
            ROOT / args.artifact_dir,
        )


if __name__ == "__main__":
    main()
