#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
    FEATURED_PUBLISHERS,
    buildPublisherGroups
} = require("./publisher-utils");
const { normaliseHtml, STATIC_SHELL_VERSION } = require("./normalize-public-header-shell");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");

const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const INDEXABLE_MIN_GAMES = 2;

const gamesJsonPath = path.join(repoRoot, "games", "games.json");
const publishersDir = path.join(repoRoot, "games", "publishers");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");
const playlistConfigPath = path.join(repoRoot, "data", "publisher-playlists.json");
const metadataPath = path.join(publishersDir, "publishers.json");

function fail(message) {
    console.error(`[publishers] ${message}`);
    process.exit(1);
}

function canonicalizePublisherHtml(html, label) {
    const result = normaliseHtml(html);
    if (!result.applicable || result.malformed) {
        fail(`${label} is missing the replaceable shared-header contract.`);
    }

    const output = result.html;
    const required = [
        `data-ccg-static-shell=\"${STATIC_SHELL_VERSION}\"`,
        'class=\"ccg-auth-slot\" data-ccg-auth-pending=\"true\"',
        'data-ccg-auth-snapshot-bootstrap=\"true\"',
        'ccg-socials__icon--yt',
        'ccg-socials__icon--patreon',
        'ccg-socials__icon--paypal',
        'ccg-socials__icon--x',
        'ccg-socials__icon--fb',
        'ccg-socials__icon--discord',
        'src=\"/js/ccg-header-auth-loader.js\"'
    ];
    const missing = required.filter((snippet) => !output.includes(snippet));
    if (missing.length) {
        fail(`${label} is missing canonical shell requirements: ${missing.join(", ")}`);
    }

    return output;
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
        .replace(/</g, "\\u003c")
        .replace(/-->/g, "--\\u003e");
}

function normalizeGeneratedText(content) {
    return String(content).replace(/[ \t]+$/gm, "");
}

function writeFileIfChanged(filePath, content) {
    const next = normalizeGeneratedText(content);
    const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
    if (previous === next) return false;

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, next, "utf8");
    return true;
}

function readJson(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
    }
}

