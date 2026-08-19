#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
    COMPOSER_ALIASES,
    buildComposerGroups,
    compareComposerNames,
    getComposerSortLetter,
    normalizeComposerKey,
    slugifyComposer
} = require("./composer-utils");
const { renderPublicHeader, renderPublicHeaderStyleLinks } = require("./shared-public-header");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");

const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const INDEXABLE_MIN_GAMES = 2;
const gamesJsonPath = path.join(repoRoot, "games", "games.json");
const musicDir = path.join(repoRoot, "music");
const composersDir = path.join(musicDir, "composers");
const metadataPath = path.join(composersDir, "composers.json");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");
const reportPath = path.join(repoRoot, "docs", "seo-baseline", "phase-3c-composer-archives.md");
const hubPaths = [
    path.join(musicDir, "index.html"),
    path.join(composersDir, "index.html")
];
const FEATURED_NAMES = [
    "Allister Brimble",
    "Barry Leitch",
    "Ben Daglish",
    "Chris Hülsbeck",
    "David Whittaker",
    "Fred Gray",
    "Martin Galway",
    "Rob Hubbard"
];

function fail(message) {
    console.error(`[composers] ${message}`);
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

function extractAttribute(html, attribute) {
    const match = html.match(new RegExp(`${attribute}\\s*=\\s*(["'])(.*?)\\1`, "i"));
    return match ? match[2].trim() : "";
}

function extractMetaRobots(html) {
    const tag = html.match(/<meta\b[^>]*name\s*=\s*(["'])robots\1[^>]*>/i);
    if (!tag) return "";
    return extractAttribute(tag[0], "content");
}

function findExistingComposerPages() {
    const records = [];
    if (!fs.existsSync(musicDir)) return records;

    for (const entry of fs.readdirSync(musicDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name === "composers") continue;
        const filePath = path.join(musicDir, entry.name, "index.html");
        if (!fs.existsSync(filePath)) continue;
        const html = fs.readFileSync(filePath, "utf8");
        if (/data-generated-composer\s*=\s*(["'])true\1/i.test(html)) continue;
        if (!/data-ccg-page\s*=\s*(["'])music-composer\1/i.test(html)) continue;

        const name = extractAttribute(html, "data-composer-name");
        const attrSlug = extractAttribute(html, "data-composer-slug");
        const slug = attrSlug || entry.name;
        if (!name || !slug) {
            fail(`Existing composer page is missing composer identity: ${path.relative(repoRoot, filePath)}`);
        }

        records.push({
            name,
            slug,
            filePath,
            html,
            indexable: !extractMetaRobots(html).toLowerCase().includes("noindex")
        });
    }

    return records.sort((a, b) => compareComposerNames(a.name, b.name));
}

function platformLabel(group) {
    if (group.c64Count && group.amigaCount) return "C64 & Amiga";
    if (group.c64Count) return "Commodore 64";
    if (group.amigaCount) return "Amiga";
    return "C64 & Amiga";
}

function platformSummary(group) {
    const parts = [];
    if (group.c64Count) parts.push(`${group.c64Count} C64`);
    if (group.amigaCount) parts.push(`${group.amigaCount} Amiga`);
    const other = Math.max(0, group.count - group.c64Count - group.amigaCount);
    if (other) parts.push(`${other} other`);
    return parts.join(" · ") || "No linked game credits";
}

function yearSummary(group) {
    if (!group.firstYear || !group.lastYear) return "";
    return group.firstYear === group.lastYear
        ? String(group.firstYear)
        : `${group.firstYear}–${group.lastYear}`;
}

function routeUrl(slug) {
    return `${SITE_ORIGIN}/music/${slug}/`;
}

function routePath(slug) {
    return path.join(musicDir, slug, "index.html");
}

function staticEntry(slug) {
    return `music/${slug}/index.html`;
}

function mergeComposerRoutes(creditedGroups, existingPages) {
    const existingByKey = new Map();
    const existingBySlug = new Map();
    existingPages.forEach((page) => {
        existingByKey.set(normalizeComposerKey(page.name), page);
        existingBySlug.set(page.slug, page);
    });

    const routes = [];
    const matchedExisting = new Set();

    creditedGroups.forEach((group) => {
        const existing = existingByKey.get(normalizeComposerKey(group.name)) || existingBySlug.get(group.slug);
        const slug = existing ? existing.slug : group.slug;
        if (!slug) fail(`Unable to create a composer slug for ${group.name}`);
        if (existing) matchedExisting.add(existing.slug);

        routes.push({
            ...group,
            name: existing?.name || group.name,
            slug,
            existing: Boolean(existing),
            generated: !existing,
            credited: true,
            indexable: existing ? existing.indexable : group.count >= INDEXABLE_MIN_GAMES
        });
    });

    existingPages.forEach((page) => {
        if (matchedExisting.has(page.slug)) return;
        routes.push({
            name: page.name,
            slug: page.slug,
            variants: [page.name],
            games: [],
            count: 0,
            c64Count: 0,
            amigaCount: 0,
            firstYear: null,
            lastYear: null,
            existing: true,
            generated: false,
            credited: false,
            indexable: page.indexable
        });
    });

    const seenSlugs = new Map();
    routes.forEach((route) => {
        if (seenSlugs.has(route.slug)) {
            fail(`Composer route collision: ${route.slug} (${seenSlugs.get(route.slug)} / ${route.name})`);
        }
        seenSlugs.set(route.slug, route.name);
    });

    return routes.sort((a, b) => (
        compareComposerNames(a.name, b.name) ||
        a.slug.localeCompare(b.slug)
    ));
}

function gameListSchema(route) {
    return route.games.map((game, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: game.title,
        url: `${SITE_ORIGIN}/games/${game.slug}/`
    }));
}

function composerPageSchema(route) {
    const url = routeUrl(route.slug);
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                name: `${route.name} game music archive`,
                description: `Browse games carrying a recorded music credit for ${route.name} in the Cheeky Commodore Gamer archive.`,
                url,
                about: { "@type": "Thing", name: route.name },
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
                    { "@type": "ListItem", position: 2, name: "Music Hub", item: `${SITE_ORIGIN}/music/` },
                    { "@type": "ListItem", position: 3, name: "Composers", item: `${SITE_ORIGIN}/music/composers/` },
                    { "@type": "ListItem", position: 4, name: route.name, item: url }
                ]
            },
            {
                "@type": "ItemList",
                name: `${route.name} music-credit games in the CCG archive`,
                numberOfItems: route.count,
                itemListElement: gameListSchema(route)
            }
        ]
    };
}

function renderStaticGames(route) {
    if (!route.games.length) {
        return `<li class="ccg-composer-games__item">No linked game credits are currently recorded for ${htmlEscape(route.name)}.</li>`;
    }

    return route.games.map((game) => {
        const details = [game.year, game.system, game.publisher].filter(Boolean).join(" · ");
        return `<li class="ccg-composer-games__item ccg-composer-games__item--static">
          <a class="ccg-composer-game-link" href="/games/${htmlEscape(game.slug)}/">
            <span class="ccg-composer-game-content">
              <span class="ccg-composer-game-title">${htmlEscape(game.title)}</span>
              ${details ? `<span class="ccg-composer-game-minor">${htmlEscape(details)}</span>` : ""}
            </span>
            <span class="ccg-composer-game-action"><span>Open game page</span><span aria-hidden="true">↗</span></span>
          </a>
        </li>`;
    }).join("\n        ");
}

function renderGeneratedComposerPage(route) {
    const url = routeUrl(route.slug);
    const label = platformLabel(route);
    const gameWord = route.count === 1 ? "game" : "games";
    const title = `${route.name} — ${label} Game Music | Cheeky Commodore Gamer`;
    const description = `Explore ${route.count} ${label} ${gameWord} with a recorded music credit for ${route.name}, including direct game links and playable tracks where available.`;
    const robots = route.indexable ? "index,follow" : "noindex,follow";

    return `<!DOCTYPE html>
<html lang="en" data-ccg-page="music-composer" data-generated-composer="true">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(description)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Cheeky Commodore Gamer">
  <meta property="og:title" content="${htmlEscape(title)}">
  <meta property="og:description" content="${htmlEscape(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE_ORIGIN}/resources/images/og/c64_neon.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${htmlEscape(title)}">
  <meta name="twitter:description" content="${htmlEscape(description)}">
  <meta name="twitter:image" content="${SITE_ORIGIN}/resources/images/og/c64_neon.png">
  <meta name="twitter:url" content="${url}">
  <script type="application/ld+json">
${jsonForHtml(composerPageSchema(route))}
  </script>
  <link rel="stylesheet" href="/resources/css/ccg-master.css">
  ${renderPublicHeaderStyleLinks()}
  <link rel="stylesheet" href="/resources/css/music-composer.css">
</head>
<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">
  ${renderPublicHeader({ activeHref: "/music/" })}
  <main class="ccg-main ccg-composer-page" data-composer-name="${htmlEscape(route.name)}" data-composer-slug="${htmlEscape(route.slug)}">
    <nav class="ccg-composer-breadcrumbs" aria-label="Breadcrumb">
      <div class="ccg-breadcrumb-nav">
        <a href="/home.html" class="ccg-btn ccg-btn--secondary">Home</a>
        <a href="/games/index.html" class="ccg-btn ccg-btn--secondary">Games</a>
        <a href="/music/" class="ccg-btn ccg-btn--secondary">Music Hub</a>
        <a href="/music/composers/" class="ccg-btn ccg-btn--primary is-active">All Composers</a>
      </div>
    </nav>

    <h1 class="ccg-composer-title">${htmlEscape(route.name)} — ${htmlEscape(label)} Music</h1>
    <p class="ccg-composer-subtitle">${htmlEscape(platformSummary(route))}${yearSummary(route) ? ` · ${htmlEscape(yearSummary(route))}` : ""}</p>
    <p class="ccg-composer-intro">Browse games grouped under the recorded music credit ${htmlEscape(route.name)}, with playable tracks where archive audio is available.</p>

    <div id="composer-content">
      <article class="ccg-composer-profile ccg-composer-profile--text-only">
        <div>
          <h2 class="ccg-composer-profile__title">${htmlEscape(route.name)}</h2>
          <p class="ccg-composer-profile__platform">${htmlEscape(label)}</p>
          <p class="ccg-composer-profile__facts">${route.count} linked game ${route.count === 1 ? "credit" : "credits"}</p>
        </div>
      </article>
    </div>

    <div class="ccg-composer-support">
      <!-- CCG PAYPAL DONATE LINK — DO NOT CHANGE ROUTE -->
      <a href="https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL" target="_blank" rel="noopener noreferrer" class="ccg-btn ccg-btn--support">☕ SUPPORT THE SITE</a>
      <a href="https://www.youtube.com/@CheekyCommodoreGamer" target="_blank" rel="noopener noreferrer" class="ccg-btn ccg-btn--youtube">▶ SUBSCRIBE ON YOUTUBE</a>
    </div>

    <h2 class="ccg-composer-section-title">Games featuring ${htmlEscape(route.name)}</h2>
    <ul id="composer-games" class="ccg-composer-games" data-static-composer-games="true">
        ${renderStaticGames(route)}
    </ul>

    <section class="ccg-composer-featured" aria-labelledby="other-composers-heading">
      <h2 id="other-composers-heading" class="ccg-composer-section-title">Browse other featured composers</h2>
      <div id="composer-featured-list" class="ccg-composer-chip-list"></div>
    </section>

    <div class="ccg-back-to-top-wrap" data-ccg-back-to-top-wrap hidden>
      <button class="ccg-back-to-top" data-ccg-back-to-top aria-label="Back to top" type="button">↑</button>
      <span class="ccg-back-to-top__label" aria-hidden="true">Back to top</span>
    </div>
  </main>
  <script src="/js/ccg-nav-core.js" defer></script>
  <script src="/js/ccg-nav-core.js" defer></script>
  <script src="/js/ccg-nav-core.js" defer></script>
  <script src="/js/ccg-nav-core.js" defer></script>
  <script src="/js/ccg-nav-core.js" defer></script>
  <script src="/js/ccg-music-config.js" defer></script>
  <script src="/js/ccg-shared-music-player.js" defer></script>
  <script src="/js/music-composer-utils.js" defer></script>
  <script src="/js/music-composer-pages.js" defer></script>
  <script src="/js/ccg-game-music-player.js"></script>
  <script src="/js/ccg-schema.js"></script>
</body>
</html>
`;
}

function hubSchema(routes, canonical, name, description) {
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                name,
                description,
                url: canonical,
                isPartOf: { "@type": "WebSite", name: "Cheeky Commodore Gamer", url: SITE_ORIGIN }
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: canonical.endsWith("/composers/")
                    ? [
                        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
                        { "@type": "ListItem", position: 2, name: "Music Hub", item: `${SITE_ORIGIN}/music/` },
                        { "@type": "ListItem", position: 3, name: "Composers", item: canonical }
                    ]
                    : [
                        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
                        { "@type": "ListItem", position: 2, name: "Music Hub", item: canonical }
                    ]
            },
            {
                "@type": "ItemList",
                name: "Composer routes in the CCG archive",
                numberOfItems: routes.length,
                itemListElement: routes.map((route, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    name: route.name,
                    url: routeUrl(route.slug)
                }))
            }
        ]
    };
}

function renderFeaturedFallback(routes) {
    const byKey = new Map(routes.map((route) => [normalizeComposerKey(route.name), route]));
    return FEATURED_NAMES
        .map((name) => byKey.get(normalizeComposerKey(name)))
        .filter(Boolean)
        .map((route) => `<a href="/music/${htmlEscape(route.slug)}/" class="composer-card composer-card--featured" data-slug="${htmlEscape(route.slug)}">
          <div class="composer-info">
            <h3>${htmlEscape(route.name)}</h3>
            <p class="composer-platform">${htmlEscape(platformLabel(route))}</p>
            <p class="composer-count">${route.count} Tracks</p>
          </div>
        </a>`)
        .join("\n        ");
}

function renderAccordionFallback(routes) {
    const groups = new Map();
    routes.forEach((route) => {
        const letter = getComposerSortLetter(route.name);
        if (!groups.has(letter)) groups.set(letter, []);
        groups.get(letter).push(route);
    });

    return ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].filter((letter) => groups.has(letter)).map((letter) => {
        const chips = groups.get(letter).map((route) => (
            `<a class="ccg-btn ccg-btn--secondary ccg-composer-chip" href="/music/${htmlEscape(route.slug)}/">${htmlEscape(route.name)}<span>${route.count}</span></a>`
        )).join("");
        return `<section class="composer-accordion__group" data-letter="${letter}">
          <button class="composer-accordion__header" type="button" aria-expanded="false">
            <span class="composer-accordion__letter">${letter}</span>
            <span class="composer-accordion__count">${groups.get(letter).length}</span>
          </button>
          <div class="composer-accordion__body" hidden>
            <div class="ccg-composer-chip-list">${chips}</div>
          </div>
        </section>`;
    }).join("\n        ");
}

