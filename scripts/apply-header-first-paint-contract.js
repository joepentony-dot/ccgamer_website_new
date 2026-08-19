#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function write(relativePath, content) {
    fs.writeFileSync(path.join(ROOT, relativePath), content, "utf8");
}

function replaceOnce(source, before, after, label) {
    if (source.includes(after)) return source;
    const count = source.split(before).length - 1;
    if (count !== 1) throw new Error(`${label}: expected one source block, found ${count}`);
    return source.replace(before, after);
}

function replaceAllExact(source, before, after, expectedCount, label) {
    if (source.includes(after) && !source.includes(before)) return source;
    const count = source.split(before).length - 1;
    if (count !== expectedCount) throw new Error(`${label}: expected ${expectedCount} source blocks, found ${count}`);
    return source.split(before).join(after);
}

function replaceRegexOnce(source, pattern, replacement, label) {
    if (typeof replacement === "string" && source.includes(replacement)) return source;
    let count = 0;
    const next = source.replace(pattern, (...args) => {
        count += 1;
        return typeof replacement === "function" ? replacement(...args) : replacement;
    });
    if (count !== 1) throw new Error(`${label}: expected one regex match, found ${count}`);
    return next;
}

function patchComposerGenerator() {
    const file = "scripts/generate-composer-pages.js";
    let source = read(file);

    source = replaceOnce(
        source,
        '} = require("./composer-utils");\n',
        '} = require("./composer-utils");\nconst { renderPublicHeader, renderPublicHeaderStyleLinks } = require("./shared-public-header");\n',
        "composer generator shared-header import"
    );

    source = replaceAllExact(
        source,
        '  <link rel="stylesheet" href="/resources/css/ccg-master.css">\n  <link rel="stylesheet" href="/resources/css/ccg-buttons.css">\n  <link rel="stylesheet" href="/resources/css/music-composer.css">',
        '  <link rel="stylesheet" href="/resources/css/ccg-master.css">\n  ${renderPublicHeaderStyleLinks()}\n  <link rel="stylesheet" href="/resources/css/music-composer.css">',
        2,
        "composer generated first-paint styles"
    );

    source = replaceOnce(
        source,
        '<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">\n  <main class="ccg-main ccg-composer-page"',
        '<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">\n  ${renderPublicHeader({ activeHref: "/music/" })}\n  <main class="ccg-main ccg-composer-page"',
        "generated composer static header"
    );

    source = replaceOnce(
        source,
        '<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">\n  <main class="ccg-main ccg-music-hub">',
        '<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">\n  ${renderPublicHeader({ activeHref: composersOnly ? "/music/composers/" : "/music/" })}\n  <main class="ccg-main ccg-music-hub">',
        "music hub static header"
    );

    source = replaceAllExact(
        source,
        '  <script src="/js/ccg-music-config.js" defer></script>',
        '  <script src="/js/ccg-nav-core.js" defer></script>\n  <script src="/js/ccg-music-config.js" defer></script>',
        2,
        "music generated nav core"
    );

    write(file, source);
}

function patchMusicConfig() {
    const file = "js/ccg-music-config.js";
    let source = read(file);

    source = replaceOnce(
        source,
        '  function ensureMusicNavigation() {\n    if (window.CCG_MUSIC_NAVIGATION_READY) return;\n',
        '  function ensureMusicNavigation() {\n    if (document.querySelector("[data-ccg-header]")) return;\n    if (window.CCG_MUSIC_NAVIGATION_READY) return;\n',
        "music static-header guard"
    );

    source = replaceOnce(
        source,
        '    script.src = MUSIC_NAVIGATION_SCRIPT;\n    script.defer = true;\n',
        '    script.src = MUSIC_NAVIGATION_SCRIPT;\n    script.async = false;\n',
        "music fallback execution order"
    );

    source = replaceOnce(
        source,
        '  if (document.readyState === "loading") {\n    document.addEventListener("DOMContentLoaded", init, { once: true });\n  } else {\n    init();\n  }\n})();\n',
        '  if (document.body) {\n    init();\n  } else {\n    document.addEventListener("DOMContentLoaded", init, { once: true });\n  }\n})();\n',
        "music config early init"
    );

    write(file, source);
}

