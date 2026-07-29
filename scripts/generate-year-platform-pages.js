#!/usr/bin/env node

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");

const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const INDEXABLE_MIN_GAMES = 2;
const gamesJsonPath = path.join(repoRoot, "games", "games.json");
const yearsDir = path.join(repoRoot, "games", "years");
const platformsDir = path.join(repoRoot, "games", "platforms");
const metadataPath = path.join(repoRoot, "games", "archive-navigation.json");
const cssPath = path.join(repoRoot, "resources", "css", "year-platform-archives.css");
const jsPath = path.join(repoRoot, "js", "year-platform-archives.js");
const reportPath = path.join(repoRoot, "docs", "seo-baseline", "phase-4b-year-platform-archives.md");

const protectedFiles = [
    "index.html",
    "home.html",
    "resources/css/intro.css",
    "js/index-intro.js",
    "games/games.json"
];

function fail(message) {
    console.error(`[year-platform] ${message}`);
    process.exit(1);
}

function readJson(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
    }
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

function hashFile(relativePath) {
    const filePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(filePath)) return null;
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function captureProtectedHashes() {
    return new Map(protectedFiles.map((relativePath) => [relativePath, hashFile(relativePath)]));
}

function verifyProtectedHashes(before) {
    for (const [relativePath, expected] of before.entries()) {
        const actual = hashFile(relativePath);
        if (actual !== expected) fail(`Protected file changed: ${relativePath}`);
    }
}

function normalizePlatform(rawValue) {
    const raw = String(rawValue || "").trim().toLowerCase();
    if (raw === "c64" || raw === "commodore 64") return "c64";
    if (raw === "amiga" || raw === "commodore amiga") return "amiga";
    return "";
}

function platformLabel(key) {
    return key === "c64" ? "Commodore 64" : "Amiga";
}

function getThumbnailUrl(rawValue) {
    const raw = String(rawValue || "").trim();
    if (!raw) return "/resources/images/og/c64_neon.png";
    if (/^https?:\/\//i.test(raw)) return raw;
    return `/${raw.replace(/^\/+/, "")}`;
}

function gameSort(a, b) {
    const aTitle = String(a.sorttitle || a.title || "");
    const bTitle = String(b.sorttitle || b.title || "");
    return aTitle.localeCompare(bTitle, "en", { sensitivity: "base", numeric: true });
}

function buildArchiveData(games) {
    const years = new Map();
    const platforms = new Map([
        ["c64", { key: "c64", name: "Commodore 64", games: [] }],
        ["amiga", { key: "amiga", name: "Amiga", games: [] }]
    ]);

    const normalizedGames = games.map((game, index) => {
        const year = Number(game.year);
        const platform = normalizePlatform(game.system);
        const slug = String(game.slug || "").trim();
        const title = String(game.title || "").trim();

        if (!Number.isInteger(year)) fail(`Record ${index + 1} has no usable release year.`);
        if (!platforms.has(platform)) fail(`Record ${index + 1} has unsupported platform: ${game.system}`);
        if (!slug) fail(`Record ${index + 1} has no slug.`);
        if (!title) fail(`Record ${index + 1} has no title.`);

        return {
            slug,
            title,
            sorttitle: String(game.sorttitle || title),
            year,
            platform,
            system: platformLabel(platform),
            thumbnail: getThumbnailUrl(game.thumbnail)
        };
    });

    normalizedGames.sort(gameSort);

    normalizedGames.forEach((game) => {
        if (!years.has(game.year)) {
            years.set(game.year, {
                year: game.year,
                games: [],
                c64Count: 0,
                amigaCount: 0
            });
        }
        const yearGroup = years.get(game.year);
        yearGroup.games.push(game);
        yearGroup[`${game.platform}Count`] += 1;
        platforms.get(game.platform).games.push(game);
    });

    const yearGroups = [...years.values()]
        .sort((a, b) => a.year - b.year)
        .map((group) => ({
            ...group,
            count: group.games.length,
            indexable: group.games.length >= INDEXABLE_MIN_GAMES,
            url: `/games/years/${group.year}/`
        }));

    const platformGroups = [...platforms.values()].map((group) => {
        const representedYears = [...new Set(group.games.map((game) => game.year))].sort((a, b) => a - b);
        return {
            ...group,
            count: group.games.length,
            years: representedYears,
            firstYear: representedYears[0],
            lastYear: representedYears[representedYears.length - 1],
            url: `/games/platforms/${group.key}/`
        };
    });

    return { games: normalizedGames, years: yearGroups, platforms: platformGroups };
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
    <link rel="stylesheet" href="/resources/css/year-platform-archives.css">

    <script src="/js/analytics.js"></script>
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
<script src="/js/year-platform-archives.js" defer></script>
<script data-goatcounter="https://cheekycommodoregamer.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>`;
}

function pageShell({ pageType, title, description, canonicalUrl, robots, schema, body }) {
    return `<!DOCTYPE html>
<html lang="en" data-ccg-page="${htmlEscape(pageType)}">
${renderHead({ title, description, canonicalUrl, robots, schema })}
<body class="ccg-body ccg-archives-page" data-ccg-mode="c64" data-mode="c64" id="top">
    <div class="ccg-bg" aria-hidden="true">
        <div class="ccg-bg-starfield" aria-hidden="true"></div>
        <div class="ccg-bg-grid" aria-hidden="true"></div>
        <div class="ccg-bg-crt-overlay" aria-hidden="true"></div>
    </div>

    <div class="ccg-page ccg-page--archives">
        ${renderHeader()}
        <main class="ccg-main ccg-archives-main">
${body}
        </main>
        ${renderFooter()}
    </div>

    ${renderScripts()}
</body>
</html>
`;
}

function collectionSchema({ name, description, canonicalUrl, breadcrumbs, items }) {
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                name,
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
                itemListElement: breadcrumbs.map((item, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    name: item.name,
                    item: item.url
                }))
            },
            {
                "@type": "ItemList",
                name,
                numberOfItems: items.length,
                itemListElement: items.map((item, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    name: item.name,
                    url: item.url
                }))
            }
        ]
    };
}

