#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
    PUBLIC_HEADER_STYLES,
    renderPublicHeader
} = require("./shared-public-header");

const ROOT = path.resolve(__dirname, "..");
const CHECK_ONLY = process.argv.includes("--check");

const TARGETS = Object.freeze([
    ["home.html", "/home.html"],
    ["games/index.html", "/games/"],
    ["games/genres/index.html", "/games/genres/"],
    ["games/publishers/index.html", "/games/publishers/"],
    ["games/collections/index.html", "/games/collections/"],
    ["games/discover/index.html", "/games/discover/"],
    ["zzap64/index.html", "/zzap64/"],
    ["quiz/quiz.html", "/quiz/quiz.html"],
    ["emulation.html", "/emulation.html"],
    ["about.html", "/about.html"],
    ["contact.html", "/contact.html"],
    ["videos/index.html", "/videos/"],
    ["install-app.html", "/install-app.html"]
]);

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasStylesheet(html, href) {
    const pattern = new RegExp(`<link\\b(?=[^>]*\\brel=["']stylesheet["'])(?=[^>]*\\bhref=["']${escapeRegex(href)}["'])[^>]*>`, "i");
    return pattern.test(html);
}

function ensureHeaderStyles(html) {
    const missing = PUBLIC_HEADER_STYLES.filter((href) => !hasStylesheet(html, href));
    if (!missing.length) return html;
    const links = missing.map((href) => `    <link rel="stylesheet" href="${href}" data-ccg-static-header-style>`).join("\n");
    if (!/<\/head>/i.test(html)) throw new Error("Document is missing </head>.");
    return html.replace(/<\/head>/i, `${links}\n</head>`);
}

function ensureNavCore(html) {
    if (/<script\b[^>]*\bsrc=["'][^"']*ccg-nav-core\.js(?:[?#][^"']*)?["'][^>]*>/i.test(html)) return html;
    if (!/<\/body>/i.test(html)) throw new Error("Document is missing </body>.");
    return html.replace(/<\/body>/i, `  <script src="/js/ccg-nav-core.js" defer data-ccg-static-header-core></script>\n</body>`);
}

function replaceExistingHeader(html, activeHref) {
    const headerPattern = /<header\b(?=[^>]*\bclass=["'][^"']*\bccg-header\b[^"']*["'])(?=[^>]*\bdata-ccg-header\b)[^>]*>[\s\S]*?<\/header>/i;
    if (!headerPattern.test(html)) {
        throw new Error("Document does not contain a replaceable public CCG header.");
    }
    return html.replace(headerPattern, renderPublicHeader({ activeHref }));
}

function normalizeFile(relativePath, activeHref) {
    const filePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(filePath)) {
        console.log(`[header-sync] Skipping missing optional target: ${relativePath}`);
        return { changed: false, relativePath, skipped: true };
    }

    const before = fs.readFileSync(filePath, "utf8");
    let after = replaceExistingHeader(before, activeHref);
    after = ensureHeaderStyles(after);
    after = ensureNavCore(after);

    if (before === after) return { changed: false, relativePath, skipped: false };
    if (!CHECK_ONLY) fs.writeFileSync(filePath, after, "utf8");
    return { changed: true, relativePath, skipped: false };
}

const results = [];
const failures = [];
for (const [relativePath, activeHref] of TARGETS) {
    try {
        results.push(normalizeFile(relativePath, activeHref));
    } catch (error) {
        failures.push(`${relativePath}: ${error.message}`);
    }
}

if (failures.length) {
    console.error("Public header synchronization failed:");
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exit(1);
}

const changed = results.filter((result) => result.changed).map((result) => result.relativePath);
const skipped = results.filter((result) => result.skipped).map((result) => result.relativePath);

if (CHECK_ONLY && changed.length) {
    console.error("Public header source drift detected:");
    changed.forEach((relativePath) => console.error(` - ${relativePath}`));
    process.exit(1);
}

console.log(JSON.stringify({
    mode: CHECK_ONLY ? "check" : "write",
    targets: results.length,
    changed: changed.length,
    changedFiles: changed,
    skipped
}, null, 2));
