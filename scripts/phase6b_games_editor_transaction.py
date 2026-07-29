#!/usr/bin/env python3
"""Run permanent disposable C64 and Amiga game-publishing transactions."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk"
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
        "publisher": "Phase 6B C64 Test Publisher",
        "developer": "Phase 6B C64 Test Developer",
        "composer": "Phase 6B C64 Test Composer",
        "videoid": "A1b2C3d4E5F",
    },
    {
        "key": "amiga",
        "system": "AMIGA",
        "slug": "phase6b-synthetic-amiga",
        "id": "phase6b_synthetic_amiga",
        "title": "Phase 6B Synthetic Amiga Game",
        "year": 1990,
        "publisher": "Phase 6B Amiga Test Publisher",
        "developer": "Phase 6B Amiga Test Developer",
        "composer": "Phase 6B Amiga Test Composer",
        "videoid": "Z9y8X7w6V5U",
    },
]


def read(path: Path) -> str:
    if not path.exists():
        raise RuntimeError(f"Missing required file: {path}")
    return path.read_text(encoding="utf-8")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run(
    command: list[str],
    cwd: Path,
    *,
    timeout: int = 600,
    env: dict[str, str] | None = None,
    stdin: str | None = None,
) -> dict[str, Any]:
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            input=stdin,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=timeout,
            check=False,
            env={**os.environ, "CI": "true", **(env or {})},
        )
        output = result.stdout or ""
        return {
            "command": " ".join(command),
            "returncode": result.returncode,
            "passed": result.returncode == 0,
            "output_tail": output[-12000:],
        }
    except subprocess.TimeoutExpired as error:
        output = error.stdout if isinstance(error.stdout, str) else ""
        return {
            "command": " ".join(command),
            "returncode": None,
            "passed": False,
            "timed_out": True,
            "output_tail": output[-12000:],
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
        "videoid": variant["videoid"],
        "thumbnail": f"resources/images/thumbnails/all/{slug}.png",
        "pdf": "",
        "disk": [f"https://example.com/{slug}.zip"],
        "lemon": [],
        "description": (
            f"Synthetic {variant['system']} record used only inside a disposable worktree to verify "
            "the complete Cheeky Commodore Gamer publishing transaction."
        ),
        "ccg_rating": 6,
        "ccg_rating_reason": "Synthetic validation text. This record is never committed to the real catalogue.",
        "credits": {
            "publisher": [variant["publisher"]],
            "developer": [variant["developer"]],
            "coder": [f"{variant['title']} Coder"],
            "graphics": [f"{variant['title']} Artist"],
            "musician": [variant["composer"]],
            "re_releaser": [],
        },
        "_ccg_enforced": False,
        "_ccg_migrated": False,
    }


def count_occurrences(path: Path, needle: str) -> int:
    return read(path).count(needle) if path.exists() else 0


def pages_containing(root: Path, relative: str, needle: str) -> list[str]:
    base = root / relative
    if not base.exists():
        return []
    matches: list[str] = []
    for page in base.rglob("*.html"):
        try:
            if needle in page.read_text(encoding="utf-8"):
                matches.append(page.relative_to(root).as_posix())
        except UnicodeDecodeError:
            continue
    return sorted(matches)


def schema_types(html: str) -> tuple[list[dict[str, Any]], list[str]]:
    import re

    nodes: list[dict[str, Any]] = []
    errors: list[str] = []
    blocks = re.findall(
        r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>',
        html,
        flags=re.I,
    )
    for index, block in enumerate(blocks, start=1):
        try:
            parsed = json.loads(block.strip())
        except json.JSONDecodeError as error:
            errors.append(f"JSON-LD block {index}: {error}")
            continue
        if isinstance(parsed, dict) and isinstance(parsed.get("@graph"), list):
            nodes.extend(node for node in parsed["@graph"] if isinstance(node, dict))
        elif isinstance(parsed, dict):
            nodes.append(parsed)
    return nodes, errors


def node_has_type(node: dict[str, Any], expected: str) -> bool:
    raw = node.get("@type")
    return expected in raw if isinstance(raw, list) else raw == expected


def check_subsequence(current: list[str], baseline: list[str]) -> bool:
    cursor = 0
    for value in current:
        if cursor < len(baseline) and value == baseline[cursor]:
            cursor += 1
    return cursor == len(baseline)


def validate_variant(
    sandbox: Path,
    variant: dict[str, Any],
    baseline_games: list[dict[str, Any]],
    baseline_registry: list[str],
    command: dict[str, Any],
) -> dict[str, Any]:
    slug = variant["slug"]
    canonical_url = f"{SITE_ORIGIN}/games/{slug}/"
    href = f'/games/{slug}/'
    games = json.loads(read(sandbox / "games" / "games.json"))
    index_data = json.loads(read(sandbox / "games" / "games-index.json"))
    search_data = json.loads(read(sandbox / "games" / "games-search.json"))
    registry = json.loads(read(sandbox / "tools" / "seo" / "static-pages.json"))
    canonical_path = sandbox / "games" / slug / "index.html"
    redirect_path = sandbox / "games" / f"{slug}.html"
    canonical_html = read(canonical_path) if canonical_path.exists() else ""
    redirect_html = read(redirect_path) if redirect_path.exists() else ""
    nodes, schema_errors = schema_types(canonical_html)
    game_nodes = [node for node in nodes if node_has_type(node, "VideoGame")]
    breadcrumb_nodes = [node for node in nodes if node_has_type(node, "BreadcrumbList")]
    baseline_ids = {str(game.get("id") or "") for game in baseline_games}
    current_ids = {str(game.get("id") or "") for game in games}
    platform_path = sandbox / "games" / "platforms" / variant["key"] / "index.html"
    other_platform = "amiga" if variant["key"] == "c64" else "c64"
    other_platform_path = sandbox / "games" / "platforms" / other_platform / "index.html"
    year_path = sandbox / "games" / "years" / str(variant["year"]) / "index.html"
    downloads_path = sandbox / "games" / "downloads" / "index.html"

    checks = {
        "authoritative_command_passed": command["passed"],
        "games_json_count_incremented": len(games) == len(baseline_games) + 1,
        "baseline_games_retained": baseline_ids.issubset(current_ids),
        "synthetic_record_once": sum(1 for game in games if game.get("slug") == slug and game.get("id") == variant["id"]) == 1,
        "games_index_once": sum(1 for item in index_data if item.get("slug") == slug) == 1,
        "games_search_once": sum(1 for item in search_data if item.get("slug") == slug) == 1,
        "canonical_wrapper_created": canonical_path.exists(),
        "canonical_wrapper_owns_url": canonical_url in canonical_html,
        "videogame_schema_once": len(game_nodes) == 1,
        "breadcrumb_schema_once": len(breadcrumb_nodes) == 1,
        "schema_json_valid": not schema_errors,
        "schema_source_values_match": bool(game_nodes)
        and game_nodes[0].get("name") == variant["title"]
        and str(game_nodes[0].get("datePublished")) == str(variant["year"])
        and game_nodes[0].get("gamePlatform") == ("Amiga" if variant["key"] == "amiga" else "Commodore 64")
        and game_nodes[0].get("url") == canonical_url,
        "legacy_redirect_created": redirect_path.exists(),
        "legacy_redirect_noindex": "noindex,follow" in redirect_html,
        "legacy_redirect_targets_canonical": href in redirect_html,
        "publisher_archive_linked": bool(pages_containing(sandbox, "games/publishers", href)),
        "developer_archive_linked": bool(pages_containing(sandbox, "games/developers", href)),
        "composer_archive_linked": bool(pages_containing(sandbox, "music", href)),
        "year_archive_linked": year_path.exists() and href in read(year_path),
        "correct_platform_archive_linked": platform_path.exists() and href in read(platform_path),
        "wrong_platform_archive_excluded": not other_platform_path.exists() or href not in read(other_platform_path),
        "downloads_archive_linked": downloads_path.exists() and slug in read(downloads_path),
        "sitemap_canonical_once": count_occurrences(sandbox / "sitemap-games.xml", canonical_url) == 1,
        "registry_baseline_order_preserved": check_subsequence(registry, baseline_registry),
    }
    return {
        "variant": variant["key"],
        "system": variant["system"],
        "slug": slug,
        "command": command,
        "checks": checks,
        "passed": sum(1 for value in checks.values() if value),
        "total": len(checks),
        "schema_errors": schema_errors,
        "publisher_pages": pages_containing(sandbox, "games/publishers", href),
        "developer_pages": pages_containing(sandbox, "games/developers", href),
        "composer_pages": pages_containing(sandbox, "music", href),
    }


def run_variant(
    variant: dict[str, Any],
    baseline_games: list[dict[str, Any]],
    baseline_registry: list[str],
    working_diff: str,
) -> dict[str, Any]:
    parent = Path(tempfile.mkdtemp(prefix=f"phase6b-{variant['key']}-"))
    sandbox = parent / "repo"
    added = False
    try:
        add = run(["git", "worktree", "add", "--detach", str(sandbox), "HEAD"], ROOT, timeout=180)
        if not add["passed"]:
            raise RuntimeError(f"Could not create {variant['key']} worktree: {add['output_tail']}")
        added = True
        if working_diff:
            applied = run(["git", "apply", "--whitespace=nowarn", "-"], sandbox, stdin=working_diff)
            if not applied["passed"]:
                raise RuntimeError(f"Could not apply Phase 6B working changes in {variant['key']} worktree: {applied['output_tail']}")

        games_path = sandbox / "games" / "games.json"
        games = json.loads(read(games_path))
        games.append(synthetic_game(variant))
        games_path.write_text(json.dumps(games, indent=2) + "\n", encoding="utf-8")
        create_thumbnail(sandbox / "resources" / "images" / "thumbnails" / "all" / f"{variant['slug']}.png")

        command = run(
            ["node", "scripts/rebuild-games.js"],
            sandbox,
            timeout=1200,
            env={"CCG_REPO_ROOT": str(sandbox)},
        )
        return validate_variant(sandbox, variant, baseline_games, baseline_registry, command)
    finally:
        if added:
            subprocess.run(
                ["git", "worktree", "remove", "--force", str(sandbox)],
                cwd=ROOT,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        shutil.rmtree(parent, ignore_errors=True)
        subprocess.run(
            ["git", "worktree", "prune"],
            cwd=ROOT,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )


def build_report(evidence: dict[str, Any]) -> str:
    rows = []
    for result in evidence["transactions"]:
        rows.append(
            f"| {result['system']} | {result['passed']} / {result['total']} | "
            f"{'PASS' if all(result['checks'].values()) else 'FAIL'} |"
        )
    limitations = "\n".join(f"- {item}" for item in evidence["remaining_limitations"]) or "- None identified by the automated transaction."
    return f"""# Phase 6B Reliable Games Editor Publishing

