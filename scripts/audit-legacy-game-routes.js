#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const errors = [];
const warnings = [];

function read(relativePath) {
    const filePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(filePath)) {
        errors.push(`Missing required file: ${relativePath}`);
        return "";
    }
    return fs.readFileSync(filePath, "utf8");
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

function assertMatch(source, pattern, message) {
    if (!pattern.test(source)) errors.push(message);
}

function canonicalUrl(slug) {
    return `${SITE_ORIGIN}/games/${slug}/`;
}

const redirects = read("_redirects");
const headers = read("_headers");
const apacheRules = read("games/.htaccess");
const navCore = read("js/ccg-nav-core.js");
const routeNormalizer = read("js/ccg-legacy-route-normalizer.js");
const gameHandler = read("games/game.html");
const sitemapGames = read("sitemap-games.xml");
const games = readJson("games/games.json");
const gamesIndex = readJson("games/games-index.json");
const gamesSearchSource = read("games/games-search.json");

assertMatch(
    redirects,
    /^\/games\/index\.html\s+\/games\/\s+301!?\s*$/m,
    "_redirects must permanently redirect /games/index.html to /games/."
);
assertMatch(
    redirects,
    /^\/games\/:slug\.html\s+\/games\/:slug\/\s+301!?\s*$/m,
    "_redirects must permanently redirect flat game HTML URLs to folder URLs."
);
assertMatch(
    redirects,
    /^\/games\/:slug\/\s+\/games\/game\.html\?slug=:slug\s+200!?\s*$/m,
    "_redirects must internally serve canonical game folders through the shared handler."
);
assertMatch(
    headers,
    /\/games\/game\.html\s*[\r\n]+\s*X-Robots-Tag:\s*noindex,\s*follow/i,
    "The shared game handler must carry an HTTP noindex directive."
);
assertMatch(
    apacheRules,
    /RewriteRule \^index\\\.html\$ \/games\/ \[R=301,L,NE\]/,
    "games/.htaccess must canonicalise the explicit index.html URL."
);
assertMatch(
    apacheRules,
    /RewriteRule \^\(\?!game\\\.html\$\|index\\\.html\$\).*\/games\/\$1\/ \[R=301,L,NE\]/,
    "games/.htaccess must canonicalise old flat game HTML files."
);
assertMatch(
    navCore,
    /\/js\/ccg-legacy-route-normalizer\.js/,
    "The shared navigation core must load the legacy route normalizer."
);
assertMatch(
    routeNormalizer,
    /history\.replaceState/,
    "The legacy route normalizer must replace old handler URLs without reloading."
);
assertMatch(
    routeNormalizer,
    /fetch\("\/games\/games\.json"/,
    "The legacy route normalizer must resolve historic game IDs against games.json."
);
assertMatch(
    gameHandler,
    /<meta name="robots" content="noindex,follow">/i,
    "games/game.html must retain its noindex,follow meta directive."
);
assertMatch(
    gameHandler,
    /<link rel="canonical" id="game-canonical"/i,
    "games/game.html must retain its runtime canonical link."
);

if (!Array.isArray(games) || games.length === 0) {
    errors.push("games/games.json must contain at least one game.");
} else {
    const slugSet = new Set();
    const reserved = new Set([
        "game", "index", "genres", "collections", "publishers",
        "developers", "years", "compare", "discover", "seo"
    ]);

    games.forEach((game, index) => {
        const slug = String(game?.slug || "").trim();
        if (!slug) {
            errors.push(`games.json entry ${index + 1} is missing a slug.`);
            return;
        }
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            errors.push(`Invalid canonical slug: ${slug}`);
        }
        if (reserved.has(slug)) {
            errors.push(`Reserved route used as a game slug: ${slug}`);
        }
        if (slugSet.has(slug)) {
            errors.push(`Duplicate game slug: ${slug}`);
        }
        slugSet.add(slug);
    });

    if (Array.isArray(gamesIndex)) {
        const indexSlugs = new Set(gamesIndex.map((game) => String(game?.slug || "").trim()).filter(Boolean));
        slugSet.forEach((slug) => {
            if (!indexSlugs.has(slug)) errors.push(`games-index.json is missing slug: ${slug}`);
        });
        indexSlugs.forEach((slug) => {
            if (!slugSet.has(slug)) errors.push(`games-index.json contains an unknown slug: ${slug}`);
        });
    } else {
        errors.push("games/games-index.json must contain an array.");
    }

    const sitemapUrls = new Set(
        Array.from(sitemapGames.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1].trim())
    );
    let missingSitemapCount = 0;
    slugSet.forEach((slug) => {
        if (!sitemapUrls.has(canonicalUrl(slug))) missingSitemapCount += 1;
    });
    if (missingSitemapCount > 0) {
        errors.push(`sitemap-games.xml is missing ${missingSitemapCount} canonical game URL(s).`);
    }

    console.log(`Checked ${slugSet.size} canonical game slugs.`);
}

const forbiddenIndexingPatterns = [
    /\/games\/game\.html\?/i,
    /\/games\/index\.html/i,
    /\/games\/[a-z0-9-]+\.html(?:<|$)/i
];

for (const pattern of forbiddenIndexingPatterns) {
    if (pattern.test(sitemapGames)) {
        errors.push(`sitemap-games.xml contains a legacy URL matching ${pattern}.`);
    }
    if (pattern.test(gamesSearchSource)) {
        errors.push(`games-search.json contains a legacy URL matching ${pattern}.`);
    }
}

const redirectLines = redirects.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("#"));
if (redirectLines.length > 1900) {
    warnings.push(`_redirects contains ${redirectLines.length} rules and is approaching common platform limits.`);
}

if (warnings.length) {
    console.warn("\nWarnings:");
    warnings.forEach((warning) => console.warn(` - ${warning}`));
}

if (errors.length) {
    console.error("\nLegacy route audit failed:");
    errors.forEach((error) => console.error(` - ${error}`));
    process.exit(1);
}

console.log("Legacy game route audit passed.");
