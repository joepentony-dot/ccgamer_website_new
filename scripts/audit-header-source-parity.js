#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const problems = [];

const CORE_PAGES = Object.freeze([
    "home.html",
    "games/index.html",
    "games/genres/index.html",
    "games/publishers/index.html",
    "games/collections/index.html",
    "games/discover/index.html",
    "zzap64/index.html",
    "quiz/quiz.html",
    "emulation.html",
    "about.html",
    "contact.html",
    "videos/index.html",
    "install-app.html",
    "music/index.html",
    "music/composers/index.html"
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

const PINNED_MORE_LABELS = Object.freeze([
    "Emulation",
    "Install CCG App",
    "About Me",
    "Contact"
]);

function read(relativePath) {
    const filePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(filePath)) {
        problems.push(`${relativePath}: file is missing`);
        return "";
    }
    return fs.readFileSync(filePath, "utf8");
}

function headerFrom(html) {
    return html.match(/<header\b(?=[^>]*\bclass=["'][^"']*\bccg-header\b[^"']*["'])(?=[^>]*\bdata-ccg-header\b)[^>]*>[\s\S]*?<\/header>/i)?.[0] || "";
}

function visibleTopLevelLabels(header) {
    const listHtml = [
        header.match(/<ul\b[^>]*data-ccg-nav-primary[^>]*>[\s\S]*?<\/ul>/i)?.[0] || "",
        header.match(/<ul\b[^>]*data-ccg-nav-secondary[^>]*>[\s\S]*?<\/ul>/i)?.[0] || ""
    ].join("\n");
    const labels = [];
    const itemPattern = /<li\b([^>]*)>[\s\S]*?<a\b[^>]*class=["'][^"']*\bccg-nav__link\b[^"']*["'][^>]*>([^<]+)<\/a>[\s\S]*?<\/li>/gi;
    let match;
    while ((match = itemPattern.exec(listHtml))) {
        if (/\bhidden\b/i.test(match[1])) continue;
        labels.push(match[2].replace(/\s+/g, " ").trim());
    }
    return labels;
}

function auditPage(relativePath) {
    const html = read(relativePath);
    if (!html) return;
    const header = headerFrom(html);
    if (!header) {
        problems.push(`${relativePath}: public header is absent from source HTML`);
        return;
    }

    if (!/data-ccg-static-header=["']true["']/i.test(header)) {
        problems.push(`${relativePath}: canonical static-header marker is missing`);
    }
    if (!/class=["'][^"']*\bccg-auth-slot\b/i.test(header)) {
        problems.push(`${relativePath}: reserved account slot is missing from first-paint HTML`);
    }
    const socials = header.match(/class=["'][^"']*\bccg-header-socials\b[^"']*["'][\s\S]*?<\/div>/i)?.[0] || "";
    const socialLinks = (socials.match(/<a\b/gi) || []).length;
    if (socialLinks !== 6) {
        problems.push(`${relativePath}: expected 6 first-paint social links, found ${socialLinks}`);
    }
    if (!/class=["'][^"']*\bccg-nav--has-overflow\b/i.test(header)) {
        problems.push(`${relativePath}: first-paint navigation is not pre-fitted for More`);
    }

    REQUIRED_LABELS.forEach((label) => {
        if (!header.includes(`>${label}</a>`)) problems.push(`${relativePath}: header is missing ${label}`);
    });
    PINNED_MORE_LABELS.forEach((label) => {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const topLevel = new RegExp(`<li\\b[^>]*hidden[^>]*>[\\s\\S]*?>${escaped}<\\/a>`, "i");
        if (!topLevel.test(header)) problems.push(`${relativePath}: ${label} is not pinned out of the first-paint top row`);
        const moreLink = new RegExp(`class=["'][^"']*\\bccg-nav-fit__link\\b[^"']*["'][^>]*>${escaped}<\\/a>`, "i");
        if (!moreLink.test(header)) problems.push(`${relativePath}: ${label} is missing from first-paint More`);
    });

    const visible = visibleTopLevelLabels(header);
    PINNED_MORE_LABELS.forEach((label) => {
        if (visible.includes(label)) problems.push(`${relativePath}: ${label} can flash in the desktop top row before fitting`);
    });

    [
        "/resources/css/ccg-nav.css",
        "/resources/css/ccg-nav-fit.css",
        "/resources/css/ccg-socials.css",
        "/resources/css/ccg-community.css"
    ].forEach((href) => {
        const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (!new RegExp(`<link\\b(?=[^>]*rel=["']stylesheet["'])(?=[^>]*href=["']${escaped}["'])`, "i").test(html)) {
            problems.push(`${relativePath}: synchronous first-paint stylesheet is missing: ${href}`);
        }
    });

    if (!/<script\b[^>]*src=["'][^"']*ccg-nav-core\.js/i.test(html)) {
        problems.push(`${relativePath}: unified nav core is not present in source HTML`);
    }
}

CORE_PAGES.forEach(auditPage);

const musicConfig = read("js/ccg-music-config.js");
if (!musicConfig.includes('document.querySelector("[data-ccg-header]")')) {
    problems.push("Music config does not skip the fallback injector when a static header already exists");
}

const musicNavigation = read("js/ccg-music-navigation.js");
for (const token of ["ccg-auth-slot", "ccg-header-socials", "/resources/css/ccg-nav-fit.css", "/resources/css/ccg-socials.css"]) {
    if (!musicNavigation.includes(token)) problems.push(`Music fallback header is missing ${token}`);
}
if (!musicNavigation.includes("if (document.body)")) {
    problems.push("Music fallback header still waits unnecessarily for DOMContentLoaded");
}

const generatedComposerFiles = fs.readdirSync(path.join(ROOT, "music"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "composers")
    .map((entry) => path.join("music", entry.name, "index.html"))
    .filter((relativePath) => fs.existsSync(path.join(ROOT, relativePath)))
    .filter((relativePath) => read(relativePath).includes('data-generated-composer="true"'));

if (!generatedComposerFiles.length) {
    problems.push("No generated composer pages were available for static-header validation");
} else {
    generatedComposerFiles.forEach((relativePath) => {
        const html = read(relativePath);
        if (!html.includes('data-ccg-static-header="true"')) problems.push(`${relativePath}: generated composer page lacks a static Omega header`);
        if (!html.includes('/resources/css/ccg-nav-fit.css')) problems.push(`${relativePath}: generated composer page lacks first-paint nav-fit CSS`);
        if (!html.includes('/js/ccg-nav-core.js')) problems.push(`${relativePath}: generated composer page lacks unified nav core`);
    });
}

if (problems.length) {
    console.error("Header source parity audit failed:");
    problems.forEach((problem) => console.error(` - ${problem}`));
    process.exit(1);
}

console.log(`Header source parity audit passed for ${CORE_PAGES.length} core pages and ${generatedComposerFiles.length} generated composer pages.`);
console.log("- header exists in source before first paint");
console.log("- account and social structure is reserved consistently");
console.log("- nav-fit/social styles are synchronous");
console.log("- Emulation, Install, About and Contact begin in More instead of flashing across the top row");