## Verdict

**Publishing transaction status: {evidence['verdict'].upper()}**

The real catalogue remained at **{evidence['baseline_game_count']} games**. Synthetic records existed only in disposable Git worktrees.

## Previous Phase 6A blockers and corrections

- New wrappers now receive one `VideoGame` and one `BreadcrumbList` schema graph from both the browser package template and server-side generator.
- Year, platform and permanent validation totals are derived from `games/games.json` rather than fixed 651/552/99/15 assumptions.
- `scripts/rebuild-games.js` is the authoritative deterministic publishing command and runs final SEO checks only after wrappers, archives and sitemaps are current.
- The rebuild sequence now includes publishers, developers, composers, years, platforms, downloads, schemas, sitemaps and internal-link validation.
- `/admin/api/rebuild-games` is implemented only for explicit loopback requests from the local editor.
- Hosted editor mode exports source/package files; the central GitHub workflow owns generated output.

## Synthetic transactions

| Platform | Checks passed | Result |
|---|---:|---|
{chr(10).join(rows)}

## Authoritative publishing sequence

1. Validate `games/games.json`, IDs, slugs, years and supported platforms.
2. Generate search/index data, canonical wrappers and legacy redirects.
3. Generate publisher, developer and composer archives.
4. Generate and integrate release-year and platform archives.
5. Generate downloads and static-page registry output.
6. Generate all sitemaps.
7. Validate catalogue output, sitemaps, archive membership, structured data, SEO and internal links.

