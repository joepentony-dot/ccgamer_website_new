#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
    buildArchiveData,
    buildMetadata
} = require("./generate-year-platform-pages");
const {
    BROWSE_MARKER,
    YEAR_NAV_MARKER,
    buildExpectedStaticEntries,
    isOwnedArchiveEntry
} = require("./integrate-year-platform-discovery");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");

const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const gamesJsonPath = path.join(repoRoot, "games", "games.json");
const gamesIndexPath = path.join(repoRoot, "games", "index.html");
const metadataPath = path.join(repoRoot, "games", "archive-navigation.json");
const yearsDir = path.join(repoRoot, "games", "years");
const platformsDir = path.join(repoRoot, "games", "platforms");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");
const sitemapPagesPath = path.join(repoRoot, "sitemap-pages.xml");
const sitemapGamesPath = path.join(repoRoot, "sitemap-games.xml");
const sitemapIndexPath = path.join(repoRoot, "sitemap.xml");
const phase4cReportPath = path.join(repoRoot, "docs", "seo-baseline", "phase-4c-year-platform-discovery.md");
const phase4dReportPath = path.join(repoRoot, "docs", "seo-baseline", "phase-4d-year-platform-validation.md");
const PHASE5B_EXCLUDED_REGISTRY_ENTRY = "viewer/manual.html";
const PHASE5B_EXCLUDED_SITEMAP_URL = `${SITE_ORIGIN}/viewer/manual.html`;

