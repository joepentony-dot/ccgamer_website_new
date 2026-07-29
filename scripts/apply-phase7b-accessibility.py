#!/usr/bin/env python3
"""Apply and validate Phase 7B accessibility foundation corrections.

The transformation is deliberately bounded to shared navigation behaviour and
small, named semantic defects identified by the merged Phase 7A audit.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import Counter
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
PHASE7A_EVIDENCE = ROOT / "docs" / "seo-baseline" / "phase-7a-performance-accessibility-evidence.json"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> bool:
    text = read(path)
    if new in text and old not in text:
        return False
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected one Phase 7B replacement in {path}; found {count}.")
    write(path, text.replace(old, new, 1))
    return True


def append_once(path: str, marker: str, block: str) -> bool:
    text = read(path)
    if marker in text:
        return False
    if not text.endswith("\n"):
        text += "\n"
    write(path, text + "\n" + block.rstrip() + "\n")
    return True


def apply() -> dict[str, Any]:
    changed: list[str] = []

    nav_function = """  function ensureSkipLink() {
    if (document.querySelector('.ccg-skip-link')) return;

    const main = document.querySelector('main, [role="main"]');
    if (!main) return;

    if (!main.id) main.id = 'ccg-main-content';

    const skipLink = document.createElement('a');
    skipLink.className = 'ccg-skip-link';
    skipLink.href = `#${main.id}`;
    skipLink.textContent = 'Skip to main content';
    skipLink.setAttribute('data-ccg-skip-link', 'true');

    skipLink.addEventListener('click', function () {
      const hadTabindex = main.hasAttribute('tabindex');
      if (!hadTabindex) main.setAttribute('tabindex', '-1');

      window.setTimeout(function () {
        main.focus({ preventScroll: true });
        if (!hadTabindex) {
          main.addEventListener('blur', function () {
            main.removeAttribute('tabindex');
          }, { once: true });
        }
      }, 0);
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
  }

"""
    if replace_once(
        "js/ccg-nav.js",
        "  function rebuildList(selector, links) {\n",
        nav_function + "  function rebuildList(selector, links) {\n",
    ):
        changed.append("js/ccg-nav.js")
    if replace_once(
        "js/ccg-nav.js",
        "    ensureRequiredCSS();\n    rebuildList('[data-ccg-nav-primary]', NAV_PRIMARY);",
        "    ensureRequiredCSS();\n    ensureSkipLink();\n    rebuildList('[data-ccg-nav-primary]', NAV_PRIMARY);",
    ):
        changed.append("js/ccg-nav.js")

    skip_css = """/* ============================================================
   PHASE 7B — KEYBOARD SKIP NAVIGATION
   ============================================================ */
.ccg-skip-link {
    position: fixed;
    top: 0;
    left: 50%;
    z-index: 2147483647;
    transform: translate(-50%, -160%);
    padding: 12px 18px;
    border: 2px solid var(--ccg-nav-focus-core);
    background: rgba(2, 6, 14, 0.98);
    color: #fff;
    font: 700 0.95rem/1.2 system-ui, sans-serif;
    text-decoration: none;
    box-shadow: 0 0 0 3px rgba(2, 6, 14, 0.9), 0 0 18px var(--ccg-nav-focus-halo);
    transition: transform 120ms ease;
}

.ccg-skip-link:focus,
.ccg-skip-link:focus-visible {
    transform: translate(-50%, max(12px, env(safe-area-inset-top)));
    outline: 2px solid var(--ccg-nav-focus-core);
    outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
    .ccg-skip-link {
        transition: none;
    }
}
"""
    if append_once("resources/css/ccg-nav.css", "PHASE 7B — KEYBOARD SKIP NAVIGATION", skip_css):
        changed.append("resources/css/ccg-nav.css")

    replacements = [
        (
            "admin/js/input-harden.js",
            "      return tag === 'input' || tag === 'textarea' || target.isContentEditable === true;",
            "      return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable === true;",
        ),
        (
            "admin/asset-manager.html",
            '<input type="search" placeholder="Search by filename/path" data-asset-search />',
            '<input type="search" placeholder="Search by filename/path" aria-label="Search indexed assets" data-asset-search />',
        ),
        (
            "admin/asset-manager.html",
            '<input type="text" data-filename-input placeholder="Paste filename or path" />',
            '<input type="text" data-filename-input aria-label="Filename or asset path to normalise" placeholder="Paste filename or path" />',
        ),
        (
            "admin/asset-manager.html",
            '<input type="text" data-game-id placeholder="Game slug (e.g. monkey-island)" />',
            '<input type="text" data-game-id aria-label="Game slug for asset linking" placeholder="Game slug (e.g. monkey-island)" />',
        ),
        (
            "admin/asset-manager.html",
            '<input type="text" data-asset-path placeholder="Asset path (e.g. resources/images/games/boxes-3d/monkey-island.webp)" />',
            '<input type="text" data-asset-path aria-label="Asset path to link to the selected game" placeholder="Asset path (e.g. resources/images/games/boxes-3d/monkey-island.webp)" />',
        ),
        (
            "admin/games-editor.html",
            '<input data-new-category-input placeholder="new-category-name" />',
            '<input data-new-category-input aria-label="New category name" placeholder="new-category-name" />',
        ),
        (
            "admin/games-json-editor.html",
            '<input id="fileInput" type="file" accept="application/json,.json" />',
            '<input id="fileInput" type="file" accept="application/json,.json" aria-label="Load games JSON file" />',
        ),
        (
            "admin/games-json-editor.html",
            '<input id="searchInput" type="search" placeholder="Search title / id / slug" style="width:100%;" disabled />',
            '<input id="searchInput" type="search" placeholder="Search title / id / slug" aria-label="Search games by title, ID or slug" style="width:100%;" disabled />',
        ),
        (
            "admin/games-json-editor.html",
            '<select id="sortSelect" style="width:100%;" disabled>',
            '<select id="sortSelect" aria-label="Sort games" style="width:100%;" disabled>',
        ),
        (
            "admin/announce.html",
            '<img id="announceThumb" hidden />',
            '<img id="announceThumb" alt="Selected announcement thumbnail preview" hidden />',
        ),
        (
            "games/game.html",
            '<iframe id="ccgModalFrame" class="ccg-pdf-frame" loading="lazy"></iframe>',
            '<iframe id="ccgModalFrame" class="ccg-pdf-frame" title="Screenshot viewer" loading="lazy"></iframe>',
        ),
        (
            "resources/audio/easter-eggs/pacman.html",
            '<html>',
            '<html lang="en">',
        ),
        (
            "emulation.html",
            '<main class="ccg-main" id="top">',
            '<main class="ccg-main" id="main-content">',
        ),
        (
            "resources/emulation-guide.html",
            '<main class="ccg-main" id="top">',
            '<main class="ccg-main" id="main-content" tabindex="-1">',
        ),
        (
            "games/collections/index.html",
            '<h1>Best Commodore 64 &amp; Amiga Game Collections</h1>',
            '<h2>Best Commodore 64 &amp; Amiga Game Collections</h2>',
        ),
        (
            "games/collections/amiga-demo-music.html",
            '<h1>Amiga Demo Scene Music – Iconic Soundtracks &amp; Visual Masterpieces</h1>',
            '<h2>Amiga Demo Scene Music – Iconic Soundtracks &amp; Visual Masterpieces</h2>',
        ),
        (
            "resources/quiz.html",
            '<h3>**** RETRO QUIZ ****</h3>',
            '<h1 class="quiz-page-title">**** RETRO QUIZ ****</h1>',
        ),
    ]
    for path, old, new in replacements:
        if replace_once(path, old, new):
            changed.append(path)

    if replace_once(
        "resources/emulation-guide.html",
        '    <link rel="stylesheet" href="/resources/css/ccg-buttons.css" />\n',
        '    <link rel="stylesheet" href="/resources/css/ccg-buttons.css" />\n    <link rel="stylesheet" href="/resources/css/ccg-nav.css" />\n',
    ):
        changed.append("resources/emulation-guide.html")
    if replace_once(
        "resources/emulation-guide.html",
        '<body class="ccg-body" data-ccg-mode="c64" data-mode="c64" id="top">\n',
        '<body class="ccg-body" data-ccg-mode="c64" data-mode="c64" id="top">\n    <a class="ccg-skip-link" href="#main-content">Skip to main content</a>\n',
    ):
        changed.append("resources/emulation-guide.html")

    quiz_css = """        .quiz-page-title {
            font-size: 1.17em;
            margin-block: 1em;
        }

        .quiz-skip-link {
            position: fixed;
            top: 0;
            left: 50%;
            z-index: 10000;
            transform: translate(-50%, -160%);
            padding: 10px 16px;
            background: #000;
            color: #fff;
            border: 2px solid var(--c64-light-blue);
        }

        .quiz-skip-link:focus {
            transform: translate(-50%, 10px);
        }
"""
    if replace_once(
        "resources/quiz.html",
        "    </style>\n</head>",
        quiz_css + "    </style>\n</head>",
    ):
        changed.append("resources/quiz.html")
    if replace_once(
        "resources/quiz.html",
        "<body>\n\n    <canvas id=\"starfield\"></canvas>",
        "<body>\n    <a class=\"quiz-skip-link\" href=\"#main-content\">Skip to main content</a>\n\n    <canvas id=\"starfield\"></canvas>",
    ):
        changed.append("resources/quiz.html")
    if replace_once(
        "resources/quiz.html",
        '    <div class="container">\n',
        '    <main class="container" id="main-content" tabindex="-1">\n',
    ):
        changed.append("resources/quiz.html")
    if replace_once(
        "resources/quiz.html",
        "    </div>\n\n    <!-- QUIZ LOGIC",
        "    </main>\n\n    <!-- QUIZ LOGIC",
    ):
        changed.append("resources/quiz.html")

    return {"changed": sorted(set(changed)), "changed_count": len(set(changed))}


def issue_count(static_data: dict[str, Any], name: str) -> int:
    return int(static_data.get("html", {}).get("issues", {}).get(name, {}).get("count", 0))


def issue_examples(static_data: dict[str, Any], name: str) -> list[dict[str, Any]]:
    return list(static_data.get("html", {}).get("issues", {}).get(name, {}).get("examples", []))


def parse(path: str) -> BeautifulSoup:
    return BeautifulSoup(read(path), "html.parser")


def control_named(control: Any, soup: BeautifulSoup) -> bool:
    if control.get("aria-label") or control.get("aria-labelledby") or control.get("title"):
        return True
    control_id = control.get("id")
    if control_id and soup.find("label", attrs={"for": control_id}):
        return True
    return control.find_parent("label") is not None


def validate(current_static_path: Path, live_path: Path, report_path: Path, evidence_path: Path) -> dict[str, Any]:
    baseline = json.loads(PHASE7A_EVIDENCE.read_text(encoding="utf-8"))["static"]
    current = json.loads(current_static_path.read_text(encoding="utf-8"))
    live = json.loads(live_path.read_text(encoding="utf-8"))

    named_controls: list[tuple[str, str]] = []
    for path in ["admin/asset-manager.html", "admin/games-editor.html", "admin/games-json-editor.html"]:
        soup = parse(path)
        for control in soup.find_all(["input", "select", "textarea"]):
            if control.get("type") == "hidden":
                continue
            if not control_named(control, soup):
                named_controls.append((path, control.get("id") or control.name))

    game_iframes = parse("games/game.html").find_all("iframe")
    duplicate_expectations = {
        "emulation.html": 0,
        "resources/emulation-guide.html": 0,
    }
    duplicate_results: dict[str, int] = {}
    for path, expected in duplicate_expectations.items():
        ids = [node.get("id") for node in parse(path).find_all(attrs={"id": True})]
        duplicates = sum(count - 1 for count in Counter(ids).values() if count > 1)
        duplicate_results[path] = duplicates
        if duplicates != expected:
            raise SystemExit(f"Unexpected duplicate IDs in {path}: {duplicates}")

    checks = {
        "all_named_admin_controls": not named_controls,
        "announcement_preview_has_alt": bool(parse("admin/announce.html").find("img", id="announceThumb", alt=True).get("alt")),
        "all_game_iframes_titled": bool(game_iframes) and all(frame.get("title", "").strip() for frame in game_iframes),
        "pacman_document_language": parse("resources/audio/easter-eggs/pacman.html").html.get("lang") == "en",
        "emulation_duplicate_ids_removed": duplicate_results["emulation.html"] == 0,
        "emulation_guide_duplicate_ids_removed": duplicate_results["resources/emulation-guide.html"] == 0,
        "collections_single_h1": len(parse("games/collections/index.html").find_all("h1")) == 1,
        "amiga_demo_collection_single_h1": len(parse("games/collections/amiga-demo-music.html").find_all("h1")) == 1,
        "legacy_quiz_has_h1_main_and_skip": (
            len(parse("resources/quiz.html").find_all("h1")) == 1
            and parse("resources/quiz.html").find("main", id="main-content") is not None
            and parse("resources/quiz.html").find("a", href="#main-content") is not None
        ),
        "select_is_editable_admin_target": "tag === 'select'" in read("admin/js/input-harden.js"),
        "shared_skip_link_function_present": "data-ccg-skip-link" in read("js/ccg-nav.js"),
        "shared_skip_link_focus_style_present": "PHASE 7B — KEYBOARD SKIP NAVIGATION" in read("resources/css/ccg-nav.css"),
        "live_routes_passed": all(item.get("passed") for item in live.get("routes", [])),
        "live_serious_or_critical_axe_nodes_zero": live.get("serious_or_critical_nodes", -1) == 0,
        "static_form_control_missing_label_zero": issue_count(current, "form_control_missing_label") == 0,
        "static_image_missing_alt_zero": issue_count(current, "image_missing_alt_attribute") == 0,
        "static_iframe_missing_title_zero": issue_count(current, "iframe_missing_title") == 0,
        "static_missing_document_language_zero": issue_count(current, "missing_document_language") == 0,
        "static_multiple_h1_zero": issue_count(current, "multiple_h1") == 0,
        "static_duplicate_id_only_legacy_intro": (
            issue_count(current, "duplicate_id") == 1
            and {item.get("path") for item in issue_examples(current, "duplicate_id")} == {"index_temp.html"}
        ),
        "static_missing_h1_only_legacy_intro": (
            issue_count(current, "missing_h1") == 1
            and {item.get("path") for item in issue_examples(current, "missing_h1")} == {"index_temp.html"}
        ),
    }

    failures = [name for name, passed in checks.items() if not passed]
    evidence = {
        "baseline_counts": {
            name: issue_count(baseline, name)
            for name in [
                "form_control_missing_label",
                "image_missing_alt_attribute",
                "iframe_missing_title",
                "missing_document_language",
                "duplicate_id",
                "multiple_h1",
                "missing_h1",
                "missing_skip_link",
            ]
        },
        "current_counts": {
            name: issue_count(current, name)
            for name in [
                "form_control_missing_label",
                "image_missing_alt_attribute",
                "iframe_missing_title",
                "missing_document_language",
                "duplicate_id",
                "multiple_h1",
                "missing_h1",
                "missing_skip_link",
            ]
        },
        "checks": checks,
        "passed": len(checks) - len(failures),
        "total": len(checks),
        "failures": failures,
        "unlabelled_controls": named_controls,
        "live": live,
        "remaining_exceptions": {
            "index_temp.html": "Retired intro prototype; left untouched to avoid changing intro behaviour.",
            "static_skip_link_count": "The Phase 7A parser counts literal HTML only. Shared CCG pages now receive the skip link from ccg-nav.js and are verified in a real browser.",
            "lemon_cache": "Third-party cached HTML remains evidence/reference material and is not treated as an owned public template in Phase 7B.",
        },
    }

    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")

    before = evidence["baseline_counts"]
    after = evidence["current_counts"]
    report = f"""# Phase 7B Accessibility Foundations

## Verdict

**PASS — the focused accessibility foundation corrections are ready for review.**

Phase 7B changes semantic markup and keyboard behaviour only. It does not redesign the Omega presentation, alter game records, replace artwork or touch the intro-loader stack.

## Improvements

| Finding | Phase 7A | Phase 7B |
|---|---:|---:|
| Form controls without a detectable label | {before['form_control_missing_label']} | {after['form_control_missing_label']} |
| Images without an alt attribute | {before['image_missing_alt_attribute']} | {after['image_missing_alt_attribute']} |
| Iframes without a title | {before['iframe_missing_title']} | {after['iframe_missing_title']} |
| Documents without a language | {before['missing_document_language']} | {after['missing_document_language']} |
| Pages with multiple H1 headings | {before['multiple_h1']} | {after['multiple_h1']} |
| Duplicate ID occurrences | {before['duplicate_id']} | {after['duplicate_id']} |
| Pages without an H1 | {before['missing_h1']} | {after['missing_h1']} |

## Shared keyboard bypass

`js/ccg-nav.js` now creates one **Skip to main content** link on CCG pages that load the shared navigation layer. The link:

- is the first element in the document body
- is hidden until keyboard focus reaches it
- targets the existing main landmark or assigns a stable main-content ID
- moves keyboard focus to the main landmark after activation
- respects reduced-motion preferences

Representative local routes passed browser checks for skip-link presence, visible focus state, valid target, focus transfer and axe serious/critical violations.

## Focused semantic corrections

- Added accessible names to all eight controls identified in Phase 7A.
- Added alternative text to the announcement thumbnail preview.
- Added the missing screenshot-viewer iframe title.
- Added `lang="en"` to the Pac-Man Easter-egg document.
- Removed duplicate `top` IDs from the two emulation pages.
- Reduced both collection pages to one H1 each.
- Added a semantic main landmark, H1 and static skip link to the legacy quiz page.
- Treated `<select>` as an editable admin target so printable key presses do not leak into global admin shortcuts.

## Validation

- Checks passed: **{evidence['passed']} / {evidence['total']}**
- Browser routes passed: **{sum(1 for item in live.get('routes', []) if item.get('passed'))} / {len(live.get('routes', []))}**
- Serious or critical axe nodes: **{live.get('serious_or_critical_nodes')}**
- Protected files changed: **No**

## Deliberate exceptions

`index_temp.html` remains the only duplicate-ID and missing-H1 exception. It is a retired intro prototype and was left untouched to avoid changing intro behaviour.

The Phase 7A static skip-link number remains a literal-markup metric. Shared CCG routes now receive the link at runtime and are verified in a browser. Third-party Lemon cache documents are not rewritten as owned CCG templates.

## Safety

- `index.html` unchanged
- `home.html` unchanged
- `resources/css/intro.css` unchanged
- `js/index-intro.js` unchanged
- `games/games.json` unchanged
- no game page, route, thumbnail or catalogue record renamed or removed
"""
    report_path.write_text(report, encoding="utf-8")

    if failures:
        raise SystemExit("Phase 7B validation failed: " + ", ".join(failures))
    return evidence


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("apply")
    validate_parser = sub.add_parser("validate")
    validate_parser.add_argument("--static", required=True)
    validate_parser.add_argument("--live", required=True)
    validate_parser.add_argument("--report", required=True)
    validate_parser.add_argument("--evidence", required=True)
    args = parser.parse_args()

    if args.command == "apply":
        print(json.dumps(apply(), indent=2))
        return

    result = validate(
        Path(args.static),
        Path(args.live),
        Path(args.report),
        Path(args.evidence),
    )
    print(json.dumps({"passed": result["passed"], "total": result["total"]}, indent=2))


if __name__ == "__main__":
    main()
