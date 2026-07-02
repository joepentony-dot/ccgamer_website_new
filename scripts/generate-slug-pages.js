#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const gameOutputUtils = require("./game-output-utils");

const SITE_ROOT = gameOutputUtils.SITE_ORIGIN;

const repoRoot = path.resolve(__dirname, "..");
const gamesDir = path.join(repoRoot, "games");
const gamesJsonPath = path.join(gamesDir, "games.json");
const thumbnailsDir = path.join(repoRoot, "resources", "images", "thumbnails", "all");
const RESERVED_GAME_DIRS = new Set(["collections", "genres"]);

function toGameId(slug) {
    return gameOutputUtils.slugToGameId(slug).replace(/-/g, "_");
}

function stripHtml(text) {
    return String(text || "").replace(/<[^>]*>/g, "").trim();
}

function escapeHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeSlug(game) {
    return gameOutputUtils.normalizeGameSlug(game.slug, game.title);
}

function detectPlatform(game) {
    const raw = String(game.system || game.platform || "").trim().toLowerCase();
    if (raw === "amiga" || raw.includes("amiga")) return "Amiga";
    return "Commodore 64";
}

function normalizePlatformShort(game) {
    const raw = String(game.system || game.platform || "").trim().toLowerCase();
    if (raw === "amiga" || raw.includes("amiga")) return "Amiga";
    return "C64";
}

function buildDescription(game, title, platform) {
    const raw = stripHtml(game.description || game.desc || "");
    if (raw) return raw.length <= 300 ? raw : `${raw.slice(0, 297).trim()}...`;
    return `${title} is a retro ${platform} title featured on Cheeky Commodore Gamer with screenshots, game information, manual links and video coverage.`;
}

function getThumbnailFilename(game, slug) {
    const raw = String(game.thumbnail || "").trim();
    const fallback = `${slug.replace(/-/g, "_")}_europe.jpg`;
    if (!raw) return fallback;
    return raw.includes("/") ? path.basename(raw) : raw;
}

function validateForGeneration(game, slug, gamesBySlug) {
    const issues = [];

    if (!slug) issues.push("missing slug");
    if (!game.title) issues.push("missing title");
    if (!gamesBySlug.has(slug)) issues.push("games.json entry lookup failed for slug");

    const thumbnailFile = getThumbnailFilename(game, slug);
    const expectedThumbnail = thumbnailFile;
    const canonicalUrl = gameOutputUtils.getGameCanonicalUrl(slug, SITE_ROOT);
    const ogImage = `${SITE_ROOT}/resources/images/thumbnails/all/${expectedThumbnail}`;

    if (!thumbnailFile) issues.push('missing thumbnail');
    if (!fs.existsSync(path.join(thumbnailsDir, expectedThumbnail))) issues.push(`missing thumbnail file ${expectedThumbnail}`);
    if (!canonicalUrl.endsWith(`/games/${slug}/`)) issues.push("canonical URL mismatch");
    if (!ogImage.endsWith(`/resources/images/thumbnails/all/${expectedThumbnail}`)) issues.push("OpenGraph image path mismatch");

    return {
        issues,
        expectedThumbnail,
        canonicalUrl,
        ogImage
    };
}

function validateGamesForGeneration(games) {
    const errors = [];
    const slugMap = new Map();

    if (!Array.isArray(games)) {
        errors.push("games.json must contain a top-level array.");
        return errors;
    }

    for (let index = 0; index < games.length; index += 1) {
        const game = games[index] || {};
        const title = stripHtml(game.title || "");
        const slug = normalizeSlug(game);
        const thumbnail = getThumbnailFilename(game, slug);

        if (!slug) {
            errors.push(`Entry ${index + 1} (${title || "untitled"}) is missing a valid slug.`);
        } else {
            if (!slugMap.has(slug)) slugMap.set(slug, []);
            slugMap.get(slug).push({ index: index + 1, title });
        }

        if (!thumbnail) {
            errors.push(`Entry ${index + 1} (${title || slug || "unknown"}) is missing thumbnail.`);
            continue;
        }

        const thumbnailPath = path.join(thumbnailsDir, thumbnail);
        if (!fs.existsSync(thumbnailPath)) {
            errors.push(`Missing thumbnail for ${title || slug || "unknown"}: resources/images/thumbnails/all/${thumbnail}`);
        }
    }

    for (const [slug, entries] of slugMap.entries()) {
        if (entries.length > 1) {
            const detail = entries
                .map((entry) => `#${entry.index}${entry.title ? ` (${entry.title})` : ""}`)
                .join(", ");
            errors.push(`Duplicate slug "${slug}" found in entries: ${detail}`);
        }
    }

    return errors;
}