function readRequired(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing required file: ${path.relative(repoRoot, filePath)}`);
    }
    return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
    return JSON.parse(readRequired(filePath));
}

function writeFileIfChanged(filePath, content) {
    const next = String(content);
    const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
    if (current === next) return false;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, next, "utf8");
    return true;
}

function optionPath(name) {
    const index = process.argv.indexOf(name);
    if (index < 0) return "";
    const value = process.argv[index + 1];
    if (!value) throw new Error(`${name} requires a path.`);
    return path.resolve(value);
}

function extractLocs(xml) {
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function countOccurrences(haystack, needle) {
    if (!needle) return 0;
    return haystack.split(needle).length - 1;
}

function getAttribute(tag, name) {
    const pattern = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i");
    const match = tag.match(pattern);
    return match ? match[2] : "";
}

function extractAnchorHrefs(html) {
    return [...html.matchAll(/<a\b[^>]*>/gi)]
        .map((match) => getAttribute(match[0], "href"))
        .filter(Boolean);
}

function countAnchorHref(html, href) {
    return extractAnchorHrefs(html).filter((candidate) => candidate === href).length;
}

function extractCanonicalUrls(html) {
    return [...html.matchAll(/<link\b[^>]*>/gi)]
        .filter((match) => getAttribute(match[0], "rel").toLowerCase() === "canonical")
        .map((match) => getAttribute(match[0], "href"));
}

function extractRobotsDirectives(html) {
    return [...html.matchAll(/<meta\b[^>]*>/gi)]
        .filter((match) => getAttribute(match[0], "name").toLowerCase() === "robots")
        .map((match) => getAttribute(match[0], "content"));
}

function extractJsonLd(html, pageLabel, problems) {
    const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const parsed = [];

    blocks.forEach((match, index) => {
        try {
            parsed.push(JSON.parse(match[1].trim()));
        } catch (error) {
            problems.push(`${pageLabel} contains invalid JSON-LD block ${index + 1}: ${error.message}`);
        }
    });

    return parsed;
}

function hasType(node, expectedType) {
    const rawType = node && node["@type"];
    if (Array.isArray(rawType)) return rawType.includes(expectedType);
    return rawType === expectedType;
}

function validateCanonicalAndRobots(html, pageLabel, canonicalUrl, robots, problems) {
    const canonicals = extractCanonicalUrls(html);
    if (canonicals.length !== 1) {
        problems.push(`${pageLabel} must contain exactly one canonical URL; found ${canonicals.length}`);
    } else if (canonicals[0] !== canonicalUrl) {
        problems.push(`${pageLabel} canonical mismatch: ${canonicals[0]} != ${canonicalUrl}`);
    }

    const directives = extractRobotsDirectives(html);
    if (directives.length !== 1) {
        problems.push(`${pageLabel} must contain exactly one robots directive; found ${directives.length}`);
    } else if (directives[0] !== robots) {
        problems.push(`${pageLabel} robots mismatch: ${directives[0]} != ${robots}`);
    }
}

function validateSchema(html, spec, problems) {
    const blocks = extractJsonLd(html, spec.label, problems);
    if (blocks.length !== 1) {
        problems.push(`${spec.label} must contain exactly one JSON-LD block; found ${blocks.length}`);
        return;
    }

    const root = blocks[0];
    if (root["@context"] !== "https://schema.org") {
        problems.push(`${spec.label} JSON-LD context must be https://schema.org`);
    }

    const graph = Array.isArray(root["@graph"]) ? root["@graph"] : [];
    const collections = graph.filter((node) => hasType(node, "CollectionPage"));
    const breadcrumbs = graph.filter((node) => hasType(node, "BreadcrumbList"));
    const itemLists = graph.filter((node) => hasType(node, "ItemList"));

    if (collections.length !== 1) problems.push(`${spec.label} must contain exactly one CollectionPage`);
    if (breadcrumbs.length !== 1) problems.push(`${spec.label} must contain exactly one BreadcrumbList`);
    if (itemLists.length !== 1) problems.push(`${spec.label} must contain exactly one ItemList`);

    if (collections.length === 1 && collections[0].url !== spec.canonicalUrl) {
        problems.push(`${spec.label} CollectionPage URL does not match its canonical`);
    }

    if (breadcrumbs.length === 1) {
        const items = Array.isArray(breadcrumbs[0].itemListElement) ? breadcrumbs[0].itemListElement : [];
        if (items.length !== spec.breadcrumbUrls.length) {
            problems.push(`${spec.label} BreadcrumbList length mismatch`);
        }
        spec.breadcrumbUrls.forEach((url, index) => {
            const item = items[index];
            if (!item || item.position !== index + 1 || item.item !== url) {
                problems.push(`${spec.label} breadcrumb ${index + 1} is invalid`);
            }
        });
    }

    if (itemLists.length === 1) {
        const list = itemLists[0];
        const items = Array.isArray(list.itemListElement) ? list.itemListElement : [];
        if (list.numberOfItems !== spec.itemUrls.length) {
            problems.push(`${spec.label} ItemList numberOfItems mismatch`);
        }
        if (items.length !== spec.itemUrls.length) {
            problems.push(`${spec.label} ItemList length mismatch`);
        }
        const seen = new Set();
        spec.itemUrls.forEach((url, index) => {
            const item = items[index];
            if (!item || item.position !== index + 1 || item.url !== url) {
                problems.push(`${spec.label} ItemList entry ${index + 1} is invalid`);
            }
            if (item && seen.has(item.url)) {
                problems.push(`${spec.label} ItemList contains duplicate URL: ${item.url}`);
            }
            if (item) seen.add(item.url);
        });
    }
}

function extractArchiveGameSlugs(html, pageLabel, problems) {
    const tags = [...html.matchAll(/<a\b[^>]*\bdata-archive-game\b[^>]*>/gi)].map((match) => match[0]);
    const slugs = [];

    tags.forEach((tag) => {
        const href = getAttribute(tag, "href");
        const match = href.match(/^\/games\/([^/]+)\/$/);
        if (!match) {
            problems.push(`${pageLabel} contains an invalid archive game link: ${href || "(missing href)"}`);
            return;
        }
        slugs.push(match[1]);
    });

    const duplicates = slugs.filter((slug, index, all) => all.indexOf(slug) !== index);
    if (duplicates.length) {
        problems.push(`${pageLabel} contains duplicate game links: ${[...new Set(duplicates)].join(", ")}`);
    }

    return slugs;
}

function compareExactList(actual, expected, label, problems) {
    if (actual.length !== expected.length) {
        problems.push(`${label} count mismatch: ${actual.length} != ${expected.length}`);
        return;
    }
    expected.forEach((value, index) => {
        if (actual[index] !== value) {
            problems.push(`${label} differs at position ${index + 1}: ${actual[index]} != ${value}`);
        }
    });
}

