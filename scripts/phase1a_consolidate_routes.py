#!/usr/bin/env python3
"""Phase 1A: consolidate matched flat-file/folder route duplicates safely.

The script is deliberately narrow. It:
- discovers the 57 reviewed flat-file/folder pairs in the approved content areas;
- preserves every canonical folder page byte-for-byte;
- converts only the alternate flat .html files to noindex redirect stubs;
- updates public HTML links that still target those flat aliases;
- hardens the relevant generators so future rebuilds retain the same model;
- leaves the homepage and intro-loader stack untouched.
"""

from __future__ import annotations

import hashlib
import html
import json
import re
from pathlib import Path
from urllib.parse import urlparse

import phase0_site_audit as audit

ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk"
REPORT_DIR = ROOT / "docs" / "seo-baseline"
REPORT_MD = REPORT_DIR / "phase-1a-route-consolidation.md"
REPORT_JSON = REPORT_DIR / "phase-1a-route-consolidation.json"
TMP_DIR = ROOT / "tmp" / "phase-1a-audit"
EXPECTED_PAIR_COUNT = 57
EXPECTED_PHASE1_COLLISIONS = 58

ALLOWED_PREFIXES = (
    "amiga-demo-music/",
    "music/",
    "retro-events/",
    "retro-specials/",
)

PROTECTED_FILES = {
    "index.html",
    "home.html",
    "complete-index.html",
    "resources/css/intro.css",
    "js/index-intro.js",
    "games/games.json",
}

HREF_RE = re.compile(
    r"(?P<prefix>\bhref\s*=\s*)(?P<quote>[\"'])(?P<value>.*?)(?P=quote)",
    re.I | re.S,
)


def configure_audit() -> None:
    """Match the public-site scope used by the merged Phase 0/1 audits."""
    audit.EXCLUDED_TOP_LEVEL.update({"docs", "resources", "scripts", "templates"})
    audit.EXCLUDED_NAME_PARTS = audit.EXCLUDED_NAME_PARTS + (
        "index_temp",
        "_temp.html",
        "-temp.html",
    )
    audit.OUTPUT_DIR = TMP_DIR


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def run_inventory() -> dict:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    audit.main()
    return json.loads((TMP_DIR / "phase-0-baseline.json").read_text(encoding="utf-8"))


def discover_reviewed_pairs(findings: dict) -> list[dict]:
    pages = findings.get("pages", [])
    page_by_file = {page["file"]: page for page in pages}
    pairs: list[dict] = []

    for flat_file, flat_page in sorted(page_by_file.items()):
        if not flat_file.startswith(ALLOWED_PREFIXES):
            continue
        if not flat_file.endswith(".html") or flat_file.endswith("/index.html"):
            continue

        owner_file = f"{flat_file[:-5]}/index.html"
        owner_page = page_by_file.get(owner_file)
        if not owner_page:
            continue

        canonical_path = str(owner_page.get("canonical_path") or "").strip()
        expected_path = audit.file_to_path(ROOT / owner_file)
        flat_canonical = str(flat_page.get("canonical_path") or "").strip()

        if not canonical_path or canonical_path != expected_path:
            continue
        if flat_canonical != canonical_path:
            continue

        pairs.append(
            {
                "flat_file": flat_file,
                "owner_file": owner_file,
                "flat_route": audit.file_to_path(ROOT / flat_file),
                "canonical_path": canonical_path,
                "title": owner_page.get("title") or flat_page.get("title") or "Cheeky Commodore Gamer",
                "description": owner_page.get("meta_description")
                or flat_page.get("meta_description")
                or "This page has moved to its canonical Cheeky Commodore Gamer address.",
            }
        )

    if len(pairs) != EXPECTED_PAIR_COUNT:
        raise RuntimeError(
            f"Expected {EXPECTED_PAIR_COUNT} reviewed route pairs, found {len(pairs)}. "
            "Refusing to alter public files until the difference is reviewed."
        )

    if any(pair["flat_file"] in PROTECTED_FILES or pair["owner_file"] in PROTECTED_FILES for pair in pairs):
        raise RuntimeError("A protected homepage or intro-loader file entered the Phase 1A pair set")

    return pairs


