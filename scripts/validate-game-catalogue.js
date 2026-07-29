#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");
const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const gamesPath = path.join(repoRoot, "games", "games.json");
const indexPath = path.join(repoRoot, "games", "games-index.json");
const searchPath = path.join(repoRoot, "games", "games-search.json");
const sitemapPath = path.join(repoRoot, "sitemap-games.xml");

function fail(message) {
    throw new Error(message);
}

function readText(filePath) {
    if (!fs.existsSync(filePath)) fail(`Missing required file: ${path.relative(repoRoot, filePath)}`);
    return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
    try {
        return JSON.parse(readText(filePath));
    } catch (error) {
        fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
    }
}

function optionValue(name) {
    const index = process.argv.indexOf(name);
    if (index < 0) return "";
    const value = process.argv[index + 1];
    if (!value) fail(`${name} requires a path.`);
    return path.resolve(value);
}

function normalizeSystem(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "c64" || raw === "commodore 64") return "c64";
    if (raw === "amiga" || raw === "commodore amiga") return "amiga";
    return "";
}

function getAttribute(tag, name) {
    const pattern = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i");
    const match = String(tag || "").match(pattern);
    return match ? match[2] : "";
}

function extractJsonLd(html, label, problems) {
    const blocks = [...String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const parsed = [];
    blocks.forEach((match, index) => {
        try {
            parsed.push(JSON.parse(match[1].trim()));
        } catch (error) {
            problems.push(`${label} has invalid JSON-LD block ${index + 1}: ${error.message}`);
        }
    });
    return parsed;
}

function flattenSchemaNodes(blocks) {
    const nodes = [];
    blocks.forEach((block) => {
        if (Array.isArray(block?.["@graph"])) nodes.push(...block["@graph"]);
        else if (block && typeof block === "object") nodes.push(block);
    });
    return nodes;
}

function hasType(node, type) {
    const raw = node?.["@type"];
    return Array.isArray(raw) ? raw.includes(type) : raw === type;
}

function canonicalUrls(html) {
    return [...String(html).matchAll(/<link\b[^>]*>/gi)]
        .filter((match) => getAttribute(match[0], "rel").toLowerCase() === "canonical")
        .map((match) => getAttribute(match[0], "href"));
}

function robotsValues(html) {
    return [...String(html).matchAll(/<meta\b[^>]*>/gi)]
        .filter((match) => getAttribute(match[0], "name").toLowerCase() === "robots")
        .map((match) => getAttribute(match[0], "content").toLowerCase());
}

function validateSource(games, baselineGames, problems) {
    if (!Array.isArray(games) || games.length === 0) {
        problems.push("games/games.json must contain a non-empty array.");
        return;
    }

    const ids = new Map();
    const slugs = new Map();
    games.forEach((game, index) => {
        const label = `Record ${index + 1}`;
        const id = String(game?.id || "").trim();
        const slug = String(game?.slug || "").trim();
        const title = String(game?.title || "").trim();
        const year = Number(game?.year);
        const system = normalizeSystem(game?.system || game?.platform);

        if (!id) problems.push(`${label} has no id.`);
        if (!slug) problems.push(`${label} has no slug.`);
        if (!title) problems.push(`${label} has no title.`);
        if (!Number.isInteger(year)) problems.push(`${label} has no valid numeric year.`);
        if (!system) problems.push(`${label} has unsupported system: ${game?.system || game?.platform || "(missing)"}`);
        if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) problems.push(`${label} has a non-canonical slug: ${slug}`);
        if (id && !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(id)) problems.push(`${label} has a non-canonical id: ${id}`);

        if (id) {
            if (!ids.has(id)) ids.set(id, []);
            ids.get(id).push(index + 1);
        }
        if (slug) {
            if (!slugs.has(slug)) slugs.set(slug, []);
            slugs.get(slug).push(index + 1);
        }
    });

    for (const [id, positions] of ids.entries()) {
        if (positions.length > 1) problems.push(`Duplicate game id ${id}: records ${positions.join(", ")}`);
    }
    for (const [slug, positions] of slugs.entries()) {
        if (positions.length > 1) problems.push(`Duplicate game slug ${slug}: records ${positions.join(", ")}`);
    }

    if (Array.isArray(baselineGames)) {
        const currentIds = new Set(games.map((game) => String(game?.id || "").trim()).filter(Boolean));
        const currentSlugs = new Set(games.map((game) => String(game?.slug || "").trim()).filter(Boolean));
        const missing = baselineGames.filter((game) => {
            const id = String(game?.id || "").trim();
            const slug = String(game?.slug || "").trim();
            return (id && !currentIds.has(id)) || (slug && !currentSlugs.has(slug));
        });
        if (missing.length) {
            problems.push(`Catalogue lost ${missing.length} baseline game record(s): ${missing.slice(0, 20).map((game) => game.slug || game.id).join(", ")}`);
        }
    }
}