function fallbackHeaderMarkup() {
    return String.raw`    function headerMarkup() {
        return \
\`<header class="ccg-header ccg-header--music-injected" data-ccg-header data-ccg-music-header data-ccg-static-fallback-header="true">
  <div class="ccg-header-inner">
    <a href="/home.html" class="ccg-brand">
      <img src="/resources/images/ccgamer-logo.png" alt="Cheeky Commodore Gamer logo" class="ccg-brand__logo" loading="eager" width="1500" height="1032" sizes="(max-width: 720px) 200px, 320px">
      <div class="ccg-brand__text">
        <div class="ccg-brand__kicker">Stay a while, stay forever!</div>
        <div class="ccg-brand__title"><span class="ccg-brand__neon-cheeky">CHEEKY COMMODORE</span><span class="ccg-brand__neon-sub">GAMER</span></div>
      </div>
    </a>

    <button class="ccg-nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false" aria-controls="ccg-primary-nav" data-ccg-nav-toggle>
      <span class="ccg-nav-toggle__bars" aria-hidden="true"><span></span><span></span><span></span></span><span class="ccg-nav-toggle__label">Menu</span>
    </button>

    <nav class="ccg-nav ccg-nav--has-overflow" aria-label="Primary navigation" id="ccg-primary-nav">
      <div class="ccg-nav__bar">
        <ul class="ccg-nav__list ccg-nav__list--primary" data-ccg-nav-primary>
          <li><a href="/home.html" class="ccg-nav__link">Home</a></li>
          <li><a href="/games/" class="ccg-nav__link">Browse Games</a></li>
          <li><a href="/games/genres/" class="ccg-nav__link">Browse by Genre</a></li>
          <li><a href="/games/publishers/" class="ccg-nav__link">Publishers</a></li>
          <li><a href="/games/collections/" class="ccg-nav__link">Collections</a></li>
          <li><a href="/music/" class="ccg-nav__link ccg-nav__link--active" aria-current="page">Music Hub</a></li>
        </ul>
        <div class="ccg-nav__more">
          <button class="ccg-nav__more-toggle" type="button" aria-expanded="false" aria-hidden="false" aria-controls="ccg-more-menu" data-ccg-more-toggle>More <span aria-hidden="true">▾</span></button>
          <div class="ccg-nav__more-menu" id="ccg-more-menu" data-ccg-more-menu role="menu" hidden>
            <a href="/emulation.html" class="ccg-nav__link ccg-nav-fit__link" role="menuitem">Emulation</a>
            <a href="/install-app.html" class="ccg-nav__link ccg-nav-fit__link" role="menuitem">Install CCG App</a>
            <a href="/about.html" class="ccg-nav__link ccg-nav-fit__link" role="menuitem">About Me</a>
            <a href="/contact.html" class="ccg-nav__link ccg-nav-fit__link" role="menuitem">Contact</a>
          </div>
        </div>
      </div>
      <ul class="ccg-nav__list ccg-nav__list--secondary" data-ccg-nav-secondary>
        <li><a href="/games/discover/" class="ccg-nav__link">Find Me a Game</a></li>
        <li><a href="/zzap64/" class="ccg-nav__link">Zzap!64 Reviews & Awards</a></li>
        <li><a href="/quiz/quiz.html" class="ccg-nav__link">Quiz</a></li>
        <li hidden data-ccg-nav-fit-pinned="true"><a href="/emulation.html" class="ccg-nav__link">Emulation</a></li>
        <li hidden data-ccg-nav-fit-pinned="true"><a href="/install-app.html" class="ccg-nav__link" data-ccg-pwa-install-nav="true">Install CCG App</a></li>
        <li hidden data-ccg-nav-fit-pinned="true"><a href="/about.html" class="ccg-nav__link">About Me</a></li>
        <li hidden data-ccg-nav-fit-pinned="true"><a href="/contact.html" class="ccg-nav__link">Contact</a></li>
      </ul>
    </nav>

    <div class="ccg-header-actions">
      <div class="ccg-auth-slot" data-ccg-auth-slot aria-live="polite"></div>
      <div class="ccg-mode-hint">Try different modes</div>
      <button class="ccg-mode-toggle" type="button" aria-label="Toggle between C64 and Amiga modes" data-ccg-mode-toggle>
        <span class="ccg-mode-toggle__pill"><span class="ccg-mode-toggle__label ccg-mode-toggle__label--c64">C64 MODE</span><span class="ccg-mode-toggle__label ccg-mode-toggle__label--amiga">AMIGA MODE</span><span class="ccg-mode-toggle__thumb"></span></span>
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
      <div class="ccg-nav-drawer__header"><span class="ccg-nav-drawer__title">Navigate</span><button class="ccg-nav-drawer__close" type="button" aria-label="Close menu" data-ccg-drawer-close>✕</button></div>
      <div class="ccg-nav-drawer__section" data-ccg-drawer-primary><div class="ccg-nav-drawer__label">Primary</div></div>
      <div class="ccg-nav-drawer__section" data-ccg-drawer-secondary><div class="ccg-nav-drawer__label">Explore more</div></div>
    </div>
  </div>
  <div class="ccg-header-neon-strip"></div>
</header>\`;
    }
`;
}