def redirect_stub(pair: dict) -> str:
    canonical_path = pair["canonical_path"]
    canonical_url = f"{SITE_ORIGIN}{canonical_path}"
    safe_title = html.escape(str(pair["title"]), quote=True)
    safe_description = html.escape(str(pair["description"]), quote=True)
    js_target = json.dumps(canonical_path, ensure_ascii=False)

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="/js/analytics.js"></script>
<meta name="robots" content="noindex,follow">
<meta http-equiv="refresh" content="0; url={html.escape(canonical_path, quote=True)}">
<script>
(function(){{
window.location.replace({js_target} + window.location.search + window.location.hash);
}})();
</script>
<title>{safe_title}</title>
<meta name="description" content="{safe_description}">
<link rel="canonical" href="{html.escape(canonical_url, quote=True)}">
</head>
<body></body>
</html>
'''


def write_if_changed(path: Path, content: str, changed: set[str]) -> None:
    previous = path.read_text(encoding="utf-8", errors="ignore") if path.exists() else None
    if previous == content:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    changed.add(rel(path))


def patch_retro_generator(changed: set[str]) -> None:
    path = ROOT / "scripts" / "generate-retro-pages.js"
    source = path.read_text(encoding="utf-8")
    marker = '<meta name="robots" content="noindex,follow" />'
    if marker in source:
        return

    old = '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\\n  <title>'
    new = (
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\\n'
        '  <meta name="robots" content="noindex,follow" />\\n  <title>'
    )
    if source.count(old) != 1:
        raise RuntimeError("Retro redirect generator marker was not found exactly once")
    write_if_changed(path, source.replace(old, new, 1), changed)


def composer_redirect_function() -> str:
    return r'''function renderComposerRedirectPage(entry) {
  const profile = FEATURED_PROFILE_DATA[entry.slug];
  const title = profile?.seoTitle || `${entry.name} — C64 & Amiga Music Composer | Cheeky Commodore Gamer`;
  const description = profile?.metaDescription || `Explore C64 and Amiga games featuring music by ${entry.name}, with archive links back to each game page on Cheeky Commodore Gamer.`;
  const canonicalPath = `/music/${entry.slug}/`;
  const canonicalUrl = `https://www.cheekycommodoregamer.co.uk${canonicalPath}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="/js/analytics.js"></script>
<meta name="robots" content="noindex,follow">
<meta http-equiv="refresh" content="0; url=${htmlEscape(canonicalPath)}">
<script>
(function(){
window.location.replace(${JSON.stringify(canonicalPath)} + window.location.search + window.location.hash);
})();
</script>
<title>${htmlEscape(title)}</title>
<meta name="description" content="${htmlEscape(description)}">
<link rel="canonical" href="${htmlEscape(canonicalUrl)}">
</head>
<body></body>
</html>`;
}

'''


def patch_music_generator(changed: set[str]) -> None:
    path = ROOT / "scripts" / "build-games.js"
    source = path.read_text(encoding="utf-8")

    if "function renderComposerRedirectPage(entry)" not in source:
        marker = "function renderMusicIndexPage() {"
        if source.count(marker) != 1:
            raise RuntimeError("Composer redirect insertion marker was not found exactly once")
        source = source.replace(marker, composer_redirect_function() + marker, 1)

    old_clean_re = re.compile(
        r"function cleanStaleComposerPages\(composerEntries\) \{.*?\n\}\n\nfunction buildGamesIndexData",
        re.S,
    )
    new_clean = '''function cleanStaleComposerPages(composerEntries) {
  const musicDir = "music";
  if (!fs.existsSync(musicDir)) return;
  const activeSlugs = new Set(composerEntries.map((entry) => entry.slug));
  const activeFiles = new Set(composerEntries.map((entry) => `${entry.slug}.html`));
  fs.readdirSync(musicDir, { withFileTypes: true }).forEach((entry) => {
    if (entry.name === "index.html" || entry.name === "composer.html" || entry.name === ".music-data.hash") return;
    if (entry.isDirectory()) {
      if (activeSlugs.has(entry.name)) return;
      return fs.rmSync(path.join(musicDir, entry.name), { recursive: true, force: true });
    }
    if (!entry.isFile() || !entry.name.endsWith(".html")) return;
    if (activeFiles.has(entry.name)) return;
    fs.rmSync(path.join(musicDir, entry.name), { force: true });
  });
}

