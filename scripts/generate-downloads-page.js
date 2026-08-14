#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
    getPublisherNames,
    normalizeSystem
} = require("./publisher-utils");
const { hasAuthorisedDownload } = require("./download-eligibility");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");

const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const gamesJsonPath = path.join(repoRoot, "games", "games.json");
const downloadsDir = path.join(repoRoot, "games", "downloads");
const outputPath = path.join(downloadsDir, "index.html");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");
const LAZY_IMAGE_PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

function fail(message) {
    console.error(`[downloads] ${message}`);
    process.exit(1);
}

function htmlEscape(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function jsonForHtml(value) {
    return JSON.stringify(value, null, 2)
        .replace(/</g, "\u003c")
        .replace(/-->/g, "--\u003e");
}

function readJson(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
    }
}

function writeFileIfChanged(filePath, content) {
    const next = String(content);
    const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
    if (previous === next) return false;

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, next, "utf8");
    return true;
}

function normalizeDownloadLinks(value) {
    const values = Array.isArray(value)
        ? value
        : (value === null || value === undefined || value === "" ? [] : [value]);
    const seen = new Set();

    return values
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean)
        .filter((entry) => !/^(?:n\/?a|none|null|undefined|#)$/i.test(entry))
        .filter((entry) => {
            const key = entry.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function extractGoogleDriveId(url) {
    const value = String(url || "");
    const pathMatch = value.match(/\/file\/d\/([A-Za-z0-9_-]+)/i);
    if (pathMatch) return pathMatch[1];

    const idMatch = value.match(/[?&]id=([A-Za-z0-9_-]+)/i);
    return idMatch ? idMatch[1] : "";
}

function toDirectDownloadUrl(value) {
    const url = String(value || "").trim();
    if (!url) return "";

    if (/drive\.google\.com|drive\.usercontent\.google\.com/i.test(url)) {
        const fileId = extractGoogleDriveId(url);
        if (fileId) {
            return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
        }
    }

    if (/dropbox\.com/i.test(url)) {
        try {
            const parsed = new URL(url);
            parsed.searchParams.set("dl", "1");
            return parsed.toString();
        } catch (error) {
            return url.replace(/([?&])dl=0(?:&|$)/i, "$1dl=1");
        }
    }

    return url;
}

function getThumbnailUrl(rawValue) {
    const raw = String(rawValue || "").trim();
    if (!raw) return "/resources/images/og/c64_neon.png";
    if (/^https?:\/\//i.test(raw)) return raw;
    return `/${raw.replace(/^\/+/, "")}`;
}

function getLetter(title) {
    const first = String(title || "").trim().charAt(0).toUpperCase();
    return /^[A-Z]$/.test(first) ? first : "#";
}

function getDownloadRecords(games) {
    return (Array.isArray(games) ? games : [])
        .map((game) => {
            const slug = String(game?.slug || "").trim();
            const title = String(game?.title || "").trim();
            if (!hasAuthorisedDownload(game)) return null;
            const links = normalizeDownloadLinks(game?.disk)
                .map(toDirectDownloadUrl)
                .filter(Boolean);
            if (!slug || !title || !links.length) return null;

            const yearValue = Number(game?.year);
            const year = Number.isFinite(yearValue) ? yearValue : null;
            const system = normalizeSystem(game);
            const publishers = getPublisherNames(game);

            return {
                slug,
                title,
                sortTitle: String(game?.sorttitle || title).trim(),
                year,
                system,
                publishers,
                publisherText: publishers.join(", "),
                thumbnail: getThumbnailUrl(game?.thumbnail),
                links,
                downloadCount: links.length,
                letter: getLetter(title)
            };
        })
        .filter(Boolean)
        .sort((a, b) => (
            a.sortTitle.localeCompare(b.sortTitle, "en", { sensitivity: "base" }) ||
            a.title.localeCompare(b.title, "en", { sensitivity: "base" }) ||
            (a.year || 0) - (b.year || 0)
        ));
}

function renderHead({ title, description, canonicalUrl, schema }) {
    return `<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script>
        (function () {
            try {
                var saved = localStorage.getItem("ccg-mode");
                if (!saved) return;
                document.documentElement.setAttribute("data-ccg-mode", saved);
                document.documentElement.setAttribute("data-mode", saved);
            } catch (e) {}
        })();
    </script>

    <title>${htmlEscape(title)}</title>
    <meta name="description" content="${htmlEscape(description)}">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${htmlEscape(canonicalUrl)}">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Cheeky Commodore Gamer">
    <meta property="og:title" content="${htmlEscape(title)}">
    <meta property="og:description" content="${htmlEscape(description)}">
    <meta property="og:url" content="${htmlEscape(canonicalUrl)}">
    <meta property="og:image" content="${SITE_ORIGIN}/resources/images/og/c64_neon.png">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${htmlEscape(title)}">
    <meta name="twitter:description" content="${htmlEscape(description)}">
    <meta name="twitter:image" content="${SITE_ORIGIN}/resources/images/og/c64_neon.png">
    <meta name="twitter:url" content="${htmlEscape(canonicalUrl)}">

    <script type="application/ld+json">
${jsonForHtml(schema)}
    </script>

    <link rel="icon" href="/favicon.ico">
    <link rel="stylesheet" href="/resources/css/ccg-master.css">
    <link rel="stylesheet" href="/resources/css/ccg-mode.css">
    <link rel="stylesheet" href="/resources/css/ccg-effects.css">
    <link rel="stylesheet" href="/resources/css/ccg-hero.css">
    <link rel="stylesheet" href="/resources/css/ccg-socials.css">
    <link rel="stylesheet" href="/resources/css/ccg-anim.css">
    <link rel="stylesheet" href="/resources/css/ccg-overlays.css">
    <link rel="stylesheet" href="/resources/css/ccg-nav.css">
    <link rel="stylesheet" href="/resources/css/ccg-buttons.css">
    <link rel="stylesheet" href="/resources/css/ccg-footer.css">
    <link rel="stylesheet" href="/resources/css/ccg-mobile-lite.css">
    <link rel="stylesheet" href="/resources/css/downloads.css">

    <script src="/js/analytics.js" defer></script>
    <script src="/js/ccg-mobile-lite.js" defer></script>
</head>`;
}

function renderHeader() {
    return `<header class="ccg-header" data-ccg-header>
    <div class="ccg-header-inner">
        <a href="/home.html" class="ccg-brand">
            <img src="/resources/images/ccgamer-logo.png"
                 alt="Cheeky Commodore Gamer logo"
                 class="ccg-brand__logo"
                 loading="lazy"
                 width="1500"
                 height="1032"
                 sizes="(max-width: 720px) 200px, 320px">
            <div class="ccg-brand__text">
                <div class="ccg-brand__kicker">Stay a while, stay forever!</div>
                <div class="ccg-brand__title">
                    <span class="ccg-brand__neon-cheeky">CHEEKY COMMODORE</span>
                    <span class="ccg-brand__neon-sub">GAMER</span>
                </div>
            </div>
        </a>

        <button class="ccg-nav-toggle"
                type="button"
                aria-label="Toggle navigation"
                aria-expanded="false"
                aria-controls="ccg-primary-nav"
                data-ccg-nav-toggle>
            <span class="ccg-nav-toggle__bars" aria-hidden="true"><span></span><span></span><span></span></span>
            <span class="ccg-nav-toggle__label">Menu</span>
        </button>

        <nav class="ccg-nav" aria-label="Primary navigation" id="ccg-primary-nav">
            <div class="ccg-nav__bar">
                <ul class="ccg-nav__list ccg-nav__list--primary" data-ccg-nav-primary>
                    <li><a href="/home.html" class="ccg-nav__link">Home</a></li>
                    <li><a href="/games/index.html" class="ccg-nav__link">Browse Games</a></li>
                    <li><a href="/games/genres/index.html" class="ccg-nav__link">Browse by Genre</a></li>
                    <li><a href="/games/publishers/" class="ccg-nav__link">Publishers</a></li>
                    <li><a href="/games/collections/index.html" class="ccg-nav__link">Collections</a></li>
                </ul>
                <div class="ccg-nav__more">
                    <button class="ccg-nav__more-toggle" type="button" aria-expanded="false" aria-controls="ccg-more-menu" data-ccg-more-toggle>
                        More <span aria-hidden="true">▾</span>
                    </button>
                    <div class="ccg-nav__more-menu" id="ccg-more-menu" data-ccg-more-menu hidden></div>
                </div>
            </div>
            <ul class="ccg-nav__list ccg-nav__list--secondary" data-ccg-nav-secondary>
                <li><a href="/music/index.html" class="ccg-nav__link">Music Hub</a></li>
                <li><a href="/quiz/quiz.html" class="ccg-nav__link">Quiz</a></li>
                <li><a href="/emulation.html" class="ccg-nav__link">Emulation</a></li>
                <li><a href="/about.html" class="ccg-nav__link">About</a></li>
                <li><a href="/contact.html" class="ccg-nav__link">Contact</a></li>
            </ul>
        </nav>

        <div class="ccg-header-actions">
            <div class="ccg-mode-hint">Try different modes</div>
            <button class="ccg-mode-toggle" type="button" aria-label="Toggle between C64 and Amiga modes" data-ccg-mode-toggle>
                <span class="ccg-mode-toggle__pill">
                    <span class="ccg-mode-toggle__label ccg-mode-toggle__label--c64">C64 MODE</span>
                    <span class="ccg-mode-toggle__label ccg-mode-toggle__label--amiga">AMIGA MODE</span>
                    <span class="ccg-mode-toggle__thumb"></span>
                </span>
            </button>
            <div class="ccg-header-socials" aria-label="Social links">
                <a href="https://www.youtube.com/@CheekyCommodoreGamer" aria-label="YouTube"><span class="ccg-socials__icon ccg-socials__icon--yt"></span></a>
                <a href="https://patreon.com/CheekyCommodoreGamer" aria-label="Patreon"><span class="ccg-socials__icon ccg-socials__icon--patreon"></span></a>
                <a href="https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL" aria-label="PayPal"><span class="ccg-socials__icon ccg-socials__icon--paypal"></span></a>
                <a href="https://twitter.com/CheekyC64Gamer" aria-label="X/Twitter"><span class="ccg-socials__icon ccg-socials__icon--x"></span></a>
                <a href="https://www.facebook.com/cheekycommodoregamer" aria-label="Facebook"><span class="ccg-socials__icon ccg-socials__icon--fb"></span></a>
                <a href="https://discord.gg/83Xw9ktAn4" aria-label="Discord"><span class="ccg-socials__icon ccg-socials__icon--discord"></span></a>
            </div>
        </div>
    </div>

    <div class="ccg-nav-drawer" data-ccg-nav-drawer aria-hidden="true">
        <div class="ccg-nav-drawer__backdrop" data-ccg-drawer-close tabindex="-1"></div>
        <div class="ccg-nav-drawer__panel" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div class="ccg-nav-drawer__header">
                <span class="ccg-nav-drawer__title">Navigate</span>
                <button class="ccg-nav-drawer__close" type="button" aria-label="Close menu" data-ccg-drawer-close><span aria-hidden="true">✕</span></button>
            </div>
            <div class="ccg-nav-drawer__section" data-ccg-drawer-primary><div class="ccg-nav-drawer__label">Primary</div></div>
            <div class="ccg-nav-drawer__section" data-ccg-drawer-secondary><div class="ccg-nav-drawer__label">Explore more</div></div>
        </div>
    </div>
    <div class="ccg-header-neon-strip"></div>
</header>`;
}

function renderFooter() {
    return `<footer class="ccg-footer">
    <p class="ccg-footer__text">
        © <span data-ccg-year></span> Cheeky Commodore Gamer.
        Not affiliated with Commodore, Amiga or publishers.
    </p>
</footer>`;
}

function renderScripts() {
    return `<script src="/js/ccg-nav-core.js" defer></script>
<script src="/js/ccg-global.js" defer></script>
<script src="/js/ccg-mode-engine.js" defer></script>
<script src="/resources/js/ccg-performance.js" defer></script>
<script src="/js/ccg-nav.js" defer></script>
<script src="/js/ccg-auth.js" defer></script>
<script src="/js/ccg-mode.js" defer></script>
<script src="/js/game-downloads.js" defer></script>
<script data-goatcounter="https://cheekycommodoregamer.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>`;
}

function renderDownloadActions(game) {
    const downloadButtons = game.links.map((url, index) => {
        const label = index === 0 ? "Download Game" : `Download Game ${index + 1}`;
        return `<a class="ccg-btn ccg-btn--primary ccg-download-card__download"
                   href="${htmlEscape(url)}"
                   target="_blank"
                   rel="nofollow external noopener"
                   download
                   data-direct-download>${htmlEscape(label)}</a>`;
    }).join("\n");

    return `<div class="ccg-download-card__actions">
        ${downloadButtons}
        <a class="ccg-btn ccg-btn--secondary ccg-download-card__page" href="/games/${htmlEscape(game.slug)}/">Game Page</a>
    </div>`;
}

function renderDownloadCard(game) {
    const year = game.year ? String(game.year) : "Year unknown";
    const publisher = game.publisherText || "Publisher not listed";
    const searchText = [game.title, publisher, game.system, year].join(" ").toLowerCase();

    return `<article class="ccg-download-card"
             data-download-card
             data-system="${htmlEscape(game.system.toLowerCase())}"
             data-letter="${htmlEscape(game.letter)}"
             data-search="${htmlEscape(searchText)}">
        <div class="ccg-download-card__image">
            <img src="${LAZY_IMAGE_PLACEHOLDER}"
                 data-src="${htmlEscape(game.thumbnail)}"
                 alt="${htmlEscape(game.title)} game thumbnail"
                 width="160"
                 height="120"
                 loading="lazy"
                 decoding="async">
        </div>
        <div class="ccg-download-card__body">
            <div class="ccg-download-card__meta">
                <span>${htmlEscape(game.system)}</span>
                <span>${htmlEscape(year)}</span>
                <span>${game.downloadCount} ${game.downloadCount === 1 ? "file" : "files"}</span>
            </div>
            <h3 class="ccg-download-card__title"><a href="/games/${htmlEscape(game.slug)}/">${htmlEscape(game.title)}</a></h3>
            <p class="ccg-download-card__publisher">${htmlEscape(publisher)}</p>
            ${renderDownloadActions(game)}
        </div>
    </article>`;
}

function renderDownloadsPage(games) {
    const canonicalUrl = `${SITE_ORIGIN}/games/downloads/`;
    const title = "Authorised C64 & Amiga Downloads | Cheeky Commodore Gamer";
    const description = "Browse authorised, public-domain and creator-approved freeware downloads for C64 and Amiga games.";
    const c64Count = games.filter((game) => game.system === "C64").length;
    const amigaCount = games.filter((game) => game.system === "Amiga").length;
    const fileCount = games.reduce((total, game) => total + game.downloadCount, 0);
    const groups = new Map();

    games.forEach((game) => {
        if (!groups.has(game.letter)) groups.set(game.letter, []);
        groups.get(game.letter).push(game);
    });

    const orderedLetters = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].filter((letter) => groups.has(letter));
    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                name: "Authorised C64 & Amiga Downloads",
                description,
                url: canonicalUrl,
                isPartOf: { "@type": "WebSite", name: "Cheeky Commodore Gamer", url: SITE_ORIGIN }
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
                    { "@type": "ListItem", position: 2, name: "Games", item: `${SITE_ORIGIN}/games/` },
                    { "@type": "ListItem", position: 3, name: "Game Downloads", item: canonicalUrl }
                ]
            },
            {
                "@type": "ItemList",
                name: "C64 & Amiga games with authorised downloads available",
                numberOfItems: games.length,
                itemListElement: games.map((game, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    name: game.title,
                    url: `${SITE_ORIGIN}/games/${game.slug}/`
                }))
            }
        ]
    };

    const alphabet = orderedLetters.map((letter) => (
        `<a class="ccg-downloads-alpha__link" href="#downloads-${letter === "#" ? "numbers" : letter.toLowerCase()}" data-download-letter-link="${htmlEscape(letter)}">${htmlEscape(letter)}</a>`
    )).join("\n");

    const sections = orderedLetters.map((letter) => {
        const sectionId = letter === "#" ? "numbers" : letter.toLowerCase();
        const sectionGames = groups.get(letter) || [];
        return `<details class="ccg-downloads-letter" id="downloads-${sectionId}" data-download-section data-letter="${htmlEscape(letter)}">
            <summary class="ccg-downloads-letter__heading">
                <h2>${htmlEscape(letter)}</h2>
                <span class="ccg-downloads-letter__count">${sectionGames.length} ${sectionGames.length === 1 ? "game" : "games"}</span>
            </summary>
            <div class="ccg-downloads-letter__panel">
                <div class="ccg-downloads-grid">
                    ${sectionGames.map(renderDownloadCard).join("\n")}
                </div>
            </div>
        </details>`;
    }).join("\n");

    return `<!DOCTYPE html>
<html lang="en" data-ccg-page="game-downloads">
${renderHead({ title, description, canonicalUrl, schema })}
<body class="ccg-body ccg-downloads-page" data-ccg-mode="c64" data-mode="c64" id="top">
    <div class="ccg-bg" aria-hidden="true">
        <div class="ccg-bg-starfield" aria-hidden="true"></div>
        <div class="ccg-bg-grid" aria-hidden="true"></div>
        <div class="ccg-bg-crt-overlay" aria-hidden="true"></div>
    </div>

    <div class="ccg-page ccg-page--downloads">
        ${renderHeader()}

        <main class="ccg-main ccg-downloads-main">
            <section class="ccg-downloads-hero">
                <p class="ccg-downloads-hero__kicker">Authorised downloads · C64 &amp; Amiga</p>
                <h1 class="ccg-downloads-hero__title">Authorised Game Downloads</h1>
                <p class="ccg-downloads-hero__intro">
                    This archive only lists downloads verified as authorised by a rights holder, public domain or creator-approved freeware.
                </p>
                <div class="ccg-downloads-hero__stats">
                    <span><strong>${games.length}</strong> downloadable games</span>
                    <span><strong>${c64Count}</strong> C64</span>
                    <span><strong>${amigaCount}</strong> Amiga</span>
                    <span><strong>${fileCount}</strong> linked files</span>
                </div>
            </section>

            <nav class="ccg-downloads-breadcrumbs" aria-label="Breadcrumb">
                <a href="/games/">Games</a><span aria-hidden="true">›</span><span aria-current="page">Game Downloads</span>
            </nav>

            <section class="ccg-downloads-tools" aria-label="Search and filter authorised downloadable games"${games.length ? "" : " hidden"}>
                <div class="ccg-downloads-search">
                    <label class="visually-hidden" for="downloadSearchInput">Search downloadable games</label>
                    <input id="downloadSearchInput" type="search" placeholder="Search by game, publisher, platform or year…" autocomplete="off">
                    <button id="downloadSearchClear" type="button" aria-label="Clear download search">×</button>
                </div>
                <div class="ccg-downloads-filter" role="group" aria-label="Filter downloadable games by system">
                    <button type="button" class="ccg-btn ccg-btn--secondary is-active" data-download-system="all" aria-pressed="true">All Games</button>
                    <button type="button" class="ccg-btn ccg-btn--secondary" data-download-system="c64" aria-pressed="false">Commodore 64</button>
                    <button type="button" class="ccg-btn ccg-btn--secondary" data-download-system="amiga" aria-pressed="false">Amiga</button>
                </div>
                <p class="ccg-downloads-visible-count"><strong id="downloadVisibleCount">${games.length}</strong> games shown</p>
            </section>

            <nav class="ccg-downloads-alpha" aria-label="Open games by letter"${games.length ? "" : " hidden"}>${alphabet}</nav>

            <section class="ccg-downloads-notice" aria-labelledby="downloads-notice-title">
                <h2 id="downloads-notice-title">${games.length ? "Choose a letter" : "No verified downloads listed yet"}</h2>
                <p>${games.length ? "The archive starts collapsed so hundreds of thumbnails are not loaded together. Open one letter at a time, or use search to jump to the first matching section." : "Commercial games are kept as information, video and archive pages unless Cheeky Commodore Gamer has confirmed permission to publish a download."}</p>
            </section>

            <div class="ccg-downloads-archive" id="downloadArchive">${sections}</div>
            <p class="ccg-downloads-empty" id="downloadEmptyState" hidden>No downloadable games match that search.</p>

            <section class="ccg-downloads-rights" aria-labelledby="downloads-rights-title">
                <h2 id="downloads-rights-title">Preservation and rights</h2>
                <p>Downloads are listed only where permission has been verified, or where a title is public domain or creator-approved freeware. Game files remain the property of their respective rights holders.</p>
            </section>

            <section class="ccg-downloads-wayfinding" aria-labelledby="downloads-explore-title">
                <h2 id="downloads-explore-title">Keep Exploring</h2>
                <div class="ccg-downloads-wayfinding__links">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/">All Games</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/genres/">Browse by Genre</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/publishers/">Publishers</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/collections/">Collections</a>
                </div>
            </section>
        </main>

        ${renderFooter()}
    </div>

    ${renderScripts()}
</body>
</html>
`;
}