function validateCanonicalGameRoutes(games, problems) {
    let validated = 0;
    games.forEach((game) => {
        const filePath = path.join(repoRoot, "games", game.slug, "index.html");
        if (!fs.existsSync(filePath)) {
            problems.push(`Archive game target does not exist: /games/${game.slug}/`);
            return;
        }
        const html = readRequired(filePath);
        const expectedCanonical = `${SITE_ORIGIN}/games/${game.slug}/`;
        const canonicals = extractCanonicalUrls(html);
        if (canonicals.length !== 1 || canonicals[0] !== expectedCanonical) {
            problems.push(`Game route /games/${game.slug}/ is not its own canonical route`);
            return;
        }
        validated += 1;
    });
    return validated;
}

function validateBaselineRegistry(current, baseline, problems) {
    const baselineForeign = baseline.filter((entry) => !isOwnedArchiveEntry(entry));
    const currentForeign = current.filter((entry) => !isOwnedArchiveEntry(entry));
    const expectedForeign = baselineForeign.filter((entry) => entry !== PHASE5B_EXCLUDED_REGISTRY_ENTRY);
    const comparableCurrent = currentForeign.filter((entry) => entry !== PHASE5B_EXCLUDED_REGISTRY_ENTRY);

    const missingForeign = expectedForeign.filter((entry) => !comparableCurrent.includes(entry));
    const unexpectedForeign = comparableCurrent.filter((entry) => !expectedForeign.includes(entry));
    if (missingForeign.length) problems.push(`Non-year/platform registry entries missing: ${missingForeign.join(", ")}`);
    if (unexpectedForeign.length) problems.push(`Unexpected non-year/platform registry entries: ${unexpectedForeign.join(", ")}`);
    if (currentForeign.includes(PHASE5B_EXCLUDED_REGISTRY_ENTRY)) {
        problems.push(`Phase 5B noindex utility remains in the static registry: ${PHASE5B_EXCLUDED_REGISTRY_ENTRY}`);
    }
}

function validateBaselineSitemap(currentXml, baselineXml, label, problems) {
    const currentLocs = extractLocs(currentXml);
    const baselineLocs = extractLocs(baselineXml);
    const expectedLocs = baselineLocs.filter((url) => url !== PHASE5B_EXCLUDED_SITEMAP_URL);
    const comparableCurrent = currentLocs.filter((url) => url !== PHASE5B_EXCLUDED_SITEMAP_URL);

    const missingLocs = expectedLocs.filter((url) => !comparableCurrent.includes(url));
    const unexpectedLocs = comparableCurrent.filter((url) => !expectedLocs.includes(url));
    if (missingLocs.length) problems.push(`${label} URLs missing: ${missingLocs.join(", ")}`);
    if (unexpectedLocs.length) problems.push(`Unexpected ${label} URLs: ${unexpectedLocs.join(", ")}`);
    if (currentLocs.includes(PHASE5B_EXCLUDED_SITEMAP_URL)) {
        problems.push(`Phase 5B noindex utility remains in ${label}: ${PHASE5B_EXCLUDED_SITEMAP_URL}`);
    }
}