function buildGamesIndexData'''

    clean_match = old_clean_re.search(source)
    if clean_match:
        source = old_clean_re.sub(new_clean, source, count=1)
    elif "const activeSlugs = new Set(composerEntries.map((entry) => entry.slug));" not in source:
        raise RuntimeError("Composer cleanup function was neither old nor already hardened")

    old_loop = '''    composerEntries.forEach((entry) => {
      if (writeFileIfChanged(path.join('music', `${entry.slug}.html`), renderComposerPage(entry))) musicWrites += 1;
    });'''
    new_loop = '''    composerEntries.forEach((entry) => {
      const canonicalFile = path.join('music', entry.slug, 'index.html');
      if (!fs.existsSync(canonicalFile) && writeFileIfChanged(canonicalFile, renderComposerPage(entry))) musicWrites += 1;
      if (writeFileIfChanged(path.join('music', `${entry.slug}.html`), renderComposerRedirectPage(entry))) musicWrites += 1;
    });'''
    if old_loop in source:
        source = source.replace(old_loop, new_loop, 1)
    elif new_loop not in source:
        raise RuntimeError("Composer generation loop was neither old nor already consolidated")

    old_export = "  renderComposerPage,\n  renderMusicIndexPage"
    new_export = "  renderComposerPage,\n  renderComposerRedirectPage,\n  renderMusicIndexPage"
    if old_export in source:
        source = source.replace(old_export, new_export, 1)
    elif new_export not in source:
        raise RuntimeError("Composer export marker was neither old nor already updated")

    write_if_changed(path, source, changed)


def update_internal_links(pairs: list[dict], changed: set[str]) -> int:
    alias_map = {pair["flat_route"]: pair["canonical_path"] for pair in pairs}
    alias_files = {pair["flat_file"] for pair in pairs}
    replacements = 0

    for path in sorted(ROOT.rglob("*.html")):
        relative = rel(path)
        if not audit.included_html(path) or relative in alias_files or relative in PROTECTED_FILES:
            continue

        source_path = audit.file_to_path(path)
        original = path.read_text(encoding="utf-8", errors="ignore")

        def replace_href(match: re.Match) -> str:
            nonlocal replacements
            raw = html.unescape(match.group("value")).strip()
            target, kind = audit.resolve_local_target(source_path, raw)
            if kind != "internal" or target not in alias_map:
                return match.group(0)

            parsed = urlparse(raw)
            suffix = ""
            if parsed.query:
                suffix += f"?{parsed.query}"
            if parsed.fragment:
                suffix += f"#{parsed.fragment}"
            replacements += 1
            value = html.escape(alias_map[target] + suffix, quote=True)
            return f'{match.group("prefix")}{match.group("quote")}{value}{match.group("quote")}'

        updated = HREF_RE.sub(replace_href, original)
        if updated != original:
            write_if_changed(path, updated, changed)

    return replacements


def remaining_alias_links(pairs: list[dict]) -> list[dict]:
    aliases = {pair["flat_route"] for pair in pairs}
    alias_files = {pair["flat_file"] for pair in pairs}
    remaining: list[dict] = []

    for path in sorted(ROOT.rglob("*.html")):
        relative = rel(path)
        if not audit.included_html(path) or relative in alias_files:
            continue
        source_path = audit.file_to_path(path)
        text = path.read_text(encoding="utf-8", errors="ignore")
        for match in HREF_RE.finditer(text):
            raw = html.unescape(match.group("value")).strip()
            target, kind = audit.resolve_local_target(source_path, raw)
            if kind == "internal" and target in aliases:
                remaining.append({"file": relative, "href": raw, "resolved": target})
    return remaining


def validate_stubs(pairs: list[dict]) -> list[str]:
    errors: list[str] = []
    for pair in pairs:
        path = ROOT / pair["flat_file"]
        text = path.read_text(encoding="utf-8", errors="ignore")
        expected_canonical = f'{SITE_ORIGIN}{pair["canonical_path"]}'
        checks = {
            "noindex": '<meta name="robots" content="noindex,follow">' in text,
            "canonical": f'<link rel="canonical" href="{expected_canonical}">' in text,
            "meta-refresh": f'content="0; url={pair["canonical_path"]}"' in text,
            "query-forwarding": "window.location.search + window.location.hash" in text,
        }
        for label, passed in checks.items():
            if not passed:
                errors.append(f"{pair['flat_file']}: missing {label}")
    return errors


def main() -> None:
    configure_audit()
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    protected_before = {name: sha256(ROOT / name) for name in PROTECTED_FILES}
    before = run_inventory()
    pairs = discover_reviewed_pairs(before)
    owner_before = {pair["owner_file"]: sha256(ROOT / pair["owner_file"]) for pair in pairs}

    changed: set[str] = set()
    patch_retro_generator(changed)
    patch_music_generator(changed)
    links_updated = update_internal_links(pairs, changed)

    for pair in pairs:
        write_if_changed(ROOT / pair["flat_file"], redirect_stub(pair), changed)

    owner_after = {pair["owner_file"]: sha256(ROOT / pair["owner_file"]) for pair in pairs}
    if owner_before != owner_after:
        raise RuntimeError("At least one canonical folder page changed during Phase 1A")

    protected_after = {name: sha256(ROOT / name) for name in PROTECTED_FILES}
    if protected_before != protected_after:
        raise RuntimeError("A protected homepage, intro-loader or game-data file changed")

    stub_errors = validate_stubs(pairs)
    if stub_errors:
        raise RuntimeError("Redirect-stub validation failed:\n" + "\n".join(stub_errors))

    remaining_links = remaining_alias_links(pairs)
    if remaining_links:
        raise RuntimeError(
            "Internal links still target demoted aliases:\n"
            + "\n".join(f"{item['file']} -> {item['href']}" for item in remaining_links[:25])
        )

    after = run_inventory()
    after_groups = after.get("duplicate_indexable_canonicals", {})
    if set(after_groups) != {"/"}:
        raise RuntimeError(
            "Phase 1A expected only the protected homepage collision to remain; found: "
            + ", ".join(sorted(after_groups))
        )

    category_counts: dict[str, int] = {}
    for pair in pairs:
        category = pair["flat_file"].split("/", 1)[0]
        category_counts[category] = category_counts.get(category, 0) + 1

    summary = {
        "phase1_review_collision_groups": EXPECTED_PHASE1_COLLISIONS,
        "matched_route_pairs": len(pairs),
        "post_consolidation_collision_groups": len(after_groups),
        "canonical_owner_pages_unchanged": len(owner_after),
        "redirect_stubs_validated": len(pairs),
        "remaining_internal_alias_links": len(remaining_links),
        "links_updated_this_run": links_updated,
        "protected_files_unchanged": len(PROTECTED_FILES),
        "category_counts": dict(sorted(category_counts.items())),
        "changed_files": sorted(changed),
    }

    payload = {
        "summary": summary,
        "pairs": pairs,
        "remaining_collision_groups": after_groups,
        "protected_files": sorted(PROTECTED_FILES),
        "rollback": {
            "method": "Revert the Phase 1A squash merge commit.",
            "canonical_pages_modified": False,
            "alternate_routes_deleted": False,
        },
    }
    REPORT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    md = [
        "# Phase 1A Matched Route Consolidation",
        "",
        "This change consolidates only the 57 low-risk flat-file/folder duplicates approved in the Phase 1 review.",
        "",
        "## Results",
        "",
        "| Check | Result |",
        "|---|---:|",
        f"| Phase 1 collision baseline | **{EXPECTED_PHASE1_COLLISIONS}** |",
        f"| Matched alternate routes consolidated | **{len(pairs)}** |",
        f"| Canonical collisions remaining | **{len(after_groups)}** |",
        f"| Canonical owner pages unchanged | **{len(owner_after)}** |",
        f"| Validated noindex redirect stubs | **{len(pairs)}** |",
        f"| Internal links still targeting aliases | **{len(remaining_links)}** |",
        f"| Protected files unchanged | **{len(PROTECTED_FILES)}** |",
        "",
        "## Routes consolidated by section",
        "",
    ]
    for category, count in sorted(category_counts.items()):
        md.append(f"- `{category}/`: **{count}** alternate routes")

    md.extend(
        [
            "",
            "## Generator safeguards",
            "",
            "- Retro specials, retro events and Amiga demo flat redirects now emit `noindex,follow`.",
            "- Composer builds preserve active canonical folders instead of deleting them.",
            "- Composer builds create a canonical folder page only when it is missing.",
            "- Composer flat `.html` files are generated as noindex redirect stubs.",
            "- Query strings and URL fragments are retained during JavaScript forwarding.",
            "",
            "## Explicit exclusions",
            "",
            "- `index.html`, `home.html` and the intro-loader stack were not changed.",
            "- `games/games.json` was not changed.",
            "- No canonical folder page was rewritten or deleted.",
            "- The remaining homepage collision is deferred to a separate tested phase.",
            "",
            "## Rollback",
            "",
            "Revert the Phase 1A squash merge commit. Every legacy route remains as a file, so no deleted page needs to be reconstructed.",
        ]
    )
    report_text = "\n".join(md) + "\n"
    if not REPORT_MD.exists() or REPORT_MD.read_text(encoding="utf-8") != report_text:
        REPORT_MD.write_text(report_text, encoding="utf-8")
        changed.add(rel(REPORT_MD))

    # Refresh the JSON after the Markdown path has been added to changed_files.
    payload["summary"]["changed_files"] = sorted(changed)
    REPORT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