function updateStaticPages() {
    const current = readJson(staticPagesPath, []);
    const list = Array.isArray(current) ? current.filter((entry) => typeof entry === "string") : [];
    const target = "games/downloads/index.html";
    const seen = new Set([""]);
    const deduped = [""];
    list.forEach((entry) => {
        const normalized = entry.trim();
        if (!normalized || normalized === target || seen.has(normalized)) return;
        seen.add(normalized);
        deduped.push(normalized);
    });
    const firstDeveloperIndex = deduped.findIndex((entry) => entry.startsWith("games/developers/"));
    const insertionIndex = firstDeveloperIndex >= 0 ? firstDeveloperIndex : deduped.length;
    deduped.splice(insertionIndex, 0, target);

    return writeFileIfChanged(staticPagesPath, `${JSON.stringify(deduped, null, 2)}\n`);
}

function validateGeneratedPage(html, games) {
    const problems = [];
    const canonicalUrl = `${SITE_ORIGIN}/games/downloads/`;

    if (!html.includes(`<link rel="canonical" href="${canonicalUrl}">`)) problems.push("missing canonical URL");
    if (!html.includes("<title>Authorised C64 &amp; Amiga Downloads | Cheeky Commodore Gamer</title>")) problems.push("missing expected SEO title");
    if (!html.includes('meta name="robots" content="index,follow"')) problems.push("missing index,follow robots directive");
    if (!html.includes('id="downloadSearchInput"')) problems.push("missing search input");
    if (games.length) {
        if (!html.includes("<details class=\"ccg-downloads-letter\"")) problems.push("missing accordion sections");
        if (!html.includes("Download Game")) problems.push("missing direct download actions");
        if (!html.includes("Game Page")) problems.push("missing game page actions");
        if (!html.includes("data-src=")) problems.push("missing deferred thumbnail loading");
    }

    games.forEach((game) => {
        if (!html.includes(`href="/games/${game.slug}/"`)) problems.push(`missing crawlable game link: ${game.slug}`);
        game.links.forEach((url) => {
            if (!html.includes(`href="${htmlEscape(url)}"`)) problems.push(`missing download link: ${game.slug}`);
        });
    });

    return problems;
}