function patchMusicNavigation() {
    const file = "js/ccg-music-navigation.js";
    let source = read(file);

    source = replaceOnce(
        source,
        '        "/resources/css/ccg-nav.css",\n        "/resources/css/ccg-buttons.css",\n',
        '        "/resources/css/ccg-nav.css",\n        "/resources/css/ccg-nav-fit.css",\n        "/resources/css/ccg-buttons.css",\n        "/resources/css/ccg-socials.css",\n',
        "music fallback critical styles"
    );

    const replacement = fallbackHeaderMarkup();
    if (!source.includes('data-ccg-static-fallback-header="true"')) {
        source = replaceRegexOnce(
            source,
            /    function headerMarkup\(\) \{[\s\S]*?\n    \}\n\n    function ensureHeader\(\)/,
            `${replacement}\n    function ensureHeader()`,
            "music fallback canonical header"
        );
    }

    source = replaceOnce(
        source,
        '    if (document.readyState === "loading") {\n        document.addEventListener("DOMContentLoaded", init, { once: true });\n    } else {\n        init();\n    }\n})();\n',
        '    if (document.body) {\n        init();\n    } else {\n        document.addEventListener("DOMContentLoaded", init, { once: true });\n    }\n})();\n',
        "music fallback early init"
    );

    write(file, source);
}

function patchHeaderAuthLoader() {
    const file = "js/ccg-header-auth-loader.js";
    let source = read(file);
    source = replaceOnce(
        source,
        '    if (document.readyState === "loading") {\n        document.addEventListener("DOMContentLoaded", init, { once: true });\n    } else {\n        init();\n    }\n})();\n',
        '    if (document.querySelector("[data-ccg-header] .ccg-header-actions")) {\n        void init();\n    } else if (document.readyState === "loading") {\n        document.addEventListener("DOMContentLoaded", () => void init(), { once: true });\n    } else {\n        void init();\n    }\n})();\n',
        "header auth early init"
    );
    write(file, source);
}