function renderBreadcrumbs(items) {
    return `<nav class="ccg-archive-breadcrumbs" aria-label="Breadcrumb">
        ${items.map((item, index) => {
            const divider = index ? '<span aria-hidden="true">›</span>\n        ' : "";
            const current = index === items.length - 1;
            return `${divider}${current
                ? `<span aria-current="page">${htmlEscape(item.name)}</span>`
                : `<a href="${htmlEscape(item.url)}">${htmlEscape(item.name)}</a>`}`;
        }).join("\n        ")}
    </nav>`;
}

function renderHero({ kicker, heading, intro, stats }) {
    return `            <section class="ccg-archives-hero">
                <p class="ccg-archives-hero__kicker">${htmlEscape(kicker)}</p>
                <h1 class="ccg-archives-hero__title">${htmlEscape(heading)}</h1>
                <p class="ccg-archives-hero__intro">${htmlEscape(intro)}</p>
                <div class="ccg-archives-hero__stats">
                    ${stats.map((stat) => `<span><strong>${htmlEscape(stat.value)}</strong> ${htmlEscape(stat.label)}</span>`).join("\n                    ")}
                </div>
            </section>`;
}

function renderArchiveCard({ href, title, count, meta, key = "" }) {
    return `<a class="ccg-archive-card" href="${htmlEscape(href)}"${key ? ` data-archive-key="${htmlEscape(key)}"` : ""}>
        <span class="ccg-archive-card__title">${htmlEscape(title)}</span>
        <span class="ccg-archive-card__count">${count} ${count === 1 ? "game" : "games"}</span>
        <span class="ccg-archive-card__meta">${htmlEscape(meta)}</span>
    </a>`;
}

function renderGameCard(game) {
    return `<a class="ccg-archive-game-card"
       href="/games/${htmlEscape(game.slug)}/"
       data-archive-game
       data-game-title="${htmlEscape(game.title.toLowerCase())}"
       data-game-system="${htmlEscape(game.platform)}"
       data-game-year="${game.year}">
        <span class="ccg-archive-game-card__image">
            <img src="${htmlEscape(game.thumbnail)}" alt="${htmlEscape(game.title)} cover art" loading="lazy" decoding="async" width="320" height="180">
        </span>
        <span class="ccg-archive-game-card__body">
            <span class="ccg-archive-game-card__title">${htmlEscape(game.title)}</span>
            <span class="ccg-archive-game-card__meta">${htmlEscape(game.system)} · ${game.year}</span>
        </span>
    </a>`;
}

function renderTools({ count, systems = [], years = [] }) {
    return `            <section class="ccg-archives-tools" aria-label="Game filters">
                <label class="ccg-archives-search">
                    <span class="visually-hidden">Search games</span>
                    <input type="search" placeholder="Search games…" autocomplete="off" data-archive-search>
                </label>
                ${systems.length > 1 ? `<div class="ccg-archives-filter" role="group" aria-label="Filter games by platform">
                    <button type="button" class="ccg-btn ccg-btn--secondary is-active" data-archive-system="all" aria-pressed="true">All</button>
                    ${systems.map((system) => `<button type="button" class="ccg-btn ccg-btn--secondary" data-archive-system="${htmlEscape(system.key)}" aria-pressed="false">${htmlEscape(system.label)}</button>`).join("\n                    ")}
                </div>` : ""}
                ${years.length > 1 ? `<label class="ccg-archives-year-filter">
                    <span class="visually-hidden">Filter games by year</span>
                    <select data-archive-year>
                        <option value="all">All years</option>
                        ${years.map((year) => `<option value="${year}">${year}</option>`).join("\n                        ")}
                    </select>
                </label>` : ""}
                <p class="ccg-archives-visible-count"><strong data-archive-visible-count>${count}</strong> games shown</p>
            </section>`;
}