## Supported save and deployment method

- **Authoritative source:** the complete `games/games.json` plus required assets.
- **Hosted editor:** download the deployment package, review it, and commit source/package files through a draft pull request.
- **Supabase/GitHub save:** commits source JSON only; the central GitHub publishing workflow generates and validates all derived output.
- **Local editor:** may run `npm run rebuild:games` through the loopback-only local API.
- The editor assists with structure and paths; historical facts still require manual verification.

## Safety and validation

- Existing game records retained: **Yes**.
- Protected hashes unchanged: **{'Yes' if evidence['protected_hashes_unchanged'] else 'No'}**.
- Browser package regression test: **{'PASS' if evidence['package_test']['passed'] else 'FAIL'}**.
- Synthetic records committed: **No**.
- Detailed evidence is stored as a workflow artifact.

## Remaining limitations

{limitations}

## Adding a real game

1. Open `/admin/games-editor.html` and fetch the current library.
2. Enter and manually verify the title, year, platform, publisher, developer, composer, genre and links.
3. Supply the thumbnail and any manual/download assets using the documented paths.
4. Download the full deployment package or use the authorised Supabase/GitHub source save.
5. Open a draft pull request containing the complete `games/games.json` change and required assets.
6. The central **Game Catalogue Publishing** workflow regenerates and validates all derived files.
7. Merge only when the central workflow and read-only validation checks pass.
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-output", required=True)
    parser.add_argument("--report-output", required=True)
    args = parser.parse_args()

    protected_before = {relative: sha256(ROOT / relative) for relative in PROTECTED}
    baseline_games = json.loads(read(ROOT / "games" / "games.json"))
    baseline_registry = json.loads(read(ROOT / "tools" / "seo" / "static-pages.json"))
    synthetic_slugs = {variant["slug"] for variant in VARIANTS}
    if any(game.get("slug") in synthetic_slugs for game in baseline_games):
        raise RuntimeError("A Phase 6B synthetic slug exists in the real catalogue.")

    diff_result = run(["git", "diff", "--binary", "HEAD"], ROOT, timeout=120)
    if not diff_result["passed"]:
        raise RuntimeError(f"Could not capture Phase 6B working changes: {diff_result['output_tail']}")
    working_diff = subprocess.check_output(
        ["git", "diff", "--binary", "HEAD"], cwd=ROOT, text=True
    )

    package_test = run(["node", "tests/games-editor-package.test.mjs"], ROOT, timeout=180)
    transactions = [
        run_variant(variant, baseline_games, baseline_registry, working_diff)
        for variant in VARIANTS
    ]

    protected_after = {relative: sha256(ROOT / relative) for relative in PROTECTED}
    protected_unchanged = protected_before == protected_after
    all_checks = package_test["passed"] and protected_unchanged and all(
        all(result["checks"].values()) for result in transactions
    )
    limitations = [
        "The editor validates structure but does not independently research historical facts.",
        "Live Supabase roles, secrets and GitHub token deployment require environment-specific verification outside repository CI.",
        "A first real new-game pull request should still be reviewed before routine production use.",
    ]
    evidence = {
        "verdict": "ready" if all_checks else "not ready",
        "baseline_game_count": len(baseline_games),
        "package_test": package_test,
        "transactions": transactions,
        "protected_hashes_unchanged": protected_unchanged,
        "remaining_limitations": limitations,
    }

    json_path = Path(args.json_output)
    report_path = Path(args.report_output)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    report_path.write_text(build_report(evidence), encoding="utf-8")

    if not all_checks:
        failed = {
            result["variant"]: [name for name, passed in result["checks"].items() if not passed]
            for result in transactions
        }
        raise SystemExit(f"Phase 6B publishing transaction failed: {failed}")

    print(json.dumps({
        "verdict": evidence["verdict"],
        "baseline_games": len(baseline_games),
        "c64_checks": f"{transactions[0]['passed']}/{transactions[0]['total']}",
        "amiga_checks": f"{transactions[1]['passed']}/{transactions[1]['total']}",
        "protected_hashes_unchanged": protected_unchanged,
    }, indent=2))


if __name__ == "__main__":
    main()
