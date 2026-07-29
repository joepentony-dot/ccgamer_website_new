#!/usr/bin/env python3
"""Audit the complete Games Editor publishing chain using a disposable synthetic game."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SYNTHETIC_SLUG = "phase6a-synthetic-game"
SYNTHETIC_ID = "phase6a_synthetic_game"
SYNTHETIC_TITLE = "Phase 6A Synthetic Game"
SYNTHETIC_PUBLISHER = "Phase 6A Test Publisher"
SYNTHETIC_DEVELOPER = "Phase 6A Test Developer"
SYNTHETIC_COMPOSER = "Phase 6A Test Composer"
SYNTHETIC_YEAR = 1990
SYNTHETIC_THUMBNAIL = f"resources/images/thumbnails/all/{SYNTHETIC_SLUG}.png"
SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk"
PROTECTED = [
    "index.html",
    "home.html",
    "resources/css/intro.css",
    "js/index-intro.js",
    "games/games.json",
]


def read(path: Path) -> str:
    if not path.exists():
        raise RuntimeError(f"Missing required file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run(command: list[str], cwd: Path, timeout: int = 180) -> dict[str, Any]:
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=timeout,
            check=False,
            env={**os.environ, "CI": "true"},
        )
        output = result.stdout or ""
        return {
            "command": " ".join(command),
            "returncode": result.returncode,
            "passed": result.returncode == 0,
            "output_tail": output[-4000:],
        }
    except subprocess.TimeoutExpired as error:
        output = (error.stdout or "") if isinstance(error.stdout, str) else ""
        return {
            "command": " ".join(command),
            "returncode": None,
            "passed": False,
            "timed_out": True,
            "output_tail": output[-4000:],
        }


def count_occurrences(path: Path, needle: str) -> int:
    if not path.exists():
        return 0
    return read(path).count(needle)


def pages_containing(root: Path, directory: str, needle: str) -> list[str]:
    base = root / directory
    if not base.exists():
        return []
    matches: list[str] = []
    for path in base.rglob("*.html"):
        try:
            if needle in path.read_text(encoding="utf-8"):
                matches.append(path.relative_to(root).as_posix())
        except UnicodeDecodeError:
            continue
    return sorted(matches)


def synthetic_game() -> dict[str, Any]:
    return {
        "system": "C64",
        "id": SYNTHETIC_ID,
        "slug": SYNTHETIC_SLUG,
        "title": SYNTHETIC_TITLE,
        "sorttitle": SYNTHETIC_TITLE,
        "year": SYNTHETIC_YEAR,
        "genres": ["arcade"],
        "collections": [],
        "videoid": "A1b2C3d4E5F",
        "thumbnail": SYNTHETIC_THUMBNAIL,
        "music": [SYNTHETIC_COMPOSER],
        "pdf": "",
        "disk": ["https://example.com/phase6a-synthetic-game.zip"],
        "lemon": [],
        "description": (
            "Synthetic C64 audit record used only inside a disposable worktree to verify the complete "
            "Games Editor publishing and archive-generation chain."
        ),
        "ccg_rating": 6,
        "ccg_rating_reason": (
            "Synthetic validation text used only to test package generation and is never committed to the real database."
        ),
        "credits": {
            "publisher": [SYNTHETIC_PUBLISHER],
            "developer": [SYNTHETIC_DEVELOPER],
            "coder": ["Phase 6A Test Coder"],
            "graphics": ["Phase 6A Test Artist"],
            "musician": [SYNTHETIC_COMPOSER],
            "re_releaser": [],
        },
        "_ccg_enforced": False,
        "_ccg_migrated": False,
    }


def create_thumbnail(path: Path) -> None:
    # Valid 1x1 transparent PNG. It exists only in the disposable worktree.
    png = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def inspect_editor_sources() -> dict[str, Any]:
    editor_source = read(ROOT / "admin" / "js" / "games-editor.js")
    api_source = read(ROOT / "scripts" / "admin-local-api.js")
    games_api = read(ROOT / "admin" / "js" / "games-api.js")
    docs = read(ROOT / "admin" / "GAMES_EDITOR.md")
    rebuild = read(ROOT / "scripts" / "rebuild-games.js")
    phase4d = read(ROOT / "scripts" / "validate-year-platform-discovery.js")

    expected_entry_keys = [
        "system", "id", "slug", "title", "sorttitle", "year", "genres", "collections",
        "videoid", "thumbnail", "pdf", "disk", "description", "ccg_rating",
        "ccg_rating_reason", "credits",
    ]
    mapping = {key: bool(re.search(rf"\b{re.escape(key)}\s*[:,]", editor_source)) for key in expected_entry_keys}

    rebuild_scripts = re.findall(r"runNodeScript\('([^']+)'\)", rebuild)
    expected_generators = [
        "build-games.js",
        "generate-publisher-pages.js",
        "generate-developer-pages.js",
        "generate-composer-pages.js",
        "generate-year-platform-pages.js",
        "integrate-year-platform-discovery.js",
        "generate-downloads-page.js",
        "update-downloads-static-pages.js",
        "generate-sitemaps.js",
    ]

    fixed_expectations = {
        "phase4d_game_count_651": "archiveData.games.length !== 651" in phase4d,
        "phase4d_c64_count_552": 'platformLinkTotals.get("c64") !== 552' in phase4d,
        "phase4d_amiga_count_99": 'platformLinkTotals.get("amiga") !== 99' in phase4d,
        "phase4d_year_count_15": "years.length !== 15" in phase4d,
    }

    return {
        "entry_field_mapping": mapping,
        "all_expected_entry_fields_present": all(mapping.values()),
        "editor_fetches_live_games_json": "fetch('../games/games.json'" in editor_source,
        "duplicate_slug_check": "state.slugSet.has(slug)" in editor_source,
        "duplicate_id_check": "state.idSet.has(id)" in editor_source,
        "package_includes_canonical_wrapper": "canonicalWrapperHtml" in editor_source,
        "package_includes_legacy_redirect": "legacyRedirectHtml" in editor_source,
        "package_includes_search_and_index": "gamesIndex" in editor_source and "gamesSearch" in editor_source,
        "browser_rebuild_button_present": "'/admin/api/rebuild-games'" in editor_source,
        "browser_rebuild_endpoint_implemented": "/admin/api/rebuild-games" in api_source,
        "local_games_api_mode": "client-download" if "mode: 'client-download'" in games_api else "unknown",
        "docs_describe_repository_commit": "commit" in docs.lower() and "deployment" in docs.lower(),
        "rebuild_scripts": rebuild_scripts,
        "expected_generators": expected_generators,
        "missing_from_rebuild_games": [name for name in expected_generators if name not in rebuild_scripts],
        "fixed_expectations": fixed_expectations,
    }


def validate_sandbox_outputs(sandbox: Path, baseline_count: int) -> dict[str, Any]:
    games = json.loads(read(sandbox / "games" / "games.json"))
    index_data = json.loads(read(sandbox / "games" / "games-index.json")) if (sandbox / "games" / "games-index.json").exists() else []
    search_data = json.loads(read(sandbox / "games" / "games-search.json")) if (sandbox / "games" / "games-search.json").exists() else []

    canonical = sandbox / "games" / SYNTHETIC_SLUG / "index.html"
    redirect = sandbox / "games" / f"{SYNTHETIC_SLUG}.html"
    canonical_html = read(canonical) if canonical.exists() else ""
    redirect_html = read(redirect) if redirect.exists() else ""
    canonical_url = f"{SITE_ORIGIN}/games/{SYNTHETIC_SLUG}/"
    game_href = f'/games/{SYNTHETIC_SLUG}/'

    publisher_pages = pages_containing(sandbox, "games/publishers", game_href)
    developer_pages = pages_containing(sandbox, "games/developers", game_href)
    composer_pages = pages_containing(sandbox, "music", game_href)

    year_page = sandbox / "games" / "years" / str(SYNTHETIC_YEAR) / "index.html"
    c64_page = sandbox / "games" / "platforms" / "c64" / "index.html"
    downloads_page = sandbox / "games" / "downloads" / "index.html"
    sitemap = sandbox / "sitemap-games.xml"

    checks = {
        "games_json_count_incremented": len(games) == baseline_count + 1,
        "synthetic_record_once": sum(1 for game in games if game.get("slug") == SYNTHETIC_SLUG) == 1,
        "games_index_once": sum(1 for item in index_data if item.get("slug") == SYNTHETIC_SLUG) == 1,
        "games_search_once": sum(1 for item in search_data if item.get("slug") == SYNTHETIC_SLUG) == 1,
        "canonical_wrapper_created": canonical.exists(),
        "canonical_wrapper_owns_url": canonical_url in canonical_html,
        "canonical_wrapper_has_videogame_schema": '"@type": "VideoGame"' in canonical_html,
        "canonical_wrapper_has_breadcrumb_schema": '"@type": "BreadcrumbList"' in canonical_html,
        "legacy_redirect_created": redirect.exists(),
        "legacy_redirect_noindex": "noindex,follow" in redirect_html,
        "legacy_redirect_targets_canonical": game_href in redirect_html,
        "publisher_archive_linked": bool(publisher_pages),
        "developer_archive_linked": bool(developer_pages),
        "composer_archive_linked": bool(composer_pages),
        "year_archive_linked": year_page.exists() and game_href in read(year_page),
        "c64_archive_linked": c64_page.exists() and game_href in read(c64_page),
        "downloads_archive_linked": downloads_page.exists() and SYNTHETIC_SLUG in read(downloads_page),
        "sitemap_canonical_once": count_occurrences(sitemap, canonical_url) == 1,
    }

    return {
        "checks": checks,
        "passed": sum(1 for value in checks.values() if value),
        "total": len(checks),
        "publisher_pages": publisher_pages,
        "developer_pages": developer_pages,
        "composer_pages": composer_pages,
    }


def build_report(evidence: dict[str, Any]) -> str:
    source = evidence["source_inspection"]
    sandbox = evidence["sandbox"]
    outputs = sandbox["output_validation"]
    blockers = evidence["blockers"]
    command_rows = "\n".join(
        f"| `{item['command']}` | {'PASS' if item['passed'] else 'FAIL'} |"
        for item in sandbox["commands"]
    )
    check_rows = "\n".join(
        f"| {name.replace('_', ' ')} | {'PASS' if passed else 'FAIL'} |"
        for name, passed in outputs["checks"].items()
    )
    blocker_lines = "\n".join(f"- {item}" for item in blockers) or "- None found."
    missing_generators = ", ".join(f"`{name}`" for name in source["missing_from_rebuild_games"]) or "None"

    return f"""# Phase 6A Games Editor Publishing Audit