function renderHub(routes, composersOnly) {
    const canonical = composersOnly ? `${SITE_ORIGIN}/music/composers/` : `${SITE_ORIGIN}/music/`;
    const title = composersOnly
        ? "All C64 & Amiga Composers | Cheeky Commodore Gamer"
        : "C64 & Amiga Music Hub | Cheeky Commodore Gamer";
    const description = composersOnly
        ? "Browse static C64 and Amiga composer archive pages with direct links to every matching game and playable tracks where available."
        : "Browse featured and full-list C64 and Amiga game music composers with static archive links to composer pages and game soundtracks.";
    const heading = composersOnly ? "C64 & Amiga Composer Archive" : "C64 & Amiga Music Hub";
    const intro = composersOnly
        ? "Browse every tracked composer with direct links to static music archive pages."
        : "Explore home-computer composers and jump straight into linked game soundtrack archives.";
    const linkedCredits = routes.reduce((sum, route) => sum + route.count, 0);

    return `<!DOCTYPE html>
<html lang="en" data-ccg-page="${composersOnly ? "music-hub-composers" : "music-hub"}" data-generated-composer-hub="true">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(description)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Cheeky Commodore Gamer">
  <meta property="og:title" content="${htmlEscape(title)}">
  <meta property="og:description" content="${htmlEscape(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE_ORIGIN}/resources/images/og/c64_neon.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${htmlEscape(title)}">
  <meta name="twitter:description" content="${htmlEscape(description)}">
  <meta name="twitter:image" content="${SITE_ORIGIN}/resources/images/og/c64_neon.png">
  <meta name="twitter:url" content="${canonical}">
  <script type="application/ld+json">
${jsonForHtml(hubSchema(routes, canonical, heading, description))}
  </script>
  <link rel="stylesheet" href="/resources/css/ccg-master.css">
  ${renderPublicHeaderStyleLinks()}
  <link rel="stylesheet" href="/resources/css/music-composer.css">
</head>
<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">
  ${renderPublicHeader({ activeHref: composersOnly ? "/music/composers/" : "/music/" })}
  <main class="ccg-main ccg-music-hub">
    <nav class="ccg-composer-breadcrumbs" aria-label="Breadcrumb">
      <div class="ccg-breadcrumb-nav">
        <a href="/home.html" class="ccg-btn ccg-btn--secondary">Home</a>
        <a href="/games/index.html" class="ccg-btn ccg-btn--secondary">Games</a>
        <a href="/music/" class="ccg-btn ${composersOnly ? "ccg-btn--secondary" : "ccg-btn--primary is-active"}"${composersOnly ? "" : " aria-current=\"page\""}>Music Hub</a>
        <a href="/music/composers/" class="ccg-btn ${composersOnly ? "ccg-btn--primary is-active" : "ccg-btn--secondary"}"${composersOnly ? " aria-current=\"page\"" : ""}>All Composers</a>
      </div>
    </nav>
    <section class="ccg-music-hub__hero">
      <h1 class="ccg-composer-title">${htmlEscape(heading)}</h1>
      <p class="ccg-composer-intro">${htmlEscape(intro)}</p>
      <p class="ccg-composer-subtitle" id="music-hub-stats">${routes.length} composers • ${linkedCredits} linked game credits</p>
    </section>

    <section class="composer-section">
      <h2>🎼 Featured Composers</h2>
      <div class="composer-grid composer-grid-featured" data-static-composer-fallback="true">
        ${renderFeaturedFallback(routes)}
      </div>
    </section>

    <section class="composer-section composer-discovery">
      <h2>All Composers</h2>
      <p class="composer-discovery__intro">Search the archive and expand letter groups to jump directly to any composer profile.</p>
      <label class="composer-discovery__search-wrap" for="composer-discovery-search">
        <span class="composer-discovery__search-label">Search composers</span>
        <input id="composer-discovery-search" class="composer-discovery__search" type="search" autocomplete="off" placeholder="Type a composer name…">
      </label>
      <div id="composer-discovery-accordion" class="composer-accordion" aria-live="polite" data-static-composer-fallback="true">
        ${renderAccordionFallback(routes)}
      </div>
    </section>

    <div class="ccg-back-to-top-wrap" data-ccg-back-to-top-wrap hidden>
      <button class="ccg-back-to-top" data-ccg-back-to-top aria-label="Back to top" type="button">↑</button>
      <span class="ccg-back-to-top__label" aria-hidden="true">Back to top</span>
    </div>
  </main>
  <script src="/js/ccg-nav-core.js" defer></script>
  <script src="/js/ccg-nav-core.js" defer></script>
  <script src="/js/ccg-nav-core.js" defer></script>
  <script src="/js/ccg-nav-core.js" defer></script>
  <script src="/js/ccg-nav-core.js" defer></script>
  <script src="/js/ccg-music-config.js" defer></script>
  <script src="/js/music-composer-utils.js" defer></script>
  <script src="/js/music-composer-pages.js" defer></script>
  <script src="/js/ccg-schema.js"></script>
</body>
</html>
`;
}