function renderYearsIndex(data) {
    const canonicalUrl = `${SITE_ORIGIN}/games/years/`;
    const title = "C64 & Amiga Games by Year | Cheeky Commodore Gamer";
    const description = "Browse the Cheeky Commodore Gamer archive by release year, with static routes covering every recorded C64 and Amiga year.";
    const breadcrumbs = [
        { name: "Home", url: `${SITE_ORIGIN}/` },
        { name: "Games", url: `${SITE_ORIGIN}/games/` },
        { name: "Years", url: canonicalUrl }
    ];
    const schema = collectionSchema({
        name: "C64 & Amiga Games by Year",
        description,
        canonicalUrl,
        breadcrumbs,
        items: data.years.map((group) => ({ name: String(group.year), url: `${SITE_ORIGIN}${group.url}` }))
    });

    const body = `${renderHero({
        kicker: "Release-year archive · C64 & Amiga",
        heading: "Browse Games by Year",
        intro: "Explore every release year currently represented in the CCG game database. Each route contains direct links to the matching game pages and remains useful without JavaScript.",
        stats: [
            { value: data.years.length, label: "release years" },
            { value: data.games.length, label: "games" },
            { value: `${data.years[0].year}–${data.years[data.years.length - 1].year}`, label: "recorded range" }
        ]
    })}

            ${renderBreadcrumbs([
                { name: "Games", url: "/games/" },
                { name: "Years", url: "/games/years/" }
            ])}

            <section class="ccg-archives-section" aria-labelledby="all-years-title">
                <div class="ccg-archives-section__heading">
                    <p class="ccg-archives-section__kicker">Full recorded archive</p>
                    <h2 id="all-years-title">All Release Years</h2>
                    <p>The single-game 2023 route remains available for navigation but uses noindex until another title is added for that year.</p>
                </div>
                <div class="ccg-archive-grid">
                    ${data.years.map((group) => renderArchiveCard({
                        href: group.url,
                        title: String(group.year),
                        count: group.count,
                        meta: `${group.c64Count} C64 · ${group.amigaCount} Amiga`,
                        key: String(group.year)
                    })).join("\n                    ")}
                </div>
            </section>

            <section class="ccg-archives-wayfinding">
                <h2>Browse Another Way</h2>
                <div class="ccg-archives-wayfinding__links">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/platforms/">Platforms</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/genres/">Genres</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/publishers/">Publishers</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/">All Games</a>
                </div>
            </section>`;

    return pageShell({ pageType: "years-index", title, description, canonicalUrl, schema, body });
}

function renderPlatformsIndex(data) {
    const canonicalUrl = `${SITE_ORIGIN}/games/platforms/`;
    const title = "C64 & Amiga Games by Platform | Cheeky Commodore Gamer";
    const description = "Browse the Cheeky Commodore Gamer game archive through dedicated Commodore 64 and Amiga platform routes.";
    const breadcrumbs = [
        { name: "Home", url: `${SITE_ORIGIN}/` },
        { name: "Games", url: `${SITE_ORIGIN}/games/` },
        { name: "Platforms", url: canonicalUrl }
    ];
    const schema = collectionSchema({
        name: "C64 & Amiga Games by Platform",
        description,
        canonicalUrl,
        breadcrumbs,
        items: data.platforms.map((group) => ({ name: group.name, url: `${SITE_ORIGIN}${group.url}` }))
    });

    const body = `${renderHero({
        kicker: "Platform archive · Commodore",
        heading: "Browse Games by Platform",
        intro: "Choose the Commodore 64 or Amiga archive to view every matching title currently recorded in the CCG game database.",
        stats: [
            { value: data.platforms.length, label: "platform archives" },
            { value: data.games.length, label: "games" },
            { value: data.years.length, label: "release years" }
        ]
    })}

            ${renderBreadcrumbs([
                { name: "Games", url: "/games/" },
                { name: "Platforms", url: "/games/platforms/" }
            ])}

            <section class="ccg-archives-section" aria-labelledby="platform-routes-title">
                <div class="ccg-archives-section__heading">
                    <p class="ccg-archives-section__kicker">Dedicated system routes</p>
                    <h2 id="platform-routes-title">Choose a Platform</h2>
                </div>
                <div class="ccg-archive-grid ccg-archive-grid--platforms">
                    ${data.platforms.map((group) => renderArchiveCard({
                        href: group.url,
                        title: group.name,
                        count: group.count,
                        meta: `${group.firstYear}–${group.lastYear} · ${group.years.length} years`,
                        key: group.key
                    })).join("\n                    ")}
                </div>
            </section>

            <section class="ccg-archives-wayfinding">
                <h2>Browse Another Way</h2>
                <div class="ccg-archives-wayfinding__links">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/years/">Release Years</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/genres/">Genres</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/developers/">Developers</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/">All Games</a>
                </div>
            </section>`;

    return pageShell({ pageType: "platforms-index", title, description, canonicalUrl, schema, body });
}

