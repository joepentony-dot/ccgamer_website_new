#!/usr/bin/env python3
"""Apply the reviewed Phase 1B indexing and sitemap corrections.

This script is intentionally narrow. It demotes utility/client-only shells, converts
proven legacy game aliases into direct noindex redirects, normalises three public
archive pages, updates their sitemap configuration, and verifies the result with
the merged Phase 0 auditor.
"""

from __future__ import annotations

import hashlib
import html as html_module
import json
import re
import subprocess
from pathlib import Path

import phase0_site_audit as audit

ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk"
REPORT_DIR = ROOT / "docs" / "seo-baseline"
PHASE0_JSON = REPORT_DIR / "phase-0-baseline.json"
PHASE0_MD = REPORT_DIR / "phase-0-baseline.md"
REPORT_JSON = REPORT_DIR / "phase-1b-indexing-sitemap.json"
REPORT_MD = REPORT_DIR / "phase-1b-indexing-sitemap.md"
STATIC_PAGES = ROOT / "tools" / "seo" / "static-pages.json"
GAMES_JSON = ROOT / "games" / "games.json"

# Match the public-site scope used by the merged Phase 0 and Phase 1 reports.
audit.EXCLUDED_TOP_LEVEL.update({"docs", "resources", "scripts", "templates"})
audit.EXCLUDED_NAME_PARTS = audit.EXCLUDED_NAME_PARTS + (
    "index_temp",
    "_temp.html",
    "-temp.html",
)

EXPECTED_MISSING_CANONICALS = {
    "community/activity.html",
    "community/admin.html",
    "community/latest-comments.html",
    "community/profile.html",
    "community/public-profile.html",
    "community/top-rated.html",
    "community/unsubscribe.html",
    "quiz/quiz-admin.html",
    "redirect.html",
}

EXPECTED_SITEMAP_MISSING = {
    "404.html",
    "community/activity.html",
    "community/admin.html",
    "community/index.html",
    "community/latest-comments.html",
    "community/profile.html",
    "community/public-profile.html",
    "community/top-rated.html",
    "community/unsubscribe.html",
    "games/b-c-2-grog-s-revenge/index.html",
    "games/b-c-bill/index.html",
    "games/b-c-s-quest-for-tires/index.html",
    "games/bc2-grog-s-revenge/index.html",
    "games/bully-s-sporting-darts/index.html",
    "games/dragon-s-lair-2-escape-from-singe-s-castle/index.html",
    "games/game.html",
    "games/gary-lineker-s-superstar-soccer/index.html",
    "games/h-e-r-o/index.html",
    "games/ivan-ironman-stewart-s-super-off-road/index.html",
    "games/jimmy-white-s-whirlwind-snooker/index.html",
    "games/m-u-l-e/index.html",
    "music/composer.html",
    "music/composers/index.html",
    "quiz/pack-6.html",
    "quiz/quiz-admin.html",
    "redirect.html",
}

NOINDEX_SHELLS = {
    "404.html": "Error document",
    "community/activity.html": "Client-rendered activity feed",
    "community/admin.html": "Administrative utility",
    "community/latest-comments.html": "Client-rendered comments feed",
    "community/profile.html": "Private account page",
    "community/public-profile.html": "Query-driven profile shell",
    "community/top-rated.html": "Client-rendered ratings feed",
    "community/unsubscribe.html": "Email preference utility",
    "games/game.html": "Dynamic game fallback shell",
    "music/composer.html": "Dynamic composer fallback shell",
    "quiz/quiz-admin.html": "Administrative utility",
    "redirect.html": "Dynamic redirect utility",
}

PUBLIC_SITEMAP_PAGES = {
    "community/index.html": "/community/",
    "music/composers/index.html": "/music/composers/",
    "quiz/pack-6.html": "/quiz/pack-6.html",
}

GAME_ALIASES = {
    "b-c-2-grog-s-revenge": "bc2-grogs-revenge",
    "b-c-bill": "bc-bill",
    "b-c-s-quest-for-tires": "bcs-quest-for-tires",
    "bc2-grog-s-revenge": "bc2-grogs-revenge",
    "bully-s-sporting-darts": "bullys-sporting-darts",
    "dragon-s-lair-2-escape-from-singe-s-castle": "dragons-lair-2-escape-from-singes-castle",
    "gary-lineker-s-superstar-soccer": "gary-linekers-superstar-soccer",
    "h-e-r-o": "hero",
    "ivan-ironman-stewart-s-super-off-road": "ivan-ironman-stewarts-super-off-road",
    "jimmy-white-s-whirlwind-snooker": "jimmy-whites-whirlwind-snooker",
    "m-u-l-e": "mule",
}

