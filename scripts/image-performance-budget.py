#!/usr/bin/env python3
"""Fail safely when newly added or modified raster images exceed CCG performance budgets.

This validator deliberately checks only files changed from a supplied Git base. Existing
legacy assets are not rewritten or failed merely because they pre-date the budget.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, asdict
from pathlib import Path

from PIL import Image, ImageFile

ROOT = Path(__file__).resolve().parents[1]
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
EXCLUDED_PREFIXES = ("data/lemon-cache/", "docs/", "_site/", ".git/")
THUMBNAIL_PREFIX = "resources/images/thumbnails/all/"

# Hard limits apply only to added/modified files.
THUMBNAIL_MAX_BYTES = 900 * 1024
THUMBNAIL_WARN_BYTES = 500 * 1024
THUMBNAIL_MAX_PIXELS = 2_000_000
GENERAL_MAX_BYTES = 2 * 1024 * 1024
GENERAL_WARN_BYTES = 1024 * 1024
GENERAL_MAX_PIXELS = 12_000_000
TOTAL_CHANGED_IMAGE_BYTES = 12 * 1024 * 1024

Image.MAX_IMAGE_PIXELS = 100_000_000
ImageFile.LOAD_TRUNCATED_IMAGES = False


@dataclass
class Finding:
    path: str
    severity: str
    code: str
    message: str
    bytes: int = 0
    width: int = 0
    height: int = 0


def run_git(*args: str) -> str:
    return subprocess.check_output(
        ["git", *args], cwd=ROOT, text=True, stderr=subprocess.STDOUT
    ).strip()


def changed_images(base: str) -> list[str]:
    output = run_git("diff", "--name-only", "--diff-filter=AM", f"{base}...HEAD")
    paths: list[str] = []
    for line in output.splitlines():
        relative = line.strip().replace("\\", "/")
        if not relative or relative.startswith(EXCLUDED_PREFIXES):
            continue
        if Path(relative).suffix.lower() in IMAGE_EXTENSIONS:
            paths.append(relative)
    return sorted(set(paths))


def inspect_image(relative: str) -> tuple[list[Finding], int]:
    path = ROOT / relative
    findings: list[Finding] = []
    if not path.is_file():
        findings.append(Finding(relative, "error", "missing", "Changed image file is missing."))
        return findings, 0

    size = path.stat().st_size
    try:
        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            width, height = image.size
            image_format = str(image.format or "").upper()
    except Exception as exc:  # Pillow gives format-specific exceptions.
        findings.append(
            Finding(
                relative,
                "error",
                "unreadable",
                f"Image cannot be decoded safely: {exc}",
                bytes=size,
            )
        )
        return findings, size

    expected = {
        ".png": "PNG",
        ".jpg": "JPEG",
        ".jpeg": "JPEG",
        ".webp": "WEBP",
    }.get(path.suffix.lower(), "")
    if expected and image_format != expected:
        findings.append(
            Finding(
                relative,
                "error",
                "extension-mismatch",
                f"File extension implies {expected}, but decoded format is {image_format or 'unknown'}.",
                bytes=size,
                width=width,
                height=height,
            )
        )

    is_thumbnail = relative.startswith(THUMBNAIL_PREFIX)
    max_bytes = THUMBNAIL_MAX_BYTES if is_thumbnail else GENERAL_MAX_BYTES
    warn_bytes = THUMBNAIL_WARN_BYTES if is_thumbnail else GENERAL_WARN_BYTES
    max_pixels = THUMBNAIL_MAX_PIXELS if is_thumbnail else GENERAL_MAX_PIXELS
    pixels = width * height

    if size > max_bytes:
        findings.append(
            Finding(
                relative,
                "error",
                "file-size",
                f"{size / 1024:.1f} KB exceeds the {max_bytes / 1024:.0f} KB hard budget.",
                bytes=size,
                width=width,
                height=height,
            )
        )
    elif size > warn_bytes:
        findings.append(
            Finding(
                relative,
                "warning",
                "file-size",
                f"{size / 1024:.1f} KB exceeds the {warn_bytes / 1024:.0f} KB review threshold.",
                bytes=size,
                width=width,
                height=height,
            )
        )

    if pixels > max_pixels:
        findings.append(
            Finding(
                relative,
                "error",
                "pixel-count",
                f"{width}×{height} ({pixels:,} px) exceeds the {max_pixels:,}-pixel hard budget.",
                bytes=size,
                width=width,
                height=height,
            )
        )

    return findings, size


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="origin/main", help="Git base ref to compare against")
    parser.add_argument("--json", default="", help="Optional JSON report path")
    args = parser.parse_args()

    try:
        paths = changed_images(args.base)
    except subprocess.CalledProcessError as exc:
        print(exc.output, file=sys.stderr)
        print(f"Unable to compare image budget against {args.base}.", file=sys.stderr)
        return 2

    findings: list[Finding] = []
    total_bytes = 0
    for relative in paths:
        image_findings, size = inspect_image(relative)
        findings.extend(image_findings)
        total_bytes += size

    if total_bytes > TOTAL_CHANGED_IMAGE_BYTES:
        findings.append(
            Finding(
                "(changed raster total)",
                "error",
                "total-change-size",
                f"Changed raster assets total {total_bytes / (1024 * 1024):.2f} MB; hard budget is {TOTAL_CHANGED_IMAGE_BYTES / (1024 * 1024):.0f} MB per change set.",
                bytes=total_bytes,
            )
        )

    errors = [finding for finding in findings if finding.severity == "error"]
    warnings = [finding for finding in findings if finding.severity == "warning"]
    report = {
        "version": 1,
        "mode": "changed-files-only",
        "base": args.base,
        "imagesChecked": len(paths),
        "changedImageBytes": total_bytes,
        "budgets": {
            "thumbnailMaxBytes": THUMBNAIL_MAX_BYTES,
            "thumbnailMaxPixels": THUMBNAIL_MAX_PIXELS,
            "generalMaxBytes": GENERAL_MAX_BYTES,
            "generalMaxPixels": GENERAL_MAX_PIXELS,
            "totalChangedImageBytes": TOTAL_CHANGED_IMAGE_BYTES,
        },
        "errors": len(errors),
        "warnings": len(warnings),
        "findings": [asdict(finding) for finding in findings],
    }

    if args.json:
        target = (ROOT / args.json).resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(f"CCG image budget: {len(paths)} changed raster image(s), {total_bytes / 1024:.1f} KB total.")
    for finding in findings:
        marker = "ERROR" if finding.severity == "error" else "WARN"
        print(f"[{marker}] {finding.path}: {finding.message}")

    if not findings:
        print("No changed raster asset exceeds a budget or review threshold.")
    elif not errors:
        print(f"Budget passed with {len(warnings)} advisory warning(s).")

    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
