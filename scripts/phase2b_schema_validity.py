#!/usr/bin/env python3
"""Apply the bounded Phase 2B structured-data corrections."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from phase0_site_audit import ROOT
from validate_structured_data import audit_structured_data

OUTPUT_DIR = ROOT / "docs" / "seo-baseline"
JSON_REPORT = OUTPUT_DIR / "phase-2b-schema-validity.json"
MD_REPORT = OUTPUT_DIR / "phase-2b-schema-validity.md"
INVALID_PAGE = "retro-specials/favourite-arcade-games-c64-amiga-ports/index.html"
EMPTY_PAGE = "games/game.html"

TEMPLATE = ROOT / "admin/templates/retro-video-template.html"
GENERATOR = ROOT / "scripts/generate-retro-pages.js"
GAME_SHELL = ROOT / "games/game.html"
GAME_LOADER = ROOT / "js/load-single-game.js"

OLD_PLACEHOLDER = '<script type="application/ld+json" id="ccg-schema-fallback"></script>'
NEW_PLACEHOLDER = '<script id="ccg-schema-fallback" data-schema-placeholder="true"></script>'

OLD_FALLBACK = """    const fallback = document.getElementById('ccg-schema-fallback');
    if (fallback) {
        fallback.textContent = JSON.stringify(schema);
        return;
    }
"""
NEW_FALLBACK = """    const fallback = document.getElementById('ccg-schema-fallback');
    if (fallback) {
        fallback.type = 'application/ld+json';
        fallback.removeAttribute('data-schema-placeholder');
        fallback.textContent = JSON.stringify(schema);
        return;
    }
