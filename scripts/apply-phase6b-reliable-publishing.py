#!/usr/bin/env python3
"""Apply the bounded Phase 6B publishing-chain corrections."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    path = ROOT / relative
    if not path.exists():
        raise SystemExit(f"Missing required file: {relative}")
    return path.read_text(encoding="utf-8")


def write(relative: str, content: str) -> bool:
    path = ROOT / relative
    current = path.read_text(encoding="utf-8") if path.exists() else None
    if current == content:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return True


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if new in source:
        return source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected one {label} anchor, found {count}.")
    return source.replace(old, new, 1)


def patch_build_games() -> bool:
    relative = "scripts/build-games.js"
    source = read(relative)
    old = """  runSeoVerification();
}"""
    new = """  if (process.env.CCG_DEFER_SEO_VERIFY === "1") {
    console.log("[DATA] SEO verification deferred to the authoritative publishing pipeline.");
  } else {
    runSeoVerification();
  }
}"""
    return write(relative, replace_once(source, old, new, "build-games SEO ordering"))


def patch_year_generator() -> bool:
    relative = "scripts/generate-year-platform-pages.js"
    source = read(relative)
    old = """    const data = buildArchiveData(sourceGames);
    if (data.games.length !== 651) fail(`Expected the Phase 4A baseline of 651 games, found ${data.games.length}.`);
    if (data.years.length !== 15) fail(`Expected 15 release years, found ${data.years.length}.`);
    if (data.platforms.find((group) => group.key === "c64").count !== 552) fail("C64 total no longer matches the Phase 4A baseline of 552.");
    if (data.platforms.find((group) => group.key === "amiga").count !== 99) fail("Amiga total no longer matches the Phase 4A baseline of 99.");

    const duplicateGameSlugs = data.games"""
    new = """    const sourceIds = sourceGames.map((game) => String(game && game.id || "").trim()).filter(Boolean);
    const duplicateGameIds = sourceIds.filter((id, index, all) => all.indexOf(id) !== index);
    if (duplicateGameIds.length) fail(`Duplicate game ids: ${[...new Set(duplicateGameIds)].join(", ")}`);

    const data = buildArchiveData(sourceGames);
    if (data.games.length !== sourceGames.length) fail(`Archive normalization lost game records: ${data.games.length} != ${sourceGames.length}.`);
    if (data.platforms.length !== 2) fail(`Expected the supported C64 and Amiga platform groups, found ${data.platforms.length}.`);
    const platformMembershipTotal = data.platforms.reduce((total, group) => total + group.count, 0);
    if (platformMembershipTotal !== data.games.length) {
        fail(`Platform membership total is ${platformMembershipTotal}; expected ${data.games.length}.`);
    }

    const duplicateGameSlugs = data.games"""
    source = replace_once(source, old, new, "year/platform fixed totals")
    return write(relative, source)


def patch_year_validator() -> bool:
    relative = "scripts/validate-year-platform-discovery.js"
    source = read(relative)

    old_counts = """    if (new Set(years.map((group) => group.year)).size !== years.length) problems.push("Duplicate release years detected");
    if (new Set(platforms.map((group) => group.key)).size !== platforms.length) problems.push("Duplicate platform keys detected");
    if (years.length !== 15) problems.push(`Expected 15 represented years, found ${years.length}`);
    if (platforms.length !== 2) problems.push(`Expected two platform routes, found ${platforms.length}`);
    if (archiveData.games.length !== 651) problems.push(`Expected 651 games, found ${archiveData.games.length}`);
