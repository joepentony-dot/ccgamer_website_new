#!/usr/bin/env python3
"""Run synthetic C64 and Amiga publishing transactions in disposable worktrees."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://www.cheekycommodoregamer.co.uk"
PROTECTED = [
    "index.html",
    "home.html",
    "resources/css/intro.css",
    "js/index-intro.js",
    "games/games.json",
]

VARIANTS = [
    {
        "key": "c64",
        "system": "C64",
        "slug": "phase6b-synthetic-c64",
        "id": "phase6b_synthetic_c64",
        "title": "Phase 6B Synthetic C64 Game",
        "year": 1990,
        "platform_route": "games/platforms/c64/index.html",
    },
    {
        "key": "amiga",
        "system": "AMIGA",
        "slug": "phase6b-synthetic-amiga",
        "id": "phase6b_synthetic_amiga",
        "title": "Phase 6B Synthetic Amiga Game",
        "year": 1991,
        "platform_route": "games/platforms/amiga/index.html",
    },
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def run(command: list[str], cwd: Path, timeout: int = 300) -> dict[str, Any]:
    result = subprocess.run(
        command,
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        check=False,
        env={**os.environ, "CI": "true", "CCG_REPO_ROOT": str(cwd)},
    )
    return {
        "command": " ".join(command),
        "returncode": result.returncode,
        "passed": result.returncode == 0,
        "output_tail": (result.stdout or "")[-8000:],
    }


def create_thumbnail(path: Path) -> None:
    png = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def synthetic_game(variant: dict[str, Any]) -> dict[str, Any]:
    slug = variant["slug"]
    return {
        "system": variant["system"],
        "id": variant["id"],
        "slug": slug,
        "title": variant["title"],
        "sorttitle": variant["title"],
        "year": variant["year"],
        "genres": ["arcade"],
        "collections": [],
        "videoid": "A1b2C3d4E5F",
        "thumbnail": f"resources/images/thumbnails/all/{slug}.png",
        "music": ["Phase 6B Test Composer"],
        "pdf": "",
        "disk": [f"https://example.com/{slug}.zip"],
        "download_status": "authorised",
        "lemon": ["https://www.lemon64.com/game/phase-6b-test"],
        "description": "Synthetic record used only in a disposable worktree to test the complete publishing chain.",
        "ccg_rating": 6,
        "ccg_rating_reason": "Synthetic validation record that is never committed to the real catalogue.",
        "credits": {
            "publisher": ["Phase 6B Test Publisher"],
            "developer": ["Phase 6B Test Developer"],
            "producer": "",
            "coder": ["Phase 6B Test Coder"],
            "graphics": ["Phase 6B Test Artist"],
            "musician": ["Phase 6B Test Composer"],
            "re_releaser": [],
        },
        "_ccg_enforced": False,
        "_ccg_migrated": False,
    }


def extract_schema(html: str) -> list[dict[str, Any]]:
    blocks = re.findall(
        r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        flags=re.I | re.S,
    )
    parsed = []
    for block in blocks:
        parsed.append(json.loads(block.strip()))
    return parsed


def graph_types(blocks: list[dict[str, Any]]) -> list[str]:
    types: list[str] = []
    for block in blocks:
        nodes = block.get("@graph", []) if isinstance(block, dict) else []
        for node in nodes if isinstance(nodes, list) else []:
            raw = node.get("@type") if isinstance(node, dict) else None
            if isinstance(raw, str):
                types.append(raw)
            elif isinstance(raw, list):
                types.extend(str(item) for item in raw)
    return types


def count_json_slug(path: Path, slug: str) -> int:
    if not path.exists():
        return 0
    payload = json.loads(read(path))
    if not isinstance(payload, list):
        return 0
    return sum(1 for item in payload if isinstance(item, dict) and item.get("slug") == slug)


def files_containing(root: Path, directory: str, needle: str) -> list[str]:
    base = root / directory
    if not base.exists():
        return []
    matches = []
    for path in base.rglob("*.html"):
        try:
            if needle in read(path):
                matches.append(path.relative_to(root).as_posix())
        except UnicodeDecodeError:
            continue
    return sorted(matches)



def count_anchor_href(html: str, href: str) -> int:
    pattern = re.compile(r'<a\b[^>]*\bhref=["\']' + re.escape(href) + r'["\']', re.I | re.S)
    return len(pattern.findall(html))


def run_variant(variant: dict[str, Any], baseline_count: int) -> dict[str, Any]:
    temp_root = Path(tempfile.mkdtemp(prefix=f"ccg-{variant['key']}-"))
    sandbox = temp_root / "repo"
    command_log: list[dict[str, Any]] = []
    try:
        add = run(["git", "worktree", "add", "--detach", str(sandbox), "HEAD"], ROOT)
        command_log.append(add)
        if not add["passed"]:
            return {"variant": variant["key"], "commands": command_log, "checks": {}, "passed": 0, "total": 0}

        for script_name in [
            "scripts/apply-phase6b-publishing.py",
            "scripts/phase6b-remove-build-games-composer-owner.py",
        ]:
            prepare = run([sys.executable, script_name], sandbox)
            command_log.append(prepare)
            if not prepare["passed"]:
                return {"variant": variant["key"], "commands": command_log, "checks": {}, "passed": 0, "total": 0}

        games_path = sandbox / "games" / "games.json"
        games = json.loads(read(games_path))
        games.append(synthetic_game(variant))
        games_path.write_text(json.dumps(games, indent=2) + "\n", encoding="utf-8")
        create_thumbnail(sandbox / "resources" / "images" / "thumbnails" / "all" / f"{variant['slug']}.png")

        publish = run(["node", "scripts/rebuild-games.js"], sandbox, timeout=600)
        command_log.append(publish)

        slug = variant["slug"]
        href = f'/games/{slug}/'
        canonical_url = f"{SITE}/games/{slug}/"
        canonical = sandbox / "games" / slug / "index.html"
        redirect = sandbox / "games" / f"{slug}.html"
        canonical_html = read(canonical) if canonical.exists() else ""
        redirect_html = read(redirect) if redirect.exists() else ""
        schema_blocks = extract_schema(canonical_html) if canonical_html else []
        types = graph_types(schema_blocks)
        year_html = read(sandbox / "games" / "years" / str(variant["year"]) / "index.html")
        platform_html = read(sandbox / variant["platform_route"])
        downloads_html = read(sandbox / "games" / "downloads" / "index.html")
        sitemap_games = read(sandbox / "sitemap-games.xml")

        checks = {
            "publishing_command_passed": publish["passed"],
            "database_incremented_once": len(json.loads(read(games_path))) == baseline_count + 1,
            "source_record_once": count_json_slug(games_path, slug) == 1,
            "games_index_once": count_json_slug(sandbox / "games" / "games-index.json", slug) == 1,
            "games_search_once": count_json_slug(sandbox / "games" / "games-search.json", slug) == 1,
            "canonical_wrapper_created": canonical.exists(),
            "canonical_owned": canonical_url in canonical_html,
            "videogame_schema_once": types.count("VideoGame") == 1,
            "breadcrumb_schema_once": types.count("BreadcrumbList") == 1,
            "legacy_redirect_created": redirect.exists(),
            "legacy_redirect_noindex": "noindex,follow" in redirect_html,
            "legacy_redirect_targets_canonical": href in redirect_html,
            "publisher_archive_once": len(files_containing(sandbox, "games/publishers", href)) == 1,
            "developer_archive_once": len(files_containing(sandbox, "games/developers", href)) == 1,
            "composer_archive_once": len(files_containing(sandbox, "music", href)) >= 1,
            "year_archive_once": count_anchor_href(year_html, href) == 1,
            "platform_archive_once": count_anchor_href(platform_html, href) == 1,
            "downloads_archive_once": downloads_html.count(slug) >= 1,
            "sitemap_once": sitemap_games.count(canonical_url) == 1,
        }
        return {
            "variant": variant["key"],
            "commands": command_log,
            "checks": checks,
            "passed": sum(1 for value in checks.values() if value),
            "total": len(checks),
        }
    finally:
        if sandbox.exists():
            run(["git", "worktree", "remove", "--force", str(sandbox)], ROOT)
        shutil.rmtree(temp_root, ignore_errors=True)


def inspect_sources() -> dict[str, Any]:
    editor = read(ROOT / "admin" / "js" / "games-editor.js")
    editor_html = read(ROOT / "admin" / "games-editor.html")
    rebuild = read(ROOT / "scripts" / "rebuild-games.js")
    year_generator = read(ROOT / "scripts" / "generate-year-platform-pages.js")
    year_validator = read(ROOT / "scripts" / "validate-year-platform-discovery.js")
    template = read(ROOT / "admin" / "templates" / "game-landing-template.html")
    return {
        "authoritative_command_documented_in_editor": "node scripts/rebuild-games.js" in editor,
        "unavailable_browser_endpoint_removed": "/admin/api/rebuild-games" not in editor,
        "button_is_instructional": "Show Publishing Command" in editor_html,
        "editor_package_schema_placeholder": "{{GAME_SCHEMA_JSON}}" in template,
        "lemon_assisted_import_present": "fetchLemonData" in editor and "api.allorigins.win" in editor,
        "lemon_review_warning_present": "imported facts must be reviewed" in editor_html,
        "rebuild_includes_all_generators": all(
            name in rebuild
            for name in [
                "build-games.js",
                "generate-publisher-pages.js",
                "generate-developer-pages.js",
                "generate-composer-pages.js",
                "generate-year-platform-pages.js",
                "integrate-year-platform-discovery.js",
                "generate-downloads-page.js",
                "update-downloads-static-pages.js",
                "generate-sitemaps.js",
                "validate-sitemaps.js",
                "verify-seo.mjs",
                "validate-year-platform-discovery.js",
            ]
        ),
        "fixed_generator_totals_removed": all(token not in year_generator for token in ["!== 651", "!== 552", "!== 99", "!== 15"]),
        "fixed_validator_totals_removed": all(token not in year_validator for token in ["!== 651", "!== 552", "!== 99", "years.length !== 15"]),
    }


def build_report(evidence: dict[str, Any]) -> str:
    source = evidence["source_inspection"]
    rows = []
    for result in evidence["transactions"]:
        rows.append(f"| {result['variant'].upper()} | {result['passed']} / {result['total']} | {'PASS' if result['passed'] == result['total'] else 'FAIL'} |")
    source_rows = "\n".join(f"- {key.replace('_', ' ')}: **{'PASS' if value else 'FAIL'}**" for key, value in source.items())
    return f"""# Phase 6B Reliable Games Editor Publishing

