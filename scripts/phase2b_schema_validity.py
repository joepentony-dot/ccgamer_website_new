#!/usr/bin/env python3
"""Apply the bounded Phase 2B schema-validity corrections.

The script is intentionally idempotent. It repairs the reviewed invalid
retro-video JSON-LD output, converts the client-side game schema placeholder
into a non-JSON placeholder until populated, hardens the retro generator and
writes a concise before/after report.
"""

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
EMPTY_PLACEHOLDER_PAGE = "games/game.html"

TEMPLATE_PATH = ROOT / "admin" / "templates" / "retro-video-template.html"
GENERATOR_PATH = ROOT / "scripts" / "generate-retro-pages.js"
GAME_SHELL_PATH = ROOT / "games" / "game.html"
GAME_LOADER_PATH = ROOT / "js" / "load-single-game.js"

OLD_PLACEHOLDER = '<script type="application/ld+json" id="ccg-schema-fallback"></script>'
NEW_PLACEHOLDER = '<script id="ccg-schema-fallback" data-schema-placeholder="true"></script>'

OLD_FALLBACK_BLOCK = """    const fallback = document.getElementById('ccg-schema-fallback');
    if (fallback) {
        fallback.textContent = JSON.stringify(schema);
        return;
    }
"""
NEW_FALLBACK_BLOCK = """    const fallback = document.getElementById('ccg-schema-fallback');
    if (fallback) {
        fallback.type = 'application/ld+json';
        fallback.removeAttribute('data-schema-placeholder');
        fallback.textContent = JSON.stringify(schema);
        return;
    }
"""

ESCAPE_HTML_BLOCK = """function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
"""
ESCAPE_JSON_BLOCK = ESCAPE_HTML_BLOCK + """
function escapeJsonTemplateValue(value) {
  return JSON.stringify(escapeHtml(value)).slice(1, -1);
}
"""