function removeStaleGeneratedPages(previousMetadata, currentRoutes) {
    const currentGenerated = new Set(currentRoutes.filter((route) => route.generated).map((route) => route.slug));
    let removed = 0;
    (Array.isArray(previousMetadata) ? previousMetadata : []).forEach((entry) => {
        if (!entry || !entry.generated || !entry.slug || currentGenerated.has(entry.slug)) return;
        const filePath = routePath(entry.slug);
        if (!fs.existsSync(filePath)) return;
        const html = fs.readFileSync(filePath, "utf8");
        if (!html.includes('data-generated-composer="true"')) {
            fail(`Refusing to remove non-generated composer page: ${path.relative(repoRoot, filePath)}`);
        }
        fs.unlinkSync(filePath);
        const directory = path.dirname(filePath);
        if (!fs.readdirSync(directory).length) fs.rmdirSync(directory);
        removed += 1;
    });
    return removed;
}

function updateStaticPages(routes, previousMetadata) {
    const current = readJson(staticPagesPath, []);
    if (!Array.isArray(current)) fail("tools/seo/static-pages.json must contain an array");

    const staleGenerated = new Set(
        (Array.isArray(previousMetadata) ? previousMetadata : [])
            .filter((entry) => entry && entry.generated)
            .map((entry) => staticEntry(entry.slug))
    );
    const desired = new Set([
        "music/index.html",
        "music/composers/index.html",
        ...routes.filter((route) => route.indexable).map((route) => staticEntry(route.slug))
    ]);

    const seen = new Set();
    const next = [];
    current.forEach((entry) => {
        if (typeof entry !== "string") return;
        if (staleGenerated.has(entry) && !desired.has(entry)) return;
        if (seen.has(entry)) return;
        seen.add(entry);
        next.push(entry);
    });
    desired.forEach((entry) => {
        if (!seen.has(entry)) {
            seen.add(entry);
            next.push(entry);
        }
    });

    return writeFileIfChanged(staticPagesPath, `${JSON.stringify(next, null, 2)}\n`);
}