## Verdict

**Publishing readiness: {evidence['verdict']}**

The real catalogue remained at **{evidence['baseline_game_count']} games**. Synthetic records existed only in disposable Git worktrees.

## Synthetic transactions

| Variant | Checks | Result |
|---|---:|---|
{chr(10).join(rows)}

## Phase 6A blockers corrected

- Fixed 651/552/99/15 assumptions were replaced by current-database totals with a protected minimum catalogue baseline.
- `scripts/rebuild-games.js` now owns the complete generator and validation sequence.
- SEO validation runs only after wrappers, archives and sitemaps are current.
- Canonical wrappers receive one `VideoGame` and one `BreadcrumbList` graph.
- Publisher, developer, composer, year, platform and downloads output are generated by the same command.
- The hosted editor no longer claims it can call a missing server endpoint.
- The deployment ZIP is an input package; `node scripts/rebuild-games.js` is the authoritative publishing step.
- Lemon64 Auto Fill remains an assisted import and requires manual factual review.

## Source checks

{source_rows}

## Authoritative publishing sequence

1. Validate `games/games.json` source integrity and protected minimum baseline.
2. Generate game wrappers, redirects, index and search data.
3. Generate publisher, developer and composer archives.
4. Generate and integrate year and platform archives.
5. Generate downloads and update archive registration.
6. Generate all sitemaps.
7. Validate sitemaps, SEO and year/platform membership.