function buildReport(summary) {
    return `# Phase 4D Permanent Year and Platform Archive Validation

## Final validation results

| Check | Result |
|---|---:|
| Source game records validated | **${summary.gameCount}** |
| Unique public archive routes | **${summary.publicArchiveRoutes}** |
| Archive pages with canonical, robots and schema validation | **${summary.schemaPages}** |
| Year-page game memberships validated | **${summary.yearMembershipLinks}** |
| C64 platform memberships validated | **${summary.c64MembershipLinks}** |
| Amiga platform memberships validated | **${summary.amigaMembershipLinks}** |
| Existing canonical game targets validated | **${summary.canonicalGameRoutes}** |
| Indexable archive routes in registry and sitemap | **${summary.registeredArchiveRoutes}** |
| Existing non-archive registry entries preserved by exact membership | **${summary.preservedForeignRegistryEntries}** |
| Noindex year routes excluded | **${summary.noindexYearRoutes}** |

## Requirements already satisfied before Phase 4D

- Static year and platform routes were generated deterministically.
- Browse Games contained one bounded year/platform discovery block.
- Previous-year and next-year links followed the represented-year sequence.
- Relevant platform cross-links, static registry entries and sitemap entries were present.
- The 2023 route used \`noindex,follow\` and was excluded from indexable discovery files.
- Protected-file hashing, bounded generated scope and repeat-generation checks were active.

## Safeguards added or strengthened in Phase 4D

- Exact route uniqueness across both hubs, every represented year route and both platform routes.
- Exactly one correct canonical and robots directive on every archive page.
- Structural validation of CollectionPage, BreadcrumbList and ItemList JSON-LD on every archive page.
- Exact source-data membership checks using totals derived from the current games database.
- Validation that every archive game target exists and is its own canonical game route.
- Exact registry and sitemap occurrence checks for all 18 indexable archive routes.
- Absence checks preventing irrelevant C64 or Amiga cross-links on year pages.
- Exact membership checks for registry entries and sitemap URLs owned by other workflows; Phase 6B separately enforces deterministic current ordering.
- Phase 5B compatibility permits only the reviewed manual-viewer utility exclusion and rejects its reintroduction.

## Safety

- No changes to \`games/games.json\`.
- No changes to \`index.html\`, \`home.html\`, \`resources/css/intro.css\` or \`js/index-intro.js\`.
- No archive design, copy, route, thumbnail or public navigation redesign.
- Phase 4B generation and Phase 4C discovery integration remain the source of public output.

## Rollback

Revert the Phase 4D squash merge commit. Phase 4B and Phase 4C public archive output remains independently generated and restorable.
`;
}