## Verdict

**Current publishing readiness: {evidence['verdict'].upper()}**

The audit used a synthetic 652nd game only inside a disposable Git worktree. The real `games/games.json` and protected homepage files were not changed.

## Current database

- Existing game records: **{evidence['baseline_game_count']}**
- Synthetic sandbox records: **{sandbox['synthetic_game_count']}**
- Existing browser package regression test: **{'PASS' if evidence['existing_package_test']['passed'] else 'FAIL'}**
- Synthetic output checks passed: **{outputs['passed']} / {outputs['total']}**

## Editor source inspection

- Expected game-entry fields mapped: **{'Yes' if source['all_expected_entry_fields_present'] else 'No'}**
- Duplicate slug validation: **{'Present' if source['duplicate_slug_check'] else 'Missing'}**
- Duplicate ID validation: **{'Present' if source['duplicate_id_check'] else 'Missing'}**
- Canonical wrapper included in package: **{'Yes' if source['package_includes_canonical_wrapper'] else 'No'}**
- Legacy redirect included in package: **{'Yes' if source['package_includes_legacy_redirect'] else 'No'}**
- Search and index output included: **{'Yes' if source['package_includes_search_and_index'] else 'No'}**
- Browser rebuild button exists: **{'Yes' if source['browser_rebuild_button_present'] else 'No'}**
- Matching rebuild API endpoint exists: **{'Yes' if source['browser_rebuild_endpoint_implemented'] else 'No'}**
- Local save mode: **{source['local_games_api_mode']}**