function metadataRecord(route) {
    return {
        name: route.name,
        slug: route.slug,
        count: route.count,
        c64Count: route.c64Count,
        amigaCount: route.amigaCount,
        firstYear: route.firstYear,
        lastYear: route.lastYear,
        existing: route.existing,
        generated: route.generated,
        credited: route.credited,
        indexable: route.indexable,
        variants: route.variants,
        games: route.games.map((game) => game.slug)
    };
}

function renderReport({ games, creditedGroups, existingPages, routes, generatedWrites, staleRemoved }) {
    const creditedExisting = routes.filter((route) => route.credited && route.existing).length;
    const generated = routes.filter((route) => route.generated);
    const indexableGenerated = generated.filter((route) => route.indexable).length;
    const noindexGenerated = generated.filter((route) => !route.indexable).length;
    const linkedCredits = creditedGroups.reduce((sum, route) => sum + route.count, 0);
    const top = [...creditedGroups].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 15);

    return `# Phase 3C Composer Archive Expansion

## Results

| Check | Count |
|---|---:|
| Game records scanned | **${games.length}** |
| Credited composer entities | **${creditedGroups.length}** |
| Existing dedicated composer pages preserved | **${existingPages.length}** |
| Credited composers with an existing page | **${creditedExisting}** |
| Newly generated static composer routes | **${generated.length}** |
| Indexable generated routes | **${indexableGenerated}** |
| Single-game generated noindex routes | **${noindexGenerated}** |
| Total static composer routes | **${routes.length}** |
| Linked game-credit relationships | **${linkedCredits}** |
| Generated pages written in this run | **${generatedWrites}** |
| Stale generated pages removed | **${staleRemoved}** |

## Indexing policy

- Existing curated composer pages remain unchanged and retain their current indexing policy.
- Newly generated pages with at least ${INDEXABLE_MIN_GAMES} credited games use \`index,follow\`.
- Newly generated one-game pages use \`noindex,follow\` until another matching credit is present.
- The music hub and all-composers hub are static, indexable and link to every route.

## Most represented composer credits

${top.map((route) => `- ${route.name}: **${route.count}** games`).join("\n")}

## Route-layer normalization

${Array.from(COMPOSER_ALIASES.entries()).map(([source, target]) => `- \`${source}\` → **${target}**`).join("\n")}

