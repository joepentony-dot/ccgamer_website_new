#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
    FEATURED_PUBLISHERS,
    slugifyPublisher
} = require("./publisher-utils");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");

const publisherIndexPath = path.join(repoRoot, "games", "publishers", "index.html");
const publisherImagesDir = path.join(repoRoot, "resources", "images", "publishers");
const stylesheetHref = "/resources/css/publisher-logos.css";

function fail(message) {
    console.error(`[publisher-logos] ${message}`);
    process.exit(1);
}

function htmlEscape(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getSectionBounds(html) {
    const featuredStart = html.indexOf('id="featured-publishers-title"');
    const allPublishersStart = html.indexOf('id="all-publishers-title"');

    if (featuredStart === -1 || allPublishersStart === -1 || featuredStart >= allPublishersStart) {
        fail("Could not locate the Featured Publishers section.");
    }

    return { featuredStart, allPublishersStart };
}

if (!fs.existsSync(publisherIndexPath)) {
    fail("Publisher index does not exist. Run generate-publisher-pages.js first.");
}

let html = fs.readFileSync(publisherIndexPath, "utf8");
getSectionBounds(html);

if (!html.includes(`href="${stylesheetHref}"`)) {
    const marker = '<link rel="stylesheet" href="/resources/css/publishers.css">';
    if (!html.includes(marker)) {
        fail("Could not locate the publisher stylesheet marker.");
    }
    html = html.replace(marker, `${marker}\n    <link rel="stylesheet" href="${stylesheetHref}">`);
}

let installed = 0;

FEATURED_PUBLISHERS.forEach((publisherName) => {
    const slug = slugifyPublisher(publisherName);
    const imagePath = path.join(publisherImagesDir, `${slug}.png`);
    if (!slug || !fs.existsSync(imagePath)) return;
    if (html.includes(`data-publisher-logo="${slug}"`)) {
        installed += 1;
        return;
    }

    const { featuredStart, allPublishersStart } = getSectionBounds(html);
    const hrefMarker = `href="/games/publishers/${slug}/"`;
    const hrefIndex = html.indexOf(hrefMarker, featuredStart);
    if (hrefIndex === -1 || hrefIndex >= allPublishersStart) return;

    const anchorStart = html.lastIndexOf("<a ", hrefIndex);
    const anchorOpenEnd = html.indexOf(">", hrefIndex);
    if (anchorStart === -1 || anchorOpenEnd === -1 || anchorOpenEnd >= allPublishersStart) return;

    const openingTag = html.slice(anchorStart, anchorOpenEnd + 1);
    const enhancedOpeningTag = openingTag.includes("ccg-publisher-card--has-logo")
        ? openingTag
        : openingTag.replace(
            "ccg-publisher-card--featured",
            "ccg-publisher-card--featured ccg-publisher-card--has-logo"
        );

    const logoMarkup = `\n            <span class="ccg-publisher-card__logo" data-publisher-logo="${htmlEscape(slug)}">\n                <img src="/resources/images/publishers/${htmlEscape(slug)}.png"\n                     alt="${htmlEscape(publisherName)} publisher logo"\n                     loading="lazy"\n                     decoding="async">\n            </span>`;

    html = html.slice(0, anchorStart)
        + enhancedOpeningTag
        + logoMarkup
        + html.slice(anchorOpenEnd + 1);

    installed += 1;
});

fs.writeFileSync(publisherIndexPath, html, "utf8");
console.log(`[publisher-logos] Applied ${installed} featured publisher logo${installed === 1 ? "" : "s"}.`);