## Generator command results

| Command | Result |
|---|---|
{command_rows}

## Synthetic game output results

| Check | Result |
|---|---|
{check_rows}

## Rebuild coverage

`scripts/rebuild-games.js` currently calls:

{', '.join(f'`{name}`' for name in source['rebuild_scripts'])}

Expected publishing generators missing from that runner: {missing_generators}.

## Fixed-total safeguards

- Phase 4D fixed game total of 651: **{'Present' if source['fixed_expectations']['phase4d_game_count_651'] else 'Not found'}**
- Phase 4D fixed C64 total of 552: **{'Present' if source['fixed_expectations']['phase4d_c64_count_552'] else 'Not found'}**
- Phase 4D fixed Amiga total of 99: **{'Present' if source['fixed_expectations']['phase4d_amiga_count_99'] else 'Not found'}**
- Phase 4D fixed represented-year total of 15: **{'Present' if source['fixed_expectations']['phase4d_year_count_15'] else 'Not found'}**

## Blocking findings

{blocker_lines}

## Recommended Phase 6B correction order

1. Replace fixed database totals with data-derived expectations while retaining minimum baseline and uniqueness safeguards.
2. Establish one authoritative game publishing command that regenerates game wrappers, search/index data, publishers, developers, composers, years, platforms, downloads and sitemaps in a deterministic order.
3. Implement the browser rebuild endpoint for the supported deployment environment, or remove/rename the button so it cannot imply a function that is unavailable.
4. Reconcile package download, local browser download and Supabase/GitHub save modes into one documented publishing workflow.
5. Add a permanent synthetic-game transaction test that creates, validates and removes a temporary record without committing it.
6. Retest a real new-game addition through a draft pull request before declaring the editor production-ready.