"""
    new_counts = """    if (new Set(years.map((group) => group.year)).size !== years.length) problems.push("Duplicate release years detected");
    if (new Set(platforms.map((group) => group.key)).size !== platforms.length) problems.push("Duplicate platform keys detected");
    if (platforms.length !== 2) problems.push(`Expected the supported C64 and Amiga platform routes, found ${platforms.length}`);
    if (archiveData.games.length !== sourceGames.length) problems.push(`Archive game count ${archiveData.games.length} does not match source count ${sourceGames.length}`);
    if (metadata.gameCount !== sourceGames.length) problems.push(`Archive metadata game count ${metadata.gameCount} does not match source count ${sourceGames.length}`);

    const sourceIds = sourceGames.map((game) => String(game && game.id || "").trim()).filter(Boolean);
    const sourceSlugs = sourceGames.map((game) => String(game && game.slug || "").trim()).filter(Boolean);
    const duplicateIds = sourceIds.filter((id, index, all) => all.indexOf(id) !== index);
    const duplicateSlugs = sourceSlugs.filter((slug, index, all) => all.indexOf(slug) !== index);
    if (duplicateIds.length) problems.push(`Duplicate source game ids: ${[...new Set(duplicateIds)].join(", ")}`);
    if (duplicateSlugs.length) problems.push(`Duplicate source game slugs: ${[...new Set(duplicateSlugs)].join(", ")}`);
"""
    source = replace_once(source, old_counts, new_counts, "year/platform validator fixed totals")

    old_noindex_entry = """    const noindexEntry = "games/years/2023/index.html";
    if (staticPages.includes(noindexEntry)) problems.push("The noindex 2023 route is present in the static registry");
"""
    new_noindex_entry = """    const noindexEntries = years
        .filter((group) => !group.indexable)
        .map((group) => `games/years/${group.year}/index.html`);
    noindexEntries.forEach((entry) => {
        if (staticPages.includes(entry)) problems.push(`Noindex year route is present in the static registry: ${entry}`);
    });
"""
    source = replace_once(source, old_noindex_entry, new_noindex_entry, "dynamic noindex registry validation")

    old_noindex_url = """    const noindexUrl = `${SITE_ORIGIN}/games/years/2023/`;
    [
        ["sitemap.xml", sitemapIndexLocs],
        ["sitemap-pages.xml", sitemapPagesLocs],
        ["sitemap-games.xml", sitemapGamesLocs]
    ].forEach(([label, urls]) => {
        if (urls.includes(noindexUrl)) problems.push(`The noindex 2023 route is present in ${label}`);
    });
"""
    new_noindex_url = """    const noindexUrls = years
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
"""
    source = replace_once(source, old_noindex_url, new_noindex_url, "dynamic noindex sitemap validation")

    old_memberships = """    if (yearMembershipLinks !== 651) problems.push(`Year membership total is ${yearMembershipLinks}; expected 651`);
    if (platformLinkTotals.get("c64") !== 552) problems.push(`C64 membership total is ${platformLinkTotals.get("c64")}; expected 552`);
    if (platformLinkTotals.get("amiga") !== 99) problems.push(`Amiga membership total is ${platformLinkTotals.get("amiga")}; expected 99`);
"""
    new_memberships = """    if (yearMembershipLinks !== archiveData.games.length) {
        problems.push(`Year membership total is ${yearMembershipLinks}; expected ${archiveData.games.length}`);
    }
    platforms.forEach((group) => {
        const actual = platformLinkTotals.get(group.key) || 0;
        if (actual !== group.games.length) {
            problems.push(`${group.name} membership total is ${actual}; expected ${group.games.length}`);
        }
    });
