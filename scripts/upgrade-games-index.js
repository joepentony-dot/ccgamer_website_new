#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "games", "index.html");
const CHECK_ONLY = process.argv.includes("--check");
const SITE = "Cheeky Commodore Gamer";
const CANONICAL = "https://www.cheekycommodoregamer.co.uk/games/";
const TITLE = `C64 & Amiga Games Archive | ${SITE}`;
const DESCRIPTION = "Explore the Cheeky Commodore Gamer C64 and Amiga games archive with searchable game pages, reviews, ratings, videos, genres, publishers, release years, collections and manuals.";
const STYLE = "/resources/css/ccg-games-index-omega.css";

function fail(message) {
    console.error(`[upgrade-games-index] ${message}`);
    process.exit(1);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function replaceTitle(html) {
    if (!/<title>[\s\S]*?<\/title>/i.test(html)) fail("games/index.html has no title element");
    return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(TITLE)}</title>`);
}

function upsertMeta(html, attr, key, content) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`<meta\\s+[^>]*${attr}=["']${escapedKey}["'][^>]*>`, "i");
    const tag = `<meta ${attr}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`;
    return pattern.test(html) ? html.replace(pattern, tag) : html.replace(/<\/head>/i, `    ${tag}\n</head>`);
}

function ensureStyle(html) {
    if (html.includes(STYLE)) return html;
    const marker = '<link rel="stylesheet" href="../resources/css/games-hero-fix.css" />';
    if (!html.includes(marker)) fail("games page CSS insertion marker not found");
    return html.replace(marker, `${marker}\n    <link rel="stylesheet" href="${STYLE}" data-ccg-games-index-omega-style />`);
}

function upsertSchema(html) {
    const graph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": `${CANONICAL}#games-archive`,
                url: CANONICAL,
                name: "C64 & Amiga Games Archive",
                description: DESCRIPTION,
                isPartOf: {
                    "@type": "WebSite",
                    name: SITE,
                    url: "https://www.cheekycommodoregamer.co.uk/"
                },
                about: [
                    { "@type": "Thing", name: "Commodore 64 games" },
                    { "@type": "Thing", name: "Amiga games" },
                    { "@type": "Thing", name: "Retro gaming" }
                ]
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.cheekycommodoregamer.co.uk/" },
                    { "@type": "ListItem", position: 2, name: "C64 & Amiga Games Archive", item: CANONICAL }
                ]
            }
        ]
    };
    const block = `<!-- CCG GAMES INDEX OMEGA SCHEMA START -->\n    <script type="application/ld+json" data-ccg-games-index-schema>${JSON.stringify(graph)}</script>\n    <!-- CCG GAMES INDEX OMEGA SCHEMA END -->`;
    const existing = /<!-- CCG GAMES INDEX OMEGA SCHEMA START -->[\s\S]*?<!-- CCG GAMES INDEX OMEGA SCHEMA END -->/i;
    return existing.test(html) ? html.replace(existing, block) : html.replace(/<\/head>/i, `    ${block}\n</head>`);
}