function main() {
    const problems = [];
    const sourceGames = readJson(gamesJsonPath);
    const archiveData = buildArchiveData(sourceGames);
    const metadata = readJson(metadataPath);
    const expectedMetadata = buildMetadata(archiveData);
    const years = archiveData.years;
    const platforms = archiveData.platforms;
    const staticPages = readJson(staticPagesPath);
    const sitemapPages = readRequired(sitemapPagesPath);
    const sitemapGames = readRequired(sitemapGamesPath);
    const sitemapIndex = readRequired(sitemapIndexPath);
    const browseGames = readRequired(gamesIndexPath);
    const expectedStaticEntries = buildExpectedStaticEntries(metadata);
    const expectedUrls = expectedStaticEntries.map((entry) => `${SITE_ORIGIN}/${entry.replace(/index\.html$/, "")}`);
    const writeReportPath = optionPath("--write-report");

    if (!Array.isArray(sourceGames)) problems.push("games/games.json must contain an array");
    if (!Array.isArray(staticPages)) problems.push("Static pages config is not an array");
    if (JSON.stringify(metadata) !== JSON.stringify(expectedMetadata)) {
        problems.push("games/archive-navigation.json does not match games/games.json");
    }

    const routeUrls = [
        metadata.yearHub,
        metadata.platformHub,
        ...years.map((group) => group.url),
        ...platforms.map((group) => group.url)
    ];
    const duplicateRoutes = routeUrls.filter((route, index, all) => all.indexOf(route) !== index);
    if (duplicateRoutes.length) problems.push(`Duplicate archive routes: ${[...new Set(duplicateRoutes)].join(", ")}`);
    if (new Set(years.map((group) => group.year)).size !== years.length) problems.push("Duplicate release years detected");
    if (new Set(platforms.map((group) => group.key)).size !== platforms.length) problems.push("Duplicate platform keys detected");
    if (platforms.length !== 2) problems.push(`Expected two platform routes, found ${platforms.length}`);
    if (archiveData.games.length < 651) problems.push(`Game total fell below the protected Phase 6A baseline: ${archiveData.games.length}`);

    if (countOccurrences(browseGames, BROWSE_MARKER) !== 1) {
        problems.push("Browse Games must contain exactly one archive shortcut block");
    }
    if (countAnchorHref(browseGames, "/games/years/") !== 1) problems.push("Browse Games must contain exactly one year-hub link");
    if (countAnchorHref(browseGames, "/games/platforms/") !== 1) problems.push("Browse Games must contain exactly one platform-hub link");

    const staticDuplicates = staticPages.filter((entry, index, all) => all.indexOf(entry) !== index);
    if (staticDuplicates.length) problems.push(`Duplicate static registry entries: ${[...new Set(staticDuplicates)].join(", ")}`);
    expectedStaticEntries.forEach((entry) => {
        const count = staticPages.filter((candidate) => candidate === entry).length;
        if (count !== 1) problems.push(`Expected exactly one static registry entry for ${entry}; found ${count}`);
    });
    const ownedEntries = staticPages.filter(isOwnedArchiveEntry);
    compareExactList(ownedEntries, expectedStaticEntries, "Owned year/platform registry entries", problems);

    const noindexEntries = years
        .filter((group) => !group.indexable)
        .map((group) => `games/years/${group.year}/index.html`);
    noindexEntries.forEach((entry) => {
        if (staticPages.includes(entry)) problems.push(`Noindex year route is present in the static registry: ${entry}`);
    });

    const sitemapPagesLocs = extractLocs(sitemapPages);
    const sitemapGamesLocs = extractLocs(sitemapGames);
    const sitemapIndexLocs = extractLocs(sitemapIndex);
    const sitemapPageDuplicates = sitemapPagesLocs.filter((url, index, all) => all.indexOf(url) !== index);
    if (sitemapPageDuplicates.length) problems.push(`Duplicate sitemap-pages URLs: ${[...new Set(sitemapPageDuplicates)].join(", ")}`);

    expectedUrls.forEach((url) => {
        const pageCount = sitemapPagesLocs.filter((candidate) => candidate === url).length;
        if (pageCount !== 1) problems.push(`Expected exactly one sitemap-pages entry for ${url}; found ${pageCount}`);
        if (sitemapGamesLocs.includes(url)) problems.push(`Archive URL is incorrectly present in sitemap-games.xml: ${url}`);
        if (sitemapIndexLocs.includes(url)) problems.push(`Archive URL is incorrectly present in sitemap.xml: ${url}`);
    });

    const noindexUrls = years
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

    if (sitemapIndexLocs.filter((url) => url === `${SITE_ORIGIN}/sitemap-pages.xml`).length !== 1) {
        problems.push("sitemap.xml must reference sitemap-pages.xml exactly once");
    }
    if (sitemapIndexLocs.filter((url) => url === `${SITE_ORIGIN}/sitemap-games.xml`).length !== 1) {
        problems.push("sitemap.xml must reference sitemap-games.xml exactly once");
    }

    const yearHubHtml = readRequired(path.join(yearsDir, "index.html"));
    validateCanonicalAndRobots(yearHubHtml, "Year hub", `${SITE_ORIGIN}/games/years/`, "index,follow", problems);
    validateSchema(yearHubHtml, {
        label: "Year hub",
        canonicalUrl: `${SITE_ORIGIN}/games/years/`,
        breadcrumbUrls: [`${SITE_ORIGIN}/`, `${SITE_ORIGIN}/games/`, `${SITE_ORIGIN}/games/years/`],
        itemUrls: years.map((group) => `${SITE_ORIGIN}${group.url}`)
    }, problems);

    const platformHubHtml = readRequired(path.join(platformsDir, "index.html"));
    validateCanonicalAndRobots(platformHubHtml, "Platform hub", `${SITE_ORIGIN}/games/platforms/`, "index,follow", problems);
    validateSchema(platformHubHtml, {
        label: "Platform hub",
        canonicalUrl: `${SITE_ORIGIN}/games/platforms/`,
        breadcrumbUrls: [`${SITE_ORIGIN}/`, `${SITE_ORIGIN}/games/`, `${SITE_ORIGIN}/games/platforms/`],
        itemUrls: platforms.map((group) => `${SITE_ORIGIN}${group.url}`)
    }, problems);

    const yearMembershipCounts = new Map();
    let yearMembershipLinks = 0;

    years.forEach((group, index) => {
        const pageLabel = `${group.year} year archive`;
        const filePath = path.join(yearsDir, String(group.year), "index.html");
        const html = readRequired(filePath);
        const canonicalUrl = `${SITE_ORIGIN}${group.url}`;
        const expectedRobots = group.indexable ? "index,follow" : "noindex,follow";
        const expectedSlugs = group.games.map((game) => game.slug);
        const actualSlugs = extractArchiveGameSlugs(html, pageLabel, problems);
        const previous = index > 0 ? years[index - 1] : null;
        const next = index < years.length - 1 ? years[index + 1] : null;

        validateCanonicalAndRobots(html, pageLabel, canonicalUrl, expectedRobots, problems);
        validateSchema(html, {
            label: pageLabel,
            canonicalUrl,
            breadcrumbUrls: [`${SITE_ORIGIN}/`, `${SITE_ORIGIN}/games/`, `${SITE_ORIGIN}/games/years/`, canonicalUrl],
            itemUrls: group.games.map((game) => `${SITE_ORIGIN}/games/${game.slug}/`)
        }, problems);
        compareExactList(actualSlugs, expectedSlugs, `${pageLabel} game links`, problems);

        if (countOccurrences(html, YEAR_NAV_MARKER) !== 1) {
            problems.push(`${group.year} must contain exactly one year navigation block`);
        }
        if (countAnchorHref(html, "/games/years/") < 1) problems.push(`${group.year} is missing the All Release Years link`);

        const previousHref = previous ? `/games/years/${previous.year}/` : "";
        const nextHref = next ? `/games/years/${next.year}/` : "";
        const prevMatches = [...html.matchAll(/<a\b[^>]*\brel=["']prev["'][^>]*>/gi)]
            .map((match) => getAttribute(match[0], "href"));
        const nextMatches = [...html.matchAll(/<a\b[^>]*\brel=["']next["'][^>]*>/gi)]
            .map((match) => getAttribute(match[0], "href"));
        compareExactList(prevMatches, previous ? [previousHref] : [], `${group.year} previous-year navigation`, problems);
        compareExactList(nextMatches, next ? [nextHref] : [], `${group.year} next-year navigation`, problems);

        const c64Links = countAnchorHref(html, "/games/platforms/c64/");
        const amigaLinks = countAnchorHref(html, "/games/platforms/amiga/");
        if (c64Links !== (group.c64Count > 0 ? 1 : 0)) {
            problems.push(`${group.year} C64 cross-link count is ${c64Links}; expected ${group.c64Count > 0 ? 1 : 0}`);
        }
        if (amigaLinks !== (group.amigaCount > 0 ? 1 : 0)) {
            problems.push(`${group.year} Amiga cross-link count is ${amigaLinks}; expected ${group.amigaCount > 0 ? 1 : 0}`);
        }

        actualSlugs.forEach((slug) => yearMembershipCounts.set(slug, (yearMembershipCounts.get(slug) || 0) + 1));
        yearMembershipLinks += actualSlugs.length;
    });

    const platformMembershipCounts = new Map();
    const platformLinkTotals = new Map();

    platforms.forEach((group) => {
        const pageLabel = `${group.name} platform archive`;
        const filePath = path.join(platformsDir, group.key, "index.html");
        const html = readRequired(filePath);
        const canonicalUrl = `${SITE_ORIGIN}${group.url}`;
        const expectedSlugs = group.games.map((game) => game.slug);
        const actualSlugs = extractArchiveGameSlugs(html, pageLabel, problems);
        const otherGroup = platforms.find((candidate) => candidate.key !== group.key);

        validateCanonicalAndRobots(html, pageLabel, canonicalUrl, "index,follow", problems);
        validateSchema(html, {
            label: pageLabel,
            canonicalUrl,
            breadcrumbUrls: [`${SITE_ORIGIN}/`, `${SITE_ORIGIN}/games/`, `${SITE_ORIGIN}/games/platforms/`, canonicalUrl],
            itemUrls: group.games.map((game) => `${SITE_ORIGIN}/games/${game.slug}/`)
        }, problems);
        compareExactList(actualSlugs, expectedSlugs, `${pageLabel} game links`, problems);

        if (countOccurrences(html, 'data-platform-cross-link="true"') !== 1) {
            problems.push(`${group.name} must contain exactly one opposite-platform cross-link`);
        }
        if (!otherGroup || countAnchorHref(html, `/games/platforms/${otherGroup.key}/`) !== 1) {
            problems.push(`${group.name} must contain exactly one opposite-platform route link`);
        }
        if (countAnchorHref(html, "/games/years/") < 1) {
            problems.push(`${group.name} is missing the release-year hub link`);
        }

        actualSlugs.forEach((slug) => platformMembershipCounts.set(slug, (platformMembershipCounts.get(slug) || 0) + 1));
        platformLinkTotals.set(group.key, actualSlugs.length);
    });

    archiveData.games.forEach((game) => {
        if (yearMembershipCounts.get(game.slug) !== 1) {
            problems.push(`${game.slug} appears ${yearMembershipCounts.get(game.slug) || 0} times across year routes; expected 1`);
        }
        if (platformMembershipCounts.get(game.slug) !== 1) {
            problems.push(`${game.slug} appears ${platformMembershipCounts.get(game.slug) || 0} times across platform routes; expected 1`);
        }
    });

    const expectedYearMembershipLinks = archiveData.games.length;
    const expectedC64MembershipLinks = platforms.find((group) => group.key === "c64")?.games.length || 0;
    const expectedAmigaMembershipLinks = platforms.find((group) => group.key === "amiga")?.games.length || 0;
    if (yearMembershipLinks !== expectedYearMembershipLinks) {
        problems.push(`Year membership total is ${yearMembershipLinks}; expected ${expectedYearMembershipLinks}`);
    }
    if (platformLinkTotals.get("c64") !== expectedC64MembershipLinks) {
        problems.push(`C64 membership total is ${platformLinkTotals.get("c64")}; expected ${expectedC64MembershipLinks}`);
    }
    if (platformLinkTotals.get("amiga") !== expectedAmigaMembershipLinks) {
        problems.push(`Amiga membership total is ${platformLinkTotals.get("amiga")}; expected ${expectedAmigaMembershipLinks}`);
    }

    const canonicalGameRoutes = validateCanonicalGameRoutes(archiveData.games, problems);

    const baselineStaticPagesPath = optionPath("--baseline-static-pages");
    if (baselineStaticPagesPath) {
        const baseline = readJson(baselineStaticPagesPath);
        if (!Array.isArray(baseline)) problems.push("Baseline static pages config is not an array");
        else validateBaselineRegistry(staticPages, baseline, problems);
    }

    [
        ["--baseline-sitemap-index", sitemapIndex, "sitemap.xml"],
        ["--baseline-sitemap-pages", sitemapPages, "sitemap-pages.xml"],
        ["--baseline-sitemap-games", sitemapGames, "sitemap-games.xml"]
    ].forEach(([option, currentXml, label]) => {
        const baselinePath = optionPath(option);
        if (baselinePath) validateBaselineSitemap(currentXml, readRequired(baselinePath), label, problems);
    });

    if (!fs.existsSync(phase4cReportPath)) problems.push("Phase 4C report is missing");
    if (!writeReportPath && !fs.existsSync(phase4dReportPath)) problems.push("Phase 4D report is missing");

    if (problems.length) {
        throw new Error(problems.join("\n"));
    }

    const summary = {
        gameCount: archiveData.games.length,
        publicArchiveRoutes: routeUrls.length,
        schemaPages: routeUrls.length,
        yearMembershipLinks,
        c64MembershipLinks: platformLinkTotals.get("c64"),
        amigaMembershipLinks: platformLinkTotals.get("amiga"),
        canonicalGameRoutes,
        registeredArchiveRoutes: expectedStaticEntries.length,
        noindexYearRoutes: years.filter((group) => !group.indexable).length,
        preservedForeignRegistryEntries: staticPages.filter((entry) => !isOwnedArchiveEntry(entry)).length,
        sitemapArchiveUrls: expectedUrls.length,
        noindexYearExcluded: 2023
    };

    if (writeReportPath) {
        writeFileIfChanged(writeReportPath, buildReport(summary));
    }

    console.log(JSON.stringify(summary, null, 2));
}

main();
