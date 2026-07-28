#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");

const publishersDir = path.join(repoRoot, "games", "publishers");
const publisherIndexPath = path.join(publishersDir, "index.html");
const publisherImagesDir = path.join(repoRoot, "resources", "images", "publishers");
const stylesheetHref = "/resources/css/publisher-logos.css";

// The game database uses this full archive name and route. Promote its
// existing All Publishers card into Featured Publishers when its logo exists.
const EXTRA_FEATURED_PUBLISHER_SLUGS = ["microprose-software"];

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

function ensureStylesheet(html) {
    if (html.includes(`href="${stylesheetHref}"`)) return html;

    const marker = '<link rel="stylesheet" href="/resources/css/publishers.css">';
    if (!html.includes(marker)) {
        fail("Could not locate the publisher stylesheet marker.");
    }

    return html.replace(marker, `${marker}\n    <link rel="stylesheet" href="${stylesheetHref}">`);
}

function getSectionBounds(html) {
    const featuredStart = html.indexOf('id="featured-publishers-title"');
    const allPublishersStart = html.indexOf('id="all-publishers-title"');

    if (featuredStart === -1 || allPublishersStart === -1 || featuredStart >= allPublishersStart) {
        fail("Could not locate the Featured Publishers section.");
    }

    return { featuredStart, allPublishersStart };
}

function getFeaturedGridBounds(html) {
    const { featuredStart, allPublishersStart } = getSectionBounds(html);
    const marker = '<div class="ccg-publisher-grid ccg-publisher-grid--featured">';
    const gridStart = html.indexOf(marker, featuredStart);
    const gridEnd = html.indexOf("</div>", gridStart + marker.length);

    if (gridStart === -1 || gridEnd === -1 || gridEnd >= allPublishersStart) {
        fail("Could not locate the Featured Publishers card grid.");
    }

    return { gridStart, gridEnd, featuredStart, allPublishersStart };
}

function findPublisherCard(html, slug, searchStart, searchEnd) {
    const hrefMarker = `href="/games/publishers/${slug}/"`;
    const hrefIndex = html.indexOf(hrefMarker, searchStart);
    if (hrefIndex === -1 || hrefIndex >= searchEnd) return null;

    const anchorStart = html.lastIndexOf("<a ", hrefIndex);
    const anchorEndMarker = html.indexOf("</a>", hrefIndex);
    if (anchorStart === -1 || anchorEndMarker === -1 || anchorEndMarker >= searchEnd) return null;

    return {
        anchorStart,
        anchorEnd: anchorEndMarker + 4,
        hrefIndex,
        html: html.slice(anchorStart, anchorEndMarker + 4)
    };
}

function promotePublisherCard(html, slug) {
    const bounds = getFeaturedGridBounds(html);
    const featuredCard = findPublisherCard(
        html,
        slug,
        bounds.featuredStart,
        bounds.allPublishersStart
    );
    if (featuredCard) return html;

    const allCard = findPublisherCard(
        html,
        slug,
        bounds.allPublishersStart,
        html.length
    );
    if (!allCard) {
        console.warn(`[publisher-logos] No archive card found for ${slug}; skipping promotion.`);
        return html;
    }

    const promotedCard = allCard.html.replace(
        /class="ccg-publisher-card(?:\s+ccg-publisher-card--featured)?\s*"/,
        'class="ccg-publisher-card ccg-publisher-card--featured"'
    );

    return html.slice(0, bounds.gridEnd)
        + `\n${promotedCard}\n                `
        + html.slice(bounds.gridEnd);
}

