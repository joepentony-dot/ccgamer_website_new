#!/usr/bin/env node

/*
 * CCG responsive layout contract audit.
 *
 * This is intentionally deterministic and browser-free so it can run in the
 * existing site-safety workflow. It protects the shared responsive contract,
 * the global loader and representative page viewport configuration.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const errors = [];

const REQUIRED_FILES = [
    "resources/css/ccg-responsive-safety.css",
    "js/ccg-responsive-safety.js",
    "js/ccg-nav-core.js",
    "resources/css/ccg-master.css",
    "resources/css/ccg-nav.css",
    "resources/css/ccg-mode.css",
    "resources/css/home.css",
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

REQUIRED_FILES.forEach((relativePath) => {
    if (!fs.existsSync(path.join(ROOT, relativePath))) {
        fail(`Required responsive file is missing: ${relativePath}`);
    }
});

const safetyCss = read("resources/css/ccg-responsive-safety.css");
const safetyLoader = read("js/ccg-responsive-safety.js");
const navCore = read("js/ccg-nav-core.js");

balancedBraces(safetyCss, "ccg-responsive-safety.css");

expectText(
    navCore,
    '{ src: "/js/ccg-responsive-safety.js", marker: "data-ccg-responsive-safety-loader" }',
    "the global responsive-safety module registration"
);
expectText(safetyLoader, 'const CSS_PATH = "/resources/css/ccg-responsive-safety.css";', "the responsive stylesheet path");
expectText(safetyLoader, "ensureStylesheetLast", "late-cascade stylesheet enforcement");

expectText(safetyCss, "DOCUMENT + VIEWPORT OWNERSHIP", "document-scroll ownership rules");
expectText(safetyCss, "body:not(.ccg-body--locked):not(.ccg-body--nav-open)", "body scroll-lock exception handling");
expectText(safetyCss, ".ccg-nav-drawer__panel", "mobile drawer viewport containment");
expectText(safetyCss, "@media (min-width: 901px) and (max-width: 1199px)", "the 901–1199px header breakpoint");
expectText(safetyCss, '"brand toggle"\n            "actions actions"', "the tablet header grid-area contract");
expectText(safetyCss, "@media (min-width: 521px) and (max-width: 900px)", "the 521–900px header breakpoint");
expectText(safetyCss, "@media (max-width: 520px)", "the small-phone header breakpoint");
expectText(safetyCss, ".ccg-header .ccg-mode-hint", "mode-hint containment");
expectText(safetyCss, 'html[data-ccg-page="home"] .home-featured-videos', "home featured-video density normalisation");

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

const publicCssChecks = [
    ["resources/css/game-pages.css", "@media (max-width: 640px)", "single-game mobile collapse"],
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
console.log(`Errors: ${errors.length}`);

if (errors.length) process.exit(1);

console.log("Responsive layout contract checks passed.");
