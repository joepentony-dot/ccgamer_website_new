#!/usr/bin/env python3
"""Optimise the Miscellaneous genre tile image with bounded validation."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "resources" / "images" / "genres" / "miscellaneous.png"
GENRE_INDEX = ROOT / "games" / "genres" / "index.html"
EXPECTED_SOURCE_SIZE = (1024, 474)
TARGET_SIZE = (460, 213)
DISPLAY_TEST_WIDTHS = (180, 360, 460)
SOURCE_TAG = '<img src="../../resources/images/genres/miscellaneous.png" alt="Miscellaneous" width="1024" height="474">'
TARGET_TAG = '<img src="../../resources/images/genres/miscellaneous.png" alt="Miscellaneous" width="460" height="213">'


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def has_transparency(image: Image.Image) -> bool:
    if image.mode in {"RGBA", "LA"}:
        return image.getchannel("A").getextrema()[0] < 255
    if image.mode == "P" and "transparency" in image.info:
        return True
    return False


def difference_metrics(reference: Image.Image, candidate: Image.Image) -> dict[str, Any]:
    reference_rgb = reference.convert("RGB")
    candidate_rgb = candidate.convert("RGB")
    difference = ImageChops.difference(reference_rgb, candidate_rgb)
    statistics = ImageStat.Stat(difference)
    extrema = difference.getextrema()
    return {
        "mean_absolute_error_rgb": [round(float(value), 6) for value in statistics.mean],
        "max_absolute_error_rgb": [int(channel[1]) for channel in extrema],
    }


def display_dimensions(width: int) -> tuple[int, int]:
    height = max(1, round(width * EXPECTED_SOURCE_SIZE[1] / EXPECTED_SOURCE_SIZE[0]))
    return width, height


def create_comparison(before: Image.Image, after: Image.Image, output: Path) -> None:
    preview_size = TARGET_SIZE
    before_preview = before.convert("RGB").resize(preview_size, Image.Resampling.LANCZOS)
    after_preview = after.convert("RGB")
    difference = ImageChops.difference(before_preview, after_preview)
    amplified = difference.point(lambda value: min(255, value * 8))

    canvas = Image.new("RGB", (preview_size[0] * 3, preview_size[1]), (20, 20, 20))
    canvas.paste(before_preview, (0, 0))
    canvas.paste(after_preview, (preview_size[0], 0))
    canvas.paste(amplified, (preview_size[0] * 2, 0))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, format="PNG", optimize=True, compress_level=9)


def render_report(evidence: dict[str, Any]) -> str:
    before = evidence["before"]
    after = evidence["after"]
    reduction = evidence["reduction"]
    quality = evidence["display_quality"]

    quality_rows = []
    for width in DISPLAY_TEST_WIDTHS:
        item = quality[str(width)]
        quality_rows.append(
            f"| {item['width']}×{item['height']} | {item['mean_absolute_error_rgb']} | {item['max_absolute_error_rgb']} |"
        )

    return f"""# Phase 7E Miscellaneous Genre Image Optimisation

## Verdict

**BOUNDED CORRECTION — only `resources/images/genres/miscellaneous.png` and its matching intrinsic dimensions on `games/genres/index.html` are corrected.**

The existing filename, URL, PNG format and artwork are retained. The source image was 1024×474 even though the genre index's neighbouring genre artwork is authored around 460 pixels wide and the shared card CSS constrains these tiles to a maximum width of 360 CSS pixels. The corrected 460×213 source retains the original aspect ratio to within 0.04% while removing unnecessary raster payload.

## Before and after

| Metric | Before | After |
|---|---:|---:|
| Dimensions | {before['width']}×{before['height']} | {after['width']}×{after['height']} |
| File size | {before['bytes']:,} bytes | {after['bytes']:,} bytes |
| File size | {before['kilobytes']:.1f} KB | {after['kilobytes']:.1f} KB |
| PNG mode | `{before['mode']}` | `{after['mode']}` |
| Transparency | {before['has_transparency']} | {after['has_transparency']} |
| SHA-256 | `{before['sha256']}` | `{after['sha256']}` |