"""

TEMPLATE_REPLACEMENTS = {
    '"name": "{{TITLE}}"': '"name": "{{TITLE_JSON}}"',
    '"description": "{{DESCRIPTION}}"': '"description": "{{DESCRIPTION_JSON}}"',
    '"thumbnailUrl": "{{THUMBNAIL_URL}}"': '"thumbnailUrl": "{{THUMBNAIL_URL_JSON}}"',
    '"uploadDate": "{{UPLOAD_DATE}}"': '"uploadDate": "{{UPLOAD_DATE_JSON}}"',
    '"embedUrl": "https://www.youtube.com/embed/{{YOUTUBE_ID}}"': '"embedUrl": "{{EMBED_URL_JSON}}"',
    '"url": "{{CANONICAL_URL}}"{{VIDEO_DURATION_FIELD}}': '"url": "{{CANONICAL_URL_JSON}}"{{VIDEO_DURATION_FIELD}}',
    '"name": "{{COLLECTION_LABEL}}"': '"name": "{{COLLECTION_LABEL_JSON}}"',
    '"item": "https://www.cheekycommodoregamer.co.uk{{COLLECTION_URL}}"': '"item": "{{COLLECTION_URL_JSON}}"',
    '"item": "{{CANONICAL_URL}}"': '"item": "{{CANONICAL_URL_JSON}}"',
}


def replace_state(text: str, old: str, new: str, label: str) -> tuple[str, bool]:
    if new in text and old not in text:
        return text, False
    if old in text and new not in text:
        return text.replace(old, new), True
    raise RuntimeError(f"Unexpected {label} state")


def insert_after(text: str, anchor: str, addition: str, marker: str) -> tuple[str, bool]:
    if marker in text:
        return text, False
    if text.count(anchor) != 1:
        raise RuntimeError(f"Unexpected generator anchor state for {marker}")
    return text.replace(anchor, anchor + addition, 1), True


def write(path: Path, content: str) -> bool:
    current = path.read_text(encoding="utf-8")
    if current == content:
        return False
    path.write_text(content, encoding="utf-8")
    return True


def apply_template() -> bool:
    text = TEMPLATE.read_text(encoding="utf-8")
    changed = False
    for old, new in TEMPLATE_REPLACEMENTS.items():
        if new in text and old not in text:
            continue
        if old not in text:
            raise RuntimeError(f"Missing retro template token: {old}")
        text = text.replace(old, new)
        changed = True
    return write(TEMPLATE, text) or changed


def apply_generator() -> bool:
    text = GENERATOR.read_text(encoding="utf-8")
    changed = False

    helper_marker = "function escapeJsonTemplateValue(value)"
    if helper_marker not in text:
        anchor = "\nfunction normalizeKebab(value) {"
        if text.count(anchor) != 1:
            raise RuntimeError("Unable to locate normalizeKebab insertion point")
        helper = (
            "\nfunction escapeJsonTemplateValue(value) {\n"
            "  return JSON.stringify(escapeHtml(value)).slice(1, -1);\n"
            "}\n"
        )
        text = text.replace(anchor, helper + anchor, 1)
        changed = True

    additions = [
        ("      CANONICAL_URL: canonicalUrl,\n", "      CANONICAL_URL_JSON: escapeJsonTemplateValue(canonicalUrl),\n", "CANONICAL_URL_JSON"),
        ("      THUMBNAIL_URL: escapeHtml(entry.thumbnail),\n", "      THUMBNAIL_URL_JSON: escapeJsonTemplateValue(entry.thumbnail),\n", "THUMBNAIL_URL_JSON"),
        ("      COLLECTION_LABEL: escapeHtml(config.collectionName),\n", "      COLLECTION_LABEL_JSON: escapeJsonTemplateValue(config.collectionName),\n", "COLLECTION_LABEL_JSON"),
        ("      COLLECTION_URL: escapeHtml(config.collectionUrl),\n", "      COLLECTION_URL_JSON: escapeJsonTemplateValue(`${SITE_ORIGIN}${config.collectionUrl}`),\n", "COLLECTION_URL_JSON"),
        ("      TITLE: escapeHtml(entry.title || ''),\n", "      TITLE_JSON: escapeJsonTemplateValue(entry.title || ''),\n", "TITLE_JSON"),
        ("      YOUTUBE_ID: escapeHtml(youtubeId),\n", "      EMBED_URL_JSON: escapeJsonTemplateValue(`https://www.youtube.com/embed/${youtubeId}`),\n", "EMBED_URL_JSON"),
        ("      DESCRIPTION: escapeHtml(description),\n", "      DESCRIPTION_JSON: escapeJsonTemplateValue(description),\n", "DESCRIPTION_JSON"),
    ]
    for anchor, addition, marker in additions:
        text, did_change = insert_after(text, anchor, addition, marker)
        changed = changed or did_change

    old_upload = "      UPLOAD_DATE: escapeHtml(toIsoDate(entry.created_at)),"
    new_upload = "      UPLOAD_DATE_JSON: escapeJsonTemplateValue(toIsoDate(entry.created_at)),"
    text, did_change = replace_state(text, old_upload, new_upload, "upload-date mapping")
    changed = changed or did_change

    old_duration = r'''      VIDEO_DURATION_FIELD: entry.duration ? `,\n      "duration": "${escapeHtml(entry.duration)}"` : ','''
    new_duration = r'''      VIDEO_DURATION_FIELD: entry.duration
        ? `,\n      "duration": "${escapeJsonTemplateValue(entry.duration)}"`
        : ','''
    text, did_change = replace_state(text, old_duration, new_duration, "duration mapping")
    changed = changed or did_change

    return write(GENERATOR, text) or changed


def apply_game_placeholder() -> tuple[bool, bool]:
    shell = GAME_SHELL.read_text(encoding="utf-8")
    shell, shell_changed = replace_state(shell, OLD_PLACEHOLDER, NEW_PLACEHOLDER, "game placeholder")
    write(GAME_SHELL, shell)

    loader = GAME_LOADER.read_text(encoding="utf-8")
    loader, loader_changed = replace_state(loader, OLD_FALLBACK, NEW_FALLBACK, "game schema population")
    write(GAME_LOADER, loader)
    return shell_changed, loader_changed


def run(*parts: str) -> None:
    subprocess.run(list(parts), cwd=ROOT, check=True)


def files(items: list[dict]) -> list[str]:
    return sorted({str(item.get("file")) for item in items if item.get("file")})


def main() -> None:
    before = audit_structured_data()
    invalid_before = files(before["invalid_jsonld"])
    empty_before = files(before["empty_jsonld"])
    already_fixed = not invalid_before and not empty_before

    if not already_fixed:
        if invalid_before != [INVALID_PAGE]:
            raise RuntimeError(f"Unexpected invalid JSON-LD baseline: {invalid_before}")
        if empty_before != [EMPTY_PAGE]:
            raise RuntimeError(f"Unexpected empty JSON-LD baseline: {empty_before}")
        if before["unresolved_templates"] or before["structural_issues"]:
            raise RuntimeError("Unexpected additional structured-data failures")

    template_changed = apply_template()
    generator_changed = apply_generator()
    shell_changed, loader_changed = apply_game_placeholder()

    run("node", "--check", "scripts/generate-retro-pages.js")
    run("node", "scripts/generate-retro-pages.js")

    after = audit_structured_data()
    failures = (
        after["invalid_jsonld"]
        + after["empty_jsonld"]
        + after["unresolved_templates"]
        + after["structural_issues"]
    )
    if failures:
        raise RuntimeError(json.dumps(failures[:20], indent=2, ensure_ascii=False))

    repaired = (ROOT / INVALID_PAGE).read_text(encoding="utf-8")
    if "\\n\\nArcade hardware" not in repaired:
        raise RuntimeError("Repaired retro JSON-LD does not contain escaped paragraph breaks")
    if NEW_PLACEHOLDER not in GAME_SHELL.read_text(encoding="utf-8"):
        raise RuntimeError("Untyped client schema placeholder is missing")
    if "fallback.type = 'application/ld+json';" not in GAME_LOADER.read_text(encoding="utf-8"):
        raise RuntimeError("Client schema placeholder is not typed when populated")

    summary = {
        "invalid_jsonld_before": 1,
        "invalid_jsonld_after": after["summary"]["invalid_jsonld_blocks"],
        "empty_jsonld_before": 1,
        "empty_jsonld_after": after["summary"]["empty_jsonld_blocks"],
        "unresolved_template_blocks_after": after["summary"]["unresolved_template_blocks"],
        "critical_structural_issues_after": after["summary"]["critical_structural_issues"],
        "public_html_pages_validated": after["summary"]["public_html_pages"],
        "jsonld_blocks_validated": after["summary"]["jsonld_blocks"],
    }
    report = {
        "summary": summary,
        "repairs": {
            "invalid_page": INVALID_PAGE,
            "empty_placeholder_page": EMPTY_PAGE,
            "template_changed_this_run": template_changed,
            "generator_changed_this_run": generator_changed,
            "shell_changed_this_run": shell_changed,
            "loader_changed_this_run": loader_changed,
            "already_fixed_at_start": already_fixed,
        },
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    JSON_REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    MD_REPORT.write_text(
        f"""# Phase 2B Schema Validity and Validation Gate