function renderYearPage(group) {
    const canonicalUrl = `${SITE_ORIGIN}${group.url}`;
    const title = `${group.year} C64 & Amiga Games | Cheeky Commodore Gamer`;
    const description = `Browse ${group.count} Commodore 64 and Amiga ${group.count === 1 ? "game" : "games"} released in ${group.year} in the Cheeky Commodore Gamer archive.`;
    const robots = group.indexable ? "index,follow" : "noindex,follow";
    const breadcrumbs = [
        { name: "Home", url: `${SITE_ORIGIN}/` },
        { name: "Games", url: `${SITE_ORIGIN}/games/` },
        { name: "Years", url: `${SITE_ORIGIN}/games/years/` },
        { name: String(group.year), url: canonicalUrl }
    ];
    const schema = collectionSchema({
        name: `${group.year} C64 & Amiga Games`,
        description,
        canonicalUrl,
        breadcrumbs,
        items: group.games.map((game) => ({ name: game.title, url: `${SITE_ORIGIN}/games/${game.slug}/` }))
    });
    const systems = [
        ...(group.c64Count ? [{ key: "c64", label: "C64" }] : []),
        ...(group.amigaCount ? [{ key: "amiga", label: "Amiga" }] : [])
    ];

    const body = `${renderHero({
        kicker: `Release-year archive · ${group.year}`,
        heading: `${group.year} Games`,
        intro: `Browse every Commodore 64 and Amiga title currently recorded for ${group.year}. The links below are rendered directly into the page for dependable navigation and search discovery.`,
        stats: [
            { value: group.count, label: group.count === 1 ? "game" : "games" },
            { value: group.c64Count, label: "C64" },
            { value: group.amigaCount, label: "Amiga" }
        ]
    })}

            ${renderBreadcrumbs([
                { name: "Games", url: "/games/" },
                { name: "Years", url: "/games/years/" },
                { name: String(group.year), url: group.url }
            ])}

${renderTools({ count: group.count, systems })}

            <section class="ccg-archives-section" aria-labelledby="archive-games-title">
                <div class="ccg-archives-section__heading">
                    <p class="ccg-archives-section__kicker">Recorded game archive</p>
                    <h2 id="archive-games-title">Games Released in ${group.year}</h2>
                </div>
                <div class="ccg-archive-game-grid" data-archive-game-grid>
                    ${group.games.map(renderGameCard).join("\n                    ")}
                </div>
                <p class="ccg-archives-empty" data-archive-empty hidden>No games match those filters.</p>
            </section>

            <section class="ccg-archives-wayfinding">
                <h2>Keep Exploring</h2>
                <div class="ccg-archives-wayfinding__links">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/years/">All Years</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/platforms/">Platforms</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/genres/">Genres</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/">All Games</a>
                </div>
            </section>`;

    return pageShell({ pageType: "year-single", title, description, canonicalUrl, robots, schema, body });
}