**Reduction:** {reduction['bytes_saved']:,} bytes saved ({reduction['percent']:.2f}%).

## Display-size comparison

The original and corrected images were independently resampled to representative genre-card widths. Values are per-channel pixel differences on a 0–255 scale.

| Test size | Mean absolute error RGB | Maximum absolute error RGB |
|---:|---|---|
{chr(10).join(quality_rows)}

The workflow artifact contains the original resampled to 460×213, the corrected image, and an 8× amplified difference panel.

## Safety checks

- the image remains an opaque PNG
- the filename and public URL remain unchanged
- the original artwork is resampled only; no crop, recolour or redesign is performed
- the genre index intrinsic dimensions are updated to match the corrected file
- `home.html`, the intro-loader stack and `games/games.json` remain unchanged
- every other PNG, JPG/JPEG and WebP hash remains unchanged
- no CSS or JavaScript file is modified
"""


def validate_existing(evidence_path: Path, report_path: Path) -> dict[str, Any]:
    if not evidence_path.exists() or not report_path.exists():
        raise SystemExit("Target is already resized but optimisation evidence is missing")

    evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
    if evidence.get("phase") != "7E" or evidence.get("correction") != "miscellaneous-genre-image-optimisation":
        raise SystemExit("Existing optimisation evidence identity is invalid")
    if evidence.get("target") != TARGET.relative_to(ROOT).as_posix():
        raise SystemExit("Existing optimisation evidence target is invalid")
    if evidence.get("after", {}).get("sha256") != sha256(TARGET):
        raise SystemExit("Current target hash does not match recorded optimisation evidence")

    html = GENRE_INDEX.read_text(encoding="utf-8")
    if TARGET_TAG not in html or SOURCE_TAG in html:
        raise SystemExit("Genre index intrinsic dimensions do not match the corrected image")

    with Image.open(TARGET) as image:
        image.load()
        if image.size != TARGET_SIZE:
            raise SystemExit(f"Unexpected current target dimensions: {image.size}")
        if image.format != "PNG":
            raise SystemExit(f"Unexpected current format: {image.format}")
        if has_transparency(image):
            raise SystemExit("Corrected genre image unexpectedly contains transparency")

    print(json.dumps({"status": "already-optimised", "evidence": evidence}, indent=2))
    return evidence


def apply(report_path: Path, evidence_path: Path, artifact_dir: Path) -> dict[str, Any]:
    if not TARGET.exists():
        raise SystemExit(f"Missing target image: {TARGET.relative_to(ROOT)}")
    if not GENRE_INDEX.exists():
        raise SystemExit(f"Missing genre index: {GENRE_INDEX.relative_to(ROOT)}")

    with Image.open(TARGET) as probe:
        probe.load()
        current_size = probe.size

    if current_size == TARGET_SIZE:
        return validate_existing(evidence_path, report_path)
    if current_size != EXPECTED_SOURCE_SIZE:
        raise SystemExit(
            f"Unexpected source dimensions: {current_size}; expected {EXPECTED_SOURCE_SIZE}"
        )

    html = GENRE_INDEX.read_text(encoding="utf-8")
    if html.count(SOURCE_TAG) != 1:
        raise SystemExit("Expected exactly one original Miscellaneous genre image tag")
    if TARGET_TAG in html:
        raise SystemExit("Target intrinsic-dimension tag already exists before image correction")

    before_bytes = TARGET.stat().st_size
    before_hash = sha256(TARGET)
    with Image.open(TARGET) as source:
        source.load()
        if source.format != "PNG":
            raise SystemExit(f"Unexpected source format: {source.format}")
        if has_transparency(source):
            raise SystemExit("Source genre image contains transparency; refusing bounded correction")
        before_mode = source.mode
        before_rgb = source.convert("RGB")
        icc_profile = source.info.get("icc_profile")

    corrected = before_rgb.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    temp_path = TARGET.with_name(f"{TARGET.name}.phase7e.tmp")
    save_kwargs: dict[str, Any] = {
        "format": "PNG",
        "optimize": True,
        "compress_level": 9,
    }
    if icc_profile:
        save_kwargs["icc_profile"] = icc_profile
    corrected.save(temp_path, **save_kwargs)
    os.replace(temp_path, TARGET)

    GENRE_INDEX.write_text(html.replace(SOURCE_TAG, TARGET_TAG), encoding="utf-8")

    after_bytes = TARGET.stat().st_size
    after_hash = sha256(TARGET)
    with Image.open(TARGET) as resized:
        resized.load()
        after_mode = resized.mode
        after_size = resized.size
        after_transparency = has_transparency(resized)
        after_rgb = resized.convert("RGB")

    if after_size != TARGET_SIZE:
        raise SystemExit(f"Corrected dimensions are invalid: {after_size}")
    if after_transparency:
        raise SystemExit("Corrected genre image unexpectedly gained transparency")
    if after_bytes >= before_bytes:
        raise SystemExit("Corrected genre image is not smaller than the source")

    reduction_percent = (1 - (after_bytes / before_bytes)) * 100
    if reduction_percent < 55:
        raise SystemExit(f"File-size reduction is too small: {reduction_percent:.2f}%")
    if after_bytes > 300_000:
        raise SystemExit(f"Corrected genre image remains unexpectedly large: {after_bytes} bytes")

    source_ratio = EXPECTED_SOURCE_SIZE[0] / EXPECTED_SOURCE_SIZE[1]
    target_ratio = TARGET_SIZE[0] / TARGET_SIZE[1]
    aspect_ratio_delta_percent = abs(1 - (target_ratio / source_ratio)) * 100
    if aspect_ratio_delta_percent > 0.05:
        raise SystemExit(
            f"Corrected aspect ratio drift is too large: {aspect_ratio_delta_percent:.4f}%"
        )

    display_quality: dict[str, Any] = {}
    for width in DISPLAY_TEST_WIDTHS:
        dimensions = display_dimensions(width)
        reference = before_rgb.resize(dimensions, Image.Resampling.LANCZOS)
        candidate = after_rgb.resize(dimensions, Image.Resampling.LANCZOS)
        metrics = difference_metrics(reference, candidate)
        mean_error = max(metrics["mean_absolute_error_rgb"])
        if mean_error > 2.0:
            raise SystemExit(
                f"Display-size mean error is too high at {dimensions}: {mean_error:.4f}"
            )
        display_quality[str(width)] = {
            "width": dimensions[0],
            "height": dimensions[1],
            **metrics,
        }

    artifact_dir.mkdir(parents=True, exist_ok=True)
    create_comparison(before_rgb, after_rgb, artifact_dir / "miscellaneous-genre-comparison.png")
    before_rgb.resize(TARGET_SIZE, Image.Resampling.LANCZOS).save(
        artifact_dir / "miscellaneous-genre-before-preview.png",
        format="PNG",
        optimize=True,
        compress_level=9,
    )
    after_rgb.save(
        artifact_dir / "miscellaneous-genre-after-preview.png",
        format="PNG",
        optimize=True,
        compress_level=9,
    )

    evidence = {
        "phase": "7E",
        "correction": "miscellaneous-genre-image-optimisation",
        "target": TARGET.relative_to(ROOT).as_posix(),
        "html_reference": GENRE_INDEX.relative_to(ROOT).as_posix(),
        "before": {
            "bytes": before_bytes,
            "kilobytes": before_bytes / 1024,
            "width": EXPECTED_SOURCE_SIZE[0],
            "height": EXPECTED_SOURCE_SIZE[1],
            "mode": before_mode,
            "has_transparency": False,
            "sha256": before_hash,
        },
        "after": {
            "bytes": after_bytes,
            "kilobytes": after_bytes / 1024,
            "width": after_size[0],
            "height": after_size[1],
            "mode": after_mode,
            "has_transparency": after_transparency,
            "sha256": after_hash,
        },
        "reduction": {
            "bytes_saved": before_bytes - after_bytes,
            "percent": reduction_percent,
        },
        "aspect_ratio_delta_percent": aspect_ratio_delta_percent,
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