## Safety

- No synthetic game was committed.
- No public HTML, CSS, JavaScript or game data was changed by this audit.
- `index.html`, `home.html`, `resources/css/intro.css`, `js/index-intro.js` and the real `games/games.json` retained their original hashes.
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-output", required=True)
    parser.add_argument("--report-output", required=True)
    args = parser.parse_args()

    protected_before = {relative: sha256(ROOT / relative) for relative in PROTECTED}
    games = json.loads(read(ROOT / "games" / "games.json"))
    if not isinstance(games, list):
        raise RuntimeError("games/games.json must contain an array")
    if any(game.get("slug") == SYNTHETIC_SLUG for game in games):
        raise RuntimeError("Synthetic Phase 6A slug already exists in the real database")

    evidence: dict[str, Any] = {
        "baseline_game_count": len(games),
        "source_inspection": inspect_editor_sources(),
        "existing_package_test": run(["node", "tests/games-editor-package.test.mjs"], ROOT),
    }

    sandbox_parent = Path(tempfile.mkdtemp(prefix="phase6a-"))
    sandbox = sandbox_parent / "repo"
    worktree_added = False
    commands: list[dict[str, Any]] = []

    try:
        add = run(["git", "worktree", "add", "--detach", str(sandbox), "HEAD"], ROOT, timeout=120)
        if not add["passed"]:
            raise RuntimeError(f"Could not create disposable worktree: {add['output_tail']}")
        worktree_added = True

        sandbox_games_path = sandbox / "games" / "games.json"
        sandbox_games = json.loads(read(sandbox_games_path))
        sandbox_games.append(synthetic_game())
        sandbox_games_path.write_text(json.dumps(sandbox_games, indent=2) + "\n", encoding="utf-8")
        create_thumbnail(sandbox / SYNTHETIC_THUMBNAIL)

        command_list = [
            ["node", "scripts/build-games.js"],
            ["node", "scripts/generate-publisher-pages.js"],
            ["node", "scripts/generate-developer-pages.js"],
            ["node", "scripts/generate-composer-pages.js"],
            ["node", "scripts/generate-year-platform-pages.js"],
            ["node", "scripts/integrate-year-platform-discovery.js"],
            ["node", "scripts/generate-downloads-page.js"],
            ["node", "scripts/update-downloads-static-pages.js"],
            ["node", "scripts/generate-sitemaps.js"],
            ["node", "scripts/validate-sitemaps.js"],
            ["node", "scripts/validate-year-platform-discovery.js"],
        ]
        for command in command_list:
            commands.append(run(command, sandbox, timeout=240))

        output_validation = validate_sandbox_outputs(sandbox, len(games))
        evidence["sandbox"] = {
            "synthetic_game_count": len(json.loads(read(sandbox_games_path))),
            "commands": commands,
            "output_validation": output_validation,
        }
    finally:
        if worktree_added:
            subprocess.run(
                ["git", "worktree", "remove", "--force", str(sandbox)],
                cwd=ROOT,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        shutil.rmtree(sandbox_parent, ignore_errors=True)
        subprocess.run(
            ["git", "worktree", "prune"],
            cwd=ROOT,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )

    protected_after = {relative: sha256(ROOT / relative) for relative in PROTECTED}
    if protected_before != protected_after:
        raise RuntimeError("Protected file hashes changed during the read-only Phase 6A audit")

    source = evidence["source_inspection"]
    outputs = evidence["sandbox"]["output_validation"]
    blockers: list[str] = []
    if not evidence["existing_package_test"]["passed"]:
        blockers.append("The existing Games Editor package regression test fails.")
    if not all(outputs["checks"].values()):
        failed = [name for name, value in outputs["checks"].items() if not value]
        blockers.append(f"Synthetic publishing output is incomplete: {', '.join(failed)}.")
    if source["browser_rebuild_button_present"] and not source["browser_rebuild_endpoint_implemented"]:
        blockers.append("The editor exposes a Rebuild Everything button, but the local admin API does not implement `/admin/api/rebuild-games`.")
    if source["missing_from_rebuild_games"]:
        blockers.append(
            "The documented rebuild runner does not call every archive generator: "
            + ", ".join(source["missing_from_rebuild_games"])
            + "."
        )
    if any(source["fixed_expectations"].values()):
        blockers.append("Permanent validators still contain fixed 651/552/99/15 totals, so a legitimate new game can fail CI.")
    if source["local_games_api_mode"] == "client-download" and source["docs_describe_repository_commit"]:
        blockers.append("Editor documentation and save implementations describe different deployment modes and need one authoritative workflow.")
    failed_commands = [item["command"] for item in evidence["sandbox"]["commands"] if not item["passed"]]
    if failed_commands:
        blockers.append("One or more real publishing commands fail with the synthetic record: " + ", ".join(failed_commands) + ".")

    evidence["blockers"] = blockers
    evidence["verdict"] = "ready" if not blockers else "not ready"
    evidence["protected_hashes_unchanged"] = True

    json_path = Path(args.json_output)
    report_path = Path(args.report_output)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    report_path.write_text(build_report(evidence), encoding="utf-8")

    print(json.dumps({
        "verdict": evidence["verdict"],
        "baseline_games": evidence["baseline_game_count"],
        "synthetic_output_checks": f"{outputs['passed']}/{outputs['total']}",
        "blockers": len(blockers),
    }, indent=2))


if __name__ == "__main__":
    main()
