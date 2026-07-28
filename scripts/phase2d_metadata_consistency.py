#!/usr/bin/env python3
"""Apply bounded Phase 2D social metadata consistency corrections."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from phase0_site_audit import ROOT, extract_tag_attr, extract_text
from validate_social_metadata import audit_social_metadata

OUTPUT_DIR = ROOT / "docs" / "seo-baseline"
JSON_REPORT = OUTPUT_DIR / "phase-2d-metadata-consistency.json"
MD_REPORT = OUTPUT_DIR / "phase-2d-metadata-consistency.md"
PERMANENT_WORKFLOW = ROOT / ".github" / "workflows" / "social-metadata-validation.yml"

TARGETS = [
    ROOT / "emulation.html",
    ROOT / "games" / "collections" / "amiga-demo-music.html",
    ROOT / "games" / "collections" / "retro-events.html",
    ROOT / "games" / "collections" / "retro-specials.html",
]

PROTECTED_FILES = [
    ROOT / "index.html",
    ROOT / "home.html",
    ROOT / "complete-index.html",
    ROOT / "resources" / "css" / "intro.css",
    ROOT / "js" / "index-intro.js",
    ROOT / "games" / "games.json",
    ROOT / "games" / "game.html",
    ROOT / "js" / "load-single-game.js",
]

EXPECTED_BASELINE = {
    ("emulation.html", "og:title differs from HTML title"),
    ("emulation.html", "og:description differs from meta description"),
    ("games/collections/amiga-demo-music.html", "og:title differs from HTML title"),
    ("games/collections/amiga-demo-music.html", "Open Graph image exists but twitter:card is missing"),
    ("games/collections/retro-events.html", "og:title differs from HTML title"),
    ("games/collections/retro-events.html", "og:description differs from meta description"),
    ("games/collections/retro-specials.html", "og:title differs from HTML title"),
    ("home.html", "og:title differs from HTML title"),
    ("home.html", "og:description differs from meta description"),
}

EXPECTED_AFTER = {
    ("home.html", "og:title differs from HTML title"),
    ("home.html", "og:description differs from meta description"),
}

PERMANENT_WORKFLOW_TEXT = '''name: Social Metadata Validation

on:
  pull_request:
    branches:
      - main
    paths:
      - "**/*.html"
      - "scripts/validate_social_metadata.py"
      - ".github/workflows/social-metadata-validation.yml"
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: social-metadata-validation-${{ github.ref }}
  cancel-in-progress: true

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - name: Check out repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          show-progress: false

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Validate tooling syntax
        run: python -m py_compile scripts/validate_social_metadata.py scripts/phase0_site_audit.py

      - name: Validate public social metadata
        run: python scripts/validate_social_metadata.py --allow-deferred-homepage
'''


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def issue_set(report: dict) -> set[tuple[str, str]]:
    return {(item["file"], item["issue"]) for item in report["issues"]}


def attr_escape(value: str) -> str:
    return (
        str(value)
        .replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def extract_meta(html: str, *, property_name: str = "", name: str = "") -> str:
    if property_name:
        pattern = rf"<meta\b[^>]*property\s*=\s*([\"']){re.escape(property_name)}\1[^>]*>"
    else:
        pattern = rf"<meta\b[^>]*name\s*=\s*([\"']){re.escape(name)}\1[^>]*>"
    return extract_tag_attr(html, pattern, "content")


def meta_tag_pattern(*, property_name: str = "", name: str = "") -> re.Pattern[str]:
    if property_name:
        selector = rf"\bproperty\s*=\s*([\"']){re.escape(property_name)}\1"
    else:
        selector = rf"\bname\s*=\s*([\"']){re.escape(name)}\1"
    return re.compile(rf"<meta\b(?=[^>]*{selector})[^>]*>", re.I | re.S)


def replace_meta_content(
    html: str,
    value: str,
    *,
    property_name: str = "",
    name: str = "",
    required: bool = True,
) -> tuple[str, bool]:
    pattern = meta_tag_pattern(property_name=property_name, name=name)
    matches = list(pattern.finditer(html))
    if not matches:
        if required:
            label = property_name or name
            raise RuntimeError(f"Missing metadata tag: {label}")
        return html, False
    if len(matches) != 1:
        label = property_name or name
        raise RuntimeError(f"Expected one metadata tag for {label}, found {len(matches)}")

    match = matches[0]
    tag = match.group(0)
    content_pattern = re.compile(r"(\bcontent\s*=\s*)([\"'])(.*?)\2", re.I | re.S)
    content_matches = list(content_pattern.finditer(tag))
    if len(content_matches) != 1:
        label = property_name or name
        raise RuntimeError(f"Expected one content attribute for {label}")

    escaped = attr_escape(value)
    new_tag = content_pattern.sub(lambda item: f'{item.group(1)}{item.group(2)}{escaped}{item.group(2)}', tag, count=1)
    if new_tag == tag:
        return html, False
    return html[: match.start()] + new_tag + html[match.end() :], True


def ensure_amiga_twitter_bundle(html: str, title: str, description: str) -> tuple[str, bool]:
    if extract_meta(html, name="twitter:card"):
        changed = False
        html, did_change = replace_meta_content(html, title, name="twitter:title", required=False)
        changed |= did_change
        html, did_change = replace_meta_content(html, description, name="twitter:description", required=False)
        changed |= did_change
        return html, changed

    og_image = extract_meta(html, property_name="og:image")
    canonical = extract_tag_attr(
        html,
        r"<link\b[^>]*rel\s*=\s*([\"'])canonical\1[^>]*>",
        "href",
    )
    if not og_image or not canonical:
        raise RuntimeError("Amiga demo collection is missing og:image or canonical")

    og_image_pattern = meta_tag_pattern(property_name="og:image")
    match = og_image_pattern.search(html)
    if not match:
        raise RuntimeError("Unable to locate Amiga demo og:image insertion point")

    indent_match = re.match(r"[ \t]*", html[html.rfind("\n", 0, match.start()) + 1 : match.start()])
    indent = indent_match.group(0) if indent_match else "    "
    bundle = "\n".join(
        [
            f'{indent}<meta name="twitter:card" content="summary_large_image" />',
            f'{indent}<meta name="twitter:title" content="{attr_escape(title)}" />',
            f'{indent}<meta name="twitter:description" content="{attr_escape(description)}" />',
            f'{indent}<meta name="twitter:image" content="{attr_escape(og_image)}" />',
            f'{indent}<meta name="twitter:url" content="{attr_escape(canonical)}" />',
        ]
    )
    return html[: match.end()] + "\n" + bundle + html[match.end() :], True


def align_page(path: Path) -> dict:
    original = path.read_text(encoding="utf-8")
    html = original
    title = extract_text(r"<title[^>]*>(.*?)</title>", html)
    description = extract_meta(html, name="description")
    if not title or not description:
        raise RuntimeError(f"Missing title or description in {path.relative_to(ROOT).as_posix()}")

    fields_changed: list[str] = []
    html, changed = replace_meta_content(html, title, property_name="og:title")
    if changed:
        fields_changed.append("og:title")
    html, changed = replace_meta_content(html, description, property_name="og:description")
    if changed:
        fields_changed.append("og:description")

    if path.name == "amiga-demo-music.html":
        html, changed = ensure_amiga_twitter_bundle(html, title, description)
        if changed:
            fields_changed.append("twitter metadata")
    else:
        html, changed = replace_meta_content(html, title, name="twitter:title", required=False)
        if changed:
            fields_changed.append("twitter:title")
        html, changed = replace_meta_content(html, description, name="twitter:description", required=False)
        if changed:
            fields_changed.append("twitter:description")

    if html != original:
        path.write_text(html, encoding="utf-8")

    return {
        "file": path.relative_to(ROOT).as_posix(),
        "changed": html != original,
        "fields": fields_changed,
    }


def main() -> None:
    protected_before = {path.relative_to(ROOT).as_posix(): sha256(path) for path in PROTECTED_FILES}
    before = audit_social_metadata()
    before_set = issue_set(before)
    if before_set not in (EXPECTED_BASELINE, EXPECTED_AFTER):
        unexpected = sorted(before_set - EXPECTED_BASELINE - EXPECTED_AFTER)
        missing = sorted(EXPECTED_BASELINE - before_set) if len(before_set) > len(EXPECTED_AFTER) else []
        raise RuntimeError(f"Unexpected Phase 2D baseline. Unexpected={unexpected}; missing={missing[:20]}")

    results = [align_page(path) for path in TARGETS]
    PERMANENT_WORKFLOW.parent.mkdir(parents=True, exist_ok=True)
    workflow_changed = not PERMANENT_WORKFLOW.exists() or PERMANENT_WORKFLOW.read_text(encoding="utf-8") != PERMANENT_WORKFLOW_TEXT
    if workflow_changed:
        PERMANENT_WORKFLOW.write_text(PERMANENT_WORKFLOW_TEXT, encoding="utf-8")

    after = audit_social_metadata()
    after_set = issue_set(after)
    if after_set != EXPECTED_AFTER:
        raise RuntimeError(f"Unexpected Phase 2D result: {sorted(after_set)}")

    protected_after = {path.relative_to(ROOT).as_posix(): sha256(path) for path in PROTECTED_FILES}
    protected_changes = sorted(path for path, digest in protected_before.items() if protected_after[path] != digest)
    if protected_changes:
        raise RuntimeError(f"Protected files changed: {protected_changes}")

    report = {
        "summary": {
            "metadata_issues_baseline": 9,
            "metadata_issues_after": 2,
            "actionable_issues_fixed": 7,
            "pages_corrected": sum(1 for item in results if item["changed"]),
            "deferred_homepage_issues": 2,
            "protected_file_changes": len(protected_changes),
            "permanent_validation_gate_added": workflow_changed,
        },
        "pages": results,
        "remaining_issues": after["issues"],
        "already_fixed_at_start": before_set == EXPECTED_AFTER,
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    JSON_REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    MD_REPORT.write_text(
        "\n".join(
            [
                "# Phase 2D Metadata Consistency",
                "",
                "Phase 2D aligns Open Graph and Twitter metadata on the four non-homepage pages identified by the Phase 2A audit.",
                "",
                "## Results",
                "",
                "| Check | Before | After |",
                "|---|---:|---:|",
                "| Metadata consistency issues | **9** | **2** |",
                "| Actionable non-homepage issues | **7** | **0** |",
                "| Deferred homepage issues | **2** | **2** |",
                "| Protected files changed | — | **0** |",
                "",
                "## Corrections",
                "",
                "- `emulation.html`: aligned Open Graph and Twitter title/description with the page title and meta description.",
                "- `games/collections/amiga-demo-music.html`: aligned the Open Graph title and added a complete Twitter card metadata set.",
                "- `games/collections/retro-events.html`: aligned Open Graph and Twitter title/description.",
                "- `games/collections/retro-specials.html`: aligned Open Graph and Twitter title.",
                "",
                "## Deferred homepage work",
                "",
                "The two remaining findings belong to `home.html`. They remain deferred because the homepage is coupled to the protected intro-loader architecture.",
                "",
                "## Permanent validation",
                "",
                "`scripts/validate_social_metadata.py` and `.github/workflows/social-metadata-validation.yml` reject new non-homepage canonical, Open Graph or basic Twitter-card inconsistencies.",
                "",
                "## Explicit exclusions",
                "",
                "- No homepage or intro-loader file was changed.",
                "- `games/games.json` was not changed.",
                "- No page copy, navigation, CSS, schema, sitemap or image was changed.",
                "",
                "## Rollback",
                "",
                "Revert the Phase 2D squash merge commit.",
                "",
            ]
        ),
        encoding="utf-8",
    )

    print(json.dumps(report["summary"], indent=2))


if __name__ == "__main__":
    main()
