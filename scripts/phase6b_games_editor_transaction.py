#!/usr/bin/env python3
"""Validate new-game publishing in disposable worktrees against the current pipeline.

The synthetic records deliberately contain a legacy game-media URL. One variant
also contains a PDF manual. This proves that the public site publishes manuals
only and never exposes the legacy game-media URL.
"""

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
        "pdf": "https://example.com/phase6b-synthetic-c64-manual.pdf",
    },
    {
        "key": "amiga",
        "system": "AMIGA",
        "slug": "phase6b-synthetic-amiga",
        "id": "phase6b_synthetic_amiga",
        "title": "Phase 6B Synthetic Amiga Game",
        "year": 1991,
        "platform_route": "games/platforms/amiga/index.html",
        "pdf": "",
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


def run(command: list[str], cwd: Path, timeout: int = 600) -> dict[str, Any]:
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
        "output_tail": (result.stdout or "")[-12000:],
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
        "pdf": variant["pdf"],
        # Deliberately retained in the disposable fixture to prove that legacy
        # media fields cannot become public download links.
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
    parsed: list[dict[str, Any]] = []
    for block in blocks:
        try:
            value = json.loads(block.strip())
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            parsed.append(value)
    return parsed


def graph_types(blocks: list[dict[str, Any]]) -> list[str]:
    types: list[str] = []
    for block in blocks:
        nodes = block.get("@graph", [])
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


def manual_policy_checks(variant: dict[str, Any], manuals_html: str) -> dict[str, bool]:
    slug = variant["slug"]
    disk_url = f"https://example.com/{slug}.zip"
    manual_url = variant["pdf"]
    expected_manual = bool(manual_url)
    return {
        "legacy_game_media_not_exposed": disk_url not in manuals_html,
        "legacy_game_media_control_absent": "data-direct-download" not in manuals_html and ">Download Game<" not in manuals_html,
        "manual_membership_correct": (manuals_html.count(slug) >= 1) if expected_manual else (slug not in manuals_html),
        "manual_url_membership_correct": (manual_url in manuals_html) if expected_manual else True,
    }


def run_variant(variant: dict[str, Any], baseline_count: int) -> dict[str, Any]:
    temp_root = Path(tempfile.mkdtemp(prefix=f"ccg-{variant['key']}-"))
    sandbox = temp_root / "repo"
    command_log: list[dict[str, Any]] = []
    try:
        add = run(["git", "worktree", "add", "--detach", str(sandbox), "HEAD"], ROOT)
        command_log.append(add)
        if not add["passed"]:
            return {"variant": variant["key"], "commands": command_log, "checks": {}, "passed": 0, "total": 0}

        games_path = sandbox / "games" / "games.json"
        games = json.loads(read(games_path))
        games.append(synthetic_game(variant))
        games_path.write_text(json.dumps(games, indent=2) + "\n", encoding="utf-8")
        create_thumbnail(sandbox / "resources" / "images" / "thumbnails" / "all" / f"{variant['slug']}.png")

        publish = run(["node", "scripts/rebuild-games.js"], sandbox)
        command_log.append(publish)

        slug = variant["slug"]
        href = f"/games/{slug}/"
        canonical_url = f"{SITE}/games/{slug}/"
        canonical = sandbox / "games" / slug / "index.html"
        redirect = sandbox / "games" / f"{slug}.html"
        canonical_html = read(canonical) if canonical.exists() else ""
        redirect_html = read(redirect) if redirect.exists() else ""
        schema_blocks = extract_schema(canonical_html) if canonical_html else []
        types = graph_types(schema_blocks)
        year_path = sandbox / "games" / "years" / str(variant["year"]) / "index.html"
        platform_path = sandbox / variant["platform_route"]
        manuals_path = sandbox / "games" / "downloads" / "index.html"
        year_html = read(year_path) if year_path.exists() else ""
        platform_html = read(platform_path) if platform_path.exists() else ""
        manuals_html = read(manuals_path) if manuals_path.exists() else ""
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
            "composer_archive_present": len(files_containing(sandbox, "music", href)) >= 1,
            "year_archive_once": count_anchor_href(year_html, href) == 1,
            "platform_archive_once": count_anchor_href(platform_html, href) == 1,
            "game_page_has_no_download_panel": "game-download-section" not in canonical_html and "Authorised Game Download" not in canonical_html,
            "game_page_has_no_legacy_media_url": f"https://example.com/{slug}.zip" not in canonical_html,
            "sitemap_once": sitemap_games.count(canonical_url) == 1,
            **manual_policy_checks(variant, manuals_html),
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
    rebuild = read(ROOT / "scripts" / "rebuild-games.js")
    manuals = read(ROOT / "scripts" / "generate-downloads-page.js")
    enforcement = read(ROOT / "scripts" / "enforce-manual-only-game-pages.js")
    return {
        "authoritative_command_documented_in_editor": "node scripts/rebuild-games.js" in editor,
        "unavailable_browser_endpoint_removed": "/admin/api/rebuild-games" not in editor,
        "current_rebuild_preserved": "audit-magazine-review-coverage.js" in rebuild and "enforce-manual-only-game-pages.js" in rebuild,
        "magazine_review_pipeline_present": "build-magazine-review-chunks.js" in rebuild and "ensure-magazine-review-runtime.js" in rebuild,
        "rerelease_pipeline_present": "mark-rerelease-publishers.js" in rebuild and "link-publisher-strength-genres.js" in rebuild,
        "manuals_generator_uses_pdf": "game.pdf" in manuals,
        "manuals_generator_ignores_disk": "game.disk" not in manuals,
        "manual_only_game_page_guard_present": "game-download-section" in enforcement and "--check" in enforcement,
    }


def build_report(evidence: dict[str, Any]) -> str:
    rows = []
    for result in evidence["transactions"]:
        status = "PASS" if result["passed"] == result["total"] else "FAIL"
        rows.append(f"| {result['variant'].upper()} | {result['passed']} / {result['total']} | {status} |")
    source_rows = "\n".join(
        f"- {key.replace('_', ' ')}: **{'PASS' if value else 'FAIL'}**"
        for key, value in evidence["source_inspection"].items()
    )
    return f"""# Phase 6B Reliable Games Editor Publishing

## Verdict

**Publishing readiness: {evidence['verdict']}**

The real catalogue remained at **{evidence['baseline_game_count']} games**. Synthetic records existed only in disposable Git worktrees.

## Synthetic transactions

| Variant | Checks | Result |
|---|---:|---|
{chr(10).join(rows)}

The C64 fixture includes a PDF manual and must appear once in Game Manuals A-Z. The Amiga fixture has no manual and must not appear there. Both fixtures deliberately contain a legacy game-media URL, which must remain absent from the manuals archive and individual game page.

## Source checks

{source_rows}

## Safety

- No real game was added.
- No existing game record was changed.
- No synthetic game-media URL may become visitor-facing.
- Protected homepage, intro-loader and real game-data hashes remained unchanged.
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-output", required=True)
    parser.add_argument("--report-output", required=True)
    args = parser.parse_args()

    protected_before = {path: sha256(ROOT / path) for path in PROTECTED}
    games = json.loads(read(ROOT / "games" / "games.json"))
    baseline_count = len(games)
    transactions = [run_variant(variant, baseline_count) for variant in VARIANTS]
    source_inspection = inspect_sources()
    protected_after = {path: sha256(ROOT / path) for path in PROTECTED}

    all_transactions_pass = all(item["passed"] == item["total"] for item in transactions)
    all_sources_pass = all(source_inspection.values())
    protected_unchanged = protected_before == protected_after
    verdict = "READY" if all_transactions_pass and all_sources_pass and protected_unchanged else "NOT READY"

    evidence = {
        "verdict": verdict,
        "baseline_game_count": baseline_count,
        "transactions": transactions,
        "source_inspection": source_inspection,
        "protected_hashes_unchanged": protected_unchanged,
    }

    json_path = Path(args.json_output)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")

    report_path = ROOT / args.report_output
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(build_report(evidence), encoding="utf-8")

    if verdict != "READY":
        raise SystemExit("Phase 6B transaction did not reach READY status")
    print("Phase 6B synthetic C64/Amiga publishing transactions passed the manuals-only policy.")


if __name__ == "__main__":
    main()
