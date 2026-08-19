#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
    DEVELOPER_ALIASES,
    buildDeveloperGroups
} = require("./developer-utils");
const { normaliseHtml, STATIC_SHELL_VERSION } = require("./normalize-public-header-shell");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");

const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const INDEXABLE_MIN_GAMES = 2;
const gamesJsonPath = path.join(repoRoot, "games", "games.json");
const developersDir = path.join(repoRoot, "games", "developers");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");
const metadataPath = path.join(developersDir, "developers.json");
const reportPath = path.join(repoRoot, "docs", "seo-baseline", "phase-3b-developer-archives.md");

function fail(message) {
    console.error(`[developers] ${message}`);
    process.exit(1);
}

function canonicalizeDeveloperHtml(html, label) {
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

function writeFileIfChanged(filePath, content) {
    const next = String(content);
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
    <link rel="stylesheet" href="/resources/css/developers.css">

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
                    <li><a href="/games/developers/" class="ccg-nav__link">Developers</a></li>
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
        Not affiliated with Commodore, Amiga, developers or publishers.
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
<script src="/js/developer-pages.js" defer></script>
<script data-goatcounter="https://cheekycommodoregamer.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>`;
}

function renderDeveloperCard(group, extraClass = "") {
    return `<a class="ccg-developer-card ${extraClass}"
       href="/games/developers/${htmlEscape(group.slug)}/"
       data-developer-card
       data-developer-name="${htmlEscape(group.name.toLowerCase())}"
       data-c64-count="${group.c64Count}"
       data-amiga-count="${group.amigaCount}">
        <span class="ccg-developer-card__name">${htmlEscape(group.name)}</span>
        <span class="ccg-developer-card__count">${group.count} ${group.count === 1 ? "game" : "games"}</span>
        <span class="ccg-developer-card__meta">${htmlEscape(platformSummary(group))}${yearSummary(group) ? ` · ${htmlEscape(yearSummary(group))}` : ""}</span>
    </a>`;
}

function renderDeveloperIndex(groups) {
    const canonicalUrl = `${SITE_ORIGIN}/games/developers/`;
    const title = "C64 & Amiga Game Developers | Cheeky Commodore Gamer";
    const description = "Browse Commodore 64 and Amiga games by their recorded developer credits, with static archive pages linking directly to every matching game.";
    const represented = [...groups]
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "en", { sensitivity: "base" }))
        .slice(0, 11);

    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                name: "C64 & Amiga Game Developers",
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
                    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
                    { "@type": "ListItem", position: 2, name: "Games", item: `${SITE_ORIGIN}/games/` },
                    { "@type": "ListItem", position: 3, name: "Developers", item: canonicalUrl }
                ]
            },
            {
                "@type": "ItemList",
                name: "Developer credits in the CCG archive",
                numberOfItems: groups.length,
                itemListElement: groups.map((group, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    name: group.name,
                    url: `${SITE_ORIGIN}/games/developers/${group.slug}/`
                }))
            }
        ]
    };

    return `<!DOCTYPE html>
<html lang="en" data-ccg-page="developers-index">
${renderHead({ title, description, canonicalUrl, schema })}
<body class="ccg-body ccg-developers-page" data-ccg-mode="c64" data-mode="c64" id="top">
    <div class="ccg-bg" aria-hidden="true">
        <div class="ccg-bg-starfield" aria-hidden="true"></div>
        <div class="ccg-bg-grid" aria-hidden="true"></div>
        <div class="ccg-bg-crt-overlay" aria-hidden="true"></div>
    </div>

    <div class="ccg-page ccg-page--developers">
        ${renderHeader()}

        <main class="ccg-main ccg-developers-main">
            <section class="ccg-developers-hero">
                <p class="ccg-developers-hero__kicker">Developer archive · C64 &amp; Amiga</p>
                <h1 class="ccg-developers-hero__title">Browse Games by Developer</h1>
                <p class="ccg-developers-hero__intro">
                    Explore the developer credits already recorded in the CCG game database. Every route below contains direct static links to the matching game pages and updates when new credited titles are added.
                </p>
                <div class="ccg-developers-hero__stats">
                    <span><strong>${groups.length}</strong> developer credits</span>
                    <span><strong>${groups.reduce((total, group) => total + group.count, 0)}</strong> game associations</span>
                    <span><strong>${groups.filter((group) => group.count >= INDEXABLE_MIN_GAMES).length}</strong> multi-game archives</span>
                </div>
            </section>

            <nav class="ccg-developer-breadcrumbs" aria-label="Breadcrumb">
                <a href="/games/">Games</a>
                <span aria-hidden="true">›</span>
                <span aria-current="page">Developers</span>
            </nav>

            <section class="ccg-developers-tools" aria-label="Developer filters">
                <label class="ccg-developers-search">
                    <span class="visually-hidden">Search developers</span>
                    <input id="developerSearchInput" type="search" placeholder="Search developers…" autocomplete="off">
                </label>
                <div class="ccg-developers-filter" role="group" aria-label="Filter developers by system">
                    <button type="button" class="ccg-btn ccg-btn--secondary is-active" data-developer-system="all" aria-pressed="true">All</button>
                    <button type="button" class="ccg-btn ccg-btn--secondary" data-developer-system="c64" aria-pressed="false">C64</button>
                    <button type="button" class="ccg-btn ccg-btn--secondary" data-developer-system="amiga" aria-pressed="false">Amiga</button>
                </div>
                <p class="ccg-developers-visible-count"><strong id="developerVisibleCount">${groups.length}</strong> developers shown</p>
            </section>

            <section class="ccg-developers-section" aria-labelledby="represented-developers-title">
                <div class="ccg-developers-section__heading">
                    <p class="ccg-developers-section__kicker">Largest credited groups</p>
                    <h2 id="represented-developers-title">Most Represented Developers</h2>
                </div>
                <div class="ccg-developer-grid ccg-developer-grid--featured">
                    ${represented.map((group) => renderDeveloperCard(group, "ccg-developer-card--featured")).join("\n")}
                </div>
            </section>

            <section class="ccg-developers-section" aria-labelledby="all-developers-title">
                <div class="ccg-developers-section__heading">
                    <p class="ccg-developers-section__kicker">Full recorded archive</p>
                    <h2 id="all-developers-title">All Developers</h2>
                    <p>Single-game archive pages remain available for navigation but are excluded from search indexing until another credited title is added.</p>
                </div>
                <div class="ccg-developer-grid" id="developerGrid">
                    ${groups.map((group) => renderDeveloperCard(group)).join("\n")}
                </div>
                <p class="ccg-developers-empty" id="developerEmptyState" hidden>No developers match that search.</p>
            </section>

            <section class="ccg-developers-wayfinding">
                <h2>Keep Exploring</h2>
                <div class="ccg-developers-wayfinding__links">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/">All Games</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/publishers/">Publishers</a>
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

function renderGameCard(game) {
    const thumb = getThumbnailUrl(game.thumbnail);
    const year = game.year ? String(game.year) : "Year unknown";
    const system = game.system || "Retro";

    return `<a class="ccg-developer-game-card"
          href="/games/${htmlEscape(game.slug)}/"
          data-developer-game
          data-game-title="${htmlEscape(game.title.toLowerCase())}"
          data-system="${htmlEscape(system.toLowerCase())}">
        <span class="ccg-developer-game-card__image">
            <img src="${htmlEscape(thumb)}" alt="${htmlEscape(game.title)} cover art" loading="lazy" decoding="async" width="320" height="180">
        </span>
        <span class="ccg-developer-game-card__body">
            <span class="ccg-developer-game-card__title">${htmlEscape(game.title)}</span>
            <span class="ccg-developer-game-card__meta">${htmlEscape(system)} · ${htmlEscape(year)}</span>
        </span>
    </a>`;
}

function renderDeveloperPage(group) {
    const canonicalUrl = `${SITE_ORIGIN}/games/developers/${group.slug}/`;
    const systemLabel = platformLabel(group);
    const title = `${group.name} ${systemLabel} Games | Cheeky Commodore Gamer`;
    const description = `Browse ${group.count} ${systemLabel} ${group.count === 1 ? "game" : "games"} carrying a ${group.name} developer credit in the Cheeky Commodore Gamer archive.`;
    const indexable = group.count >= INDEXABLE_MIN_GAMES;
    const robots = indexable ? "index,follow" : "noindex,follow";

    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                name: `${group.name} developer-credit games`,
                description,
                url: canonicalUrl,
                about: { "@type": "Thing", name: group.name },
                isPartOf: { "@type": "WebSite", name: "Cheeky Commodore Gamer", url: SITE_ORIGIN }
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
                    { "@type": "ListItem", position: 2, name: "Games", item: `${SITE_ORIGIN}/games/` },
                    { "@type": "ListItem", position: 3, name: "Developers", item: `${SITE_ORIGIN}/games/developers/` },
                    { "@type": "ListItem", position: 4, name: group.name, item: canonicalUrl }
                ]
            },
            {
                "@type": "ItemList",
                name: `${group.name} developer-credit games in the CCG archive`,
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
<html lang="en" data-ccg-page="developer-single">
${renderHead({ title, description, canonicalUrl, robots, schema })}
<body class="ccg-body ccg-developers-page ccg-developer-single" data-ccg-mode="c64" data-mode="c64" data-developer="${htmlEscape(group.slug)}" id="top">
    <div class="ccg-bg" aria-hidden="true">
        <div class="ccg-bg-starfield" aria-hidden="true"></div>
        <div class="ccg-bg-grid" aria-hidden="true"></div>
        <div class="ccg-bg-crt-overlay" aria-hidden="true"></div>
    </div>

    <div class="ccg-page ccg-page--developers">
        ${renderHeader()}

        <main class="ccg-main ccg-developers-main">
            <section class="ccg-developers-hero ccg-developer-hero">
                <p class="ccg-developers-hero__kicker">Developer credit archive · ${htmlEscape(systemLabel)}</p>
                <h1 class="ccg-developers-hero__title">${htmlEscape(group.name)} Games</h1>
                <p class="ccg-developers-hero__intro">
                    Browse every title currently carrying a ${htmlEscape(group.name)} developer credit in the CCG database. This page reports the stored credit without adding biographies or unsupported company history.
                </p>
                <div class="ccg-developers-hero__stats">
                    <span><strong>${group.count}</strong> ${group.count === 1 ? "game" : "games"}</span>
                    ${group.c64Count ? `<span><strong>${group.c64Count}</strong> C64</span>` : ""}
                    ${group.amigaCount ? `<span><strong>${group.amigaCount}</strong> Amiga</span>` : ""}
                    ${yearSummary(group) ? `<span><strong>${htmlEscape(yearSummary(group))}</strong> years covered</span>` : ""}
                </div>
            </section>

            <nav class="ccg-developer-breadcrumbs" aria-label="Breadcrumb">
                <a href="/games/">Games</a>
                <span aria-hidden="true">›</span>
                <a href="/games/developers/">Developers</a>
                <span aria-hidden="true">›</span>
                <span aria-current="page">${htmlEscape(group.name)}</span>
            </nav>

            <section class="ccg-developers-tools" aria-label="Game filters">
                <label class="ccg-developers-search">
                    <span class="visually-hidden">Search ${htmlEscape(group.name)} games</span>
                    <input id="developerGameSearchInput" type="search" placeholder="Search ${htmlEscape(group.name)} games…" autocomplete="off">
                </label>
                <div class="ccg-developers-filter" role="group" aria-label="Filter games by system">
                    <button type="button" class="ccg-btn ccg-btn--secondary is-active" data-developer-game-system="all" aria-pressed="true">All</button>
                    ${group.c64Count ? `<button type="button" class="ccg-btn ccg-btn--secondary" data-developer-game-system="c64" aria-pressed="false">C64</button>` : ""}
                    ${group.amigaCount ? `<button type="button" class="ccg-btn ccg-btn--secondary" data-developer-game-system="amiga" aria-pressed="false">Amiga</button>` : ""}
                </div>
                <p class="ccg-developers-visible-count"><strong id="developerGameVisibleCount">${group.count}</strong> games shown</p>
            </section>

            <section class="ccg-developers-section" aria-labelledby="developer-games-title">
                <div class="ccg-developers-section__heading">
                    <p class="ccg-developers-section__kicker">Recorded game archive</p>
                    <h2 id="developer-games-title">${htmlEscape(group.name)} on CCG</h2>
                    <p>${htmlEscape(platformSummary(group))}${yearSummary(group) ? ` · ${htmlEscape(yearSummary(group))}` : ""}</p>
                </div>

                <div class="ccg-developer-game-grid" id="developerGameGrid">
                    ${group.games.map(renderGameCard).join("\n")}
                </div>
                <p class="ccg-developers-empty" id="developerGameEmptyState" hidden>No games match that search.</p>
            </section>

            <section class="ccg-developers-wayfinding">
                <h2>Browse More</h2>
                <div class="ccg-developers-wayfinding__links">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/developers/">All Developers</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/publishers/">Publishers</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/">All Games</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/genres/">Genres</a>
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
    if (!html.includes(expectedName)) problems.push("missing developer name");
    expectedGameSlugs.forEach((slug) => {
        if (!html.includes(`href="/games/${slug}/"`)) problems.push(`missing crawlable game link: ${slug}`);
    });
    return problems;
}

function cleanStaleDeveloperDirectories(groups) {
    fs.mkdirSync(developersDir, { recursive: true });
    const active = new Set(groups.map((group) => group.slug));

    fs.readdirSync(developersDir, { withFileTypes: true }).forEach((entry) => {
        if (!entry.isDirectory()) return;
        if (active.has(entry.name)) return;
        fs.rmSync(path.join(developersDir, entry.name), { recursive: true, force: true });
        console.log(`[developers] Removed stale developer directory: ${entry.name}`);
    });
}

function updateStaticPages(groups) {
    const current = readJson(staticPagesPath, []);
    const currentList = Array.isArray(current) ? current : [];
    const preserved = currentList.filter((entry) => (
        typeof entry === "string" &&
        !entry.replace(/^\/+/, "").startsWith("games/developers/")
    ));
    const generated = [
        "games/developers/index.html",
        ...groups
            .filter((group) => group.count >= INDEXABLE_MIN_GAMES)
            .map((group) => `games/developers/${group.slug}/index.html`)
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

function buildMetadata(groups) {
    return groups.map((group) => ({
        name: group.name,
        slug: group.slug,
        count: group.count,
        c64Count: group.c64Count,
        amigaCount: group.amigaCount,
        firstYear: group.firstYear,
        lastYear: group.lastYear,
        indexable: group.count >= INDEXABLE_MIN_GAMES,
        url: `/games/developers/${group.slug}/`
    }));
}

function buildReport(games, groups) {
    const indexable = groups.filter((group) => group.count >= INDEXABLE_MIN_GAMES);
    const thin = groups.filter((group) => group.count < INDEXABLE_MIN_GAMES);
    const mostRepresented = [...groups]
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "en", { sensitivity: "base" }))
        .slice(0, 15);
    const aliases = Array.from(DEVELOPER_ALIASES.entries())
        .filter(([key, value]) => key !== value.toLowerCase())
        .map(([key, value]) => `- \`${key}\` → **${value}**`)
        .join("\n");

    return `# Phase 3B Developer Archive Foundation

## Results

| Check | Count |
|---|---:|
| Game records scanned | **${games.length}** |
| Static developer routes | **${groups.length}** |
| Indexable multi-game routes | **${indexable.length}** |
| Single-game noindex routes | **${thin.length}** |
| Developer hub pages | **1** |

## Indexing policy

- The developer hub and pages with at least ${INDEXABLE_MIN_GAMES} credited games use \`index,follow\`.
- Single-game developer pages use \`noindex,follow\` until another credited game is present.
- Every route remains linked from the static developer hub.

## Route-layer normalization

${aliases || "- No aliases were applied."}

The source records in \`games/games.json\` remain unchanged.

## Most represented developer credits

${mostRepresented.map((group) => `- ${group.name}: **${group.count}** ${group.count === 1 ? "game" : "games"}`).join("\n")}

## Generated features

- Crawlable developer hub with search and C64/Amiga filters.
- Static developer pages containing direct game links.
- CollectionPage, BreadcrumbList and ItemList structured data.
- Canonical, Open Graph and Twitter metadata.
- Sitemap inclusion for the hub and multi-game routes.
- A static discovery link from the main Browse Games page.

## Explicit exclusions

- No changes to \`games/games.json\`.
- No biographies, company histories or unsupported relationships were added.
- No homepage or intro-loader changes.
- No single-game developer page was placed in the sitemap.

## Rollback

Revert the Phase 3B squash merge commit. The generated archive can then be removed by reverting the generator, workflow and generated outputs together.
`;
}