function patchNavFit() {
    const file = "js/ccg-nav-fit.js";
    let source = read(file);
    source = replaceOnce(
        source,
        '    const PINNED_MORE_LABELS = new Set(["about", "about me", "contact"]);\n    const BASE_MORE_LINKS = [\n        ["About Me", "/about.html"],\n        ["Contact", "/contact.html"]\n    ];\n',
        '    const PINNED_MORE_LABELS = new Set(["emulation", "install ccg app", "about", "about me", "contact"]);\n    const BASE_MORE_LINKS = [\n        ["Emulation", "/emulation.html"],\n        ["Install CCG App", "/install-app.html"],\n        ["About Me", "/about.html"],\n        ["Contact", "/contact.html"]\n    ];\n',
        "fixed first-paint More destinations"
    );
    write(file, source);
}

function patchNavCore() {
    const file = "js/ccg-nav-core.js";
    let source = read(file);

    source = replaceOnce(
        source,
        '        { href: "/resources/css/ccg-scroll-authority.css", marker: "data-ccg-scroll-authority-style" },\n        { href: "/resources/css/ccg-nav-fit.css", marker: "data-ccg-nav-fit-style" }\n',
        '        { href: "/resources/css/ccg-scroll-authority.css", marker: "data-ccg-scroll-authority-style" },\n        { href: "/resources/css/ccg-nav-fit.css", marker: "data-ccg-nav-fit-style" },\n        { href: "/resources/css/ccg-socials.css", marker: "data-ccg-socials-style" },\n        { href: "/resources/css/ccg-community.css", marker: "data-ccg-community-style" }\n',
        "nav core support styles"
    );

    const secondaryBlock = `    const FINAL_SECONDARY = [\n        ["Find Me a Game", "/games/discover/"],\n        ["Zzap!64 Reviews & Awards", "/zzap64/"],\n        ["Quiz", "/quiz/quiz.html"],\n        ["Emulation", "/emulation.html"],\n        ["Install CCG App", "/install-app.html"],\n        ["About Me", "/about.html"],\n        ["Contact", "/contact.html"]\n    ];\n`;
    const secondaryWithDefaults = `${secondaryBlock}\n    const DEFAULT_MORE_LABELS = new Set(["emulation", "install ccg app", "about me", "contact"]);\n    const DEFAULT_MORE_LINKS = [\n        ["Emulation", "/emulation.html"],\n        ["Install CCG App", "/install-app.html"],\n        ["About Me", "/about.html"],\n        ["Contact", "/contact.html"]\n    ];\n`;
    source = replaceOnce(source, secondaryBlock, secondaryWithDefaults, "nav core first-paint More contract");

    source = replaceOnce(
        source,
        `    function buildList(list, links) {\n        if (!list) return;\n        const fragment = document.createDocumentFragment();\n        links.forEach(([label, href]) => {\n            const item = document.createElement("li");\n            const link = document.createElement("a");\n            link.href = href;\n            link.className = "ccg-nav__link";\n            link.textContent = label;\n            if (canonicalPath(href) === "/install-app.html") {\n                link.setAttribute("data-ccg-pwa-install-nav", "true");\n            }\n            item.appendChild(link);\n            fragment.appendChild(item);\n        });\n        list.replaceChildren(fragment);\n    }\n`,
        `    function buildList(list, links) {\n        if (!list) return;\n        const fragment = document.createDocumentFragment();\n        links.forEach(([label, href]) => {\n            const item = document.createElement("li");\n            const link = document.createElement("a");\n            link.href = href;\n            link.className = "ccg-nav__link";\n            link.textContent = label;\n            if (DEFAULT_MORE_LABELS.has(String(label || "").trim().toLowerCase())) {\n                item.hidden = true;\n                item.setAttribute("data-ccg-nav-fit-pinned", "true");\n            }\n            if (canonicalPath(href) === "/install-app.html") {\n                link.setAttribute("data-ccg-pwa-install-nav", "true");\n            }\n            item.appendChild(link);\n            fragment.appendChild(item);\n        });\n        list.replaceChildren(fragment);\n    }\n`,
        "nav core pre-fitted list builder"
    );

    const helperMarker = "    function synchroniseNavigationStructure() {\n";
    if (!source.includes("function ensureHeaderSupportStructure()")) {
        const helpers = `    function ensureHeaderSupportStructure() {\n        const actions = document.querySelector("[data-ccg-header] .ccg-header-actions");\n        if (!actions) return;\n\n        if (!actions.querySelector(".ccg-auth-slot")) {\n            const auth = document.createElement("div");\n            auth.className = "ccg-auth-slot";\n            auth.setAttribute("data-ccg-auth-slot", "true");\n            auth.setAttribute("aria-live", "polite");\n            actions.insertBefore(auth, actions.firstChild);\n        }\n\n        if (!actions.querySelector(".ccg-header-socials")) {\n            const socials = document.createElement("div");\n            socials.className = "ccg-header-socials";\n            socials.setAttribute("aria-label", "Social links");\n            socials.innerHTML = [\n                '<a href="https://www.youtube.com/@CheekyCommodoreGamer" aria-label="YouTube"><span class="ccg-socials__icon ccg-socials__icon--yt"></span></a>',\n                '<a href="https://patreon.com/CheekyCommodoreGamer" aria-label="Patreon"><span class="ccg-socials__icon ccg-socials__icon--patreon"></span></a>',\n                '<a href="https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL" aria-label="PayPal"><span class="ccg-socials__icon ccg-socials__icon--paypal"></span></a>',\n                '<a href="https://twitter.com/CheekyC64Gamer" aria-label="X/Twitter"><span class="ccg-socials__icon ccg-socials__icon--x"></span></a>',\n                '<a href="https://www.facebook.com/cheekycommodoregamer" aria-label="Facebook"><span class="ccg-socials__icon ccg-socials__icon--fb"></span></a>',\n                '<a href="https://discord.gg/83Xw9ktAn4" aria-label="Discord"><span class="ccg-socials__icon ccg-socials__icon--discord"></span></a>'\n            ].join("");\n            actions.appendChild(socials);\n        }\n    }\n\n    function prepareDefaultMoreState(nav) {\n        const more = nav?.querySelector(".ccg-nav__more");\n        const toggle = nav?.querySelector("[data-ccg-more-toggle]");\n        const menu = nav?.querySelector("[data-ccg-more-menu]");\n        if (!more || !toggle || !menu) return;\n\n        menu.replaceChildren();\n        DEFAULT_MORE_LINKS.forEach(([label, href]) => {\n            const link = document.createElement("a");\n            link.href = href;\n            link.className = "ccg-nav__link ccg-nav-fit__link";\n            link.textContent = label;\n            link.setAttribute("role", "menuitem");\n            menu.appendChild(link);\n        });\n        menu.setAttribute("role", "menu");\n        menu.hidden = true;\n        more.hidden = false;\n        toggle.disabled = false;\n        toggle.setAttribute("aria-hidden", "false");\n        toggle.setAttribute("aria-expanded", "false");\n        nav.classList.add("ccg-nav--has-overflow");\n    }\n\n`;
        source = replaceOnce(source, helperMarker, `${helpers}${helperMarker}`, "nav core first-paint helpers");
    }

    source = replaceOnce(
        source,
        `        if (changed) {\n            const menu = nav.querySelector("[data-ccg-more-menu]");\n            if (menu) {\n                menu.replaceChildren();\n                menu.hidden = true;\n            }\n\n            const toggle = nav.querySelector("[data-ccg-more-toggle]");\n            if (toggle) {\n                toggle.setAttribute("aria-expanded", "false");\n            }\n        }\n`,
        `        if (changed || !window.CCG_NAV_FIT_READY) {\n            prepareDefaultMoreState(nav);\n        }\n`,
        "nav core default More preparation"
    );

    source = replaceOnce(
        source,
        `        loadRequiredStyles();\n        synchroniseNavigationStructure();\n        applyNavGlowPatch();\n`,
        `        loadRequiredStyles();\n        ensureHeaderSupportStructure();\n        synchroniseNavigationStructure();\n        applyNavGlowPatch();\n`,
        "nav core support structure bootstrap"
    );

    write(file, source);
}