function renderPlatformPage(group) {
    const canonicalUrl = `${SITE_ORIGIN}${group.url}`;
    const title = `${group.name} Games Archive | Cheeky Commodore Gamer`;
    const description = `Browse all ${group.count} ${group.name} games currently recorded in the Cheeky Commodore Gamer archive.`;
    const breadcrumbs = [
        { name: "Home", url: `${SITE_ORIGIN}/` },
        { name: "Games", url: `${SITE_ORIGIN}/games/` },
        { name: "Platforms", url: `${SITE_ORIGIN}/games/platforms/` },
        { name: group.name, url: canonicalUrl }
    ];
    const schema = collectionSchema({
        name: `${group.name} Games Archive`,
        description,
        canonicalUrl,
        breadcrumbs,
        items: group.games.map((game) => ({ name: game.title, url: `${SITE_ORIGIN}/games/${game.slug}/` }))
    });

    const body = `${renderHero({
        kicker: `Platform archive · ${group.name}`,
        heading: `${group.name} Games`,
        intro: `Browse every ${group.name} title currently recorded in the CCG game database, covering releases from ${group.firstYear} to ${group.lastYear}.`,
        stats: [
            { value: group.count, label: "games" },
            { value: group.years.length, label: "release years" },
            { value: `${group.firstYear}–${group.lastYear}`, label: "recorded range" }
        ]
    })}

            ${renderBreadcrumbs([
                { name: "Games", url: "/games/" },
                { name: "Platforms", url: "/games/platforms/" },
                { name: group.name, url: group.url }
            ])}

${renderTools({ count: group.count, years: group.years })}

            <section class="ccg-archives-section" aria-labelledby="archive-games-title">
                <div class="ccg-archives-section__heading">
                    <p class="ccg-archives-section__kicker">Recorded game archive</p>
                    <h2 id="archive-games-title">All ${htmlEscape(group.name)} Games</h2>
                </div>
                <div class="ccg-archive-game-grid" data-archive-game-grid>
                    ${group.games.map(renderGameCard).join("\n                    ")}
                </div>
                <p class="ccg-archives-empty" data-archive-empty hidden>No games match those filters.</p>
            </section>

            <section class="ccg-archives-wayfinding">
                <h2>Keep Exploring</h2>
                <div class="ccg-archives-wayfinding__links">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/platforms/">All Platforms</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/years/">Release Years</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/developers/">Developers</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/">All Games</a>
                </div>
            </section>`;

    return pageShell({ pageType: "platform-single", title, description, canonicalUrl, schema, body });
}

function validatePage(html, expectedCanonical, expectedName, expectedGameSlugs = []) {
    const problems = [];
    if (!html.includes("<title>")) problems.push("missing title");
    if (!html.includes('name="description"')) problems.push("missing meta description");
    if (!html.includes(`rel="canonical" href="${expectedCanonical}"`)) problems.push("canonical mismatch");
    if (!html.includes('type="application/ld+json"')) problems.push("missing JSON-LD");
    if (!html.includes(expectedName)) problems.push("missing expected heading or name");
    expectedGameSlugs.forEach((slug) => {
        if (!html.includes(`href="/games/${slug}/"`)) problems.push(`missing crawlable game link: ${slug}`);
    });
    return problems;
}

function cleanStaleDirectories(parentDir, activeNames) {
    fs.mkdirSync(parentDir, { recursive: true });
    const active = new Set(activeNames);
    fs.readdirSync(parentDir, { withFileTypes: true }).forEach((entry) => {
        if (!entry.isDirectory() || active.has(entry.name)) return;
        fs.rmSync(path.join(parentDir, entry.name), { recursive: true, force: true });
        console.log(`[year-platform] Removed stale archive directory: ${path.relative(repoRoot, path.join(parentDir, entry.name))}`);
    });
}

function buildMetadata(data) {
    return {
        gameCount: data.games.length,
        yearHub: "/games/years/",
        platformHub: "/games/platforms/",
        years: data.years.map((group) => ({
            year: group.year,
            count: group.count,
            c64Count: group.c64Count,
            amigaCount: group.amigaCount,
            indexable: group.indexable,
            url: group.url
        })),
        platforms: data.platforms.map((group) => ({
            key: group.key,
            name: group.name,
            count: group.count,
            firstYear: group.firstYear,
            lastYear: group.lastYear,
            yearCount: group.years.length,
            url: group.url
        }))
    };
}