function getLogoSlugs() {
    if (!fs.existsSync(publisherImagesDir)) return [];

    return fs.readdirSync(publisherImagesDir)
        .filter((fileName) => fileName.toLowerCase().endsWith(".png"))
        .map((fileName) => path.basename(fileName, path.extname(fileName)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}

function addLogoToFeaturedCard(html, slug) {
    if (html.includes(`data-publisher-logo="${slug}"`)) return { html, installed: true };

    const { featuredStart, allPublishersStart } = getSectionBounds(html);
    const card = findPublisherCard(html, slug, featuredStart, allPublishersStart);
    if (!card) return { html, installed: false };

    const openingTagEnd = html.indexOf(">", card.hrefIndex);
    if (openingTagEnd === -1 || openingTagEnd >= card.anchorEnd) {
        return { html, installed: false };
    }

    const openingTag = html.slice(card.anchorStart, openingTagEnd + 1);
    const enhancedOpeningTag = openingTag.includes("ccg-publisher-card--has-logo")
        ? openingTag
        : openingTag.replace(
            "ccg-publisher-card--featured",
            "ccg-publisher-card--featured ccg-publisher-card--has-logo"
        );

    const logoMarkup = `\n            <span class="ccg-publisher-card__logo" data-publisher-logo="${htmlEscape(slug)}" aria-hidden="true">\n                <img src="/resources/images/publishers/${htmlEscape(slug)}.png"\n                     alt=""\n                     loading="lazy"\n                     decoding="async"\n                     onerror="this.parentElement.hidden=true;this.closest('.ccg-publisher-card')?.classList.remove('ccg-publisher-card--has-logo');">\n            </span>`;

    const nextHtml = html.slice(0, card.anchorStart)
        + enhancedOpeningTag
        + logoMarkup
        + html.slice(openingTagEnd + 1);

    return { html: nextHtml, installed: true };
}

function addLogoToPublisherHero(html, slug) {
    if (html.includes(`data-publisher-page-logo="${slug}"`)) return html;

    const imagePath = path.join(publisherImagesDir, `${slug}.png`);
    if (!fs.existsSync(imagePath)) return html;

    const titleMarker = '<h1 class="ccg-publishers-hero__title">';
    const titleIndex = html.indexOf(titleMarker);
    if (titleIndex === -1) {
        console.warn(`[publisher-logos] No publisher hero title found for ${slug}; skipping page logo.`);
        return html;
    }

    const logoMarkup = `                <div class="ccg-publisher-page-logo" data-publisher-page-logo="${htmlEscape(slug)}" aria-hidden="true">\n                    <img src="/resources/images/publishers/${htmlEscape(slug)}.png"\n                         alt=""\n                         loading="eager"\n                         decoding="async"\n                         onerror="this.parentElement.hidden=true;">\n                </div>\n`;

    return html.slice(0, titleIndex) + logoMarkup + html.slice(titleIndex);
}

function addPublisherBackLink(html) {
    if (html.includes('class="ccg-publisher-back-link"')) return html;

    const breadcrumbStart = html.indexOf('<nav class="ccg-publisher-breadcrumbs"');
    if (breadcrumbStart === -1) return html;

    const breadcrumbEnd = html.indexOf("</nav>", breadcrumbStart);
    if (breadcrumbEnd === -1) return html;

    const insertionPoint = breadcrumbEnd + "</nav>".length;
    const backLink = `\n\n            <a class="ccg-publisher-back-link" href="/games/publishers/">\n                <span aria-hidden="true">←</span> Back to All Publishers\n            </a>`;

    return html.slice(0, insertionPoint) + backLink + html.slice(insertionPoint);
}

function enhancePublisherPage(filePath, slug) {
    let html = fs.readFileSync(filePath, "utf8");
    const original = html;

    html = ensureStylesheet(html);
    html = addLogoToPublisherHero(html, slug);
    html = addPublisherBackLink(html);

    if (html !== original) fs.writeFileSync(filePath, html, "utf8");
    return html !== original;
}

if (!fs.existsSync(publisherIndexPath)) {
    fail("Publisher index does not exist. Run generate-publisher-pages.js first.");
}

let indexHtml = fs.readFileSync(publisherIndexPath, "utf8");
getSectionBounds(indexHtml);
indexHtml = ensureStylesheet(indexHtml);

EXTRA_FEATURED_PUBLISHER_SLUGS.forEach((slug) => {
    const imagePath = path.join(publisherImagesDir, `${slug}.png`);
    if (fs.existsSync(imagePath)) indexHtml = promotePublisherCard(indexHtml, slug);
});

let featuredInstalled = 0;
const logoSlugs = getLogoSlugs();
logoSlugs.forEach((slug) => {
    const result = addLogoToFeaturedCard(indexHtml, slug);
    indexHtml = result.html;
    if (result.installed) featuredInstalled += 1;
});

fs.writeFileSync(publisherIndexPath, indexHtml, "utf8");

let publisherPagesEnhanced = 0;
fs.readdirSync(publishersDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .forEach((entry) => {
        const pagePath = path.join(publishersDir, entry.name, "index.html");
        if (!fs.existsSync(pagePath)) return;
        if (enhancePublisherPage(pagePath, entry.name)) publisherPagesEnhanced += 1;
    });

console.log(`[publisher-logos] Applied ${featuredInstalled} featured publisher logo${featuredInstalled === 1 ? "" : "s"}.`);
console.log(`[publisher-logos] Enhanced ${publisherPagesEnhanced} individual publisher page${publisherPagesEnhanced === 1 ? "" : "s"}.`);