function upgradeHero(html) {
    const h1Pattern = /<h1 class="games-hero__title">[\s\S]*?<\/h1>/i;
    if (!h1Pattern.test(html)) fail("games hero title not found");

    const titleMarkup = '<h1 class="games-hero__title">C64 &amp; Amiga Games Archive</h1>';
    if (/class="games-hero__kicker"/i.test(html)) {
        html = html.replace(h1Pattern, titleMarkup);
    } else {
        html = html.replace(
            h1Pattern,
            `<p class="games-hero__kicker">The CCG Commodore Game Archive</p>\n                ${titleMarkup}`
        );
    }

    html = html.replace(
        /<p class="games-hero__subtitle">[\s\S]*?<\/p>/i,
        '<p class="games-hero__subtitle">\n                    Search and explore hundreds of Commodore 64 and Amiga games, with reviews, ratings, videos, publishers, genres, release years, collections and game manuals.\n                </p>'
    );

    const countBlock = /<div class="games-hero__stats(?: games-hero__stats--count)?">\s*<strong id="gamesTotalCount">[\s\S]*?<\/div>/i;
    const countMatch = html.match(countBlock);
    if (!countMatch) fail("games hero count block not found");
    if (!/games-hero__stats--count/.test(countMatch[0])) {
        html = html.replace(countBlock, (match) => match.replace('class="games-hero__stats"', 'class="games-hero__stats games-hero__stats--count"'));
    }

    if (!html.includes('class="games-hero__actions"')) {
        const downloads = /\s*<div class="games-hero__stats" data-games-downloads-shortcut="true">[\s\S]*?<\/div>/i;
        const archive = /\s*<div class="games-hero__stats" data-games-archive-shortcuts="true">[\s\S]*?<\/div>/i;
        const downloadsMatch = html.match(downloads);
        const archiveMatch = html.match(archive);
        if (!downloadsMatch || !archiveMatch) fail("games hero shortcut blocks not found");
        const combined = `${downloadsMatch[0]}${archiveMatch[0]}`;
        const actions = `\n                <div class="games-hero__actions">${downloadsMatch[0]}${archiveMatch[0]}\n                </div>`;
        html = html.replace(combined, actions);
    }

    return html;
}

function discoverySection() {
    return `
        <!-- CCG GAMES INDEX OMEGA DISCOVERY START -->
        <section class="games-omega-discovery ccg-chapter" aria-labelledby="gamesOmegaDiscoveryTitle">
            <div class="games-omega-discovery__header">
                <span class="games-omega-discovery__eyebrow">Explore the Commodore archive</span>
                <h2 id="gamesOmegaDiscoveryTitle">Find C64 &amp; Amiga Games Your Way</h2>
                <p>Jump straight into the part of the archive you want: browse by genre, publisher, release year, platform or curated collection, or search the complete game library below.</p>
            </div>
            <nav class="games-omega-discovery__grid" aria-label="C64 and Amiga game archive sections">
                <a class="games-omega-discovery__card" href="/games/genres/" data-archive-mark="GENRE"><strong>Browse by Genre</strong><span>Racing, arcade, adventure, platform, strategy, shooters and more.</span></a>
                <a class="games-omega-discovery__card" href="/games/publishers/" data-archive-mark="PUB"><strong>Game Publishers</strong><span>Explore C64 and Amiga games by publisher and software house.</span></a>
                <a class="games-omega-discovery__card" href="/games/collections/" data-archive-mark="CCG"><strong>Curated Collections</strong><span>Licensed games, cartridges, CCG favourites and specialist archive groups.</span></a>
                <a class="games-omega-discovery__card" href="/games/years/" data-archive-mark="YEAR"><strong>Browse by Release Year</strong><span>Follow the Commodore game library through its release timeline.</span></a>
                <a class="games-omega-discovery__card" href="/games/platforms/" data-archive-mark="64/A"><strong>Browse by Platform</strong><span>Go directly to the Commodore 64 or Amiga game archives.</span></a>
                <a class="games-omega-discovery__card" href="/games/developers/" data-archive-mark="DEV"><strong>Game Developers</strong><span>Discover games through the people and studios behind them.</span></a>
                <a class="games-omega-discovery__card" href="/games/downloads/" data-archive-mark="PDF"><strong>Game Manuals A–Z</strong><span>Browse available manuals and documentation for games in the archive.</span></a>
                <a class="games-omega-discovery__card" href="/music/" data-archive-mark="SID"><strong>C64 &amp; Amiga Music</strong><span>Explore composers, SID music and the wider Commodore music archive.</span></a>
            </nav>
        </section>
        <!-- CCG GAMES INDEX OMEGA DISCOVERY END -->`;
}