function main() {
    if (!fs.existsSync(gamesJsonPath)) fail(`Missing games source: ${path.relative(repoRoot, gamesJsonPath)}`);
    const games = readJson(gamesJsonPath, []);
    if (!Array.isArray(games) || !games.length) fail("games/games.json must contain a non-empty top-level array.");

    const groups = buildDeveloperGroups(games);
    if (!groups.length) fail("No developer credits were found in games/games.json.");

    const duplicateSlugs = groups
        .map((group) => group.slug)
        .filter((slug, index, all) => all.indexOf(slug) !== index);
    if (duplicateSlugs.length) fail(`Duplicate developer slugs: ${[...new Set(duplicateSlugs)].join(", ")}`);

    fs.mkdirSync(developersDir, { recursive: true });
    let writes = 0;

    const indexHtml = canonicalizeDeveloperHtml(renderDeveloperIndex(groups), "developer index");
    const indexCanonical = `${SITE_ORIGIN}/games/developers/`;
    const indexProblems = validateGeneratedPage(indexHtml, indexCanonical, "Browse Games by Developer");
    if (indexProblems.length) fail(`Developer index validation failed: ${indexProblems.join("; ")}`);
    if (writeFileIfChanged(path.join(developersDir, "index.html"), indexHtml)) writes += 1;

    for (const group of groups) {
        const html = canonicalizeDeveloperHtml(renderDeveloperPage(group), `developer ${group.slug}`);
        const canonical = `${SITE_ORIGIN}/games/developers/${group.slug}/`;
        const problems = validateGeneratedPage(html, canonical, group.name, group.games.map((game) => game.slug));
        if (problems.length) fail(`${group.name} validation failed: ${problems.join("; ")}`);
        if (writeFileIfChanged(path.join(developersDir, group.slug, "index.html"), html)) writes += 1;
    }

    cleanStaleDeveloperDirectories(groups);
    if (writeFileIfChanged(metadataPath, `${JSON.stringify(buildMetadata(groups), null, 2)}\n`)) writes += 1;
    if (updateStaticPages(groups)) writes += 1;
    if (writeFileIfChanged(reportPath, buildReport(games, groups))) writes += 1;

    const indexableCount = groups.filter((group) => group.count >= INDEXABLE_MIN_GAMES).length;
    console.log(`[developers] Games scanned: ${games.length}`);
    console.log(`[developers] Developer routes generated: ${groups.length}`);
    console.log(`[developers] Indexable developer pages: ${indexableCount}`);
    console.log(`[developers] Single-game noindex pages: ${groups.length - indexableCount}`);
    console.log(`[developers] Files changed: ${writes}`);
    console.log("[developers] Static pages config synchronized for sitemap generation.");
}

if (require.main === module) main();

module.exports = {
    INDEXABLE_MIN_GAMES,
    buildMetadata,
    renderDeveloperIndex,
    renderDeveloperPage,
    updateStaticPages
};
