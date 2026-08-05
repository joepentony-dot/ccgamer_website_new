#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const errors = [];
const warnings = [];

function read(relativePath) {
    const fullPath = path.join(ROOT, relativePath);
    if (!fs.existsSync(fullPath)) {
        errors.push(`Missing required file: ${relativePath}`);
        return "";
    }
    return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
    const source = read(relativePath);
    if (!source) return null;
    try {
        return JSON.parse(source);
    } catch (error) {
        errors.push(`Invalid JSON in ${relativePath}: ${error.message}`);
        return null;
    }
}

function requireText(source, expected, message) {
    if (!source.includes(expected)) errors.push(message);
}

const redirects = read("_redirects");
const headers = read("_headers");
const apache = read("games/.htaccess");
const navCore = read("js/ccg-nav-core.js");
const consolidation = read("js/ccg-legacy-url-consolidation.js");
const handler = read("games/game.html");
const sitemap = read("sitemap-games.xml");
const gamesSearch = read("games/games-search.json");
const games = readJson("games/games.json");
const gamesIndex = readJson("games/games-index.json");

requireText(redirects, "/games/index.html /games/ 301!", "Missing permanent /games/index.html redirect.");
requireText(redirects, "/games/:slug.html /games/:slug/ 301!", "Missing flat game URL redirect.");
requireText(headers, "/games/game.html", "Missing game-handler header rule.");
requireText(headers, "X-Robots-Tag: noindex, follow", "The shared game handler must remain noindex.");
requireText(apache, "RewriteRule ^index\\.html$ /games/ [R=301,L,NE]", "Apache index.html redirect is missing.");
requireText(apache, "/games/$1/ [R=301,L,NE]", "Apache flat-game redirect is missing.");
requireText(navCore, "/js/ccg-legacy-url-consolidation.js", "The URL consolidation module is not loaded by the shared navigation core.");
requireText(consolidation, "findGame(await loadGames(), candidate)", "Legacy IDs are not resolved against the game database.");
requireText(consolidation, 'fetch(buildSitePath("games/games.json")', "The consolidation module does not load the canonical game database.");
requireText(consolidation, "replaceLocation(`games/${canonicalSlug}/`)", "Resolved games are not sent to canonical folder routes.");
requireText(handler, '<meta name="robots" content="noindex,follow">', "The shared game handler meta noindex is missing.");
requireText(handler, '<link rel="canonical" id="game-canonical"', "The runtime canonical link is missing.");

if (!Array.isArray(games) || games.length === 0) {
    errors.push("games/games.json must contain games.");
} else {
    const slugs = new Set();
    const ids = new Set();
    const reserved = new Set([
        "game", "index", "genres", "collections", "publishers",
        "developers", "years", "compare", "discover", "seo"
    ]);

    games.forEach((game, index) => {
        const slug = String(game?.slug || "").trim();
        const id = String(game?.id || "").trim();

        if (!slug) {
            errors.push(`Game ${index + 1} has no slug.`);
            return;
        }
        if (!id) errors.push(`Game ${slug} has no legacy ID.`);
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push(`Invalid slug: ${slug}`);
        if (reserved.has(slug)) errors.push(`Reserved slug used by a game: ${slug}`);
        if (slugs.has(slug)) errors.push(`Duplicate slug: ${slug}`);
        if (id && ids.has(id)) errors.push(`Duplicate game ID: ${id}`);

        slugs.add(slug);
        if (id) ids.add(id);
    });

    if (!Array.isArray(gamesIndex)) {
        errors.push("games/games-index.json must contain an array.");
    } else {
        const indexSlugs = new Set(gamesIndex.map((game) => String(game?.slug || "").trim()).filter(Boolean));
        slugs.forEach((slug) => {
            if (!indexSlugs.has(slug)) errors.push(`games-index.json is missing ${slug}.`);
        });
        indexSlugs.forEach((slug) => {
            if (!slugs.has(slug)) errors.push(`games-index.json contains unknown slug ${slug}.`);
        });
    }

    const sitemapUrls = new Set(
        Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1].trim())
    );
    let missingSitemapUrls = 0;
    slugs.forEach((slug) => {
        if (!sitemapUrls.has(`${SITE_ORIGIN}/games/${slug}/`)) missingSitemapUrls += 1;
    });
    if (missingSitemapUrls) errors.push(`sitemap-games.xml is missing ${missingSitemapUrls} canonical game URL(s).`);

    const staticRewrites = new Set();
    redirects.split(/\r?\n/).forEach((line) => {
        const match = line.trim().match(/^\/games\/([a-z0-9-]+)\/\s+\/games\/game\.html\?slug=\1\s+200!?$/i);
        if (match) staticRewrites.add(match[1]);
    });
    const missingExplicitRewrites = [...slugs].filter((slug) => !staticRewrites.has(slug));
    if (missingExplicitRewrites.length) {
        warnings.push(`${missingExplicitRewrites.length} game(s) rely on their physical folder page rather than an explicit _redirects rewrite: ${missingExplicitRewrites.join(", ")}.`);
    }

    console.log(`Checked ${slugs.size} canonical game slugs and ${ids.size} legacy IDs.`);
}

["/games/game.html?", "/games/index.html"].forEach((token) => {
    if (sitemap.includes(token)) errors.push(`sitemap-games.xml contains legacy URL token ${token}.`);
    if (gamesSearch.includes(token)) errors.push(`games-search.json contains legacy URL token ${token}.`);
});

const redirectCount = redirects.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("#")).length;
if (redirectCount > 1900) warnings.push(`_redirects contains ${redirectCount} rules and is nearing common platform limits.`);

warnings.forEach((warning) => console.warn(`Warning: ${warning}`));

if (errors.length) {
    console.error("Legacy route audit failed:");
    errors.forEach((error) => console.error(` - ${error}`));
    process.exit(1);
}

console.log("Legacy game route audit passed.");