function buildReport(data) {
    const indexableYears = data.years.filter((group) => group.indexable);
    const noindexYears = data.years.filter((group) => !group.indexable);
    const c64 = data.platforms.find((group) => group.key === "c64");
    const amiga = data.platforms.find((group) => group.key === "amiga");

    return `# Phase 4B Year and Platform Archive Foundations

## Results

| Check | Count |
|---|---:|
| Game records scanned | **${data.games.length}** |
| Year hub pages | **1** |
| Platform hub pages | **1** |
| Static year routes | **${data.years.length}** |
| Indexable year routes | **${indexableYears.length}** |
| Single-game noindex year routes | **${noindexYears.length}** |
| Static platform routes | **${data.platforms.length}** |
| C64 games | **${c64.count}** |
| Amiga games | **${amiga.count}** |

## Routes created

- \`/games/years/\`
- ${data.years.map((group) => `\`/games/years/${group.year}/\` — ${group.count} ${group.count === 1 ? "game" : "games"} — \`${group.indexable ? "index,follow" : "noindex,follow"}\``).join("\n- ")}
- \`/games/platforms/\`
- \`/games/platforms/c64/\` — ${c64.count} games
- \`/games/platforms/amiga/\` — ${amiga.count} games

## Generated features

- Static year and platform hubs.
- Direct static links from every archive route to matching game pages.
- Search and bounded platform/year filters as progressive enhancement.
- Canonical, Open Graph and Twitter metadata.
- CollectionPage, BreadcrumbList and ItemList structured data.
- Namespaced CSS with archive thumbnail isolation.
- Deterministic metadata at \`games/archive-navigation.json\`.

## Indexing policy

- Both hubs and both platform routes use \`index,follow\`.
- Year routes containing at least ${INDEXABLE_MIN_GAMES} games use \`index,follow\`.
- The 2023 route currently contains one game and uses \`noindex,follow\`.

## Explicit exclusions

- No changes to \`games/games.json\`.
- No sitemap or \`tools/seo/static-pages.json\` integration; that remains Phase 4C.
- No Browse Games discovery links; that remains Phase 4C.
- No previous/next year navigation or platform cross-link expansion; that remains Phase 4C.
- No homepage or intro-loader changes.

## Rollback

Revert the Phase 4B squash merge commit. The generated routes, assets, workflow and metadata can then be removed together.
`;
}