OLD_TEMPLATE_VALUES = """    const html = applyTemplate(template, {
      SEO_TITLE: escapeHtml(seoTitle),
      SEO_DESCRIPTION: escapeHtml(seoDescription),
      CANONICAL_URL: canonicalUrl,
      THUMBNAIL_URL: escapeHtml(entry.thumbnail),
      COLLECTION_LABEL: escapeHtml(config.collectionName),
      COLLECTION_URL: escapeHtml(config.collectionUrl),
      TITLE: escapeHtml(entry.title || ''),
      SUMMARY: escapeHtml(summary),
      YOUTUBE_ID: escapeHtml(youtubeId),
      DESCRIPTION: escapeHtml(description),
      UPLOAD_DATE: escapeHtml(toIsoDate(entry.created_at)),
      VIDEO_DURATION_FIELD: entry.duration ? `,\n      "duration": "${escapeHtml(entry.duration)}"` : '',
      MEMBERS_BADGE: entry.membersOnly ? '<p class="game-tag">Members only</p>' : '',
      RELATED_ITEMS: relatedItemsHtml
    });
"""
NEW_TEMPLATE_VALUES = """    const html = applyTemplate(template, {
      SEO_TITLE: escapeHtml(seoTitle),
      SEO_DESCRIPTION: escapeHtml(seoDescription),
      CANONICAL_URL: canonicalUrl,
      CANONICAL_URL_JSON: escapeJsonTemplateValue(canonicalUrl),
      THUMBNAIL_URL: escapeHtml(entry.thumbnail),
      THUMBNAIL_URL_JSON: escapeJsonTemplateValue(entry.thumbnail),
      COLLECTION_LABEL: escapeHtml(config.collectionName),
      COLLECTION_LABEL_JSON: escapeJsonTemplateValue(config.collectionName),
      COLLECTION_URL: escapeHtml(config.collectionUrl),
      COLLECTION_URL_JSON: escapeJsonTemplateValue(`${SITE_ORIGIN}${config.collectionUrl}`),
      TITLE: escapeHtml(entry.title || ''),
      TITLE_JSON: escapeJsonTemplateValue(entry.title || ''),
      SUMMARY: escapeHtml(summary),
      YOUTUBE_ID: escapeHtml(youtubeId),
      EMBED_URL_JSON: escapeJsonTemplateValue(`https://www.youtube.com/embed/${youtubeId}`),
      DESCRIPTION: escapeHtml(description),
      DESCRIPTION_JSON: escapeJsonTemplateValue(description),
      UPLOAD_DATE_JSON: escapeJsonTemplateValue(toIsoDate(entry.created_at)),
      VIDEO_DURATION_FIELD: entry.duration
        ? `,\n      "duration": "${escapeJsonTemplateValue(entry.duration)}"`
        : '',
      MEMBERS_BADGE: entry.membersOnly ? '<p class="game-tag">Members only</p>' : '',
      RELATED_ITEMS: relatedItemsHtml
    });
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

EXPECTED_PUBLIC_CHANGES = [
    "admin/templates/retro-video-template.html",
    "games/game.html",
    "js/load-single-game.js",
    INVALID_PAGE,
    "scripts/generate-retro-pages.js",
]


def write_if_changed(path: Path, content: str) -> bool:
    previous = path.read_text(encoding="utf-8")
    if previous == content:
        return False
    path.write_text(content, encoding="utf-8")
    return True


def replace_once(text: str, old: str, new: str, label: str) -> tuple[str, bool]:
    old_count = text.count(old)
    new_count = text.count(new)
    if old_count == 1 and new_count == 0:
        return text.replace(old, new, 1), True
    if old_count == 0 and new_count == 1:
        return text, False
    raise RuntimeError(
        f"Unexpected {label} state: old occurrences={old_count}, new occurrences={new_count}"
    )


def apply_template_fix() -> bool:
    text = TEMPLATE_PATH.read_text(encoding="utf-8")
    changed = False
    for old, new in TEMPLATE_REPLACEMENTS.items():
        old_count = text.count(old)
        new_count = text.count(new)
        if old_count >= 1 and new_count == 0:
            text = text.replace(old, new)
            changed = True
        elif old_count == 0 and new_count >= 1:
            continue
        else:
            raise RuntimeError(
                f"Unexpected retro template state for {old!r}: old={old_count}, new={new_count}"
            )
    return write_if_changed(TEMPLATE_PATH, text) or changed


def apply_generator_fix() -> bool:
    text = GENERATOR_PATH.read_text(encoding="utf-8")
    text, helper_changed = replace_once(
        text, ESCAPE_HTML_BLOCK, ESCAPE_JSON_BLOCK, "JSON escaping helper"
    )
    text, mapping_changed = replace_once(
        text, OLD_TEMPLATE_VALUES, NEW_TEMPLATE_VALUES, "retro template values"
    )
    return write_if_changed(GENERATOR_PATH, text) or helper_changed or mapping_changed


def apply_game_placeholder_fix() -> tuple[bool, bool]:
    game_html = GAME_SHELL_PATH.read_text(encoding="utf-8")
    game_html, shell_changed = replace_once(
        game_html, OLD_PLACEHOLDER, NEW_PLACEHOLDER, "game schema placeholder"
    )
    write_if_changed(GAME_SHELL_PATH, game_html)

    loader = GAME_LOADER_PATH.read_text(encoding="utf-8")
    loader, loader_changed = replace_once(
        loader, OLD_FALLBACK_BLOCK, NEW_FALLBACK_BLOCK, "game schema population block"
    )
    write_if_changed(GAME_LOADER_PATH, loader)
    return shell_changed, loader_changed


def run(command: list[str]) -> None:
    subprocess.run(command, cwd=ROOT, check=True)


def issue_files(items: list[dict]) -> list[str]:
    return sorted({str(item.get("file") or "") for item in items if item.get("file")})


def main() -> None:
    before = audit_structured_data()
    before_invalid_files = issue_files(before["invalid_jsonld"])
    before_empty_files = issue_files(before["empty_jsonld"])
    already_corrected = not before_invalid_files and not before_empty_files

    if not already_corrected:
        if before_invalid_files != [INVALID_PAGE]:
            raise RuntimeError(f"Unexpected invalid JSON-LD baseline: {before_invalid_files}")
        if before_empty_files != [EMPTY_PLACEHOLDER_PAGE]:
            raise RuntimeError(f"Unexpected empty JSON-LD baseline: {before_empty_files}")
        if before["unresolved_templates"] or before["structural_issues"]:
            raise RuntimeError("Unexpected additional structured-data baseline failures")

    template_changed = apply_template_fix()
    generator_changed = apply_generator_fix()
    shell_changed, loader_changed = apply_game_placeholder_fix()

    run(["node", "--check", "scripts/generate-retro-pages.js"])
    run(["node", "scripts/generate-retro-pages.js"])

    after = audit_structured_data()
    failures = (
        after["invalid_jsonld"]
        + after["empty_jsonld"]
        + after["unresolved_templates"]
        + after["structural_issues"]
    )
    if failures:
        raise RuntimeError(f"Phase 2B validation still has failures: {json.dumps(failures[:20], indent=2)}")

    invalid_page_text = (ROOT / INVALID_PAGE).read_text(encoding="utf-8")
    if "\\n\\nArcade hardware" not in invalid_page_text:
        raise RuntimeError("The repaired retro page does not contain JSON-escaped paragraph breaks")
    if NEW_PLACEHOLDER not in GAME_SHELL_PATH.read_text(encoding="utf-8"):
        raise RuntimeError("The client-side schema placeholder was not converted")
    loader_text = GAME_LOADER_PATH.read_text(encoding="utf-8")
    if "fallback.type = 'application/ld+json';" not in loader_text:
        raise RuntimeError("The client-side schema script type is not assigned when populated")

    result = {
        "summary": {
            "invalid_jsonld_before": 1,
            "invalid_jsonld_after": after["summary"]["invalid_jsonld_blocks"],
            "empty_jsonld_before": 1,
            "empty_jsonld_after": after["summary"]["empty_jsonld_blocks"],
            "unresolved_template_blocks_after": after["summary"]["unresolved_template_blocks"],
            "critical_structural_issues_after": after["summary"]["critical_structural_issues"],
            "public_html_pages_validated": after["summary"]["public_html_pages"],
            "jsonld_blocks_validated": after["summary"]["jsonld_blocks"],
        },
        "repairs": {
            "invalid_page": INVALID_PAGE,
            "empty_placeholder_page": EMPTY_PLACEHOLDER_PAGE,
            "template_json_escaping_hardened": True,
            "generator_json_escaping_hardened": True,
            "client_placeholder_typed_only_when_populated": True,
            "template_changed_this_run": template_changed,
            "generator_changed_this_run": generator_changed,
            "shell_changed_this_run": shell_changed,
            "loader_changed_this_run": loader_changed,
            "already_corrected_at_start": already_corrected,
        },
        "expected_public_changes": EXPECTED_PUBLIC_CHANGES,
        "validator_summary": after["summary"],
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    JSON_REPORT.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    md = f"""# Phase 2B Schema Validity and Validation Gate