The source records in \`games/games.json\` remain unchanged.

## Generated features

- Static canonical routes for every credited composer.
- Static game links and structured data on generated composer pages.
- Static composer links in both music hubs, enhanced by the existing JavaScript search and accordion.
- Existing player scripts and curated composer pages preserved.
- Sitemap and static-page integration for indexable routes.

## Explicit exclusions

- No composer biographies, birth details or personal facts were invented.
- No existing curated composer page was rewritten.
- No changes to \`games/games.json\`.
- No homepage or intro-loader changes.
- The noindex query-string fallback remains available for unknown names.

## Rollback

Revert the Phase 3C squash merge commit. Generated pages, hub fallbacks, registry entries and workflow support can then be removed together.
`;
}

function main() {
    const games = readJson(gamesJsonPath, null);
    if (!Array.isArray(games)) fail("games/games.json must contain an array");

    const previousMetadata = readJson(metadataPath, []);
    const creditedGroups = buildComposerGroups(games);
    const existingPages = findExistingComposerPages();
    const routes = mergeComposerRoutes(creditedGroups, existingPages);

    const staleRemoved = removeStaleGeneratedPages(previousMetadata, routes);
    let generatedWrites = 0;

    routes.filter((route) => route.generated).forEach((route) => {
        const filePath = routePath(route.slug);
        if (fs.existsSync(filePath)) {
            const current = fs.readFileSync(filePath, "utf8");
            if (!current.includes('data-generated-composer="true"')) {
                fail(`Composer route collides with an existing non-generated page: ${path.relative(repoRoot, filePath)}`);
            }
        }
        if (writeFileIfChanged(filePath, renderGeneratedComposerPage(route))) generatedWrites += 1;
    });

    writeFileIfChanged(hubPaths[0], renderHub(routes, false));
    writeFileIfChanged(hubPaths[1], renderHub(routes, true));
    updateStaticPages(routes, previousMetadata);
    writeFileIfChanged(metadataPath, `${JSON.stringify(routes.map(metadataRecord), null, 2)}\n`);
    writeFileIfChanged(reportPath, renderReport({
        games,
        creditedGroups,
        existingPages,
        routes,
        generatedWrites,
        staleRemoved
    }));

    console.log(JSON.stringify({
        gameRecords: games.length,
        creditedComposerEntities: creditedGroups.length,
        existingComposerPages: existingPages.length,
        totalStaticRoutes: routes.length,
        generatedRoutes: routes.filter((route) => route.generated).length,
        indexableGeneratedRoutes: routes.filter((route) => route.generated && route.indexable).length,
        noindexGeneratedRoutes: routes.filter((route) => route.generated && !route.indexable).length,
        generatedWrites,
        staleRemoved
    }, null, 2));
}

if (require.main === module) main();

module.exports = {
    INDEXABLE_MIN_GAMES,
    findExistingComposerPages,
    mergeComposerRoutes,
    renderGeneratedComposerPage,
    renderHub
};