function buildCss() {
    return `/* ============================================================
   CCG YEAR AND PLATFORM ARCHIVES
   ------------------------------------------------------------
   Namespaced styles only. Archive thumbnails are isolated from
   Home, Genre, Collection, Developer and standard game cards.
============================================================ */

.ccg-archives-page { min-height: 100vh; }

.ccg-archives-main {
    width: min(1400px, calc(100% - 32px));
    margin: 0 auto;
    padding: 28px 0 64px;
}

.ccg-archives-hero {
    position: relative;
    overflow: hidden;
    padding: clamp(30px, 5vw, 64px);
    border: 1px solid rgba(255, 255, 255, 0.16);
    background:
        linear-gradient(135deg, rgba(12, 20, 42, 0.94), rgba(5, 8, 18, 0.9)),
        radial-gradient(circle at top right, rgba(255, 255, 255, 0.09), transparent 42%);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
}

.ccg-archives-hero::after {
    content: "";
    position: absolute;
    inset: auto -10% -54% 30%;
    height: 220px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    transform: rotate(-6deg);
    pointer-events: none;
}

.ccg-archives-hero__kicker,
.ccg-archives-section__kicker {
    margin: 0 0 10px;
    font-family: "Orbitron", sans-serif;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.76;
}

.ccg-archives-hero__title {
    max-width: 1000px;
    margin: 0;
    font-family: "Orbitron", sans-serif;
    font-size: clamp(2rem, 5vw, 4.2rem);
    line-height: 1.02;
}

.ccg-archives-hero__intro {
    max-width: 920px;
    margin: 18px 0 0;
    font-size: clamp(1rem, 1.8vw, 1.16rem);
    line-height: 1.7;
    opacity: 0.86;
}

.ccg-archives-hero__stats {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 26px;
}

.ccg-archives-hero__stats span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(0, 0, 0, 0.22);
    font-size: 0.92rem;
}

.ccg-archive-breadcrumbs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 18px 0 0;
    padding: 12px 0;
    font-size: 0.92rem;
}

.ccg-archive-breadcrumbs a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 3px;
}

.ccg-archives-tools {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) auto auto auto;
    align-items: center;
    gap: 14px;
    margin: 24px 0 32px;
    padding: 18px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(5, 8, 18, 0.7);
}

.ccg-archives-search input,
.ccg-archives-year-filter select {
    width: 100%;
    min-height: 46px;
    padding: 10px 14px;
    border: 1px solid rgba(255, 255, 255, 0.24);
    border-radius: 0;
    background: rgba(0, 0, 0, 0.32);
    color: inherit;
    font: inherit;
    outline: none;
}

.ccg-archives-search input:focus,
.ccg-archives-year-filter select:focus {
    border-color: currentColor;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
}

.ccg-archives-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.ccg-archives-filter .ccg-btn.is-active {
    outline: 2px solid currentColor;
    outline-offset: 2px;
}

.ccg-archives-visible-count {
    margin: 0;
    white-space: nowrap;
    opacity: 0.78;
}

.ccg-archives-section { margin: 42px 0; }
.ccg-archives-section__heading { margin-bottom: 18px; }

.ccg-archives-section__heading h2,
.ccg-archives-wayfinding h2 {
    margin: 0;
    font-family: "Orbitron", sans-serif;
    font-size: clamp(1.4rem, 3vw, 2.2rem);
}

.ccg-archives-section__heading > p:last-child {
    margin: 9px 0 0;
    max-width: 900px;
    line-height: 1.6;
    opacity: 0.7;
}

.ccg-archive-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
}

.ccg-archive-grid--platforms {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ccg-archive-card {
    display: flex;
    min-height: 154px;
    flex-direction: column;
    justify-content: flex-end;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background:
        linear-gradient(160deg, rgba(255, 255, 255, 0.06), transparent 55%),
        rgba(5, 8, 18, 0.78);
    color: inherit;
    text-decoration: none;
    transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
}

.ccg-archive-card:hover,
.ccg-archive-card:focus-visible {
    transform: translateY(-3px);
    border-color: currentColor;
    background:
        linear-gradient(160deg, rgba(255, 255, 255, 0.1), transparent 55%),
        rgba(5, 8, 18, 0.88);
}

.ccg-archive-card__title {
    font-family: "Orbitron", sans-serif;
    font-size: 1.18rem;
    font-weight: 700;
    line-height: 1.24;
}

.ccg-archive-card__count { margin-top: 10px; font-weight: 700; }
.ccg-archive-card__meta { margin-top: 6px; font-size: 0.84rem; line-height: 1.45; opacity: 0.68; }

.ccg-archive-game-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
}

.ccg-archive-game-card {
    display: flex;
    min-width: 0;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(5, 8, 18, 0.8);
    color: inherit;
    text-decoration: none;
    transition: transform 160ms ease, border-color 160ms ease;
}

.ccg-archive-game-card:hover,
.ccg-archive-game-card:focus-visible {
    transform: translateY(-3px);
    border-color: currentColor;
}

/* Critical thumbnail isolation: applies only to year/platform archive game cards. */
.ccg-archive-game-card__image {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.3);
}

.ccg-archive-game-card__image img {
    display: block;
    width: 100%;
    height: 100%;
    max-width: none;
    object-fit: cover;
}

.ccg-archive-game-card__body {
    display: flex;
    min-height: 94px;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
    padding: 16px;
}

.ccg-archive-game-card__title {
    font-family: "Orbitron", sans-serif;
    font-size: 0.96rem;
    font-weight: 700;
    line-height: 1.36;
}

.ccg-archive-game-card__meta { font-size: 0.84rem; opacity: 0.68; }
.ccg-archive-game-card[hidden] { display: none !important; }

.ccg-archives-empty {
    margin: 18px 0 0;
    padding: 18px;
    border: 1px dashed rgba(255, 255, 255, 0.22);
    text-align: center;
}

.ccg-archives-wayfinding {
    margin-top: 52px;
    padding: 26px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(5, 8, 18, 0.7);
}

.ccg-archives-wayfinding__links {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 18px;
}

@media (max-width: 1080px) {
    .ccg-archives-tools { grid-template-columns: 1fr 1fr; }
    .ccg-archive-grid,
    .ccg-archive-game-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 760px) {
    .ccg-archives-main { width: min(100% - 20px, 1400px); padding-top: 18px; }
    .ccg-archives-hero { padding: 28px 20px; }
    .ccg-archives-tools { grid-template-columns: 1fr; }
    .ccg-archives-visible-count { white-space: normal; }
    .ccg-archive-grid,
    .ccg-archive-grid--platforms,
    .ccg-archive-game-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 480px) {
    .ccg-archive-grid,
    .ccg-archive-grid--platforms,
    .ccg-archive-game-grid { grid-template-columns: 1fr; }
    .ccg-archive-game-card__body { min-height: 82px; }
}
`;
}

function buildClientScript() {
    return `(function () {
    "use strict";

    function initArchiveFilters() {
        var cards = Array.prototype.slice.call(document.querySelectorAll("[data-archive-game]"));
        if (!cards.length) return;

        var search = document.querySelector("[data-archive-search]");
        var yearSelect = document.querySelector("[data-archive-year]");
        var systemButtons = Array.prototype.slice.call(document.querySelectorAll("[data-archive-system]"));
        var count = document.querySelector("[data-archive-visible-count]");
        var empty = document.querySelector("[data-archive-empty]");
        var activeSystem = "all";

        function applyFilters() {
            var query = search ? search.value.trim().toLowerCase() : "";
            var activeYear = yearSelect ? yearSelect.value : "all";
            var visible = 0;

            cards.forEach(function (card) {
                var matchesSearch = !query || (card.getAttribute("data-game-title") || "").indexOf(query) !== -1;
                var matchesSystem = activeSystem === "all" || card.getAttribute("data-game-system") === activeSystem;
                var matchesYear = activeYear === "all" || card.getAttribute("data-game-year") === activeYear;
                var show = matchesSearch && matchesSystem && matchesYear;
                card.hidden = !show;
                if (show) visible += 1;
            });

            if (count) count.textContent = String(visible);
            if (empty) empty.hidden = visible !== 0;
        }

        if (search) search.addEventListener("input", applyFilters);
        if (yearSelect) yearSelect.addEventListener("change", applyFilters);

        systemButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                activeSystem = button.getAttribute("data-archive-system") || "all";
                systemButtons.forEach(function (candidate) {
                    var selected = candidate === button;
                    candidate.classList.toggle("is-active", selected);
                    candidate.setAttribute("aria-pressed", selected ? "true" : "false");
                });
                applyFilters();
            });
        });

        applyFilters();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initArchiveFilters);
    } else {
        initArchiveFilters();
    }
}());
`;
}