"""
    source = replace_once(source, old_memberships, new_memberships, "data-derived membership totals")

    source = source.replace(
        "| Noindex year excluded | **2023** |",
        "| Noindex year routes excluded | **${summary.noindexYears.join(\", \") || \"None\"}** |",
    )
    source = source.replace(
        "- Exact route uniqueness across both hubs, all 15 year routes and both platform routes.",
        "- Exact route uniqueness across both hubs, all ${summary.yearRoutes} represented year routes and both platform routes.",
    )
    source = source.replace(
        "- Exact source-data membership checks for all 651 year links, 552 C64 links and 99 Amiga links.",
        "- Exact source-data membership checks for all ${summary.yearMembershipLinks} year links, ${summary.c64MembershipLinks} C64 links and ${summary.amigaMembershipLinks} Amiga links.",
    )
    source = source.replace(
        "- Exact registry and sitemap occurrence checks for all 18 indexable archive routes.",
        "- Exact registry and sitemap occurrence checks for all ${summary.registeredArchiveRoutes} indexable archive routes.",
    )

    old_summary = """        noindexYearExcluded: 2023
    };"""
    new_summary = """        yearRoutes: years.length,
        platformRoutes: platforms.length,
        noindexYears: years.filter((group) => !group.indexable).map((group) => group.year)
    };"""
    source = replace_once(source, old_summary, new_summary, "year/platform validator summary")
    return write(relative, source)


def patch_editor_source() -> bool:
    relative = "admin/js/games-editor.js"
    source = read(relative)

    source = replace_once(
        source,
        "const GAME_OUTPUT_UTILS_PATH = '/scripts/game-output-utils.js';\n",
        "const GAME_OUTPUT_UTILS_PATH = '/scripts/game-output-utils.js';\nconst LOCAL_REBUILD_API = 'http://127.0.0.1:3131/admin/api/rebuild-games';\n",
        "local rebuild API constant",
    )
    source = replace_once(
        source,
        "  bindEvents();\n  await Promise.all([loadGameOutputUtils(), loadLibrary(), loadTemplates(), loadSiteSettings()]);",
        "  bindEvents();\n  configureLocalRebuildButton();\n  await Promise.all([loadGameOutputUtils(), loadLibrary(), loadTemplates(), loadSiteSettings()]);",
        "local rebuild button initialization",
    )

    old_listener = """  el.rebuildAllButton?.addEventListener('click', async () => {
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
"""
    new_listener = """  el.rebuildAllButton?.addEventListener('click', async () => {
    if (!isLocalEditorHost()) {
      setRebuildStatus('Local rebuild is unavailable on the hosted admin page. Copy the package into the repository and run: npm run rebuild:games', true);
      return;
    }

    el.rebuildAllButton.disabled = true;
    setRebuildStatus('Running the complete local publishing pipeline…', false);
    try {
      const response = await fetch(LOCAL_REBUILD_API, {
        method: 'POST',
        headers: { 'X-CCG-Local-Rebuild': '1' }
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.ok) {
        setRebuildStatus('Full local rebuild and validation completed successfully.', false);
        return;
      }
      throw new Error(payload.message || payload.error || `HTTP ${response.status}`);
    } catch (error) {
      setRebuildStatus(`Local rebuild failed: ${error.message}. Run in terminal: npm run rebuild:games`, true);
    } finally {
      el.rebuildAllButton.disabled = false;
    }
  });
"""
    source = replace_once(source, old_listener, new_listener, "rebuild button handler")

    anchor = "function addNewCategoryEscapeHatch() {"
    helper = """function isLocalEditorHost() {
  return ['localhost', '127.0.0.1'].includes(String(window.location.hostname || '').toLowerCase());
}

function configureLocalRebuildButton() {
  if (!el.rebuildAllButton) return;
  const local = isLocalEditorHost();
  el.rebuildAllButton.disabled = !local;
  el.rebuildAllButton.title = local
    ? 'Runs npm run rebuild:games through the loopback-only local admin API.'
    : 'Available only when this editor is opened from localhost or 127.0.0.1.';
  if (!local) {
    setRebuildStatus('Hosted mode: download the package, commit the source files, then let the central GitHub publishing workflow rebuild generated output.', false, true);
  }
}

"""
    if helper not in source:
        source = replace_once(source, anchor, helper + anchor, "local rebuild helper insertion")

    schema_anchor = "function buildTemplateVars({ slug, title, year, system, publisherForSeo, imagePath, seoDescription }) {"
    schema_helpers = """function serializeJsonForHtml(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\\u2028/g, '\\u2028')
    .replace(/\\u2029/g, '\\u2029');
}

function buildGameSchemaForTemplate({ slug, title, year, system, publisherForSeo, imagePath, description }) {
  const canonicalUrl = getGameOutputUtils().getGameCanonicalUrl(slug, SITE_ORIGIN);
  const platform = normalizeSeoPlatformLabel(system);
  const imageUrl = String(imagePath || '').startsWith('http')
    ? String(imagePath)
    : `${SITE_ORIGIN}/${String(imagePath || '').replace(/^\\/+/, '')}`;
  const game = {
    '@type': 'VideoGame',
    '@id': `${canonicalUrl}#game`,
    name: title,
    description,
    url: canonicalUrl,
    datePublished: String(year),
    gamePlatform: platform,
    image: imageUrl
  };
  if (Array.isArray(state.draft.genres) && state.draft.genres.length) {
    game.genre = state.draft.genres.length === 1 ? state.draft.genres[0] : [...state.draft.genres];
  }
  if (publisherForSeo) game.publisher = { '@type': 'Organization', name: publisherForSeo };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      game,
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_ORIGIN },
          { '@type': 'ListItem', position: 2, name: 'Games', item: `${SITE_ORIGIN}/games/` },
          { '@type': 'ListItem', position: 3, name: title, item: canonicalUrl }
        ]
      }
    ]
  };
}

