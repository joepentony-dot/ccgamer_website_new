#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const SITE_ROOT = "https://www.cheekycommodoregamer.co.uk";
const REDIRECT_TARGET = "/games/game.html?id=";
const DEFAULT_DESCRIPTION = "Classic retro game featured on Cheeky Commodore Gamer.";
const DEFAULT_PUBLISHER = "Unknown Publisher";
const DEFAULT_YEAR = "Unknown Year";
const DEFAULT_IMAGE = `${SITE_ROOT}/resources/images/thumbnails/all/1942.jpg`;

const repoRoot = path.resolve(__dirname, "..");
const gamesJsonPath = path.join(repoRoot, "games", "games.json");
const gamesDir = path.join(repoRoot, "games");

function slugify(text) {
    return String(text || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function stripHtml(text) {
    return String(text || "").replace(/<[^>]*>/g, "").trim();
}

function escapeHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function resolveImageUrl(game) {
    const raw = game.thumbnail || game.thumb || game.cover || game.image || "";
    if (!raw) return "";
    const cleaned = String(raw).trim();
    if (!cleaned) return "";
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    const relative = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
    return `${SITE_ROOT}${relative}`;
}

function validateGame(game, slug, title) {
    const issues = [];
    if (!slug) issues.push("missing slug");
    if (!title) issues.push("missing title");
    return issues;
}

function buildHtml(game, slug, description, imageUrl, publisher, year) {
    const title = `${stripHtml(game.title)} | Cheeky Commodore Gamer`;
    const canonicalUrl = `${SITE_ROOT}/games/${slug}/`;
    const redirectUrl = `${REDIRECT_TARGET}${encodeURIComponent(slug)}`;

    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safePublisher = escapeHtml(publisher);
    const safeYear = escapeHtml(year);
    const safeImageUrl = escapeHtml(imageUrl);
    const safeCanonical = escapeHtml(canonicalUrl);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=${redirectUrl}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />

    <link rel="canonical" href="${safeCanonical}" />

    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${safeCanonical}" />
    <meta property="og:image" content="${safeImageUrl}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${safeImageUrl}" />

    <style>
        html, body { background: #000; color: #000; opacity: 0; }
    </style>

    <script>
        (function () {
            try {
                window.location.replace("${redirectUrl}");
            } catch (e) {
                window.location.href = "${redirectUrl}";
            }
        })();
    </script>

    <script type="application/ld+json">
    ${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: stripHtml(game.title),
        description,
        datePublished: String(year),
        gamePlatform: String(game.system || game.platform || ""),
        publisher,
        image: imageUrl,
        url: canonicalUrl
    }, null, 4)}
    </script>
</head>
<body>
</body>
</html>
`;
}

function main() {
    let games;
    try {
        const raw = fs.readFileSync(gamesJsonPath, "utf8");
        games = JSON.parse(raw);
    } catch (err) {
        console.error(`[ERROR] Failed to read games.json: ${err.message}`);
        process.exit(1);
    }

    if (!Array.isArray(games)) {
        console.error("[ERROR] games.json is not an array.");
        process.exit(1);
    }

    let processed = 0;
    let created = 0;
    let skipped = 0;
    let warnings = 0;

    games.forEach((game) => {
        processed += 1;

        const rawTitle = stripHtml(game.title || "");
        const slug = game.slug ? slugify(game.slug) : slugify(rawTitle);

        const validationIssues = validateGame(game, slug, rawTitle);
        if (validationIssues.length) {
            warnings += 1;
            console.warn(`[WARN] ${game.id || game.title || "unknown"}: ${validationIssues.join(", ")}`);
            return;
        }

        let description = stripHtml(game.description || game.desc || "");
        if (!description) {
            description = DEFAULT_DESCRIPTION;
            warnings += 1;
            console.warn(`[WARN] ${slug}: missing description, using default.`);
        }

        let imageUrl = resolveImageUrl(game);
        if (!imageUrl) {
            imageUrl = DEFAULT_IMAGE;
            warnings += 1;
            console.warn(`[WARN] ${slug}: missing image, using default.`);
        }

        let publisher = stripHtml(game.publisher || game.developer || "");
        if (!publisher) {
            publisher = DEFAULT_PUBLISHER;
            warnings += 1;
            console.warn(`[WARN] ${slug}: missing publisher, using default.`);
        }

        let year = stripHtml(game.year || "");
        if (!year) {
            year = DEFAULT_YEAR;
            warnings += 1;
            console.warn(`[WARN] ${slug}: missing year, using default.`);
        }

        const outputDir = path.join(gamesDir, slug);
        const outputPath = path.join(outputDir, "index.html");

        if (fs.existsSync(outputPath)) {
            skipped += 1;
            console.warn(`[SKIP] ${slug}: ${outputPath} already exists.`);
            return;
        }

        fs.mkdirSync(outputDir, { recursive: true });
        const html = buildHtml(game, slug, description, imageUrl, publisher, year);
        fs.writeFileSync(outputPath, html, "utf8");
        created += 1;
        console.log(`[CREATE] ${slug}: ${outputPath}`);
    });

    console.log("\nSummary:");
    console.log(`Processed: ${processed}`);
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Warnings: ${warnings}`);
}

main();