function main() {
    const protectedBefore = captureProtectedHashes();
    if (!fs.existsSync(gamesJsonPath)) fail("Missing games/games.json.");
    const sourceGames = readJson(gamesJsonPath, []);
    if (!Array.isArray(sourceGames) || !sourceGames.length) fail("games/games.json must contain a non-empty top-level array.");

    const data = buildArchiveData(sourceGames);
    const duplicateGameSlugs = data.games
        .map((game) => game.slug)
        .filter((slug, index, all) => all.indexOf(slug) !== index);
    if (duplicateGameSlugs.length) fail(`Duplicate game slugs: ${[...new Set(duplicateGameSlugs)].join(", ")}`);

    cleanStaleDirectories(yearsDir, data.years.map((group) => String(group.year)));
    cleanStaleDirectories(platformsDir, data.platforms.map((group) => group.key));

    let writes = 0;

    const yearsIndex = renderYearsIndex(data);
    let problems = validatePage(yearsIndex, `${SITE_ORIGIN}/games/years/`, "Browse Games by Year");
    if (problems.length) fail(`Year hub validation failed: ${problems.join("; ")}`);
    if (writeFileIfChanged(path.join(yearsDir, "index.html"), yearsIndex)) writes += 1;

    const platformsIndex = renderPlatformsIndex(data);
    problems = validatePage(platformsIndex, `${SITE_ORIGIN}/games/platforms/`, "Browse Games by Platform");
    if (problems.length) fail(`Platform hub validation failed: ${problems.join("; ")}`);
    if (writeFileIfChanged(path.join(platformsDir, "index.html"), platformsIndex)) writes += 1;

    data.years.forEach((group) => {
        const html = renderYearPage(group);
        const canonical = `${SITE_ORIGIN}${group.url}`;
        const pageProblems = validatePage(html, canonical, `${group.year} Games`, group.games.map((game) => game.slug));
        if (pageProblems.length) fail(`${group.year} validation failed: ${pageProblems.join("; ")}`);
        if (writeFileIfChanged(path.join(yearsDir, String(group.year), "index.html"), html)) writes += 1;
    });

    data.platforms.forEach((group) => {
        const html = renderPlatformPage(group);
        const canonical = `${SITE_ORIGIN}${group.url}`;
        const pageProblems = validatePage(html, canonical, `${group.name} Games`, group.games.map((game) => game.slug));
        if (pageProblems.length) fail(`${group.name} validation failed: ${pageProblems.join("; ")}`);
        if (writeFileIfChanged(path.join(platformsDir, group.key, "index.html"), html)) writes += 1;
    });

    if (writeFileIfChanged(metadataPath, `${JSON.stringify(buildMetadata(data), null, 2)}\n`)) writes += 1;
    if (writeFileIfChanged(cssPath, buildCss())) writes += 1;
    if (writeFileIfChanged(jsPath, buildClientScript())) writes += 1;
    if (writeFileIfChanged(reportPath, buildReport(data))) writes += 1;

    verifyProtectedHashes(protectedBefore);

    console.log(`[year-platform] Games scanned: ${data.games.length}`);
    console.log(`[year-platform] Year routes generated: ${data.years.length}`);
    console.log(`[year-platform] Platform routes generated: ${data.platforms.length}`);
    console.log(`[year-platform] Indexable year routes: ${data.years.filter((group) => group.indexable).length}`);
    console.log(`[year-platform] Noindex year routes: ${data.years.filter((group) => !group.indexable).length}`);
    console.log(`[year-platform] Files changed: ${writes}`);
    console.log("[year-platform] Sitemap, static-page registry and Browse Games integration remain deferred to Phase 4C.");
}

if (require.main === module) main();

module.exports = {
    INDEXABLE_MIN_GAMES,
    buildArchiveData,
    buildMetadata,
    renderPlatformsIndex,
    renderPlatformPage,
    renderYearsIndex,
    renderYearPage
};