function validateSchemaForGame(game, html, canonicalUrl, problems) {
    const label = `/games/${game.slug}/`;
    const blocks = extractJsonLd(html, label, problems);
    const nodes = flattenSchemaNodes(blocks);
    const gameNodes = nodes.filter((node) => hasType(node, "VideoGame"));
    const breadcrumbs = nodes.filter((node) => hasType(node, "BreadcrumbList"));

    if (gameNodes.length !== 1) problems.push(`${label} must contain exactly one VideoGame object; found ${gameNodes.length}`);
    if (breadcrumbs.length !== 1) problems.push(`${label} must contain exactly one BreadcrumbList; found ${breadcrumbs.length}`);

    if (gameNodes.length === 1) {
        const node = gameNodes[0];
        if (node.url !== canonicalUrl) problems.push(`${label} VideoGame URL mismatch.`);
        if (node.name !== String(game.title || "").trim()) problems.push(`${label} VideoGame name mismatch.`);
        if (String(node.datePublished || "") !== String(game.year || "")) problems.push(`${label} VideoGame year mismatch.`);
        const expectedPlatform = normalizeSystem(game.system || game.platform) === "amiga" ? "Amiga" : "Commodore 64";
        if (node.gamePlatform !== expectedPlatform) problems.push(`${label} VideoGame platform mismatch.`);
    }

    if (breadcrumbs.length === 1) {
        const items = Array.isArray(breadcrumbs[0].itemListElement) ? breadcrumbs[0].itemListElement : [];
        const expected = [SITE_ORIGIN, `${SITE_ORIGIN}/games/`, canonicalUrl];
        if (items.length !== expected.length) problems.push(`${label} breadcrumb length mismatch.`);
        expected.forEach((url, index) => {
            const item = items[index];
            if (!item || item.position !== index + 1 || item.item !== url) {
                problems.push(`${label} breadcrumb ${index + 1} mismatch.`);
            }
        });
    }
}

function countOccurrences(text, needle) {
    return needle ? String(text).split(needle).length - 1 : 0;
}

function validateOutputs(games, problems) {
    const indexData = readJson(indexPath);
    const searchData = readJson(searchPath);
    const sitemap = readText(sitemapPath);

    if (!Array.isArray(indexData)) problems.push("games/games-index.json must contain an array.");
    if (!Array.isArray(searchData)) problems.push("games/games-search.json must contain an array.");

    games.forEach((game) => {
        const slug = String(game.slug || "").trim();
        if (!slug) return;
        const canonicalUrl = `${SITE_ORIGIN}/games/${slug}/`;
        const canonicalPath = path.join(repoRoot, "games", slug, "index.html");
        const redirectPath = path.join(repoRoot, "games", `${slug}.html`);
        const yearPath = path.join(repoRoot, "games", "years", String(game.year), "index.html");
        const platform = normalizeSystem(game.system || game.platform);
        const platformPath = path.join(repoRoot, "games", "platforms", platform, "index.html");

        if (!fs.existsSync(canonicalPath)) {
            problems.push(`Missing canonical wrapper: /games/${slug}/`);
        } else {
            const html = readText(canonicalPath);
            const canonicals = canonicalUrls(html);
            if (canonicals.length !== 1 || canonicals[0] !== canonicalUrl) problems.push(`/games/${slug}/ canonical mismatch.`);
            validateSchemaForGame(game, html, canonicalUrl, problems);
        }

        if (!fs.existsSync(redirectPath)) {
            problems.push(`Missing legacy redirect: /games/${slug}.html`);
        } else {
            const html = readText(redirectPath);
            if (!robotsValues(html).includes("noindex,follow")) problems.push(`/games/${slug}.html is missing noindex,follow.`);
            if (!html.includes(`/games/${slug}/`)) problems.push(`/games/${slug}.html does not target its canonical route.`);
        }

        if (Array.isArray(indexData) && indexData.filter((item) => item?.slug === slug).length !== 1) {
            problems.push(`games-index.json must contain ${slug} exactly once.`);
        }
        if (Array.isArray(searchData) && searchData.filter((item) => item?.slug === slug).length !== 1) {
            problems.push(`games-search.json must contain ${slug} exactly once.`);
        }
        if (countOccurrences(sitemap, canonicalUrl) !== 1) problems.push(`sitemap-games.xml must contain ${canonicalUrl} exactly once.`);

        if (!fs.existsSync(yearPath) || !readText(yearPath).includes(`href="/games/${slug}/"`)) {
            problems.push(`${slug} is missing from its ${game.year} archive.`);
        }
        if (!platform || !fs.existsSync(platformPath) || !readText(platformPath).includes(`href="/games/${slug}/"`)) {
            problems.push(`${slug} is missing from its ${platform || "unknown"} platform archive.`);
        }
    });
}

function main() {
    const problems = [];
    const games = readJson(gamesPath);
    const baselinePath = optionValue("--baseline-games");
    const baselineGames = baselinePath ? readJson(baselinePath) : null;
    validateSource(games, baselineGames, problems);

    const sourceOnly = process.argv.includes("--source-only");
    if (!sourceOnly && !problems.length) validateOutputs(games, problems);

    if (problems.length) fail(problems.join("\n"));

    const platformTotals = { c64: 0, amiga: 0 };
    const years = new Set();
    games.forEach((game) => {
        const platform = normalizeSystem(game.system || game.platform);
        if (platform) platformTotals[platform] += 1;
        years.add(Number(game.year));
    });

    console.log(JSON.stringify({
        mode: sourceOnly ? "source" : "outputs",
        gameCount: games.length,
        c64Count: platformTotals.c64,
        amigaCount: platformTotals.amiga,
        representedYears: [...years].filter(Number.isInteger).sort((a, b) => a - b),
        baselineCompared: Boolean(baselinePath),
        problems: 0
    }, null, 2));
}

try {
    main();
} catch (error) {
    console.error(`[game-catalogue] ${error.message}`);
    process.exit(1);
}
