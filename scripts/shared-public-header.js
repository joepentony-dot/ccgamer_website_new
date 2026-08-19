#!/usr/bin/env node

"use strict";

const PRIMARY_LINKS = Object.freeze([
    ["Home", "/home.html"],
    ["Browse Games", "/games/"],
    ["Browse by Genre", "/games/genres/"],
    ["Publishers", "/games/publishers/"],
    ["Collections", "/games/collections/"],
    ["Music Hub", "/music/"]
]);

const SECONDARY_LINKS = Object.freeze([
    ["Find Me a Game", "/games/discover/"],
    ["Zzap!64 Reviews & Awards", "/zzap64/"],
    ["Quiz", "/quiz/quiz.html"],
    ["Emulation", "/emulation.html"],
    ["Install CCG App", "/install-app.html"],
    ["About Me", "/about.html"],
    ["Contact", "/contact.html"]
]);

const DEFAULT_MORE_LINKS = Object.freeze([
    ["Emulation", "/emulation.html"],
    ["Install CCG App", "/install-app.html"],
    ["About Me", "/about.html"],
    ["Contact", "/contact.html"]
]);

const DEFAULT_MORE_LABELS = new Set(DEFAULT_MORE_LINKS.map(([label]) => label.toLowerCase()));

const PUBLIC_HEADER_STYLES = Object.freeze([
    "/resources/css/ccg-mode.css",
    "/resources/css/ccg-nav.css",
    "/resources/css/ccg-nav-fit.css",
    "/resources/css/ccg-buttons.css",
    "/resources/css/ccg-socials.css",
    "/resources/css/ccg-community.css"
]);

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizePath(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    const clean = text.split(/[?#]/, 1)[0].replace(/\/index\.html$/i, "/");
    if (clean === "/games/index.html") return "/games/";
    return clean;
}

function activeAttributes(href, activeHref) {
    const active = normalizePath(href) === normalizePath(activeHref);
    return active ? ' ccg-nav__link--active" aria-current="page' : "";
}

function renderNavItem(label, href, activeHref, options = {}) {
    const hidden = Boolean(options.hidden);
    const attrs = hidden ? ' hidden data-ccg-nav-fit-pinned="true"' : "";
    const active = activeAttributes(href, activeHref);
    const className = active ? `ccg-nav__link${active.split('"')[0]}` : "ccg-nav__link";
    const aria = active ? ' aria-current="page"' : "";
    return `<li${attrs}><a href="${escapeHtml(href)}" class="${className}"${aria}>${escapeHtml(label)}</a></li>`;
}

function renderMoreLinks() {
    return DEFAULT_MORE_LINKS.map(([label, href]) => (
        `<a href="${escapeHtml(href)}" class="ccg-nav__link ccg-nav-fit__link" role="menuitem">${escapeHtml(label)}</a>`
    )).join("\n                        ");
}

function renderPublicHeader(options = {}) {
    const activeHref = options.activeHref || "";
    const primary = PRIMARY_LINKS.map(([label, href]) => renderNavItem(label, href, activeHref)).join("\n                    ");
    const secondary = SECONDARY_LINKS.map(([label, href]) => renderNavItem(label, href, activeHref, {
        hidden: DEFAULT_MORE_LABELS.has(label.toLowerCase())
    })).join("\n                ");

    return `<header class="ccg-header" data-ccg-header data-ccg-static-header="true">
    <div class="ccg-header-inner">
        <a href="/home.html" class="ccg-brand">
            <img src="/resources/images/ccgamer-logo.png"
                 alt="Cheeky Commodore Gamer logo"
                 class="ccg-brand__logo"
                 width="1500"
                 height="1032"
                 decoding="async"
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

        <nav class="ccg-nav ccg-nav--has-overflow" aria-label="Primary navigation" id="ccg-primary-nav">
            <div class="ccg-nav__bar">
                <ul class="ccg-nav__list ccg-nav__list--primary" data-ccg-nav-primary>
                    ${primary}
                </ul>
                <div class="ccg-nav__more">
                    <button class="ccg-nav__more-toggle"
                            type="button"
                            aria-expanded="false"
                            aria-hidden="false"
                            aria-controls="ccg-more-menu"
                            data-ccg-more-toggle>
                        More <span aria-hidden="true">▾</span>
                    </button>
                    <div class="ccg-nav__more-menu" id="ccg-more-menu" data-ccg-more-menu role="menu" hidden>
                        ${renderMoreLinks()}
                    </div>
                </div>
            </div>
            <ul class="ccg-nav__list ccg-nav__list--secondary" data-ccg-nav-secondary>
                ${secondary}
            </ul>
        </nav>

        <div class="ccg-header-actions">
            <div class="ccg-auth-slot" data-ccg-auth-slot aria-live="polite"></div>
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
            <div class="ccg-socials-fallback" hidden aria-hidden="true"></div>
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

function renderPublicHeaderStyleLinks() {
    return PUBLIC_HEADER_STYLES.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n  ");
}

module.exports = {
    DEFAULT_MORE_LABELS,
    DEFAULT_MORE_LINKS,
    PRIMARY_LINKS,
    PUBLIC_HEADER_STYLES,
    SECONDARY_LINKS,
    renderPublicHeader,
    renderPublicHeaderStyleLinks
};
