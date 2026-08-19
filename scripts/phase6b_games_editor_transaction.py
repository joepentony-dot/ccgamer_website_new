#!/usr/bin/env python3
"""Validate new-game publishing in disposable worktrees against production.

The C64 fixture has a PDF manual; the Amiga fixture deliberately does not.
Both carry a fake legacy game-media URL solely to prove that the public site
never exposes playable game media.
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
PROTECTED = ["index.html", "home.html", "resources/css/intro.css", "js/index-intro.js", "games/games.json"]

SYNTHETIC_DESCRIPTION = (
    "This synthetic archive description exists only to exercise the complete CCG game publishing pipeline in a disposable test worktree. "
    "It represents a fictional retro computer game with straightforward arcade play, a small set of stages, score-based objectives and a simple single-player structure. "
    "The record deliberately includes enough neutral editorial detail to satisfy the same description-quality rules applied to genuine catalogue additions. "
    "Nothing in this paragraph describes a real commercial release, and the fixture is never committed to the live game database. "
    "Its purpose is to verify generated game pages, archive membership, structured data, publisher and composer routes, manuals, sitemaps and the removal of visitor-facing game-media downloads. "
    "The test therefore mirrors a normal new-game publish without inventing historical facts about an actual title."
)

VARIANTS = [
    {"key": "c64", "system": "C64", "slug": "phase6b-synthetic-c64", "id": "phase6b_synthetic_c64", "video_id": "P6BC64TEST01", "title": "Phase 6B Synthetic C64 Game", "year": 1990, "platform_route": "games/platforms/c64/index.html", "pdf": "https://example.com/phase6b-synthetic-c64-manual.pdf"},
    {"key": "amiga", "system": "AMIGA", "slug": "phase6b-synthetic-amiga", "id": "phase6b_synthetic_amiga", "video_id": "P6BAMGTEST01", "title": "Phase 6B Synthetic Amiga Game", "year": 1991, "platform_route": "games/platforms/amiga/index.html", "pdf": ""},
]


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run(command: list[str], cwd: Path, timeout: int = 600) -> dict[str, Any]:
    result = subprocess.run(command, cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout, check=False, env={**os.environ, "CI": "true", "CCG_REPO_ROOT": str(cwd)})
    return {"command": " ".join(command), "returncode": result.returncode, "passed": result.returncode == 0, "output_tail": (result.stdout or "")[-12000:]}


def create_thumbnail(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="))


def synthetic_game(variant: dict[str, Any]) -> dict[str, Any]:
    slug = variant["slug"]
    return {
        "system": variant["system"], "id": variant["id"], "slug": slug, "title": variant["title"], "sorttitle": variant["title"], "year": variant["year"],
        "genres": ["arcade"], "collections": [], "videoid": variant["video_id"], "thumbnail": f"resources/images/thumbnails/all/{slug}.png",
        "music": ["Phase 6B Test Composer"], "pdf": variant["pdf"], "disk": [f"https://example.com/{slug}.zip"], "download_status": "authorised",
        "lemon": ["https://www.lemon64.com/game/phase-6b-test"], "description": SYNTHETIC_DESCRIPTION, "ccg_rating": 6,
        "ccg_rating_reason": "Synthetic validation record that is never committed to the real catalogue.",
        "credits": {"publisher": ["Phase 6B Test Publisher"], "developer": ["Phase 6B Test Developer"], "producer": "", "coder": ["Phase 6B Test Coder"], "graphics": ["Phase 6B Test Artist"], "musician": ["Phase 6B Test Composer"], "re_releaser": []},
        "_ccg_enforced": False, "_ccg_migrated": False,
    }


def inject_video_metadata(sandbox: Path, variant: dict[str, Any]) -> None:
    path = sandbox / "data" / "video-metadata.json"
    payload = json.loads(read(path))
    if not isinstance(payload, dict):
        payload = {"version": 1, "videos": {}}
    videos = payload.get("videos")
    if not isinstance(videos, dict):
        videos = {}
        payload["videos"] = videos
    video_id = variant["video_id"]
    videos[video_id] = {"videoId": video_id, "title": f"{variant['title']} Test Video", "description": SYNTHETIC_DESCRIPTION, "uploadDate": "2026-01-01T12:00:00Z", "duration": "PT5M", "thumbnailUrl": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"}
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def extract_schema(html: str) -> list[dict[str, Any]]:
    blocks = re.findall(r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, flags=re.I | re.S)
    parsed = []
    for block in blocks:
        try:
            value = json.loads(block.strip())
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            parsed.append(value)
    return parsed


def graph_types(blocks: list[dict[str, Any]]) -> list[str]:
    result = []
    for block in blocks:
        nodes = block.get("@graph", [])
        for node in nodes if isinstance(nodes, list) else []:
            raw = node.get("@type") if isinstance(node, dict) else None
            if isinstance(raw, str): result.append(raw)
            elif isinstance(raw, list): result.extend(str(value) for value in raw)
    return result


def count_json_slug(path: Path, slug: str) -> int:
    if not path.exists(): return 0
    payload = json.loads(read(path))
    return sum(1 for item in payload if isinstance(item, dict) and item.get("slug") == slug) if isinstance(payload, list) else 0


def files_containing(root: Path, directory: str, needle: str) -> list[str]:
    base = root / directory
    if not base.exists(): return []
    matches = []
    for path in base.rglob("*.html"):
        try:
            if needle in read(path): matches.append(path.relative_to(root).as_posix())
        except UnicodeDecodeError:
            continue
    return sorted(matches)


def count_anchor_href(html: str, href: str) -> int:
    return len(re.compile(r'<a\b[^>]*\bhref=["\']' + re.escape(href) + r'["\']', re.I | re.S).findall(html))


def manual_policy_checks(variant: dict[str, Any], manuals_html: str) -> dict[str, bool]:
    slug = variant["slug"]
    disk_url = f"https://example.com/{slug}.zip"
    manual_url = variant["pdf"]
    expected_manual = bool(manual_url)
    return {
        "legacy_game_media_not_exposed": disk_url not in manuals_html,
        "legacy_game_media_control_absent": "data-direct-download" not in manuals_html and ">Download Game<" not in manuals_html,
        "manual_membership_correct": (slug in manuals_html) if expected_manual else (slug not in manuals_html),
        "manual_url_membership_correct": (manual_url in manuals_html) if expected_manual else True,
    }


def run_variant(variant: dict[str, Any], baseline_count: int) -> dict[str, Any]:
    temp_root = Path(tempfile.mkdtemp(prefix=f"ccg-{variant['key']}-")); sandbox = temp_root / "repo"; commands = []
    try:
        add = run(["git", "worktree", "add", "--detach", str(sandbox), "HEAD"], ROOT); commands.append(add)
        if not add["passed"]: return {"variant": variant["key"], "commands": commands, "checks": {}, "passed": 0, "total": 0}
        games_path = sandbox / "games" / "games.json"; games = json.loads(read(games_path)); games.append(synthetic_game(variant)); games_path.write_text(json.dumps(games, indent=2) + "\n", encoding="utf-8")
        inject_video_metadata(sandbox, variant)
        create_thumbnail(sandbox / "resources" / "images" / "thumbnails" / "all" / f"{variant['slug']}.png")
        publish = run(["node", "scripts/rebuild-games.js"], sandbox); commands.append(publish)
        slug = variant["slug"]; href = f"/games/{slug}/"; canonical_url = f"{SITE}/games/{slug}/"; canonical = sandbox / "games" / slug / "index.html"; redirect = sandbox / "games" / f"{slug}.html"
        canonical_html = read(canonical) if canonical.exists() else ""; redirect_html = read(redirect) if redirect.exists() else ""; types = graph_types(extract_schema(canonical_html)) if canonical_html else []
        year_path = sandbox / "games" / "years" / str(variant["year"]) / "index.html"; platform_path = sandbox / variant["platform_route"]; manuals_path = sandbox / "games" / "downloads" / "index.html"
        year_html = read(year_path) if year_path.exists() else ""; platform_html = read(platform_path) if platform_path.exists() else ""; manuals_html = read(manuals_path) if manuals_path.exists() else ""; sitemap_path = sandbox / "sitemap-games.xml"; sitemap_games = read(sitemap_path) if sitemap_path.exists() else ""
        checks = {
            "publishing_command_passed": publish["passed"], "database_incremented_once": len(json.loads(read(games_path))) == baseline_count + 1, "source_record_once": count_json_slug(games_path, slug) == 1,
            "games_index_once": count_json_slug(sandbox / "games" / "games-index.json", slug) == 1, "games_search_once": count_json_slug(sandbox / "games" / "games-search.json", slug) == 1,
            "canonical_wrapper_created": canonical.exists(), "canonical_owned": canonical_url in canonical_html, "videogame_schema_once": types.count("VideoGame") == 1, "breadcrumb_schema_once": types.count("BreadcrumbList") == 1,
            "legacy_redirect_created": redirect.exists(), "legacy_redirect_noindex": "noindex,follow" in redirect_html, "legacy_redirect_targets_canonical": href in redirect_html,
            "publisher_archive_once": len(files_containing(sandbox, "games/publishers", href)) == 1, "developer_archive_once": len(files_containing(sandbox, "games/developers", href)) == 1, "composer_archive_present": len(files_containing(sandbox, "music", href)) >= 1,
            "year_archive_once": count_anchor_href(year_html, href) == 1, "platform_archive_once": count_anchor_href(platform_html, href) == 1,
            "game_page_has_no_download_panel": "game-download-section" not in canonical_html and "Authorised Game Download" not in canonical_html, "game_page_has_no_legacy_media_url": f"https://example.com/{slug}.zip" not in canonical_html,
            "sitemap_once": sitemap_games.count(canonical_url) == 1, **manual_policy_checks(variant, manuals_html),
        }
        return {"variant": variant["key"], "commands": commands, "checks": checks, "passed": sum(checks.values()), "total": len(checks)}
    finally:
        if sandbox.exists(): run(["git", "worktree", "remove", "--force", str(sandbox)], ROOT)
        shutil.rmtree(temp_root, ignore_errors=True)


def inspect_sources() -> dict[str, bool]:
    editor = read(ROOT / "admin" / "js" / "games-editor.js"); rebuild = read(ROOT / "scripts" / "rebuild-games.js"); manuals = read(ROOT / "scripts" / "generate-downloads-page.js"); enforcement = read(ROOT / "scripts" / "enforce-manual-only-game-pages.js")
    return {
        "authoritative_command_documented_in_editor": "node scripts/rebuild-games.js" in editor,
        "unavailable_browser_endpoint_removed": "/admin/api/rebuild-games" not in editor,
        "current_rebuild_preserved": "audit-magazine-review-coverage.js" in rebuild and "enforce-manual-only-game-pages.js" in rebuild,
        "magazine_review_pipeline_present": "build-magazine-review-chunks.js" in rebuild and "ensure-magazine-review-runtime.js" in rebuild,
        "rerelease_pipeline_present": "mark-rerelease-publishers.js" in rebuild and "link-publisher-strength-genres.js" in rebuild,
        "manuals_generator_uses_pdf": "game?.pdf" in manuals or "game.pdf" in manuals,
        "manuals_generator_ignores_disk": "game?.disk" not in manuals and "game.disk" not in manuals,
        "manual_only_game_page_guard_present": "game-download-section" in enforcement and "--check" in enforcement,
    }


def build_report(evidence: dict[str, Any]) -> str:
    rows = [f"| {r['variant'].upper()} | {r['passed']} / {r['total']} | {'PASS' if r['passed'] == r['total'] else 'FAIL'} |" for r in evidence["transactions"]]
    source_rows = "\n".join(f"- {k.replace('_', ' ')}: **{'PASS' if v else 'FAIL'}**" for k, v in evidence["source_inspection"].items())
    return f"""# Phase 6B Reliable Games Editor Publishing\n\n## Verdict\n\n**Publishing readiness: {evidence['verdict']}**\n\nThe real catalogue remained at **{evidence['baseline_game_count']} games**. Synthetic records existed only in disposable Git worktrees.\n\n## Synthetic transactions\n\n| Variant | Checks | Result |\n|---|---:|---|\n{chr(10).join(rows)}\n\nThe C64 fixture includes a PDF manual and must appear in Game Manuals A-Z. The Amiga fixture has no manual and must not appear there. Both deliberately contain a legacy game-media URL that must remain absent from the manuals archive and individual game page.\n\n## Source checks\n\n{source_rows}\n\n## Safety\n\n- No real game was added or changed.\n- No synthetic game-media URL may become visitor-facing.\n- Protected homepage, intro-loader and real game-data hashes remained unchanged.\n"""