Phase 2B repairs the two syntax-level findings from the merged Phase 2A review and installs a permanent repository-wide structured-data validator.

## Results

| Check | Before | After |
|---|---:|---:|
| Invalid JSON-LD blocks | **1** | **{summary['invalid_jsonld_after']}** |
| Empty JSON-LD blocks | **1** | **{summary['empty_jsonld_after']}** |
| Unresolved JSON-LD template blocks | — | **{summary['unresolved_template_blocks_after']}** |
| Critical structured-data issues | — | **{summary['critical_structural_issues_after']}** |

## Repairs

- `{INVALID_PAGE}` now contains JSON-escaped paragraph breaks.
- `admin/templates/retro-video-template.html` uses dedicated JSON-safe placeholders.
- `scripts/generate-retro-pages.js` JSON-escapes schema values before insertion.
- `games/game.html` no longer exposes an empty JSON-LD block before data exists.
- `js/load-single-game.js` assigns the JSON-LD type when the client payload is populated.

## Permanent validation

`scripts/validate_structured_data.py` rejects invalid or empty JSON-LD, unresolved template tokens and critical `VideoObject`, `BreadcrumbList` or `VideoGame` field errors. The permanent workflow also regenerates retro pages and rejects stale generated output.

## Explicit exclusions

- `games/games.json` was not changed.
- The homepage and intro-loader stack were not changed.
- No dates, durations, ratings or authorship facts were invented.
- No navigation, CSS, sitemap or thumbnail changes were made.

## Rollback

Revert the Phase 2B squash merge commit.
""",
        encoding="utf-8",
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
