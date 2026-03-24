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

function getExpectedPageArtifacts(game, slug, validation) {
    const title = stripHtml(game.title || "Game");
    const year = stripHtml(game.year || "Unknown Year");
    const publisher = stripHtml(game.publisher || game.developer || "Unknown Publisher");
    const platformLong = detectPlatform(game);
    const platformShort = normalizePlatformShort(game);
    const description = buildDescription(game, title, platformLong);

    return {
        title,
        year,
        publisher,
        platformLong,
        platformShort,
        description,
        canonicalHtml: buildCanonicalHtml({
            slug,
            game,
            title,
            description,
            canonicalUrl: validation.canonicalUrl,
            ogImage: validation.ogImage,
            year,
            publisher,
            platformLong,
            platformShort
        })
    };
}

function getCanonicalRewriteReason(filePath, expected) {
    if (!fs.existsSync(filePath)) return "missing canonical page";

    const html = fs.readFileSync(filePath, "utf8");
    const canonical = extractTagValue(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    const ogUrl = extractTagValue(html, /<meta[^>]+property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
    const twitterUrl = extractTagValue(html, /<meta[^>]+name=["']twitter:url["'][^>]*content=["']([^"']+)["']/i);
    const title = extractTagValue(html, /<title>([^<]*)<\/title>/i);
    const description = extractTagValue(html, /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const expectedTitle = extractTagValue(expected.canonicalHtml, /<title>([^<]*)<\/title>/i);
    const expectedDescription = extractTagValue(expected.canonicalHtml, /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i);

    if (canonical !== expected.canonicalUrl) return "canonical mismatch";
    if (ogUrl !== expected.canonicalUrl) return "og:url mismatch";
    if (twitterUrl !== expected.canonicalUrl) return "twitter:url mismatch";
    if (title !== expectedTitle) return "title metadata changed";
    if (description !== expectedDescription) return "description metadata changed";

    if (normalizeHtmlForComparison(html) !== normalizeHtmlForComparison(expected.canonicalHtml)) {
        return "metadata outdated";
    }

    return "";
}

function toTokenList(value) {
    if (Array.isArray(value)) {
        return value.map(item => String(item || "").trim()).filter(Boolean);
    }
    return String(value || "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
}

function firstNonEmpty(values) {
    for (const value of values) {
        const text = String(value || "").trim();
        if (text) return text;
    }
    return "";
}

function buildVideoGameSchema({ game, title, description, canonicalUrl, ogImage, year, platformLong, publisher }) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: title,
        description,
        url: canonicalUrl
    };

    if (String(year || "").trim()) schema.datePublished = String(year).trim();
    if (String(platformLong || "").trim()) schema.gamePlatform = String(platformLong).trim();

    const genres = toTokenList(game?.genres);
    if (genres.length === 1) schema.genre = genres[0];
    if (genres.length > 1) schema.genre = genres;

    const publisherName = firstNonEmpty([
        ...(Array.isArray(game?.credits?.publisher) ? game.credits.publisher : [game?.credits?.publisher]),
        game?.publisher,
        publisher
    ]);
    if (publisherName) {
        schema.publisher = { "@type": "Organization", name: publisherName };
        schema.author = { "@type": "Organization", name: publisherName };
    }

    if (String(ogImage || "").trim()) schema.image = ogImage;

    const videoId = String(game?.videoid || game?.youtube || "").trim();
    if (videoId) {
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        schema.video = {
            "@type": "VideoObject",
            name: `${title} Gameplay Video`,
            description,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            embedUrl: `https://www.youtube.com/embed/${videoId}`,
            contentUrl: watchUrl
        };
        if (String(year || "").trim()) {
            schema.video.uploadDate = `${String(year).trim()}-01-01`;
        }
    }

    const ratingValue = Number(game?.ccg_rating);
    if (Number.isFinite(ratingValue)) {
        schema.aggregateRating = {
            "@type": "AggregateRating",
            ratingValue: String(ratingValue),
            bestRating: "10",
            ratingCount: "1"
        };
    }

    const ratingReason = String(game?.ccg_rating_reason || "").trim();
    if (ratingReason) {
        schema.review = {
            "@type": "Review",
            reviewBody: ratingReason,
            reviewRating: Number.isFinite(ratingValue)
                ? {
                    "@type": "Rating",
                    ratingValue: String(ratingValue),
                    bestRating: "10"
                }
                : undefined
        };
        if (!schema.review.reviewRating) delete schema.review.reviewRating;
    }

    return schema;
}

function buildCanonicalHtml({ slug, game, title, description, canonicalUrl, ogImage, year, publisher, platformLong, platformShort }) {
    const seoTitle = `${title} (${platformLong}) – Review, Game Info, Manual & Video`;
    const videoId = String(game?.videoid || game?.youtube || "").trim();
    const hasVideo = Boolean(videoId);

    const schemaData = buildVideoGameSchema({
        game,
        title,
        description,
        canonicalUrl,
        ogImage,
        year,
        platformLong,
        publisher
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
<title>${escapeHtml(seoTitle)}</title>
<script src="/js/analytics.js"></script>
<meta charset="UTF-8">
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
<meta property="og:type" content="${hasVideo ? "video.other" : "website"}">
<meta property="og:site_name" content="Cheeky Commodore Gamer">
<meta property="og:title" content="${escapeHtml(seoTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta property="og:image" content="${escapeHtml(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(seoTitle)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(ogImage)}">
<meta name="twitter:url" content="${escapeHtml(canonicalUrl)}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="../favicon.ico">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../resources/css/ccg-master.css">
<link rel="stylesheet" href="../resources/css/ccg-mode.css">
<link rel="stylesheet" href="../resources/css/ccg-effects.css">
<link rel="stylesheet" href="../resources/css/ccg-anim.css">
<link rel="stylesheet" href="../resources/css/ccg-overlays.css">
<link rel="stylesheet" href="../resources/css/ccg-cards.css">
<link rel="stylesheet" href="../resources/css/games.css">
<link rel="stylesheet" href="../resources/css/ccg-footer.css">
<link rel="stylesheet" href="../resources/css/ccg-mobile-lite.css">
<script src="../js/ccg-mobile-lite.js" defer></script>
<script type="application/ld+json">
${JSON.stringify(schemaData, null, 2)}
</script>
</head>
<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">
<div class="ccg-bg" aria-hidden="true">
<div class="ccg-bg-starfield"></div>
<div class="ccg-bg-grid"></div>
<div class="ccg-bg-crt-overlay"></div>
</div>
<div class="ccg-page">
<main class="ccg-main">
<section class="game-hero">
<div class="game-hero__inner">
<div class="game-hero__media">
<img class="game-hero__thumb" src="../resources/images/thumbnails/all/${escapeHtml(path.basename(ogImage))}" alt="${escapeHtml(title)} cover" loading="lazy" width="460" height="215">
</div>
<div class="game-hero__content">
<h1 class="game-hero__title">${escapeHtml(title)}</h1>
<div class="game-hero__meta">
<span class="game-meta__item">${escapeHtml(String(year))}</span>
<span class="game-meta__sep">•</span>
<span class="game-meta__item">${escapeHtml(platformShort)}</span>
<span class="game-meta__sep">•</span>
<span class="game-meta__item">${escapeHtml(publisher)}</span>
</div>
</div>
</div>
</section>
${hasVideo ? `<section class="game-section" id="watch">
<p class="game-section__kicker">Longplay / Review</p>
<h2 class="game-section__title">Watch the Action</h2>
<div class="game-video">
<iframe class="game-video__frame"
title="${escapeHtml(title)} gameplay video"
src="https://www.youtube.com/embed/${escapeHtml(videoId)}"
allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
allowfullscreen></iframe>
<div class="game-video__actions">
<a class="game-pill" href="https://www.youtube.com/watch?v=${escapeHtml(videoId)}" target="_blank" rel="noopener">Open on YouTube</a>
</div>
</div>
</section>` : ""}
<section class="game-section">
<p class="game-section__kicker">Overview</p>
<h2 class="game-section__title">Game Summary</h2>
<div class="game-description">${escapeHtml(description)}</div>
</section>
<section class="game-section">
<p class="game-section__kicker">Explore</p>
<h2 class="game-section__title">More Details</h2>
<div class="game-downloads">
<a class="ccg-btn ccg-btn--primary" href="/games/game.html?id=${escapeHtml(toGameId(slug))}">View the full interactive game page</a>
<a class="ccg-btn ccg-btn--ghost" href="/games/index.html">Browse all games</a>
</div>
</section>
</main>
<footer class="ccg-footer">
<p class="ccg-footer__text">© <span data-ccg-year></span> Cheeky Commodore Gamer. Not affiliated with Commodore, Amiga or publishers.</p>
</footer>
</div>
<script src="../js/ccg-base.js" defer></script>
<script src="../resources/js/ccg-share.js" defer></script>
<script data-goatcounter="https://cheekycommodoregamer.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</body>
</html>
`;
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
        if (activeSlugs.has(slug)) {
            stale.push({ type: "legacy-stub", slug, filePath: path.join(gamesDir, entry.name) });
            return;
        }
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
        const validation = validateForGeneration(game, slug, gamesBySlug);

        if (validation.issues.length) {
            const error = new Error(`${slug || game.title || "unknown"}: ${validation.issues.join("; ")}`);
            error.validationErrors = validation.issues;
            throw error;
        }

        const expected = getExpectedPageArtifacts(game, slug, validation);
        const canonicalReason = getCanonicalRewriteReason(canonicalPath, { ...validation, ...expected, slug });
        if (!canonicalReason) continue;

        planned.push({
            game,
            slug,
            outputDir,
            canonicalPath,
            canonicalReason,
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
