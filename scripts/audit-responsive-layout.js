#!/usr/bin/env node

/*
 * CCG responsive layout contract audit.
 *
 * Deterministic and browser-free so it can run in the existing site-safety
 * workflow. It protects the shared responsive contract, final cascade loader,
 * representative layouts and every public HTML page in the repository.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const errors = [];

const REQUIRED_FILES = [
    "resources/css/ccg-responsive-safety.css",
    "resources/css/ccg-responsive-page-polish.css",
    "js/ccg-responsive-safety.js",
    "js/ccg-nav-core.js",
    "resources/css/ccg-master.css",
    "resources/css/ccg-nav.css",
    "resources/css/ccg-mode.css",
    "resources/css/home.css",
    "resources/css/games.css",
    "resources/css/game-pages.css",
    "resources/css/publishers.css",
    "resources/css/video-library.css",
    "resources/css/zzap64-awards.css",
    "resources/css/quiz.css",
    "resources/css/about.css",
    "resources/css/emulation.css",
    "resources/css/downloads.css",
    "resources/css/member-hub.css"
];

const REPRESENTATIVE_PAGES = [
    "home.html",
    "games/index.html",
    "games/game.html",
    "games/genres/index.html",
    "games/publishers/index.html",
    "videos/index.html",
    "zzap64/index.html",
    "about.html",
    "emulation.html",
    "community/profile.html"
];

const PUBLIC_HTML_EXCLUDED_DIRS = new Set([
    ".git",
    ".github",
    "node_modules",
    "admin",
    "scripts",
    "tests",
    "test",
    "tools"
]);

function fail(message) {
    errors.push(message);
    console.error(`ERROR: ${message}`);
}

function read(relativePath) {
    const absolutePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) {
        fail(`Required responsive file is missing: ${relativePath}`);
        return "";
    }
    return fs.readFileSync(absolutePath, "utf8");
}

function expectText(source, needle, label) {
    if (!source.includes(needle)) fail(`Responsive contract missing ${label}`);
}

function balancedBraces(source, label) {
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
    let depth = 0;
    for (const character of withoutComments) {
        if (character === "{") depth += 1;
        if (character === "}") depth -= 1;
        if (depth < 0) {
            fail(`${label} closes a CSS block before it opens`);
            return;
        }
    }
    if (depth !== 0) fail(`${label} has unbalanced CSS braces (${depth})`);
}

function walkPublicHtml(directory = ROOT, relativeDirectory = "") {
    const files = [];
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    entries.forEach((entry) => {
        if (entry.isDirectory() && PUBLIC_HTML_EXCLUDED_DIRS.has(entry.name)) return;

        const absolute = path.join(directory, entry.name);
        const relative = path.posix.join(relativeDirectory.split(path.sep).join("/"), entry.name);

        if (entry.isDirectory()) {
            files.push(...walkPublicHtml(absolute, relative));
            return;
        }

        if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".html")) return;

        /* resources/ can contain stream overlays and utility HTML which are not
           navigable website documents and do not share the public page shell. */
        if (relative.startsWith("resources/")) return;

        files.push(relative);
    });

    return files;
}