function extractTagValue(html, pattern) {
    const match = String(html || "").match(pattern);
    return match ? match[1].trim() : "";
}

function normalizeHtmlForComparison(html) {
    return String(html || "").replace(/\r\n/g, "\n").trim();
}

function buildRedirectStubHtml(slug, canonicalUrl, description, title) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<script src="/js/analytics.js"></script>
<meta name="robots" content="noindex,follow">
<meta http-equiv="refresh" content="0; url=/games/${escapeHtml(slug)}/">
<script>
(function(){
window.location.replace("/games/${escapeHtml(slug)}/" + window.location.search + window.location.hash);
})();
</script>
<title>${escapeHtml(title)} | Cheeky Commodore Gamer</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
</head>
<body></body>
</html>
`;
}

function buildCanonicalHtml({ slug, game, title, description, canonicalUrl, ogImage }) {
    const gameId = escapeHtml(String(game?.id || toGameId(slug)).trim() || toGameId(slug));
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <title>${escapeHtml(title)} | Cheeky Commodore Gamer</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Cheeky Commodore Gamer">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:title" content="${escapeHtml(title)} | Cheeky Commodore Gamer">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(ogImage)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)} | Cheeky Commodore Gamer">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(ogImage)}">
    <meta name="twitter:url" content="${escapeHtml(canonicalUrl)}">
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="/js/analytics.js"></script>
    <meta http-equiv="refresh" content="0; url=/games/game.html?id=${gameId}">
    <style>
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: #000;
            overflow: hidden;
        }
    </style>
    <script>
        (function () {
            if (typeof window !== "undefined") {
                window.location.replace("/games/game.html?id=${gameId}");
            }
        })();
    </script>
</head>
<body></body>
</html>
`;
}

function getExpectedPageArtifacts(game, slug, validation) {
    const title = stripHtml(game.title || "Game");
    const platformLong = detectPlatform(game);
    const description = `${title} on ${platformLong} — screenshots, manual, downloads and video.`;

    return {
        title,
        description,
        canonicalHtml: buildCanonicalHtml({
            slug,
            game,
            title,
            description,
            canonicalUrl: validation.canonicalUrl,
            ogImage: validation.ogImage
        }),
        redirectStubHtml: buildRedirectStubHtml(slug, validation.canonicalUrl, description, title)
    };
}

function getCanonicalRewriteReason(filePath, expected) {
    if (!fs.existsSync(filePath)) return "missing canonical page";
    const html = fs.readFileSync(filePath, "utf8");
    if (normalizeHtmlForComparison(html) !== normalizeHtmlForComparison(expected.canonicalHtml)) {
        return "canonical wrapper changed";
    }
    return "";
}

function getRedirectStubRewriteReason(filePath, expectedHtml) {
    if (!fs.existsSync(filePath)) return "missing redirect stub";
    const current = fs.readFileSync(filePath, "utf8");
    if (normalizeHtmlForComparison(current) !== normalizeHtmlForComparison(expectedHtml)) {
        return "redirect stub metadata changed";
    }
    return "";
}

function writeTextFileIfChanged(filePath, content) {
    const next = String(content);
    const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
    if (previous === next) return false;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, next, "utf8");
    return true;
}

