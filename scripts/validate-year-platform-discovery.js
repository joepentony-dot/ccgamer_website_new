#!/usr/bin/env node

"use strict";

// Final settled-head validation trigger; no generated output depends on this comment.

const fs = require("fs");
const path = require("path");
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
const gamesIndexPath = path.join(repoRoot, "games", "index.html");
const metadataPath = path.join(repoRoot, "games", "archive-navigation.json");
const yearsDir = path.join(repoRoot, "games", "years");
const platformsDir = path.join(repoRoot, "games", "platforms");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");
const sitemapPagesPath = path.join(repoRoot, "sitemap-pages.xml");
const sitemapIndexPath = path.join(repoRoot, "sitemap.xml");
const reportPath = path.join(repoRoot, "docs", "seo-baseline", "phase-4c-year-platform-discovery.md");

function readRequired(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing required file: ${path.relative(repoRoot, filePath)}`);
    }
    return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
    return JSON.parse(readRequired(filePath));
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

function validateBaselineRegistryMembership(current, baseline, problems) {
    const currentSet = new Set(current);
    baseline.forEach((entry) => {
        if (typeof entry !== "string") return;
        if (!currentSet.has(entry)) {
            problems.push(`Existing static registry entry was lost: ${entry}`);
        }
    });
}

function validateBaselineSitemap(currentXml, baselineXml, problems) {
    const currentLocs = new Set(extractLocs(currentXml));
    const baselineLocs = extractLocs(baselineXml);
    baselineLocs.forEach((loc) => {
        if (!currentLocs.has(loc)) problems.push(`Existing sitemap URL was lost: ${loc}`);
    });
}

function main() {
    const problems = [];
    const metadata = readJson(metadataPath);
    const years = Array.isArray(metadata.years) ? [...metadata.years].sort((a, b) => a.year - b.year) : [];
    const platforms = Array.isArray(metadata.platforms) ? metadata.platforms : [];
    const staticPages = readJson(staticPagesPath);
    const sitemapPages = readRequired(sitemapPagesPath);
    const sitemapIndex = readRequired(sitemapIndexPath);
    const browseGames = readRequired(gamesIndexPath);
    const expectedStaticEntries = buildExpectedStaticEntries(metadata);
    const expectedUrls = expectedStaticEntries.map((entry) => {
        const route = entry.replace(/index\.html$/, "");
        return `${SITE_ORIGIN}/${route}`;
    });

    if (!Array.isArray(staticPages)) problems.push("Static pages config is not an array");
    if (years.length !== 15) problems.push(`Expected 15 represented years, found ${years.length}`);
    if (platforms.length !== 2) problems.push(`Expected two platform routes, found ${platforms.length}`);

    if (countOccurrences(browseGames, BROWSE_MARKER) !== 1) {
        problems.push("Browse Games must contain exactly one archive shortcut block");
    }
    if (!browseGames.includes('href="/games/years/"')) problems.push("Browse Games year-hub link is missing");
    if (!browseGames.includes('href="/games/platforms/"')) problems.push("Browse Games platform-hub link is missing");

    const duplicates = staticPages.filter((entry, index, all) => all.indexOf(entry) !== index);
    if (duplicates.length) problems.push(`Duplicate static registry entries: ${[...new Set(duplicates)].join(", ")}`);

    expectedStaticEntries.forEach((entry) => {
        if (!staticPages.includes(entry)) problems.push(`Archive route missing from static registry: ${entry}`);
    });
    const ownedEntries = staticPages.filter(isOwnedArchiveEntry);
    if (JSON.stringify(ownedEntries) !== JSON.stringify(expectedStaticEntries)) {
        problems.push("Owned year/platform registry entries do not match the expected stable order");
    }
    if (staticPages.includes("games/years/2023/index.html")) {
        problems.push("The noindex 2023 route is present in the static registry");
    }

    expectedUrls.forEach((url) => {
        if (countOccurrences(sitemapPages, `<loc>${url}</loc>`) !== 1) {
            problems.push(`Expected exactly one sitemap entry for ${url}`);
        }
    });
    const noindexUrl = `${SITE_ORIGIN}/games/years/2023/`;
    if (sitemapPages.includes(`<loc>${noindexUrl}</loc>`)) {
        problems.push("The noindex 2023 route is present in sitemap-pages.xml");
    }
    if (!sitemapIndex.includes(`<loc>${SITE_ORIGIN}/sitemap-pages.xml</loc>`)) {
        problems.push("sitemap.xml does not reference sitemap-pages.xml");
    }
    if (!sitemapIndex.includes(`<loc>${SITE_ORIGIN}/sitemap-games.xml</loc>`)) {
        problems.push("sitemap.xml does not reference sitemap-games.xml");
    }

    years.forEach((group, index) => {
        const filePath = path.join(yearsDir, String(group.year), "index.html");
        const html = readRequired(filePath);
        const previous = index > 0 ? years[index - 1] : null;
        const next = index < years.length - 1 ? years[index + 1] : null;
        const expectedRobots = group.indexable ? "index,follow" : "noindex,follow";

        if (countOccurrences(html, YEAR_NAV_MARKER) !== 1) {
            problems.push(`${group.year} must contain exactly one year navigation block`);
        }
        if (!html.includes(`name="robots" content="${expectedRobots}"`)) {
            problems.push(`${group.year} robots directive does not match metadata`);
        }
        if (!html.includes('href="/games/years/"')) problems.push(`${group.year} is missing the All Release Years link`);

        if (previous && !html.includes(`rel="prev" href="/games/years/${previous.year}/"`)) {
            problems.push(`${group.year} is missing previous-year link to ${previous.year}`);
        }
        if (!previous && /rel="prev" href="\/games\/years\//.test(html)) {
            problems.push(`${group.year} contains an unexpected previous-year link`);
        }
        if (next && !html.includes(`rel="next" href="/games/years/${next.year}/"`)) {
            problems.push(`${group.year} is missing next-year link to ${next.year}`);
        }
        if (!next && /rel="next" href="\/games\/years\//.test(html)) {
            problems.push(`${group.year} contains an unexpected next-year link`);
        }

        if (Number(group.c64Count) > 0 && !html.includes('href="/games/platforms/c64/"')) {
            problems.push(`${group.year} is missing its C64 cross-link`);
        }
        if (Number(group.amigaCount) > 0 && !html.includes('href="/games/platforms/amiga/"')) {
            problems.push(`${group.year} is missing its Amiga cross-link`);
        }
    });

    platforms.forEach((group) => {
        const otherGroup = platforms.find((candidate) => candidate.key !== group.key);
        const filePath = path.join(platformsDir, group.key, "index.html");
        const html = readRequired(filePath);
        if (countOccurrences(html, 'data-platform-cross-link="true"') !== 1) {
            problems.push(`${group.name} must contain exactly one opposite-platform cross-link`);
        }
        if (!otherGroup || !html.includes(`href="/games/platforms/${otherGroup.key}/"`)) {
            problems.push(`${group.name} is missing the opposite-platform route link`);
        }
        if (!html.includes('href="/games/years/"')) {
            problems.push(`${group.name} is missing the release-year hub link`);
        }
    });

    const baselineStaticPagesPath = optionPath("--baseline-static-pages");
    if (baselineStaticPagesPath) {
        const baseline = readJson(baselineStaticPagesPath);
        if (!Array.isArray(baseline)) problems.push("Baseline static pages config is not an array");
        else validateBaselineRegistryMembership(staticPages, baseline, problems);
    }

    const baselineSitemapPath = optionPath("--baseline-sitemap-pages");
    if (baselineSitemapPath) {
        validateBaselineSitemap(sitemapPages, readRequired(baselineSitemapPath), problems);
    }

    if (!fs.existsSync(reportPath)) problems.push("Phase 4C report is missing");

    if (problems.length) {
        throw new Error(problems.join("\n"));
    }

    console.log(JSON.stringify({
        representedYears: years.length,
        indexableYears: years.filter((group) => group.indexable).length,
        platformRoutes: platforms.length,
        registeredArchiveRoutes: expectedStaticEntries.length,
        preservedForeignRegistryEntries: staticPages.filter((entry) => !isOwnedArchiveEntry(entry)).length,
        sitemapArchiveUrls: expectedUrls.length,
        noindexYearExcluded: 2023
    }, null, 2));
}

main();
