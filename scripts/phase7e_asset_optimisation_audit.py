#!/usr/bin/env python3
"""Phase 7E: read-only audit of first-party raster image assets."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from PIL import Image, ImageFile

ROOT = Path(__file__).resolve().parents[1]
ROOT_RESOLVED = ROOT.resolve()
SITE_HOSTS = {"www.cheekycommodoregamer.co.uk", "cheekycommodoregamer.co.uk"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
TEXT_EXTENSIONS = {
    ".html",
    ".htm",
    ".css",
    ".js",
    ".mjs",
    ".cjs",
    ".json",
    ".md",
    ".txt",
}
EXCLUDED_PREFIXES = (
    ".git/",
    "node_modules/",
    ".venv/",
    "venv/",
    "__pycache__/",
    "data/lemon-cache/",
    "admin/js/_backup_2026-02-working/",
)
REFERENCE_EXCLUDED_PREFIXES = EXCLUDED_PREFIXES + (
    "docs/seo-baseline/",
)
PROTECTED = (
    "index.html",
    "home.html",
    "resources/css/intro.css",
    "js/index-intro.js",
    "games/games.json",
)
LARGE_BYTES = 500 * 1024
VERY_LARGE_BYTES = 1024 * 1024
FORMAT_REVIEW_BYTES = 250 * 1024
HIGH_RESOLUTION_PIXELS = 2_000_000
DISPLAY_AREA_RATIO = 9.0
DISPLAY_DIMENSION_RATIO = 3.0

QUOTED_IMAGE_RE = re.compile(
    r"""(?P<quote>["'`])(?P<url>[^"'`<>\r\n]+?\.(?:png|jpe?g|webp)(?:[?#][^"'`]*)?)(?P=quote)""",
    re.I,
)
CSS_URL_RE = re.compile(
    r"""url\(\s*(?P<quote>["']?)(?P<url>[^)"']+?\.(?:png|jpe?g|webp)(?:[?#][^)"']*)?)(?P=quote)\s*\)""",
    re.I,
)

Image.MAX_IMAGE_PIXELS = 100_000_000
ImageFile.LOAD_TRUNCATED_IMAGES = False


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def excluded(relative: str, prefixes: tuple[str, ...] = EXCLUDED_PREFIXES) -> bool:
    return relative.startswith(prefixes)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def image_paths() -> list[Path]:
    paths: list[Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        relative = rel(path)
        if excluded(relative):
            continue
        paths.append(path)
    return sorted(paths, key=rel)


def text_paths() -> list[Path]:
    paths: list[Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        relative = rel(path)
        if excluded(relative, REFERENCE_EXCLUDED_PREFIXES):
            continue
        paths.append(path)
    return sorted(paths, key=rel)


def git_commit() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


def parse_positive_int(value: str | None) -> int | None:
    if not value:
        return None
    value = value.strip()
    if not re.fullmatch(r"\d+", value):
        return None
    parsed = int(value)
    return parsed if parsed > 0 else None


class ImgParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.items: list[dict[str, Any]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "img":
            return
        values = {name.lower(): value for name, value in attrs}
        width = parse_positive_int(values.get("width"))
        height = parse_positive_int(values.get("height"))
        src = values.get("src")
        if src:
            self.items.append(
                {
                    "url": src,
                    "kind": "img-src",
                    "width": width,
                    "height": height,
                }
            )
        srcset = values.get("srcset")
        if srcset:
            for candidate in srcset.split(","):
                url = candidate.strip().split()[0] if candidate.strip() else ""
                if url:
                    self.items.append(
                        {
                            "url": url,
                            "kind": "img-srcset",
                            "width": None,
                            "height": None,
                        }
                    )


def resolve_reference(source: Path, raw_url: str, asset_set: set[str]) -> str | None:
    value = raw_url.strip()
    if not value or value.startswith(("data:", "blob:", "javascript:")):
        return None
    if any(token in value for token in ("${", "{{", "}}", "<%", "%>")):
        return None

    parsed = urlparse(value)
    if parsed.scheme in {"http", "https"}:
        if parsed.hostname not in SITE_HOSTS:
            return None
        value = parsed.path
    elif parsed.scheme or parsed.netloc:
        return None
    else:
        value = value.split("#", 1)[0].split("?", 1)[0]

    value = unquote(value).replace("\\", "/").strip()
    if not value:
        return None

    try:
        if value.startswith("/"):
            candidate = (ROOT / value.lstrip("/")).resolve()
        else:
            candidate = (source.parent / value).resolve()
        candidate.relative_to(ROOT_RESOLVED)
    except (OSError, ValueError):
        return None

    relative = rel(candidate)
    return relative if relative in asset_set else None


def scan_references(asset_set: set[str]) -> dict[str, list[dict[str, Any]]]:
    references: dict[str, list[dict[str, Any]]] = defaultdict(list)
    seen: set[tuple[str, str, str, int | None, int | None]] = set()

    def record(
        source: Path,
        raw_url: str,
        kind: str,
        width: int | None = None,
        height: int | None = None,
    ) -> None:
        target = resolve_reference(source, raw_url, asset_set)
        if target is None:
            return
        key = (rel(source), target, kind, width, height)
        if key in seen:
            return
        seen.add(key)
        references[target].append(
            {
                "source": rel(source),
                "kind": kind,
                "width": width,
                "height": height,
            }
        )

    for path in text_paths():
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue

        if path.suffix.lower() in {".html", ".htm"}:
            parser = ImgParser()
            try:
                parser.feed(text)
            except Exception:
                parser.items = []
            for item in parser.items:
                record(
                    path,
                    str(item["url"]),
                    str(item["kind"]),
                    item.get("width"),
                    item.get("height"),
                )

        for match in CSS_URL_RE.finditer(text):
            record(path, match.group("url"), "css-url")
        for match in QUOTED_IMAGE_RE.finditer(text):
            record(path, match.group("url"), "quoted-reference")

    for values in references.values():
        values.sort(key=lambda item: (item["source"], item["kind"]))
    return dict(references)


def inspect_image(path: Path) -> dict[str, Any]:
    relative = rel(path)
    size = path.stat().st_size
    file_sha = sha256_file(path)
    result: dict[str, Any] = {
        "path": relative,
        "extension": path.suffix.lower(),
        "bytes": size,
        "sha256": file_sha,
        "width": None,
        "height": None,
        "pixels": None,
        "megapixels": None,
        "mode": None,
        "format": None,
        "alpha": None,
        "animated": False,
        "frames": 1,
        "pixel_sha256": None,
        "error": None,
    }
    try:
        with Image.open(path) as image:
            image.seek(0)
            width, height = image.size
            bands = image.getbands()
            has_alpha = "A" in bands or "transparency" in image.info
            result.update(
                {
                    "width": width,
                    "height": height,
                    "pixels": width * height,
                    "megapixels": round((width * height) / 1_000_000, 3),
                    "mode": image.mode,
                    "format": image.format,
                    "alpha": bool(has_alpha),
                    "animated": bool(getattr(image, "is_animated", False)),
                    "frames": int(getattr(image, "n_frames", 1)),
                }
            )
            pixels = image.convert("RGBA")
            result["pixel_sha256"] = hashlib.sha256(pixels.tobytes()).hexdigest()
    except Exception as exc:
        result["error"] = f"{type(exc).__name__}: {exc}"
    return result


def display_evidence(refs: list[dict[str, Any]]) -> dict[str, Any]:
    sizes = [
        (int(item["width"]), int(item["height"]))
        for item in refs
        if item.get("width") and item.get("height")
    ]
    if not sizes:
        return {
            "declared_size_count": 0,
            "max_declared_width": None,
            "max_declared_height": None,
            "max_declared_pixels": None,
        }
    return {
        "declared_size_count": len(sizes),
        "max_declared_width": max(width for width, _ in sizes),
        "max_declared_height": max(height for _, height in sizes),
        "max_declared_pixels": max(width * height for width, height in sizes),
    }


def group_duplicates(
    assets: list[dict[str, Any]],
    key_fields: tuple[str, ...],
    require_distinct_file_sha: bool = False,
) -> list[dict[str, Any]]:
    groups: dict[tuple[Any, ...], list[dict[str, Any]]] = defaultdict(list)
    for asset in assets:
        if any(asset.get(field) is None for field in key_fields):
            continue
        groups[tuple(asset[field] for field in key_fields)].append(asset)

    output: list[dict[str, Any]] = []
    for key, members in groups.items():
        if len(members) < 2:
            continue
        file_hashes = {str(member["sha256"]) for member in members}
        if require_distinct_file_sha and len(file_hashes) < 2:
            continue
        members = sorted(members, key=lambda item: item["path"])
        output.append(
            {
                "count": len(members),
                "bytes": sum(int(item["bytes"]) for item in members),
                "potential_duplicate_bytes": sum(
                    int(item["bytes"]) for item in members[1:]
                ),
                "paths": [item["path"] for item in members],
                "extensions": sorted({item["extension"] for item in members}),
                "key": list(key),
            }
        )
    output.sort(
        key=lambda item: (
            -int(item["potential_duplicate_bytes"]),
            -int(item["count"]),
            item["paths"][0],
        )
    )
    return output


def candidate_reasons(asset: dict[str, Any]) -> list[str]:
    reasons: list[str] = []
    size = int(asset["bytes"])
    if size >= VERY_LARGE_BYTES:
        reasons.append("over 1 MB")
    elif size >= LARGE_BYTES:
        reasons.append("over 500 KB")

    pixels = int(asset.get("pixels") or 0)
    if pixels >= HIGH_RESOLUTION_PIXELS:
        reasons.append("over 2 megapixels")

    if asset.get("oversized_for_declared_display"):
        reasons.append("at least 3× declared display dimensions")

    if (
        asset["extension"] == ".png"
        and asset.get("alpha") is False
        and size >= FORMAT_REVIEW_BYTES
    ):
        reasons.append("large opaque PNG; format review only")

    if asset.get("byte_duplicate_group"):
        reasons.append("byte-identical duplicate")

    if int(asset.get("reference_count") or 0) == 0:
        reasons.append("no static reference found")

    return reasons


def priority_score(asset: dict[str, Any]) -> int:
    score = 0
    size = int(asset["bytes"])
    if size >= VERY_LARGE_BYTES:
        score += 6
    elif size >= LARGE_BYTES:
        score += 4
    elif size >= FORMAT_REVIEW_BYTES:
        score += 2
    if asset.get("oversized_for_declared_display"):
        score += 5
    if int(asset.get("pixels") or 0) >= HIGH_RESOLUTION_PIXELS:
        score += 3
    if asset.get("byte_duplicate_group"):
        score += 3
    if asset["extension"] == ".png" and asset.get("alpha") is False:
        score += 1
    if int(asset.get("reference_count") or 0) == 0:
        score += 1
    return score


def format_bytes(value: int) -> str:
    if value >= 1024 * 1024:
        return f"{value / (1024 * 1024):.2f} MB"
    if value >= 1024:
        return f"{value / 1024:.1f} KB"
    return f"{value} B"


def table_escape(value: Any) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def render_report(evidence: dict[str, Any]) -> str:
    summary = evidence["summary"]
    priorities = evidence["priority_candidates"][:40]
    byte_groups = evidence["byte_duplicate_groups"][:20]
    pixel_groups = evidence["pixel_duplicate_groups"][:20]
    errors = evidence["errors"][:30]

    lines = [
        "# Phase 7E Asset Optimisation Audit",
        "",
        "## Verdict",
        "",
        "**AUDIT ONLY — no image asset was modified, renamed, moved or replaced.**",
        "",
        "This audit measures first-party PNG, JPG/JPEG and WebP files in the repository, excluding Lemon cache material and known backup trees. Candidate labels require manual visual comparison before any later optimisation work.",
        "",
        "## Repository totals",
        "",
        "| Metric | Current |",
        "|---|---:|",
        f"| Raster image files | {summary['image_files']:,} |",
        f"| Total raster image bytes | {format_bytes(summary['total_bytes'])} |",
        f"| Files over 500 KB | {summary['over_500kb']:,} |",
        f"| Files over 1 MB | {summary['over_1mb']:,} |",
        f"| Files over 2 megapixels | {summary['over_2_megapixels']:,} |",
        f"| Likely oversized against declared HTML dimensions | {summary['oversized_for_declared_display']:,} |",
        f"| Byte-identical duplicate groups | {summary['byte_duplicate_groups']:,} |",
        f"| Pixel-identical groups with different file bytes | {summary['pixel_duplicate_groups']:,} |",
        f"| Files with no static repository reference found | {summary['no_static_reference']:,} |",
        f"| Unreadable image files | {summary['errors']:,} |",
        "",
        "## Extension breakdown",
        "",
        "| Extension | Files | Bytes |",
        "|---|---:|---:|",
    ]
    for extension, item in sorted(evidence["extensions"].items()):
        lines.append(
            f"| `{extension}` | {item['files']:,} | {format_bytes(item['bytes'])} |"
        )

    lines.extend(
        [
            "",
            "## Priority review candidates",
            "",
            "These are review candidates, not approved conversions. Static-reference detection cannot prove that an asset is unused because some paths may be assembled dynamically.",
            "",
            "| Score | Asset | Size | Dimensions | Static references | Reasons |",
            "|---:|---|---:|---:|---:|---|",
        ]
    )
    if priorities:
        for item in priorities:
            dimensions = (
                f"{item['width']}×{item['height']}"
                if item.get("width") and item.get("height")
                else "Unknown"
            )
            lines.append(
                "| "
                + " | ".join(
                    [
                        str(item["priority_score"]),
                        f"`{table_escape(item['path'])}`",
                        format_bytes(int(item["bytes"])),
                        dimensions,
                        str(item["reference_count"]),
                        table_escape("; ".join(item["reasons"])),
                    ]
                )
                + " |"
            )
    else:
        lines.append("| — | None | — | — | — | — |")

    lines.extend(
        [
            "",
            "## Byte-identical duplicates",
            "",
            "| Potential duplicate bytes | Files | Paths |",
            "|---:|---:|---|",
        ]
    )
    if byte_groups:
        for group in byte_groups:
            paths = "<br>".join(f"`{table_escape(path)}`" for path in group["paths"])
            lines.append(
                f"| {format_bytes(group['potential_duplicate_bytes'])} | {group['count']} | {paths} |"
            )
    else:
        lines.append("| 0 B | 0 | None |")

    lines.extend(
        [
            "",
            "## Pixel-identical files with different encodings or file bytes",
            "",
            "| Files | Extensions | Paths |",
            "|---:|---|---|",
        ]
    )
    if pixel_groups:
        for group in pixel_groups:
            paths = "<br>".join(f"`{table_escape(path)}`" for path in group["paths"])
            extensions = ", ".join(f"`{ext}`" for ext in group["extensions"])
            lines.append(f"| {group['count']} | {extensions} | {paths} |")
    else:
        lines.append("| 0 | — | None |")

    lines.extend(
        [
            "",
            "## Audit limitations",
            "",
            "- Declared display-size comparison uses numeric `width` and `height` attributes found in static HTML. CSS-only sizing and runtime-generated paths may not be measurable.",
            "- A file with no detected static reference is not automatically safe to delete.",
            "- Opaque PNGs are listed for format review only; no lossy conversion is approved by this audit.",
            "- Exact visual review is required before resizing, recompressing or converting any asset.",
            "- Animated images are measured from their first frame for pixel-duplicate detection.",
            "",
            "## Safety",
            "",
            "- protected homepage, intro-loader and game-database files remain unchanged",
            "- Lemon cache and known backup material are excluded",
            "- filenames, paths, dimensions, transparency and image content remain untouched",
            "- the workflow compares a complete before/after image hash manifest",
        ]
    )

    if errors:
        lines.extend(
            [
                "",
                "## Unreadable files",
                "",
                "| Asset | Error |",
                "|---|---|",
            ]
        )
        for item in errors:
            lines.append(
                f"| `{table_escape(item['path'])}` | {table_escape(item['error'])} |"
            )

    return "\n".join(lines) + "\n"


def build_audit() -> dict[str, Any]:
    paths = image_paths()
    asset_set = {rel(path) for path in paths}
    references = scan_references(asset_set)

    assets: list[dict[str, Any]] = []
    for path in paths:
        item = inspect_image(path)
        refs = references.get(item["path"], [])
        item["references"] = refs
        item["reference_count"] = len(refs)
        item.update(display_evidence(refs))

        source_pixels = int(item.get("pixels") or 0)
        declared_pixels = int(item.get("max_declared_pixels") or 0)
        max_width = int(item.get("max_declared_width") or 0)
        max_height = int(item.get("max_declared_height") or 0)
        width = int(item.get("width") or 0)
        height = int(item.get("height") or 0)
        area_ratio = source_pixels / declared_pixels if declared_pixels else None
        dimension_ratio = (
            max(width / max_width, height / max_height)
            if max_width and max_height and width and height
            else None
        )
        item["declared_area_ratio"] = round(area_ratio, 3) if area_ratio else None
        item["declared_dimension_ratio"] = (
            round(dimension_ratio, 3) if dimension_ratio else None
        )
        item["oversized_for_declared_display"] = bool(
            int(item["bytes"]) >= FORMAT_REVIEW_BYTES
            and area_ratio is not None
            and dimension_ratio is not None
            and area_ratio >= DISPLAY_AREA_RATIO
            and dimension_ratio >= DISPLAY_DIMENSION_RATIO
        )
        assets.append(item)

    byte_groups = group_duplicates(assets, ("sha256",))
    pixel_groups = group_duplicates(
        assets,
        ("width", "height", "pixel_sha256"),
        require_distinct_file_sha=True,
    )

    byte_group_paths = {path for group in byte_groups for path in group["paths"]}
    for item in assets:
        item["byte_duplicate_group"] = item["path"] in byte_group_paths
        item["reasons"] = candidate_reasons(item)
        item["priority_score"] = priority_score(item)

    priorities = sorted(
        [item for item in assets if item["reasons"]],
        key=lambda item: (-item["priority_score"], -int(item["bytes"]), item["path"]),
    )

    extensions: dict[str, dict[str, int]] = defaultdict(
        lambda: {"files": 0, "bytes": 0}
    )
    for item in assets:
        ext = str(item["extension"])
        extensions[ext]["files"] += 1
        extensions[ext]["bytes"] += int(item["bytes"])

    errors = [
        {"path": item["path"], "error": item["error"]}
        for item in assets
        if item.get("error")
    ]
    summary = {
        "image_files": len(assets),
        "total_bytes": sum(int(item["bytes"]) for item in assets),
        "over_500kb": sum(int(item["bytes"]) >= LARGE_BYTES for item in assets),
        "over_1mb": sum(int(item["bytes"]) >= VERY_LARGE_BYTES for item in assets),
        "over_2_megapixels": sum(
            int(item.get("pixels") or 0) >= HIGH_RESOLUTION_PIXELS for item in assets
        ),
        "oversized_for_declared_display": sum(
            bool(item["oversized_for_declared_display"]) for item in assets
        ),
        "byte_duplicate_groups": len(byte_groups),
        "byte_duplicate_potential_bytes": sum(
            int(group["potential_duplicate_bytes"]) for group in byte_groups
        ),
        "pixel_duplicate_groups": len(pixel_groups),
        "no_static_reference": sum(
            int(item.get("reference_count") or 0) == 0 for item in assets
        ),
        "errors": len(errors),
    }

    return {
        "phase": "7E",
        "mode": "read-only",
        "commit": git_commit(),
        "scope": {
            "extensions": sorted(IMAGE_EXTENSIONS),
            "excluded_prefixes": list(EXCLUDED_PREFIXES),
            "protected_files": list(PROTECTED),
            "large_threshold_bytes": LARGE_BYTES,
            "very_large_threshold_bytes": VERY_LARGE_BYTES,
            "display_area_ratio": DISPLAY_AREA_RATIO,
            "display_dimension_ratio": DISPLAY_DIMENSION_RATIO,
        },
        "summary": summary,
        "extensions": dict(sorted(extensions.items())),
        "priority_candidates": priorities,
        "largest_assets": sorted(
            assets,
            key=lambda item: (-int(item["bytes"]), item["path"]),
        )[:100],
        "oversized_display_candidates": [
            item for item in priorities if item["oversized_for_declared_display"]
        ],
        "byte_duplicate_groups": byte_groups,
        "pixel_duplicate_groups": pixel_groups,
        "errors": errors,
        "assets": assets,
    }


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def fingerprint(output: Path) -> None:
    payload = {
        "commit": git_commit(),
        "images": [
            {
                "path": rel(path),
                "bytes": path.stat().st_size,
                "sha256": sha256_file(path),
            }
            for path in image_paths()
        ],
    }
    write_json(output, payload)
    print(
        json.dumps(
            {
                "image_files": len(payload["images"]),
                "output": output.as_posix(),
            },
            indent=2,
        )
    )


def audit(report: Path, evidence: Path) -> None:
    payload = build_audit()
    write_json(evidence, payload)
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(render_report(payload), encoding="utf-8")
    print(json.dumps(payload["summary"], indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    fingerprint_parser = subparsers.add_parser("fingerprint")
    fingerprint_parser.add_argument("--output", required=True)

    audit_parser = subparsers.add_parser("audit")
    audit_parser.add_argument("--report", required=True)
    audit_parser.add_argument("--evidence", required=True)

    args = parser.parse_args()
    if args.command == "fingerprint":
        fingerprint(Path(args.output))
    else:
        audit(Path(args.report), Path(args.evidence))


if __name__ == "__main__":
    main()