function auditPublicHtmlPage(relativePath) {
    const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");

    /* Redirect fragments and non-document helper files are ignored. */
    if (!/<html\b/i.test(source) || !/<head\b/i.test(source)) return false;

    if (!/<meta\s+[^>]*name=["']viewport["'][^>]*>/i.test(source)) {
        fail(`Public page lacks a responsive viewport meta tag: ${relativePath}`);
    }

    const usesSharedHeader = /class=["'][^"']*\bccg-header\b/i.test(source);
    if (usesSharedHeader && !/ccg-nav-core\.js/i.test(source)) {
        fail(`Public page uses the shared CCG header but does not load ccg-nav-core.js: ${relativePath}`);
    }

    return true;
}

REQUIRED_FILES.forEach((relativePath) => {
    if (!fs.existsSync(path.join(ROOT, relativePath))) {
        fail(`Required responsive file is missing: ${relativePath}`);
    }
});

const safetyCss = read("resources/css/ccg-responsive-safety.css");
const polishCss = read("resources/css/ccg-responsive-page-polish.css");
const safetyLoader = read("js/ccg-responsive-safety.js");
const navCore = read("js/ccg-nav-core.js");

balancedBraces(safetyCss, "ccg-responsive-safety.css");
balancedBraces(polishCss, "ccg-responsive-page-polish.css");

expectText(
    navCore,
    '{ src: "/js/ccg-responsive-safety.js", marker: "data-ccg-responsive-safety-loader" }',
    "the global responsive-safety module registration"
);
expectText(safetyLoader, 'href: "/resources/css/ccg-responsive-safety.css"', "the responsive safety stylesheet path");
expectText(safetyLoader, 'href: "/resources/css/ccg-responsive-page-polish.css"', "the responsive page-polish stylesheet path");
expectText(safetyLoader, 'pageId === "intro"', "intro-loader isolation");
expectText(safetyLoader, 'pathname.startsWith("/admin/")', "admin-tool isolation");
expectText(safetyLoader, "ensureStylesheetsLast", "late-cascade stylesheet enforcement");

expectText(safetyCss, "DOCUMENT + VIEWPORT OWNERSHIP", "document-scroll ownership rules");
expectText(safetyCss, "body:not(.ccg-body--locked):not(.ccg-body--nav-open)", "body scroll-lock exception handling");
expectText(safetyCss, ".ccg-nav-drawer__panel", "mobile drawer viewport containment");
expectText(safetyCss, "@media (min-width: 901px) and (max-width: 1199px)", "the 901–1199px header breakpoint");
expectText(safetyCss, '"brand toggle"\n            "actions actions"', "the tablet header grid-area contract");
expectText(safetyCss, "@media (min-width: 521px) and (max-width: 900px)", "the 521–900px header breakpoint");
expectText(safetyCss, "@media (max-width: 520px)", "the small-phone header breakpoint");
expectText(safetyCss, ".ccg-header .ccg-mode-hint", "mode-hint containment");
expectText(safetyCss, 'html[data-ccg-page="home"] .home-featured-videos', "home featured-video density normalisation");

expectText(polishCss, "@media (max-width: 1199px)", "compact responsive mode-hint removal");
expectText(polishCss, "@media (min-width: 701px) and (max-width: 900px)", "compact 701–900px header action row");
expectText(polishCss, ".ccg-header .ccg-nav-toggle__label", "compact phone menu-label handling");
expectText(polishCss, 'html[data-ccg-page="single-game"] .ccg-main--single-game', "single-game mobile gutter ownership");
expectText(polishCss, ".ccg-modal--doc .ccg-modal-content", "mobile document-modal correction");
expectText(polishCss, 'html[data-ccg-page="member-hub"] .member-hub-nav', "member-hub mobile sticky-nav correction");

REPRESENTATIVE_PAGES.forEach((relativePath) => {
    const source = read(relativePath);
    if (!source) return;
    if (!/<meta\s+[^>]*name=["']viewport["'][^>]*>/i.test(source)) {
        fail(`Representative public page lacks a viewport meta tag: ${relativePath}`);
    }
    if (!/ccg-nav-core\.js/i.test(source)) {
        fail(`Representative public page does not load the unified navigation core: ${relativePath}`);
    }
});

const publicHtmlFiles = walkPublicHtml();
let auditedPublicPages = 0;
publicHtmlFiles.forEach((relativePath) => {
    if (auditPublicHtmlPage(relativePath)) auditedPublicPages += 1;
});

const publicCssChecks = [
    ["resources/css/games.css", "@media (max-width: 768px)", "single-game scroll-stability layout"],
    ["resources/css/game-pages.css", "@media (max-width: 640px)", "single-game utility mobile collapse"],
    ["resources/css/publishers.css", "@media (max-width: 500px)", "publisher one-column mobile collapse"],
    ["resources/css/video-library.css", "@media (max-width: 560px)", "video-library one-column mobile collapse"],
    ["resources/css/zzap64-awards.css", "@media (max-width: 520px)", "Zzap mobile card layout"],
    ["resources/css/quiz.css", "@media (max-width: 420px)", "quiz small-phone layout"],
    ["resources/css/about.css", "@media (max-width: 720px)", "About mobile layout"],
    ["resources/css/emulation.css", "@media (max-width: 720px)", "emulation mobile layout"],
    ["resources/css/downloads.css", "@media (max-width: 460px)", "downloads small-phone layout"],
    ["resources/css/member-hub.css", "@media (max-width: 480px)", "member-hub small-phone layout"]
];

publicCssChecks.forEach(([relativePath, needle, label]) => {
    const source = read(relativePath);
    if (source) expectText(source, needle, label);
});

console.log("\nCCG responsive layout summary");
console.log(`Public HTML pages audited: ${auditedPublicPages}`);
console.log(`Errors: ${errors.length}`);

if (errors.length) process.exit(1);

console.log("Responsive layout contract checks passed.");