def main() -> None:
    parser = argparse.ArgumentParser(); parser.add_argument("--json-output", required=True); parser.add_argument("--report-output", required=True); args = parser.parse_args()
    protected_before = {path: sha256(ROOT / path) for path in PROTECTED}; baseline_count = len(json.loads(read(ROOT / "games" / "games.json"))); transactions = [run_variant(v, baseline_count) for v in VARIANTS]; source_inspection = inspect_sources(); protected_after = {path: sha256(ROOT / path) for path in PROTECTED}; protected_unchanged = protected_before == protected_after
    ready = protected_unchanged and all(r["passed"] == r["total"] for r in transactions) and all(source_inspection.values())
    evidence = {"verdict": "READY" if ready else "NOT READY", "baseline_game_count": baseline_count, "transactions": transactions, "source_inspection": source_inspection, "protected_hashes_unchanged": protected_unchanged}
    json_path = Path(args.json_output); json_path.parent.mkdir(parents=True, exist_ok=True); json_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    report_path = ROOT / args.report_output; report_path.parent.mkdir(parents=True, exist_ok=True); report_path.write_text(build_report(evidence), encoding="utf-8")
    if not ready: raise SystemExit("Phase 6B transaction did not reach READY status")
    print("Phase 6B synthetic C64/Amiga publishing transactions passed the manuals-only policy.")


if __name__ == "__main__": main()
