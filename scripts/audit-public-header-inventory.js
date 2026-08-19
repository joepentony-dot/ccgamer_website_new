#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const STRICT = process.argv.includes("--strict");
const MAX_REPORT = 400;

const EXCLUDED_TOP_LEVEL = new Set([
    ".ccg-tmp",
    ".git",
    ".github",
    "admin",
    "auth",
    "docs",
    "node_modules",
    "resources",
    "scripts",
    "supabase",
    "tests",
    "tools"
]);

const REQUIRED_STYLES = Object.freeze([
    "/resources/css/ccg-nav.css",
    "/resources/css/ccg-nav-fit.css",
    "/resources/css/ccg-socials.css",
    "/resources/css/ccg-community.css"
]);

const REQUIRED_LABELS = Object.freeze([
    "Home",
    "Browse Games",
    "Browse by Genre",
    "Publishers",
    "Collections",
    "Music Hub",
    "Find Me a Game",
    "Zzap!64 Reviews & Awards",
    "Quiz",
    "Emulation",
    "Install CCG App",
    "About Me",
    "Contact"
]);

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlText(value) {
    return String(value || "")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");
}

function headerFrom(html) {
    return html.match(/<header\b(?=[^>]*\bclass=["'][^"']*\bccg-header\b[^"']*["'])(?=[^>]*\bdata-ccg-header\b)[^>]*>[\s\S]*?<\/header>/i)?.[0] || "";
}

function isRedirectDocument(html) {
    return /<meta\b[^>]*http-equiv=["']refresh["']/i.test(html)
        || /\b(?:window\.)?location\.(?:replace|assign)\s*\(/i.test(html)
        || /\bwindow\.location\.href\s*=/i.test(html);
}

function hasStylesheet(html, href) {
    const pattern = new RegExp(`<link\\b(?=[^>]*\\brel=["']stylesheet["'])(?=[^>]*\\bhref=["']${escapeRegex(href)}["'])[^>]*>`, "i");
    return pattern.test(html);
}

function headerLabels(header) {
    const labels = [];
    const pattern = /<a\b[^>]*class=["'][^"']*\bccg-nav__link\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = pattern.exec(header))) {
        labels.push(decodeHtmlText(match[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim());
    }
    return labels;
}

function inspect(relativePath, html) {
    const redirect = isRedirectDocument(html);
    const header = headerFrom(html);
    const hasMain = /<main\b/i.test(html);
    const hasBody = /<body\b/i.test(html);

    if (redirect && !header) return { relativePath, status: "redirect", reasons: [] };
    if (!header) {
        return {
            relativePath,
            status: hasBody && hasMain ? "content-without-header" : "nonstandard-document",
            reasons: []
        };
    }

    const reasons = [];
    if (!/data-ccg-static-header=["']true["']/i.test(header)) reasons.push("no static-header marker");
    if (!/class=["'][^"']*\bccg-auth-slot\b/i.test(header)) reasons.push("no reserved auth slot");

    const socials = header.match(/class=["'][^"']*\bccg-header-socials\b[^"']*["'][\s\S]*?<\/div>/i)?.[0] || "";
    const socialLinks = (socials.match(/<a\b/gi) || []).length;
    if (socialLinks !== 6) reasons.push(`social links=${socialLinks}`);

    if (!/class=["'][^"']*\bccg-nav--has-overflow\b/i.test(header)) reasons.push("More not pre-fitted");
    if (!/data-ccg-more-menu/i.test(header)) reasons.push("no More menu in source");
    if (!/hidden[^>]*data-ccg-nav-fit-pinned|data-ccg-nav-fit-pinned[^>]*hidden/i.test(header)) reasons.push("no pinned hidden More links");

    const labels = headerLabels(header);
    for (const label of REQUIRED_LABELS) {
        if (!labels.includes(label)) reasons.push(`missing nav: ${label}`);
    }

    for (const href of REQUIRED_STYLES) {
        if (!hasStylesheet(html, href)) reasons.push(`missing sync CSS: ${href}`);
    }

    if (!/<script\b[^>]*\bsrc=["'][^"']*\/js\/ccg-nav-core\.js(?:[?#][^"']*)?["'][^>]*><\/script>/i.test(html)) {
        reasons.push("no source nav core");
    }

    return {
        relativePath,
        status: reasons.length ? "legacy-header" : "canonical-header",
        reasons
    };
}

function walk(dir, relativeDir = "") {
    const rows = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
        if (!relativeDir && entry.isDirectory() && EXCLUDED_TOP_LEVEL.has(entry.name)) continue;
        if (!relativeDir && entry.name === "index.html") continue; // protected intro loader
        const absolute = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            rows.push(...walk(absolute, relativePath));
            continue;
        }
        if (!entry.isFile() || !/\.html$/i.test(entry.name)) continue;
        const html = fs.readFileSync(absolute, "utf8");
        rows.push(inspect(relativePath.replace(/\\/g, "/"), html));
    }
    return rows;
}

const rows = walk(ROOT);
const groups = new Map();
for (const row of rows) {
    if (!groups.has(row.status)) groups.set(row.status, []);
    groups.get(row.status).push(row);
}

const summary = Object.fromEntries(
    Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([status, items]) => [status, items.length])
);

console.log("Public header inventory:");
console.log(JSON.stringify({ totalPublicHtml: rows.length, ...summary }, null, 2));

for (const status of ["legacy-header", "content-without-header", "nonstandard-document"]) {
    const items = groups.get(status) || [];
    if (!items.length) continue;
    console.log(`\n${status} (${items.length}):`);
    items.slice(0, MAX_REPORT).forEach((row) => {
        const detail = row.reasons.length ? ` — ${row.reasons.join("; ")}` : "";
        console.log(` - ${row.relativePath}${detail}`);
    });
    if (items.length > MAX_REPORT) console.log(` - ... ${items.length - MAX_REPORT} more`);
}

if (STRICT && (groups.get("legacy-header")?.length || groups.get("content-without-header")?.length)) {
    process.exit(1);
}