function main() {
    if (!fs.existsSync(gamesJsonPath)) fail(`Missing games source: ${path.relative(repoRoot, gamesJsonPath)}`);

    const sourceGames = readJson(gamesJsonPath, []);
    if (!Array.isArray(sourceGames) || !sourceGames.length) fail("games/games.json must contain a non-empty top-level array.");

    const downloadableGames = getDownloadRecords(sourceGames);
    const html = renderDownloadsPage(downloadableGames);
    const problems = validateGeneratedPage(html, downloadableGames);
    if (problems.length) fail(`Generated page validation failed: ${problems.join("; ")}`);

    const pageChanged = writeFileIfChanged(outputPath, html);
    const staticPagesChanged = updateStaticPages();
    const c64Count = downloadableGames.filter((game) => game.system === "C64").length;
    const amigaCount = downloadableGames.filter((game) => game.system === "Amiga").length;
    const fileCount = downloadableGames.reduce((total, game) => total + game.downloadCount, 0);

    console.log(`[downloads] Games scanned: ${sourceGames.length}`);
    console.log(`[downloads] Downloadable games generated: ${downloadableGames.length}`);
    console.log(`[downloads] C64: ${c64Count} · Amiga: ${amigaCount} · Linked files: ${fileCount}`);
    console.log(`[downloads] Page changed: ${pageChanged ? "yes" : "no"}`);
    console.log(`[downloads] Static pages config changed: ${staticPagesChanged ? "yes" : "no"}`);
}

if (require.main === module) main();

module.exports = {
    extractGoogleDriveId,
    getDownloadRecords,
    normalizeDownloadLinks,
    renderDownloadsPage,
    toDirectDownloadUrl,
    updateStaticPages,
    validateGeneratedPage
};