function getThumbnailUrl(rawValue) {
    const raw = String(rawValue || "").trim();
    if (!raw) return "/resources/images/og/c64_neon.png";
    if (/^https?:\/\//i.test(raw)) return raw;
    return `/${raw.replace(/^\/+/, "")}`;
}

function platformLabel(group) {
    const hasC64 = group.c64Count > 0;
    const hasAmiga = group.amigaCount > 0;
    if (hasC64 && hasAmiga) return "C64 & Amiga";
    if (hasC64) return "Commodore 64";
    if (hasAmiga) return "Amiga";
    return "Retro";
}

function platformSummary(group) {
    const parts = [];
    if (group.c64Count) parts.push(`${group.c64Count} C64`);
    if (group.amigaCount) parts.push(`${group.amigaCount} Amiga`);
    const otherCount = Math.max(0, group.count - group.c64Count - group.amigaCount);
    if (otherCount) parts.push(`${otherCount} other`);
    return parts.join(" · ") || `${group.count} games`;
}

function yearSummary(group) {
    if (!group.firstYear || !group.lastYear) return "";
    if (group.firstYear === group.lastYear) return String(group.firstYear);
    return `${group.firstYear}–${group.lastYear}`;
}

function validPlaylistUrl(value) {
    const url = String(value || "").trim();
    if (!url) return "";
    return /^https:\/\/(?:www\.)?youtube\.com\/playlist\?list=[A-Za-z0-9_-]+/i.test(url) ? url : "";
}

function getPlaylistUrl(playlists, group) {
    if (!playlists || typeof playlists !== "object" || Array.isArray(playlists)) return "";
    return validPlaylistUrl(playlists[group.slug] || playlists[group.name]);
}

function renderHead({ title, description, canonicalUrl, robots = "index,follow", schema }) {
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
    <meta name="robots" content="${htmlEscape(robots)}">
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
    <link rel="stylesheet" href="/resources/css/ccg-cards.css">
    <link rel="stylesheet" href="/resources/css/ccg-socials.css">
    <link rel="stylesheet" href="/resources/css/ccg-anim.css">
    <link rel="stylesheet" href="/resources/css/ccg-overlays.css">
    <link rel="stylesheet" href="/resources/css/ccg-nav.css">
    <link rel="stylesheet" href="/resources/css/ccg-buttons.css">
    <link rel="stylesheet" href="/resources/css/ccg-footer.css">
    <link rel="stylesheet" href="/resources/css/ccg-mobile-lite.css">
    <link rel="stylesheet" href="/resources/css/publishers.css">

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
            <span class="ccg-nav-toggle__bars" aria-hidden="true">
                <span></span><span></span><span></span>
            </span>
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
                    <button class="ccg-nav__more-toggle"
                            type="button"
                            aria-expanded="false"
                            aria-controls="ccg-more-menu"
                            data-ccg-more-toggle>
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
            <button class="ccg-mode-toggle"
                    type="button"
                    aria-label="Toggle between C64 and Amiga modes"
                    data-ccg-mode-toggle>
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
                <button class="ccg-nav-drawer__close" type="button" aria-label="Close menu" data-ccg-drawer-close>
                    <span aria-hidden="true">✕</span>
                </button>
            </div>
            <div class="ccg-nav-drawer__section" data-ccg-drawer-primary>
                <div class="ccg-nav-drawer__label">Primary</div>
            </div>
            <div class="ccg-nav-drawer__section" data-ccg-drawer-secondary>
                <div class="ccg-nav-drawer__label">Explore more</div>
            </div>
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
<script src="/js/publisher-pages.js" defer></script>
<script
    data-goatcounter="https://cheekycommodoregamer.goatcounter.com/count"
    async
    src="https://gc.zgo.at/count.js"></script>`;
}

function renderPublisherIndex(groups) {
    const canonicalUrl = `${SITE_ORIGIN}/games/publishers/`;
    const title = "C64 & Amiga Game Publishers | Cheeky Commodore Gamer";
    const description = "Browse Commodore 64 and Amiga games by publisher, including Ocean Software, Mastertronic, Firebird, US Gold, Codemasters, System 3 and many more.";

    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                name: "C64 & Amiga Game Publishers",
                description,
                url: canonicalUrl,
                isPartOf: {
                    "@type": "WebSite",
                    name: "Cheeky Commodore Gamer",
                    url: SITE_ORIGIN
                }
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    {
                        "@type": "ListItem",
                        position: 1,
                        name: "Home",
                        item: `${SITE_ORIGIN}/`
                    },
                    {
                        "@type": "ListItem",
                        position: 2,
                        name: "Games",
                        item: `${SITE_ORIGIN}/games/`
                    },
                    {
                        "@type": "ListItem",
                        position: 3,
                        name: "Publishers",
                        item: canonicalUrl
                    }
                ]
            },
            {
                "@type": "ItemList",
                name: "Publisher archives",
                numberOfItems: groups.length,
                itemListElement: groups.map((group, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    name: group.name,
                    url: `${SITE_ORIGIN}/games/publishers/${group.slug}/`
                }))
            }
        ]
    };

    const featuredGroups = FEATURED_PUBLISHERS
        .map((name) => groups.find((group) => group.name === name))
        .filter(Boolean);

    const featuredSlugs = new Set(featuredGroups.map((group) => group.slug));
    const remainingGroups = groups.filter((group) => !featuredSlugs.has(group.slug));

    const featuredCards = featuredGroups.map((group) => `
                <article class="ccg-publisher-card ccg-publisher-card--featured" data-publisher-card data-publisher-name="${htmlEscape(group.name.toLowerCase())}" data-publisher-platform="${htmlEscape(group.platformKey)}">
                    <a class="ccg-publisher-card__link" href="/games/publishers/${htmlEscape(group.slug)}/">
                        <span class="ccg-publisher-card__eyebrow">Featured Publisher</span>
                        <h3 class="ccg-publisher-card__title">${htmlEscape(group.name)}</h3>
                        <p class="ccg-publisher-card__stats">${htmlEscape(platformSummary(group))}${yearSummary(group) ? ` · ${htmlEscape(yearSummary(group))}` : ""}</p>
                        <span class="ccg-publisher-card__cta">Browse ${group.count} ${group.count === 1 ? "game" : "games"}</span>
                    </a>
                </article>`).join("");

    const publisherCards = remainingGroups.map((group) => `
                <article class="ccg-publisher-card" data-publisher-card data-publisher-name="${htmlEscape(group.name.toLowerCase())}" data-publisher-platform="${htmlEscape(group.platformKey)}">
                    <a class="ccg-publisher-card__link" href="/games/publishers/${htmlEscape(group.slug)}/">
                        <h3 class="ccg-publisher-card__title">${htmlEscape(group.name)}</h3>
                        <p class="ccg-publisher-card__stats">${htmlEscape(platformSummary(group))}${yearSummary(group) ? ` · ${htmlEscape(yearSummary(group))}` : ""}</p>
                        <span class="ccg-publisher-card__cta">${group.count} ${group.count === 1 ? "game" : "games"}</span>
                    </a>
                </article>`).join("");

    return `<!DOCTYPE html>
<html lang="en" data-ccg-page="publisher-index">
${renderHead({ title, description, canonicalUrl, schema })}
<body class="ccg-body ccg-publishers-page" data-ccg-mode="c64" data-mode="c64" id="top">
    <div class="ccg-bg" aria-hidden="true">
        <div class="ccg-bg-starfield" aria-hidden="true"></div>
        <div class="ccg-bg-grid" aria-hidden="true"></div>
        <div class="ccg-bg-crt-overlay" aria-hidden="true"></div>
    </div>

    <div class="ccg-page ccg-page--publishers">
        ${renderHeader()}

        <main class="ccg-main ccg-publishers-main">
            <section class="ccg-publishers-hero">
                <p class="ccg-publishers-hero__kicker">C64 &amp; Amiga archive</p>
                <h1 class="ccg-publishers-hero__title">Browse Games by Publisher</h1>
                <p class="ccg-publishers-hero__intro">
                    Explore every publisher represented in the Cheeky Commodore Gamer archive. Each publisher page lists its C64 and Amiga games with direct links to the individual game pages.
                </p>
                <div class="ccg-publishers-hero__stats">
                    <span><strong>${groups.length}</strong> publishers</span>
                    <span><strong>${groups.reduce((sum, group) => sum + group.count, 0)}</strong> publisher credits</span>
                    <span><strong>${groups.reduce((sum, group) => sum + group.c64Count, 0)}</strong> C64 entries</span>
                    <span><strong>${groups.reduce((sum, group) => sum + group.amigaCount, 0)}</strong> Amiga entries</span>
                </div>
            </section>

            <nav class="ccg-publisher-breadcrumbs" aria-label="Breadcrumb">
                <a href="/games/">Games</a>
                <span aria-hidden="true">›</span>
                <span aria-current="page">Publishers</span>
            </nav>

            <section class="ccg-publishers-tools" aria-label="Publisher filters">
                <label class="ccg-publishers-search">
                    <span class="visually-hidden">Search publishers</span>
                    <input id="publisherSearchInput" type="search" placeholder="Search publishers…" autocomplete="off">
                </label>
                <div class="ccg-publishers-filter" role="group" aria-label="Filter publishers by system">
                    <button type="button" class="ccg-btn ccg-btn--secondary is-active" data-publisher-system="all" aria-pressed="true">All</button>
                    <button type="button" class="ccg-btn ccg-btn--secondary" data-publisher-system="c64" aria-pressed="false">C64</button>
                    <button type="button" class="ccg-btn ccg-btn--secondary" data-publisher-system="amiga" aria-pressed="false">Amiga</button>
                    <button type="button" class="ccg-btn ccg-btn--secondary" data-publisher-system="both" aria-pressed="false">Both</button>
                </div>
                <p class="ccg-publishers-visible-count"><strong id="publisherVisibleCount">${groups.length}</strong> publishers shown</p>
            </section>

            ${featuredGroups.length ? `<section class="ccg-publishers-section ccg-publishers-section--featured" aria-labelledby="featured-publishers-title">
                <div class="ccg-publishers-section__heading">
                    <p class="ccg-publishers-section__kicker">Major names</p>
                    <h2 id="featured-publishers-title">Featured Publishers</h2>
                </div>
                <div class="ccg-publisher-grid ccg-publisher-grid--featured">
                    ${featuredCards}
                </div>
            </section>` : ""}

            <section class="ccg-publishers-section" aria-labelledby="all-publishers-title">
                <div class="ccg-publishers-section__heading">
                    <p class="ccg-publishers-section__kicker">Full directory</p>
                    <h2 id="all-publishers-title">All Publishers</h2>
                </div>
                <div class="ccg-publisher-grid" id="publisherGrid">
                    ${publisherCards}
                </div>
                <p class="ccg-publishers-empty" id="publisherEmptyState" hidden>No publishers match that search.</p>
            </section>
        </main>

        ${renderFooter()}
    </div>

    ${renderScripts()}
</body>
</html>
`;
}

function renderGameCard(game) {
    const thumbnail = getThumbnailUrl(game.thumbnail);
    const platform = String(game.system || game.platform || "Retro").trim();
    const year = Number(game.year) || "Year unknown";

    return `                    <article class="ccg-publisher-game-card" data-publisher-game-card data-game-title="${htmlEscape(String(game.title || "").toLowerCase())}" data-game-platform="${htmlEscape(String(platform).toLowerCase())}">
                        <a class="ccg-publisher-game-card__link" href="/games/${htmlEscape(game.slug)}/">
                            <div class="ccg-publisher-game-card__media">
                                <img src="${htmlEscape(thumbnail)}" alt="${htmlEscape(game.title)} thumbnail" loading="lazy" decoding="async">
                            </div>
                            <div class="ccg-publisher-game-card__body">
                                <h3>${htmlEscape(game.title)}</h3>
                                <p>${htmlEscape(platform)} · ${htmlEscape(year)}</p>
                            </div>
                        </a>
                    </article>`;
}

function renderPublisherPage(group, playlists) {
    const canonicalUrl = `${SITE_ORIGIN}/games/publishers/${group.slug}/`;
    const systemLabel = platformLabel(group);
    const description = `Browse ${group.count} ${group.name} ${systemLabel} ${group.count === 1 ? "game" : "games"} in the Cheeky Commodore Gamer archive, with release years, videos and direct game links.`;
    const title = `${group.name} C64 & Amiga Games | Cheeky Commodore Gamer`;
    const robots = group.count >= INDEXABLE_MIN_GAMES ? "index,follow" : "noindex,follow";
    const playlistUrl = getPlaylistUrl(playlists, group);

    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                name: `${group.name} Games`,
                description,
                url: canonicalUrl,
                isPartOf: {
                    "@type": "WebSite",
                    name: "Cheeky Commodore Gamer",
                    url: SITE_ORIGIN
                },
                about: {
                    "@type": "Organization",
                    name: group.name
                }
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    {
                        "@type": "ListItem",
                        position: 1,
                        name: "Home",
                        item: `${SITE_ORIGIN}/`
                    },
                    {
                        "@type": "ListItem",
                        position: 2,
                        name: "Games",
                        item: `${SITE_ORIGIN}/games/`
                    },
                    {
                        "@type": "ListItem",
                        position: 3,
                        name: "Publishers",
                        item: `${SITE_ORIGIN}/games/publishers/`
                    },
                    {
                        "@type": "ListItem",
                        position: 4,
                        name: group.name,
                        item: canonicalUrl
                    }
                ]
            },
            {
                "@type": "ItemList",
                name: `${group.name} games in the CCG archive`,
                numberOfItems: group.games.length,
                itemListElement: group.games.map((game, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    name: game.title,
                    url: `${SITE_ORIGIN}/games/${game.slug}/`
                }))
            }
        ]
    };

    return `<!DOCTYPE html>
<html lang="en" data-ccg-page="publisher-single">
${renderHead({ title, description, canonicalUrl, robots, schema })}
<body class="ccg-body ccg-publishers-page ccg-publisher-single" data-ccg-mode="c64" data-mode="c64" data-publisher="${htmlEscape(group.slug)}" id="top">
    <div class="ccg-bg" aria-hidden="true">
        <div class="ccg-bg-starfield" aria-hidden="true"></div>
        <div class="ccg-bg-grid" aria-hidden="true"></div>
        <div class="ccg-bg-crt-overlay" aria-hidden="true"></div>
    </div>

    <div class="ccg-page ccg-page--publishers">
        ${renderHeader()}

        <main class="ccg-main ccg-publishers-main">
            <section class="ccg-publishers-hero ccg-publisher-hero">
                <p class="ccg-publishers-hero__kicker">Publisher archive · ${htmlEscape(systemLabel)}</p>
                <h1 class="ccg-publishers-hero__title">${htmlEscape(group.name)} Games</h1>
                <p class="ccg-publishers-hero__intro">
                    Browse every ${htmlEscape(group.name)} title currently catalogued by Cheeky Commodore Gamer. New games are added here automatically when their publisher credit is present in the main game database.
                </p>
                <div class="ccg-publishers-hero__stats">
                    <span><strong>${group.count}</strong> ${group.count === 1 ? "game" : "games"}</span>
                    ${group.c64Count ? `<span><strong>${group.c64Count}</strong> C64</span>` : ""}
                    ${group.amigaCount ? `<span><strong>${group.amigaCount}</strong> Amiga</span>` : ""}
                    ${yearSummary(group) ? `<span><strong>${htmlEscape(yearSummary(group))}</strong> years covered</span>` : ""}
                </div>
            </section>

            <nav class="ccg-publisher-breadcrumbs" aria-label="Breadcrumb">
                <a href="/games/">Games</a>
                <span aria-hidden="true">›</span>
                <a href="/games/publishers/">Publishers</a>
                <span aria-hidden="true">›</span>
                <span aria-current="page">${htmlEscape(group.name)}</span>
            </nav>

            ${playlistUrl ? `<section class="ccg-publisher-playlist" aria-labelledby="publisher-playlist-title">
                <div>
                    <p class="ccg-publishers-section__kicker">Watch on YouTube</p>
                    <h2 id="publisher-playlist-title">${htmlEscape(group.name)} Playlist</h2>
                    <p>Continue through the Cheeky Commodore Gamer videos collected for this publisher.</p>
                </div>
                <a class="ccg-btn ccg-btn--primary"
                   href="${htmlEscape(playlistUrl)}"
                   target="_blank"
                   rel="noopener noreferrer">Open YouTube Playlist</a>
            </section>` : ""}

            <section class="ccg-publishers-tools" aria-label="Game filters">
                <label class="ccg-publishers-search">
                    <span class="visually-hidden">Search ${htmlEscape(group.name)} games</span>
                    <input id="publisherGameSearchInput" type="search" placeholder="Search ${htmlEscape(group.name)} games…" autocomplete="off">
                </label>
                <div class="ccg-publishers-filter" role="group" aria-label="Filter games by system">
                    <button type="button" class="ccg-btn ccg-btn--secondary is-active" data-publisher-game-system="all" aria-pressed="true">All</button>
                    ${group.c64Count ? `<button type="button" class="ccg-btn ccg-btn--secondary" data-publisher-game-system="c64" aria-pressed="false">C64</button>` : ""}
                    ${group.amigaCount ? `<button type="button" class="ccg-btn ccg-btn--secondary" data-publisher-game-system="amiga" aria-pressed="false">Amiga</button>` : ""}
                </div>
                <p class="ccg-publishers-visible-count"><strong id="publisherGameVisibleCount">${group.count}</strong> games shown</p>
            </section>

            <section class="ccg-publishers-section" aria-labelledby="publisher-games-title">
                <div class="ccg-publishers-section__heading">
                    <p class="ccg-publishers-section__kicker">Game archive</p>
                    <h2 id="publisher-games-title">${htmlEscape(group.name)} on CCG</h2>
                    <p>${htmlEscape(platformSummary(group))}${yearSummary(group) ? ` · ${htmlEscape(yearSummary(group))}` : ""}</p>
                </div>

                <div class="ccg-publisher-game-grid" id="publisherGameGrid">
                    ${group.games.map(renderGameCard).join("\n")}
                </div>

                <p class="ccg-publishers-empty" id="publisherGameEmptyState" hidden>No games match that search.</p>
            </section>

            <section class="ccg-publishers-wayfinding">
                <h2>Browse More</h2>
                <div class="ccg-publishers-wayfinding__links">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/publishers/">All Publishers</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/">All Games</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/genres/">Genres</a>
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

function validateGeneratedPage(html, expectedCanonical, expectedName, expectedGameSlugs = []) {
    const problems = [];

    if (!html.includes("<title>")) problems.push("missing title");
    if (!html.includes('name="description"')) problems.push("missing meta description");
    if (!html.includes(`rel="canonical" href="${expectedCanonical}"`)) problems.push("canonical mismatch");
    if (!html.includes('type="application/ld+json"')) problems.push("missing JSON-LD");
    if (!html.includes(expectedName)) problems.push("missing publisher name");

    expectedGameSlugs.forEach((slug) => {
        if (!html.includes(`href="/games/${slug}/"`)) {
            problems.push(`missing crawlable game link: ${slug}`);
        }
    });

    return problems;
}

function cleanStalePublisherDirectories(groups) {
    fs.mkdirSync(publishersDir, { recursive: true });
    const active = new Set(groups.map((group) => group.slug));

    fs.readdirSync(publishersDir, { withFileTypes: true }).forEach((entry) => {
        if (!entry.isDirectory()) return;
        if (active.has(entry.name)) return;
        fs.rmSync(path.join(publishersDir, entry.name), { recursive: true, force: true });
        console.log(`[publishers] Removed stale publisher directory: ${entry.name}`);
    });
}

function updateStaticPages(groups) {
    const current = readJson(staticPagesPath, []);
    const currentList = Array.isArray(current) ? current : [];

    const preserved = currentList.filter((entry) => (
        typeof entry === "string" &&
        !entry.replace(/^\/+/, "").startsWith("games/publishers/")
    ));

    const generated = [
        "games/publishers/index.html",
        ...groups
            .filter((group) => group.count >= INDEXABLE_MIN_GAMES)
            .map((group) => `games/publishers/${group.slug}/index.html`)
    ];

    const seen = new Set();
    const next = [...preserved, ...generated].filter((entry) => {
        if (typeof entry !== "string") return false;
        const normalized = entry.trim();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return normalized === "" || Boolean(normalized);
    });

    return writeFileIfChanged(staticPagesPath, `${JSON.stringify(next, null, 2)}\n`);
}

function buildMetadata(groups, playlists) {
    return groups.map((group) => ({
        name: group.name,
        slug: group.slug,
        count: group.count,
        c64Count: group.c64Count,
        amigaCount: group.amigaCount,
        firstYear: group.firstYear,
        lastYear: group.lastYear,
        indexable: group.count >= INDEXABLE_MIN_GAMES,
        playlist: getPlaylistUrl(playlists, group),
        url: `/games/publishers/${group.slug}/`
    }));
}

function main() {
    if (!fs.existsSync(gamesJsonPath)) {
        fail(`Missing games source: ${path.relative(repoRoot, gamesJsonPath)}`);
    }

    const games = readJson(gamesJsonPath, []);
    if (!Array.isArray(games) || !games.length) {
        fail("games/games.json must contain a non-empty top-level array.");
    }

    const groups = buildPublisherGroups(games);
    if (!groups.length) {
        fail("No publisher credits were found in games/games.json.");
    }

    const duplicateSlugs = groups
        .map((group) => group.slug)
        .filter((slug, index, all) => all.indexOf(slug) !== index);

    if (duplicateSlugs.length) {
        fail(`Duplicate publisher slugs: ${[...new Set(duplicateSlugs)].join(", ")}`);
    }

    const playlists = readJson(playlistConfigPath, {});
    fs.mkdirSync(publishersDir, { recursive: true });

    let writes = 0;

    const indexHtml = canonicalizePublisherHtml(renderPublisherIndex(groups), "publisher index");
    const indexCanonical = `${SITE_ORIGIN}/games/publishers/`;
    const indexProblems = validateGeneratedPage(indexHtml, indexCanonical, "Browse Games by Publisher");
    if (indexProblems.length) {
        fail(`Publisher index validation failed: ${indexProblems.join("; ")}`);
    }
    if (writeFileIfChanged(path.join(publishersDir, "index.html"), indexHtml)) writes += 1;

    for (const group of groups) {
        const html = canonicalizePublisherHtml(renderPublisherPage(group, playlists), `publisher ${group.slug}`);
        const canonical = `${SITE_ORIGIN}/games/publishers/${group.slug}/`;
        const problems = validateGeneratedPage(
            html,
            canonical,
            group.name,
            group.games.map((game) => game.slug)
        );

        if (problems.length) {
            fail(`${group.name} validation failed: ${problems.join("; ")}`);
        }

        const outputPath = path.join(publishersDir, group.slug, "index.html");
        if (writeFileIfChanged(outputPath, html)) writes += 1;
    }

    cleanStalePublisherDirectories(groups);

    if (writeFileIfChanged(metadataPath, `${JSON.stringify(buildMetadata(groups, playlists), null, 2)}\n`)) {
        writes += 1;
    }

    const staticPagesChanged = updateStaticPages(groups);
    if (staticPagesChanged) writes += 1;

    const indexableCount = groups.filter((group) => group.count >= INDEXABLE_MIN_GAMES).length;
    const thinCount = groups.length - indexableCount;

    console.log(`[publishers] Games scanned: ${games.length}`);
    console.log(`[publishers] Publishers generated: ${groups.length}`);
    console.log(`[publishers] Indexable publisher pages: ${indexableCount}`);
    console.log(`[publishers] Thin publisher pages (noindex,follow): ${thinCount}`);
    console.log(`[publishers] Files changed: ${writes}`);
    console.log("[publishers] Static pages config synchronized for sitemap generation.");
}

if (require.main === module) {
    main();
}

module.exports = {
    INDEXABLE_MIN_GAMES,
    buildMetadata,
    getPlaylistUrl,
    renderPublisherIndex,
    renderPublisherPage,
    updateStaticPages
};