PROTECTED_FILES = {
    "index.html",
    "home.html",
    "complete-index.html",
    "resources/css/intro.css",
    "js/index-intro.js",
    "games/games.json",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_text(rel_path: str) -> str:
    return (ROOT / rel_path).read_text(encoding="utf-8")


def write_if_changed(rel_path: str, content: str, changed: set[str]) -> None:
    path = ROOT / rel_path
    previous = path.read_text(encoding="utf-8") if path.exists() else None
    if previous == content:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    changed.add(rel_path)


def run_audit() -> dict:
    audit.main()
    return json.loads(PHASE0_JSON.read_text(encoding="utf-8"))


def page_files(items: list[dict]) -> set[str]:
    return {str(item.get("file", "")) for item in items}


def add_or_replace_noindex(source: str) -> str:
    robots_pattern = re.compile(
        r'<meta\s+[^>]*name=["\']robots["\'][^>]*>', re.IGNORECASE
    )
    robots_tag = '<meta name="robots" content="noindex,follow">'
    if robots_pattern.search(source):
        return robots_pattern.sub(robots_tag, source, count=1)

    viewport_pattern = re.compile(
        r'(<meta\s+[^>]*name=["\']viewport["\'][^>]*>\s*)', re.IGNORECASE
    )
    if viewport_pattern.search(source):
        return viewport_pattern.sub(rf'\1{robots_tag}\n', source, count=1)

    charset_pattern = re.compile(r'(<meta\s+[^>]*charset[^>]*>\s*)', re.IGNORECASE)
    if charset_pattern.search(source):
        return charset_pattern.sub(rf'\1{robots_tag}\n', source, count=1)

    return source.replace("<head>", f"<head>\n{robots_tag}", 1)


def extract_meta(source: str, name: str) -> str:
    if name == "title":
        match = re.search(r"<title[^>]*>(.*?)</title>", source, re.I | re.S)
    else:
        match = re.search(
            rf'<meta\s+[^>]*name=["\']{re.escape(name)}["\'][^>]*content=["\']([^"\']*)["\'][^>]*>',
            source,
            re.I | re.S,
        )
        if not match:
            match = re.search(
                rf'<meta\s+[^>]*content=["\']([^"\']*)["\'][^>]*name=["\']{re.escape(name)}["\'][^>]*>',
                source,
                re.I | re.S,
            )
    return html_module.unescape(match.group(1).strip()) if match else ""


def esc_attr(value: str) -> str:
    return html_module.escape(value, quote=True)


def render_game_alias(alias: str, target: str, target_html: str) -> str:
    target_path = f"/games/{target}/"
    title = extract_meta(target_html, "title") or target.replace("-", " ").title()
    description = extract_meta(target_html, "description") or (
        f"Redirecting to the canonical Cheeky Commodore Gamer page for {title}."
    )
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="/js/analytics.js"></script>
<meta name="robots" content="noindex,follow">
<meta http-equiv="refresh" content="0; url={esc_attr(target_path)}">
<script>
(function(){{
window.location.replace({json.dumps(target_path)} + window.location.search + window.location.hash);
}})();
</script>
<title>{html_module.escape(title)}</title>
<meta name="description" content="{esc_attr(description)}">
<link rel="canonical" href="{SITE_ORIGIN}{esc_attr(target_path)}">
</head>
<body></body>
</html>
'''


def normalise_public_pages(changed: set[str]) -> None:
    community_path = "community/index.html"
    community = read_text(community_path)
    community = community.replace(
        f'{SITE_ORIGIN}/community/index.html', f'{SITE_ORIGIN}/community/'
    )
    write_if_changed(community_path, community, changed)

    composers_path = "music/composers/index.html"
    composers = read_text(composers_path)
    composers = composers.replace(
        f'{SITE_ORIGIN}/music/composers/index.html', f'{SITE_ORIGIN}/music/composers/'
    )
    composers = composers.replace(
        'href="/music/composers/index.html"', 'href="/music/composers/"'
    )
    write_if_changed(composers_path, composers, changed)


def update_static_pages(changed: set[str]) -> None:
    pages = json.loads(STATIC_PAGES.read_text(encoding="utf-8"))
    if not isinstance(pages, list):
        raise SystemExit("tools/seo/static-pages.json is not an array")

    additions = [
        ("community/index.html", "home.html"),
        ("music/composers/index.html", "games/index.html"),
        ("quiz/pack-6.html", "quiz/quiz.html"),
    ]
    for page, anchor in additions:
        if page in pages:
            continue
        if anchor in pages:
            pages.insert(pages.index(anchor) + 1, page)
        else:
            pages.append(page)

    write_if_changed(
        "tools/seo/static-pages.json",
        json.dumps(pages, indent=2, ensure_ascii=False) + "\n",
        changed,
    )


def replace_alias_links(changed: set[str]) -> dict[str, int]:
    counts = {alias: 0 for alias in GAME_ALIASES}
    protected = {str((ROOT / path).resolve()) for path in PROTECTED_FILES}
    alias_files = {str((ROOT / "games" / alias / "index.html").resolve()) for alias in GAME_ALIASES}

    for path in ROOT.rglob("*.html"):
        resolved = str(path.resolve())
        if resolved in protected or resolved in alias_files:
            continue
        rel = path.relative_to(ROOT).as_posix()
        if any(part in {"docs", "resources", "templates"} for part in path.relative_to(ROOT).parts):
            continue
        source = path.read_text(encoding="utf-8")
        updated = source
        for alias, target in GAME_ALIASES.items():
            target_path = f"/games/{target}/"
            patterns = (
                f"/games/{alias}/index.html",
                f"/games/{alias}/",
                f"/games/{alias}.html",
                f"/games/game.html?id={alias}",
                f"/games/game.html?slug={alias}",
            )
            for pattern in patterns:
                hits = updated.count(pattern)
                if hits:
                    counts[alias] += hits
                    updated = updated.replace(pattern, target_path)
        if updated != source:
            write_if_changed(rel, updated, changed)

    return counts


def remaining_alias_links() -> list[dict]:
    findings: list[dict] = []
    alias_files = {str((ROOT / "games" / alias / "index.html").resolve()) for alias in GAME_ALIASES}
    for path in ROOT.rglob("*.html"):
        if str(path.resolve()) in alias_files:
            continue
        rel_parts = path.relative_to(ROOT).parts
        if any(part in {"docs", "resources", "templates"} for part in rel_parts):
            continue
        source = path.read_text(encoding="utf-8")
        for alias in GAME_ALIASES:
            needles = (
                f"/games/{alias}/",
                f"/games/{alias}.html",
                f"game.html?id={alias}",
                f"game.html?slug={alias}",
            )
            if any(needle in source for needle in needles):
                findings.append({"file": path.relative_to(ROOT).as_posix(), "alias": alias})
    return findings


def validate_alias_targets(games: list[dict]) -> dict[str, str]:
    known_slugs = {str(game.get("slug", "")).strip() for game in games}
    target_files: dict[str, str] = {}
    for alias, target in GAME_ALIASES.items():
        alias_file = ROOT / "games" / alias / "index.html"
        target_file = ROOT / "games" / target / "index.html"
        if not alias_file.exists():
            raise SystemExit(f"Expected alias route is missing: {alias_file.relative_to(ROOT)}")
        if target not in known_slugs:
            raise SystemExit(f"Alias target is not a current games.json slug: {target}")
        if not target_file.exists():
            raise SystemExit(f"Canonical alias target page is missing: {target_file.relative_to(ROOT)}")
        target_files[alias] = target_file.relative_to(ROOT).as_posix()
    return target_files


def main() -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    original_phase0_md = PHASE0_MD.read_bytes() if PHASE0_MD.exists() else None
    protected_before = {path: sha256(ROOT / path) for path in PROTECTED_FILES}

    before = run_audit()
    before_missing_canonicals = page_files(before.get("missing_canonicals", []))
    before_sitemap_missing = page_files(before.get("sitemap_missing", []))
    before_collisions = len(before.get("duplicate_indexable_canonicals", {}))

    if before_missing_canonicals != EXPECTED_MISSING_CANONICALS:
        raise SystemExit(
            "Phase 1B missing-canonical baseline changed:\n"
            f"expected={sorted(EXPECTED_MISSING_CANONICALS)}\n"
            f"actual={sorted(before_missing_canonicals)}"
        )
    if before_sitemap_missing != EXPECTED_SITEMAP_MISSING:
        raise SystemExit(
            "Phase 1B sitemap baseline changed:\n"
            f"expected={sorted(EXPECTED_SITEMAP_MISSING)}\n"
            f"actual={sorted(before_sitemap_missing)}"
        )
    if before_collisions != 1:
        raise SystemExit(f"Expected one deferred canonical collision, found {before_collisions}")

    games = json.loads(GAMES_JSON.read_text(encoding="utf-8"))
    if not isinstance(games, list):
        games = games.get("games", [])
    target_files = validate_alias_targets(games)

    changed: set[str] = set()

    for rel_path in NOINDEX_SHELLS:
        source = read_text(rel_path)
        write_if_changed(rel_path, add_or_replace_noindex(source), changed)

    normalise_public_pages(changed)
    update_static_pages(changed)

    for alias, target in GAME_ALIASES.items():
        target_html = read_text(target_files[alias])
        rel_path = f"games/{alias}/index.html"
        write_if_changed(rel_path, render_game_alias(alias, target, target_html), changed)

    link_replacements = replace_alias_links(changed)
    unresolved_links = remaining_alias_links()
    if unresolved_links:
        raise SystemExit(f"Internal links still target legacy game aliases: {unresolved_links[:20]}")

    subprocess.run(
        ["node", "tools/seo/generate-sitemap.js"],
        cwd=ROOT,
        check=True,
    )
    for rel_path in ("sitemap-pages.xml", "sitemap.xml", "sitemap-games.xml"):
        path = ROOT / rel_path
        if path.exists() and subprocess.run(
            ["git", "diff", "--quiet", "--", rel_path], cwd=ROOT
        ).returncode != 0:
            changed.add(rel_path)

    after = run_audit()
    after_missing_canonicals = page_files(after.get("missing_canonicals", []))
    after_sitemap_missing = page_files(after.get("sitemap_missing", []))
    after_collisions = len(after.get("duplicate_indexable_canonicals", {}))

    if after_missing_canonicals:
        raise SystemExit(f"Indexable pages still missing canonicals: {sorted(after_missing_canonicals)}")
    if after_sitemap_missing:
        raise SystemExit(f"Indexable pages still missing from sitemaps: {sorted(after_sitemap_missing)}")
    if after_collisions != 1:
        raise SystemExit(f"Deferred canonical collision count changed: {after_collisions}")
    if after.get("broken_internal_links"):
        raise SystemExit("Broken internal links were introduced")
    if after.get("missing_local_assets"):
        raise SystemExit("Missing local assets were introduced")

    protected_after = {path: sha256(ROOT / path) for path in PROTECTED_FILES}
    altered_protected = sorted(
        path for path in PROTECTED_FILES if protected_before[path] != protected_after[path]
    )
    if altered_protected:
        raise SystemExit(f"Protected files changed: {altered_protected}")

    noindex_validation = {}
    for rel_path in NOINDEX_SHELLS:
        content = read_text(rel_path)
        noindex_validation[rel_path] = bool(
            re.search(
                r'<meta\s+[^>]*name=["\']robots["\'][^>]*content=["\'][^"\']*noindex[^"\']*["\']',
                content,
                re.I,
            )
        )
    if not all(noindex_validation.values()):
        raise SystemExit("One or more utility shells did not receive noindex")

    alias_validation = {}
    for alias, target in GAME_ALIASES.items():
        content = read_text(f"games/{alias}/index.html")
        target_path = f"/games/{target}/"
        alias_validation[alias] = {
            "target": target,
            "noindex": "noindex,follow" in content,
            "canonical": f'{SITE_ORIGIN}{target_path}' in content,
            "meta_refresh": f'url={target_path}' in content,
            "preserves_query_and_fragment": "window.location.search + window.location.hash" in content,
        }
        if not all(value for key, value in alias_validation[alias].items() if key != "target"):
            raise SystemExit(f"Alias redirect validation failed: {alias}")

    sitemap_text = (ROOT / "sitemap-pages.xml").read_text(encoding="utf-8")
    sitemap_validation = {
        rel_path: f"<loc>{SITE_ORIGIN}{route}</loc>" in sitemap_text
        for rel_path, route in PUBLIC_SITEMAP_PAGES.items()
    }
    if not all(sitemap_validation.values()):
        raise SystemExit(f"Public sitemap entries missing: {sitemap_validation}")

    if original_phase0_md is not None:
        PHASE0_MD.write_bytes(original_phase0_md)
    elif PHASE0_MD.exists():
        PHASE0_MD.unlink()

    summary = {
        "canonical_collisions_before": before_collisions,
        "canonical_collisions_after": after_collisions,
        "missing_canonicals_before": len(before_missing_canonicals),
        "missing_canonicals_after": len(after_missing_canonicals),
        "sitemap_omissions_before": len(before_sitemap_missing),
        "sitemap_omissions_after": len(after_sitemap_missing),
        "utility_shells_noindexed": len(NOINDEX_SHELLS),
        "legacy_game_aliases_consolidated": len(GAME_ALIASES),
        "public_pages_added_to_sitemap": len(PUBLIC_SITEMAP_PAGES),
        "remaining_internal_alias_links": len(unresolved_links),
        "protected_files_unchanged": len(PROTECTED_FILES),
    }

    payload = {
        "summary": summary,
        "utility_shells": NOINDEX_SHELLS,
        "public_sitemap_pages": PUBLIC_SITEMAP_PAGES,
        "game_aliases": GAME_ALIASES,
        "alias_validation": alias_validation,
        "sitemap_validation": sitemap_validation,
        "internal_link_replacements": link_replacements,
        "changed_files": sorted(changed | {"docs/seo-baseline/phase-1b-indexing-sitemap.md"}),
        "protected_files": sorted(PROTECTED_FILES),
        "rollback": "Revert the Phase 1B squash merge commit.",
    }
    REPORT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    md = [
        "# Phase 1B Indexing and Sitemap Corrections",
        "",
        "This phase resolves the reviewed missing-canonical and sitemap-omission findings without touching the homepage loader stack.",
        "",
        "## Results",
        "",
        "| Check | Before | After |",
        "|---|---:|---:|",
        f"| Canonical collision groups | **{before_collisions}** | **{after_collisions}** |",
        f"| Indexable pages missing canonicals | **{len(before_missing_canonicals)}** | **{len(after_missing_canonicals)}** |",
        f"| Indexable pages missing from sitemaps | **{len(before_sitemap_missing)}** | **{len(after_sitemap_missing)}** |",
        "",
        "## Decisions applied",
        "",
        f"- **{len(NOINDEX_SHELLS)}** utility, private, administrative or client-only shells remain accessible but now use `noindex,follow`.",
        f"- **{len(GAME_ALIASES)}** proven legacy game routes now redirect directly to existing canonical game pages.",
        f"- **{len(PUBLIC_SITEMAP_PAGES)}** genuine public pages were normalised and added to the sitemap.",
        "- Query strings and URL fragments are retained by every legacy-game redirect.",
        "- Internal links to the eleven legacy game routes were replaced with canonical routes.",
        "",
        "## Public pages added to the sitemap",
        "",
    ]
    for rel_path, route in PUBLIC_SITEMAP_PAGES.items():
        md.append(f"- `{rel_path}` — canonical `{route}`")

    md.extend(["", "## Legacy game aliases", ""])
    for alias, target in GAME_ALIASES.items():
        md.append(f"- `/games/{alias}/` → `/games/{target}/`")

    md.extend([
        "",
        "## Explicit exclusions",
        "",
        "- `index.html`, `home.html`, `complete-index.html`, `resources/css/intro.css` and `js/index-intro.js` were not changed.",
        "- `games/games.json` was not changed.",
        "- The one remaining homepage canonical collision remains deferred.",
        "- No public feature was deleted; noindexed utilities remain reachable and functional.",
        "",
        "## Rollback",
        "",
        "Revert the Phase 1B squash merge commit.",
    ])
    REPORT_MD.write_text("\n".join(md) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