Phase 2B repairs the two syntax-level findings from the merged Phase 2A review and installs a permanent repository-wide structured-data validator.

## Results

| Check | Before | After |
|---|---:|---:|
| Invalid JSON-LD blocks | **1** | **{result['summary']['invalid_jsonld_after']}** |
| Empty JSON-LD blocks | **1** | **{result['summary']['empty_jsonld_after']}** |
| Unresolved JSON-LD template blocks | — | **{result['summary']['unresolved_template_blocks_after']}** |
| Critical structured-data issues | — | **{result['summary']['critical_structural_issues_after']}** |

## Repairs

- `{INVALID_PAGE}` now contains JSON-escaped paragraph breaks rather than literal control characters.
- `admin/templates/retro-video-template.html` now uses dedicated JSON-safe placeholders.
- `scripts/generate-retro-pages.js` now JSON-escapes schema values before template insertion.
- `games/game.html` no longer exposes an empty `application/ld+json` block before JavaScript has data.
- `js/load-single-game.js` assigns the JSON-LD type only when the schema payload is populated.

## Permanent gate

`scripts/validate_structured_data.py` checks all public HTML for:

- invalid or empty JSON-LD blocks
- unresolved template tokens
- required `VideoObject` fields and URL/date syntax
- ordered `BreadcrumbList` entries
- core `VideoGame` name and URL requirements

The permanent GitHub Actions workflow also regenerates retro pages and rejects uncommitted generated output.

## Explicit exclusions

- No changes to `games/games.json`.
- No changes to `index.html`, `home.html`, `complete-index.html`, `resources/css/intro.css` or `js/index-intro.js`.
- No upload dates, durations, ratings or authorship facts were invented.
- No navigation, CSS, sitemap or thumbnail changes were made.

## Rollback

Revert the Phase 2B squash merge commit.
"""
    MD_REPORT.write_text(md, encoding="utf-8")
    print(json.dumps(result["summary"], indent=2))


if __name__ == "__main__":
    main()