"""
    if schema_helpers not in source:
        source = replace_once(source, schema_anchor, schema_helpers + schema_anchor, "browser schema helper insertion")

    old_return_start = """  return {
    GAME_NAME: cleanForHtml(title),"""
    new_return_start = """  const schemaDescription = String(state.draft.description || seoDescription || '').trim();
  const gameSchema = buildGameSchemaForTemplate({
    slug,
    title,
    year,
    system,
    publisherForSeo,
    imagePath,
    description: schemaDescription
  });

  return {
    GAME_NAME: cleanForHtml(title),"""
    source = replace_once(source, old_return_start, new_return_start, "browser template schema construction")
    source = replace_once(
        source,
        "    FB_APP_ID_META: buildFacebookAppIdMeta(state.siteSettings.facebookAppId)\n",
        "    FB_APP_ID_META: buildFacebookAppIdMeta(state.siteSettings.facebookAppId),\n    GAME_SCHEMA_JSON: serializeJsonForHtml(gameSchema)\n",
        "browser template schema variable",
    )

    old_layout_check = """  if (/game-hero|<iframe|VideoGame|data-ccg-mode|data-mode=|resources\/css\/games\.css/i.test(nested)) errors.push('Generated landing page contains duplicate standalone game layout.');

  const redirect = flat;"""
    new_layout_check = """  if (/game-hero|<iframe|data-ccg-mode|data-mode=|resources\/css\/games\.css/i.test(nested)) errors.push('Generated landing page contains duplicate standalone game layout.');

  const schemaBlocks = [...nested.matchAll(/<script\\b[^>]*type=["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi)];
  if (schemaBlocks.length !== 1) {
    errors.push(`Generated landing page must contain exactly one JSON-LD block; found ${schemaBlocks.length}.`);
  } else {
    try {
      const parsed = JSON.parse(schemaBlocks[0][1].trim());
      const graph = Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [];
      const gameNodes = graph.filter((node) => node?.['@type'] === 'VideoGame');
      const breadcrumbNodes = graph.filter((node) => node?.['@type'] === 'BreadcrumbList');
      if (gameNodes.length !== 1) errors.push('Generated landing page must contain exactly one VideoGame object.');
      if (breadcrumbNodes.length !== 1) errors.push('Generated landing page must contain exactly one BreadcrumbList object.');
      if (gameNodes[0]?.url !== seoUrls.canonicalUrl) errors.push('Generated VideoGame URL does not match the canonical URL.');
    } catch (error) {
      errors.push(`Generated landing page JSON-LD is invalid: ${error.message}`);
    }
  }

  const redirect = flat;"""
    source = replace_once(source, old_layout_check, new_layout_check, "browser package schema validation")

    source = source.replace("- node scripts/build-games.js',\n    '- node scripts/generate-sitemaps.js", "- npm run rebuild:games")
    source = source.replace(
        "- Upload as-is with no post-processing required.'",
        "- Generated sitemap files are previews. The authoritative rebuild command regenerates and validates them before deployment.'",
    )
    return write(relative, source)


def patch_editor_html() -> bool:
    relative = "admin/games-editor.html"
    source = read(relative)
    source = replace_once(
        source,
        '<button type="button" class="ccg-btn ccg-btn--ghost" data-action="rebuild-all">Rebuild All Game Pages</button>',
        '<button type="button" class="ccg-btn ccg-btn--ghost" data-action="rebuild-all">Run Local Full Rebuild</button>',
        "local rebuild button label",
    )
    source = replace_once(
        source,
        '      <p class="status" data-top-status>Loading existing games…</p>',
        '      <p class="hint">The rebuild control works only from a localhost editor connected to the loopback admin API. Hosted mode uses the deployment package and central GitHub workflow.</p>\n      <p class="status" data-top-status>Loading existing games…</p>',
        "local rebuild explanation",
    )
    return write(relative, source)


def patch_landing_template() -> bool:
    relative = "admin/templates/game-landing-template.html"
    source = read(relative)
    schema = '    <script type="application/ld+json" data-ccg-schema="game-graph">{{GAME_SCHEMA_JSON}}</script>\n'
    if schema not in source:
        source = replace_once(source, '<meta charset="UTF-8" />', schema + '<meta charset="UTF-8" />', "landing-template schema")
    return write(relative, source)


def patch_package_json() -> bool:
    relative = "package.json"
    source = read(relative)
    source = replace_once(
        source,
        '    "rebuild:games": "node scripts/rebuild-games.js",\n',
        '    "rebuild:games": "node scripts/rebuild-games.js",\n    "validate:games": "node scripts/validate-game-catalogue.js",\n    "test:games-editor": "node tests/games-editor-package.test.mjs",\n',
        "package publishing scripts",
    )
    return write(relative, source)


def patch_legacy_workflow_triggers() -> list[str]:
    changed: list[str] = []
    targets = [
        ".github/workflows/publisher-archives.yml",
        ".github/workflows/developer-archives.yml",
        ".github/workflows/composer-archives.yml",
        ".github/workflows/game-downloads.yml",
        ".github/workflows/year-platform-archives.yml",
    ]
    line = '      - "games/games.json"\n'
    for relative in targets:
        source = read(relative)
        next_source = source.replace(line, "")
        if next_source == source:
            raise SystemExit(f"Could not remove games/games.json trigger from {relative}")
        header = "# Game-catalogue changes are generated by the Phase 6B central publishing workflow.\n"
        if not next_source.startswith(header):
            next_source = header + next_source
        if write(relative, next_source):
            changed.append(relative)
    return changed


def retire_phase6a_automatic_reruns() -> bool:
    relative = ".github/workflows/phase-6a-games-editor-publishing-audit.yml"
    source = read(relative)
    pattern = re.compile(r"on:\n  pull_request:[\s\S]*?  workflow_dispatch:\n", re.M)
    replacement = "on:\n  workflow_dispatch:\n"
    if replacement == source[source.find("on:"):source.find("permissions:")]:
        return False
    next_source, count = pattern.subn(replacement, source, count=1)
    if count != 1:
        raise SystemExit("Could not retire automatic Phase 6A workflow reruns.")
    return write(relative, next_source)


def main() -> None:
    changed: list[str] = []
    operations = [
        ("scripts/build-games.js", patch_build_games),
        ("scripts/generate-year-platform-pages.js", patch_year_generator),
        ("scripts/validate-year-platform-discovery.js", patch_year_validator),
        ("admin/js/games-editor.js", patch_editor_source),
        ("admin/games-editor.html", patch_editor_html),
        ("admin/templates/game-landing-template.html", patch_landing_template),
        ("package.json", patch_package_json),
        (".github/workflows/phase-6a-games-editor-publishing-audit.yml", retire_phase6a_automatic_reruns),
    ]
    for relative, operation in operations:
        if operation():
            changed.append(relative)
    changed.extend(patch_legacy_workflow_triggers())
    print("Phase 6B patched files:")
    for relative in changed:
        print(f"- {relative}")


if __name__ == "__main__":
    main()