function patchReleaseAndWorker() {
    let release = read("js/ccg-release-check.js");
    release = replaceOnce(
        release,
        '        "/js/ccg-nav-core.js",\n        "/js/ccg-nav.js",\n        "/js/ccg-nav-fit.js",\n        "/js/ccg-pwa-visible-install.js",\n',
        '        "/js/ccg-nav-core.js",\n        "/js/ccg-nav.js",\n        "/js/ccg-nav-fit.js",\n        "/js/ccg-header-auth-loader.js",\n        "/js/ccg-music-config.js",\n        "/js/ccg-music-navigation.js",\n        "/js/ccg-pwa-visible-install.js",\n',
        "release fingerprint header lifecycle assets"
    );
    write("js/ccg-release-check.js", release);

    let worker = read("service-worker.js");
    worker = replaceOnce(
        worker,
        'const CACHE_VERSION = "2026-08-19-public-release-v3";',
        'const CACHE_VERSION = "2026-08-19-public-release-v4";',
        "service worker first-paint release version"
    );
    write("service-worker.js", worker);
}

function patchMusicAudit() {
    const file = "scripts/audit-music-navigation.js";
    let source = read(file);

    if (!source.includes('const sharedHeader = read("scripts/shared-public-header.js");')) {
        source = replaceOnce(
            source,
            'const navigation = read("js/ccg-music-navigation.js");\n',
            'const navigation = read("js/ccg-music-navigation.js");\nconst sharedHeader = read("scripts/shared-public-header.js");\nconst composerGenerator = read("scripts/generate-composer-pages.js");\n',
            "music audit header source fixtures"
        );
    }

    const oldAssertions = `requireText(config, "/js/ccg-music-navigation.js", "Music pages do not request the shared header bootstrap.");\nrequireText(navigation, "data-ccg-music-header", "The injected music header marker is missing.");\nrequireText(navigation, "/js/ccg-nav-core.js", "The music header does not load the unified navigation core.");\nrequireText(navigation, "function applyMode", "The late-loaded music header does not initialise its mode control.");\nrequireText(navigation, "function bindDrawer", "The late-loaded music header does not initialise its mobile drawer.");\nrequireText(navigation, "data-ccg-nav-drawer", "The music header is missing the mobile navigation drawer.");\nrequireText(navigation, "data-ccg-mode-toggle", "The music header is missing the C64/Amiga mode control.");\n`;
    const newAssertions = `requireText(config, 'document.querySelector("[data-ccg-header]")', "Music config does not preserve a static first-paint header when one exists.");\nrequireText(config, "/js/ccg-music-navigation.js", "Legacy music pages have lost their fallback header bootstrap.");\nrequireText(navigation, "data-ccg-static-fallback-header", "The legacy music fallback header marker is missing.");\nrequireText(navigation, "/js/ccg-nav-core.js", "The music fallback header does not load the unified navigation core.");\nrequireText(navigation, "/resources/css/ccg-nav-fit.css", "The music fallback header does not preload nav-fit styling.");\nrequireText(navigation, "/resources/css/ccg-socials.css", "The music fallback header does not preload social styling.");\nrequireText(navigation, "ccg-auth-slot", "The music fallback header has no reserved account slot.");\nrequireText(navigation, "ccg-header-socials", "The music fallback header has no social row.");\nrequireText(navigation, "if (document.body)", "The music fallback header still waits unnecessarily for DOMContentLoaded.");\nrequireText(sharedHeader, 'data-ccg-static-header="true"', "The canonical build-time public header renderer is missing.");\nrequireText(sharedHeader, "ccg-auth-slot", "The canonical build-time public header has no account reservation.");\nrequireText(sharedHeader, "ccg-header-socials", "The canonical build-time public header has no social row.");\nrequireText(composerGenerator, "renderPublicHeader", "Generated music pages do not render the public header at build time.");\nrequireText(composerGenerator, "renderPublicHeaderStyleLinks", "Generated music pages do not render critical header CSS at build time.");\n`;
    source = replaceOnce(source, oldAssertions, newAssertions, "music audit static-header contract");

    source = replaceOnce(
        source,
        'requireText(musicHub, "/js/ccg-music-config.js", "The Music Hub does not load the music configuration bootstrap.");\n',
        'requireText(musicHub, "data-ccg-static-header=\\"true\\"", "The Music Hub header is not present in source HTML before first paint.");\nrequireText(musicHub, "/resources/css/ccg-nav-fit.css", "The Music Hub does not load nav-fit CSS synchronously.");\nrequireText(musicHub, "/resources/css/ccg-socials.css", "The Music Hub does not load social CSS synchronously.");\nrequireText(musicHub, "/js/ccg-nav-core.js", "The Music Hub does not load the unified nav core from source HTML.");\nrequireText(musicHub, "/js/ccg-music-config.js", "The Music Hub does not load the music configuration bootstrap.");\n',
        "music audit generated hub source"
    );

    source = replaceOnce(
        source,
        'requireText(composerHub, "/js/ccg-music-config.js", "The composer hub does not load the music configuration bootstrap.");\n',
        'requireText(composerHub, "data-ccg-static-header=\\"true\\"", "The composer hub header is not present in source HTML before first paint.");\nrequireText(composerHub, "/js/ccg-nav-core.js", "The composer hub does not load the unified nav core from source HTML.");\nrequireText(composerHub, "/js/ccg-music-config.js", "The composer hub does not load the music configuration bootstrap.");\n',
        "music audit composer hub source"
    );

    write(file, source);
}

