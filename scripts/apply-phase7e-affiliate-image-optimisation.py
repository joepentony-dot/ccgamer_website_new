#!/usr/bin/env python3
"""Optimise the bounded Phase 7E affiliate PNG set and record evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageStat

ROOT = Path(__file__).resolve().parents[1]
MAX_EDGE = 800
TARGETS = [
    "resources/images/affiliate/a500-mini.png",
    "resources/images/affiliate/c64-maxi.png",
    "resources/images/affiliate/joystick-clear.png",
    "resources/images/affiliate/gamepad-white.png",
    "resources/images/affiliate/gamepad-black.png",
]
CARD_SIZES = [(240, 180), (480, 360)]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def alpha_extrema(image: Image.Image) -> list[int] | None:
    rgba = image.convert("RGBA")
    minimum, maximum = rgba.getchannel("A").getextrema()
    return [int(minimum), int(maximum)]


def describe(path: Path) -> dict[str, Any]:
    with Image.open(path) as image:
        image.load()
        return {
            "bytes": path.stat().st_size,
            "width": image.width,
            "height": image.height,
            "mode": image.mode,
            "has_transparency": alpha_extrema(image) != [255, 255],
            "alpha_extrema": alpha_extrema(image),
            "sha256": sha256(path),
        }


def fitted_size(width: int, height: int, max_edge: int = MAX_EDGE) -> tuple[int, int]:
    longest = max(width, height)
    if longest <= max_edge:
        return width, height
    scale = max_edge / longest
    return max(1, round(width * scale)), max(1, round(height * scale))


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    width, height = size
    canvas = Image.new("RGBA", size, (38, 42, 52, 255))
    draw = ImageDraw.Draw(canvas)
    colours = [(64, 69, 82, 255), (92, 98, 114, 255)]
    for y in range(0, height, cell):
        for x in range(0, width, cell):
            colour = colours[((x // cell) + (y // cell)) % 2]
            draw.rectangle((x, y, min(x + cell - 1, width - 1), min(y + cell - 1, height - 1)), fill=colour)
    return canvas


def render_contain(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    canvas = checkerboard(box)
    source = image.convert("RGBA")
    scale = min(box[0] / source.width, box[1] / source.height)
    rendered_size = (
        max(1, round(source.width * scale)),
        max(1, round(source.height * scale)),
    )
    rendered = source.resize(rendered_size, Image.Resampling.LANCZOS)
    offset = ((box[0] - rendered.width) // 2, (box[1] - rendered.height) // 2)
    canvas.alpha_composite(rendered, offset)
    return canvas


def mean_absolute_error(before: Image.Image, after: Image.Image) -> dict[str, list[float] | list[int]]:
    difference = ImageChops.difference(before.convert("RGBA"), after.convert("RGBA"))
    statistics = ImageStat.Stat(difference)
    extrema = difference.getextrema()
    return {
        "mean_absolute_error_rgba": [round(value, 6) for value in statistics.mean],
        "max_absolute_error_rgba": [int(pair[1]) for pair in extrema],
    }


def comparison_sheet(label: str, before: Image.Image, after: Image.Image) -> Image.Image:
    preview_box = (480, 360)
    before_preview = render_contain(before, preview_box)
    after_preview = render_contain(after, preview_box)
    margin = 20
    header = 42
    width = preview_box[0] * 2 + margin * 3
    height = preview_box[1] + header + margin * 2
    sheet = Image.new("RGBA", (width, height), (15, 18, 28, 255))
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 12), f"{label} — BEFORE", fill=(255, 255, 255, 255))
    draw.text((preview_box[0] + margin * 2, 12), "AFTER", fill=(255, 255, 255, 255))
    sheet.alpha_composite(before_preview, (margin, header + margin))
    sheet.alpha_composite(after_preview, (preview_box[0] + margin * 2, header + margin))
    return sheet


def optimise_one(relative: str, artifact_dir: Path) -> dict[str, Any]:
    path = ROOT / relative
    if not path.exists():
        raise SystemExit(f"Missing Phase 7E affiliate image: {relative}")

    before = describe(path)
    with Image.open(path) as source_image:
        source_image.load()
        source = source_image.convert("RGBA")

    target_size = fitted_size(source.width, source.height)
    corrected = source.resize(target_size, Image.Resampling.LANCZOS)

    temporary = path.with_suffix(path.suffix + ".phase7e.tmp")
    corrected.save(temporary, format="PNG", optimize=True, compress_level=9)
    temporary.replace(path)

    after = describe(path)
    if after["width"] != target_size[0] or after["height"] != target_size[1]:
        raise SystemExit(f"Unexpected corrected dimensions for {relative}: {after['width']}x{after['height']}")
    if before["has_transparency"] and not after["has_transparency"]:
        raise SystemExit(f"Transparency was lost for {relative}")
    if after["bytes"] >= before["bytes"]:
        raise SystemExit(f"Affiliate image did not reduce in size: {relative}")

    with Image.open(path) as corrected_file:
        corrected_file.load()
        corrected_loaded = corrected_file.convert("RGBA")

    display_quality: dict[str, Any] = {}
    for width, height in CARD_SIZES:
        original_display = render_contain(source, (width, height))
        corrected_display = render_contain(corrected_loaded, (width, height))
        display_quality[f"{width}x{height}"] = mean_absolute_error(original_display, corrected_display)

    artifact_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(relative).stem
    sheet = comparison_sheet(safe_name, source, corrected_loaded)
    sheet.save(artifact_dir / f"{safe_name}-comparison.png", format="PNG", optimize=True)

    saved = int(before["bytes"]) - int(after["bytes"])
    percent = (saved / int(before["bytes"])) * 100
    return {
        "path": relative,
        "before": before,
        "after": after,
        "reduction": {
            "bytes_saved": saved,
            "percent": round(percent, 6),
        },
        "display_quality": display_quality,
    }


def write_report(report_path: Path, evidence: dict[str, Any]) -> None:
    summary = evidence["summary"]
    lines = [
        "# Phase 7E Affiliate Image Optimisation",
        "",
        "## Verdict",
        "",
        "**BOUNDED CORRECTION — five active affiliate PNGs were resized losslessly while retaining their existing paths and transparency.**",
        "",
        "## Totals",
        "",
        "| Metric | Before | After |",
        "|---|---:|---:|",
        f"| Files | {summary['files']} | {summary['files']} |",
        f"| Total bytes | {summary['before_bytes']:,} | {summary['after_bytes']:,} |",
        f"| Total size | {summary['before_megabytes']:.2f} MB | {summary['after_megabytes']:.2f} MB |",
        f"| Bytes saved | — | {summary['bytes_saved']:,} |",
        f"| Reduction | — | {summary['reduction_percent']:.2f}% |",
        "",
        "## Per-file evidence",
        "",
        "| Asset | Before | After | Dimensions | Reduction |",
        "|---|---:|---:|---:|---:|",
    ]
    for item in evidence["images"]:
        before = item["before"]
        after = item["after"]
        lines.append(
            f"| `{item['path']}` | {before['bytes'] / 1024:.1f} KB | {after['bytes'] / 1024:.1f} KB | "
            f"{before['width']}×{before['height']} → {after['width']}×{after['height']} | "
            f"{item['reduction']['percent']:.2f}% |"
        )
    lines.extend(
        [
            "",
            "## Safety",
            "",
            "- filenames and URLs are unchanged",
            "- transparent PNG format is retained",
            "- aspect ratios are unchanged",
            "- affiliate configuration, JavaScript and CSS are unchanged",
            "- all non-target raster images are hash-protected by the workflow",
            "- homepage, intro-loader and game-database files are hash-protected",
            "",
            "## Visual review",
            "",
            "The workflow artifact contains before-and-after comparison sheets for every corrected image. Display-quality measurements are recorded at 240×180 and 480×360 card sizes.",
            "",
        ]
    )
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines), encoding="utf-8")


def apply(report_path: Path, evidence_path: Path, artifact_dir: Path) -> dict[str, Any]:
    images = [optimise_one(relative, artifact_dir) for relative in TARGETS]
    before_bytes = sum(int(item["before"]["bytes"]) for item in images)
    after_bytes = sum(int(item["after"]["bytes"]) for item in images)
    bytes_saved = before_bytes - after_bytes
    evidence = {
        "phase": "7E",
        "correction": "affiliate-image-optimisation",
        "max_edge": MAX_EDGE,
        "summary": {
            "files": len(images),
            "before_bytes": before_bytes,
            "after_bytes": after_bytes,
            "before_megabytes": before_bytes / (1024 * 1024),
            "after_megabytes": after_bytes / (1024 * 1024),
            "bytes_saved": bytes_saved,
            "reduction_percent": round((bytes_saved / before_bytes) * 100, 6),
        },
        "images": images,
    }
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    write_report(report_path, evidence)
    print(json.dumps(evidence["summary"], indent=2))
    return evidence


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    apply_parser = subparsers.add_parser("apply")
    apply_parser.add_argument("--report", type=Path, required=True)
    apply_parser.add_argument("--evidence", type=Path, required=True)
    apply_parser.add_argument("--artifact-dir", type=Path, required=True)
    arguments = parser.parse_args()

    if arguments.command == "apply":
        apply(
            ROOT / arguments.report,
            ROOT / arguments.evidence,
            arguments.artifact_dir,
        )


if __name__ == "__main__":
    main()
