#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/* ---------------------------------------
   Constants
--------------------------------------- */

const SITE_ROOT = "https://www.cheekycommodoregamer.co.uk";
const REDIRECT_TARGET = "/games/game.html?id=";

const repoRoot = path.resolve(__dirname, "..");
const gamesJsonPath = path.join(repoRoot, "games", "games.json");
const gamesDir = path.join(repoRoot, "games");

/* ---------------------------------------
   Utilities
--------------------------------------- */

function slugify(text) {
    return String(text || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function stripHtml(text) {
    return String(text || "")
        .replace(/<[^>]*>/g, "")
        .trim();
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
    const raw =
        game.thumbnail ||
        game.thumb ||
        game.cover ||
        game.image ||
        "";

    if (!raw) return "";

    const cleaned = String(raw).trim();

    if (!cleaned) return "";

    if (/^https?:\/\//i.test(cleaned)) {
        return cleaned;
    }

    const relative = cleaned.startsWith("/")
        ? cleaned
        : `/${cleaned}`;

    return `${SITE_ROOT}${relative}`;
}

/* ---------------------------------------
   Validation (Only Fatal Fields)
--------------------------------------- */

function validateGame(game, slug) {
    const issues = [];

    // Only fatal blockers
    if (!slug) issues.push("missing slug");
    if (!game.title) issues.push("missing title");

    // Everything else allowed (fallbacks handle it)
    return issues;
}

/* ---------------------------------------
   HTML Builder
--------------------------------------- */

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

    const schemaData = {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: stripHtml(game.title),
        description,
        datePublished: String(year),
        gamePlatform: String(game.system || game.platform || ""),
        publisher,
        image: imageUrl,
        url: canonicalUrl
    };

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
        html, body {
            background: #000;
            margin: 0;
            padding: 0;
            overflow: hidden;
            opacity: 0;
        }
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
${JSON.stringify(schemaData, null, 4)}
    </script>

</head>
<body>
</body>
</html>
`;
}

/* ---------------------------------------
   Main Runner
--------------------------------------- */

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
    let errors = 0;
    let warnings = 0;

    games.forEach((game) => {

        processed += 1;

        const slug = game.slug
            ? slugify(game.slug)
            : slugify(game.title);

        /* Fallback-safe metadata */

        const description = stripHtml(
            game.description ||
            game.desc ||
            "Classic retro game featured on Cheeky Commodore Gamer."
        );

        const imageUrl =
            resolveImageUrl(game) ||
            `${SITE_ROOT}/resources/images/thumbnails/placeholder.jpg`;

        const publisher = stripHtml(
            game.publisher ||
            game.developer ||
            "Unknown Publisher"
        );

        const year = stripHtml(
            game.year ||
            "Unknown Year"
        );

        /* Non-fatal warnings */

        if (!game.publisher && !game.developer) {
            console.warn(`[WARN] ${slug}: missing publisher`);
            warnings += 1;
        }

        if (!game.year) {
            console.warn(`[WARN] ${slug}: missing year`);
            warnings += 1;
        }

        if (!game.description && !game.desc) {
            console.warn(`[WARN] ${slug}: missing description`);
            warnings += 1;
        }

        if (!resolveImageUrl(game)) {
            console.warn(`[WARN] ${slug}: missing image`);
            warnings += 1;
        }

        /* Fatal validation */

        const issues = validateGame(game, slug);

        if (issues.length) {
            errors += 1;
            console.error(
                `[ERROR] ${game.id || game.title || "unknown"}: ${issues.join(", ")}`
            );
            return;
        }

        const outputDir = path.join(gamesDir, slug);
        const outputPath = path.join(outputDir, "index.html");

        if (fs.existsSync(outputPath)) {
            skipped += 1;
            console.warn(`[SKIP] ${slug}: already exists`);
            return;
        }

        fs.mkdirSync(outputDir, { recursive: true });

        const html = buildHtml(
            game,
            slug,
            description,
            imageUrl,
            publisher,
            year
        );

        fs.writeFileSync(outputPath, html, "utf8");

        created += 1;

        console.log(`[CREATE] ${slug}: ${outputPath}`);
    });

    console.log("\nSummary:");
    console.log(`Processed: ${processed}`);
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Warnings: ${warnings}`);
    console.log(`Errors: ${errors}`);
}

/* ---------------------------------------
   Run
--------------------------------------- */

main();