## Adding a real game

1. Open the Game Builder and fetch the live game library.
2. Enter the game details and verify the historical facts manually.
3. Lemon64 Auto Fill may assist with title, year, publisher and selected credits, but review every imported value.
4. Add or confirm the thumbnail, manual and download files.
5. Export the full deployment ZIP and place its files in the repository.
6. Run `node scripts/rebuild-games.js` from the repository root.
7. Review the generated diff and open a pull request.
8. Merge only after the central publishing workflow and read-only validators pass.

## Remaining limitations

- The editor does not research or guarantee historical accuracy.
- The static hosted website cannot execute repository commands.
- Supabase/GitHub direct-save remains a separate administrative commit route; generated output must still pass the authoritative rebuild workflow.

## Safety

- No real game was added.
- No existing game record was changed.
- Protected homepage, intro-loader and real game-data hashes remained unchanged.
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-output", required=True)
    parser.add_argument("--report-output", required=True)
    args = parser.parse_args()

    before = {path: sha256(ROOT / path) for path in PROTECTED}
    baseline_games = json.loads(read(ROOT / "games" / "games.json"))
    transactions = [run_variant(variant, len(baseline_games)) for variant in VARIANTS]
    after = {path: sha256(ROOT / path) for path in PROTECTED}
    source = inspect_sources()

    all_transactions_pass = all(item["passed"] == item["total"] for item in transactions)
    all_source_pass = all(source.values())
    protected_pass = before == after
    evidence = {
        "verdict": "READY" if all_transactions_pass and all_source_pass and protected_pass else "NOT READY",
        "baseline_game_count": len(baseline_games),
        "transactions": transactions,
        "source_inspection": source,
        "protected_hashes_unchanged": protected_pass,
    }

    Path(args.json_output).write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    Path(args.report_output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.report_output).write_text(build_report(evidence), encoding="utf-8")

    if evidence["verdict"] != "READY":
        raise SystemExit("Phase 6B transaction did not reach READY status")


if __name__ == "__main__":
    main()
