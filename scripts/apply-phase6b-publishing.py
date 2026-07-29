#!/usr/bin/env python3
"""Apply the bounded Phase 6B publishing-chain corrections."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    target = ROOT / path
    if not target.exists():
        raise SystemExit(f"Missing required file: {path}")
    return target.read_text(encoding="utf-8")


def write(path: str, content: str) -> bool:
    target = ROOT / path
    current = target.read_text(encoding="utf-8") if target.exists() else None
    if current == content:
        return False
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return True


def replace_once(content: str, old: str, new: str, label: str) -> str:
    count = content.count(old)
    if count == 0 and new in content:
        return content
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return content.replace(old, new, 1)


def update_build_games() -> bool:
    path = "scripts/build-games.js"
    source = read(path)
    source = replace_once(source, "  runSeoVerification();\n", "", "remove premature SEO verification")
    source = source.replace(
        "function runSeoVerification() {\n  const result = spawnSync(process.execPath, [path.join(__dirname, 'verify-seo.mjs')], { cwd: path.join(__dirname, '..'), stdio: 'inherit' });\n  if (result.status !== 0) {\n    throw new Error(`verify-seo.mjs failed with status ${result.status ?? 1}`);\n  }\n}\n\n",
        "",
    )
    source = source.replace('const { spawnSync } = require("child_process");\n', "")
    return write(path, source)


def update_rebuild_games() -> bool:
    path = "scripts/rebuild-games.js"
    source = '''#!/usr/bin/env node

"use strict";

const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");

const steps = [
  ["validate-games-source.js"],
  ["build-games.js"],
  ["generate-publisher-pages.js"],
  ["generate-developer-pages.js"],
  ["generate-composer-pages.js"],
  ["generate-year-platform-pages.js"],
  ["integrate-year-platform-discovery.js"],
  ["generate-downloads-page.js"],
  ["update-downloads-static-pages.js"],
  ["generate-retro-pages.js"],
  ["generate-sitemaps.js"],
  ["validate-sitemaps.js"],
  ["verify-seo.mjs"],
  ["validate-year-platform-discovery.js"],
];

function fail(message) {
  console.error(`[rebuild-games] ${message}`);
  process.exit(1);
}

function runNodeScript(scriptName, args = []) {
  const scriptPath = path.join(__dirname, scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, CCG_REPO_ROOT: repoRoot },
  });
  if (result.status !== 0) fail(`${scriptName} failed with status ${result.status ?? 1}.`);
}

function main() {
  console.log(`[rebuild-games] Publishing from ${repoRoot}`);
  for (const [scriptName, ...args] of steps) runNodeScript(scriptName, args);
  console.log(`[rebuild-games] Complete publishing chain passed (${steps.length} steps).`);
}

if (require.main === module) main();

module.exports = { steps };
'''
    return write(path, source)


def update_year_generator() -> bool:
    path = "scripts/generate-year-platform-pages.js"
    source = read(path)
    fixed = '''    if (data.games.length !== 651) fail(`Expected the Phase 4A baseline of 651 games, found ${data.games.length}.`);
    if (data.years.length !== 15) fail(`Expected 15 release years, found ${data.years.length}.`);
    if (data.platforms.find((group) => group.key === "c64").count !== 552) fail("C64 total no longer matches the Phase 4A baseline of 552.");
    if (data.platforms.find((group) => group.key === "amiga").count !== 99) fail("Amiga total no longer matches the Phase 4A baseline of 99.");

'''
    source = replace_once(source, fixed, "", "remove fixed archive totals")
    return write(path, source)


def update_year_validator() -> bool:
    path = "scripts/validate-year-platform-discovery.js"
    source = read(path)
    source = replace_once(
        source,
        '''    if (years.length !== 15) problems.push(`Expected 15 represented years, found ${years.length}`);
    if (platforms.length !== 2) problems.push(`Expected two platform routes, found ${platforms.length}`);
    if (archiveData.games.length !== 651) problems.push(`Expected 651 games, found ${archiveData.games.length}`);
''',
        '''    if (platforms.length !== 2) problems.push(`Expected two platform routes, found ${platforms.length}`);
    if (archiveData.games.length < 651) problems.push(`Game total fell below the protected Phase 6A baseline: ${archiveData.games.length}`);
''',
        "replace fixed validator totals",
    )
    source = replace_once(
        source,
        '''    const noindexEntry = "games/years/2023/index.html";
    if (staticPages.includes(noindexEntry)) problems.push("The noindex 2023 route is present in the static registry");
''',
        '''    const noindexEntries = years
        .filter((group) => !group.indexable)
        .map((group) => `games/years/${group.year}/index.html`);
    noindexEntries.forEach((entry) => {
        if (staticPages.includes(entry)) problems.push(`Noindex year route is present in the static registry: ${entry}`);
    });
''',
        "replace hardcoded noindex registry year",
    )
    source = replace_once(
        source,
        '''    const noindexUrl = `${SITE_ORIGIN}/games/years/2023/`;
    [
        ["sitemap.xml", sitemapIndexLocs],
        ["sitemap-pages.xml", sitemapPagesLocs],
        ["sitemap-games.xml", sitemapGamesLocs]
    ].forEach(([label, urls]) => {
        if (urls.includes(noindexUrl)) problems.push(`The noindex 2023 route is present in ${label}`);
    });
''',
        '''    const noindexUrls = years
        .filter((group) => !group.indexable)
        .map((group) => `${SITE_ORIGIN}${group.url}`);
    [
        ["sitemap.xml", sitemapIndexLocs],
        ["sitemap-pages.xml", sitemapPagesLocs],
        ["sitemap-games.xml", sitemapGamesLocs]
    ].forEach(([label, urls]) => {
        noindexUrls.forEach((url) => {
            if (urls.includes(url)) problems.push(`Noindex year route is present in ${label}: ${url}`);
        });
    });
''',
        "replace hardcoded noindex sitemap year",
    )
    source = source.replace("| Noindex year excluded | **2023** |", "| Noindex year routes excluded | **${summary.noindexYearRoutes}** |")
    source = source.replace("- Exact route uniqueness across both hubs, all 15 year routes and both platform routes.", "- Exact route uniqueness across both hubs, every represented year route and both platform routes.")
    source = source.replace("- Exact source-data membership checks for all 651 year links, 552 C64 links and 99 Amiga links.", "- Exact source-data membership checks using totals derived from the current games database.")
    noindex_summary_line = "        noindexYearRoutes: years.filter((group) => !group.indexable).length,\n"
    source = re.sub(
        r"(?:        noindexYearRoutes: years\.filter\(\(group\) => !group\.indexable\)\.length,\n)+",
        noindex_summary_line,
        source,
    )
    if noindex_summary_line not in source:
        source = source.replace(
            "        registeredArchiveRoutes: expectedStaticEntries.length,\n",
            "        registeredArchiveRoutes: expectedStaticEntries.length,\n" + noindex_summary_line,
            1,
        )
    return write(path, source)


def update_editor() -> bool:
    path = "admin/js/games-editor.js"
    source = read(path)
    old = '''  el.rebuildAllButton?.addEventListener('click', async () => {
    try {
      const response = await fetch('/admin/api/rebuild-games', { method: 'POST' });
      if (response.ok) {
        setRebuildStatus('Rebuild request sent successfully.', false);
        return;
      }
      setRebuildStatus('Could not run incremental refresh from browser. Run in terminal: node scripts/build-games.js', true);
    } catch (error) {
      setRebuildStatus('Could not run incremental refresh from browser. Run in terminal: node scripts/build-games.js', true);
    }
  });
'''
    new = '''  el.rebuildAllButton?.addEventListener('click', () => {
    setRebuildStatus('After placing the exported files in the repository, run: node scripts/rebuild-games.js. The hosted website cannot run server-side publishing.', false);
  });
'''
    source = replace_once(source, old, new, "replace unavailable rebuild request")
    source = source.replace(
        "if (/game-hero|<iframe|VideoGame|data-ccg-mode|data-mode=|resources\\/css\\/games\\.css/i.test(canonicalWrapperHtml))",
        "if (/game-hero|<iframe|data-ccg-mode|data-mode=|resources\\/css\\/games\\.css/i.test(canonicalWrapperHtml))",
    )
    schema_anchor = '''  const videoSchemaGraphSuffix = hasVideo
    ? `,
            {
            "@type": "VideoObject",
            "name": "${cleanForHtml(title)} Gameplay Video",
            "description": "${cleanForHtml(seoDescription)}",
            "thumbnailUrl": "https://i.ytimg.com/vi/${safeVideoId}/hqdefault.jpg",
            "embedUrl": "${safeVideoEmbed}",
            "url": "${cleanForHtml(seoUrls.canonicalUrl)}"
            }`
    : '';

  return {
'''
    schema_replacement = schema_anchor.replace(
        "\n  return {\n",
        '''
  const publisherName = String(publisherForSeo || '').trim();
  const genres = Array.isArray(state.draft.genres) ? state.draft.genres.filter(Boolean) : [];
  const gameNode = {
    "@type": "VideoGame",
    "@id": `${seoUrls.canonicalUrl}#game`,
    name: title,
    description: String(state.draft.description || seoDescription || '').trim(),
    url: seoUrls.canonicalUrl,
    datePublished: String(year),
    gamePlatform: normalizeSeoPlatformLabel(system),
    image: `${SITE_ORIGIN}/${String(imagePath || '').replace(/^\\/+/, '')}`
  };
  if (genres.length === 1) gameNode.genre = genres[0];
  if (genres.length > 1) gameNode.genre = genres;
  if (publisherName) gameNode.publisher = { "@type": "Organization", name: publisherName };
  const gameSchemaJson = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      gameNode,
      {
        "@type": "BreadcrumbList",
        "@id": `${seoUrls.canonicalUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
          { "@type": "ListItem", position: 2, name: "Games", item: `${SITE_ORIGIN}/games/` },
          { "@type": "ListItem", position: 3, name: title, item: seoUrls.canonicalUrl }
        ]
      }
    ]
  }).replace(/</g, "\\u003c");

  return {
''',
    )
    source = replace_once(source, schema_anchor, schema_replacement, "add editor schema graph")
    schema_var_line = "    GAME_SCHEMA_JSON: gameSchemaJson,\n"
    source = re.sub(
        r"(?:    GAME_SCHEMA_JSON: gameSchemaJson,\n)+",
        schema_var_line,
        source,
    )
    if schema_var_line not in source:
        source = replace_once(
            source,
            "    VIDEO_SCHEMA_GRAPH_SUFFIX: videoSchemaGraphSuffix,\n",
            "    VIDEO_SCHEMA_GRAPH_SUFFIX: videoSchemaGraphSuffix,\n" + schema_var_line,
            "add editor schema template variable",
        )
    source = source.replace("'- node scripts/build-games.js',\n    '- node scripts/generate-sitemaps.js',", "'- node scripts/rebuild-games.js',")
    source = source.replace("'- Upload as-is with no post-processing required.'", "'- These files are provisional package outputs; the authoritative rebuild command regenerates and validates all sitemaps.'")
    return write(path, source)


def update_editor_html() -> bool:
    path = "admin/games-editor.html"
    source = read(path)
    source = replace_once(
        source,
        '<button type="button" class="ccg-btn ccg-btn--ghost" data-action="rebuild-all">Rebuild All Game Pages</button>',
        '<button type="button" class="ccg-btn ccg-btn--ghost" data-action="rebuild-all">Show Publishing Command</button>',
        "rename rebuild button",
    )
    source = source.replace(
        '<button type="button" class="ccg-btn ccg-btn--ghost" data-action="fetch-lemon" onclick="fetchLemonData()">Auto Fill</button>',
        '<button type="button" class="ccg-btn ccg-btn--ghost" data-action="fetch-lemon" onclick="fetchLemonData()">Auto Fill from Lemon64</button>',
    )
    source = source.replace(
        '</div>\n        </div>\n        <div class="full">\n          <label>Genres *',
        '</div>\n          <p class="hint">Lemon64 can assist with title, year, publisher and credits, but imported facts must be reviewed before export.</p>\n        </div>\n        <div class="full">\n          <label>Genres *',
        1,
    )
    return write(path, source)


def update_template() -> bool:
    path = "admin/templates/game-landing-template.html"
    source = read(path)
    marker = '    <meta name="twitter:url" content="{{CANONICAL_URL}}">\n'
    schema = '    <script type="application/ld+json" data-ccg-schema="game-graph">{{GAME_SCHEMA_JSON}}</script>\n'
    if "{{GAME_SCHEMA_JSON}}" not in source:
        source = replace_once(source, marker, marker + schema, "add package schema placeholder")
    return write(path, source)


def update_workflow_ownership() -> list[str]:
    changed = []
    paths = [
        ".github/workflows/publisher-archives.yml",
        ".github/workflows/developer-archives.yml",
        ".github/workflows/composer-archives.yml",
        ".github/workflows/game-downloads.yml",
        ".github/workflows/year-platform-archives.yml",
    ]
    for path in paths:
        source = read(path)
        next_source = re.sub(r'^\s*-\s*["\']?games/games\.json["\']?\s*\n', '', source, flags=re.M)
        if next_source != source and write(path, next_source):
            changed.append(path)
    return changed


def main() -> None:
    changes = []
    for path, fn in [
        ("scripts/build-games.js", update_build_games),
        ("scripts/rebuild-games.js", update_rebuild_games),
        ("scripts/generate-year-platform-pages.js", update_year_generator),
        ("scripts/validate-year-platform-discovery.js", update_year_validator),
        ("admin/js/games-editor.js", update_editor),
        ("admin/games-editor.html", update_editor_html),
        ("admin/templates/game-landing-template.html", update_template),
    ]:
        if fn():
            changes.append(path)
    changes.extend(update_workflow_ownership())
    print("Phase 6B transformations applied:")
    for path in changes:
        print(f" - {path}")


if __name__ == "__main__":
    main()