function patchNavTests() {
    const file = "tests/nav-discovery-scroll.test.mjs";
    let source = read(file);
    if (!source.includes('fixed first-paint More destinations')) {
        source = source.replace(
            "test('desktop More is functional and deliberately owns About Me and Contact', () => {",
            "test('desktop More is functional and deliberately owns fixed first-paint More destinations', () => {"
        );
        source = source.replace(
            '  assert.match(navFit, /PINNED_MORE_LABELS = new Set\\(\\["about", "about me", "contact"\\]\\)/);',
            '  assert.match(navFit, /PINNED_MORE_LABELS = new Set\\(\\["emulation", "install ccg app", "about", "about me", "contact"\\]\\)/);'
        );
        source = source.replace(
            '  assert.match(navFit, /\\["About Me", "\\/about\\.html"\\]/);\n  assert.match(navFit, /\\["Contact", "\\/contact\\.html"\\]/);',
            '  assert.match(navFit, /\\["Emulation", "\\/emulation\\.html"\\]/);\n  assert.match(navFit, /\\["Install CCG App", "\\/install-app\\.html"\\]/);\n  assert.match(navFit, /\\["About Me", "\\/about\\.html"\\]/);\n  assert.match(navFit, /\\["Contact", "\\/contact\\.html"\\]/);'
        );
        source = source.replace(
            '  assert.match(navCore, /installNavigationAuthorityObserver/);',
            '  assert.match(navCore, /installNavigationAuthorityObserver/);\n  assert.match(navCore, /DEFAULT_MORE_LABELS/);\n  assert.match(navCore, /prepareDefaultMoreState/);\n  assert.match(navCore, /ensureHeaderSupportStructure/);'
        );
        source = `// fixed first-paint More destinations\n${source}`;
    }
    write(file, source);
}

function main() {
    patchComposerGenerator();
    patchMusicConfig();
    patchMusicNavigation();
    patchHeaderAuthLoader();
    patchNavFit();
    patchNavCore();
    patchReleaseAndWorker();
    patchMusicAudit();
    patchNavTests();
    console.log("Applied the sitewide first-paint header contract.");
}

main();
