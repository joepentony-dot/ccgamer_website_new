#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");

const gamesIndexPath = path.join(repoRoot, "games", "index.html");
const metadataPath = path.join(repoRoot, "games", "archive-navigation.json");
const yearsDir = path.join(repoRoot, "games", "years");
const platformsDir = path.join(repoRoot, "games", "platforms");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");
const reportPath = path.join(repoRoot, "docs", "seo-baseline", "phase-4c-year-platform-discovery.md");

const BROWSE_MARKER = 'data-games-archive-shortcuts="true"';
const YEAR_NAV_MARKER = 'data-year-neighbor-navigation="true"';
const ARCHIVE_ENTRY_PATTERN = /^games\/(?:years|platforms)\//;

function fail(message) {
    console.error(`[year-platform-discovery] ${message}`);
    process.exit(1);
}

function readRequired(filePath) {
    if (!fs.existsSync(filePath)) {
        fail(`Missing required file: ${path.relative(repoRoot, filePath)}`);
    }
    return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
    try {
        return JSON.parse(readRequired(filePath));
    } catch (error) {
        fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
    }
}

function writeFileIfChanged(filePath, content) {
    const next = String(content);
    const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
    if (current === next) return false;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, next, "utf8");
    return true;
}

function htmlEscape(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function isOwnedArchiveEntry(entry) {
    return typeof entry === "string" && ARCHIVE_ENTRY_PATTERN.test(entry.replace(/^\/+/, ""));
}

function buildExpectedStaticEntries(metadata) {
    const years = Array.isArray(metadata.years) ? metadata.years : [];
    const platforms = Array.isArray(metadata.platforms) ? metadata.platforms : [];

    const entries = ["games/years/index.html"];
    years
        .filter((group) => group && group.indexable === true)
        .forEach((group) => entries.push(`games/years/${group.year}/index.html`));

    entries.push("games/platforms/index.html");
    platforms.forEach((group) => entries.push(`games/platforms/${group.key}/index.html`));

    return entries;
}

function updateStaticPages(metadata) {
    const current = readJson(staticPagesPath);
    if (!Array.isArray(current)) fail("tools/seo/static-pages.json must contain an array.");

    const foreignBefore = current.filter((entry) => !isOwnedArchiveEntry(entry));
    const expectedOwned = buildExpectedStaticEntries(metadata);
    const expectedOwnedSet = new Set(expectedOwned);

    // Keep all existing valid entries exactly where they are. Remove only stale
    // year/platform entries owned by this workflow, then append missing owned
    // entries in their stable expected order.
    const next = current.filter((entry) => !isOwnedArchiveEntry(entry) || expectedOwnedSet.has(entry));
    const missingOwned = expectedOwned.filter((entry) => !next.includes(entry));
    next.push(...missingOwned);

    const foreignAfter = next.filter((entry) => !isOwnedArchiveEntry(entry));
    if (JSON.stringify(foreignAfter) !== JSON.stringify(foreignBefore)) {
        fail("A non-year/platform static-page entry was removed or reordered.");
    }

    if (next.includes("games/years/2023/index.html")) {
        fail("The noindex 2023 route must not be registered as an indexable static page.");
    }

    const duplicates = next.filter((entry, index, all) => all.indexOf(entry) !== index);
    if (duplicates.length) {
        fail(`Duplicate static-page entries detected: ${[...new Set(duplicates)].join(", ")}`);
    }

    const ownedAfter = next.filter(isOwnedArchiveEntry);
    if (JSON.stringify(ownedAfter) !== JSON.stringify(expectedOwned)) {
        fail("Year/platform registry entries are not in their stable expected order.");
    }

    return {
        changed: writeFileIfChanged(staticPagesPath, `${JSON.stringify(next, null, 2)}\n`),
        foreignCount: foreignBefore.length,
        archiveCount: expectedOwned.length,
        appendedCount: missingOwned.length
    };
}

function renderBrowseShortcut() {
    return `

                <div class="games-hero__stats" data-games-archive-shortcuts="true">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/years/">Browse by Year</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/platforms/">Browse by Platform</a>
                    <span>Explore the game archive through dedicated release-year and Commodore platform pages.</span>
                </div>`;
}

function ensureBrowseGamesShortcuts(html) {
    if (html.includes(BROWSE_MARKER)) {
        if (!html.includes('href="/games/years/"') || !html.includes('href="/games/platforms/"')) {
            fail("The Browse Games archive shortcut block is incomplete.");
        }
        return html;
    }

    const developerBlock = /(\s*<div class="games-hero__stats" data-games-developers-shortcut="true">[\s\S]*?<\/div>)/;
    const downloadsBlock = /(\s*<div class="games-hero__stats" data-games-downloads-shortcut="true">[\s\S]*?<\/div>)/;
    const anchor = html.match(developerBlock) || html.match(downloadsBlock);
    if (!anchor) fail("Could not locate a bounded Browse Games shortcut insertion point.");

    return html.replace(anchor[0], `${anchor[0]}${renderBrowseShortcut()}`);
}

function renderYearNeighborNavigation(years, index) {
    const current = years[index];
    const previous = index > 0 ? years[index - 1] : null;
    const next = index < years.length - 1 ? years[index + 1] : null;
    const links = [];

    if (previous) {
        links.push(`<a class="ccg-btn ccg-btn--secondary" rel="prev" href="/games/years/${previous.year}/">← Previous Year: ${previous.year}</a>`);
    }
    links.push('<a class="ccg-btn ccg-btn--secondary" href="/games/years/">All Release Years</a>');
    if (next) {
        links.push(`<a class="ccg-btn ccg-btn--secondary" rel="next" href="/games/years/${next.year}/">Next Year: ${next.year} →</a>`);
    }

    return `            <nav class="ccg-archives-wayfinding ccg-archives-year-navigation" ${YEAR_NAV_MARKER} aria-label="Release year navigation">
                <h2>${current.year} Year Navigation</h2>
                <div class="ccg-archives-wayfinding__links">
                    ${links.join("\n                    ")}
                </div>
            </nav>

`;
}

function directPlatformLinks(yearGroup) {
    const links = [];
    if (Number(yearGroup.c64Count) > 0) {
        links.push('<a class="ccg-btn ccg-btn--secondary" href="/games/platforms/c64/">C64 Games</a>');
    }
    if (Number(yearGroup.amigaCount) > 0) {
        links.push('<a class="ccg-btn ccg-btn--secondary" href="/games/platforms/amiga/">Amiga Games</a>');
    }
    return links.map((link) => `                    ${link}`).join("\n");
}

function integrateYearPage(html, years, index) {
    const group = years[index];
    const existingNav = /\s*<nav class="ccg-archives-wayfinding ccg-archives-year-navigation" data-year-neighbor-navigation="true"[\s\S]*?<\/nav>\s*/;
    let next = html.replace(existingNav, "\n\n");

    const wayfindingMarker = '            <section class="ccg-archives-wayfinding">';
    if (!next.includes(wayfindingMarker)) {
        fail(`Could not locate year-page wayfinding for ${group.year}.`);
    }
    next = next.replace(wayfindingMarker, `${renderYearNeighborNavigation(years, index)}${wayfindingMarker}`);

    const genericPlatformLink = '                    <a class="ccg-btn ccg-btn--secondary" href="/games/platforms/">Platforms</a>';
    const directLinks = directPlatformLinks(group);
    if (next.includes(genericPlatformLink)) {
        next = next.replace(genericPlatformLink, directLinks);
    }

    if (!next.includes(YEAR_NAV_MARKER)) fail(`Year navigation was not added for ${group.year}.`);
    if (Number(group.c64Count) > 0 && !next.includes('href="/games/platforms/c64/"')) {
        fail(`C64 cross-link missing from ${group.year}.`);
    }
    if (Number(group.amigaCount) > 0 && !next.includes('href="/games/platforms/amiga/"')) {
        fail(`Amiga cross-link missing from ${group.year}.`);
    }

    return next;
}

function integratePlatformPage(html, group, otherGroup) {
    const otherLink = `<a class="ccg-btn ccg-btn--secondary" data-platform-cross-link="true" href="/games/platforms/${htmlEscape(otherGroup.key)}/">${htmlEscape(otherGroup.name)} Games</a>`;
    if (html.includes('data-platform-cross-link="true"')) {
        if (!html.includes(`href="/games/platforms/${otherGroup.key}/"`)) {
            fail(`${group.name} platform cross-link points to the wrong route.`);
        }
        return html;
    }

    const allPlatformsLink = '                    <a class="ccg-btn ccg-btn--secondary" href="/games/platforms/">All Platforms</a>';
    if (!html.includes(allPlatformsLink)) {
        fail(`Could not locate All Platforms link on the ${group.name} page.`);
    }

    return html.replace(allPlatformsLink, `${allPlatformsLink}\n                    ${otherLink}`);
}

function buildReport(metadata, registryResult) {
    const years = metadata.years || [];
    const indexableYears = years.filter((group) => group.indexable === true);

    return `# Phase 4C Year and Platform Archive Discovery Integration

## Results

| Check | Count |
|---|---:|
| Browse Games archive shortcuts | **2** |
| Year routes with previous/next navigation | **${years.length}** |
| Indexable year routes registered | **${indexableYears.length}** |
| Archive hubs registered | **2** |
| Platform routes registered | **${(metadata.platforms || []).length}** |
| Total archive entries managed in static registry | **${registryResult.archiveCount}** |
| New archive entries appended this run | **${registryResult.appendedCount}** |
| Existing non-archive registry entries preserved in order | **${registryResult.foreignCount}** |

## Discovery integration

- Added bounded Browse Games links to \`/games/years/\` and \`/games/platforms/\`.
- Added previous-year and next-year navigation across every represented release year.
- Added direct C64 and Amiga cross-links where those systems are represented on a year route.
- Added a direct cross-link between the C64 and Amiga platform archives.

## Sitemap policy

- Registered both archive hubs, both platform routes and the ${indexableYears.length} indexable year routes.
- Kept \`/games/years/2023/\` out of the static registry and sitemap while it remains \`noindex,follow\`.
- Preserved every existing valid registry entry in place and appended only missing year/platform entries.

## Permanent safeguards

- Phase 4B regeneration runs before Phase 4C integration.
- Phase 4C reapplies discovery links after generated pages are rebuilt.
- Validation checks registry membership, sitemap membership, route cross-links and foreign-entry order.
- Existing publisher, developer, composer, download, retro, genre, collection and core registry entries are not rewritten by the Phase 4C integration script.
- Existing valid year/platform entries are not removed and re-appended, preventing registry-order ping-pong with other archive workflows.

## Explicit exclusions

- No changes to \`games/games.json\`.
- No homepage or intro-loader changes.
- No new public route families.
- No sitemap inclusion for the noindex 2023 route.

## Rollback

Revert the Phase 4C squash merge commit. Phase 4B archive foundations remain independently restorable through their generator.
`;
}

function main() {
    const metadata = readJson(metadataPath);
    const years = Array.isArray(metadata.years) ? [...metadata.years].sort((a, b) => a.year - b.year) : [];
    const platforms = Array.isArray(metadata.platforms) ? metadata.platforms : [];

    if (!years.length) fail("Archive metadata contains no release years.");
    if (platforms.length !== 2) fail(`Expected two platform groups, found ${platforms.length}.`);

    let writes = 0;

    const browseCurrent = readRequired(gamesIndexPath);
    const browseNext = ensureBrowseGamesShortcuts(browseCurrent);
    if (writeFileIfChanged(gamesIndexPath, browseNext)) writes += 1;

    years.forEach((group, index) => {
        const filePath = path.join(yearsDir, String(group.year), "index.html");
        const current = readRequired(filePath);
        const next = integrateYearPage(current, years, index);
        if (writeFileIfChanged(filePath, next)) writes += 1;
    });

    platforms.forEach((group) => {
        const otherGroup = platforms.find((candidate) => candidate.key !== group.key);
        if (!otherGroup) fail(`Could not resolve the opposite platform for ${group.key}.`);
        const filePath = path.join(platformsDir, group.key, "index.html");
        const current = readRequired(filePath);
        const next = integratePlatformPage(current, group, otherGroup);
        if (writeFileIfChanged(filePath, next)) writes += 1;
    });

    const registryResult = updateStaticPages(metadata);
    if (registryResult.changed) writes += 1;
    if (writeFileIfChanged(reportPath, buildReport(metadata, registryResult))) writes += 1;

    console.log(`[year-platform-discovery] Release years integrated: ${years.length}`);
    console.log(`[year-platform-discovery] Indexable archive entries managed: ${registryResult.archiveCount}`);
    console.log(`[year-platform-discovery] Missing archive entries appended: ${registryResult.appendedCount}`);
    console.log(`[year-platform-discovery] Existing registry entries preserved: ${registryResult.foreignCount}`);
    console.log(`[year-platform-discovery] Files changed: ${writes}`);
}

if (require.main === module) main();

module.exports = {
    ARCHIVE_ENTRY_PATTERN,
    BROWSE_MARKER,
    YEAR_NAV_MARKER,
    buildExpectedStaticEntries,
    ensureBrowseGamesShortcuts,
    integratePlatformPage,
    integrateYearPage,
    isOwnedArchiveEntry,
    updateStaticPages
};
