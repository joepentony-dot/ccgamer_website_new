#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const gameOutputUtils = require("./game-output-utils");

const SITE_ROOT = gameOutputUtils.SITE_ORIGIN;

const repoRoot = path.resolve(__dirname, "..");
const gamesDir = path.join(repoRoot, "games");
const gamesJsonPath = path.join(gamesDir, "games.json");
const thumbnailsDir = path.join(repoRoot, "resources", "images", "thumbnails", "all");

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
    const expected = `${slug.replace(/-/g, "_")}_europe.jpg`;
    if (!raw) return expected;
    return raw.includes("/") ? path.basename(raw) : raw;
}

function validateForGeneration(game, slug, gamesBySlug) {
    const issues = [];

    if (!slug) issues.push("missing slug");
    if (!game.title) issues.push("missing title");
    if (!gamesBySlug.has(slug)) issues.push("games.json entry lookup failed for slug");

    const thumbnailFile = getThumbnailFilename(game, slug);
    const expectedThumbnail = `${slug.replace(/-/g, "_")}_europe.jpg`;
    if (thumbnailFile !== expectedThumbnail) {
        issues.push(`thumbnail must be ${expectedThumbnail} (found ${thumbnailFile || "empty"})`);
    }

    const canonicalUrl = gameOutputUtils.getGameCanonicalUrl(slug, SITE_ROOT);
    const ogImage = `${SITE_ROOT}/resources/images/thumbnails/all/${expectedThumbnail}`;

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

function buildRedirectStubHtml({ slug, title }) {
    const { canonicalPath, canonicalUrl, robots } = gameOutputUtils.getGameRedirectStubData(slug, SITE_ROOT);

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<script src="/js/analytics.js"></script>
<meta http-equiv="refresh" content="0; url=${canonicalPath}">
<script>
(function(){
window.location.replace("${canonicalPath}" + window.location.search + window.location.hash);
})();
</script>
<title>${escapeHtml(title)} | Cheeky Commodore Gamer</title>
<meta name="description" content="Redirecting to the canonical Cheeky Commodore Gamer page for ${escapeHtml(title)}.">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
</head>
<body></body>
</html>
`;
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
        stubHtml: buildRedirectStubHtml({ slug, title }),
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

    if (canonical !== expected.canonicalUrl) return "canonical mismatch";
    if (ogUrl !== expected.canonicalUrl) return "og:url mismatch";

    if (normalizeHtmlForComparison(html) !== normalizeHtmlForComparison(expected.canonicalHtml)) {
        return "metadata outdated";
    }

    return "";
}

function getStubRewriteReason(filePath, expected) {
    if (!fs.existsSync(filePath)) return "missing redirect stub";

    const html = fs.readFileSync(filePath, "utf8");
    const canonical = extractTagValue(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);

    if (canonical !== expected.canonicalUrl) return "canonical mismatch";

    if (normalizeHtmlForComparison(html) !== normalizeHtmlForComparison(expected.stubHtml)) {
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
<meta property="og:type" content="website">
<meta property="og:site_name" content="Cheeky Commodore Gamer">
<meta property="og:title" content="${escapeHtml(seoTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta property="og:image" content="${escapeHtml(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(seoTitle)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(ogImage)}">
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
<section class="game-section">
<p class="game-section__kicker">Overview</p>
<h2 class="game-section__title">Game Summary</h2>
<div class="game-description">${escapeHtml(description)}</div>
</section>
<section class="game-section">
<p class="game-section__kicker">Explore</p>
<h2 class="game-section__title">More Details</h2>
<div class="game-downloads">
<a class="ccg-btn ccg-btn--primary" href="/games/${escapeHtml(slug)}/">View the full interactive game page</a>
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

function main() {
    let games;
    try {
        games = JSON.parse(fs.readFileSync(gamesJsonPath, "utf8"));
    } catch (err) {
        console.error(`[ERROR] Failed to read games.json: ${err.message}`);
        process.exit(1);
    }

    const preflightErrors = validateGamesForGeneration(games);
    if (preflightErrors.length > 0) {
        console.error("[ERROR] Generation aborted. games.json validation failed:");
        for (const error of preflightErrors) {
            console.error(` - ${error}`);
        }
        process.exit(1);
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
        const stubPath = path.join(gamesDir, `${slug}.html`);

        const validation = validateForGeneration(game, slug, gamesBySlug);
        if (validation.issues.length) {
            console.error(`[ERROR] ${slug || game.title || "unknown"}: ${validation.issues.join("; ")}`);
            console.error("[ABORT] Validation failed. No files were generated.");
            process.exit(1);
        }

        const expected = getExpectedPageArtifacts(game, slug, validation);
        const canonicalReason = getCanonicalRewriteReason(canonicalPath, { ...validation, ...expected });
        const stubReason = getStubRewriteReason(stubPath, { ...validation, ...expected });

        if (!canonicalReason && !stubReason) {
            continue;
        }

        planned.push({
            game,
            slug,
            outputDir,
            canonicalPath,
            stubPath,
            canonicalReason,
            stubReason,
            ...validation,
            ...expected
        });
    }

    let written = 0;

    for (const item of planned) {
        fs.mkdirSync(item.outputDir, { recursive: true });

        if (item.stubReason) {
            fs.writeFileSync(item.stubPath, item.stubHtml, "utf8");
            written += 1;
            console.log(`[WRITE] games/${item.slug}.html (${item.stubReason})`);
        }

        if (item.canonicalReason) {
            fs.writeFileSync(item.canonicalPath, item.canonicalHtml, "utf8");
            written += 1;
            console.log(`[WRITE] games/${item.slug}/index.html (${item.canonicalReason})`);
        }
    }

    console.log(`
Summary:
Planned slugs: ${planned.length}
Files written: ${written}`);
}

if (require.main === module) {
    main();
}

module.exports = {
    buildCanonicalHtml,
    buildRedirectStubHtml,
    buildDescription,
    getCanonicalRewriteReason,
    getExpectedPageArtifacts,
    getStubRewriteReason,
    normalizeSlug,
    validateForGeneration
};
