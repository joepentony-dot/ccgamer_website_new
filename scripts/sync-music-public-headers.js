#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { LEGACY_COMPOSER_REDIRECTS } = require("./composer-utils");
const { PUBLIC_HEADER_STYLES, renderPublicHeader } = require("./shared-public-header");

const ROOT = path.resolve(__dirname, "..");
const MUSIC_ROOT = path.join(ROOT, "music");
const CHECK_ONLY = process.argv.includes("--check");
const LEGACY_REDIRECT_SLUGS = new Set(Array.from(LEGACY_COMPOSER_REDIRECTS.keys()));

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
    const links = missing.map((href) => `  <link rel="stylesheet" href="${href}" data-ccg-static-header-style>`).join("\n");
    if (!/<\/head>/i.test(html)) throw new Error("Document is missing </head>.");
    return html.replace(/<\/head>/i, `${links}\n</head>`);
}

function ensureSingleNavCore(html) {
    const navCorePattern = /\s*<script\b[^>]*\bsrc=["']\/js\/ccg-nav-core\.js(?:[?#][^"']*)?["'][^>]*><\/script>\s*/gi;
    let next = html.replace(navCorePattern, "\n");
    const navCore = '  <script src="/js/ccg-nav-core.js" defer></script>\n';

    const musicConfigPattern = /(\s*<script\b[^>]*\bsrc=["']\/js\/ccg-music-config\.js(?:[?#][^"']*)?["'][^>]*><\/script>)/i;
    if (musicConfigPattern.test(next)) {
        return next.replace(musicConfigPattern, `\n${navCore}$1`);
    }
    if (!/<\/body>/i.test(next)) throw new Error("Document is missing </body>.");
    return next.replace(/<\/body>/i, `${navCore}</body>`);
}

function upsertHeader(html) {
    const canonical = renderPublicHeader({ activeHref: "/music/" });
    const headerPattern = /<header\b(?=[^>]*\bclass=["'][^"']*\bccg-header\b[^"']*["'])(?=[^>]*\bdata-ccg-header\b)[^>]*>[\s\S]*?<\/header>/i;
    if (headerPattern.test(html)) return html.replace(headerPattern, canonical);

    const bodyPattern = /<body\b[^>]*>/i;
    if (!bodyPattern.test(html)) throw new Error("Document is missing a <body> element.");
    return html.replace(bodyPattern, (body) => `${body}\n  ${canonical}`);
}

function isMusicContentPage(relativePath, html) {
    if (relativePath === "music/index.html" || relativePath === "music/composers/index.html") return true;
    return /data-ccg-page\s*=\s*(["'])music-composer\1/i.test(html)
        || /data-generated-composer\s*=\s*(["'])true\1/i.test(html)
        || /class\s*=\s*(["'])[^"']*\bccg-composer-page\b/i.test(html);
}

function collectTargets() {
    const targets = [
        "music/index.html",
        "music/composers/index.html"
    ];

    for (const entry of fs.readdirSync(MUSIC_ROOT, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name === "composers" || LEGACY_REDIRECT_SLUGS.has(entry.name)) continue;
        const filePath = path.join(MUSIC_ROOT, entry.name, "index.html");
        if (!fs.existsSync(filePath)) continue;
        const relativePath = path.relative(ROOT, filePath).replace(/\\/g, "/");
        const html = fs.readFileSync(filePath, "utf8");
        if (isMusicContentPage(relativePath, html)) targets.push(relativePath);
    }

    return Array.from(new Set(targets)).sort();
}

function synchronize(relativePath) {
    const filePath = path.join(ROOT, relativePath);
    const before = fs.readFileSync(filePath, "utf8");
    let after = upsertHeader(before);
    after = ensureHeaderStyles(after);
    after = ensureSingleNavCore(after);

    if (before === after) return false;
    if (!CHECK_ONLY) fs.writeFileSync(filePath, after, "utf8");
    return true;
}

const targets = collectTargets();
const changed = [];
for (const relativePath of targets) {
    try {
        if (synchronize(relativePath)) changed.push(relativePath);
    } catch (error) {
        console.error(`[music-header-sync] ${relativePath}: ${error.message}`);
        process.exitCode = 1;
    }
}

if (process.exitCode) process.exit(process.exitCode);

if (CHECK_ONLY && changed.length) {
    console.error("Music header source drift detected:");
    changed.forEach((relativePath) => console.error(` - ${relativePath}`));
    process.exit(1);
}

console.log(JSON.stringify({
    mode: CHECK_ONLY ? "check" : "write",
    targets: targets.length,
    changed: changed.length,
    changedFiles: changed
}, null, 2));