function upsertDiscovery(html) {
    const existing = /\s*<!-- CCG GAMES INDEX OMEGA DISCOVERY START -->[\s\S]*?<!-- CCG GAMES INDEX OMEGA DISCOVERY END -->/i;
    if (existing.test(html)) return html.replace(existing, `\n${discoverySection()}`);
    const hero = /(<\/section>\s*\n\s*<div class="ccg-omega-divider" aria-hidden="true">\s*<span class="ccg-omega-core"><\/span>\s*<\/div>)(\s*\n\s*<!-- SEARCH -->)/i;
    if (!hero.test(html)) fail("games discovery insertion point not found");
    return html.replace(hero, `$1\n${discoverySection()}$2`);
}

function upsertToolsHeading(html) {
    const block = `
            <!-- CCG GAMES INDEX OMEGA SEARCH HEADING START -->
            <div class="games-tools__heading">
                <span class="games-tools__eyebrow">Search the full archive</span>
                <h2>Search &amp; Filter C64 and Amiga Games</h2>
                <p>Search by title, composer, publisher, genre or year, then narrow the archive by system and release year.</p>
            </div>
            <!-- CCG GAMES INDEX OMEGA SEARCH HEADING END -->`;
    const existing = /\s*<!-- CCG GAMES INDEX OMEGA SEARCH HEADING START -->[\s\S]*?<!-- CCG GAMES INDEX OMEGA SEARCH HEADING END -->/i;
    if (existing.test(html)) return html.replace(existing, `\n${block}`);
    const marker = '<section class="games-tools ccg-chapter">';
    if (!html.includes(marker)) fail("games tools section not found");
    return html.replace(marker, `${marker}${block}`);
}

function upgradeArchiveShortcuts(html) {
    const pattern = /<nav class="games-archive-shortcuts" aria-label="More ways to browse[^"]*games archive">[\s\S]*?<\/nav>/i;
    if (!pattern.test(html)) fail("games archive shortcut nav not found");
    return html.replace(pattern, `<nav class="games-archive-shortcuts" aria-label="More ways to browse the C64 and Amiga games archive">
                <span class="games-archive-shortcuts__label">More ways to browse</span>
                <a href="/games/genres/">Genres</a>
                <a href="/games/publishers/">Publishers</a>
                <a href="/games/collections/">Collections</a>
                <a href="/games/years/">Release Years</a>
                <a href="/games/platforms/">C64 / Amiga</a>
                <a href="/games/developers/">Developers</a>
                <a href="/games/downloads/">Manuals A–Z</a>
            </nav>`);
}

function normalizeWhitespace(html) {
    return html.replace(/[ \t]+$/gm, "").replace(/\n{4,}/g, "\n\n\n");
}

function build(input) {
    let html = input;
    html = replaceTitle(html);
    html = upsertMeta(html, "name", "description", DESCRIPTION);
    html = upsertMeta(html, "name", "robots", "index,follow");
    html = upsertMeta(html, "property", "og:title", TITLE);
    html = upsertMeta(html, "property", "og:description", DESCRIPTION);
    html = upsertMeta(html, "property", "og:url", CANONICAL);
    html = upsertMeta(html, "name", "twitter:title", TITLE);
    html = upsertMeta(html, "name", "twitter:description", DESCRIPTION);
    html = ensureStyle(html);
    html = upsertSchema(html);
    html = upgradeHero(html);
    html = upsertDiscovery(html);
    html = upsertToolsHeading(html);
    html = upgradeArchiveShortcuts(html);
    return normalizeWhitespace(html);
}

if (!fs.existsSync(FILE)) fail("games/index.html is missing");
const before = fs.readFileSync(FILE, "utf8");
const after = build(before);

if (CHECK_ONLY) {
    if (after !== before) {
        console.error("[upgrade-games-index] games/index.html is stale; run node scripts/upgrade-games-index.js");
        process.exit(1);
    }
    console.log("[upgrade-games-index] games/index.html is current.");
    process.exit(0);
}

if (after !== before) {
    fs.writeFileSync(FILE, after, "utf8");
    console.log("[upgrade-games-index] Updated games/index.html.");
} else {
    console.log("[upgrade-games-index] games/index.html already current.");
}

module.exports = { build };