function findStaleGameOutputs(activeSlugs) {
    const stale = [];
    fs.readdirSync(gamesDir, { withFileTypes: true }).forEach((entry) => {
        if (entry.name === "index.html" || entry.name === "games.json" || entry.name === "games-index.json" || entry.name === "games-search.json") return;
        if (entry.isDirectory()) {
            if (RESERVED_GAME_DIRS.has(entry.name)) return;
            if (!activeSlugs.has(entry.name)) {
                stale.push({ type: "canonical", slug: entry.name, filePath: path.join(gamesDir, entry.name) });
            }
            return;
        }
        if (!entry.isFile() || !entry.name.endsWith(".html")) return;
        const slug = entry.name.replace(/\.html$/i, "");
        if (activeSlugs.has(slug)) return;
        stale.push({ type: "stub", slug, filePath: path.join(gamesDir, entry.name) });
    });
    return stale;
}

function planChangedGames(games) {
    const preflightErrors = validateGamesForGeneration(games);
    if (preflightErrors.length > 0) {
        const error = new Error(`Generation aborted. games.json validation failed:\n - ${preflightErrors.join("\n - ")}`);
        error.validationErrors = preflightErrors;
        throw error;
    }

    const gamesBySlug = new Map();
    for (const game of games) {
        const slug = normalizeSlug(game);
        if (slug) gamesBySlug.set(slug, game);
    }

    const planned = [];
    for (const game of games) {
        const slug = normalizeSlug(game);
        const outputDir = path.join(gamesDir, slug);
        const canonicalPath = path.join(outputDir, "index.html");
        const redirectStubPath = path.join(gamesDir, `${slug}.html`);
        const validation = validateForGeneration(game, slug, gamesBySlug);

        if (validation.issues.length) {
            const error = new Error(`${slug || game.title || "unknown"}: ${validation.issues.join("; ")}`);
            error.validationErrors = validation.issues;
            throw error;
        }

        const expected = getExpectedPageArtifacts(game, slug, validation);
        const canonicalReason = getCanonicalRewriteReason(canonicalPath, { ...validation, ...expected, slug });
        const redirectStubReason = getRedirectStubRewriteReason(redirectStubPath, expected.redirectStubHtml);
        if (!canonicalReason && !redirectStubReason) continue;

        planned.push({
            game,
            slug,
            outputDir,
            canonicalPath,
            redirectStubPath,
            canonicalReason,
            redirectStubReason,
            ...validation,
            ...expected
        });
    }

    return {
        planned,
        stale: findStaleGameOutputs(new Set(gamesBySlug.keys()))
    };
}

function processChangedGamesOnly(games) {
    const { planned, stale } = planChangedGames(games);
    let written = 0;
    let removed = 0;

    for (const item of stale) {
        fs.rmSync(item.filePath, { recursive: true, force: true });
        removed += 1;
        console.log(`[REMOVE] ${path.relative(repoRoot, item.filePath).split(path.sep).join("/")} (removed from games.json)`);
    }

    for (const item of planned) {
        fs.mkdirSync(item.outputDir, { recursive: true });

        if (item.canonicalReason && writeTextFileIfChanged(item.canonicalPath, item.canonicalHtml)) {
            written += 1;
            console.log(`[WRITE] games/${item.slug}/index.html (${item.canonicalReason})`);
        }

        if (writeTextFileIfChanged(item.redirectStubPath, item.redirectStubHtml)) {
            written += 1;
            const reason = item.redirectStubReason || "redirect stub";
            console.log(`[WRITE] games/${item.slug}.html (${reason})`);
        }
    }

    return { planned: planned.length, written, removed };
}

function readGamesFromDisk() {
    try {
        return JSON.parse(fs.readFileSync(gamesJsonPath, "utf8"));
    } catch (err) {
        console.error(`[ERROR] Failed to read games.json: ${err.message}`);
        process.exit(1);
    }
}

function main() {
    let result;
    try {
        result = processChangedGamesOnly(readGamesFromDisk());
    } catch (error) {
        console.error(`[ERROR] ${error.message}`);
        process.exit(1);
    }

    console.log(`\nSummary:\nProcessed slugs: ${result.planned}\nFiles written: ${result.written}\nStale outputs removed: ${result.removed}`);
}

if (require.main === module) {
    main();
}

module.exports = {
    buildCanonicalHtml,
    buildDescription,
    getCanonicalRewriteReason,
    getExpectedPageArtifacts,
    normalizeSlug,
    planChangedGames,
    processChangedGamesOnly,
    validateForGeneration,
    validateGamesForGeneration
};
