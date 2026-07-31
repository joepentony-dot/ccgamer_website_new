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
const SUPPORTED_EXTENSIONS = [".webp", ".png", ".svg", ".jpg", ".jpeg"];

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

function findPublisherCard(html, slug, searchStart = 0, searchEnd = html.length) {
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

function getLogoAssets() {
    if (!fs.existsSync(publisherImagesDir)) return [];

    const files = fs.readdirSync(publisherImagesDir)
        .filter((fileName) => SUPPORTED_EXTENSIONS.includes(path.extname(fileName).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

    const assets = new Map();
    files.forEach((fileName) => {
        const extension = path.extname(fileName).toLowerCase();
        const slug = path.basename(fileName, extension);
        if (!slug || slug.startsWith("_")) return;

        const current = assets.get(slug);
        if (!current || SUPPORTED_EXTENSIONS.indexOf(extension) < SUPPORTED_EXTENSIONS.indexOf(current.extension)) {
            assets.set(slug, { slug, fileName, extension });
        }
    });

    return Array.from(assets.values()).sort((a, b) => (
        a.slug.localeCompare(b.slug, "en", { sensitivity: "base" })
    ));
}

function ensureHasLogoClass(openingTag) {
    if (openingTag.includes("ccg-publisher-card--has-logo")) return openingTag;

    return openingTag.replace(
        /class="([^"]*\bccg-publisher-card\b[^"]*)"/,
        (match, classNames) => `class="${classNames.trim()} ccg-publisher-card--has-logo"`
    );
}

function cardLogoMarkup(asset) {
    const slug = htmlEscape(asset.slug);
    const fileName = htmlEscape(asset.fileName);

    return `
            <span class="ccg-publisher-card__logo" data-publisher-logo="${slug}" aria-hidden="true">
                <img src="/resources/images/publishers/${fileName}"
                     alt=""
                     loading="lazy"
                     decoding="async"
                     onerror="this.parentElement.hidden=true;this.closest('.ccg-publisher-card')?.classList.remove('ccg-publisher-card--has-logo');">
            </span>`;
}

function addLogoToPublisherCards(html, asset) {
    const hrefMarker = `href="/games/publishers/${asset.slug}/"`;
    let cursor = 0;
    let installed = 0;

    while (cursor < html.length) {
        const hrefIndex = html.indexOf(hrefMarker, cursor);
        if (hrefIndex === -1) break;

        const anchorStart = html.lastIndexOf("<a ", hrefIndex);
        const anchorEndMarker = html.indexOf("</a>", hrefIndex);
        if (anchorStart === -1 || anchorEndMarker === -1) break;

        const anchorEnd = anchorEndMarker + 4;
        const cardHtml = html.slice(anchorStart, anchorEnd);
        if (!cardHtml.includes("ccg-publisher-card")) {
            cursor = anchorEnd;
            continue;
        }

        if (cardHtml.includes(`data-publisher-logo="${asset.slug}"`)) {
            cursor = anchorEnd;
            continue;
        }

        const openingTagEnd = html.indexOf(">", anchorStart);
        if (openingTagEnd === -1 || openingTagEnd >= anchorEnd) {
            cursor = anchorEnd;
            continue;
        }

        const openingTag = html.slice(anchorStart, openingTagEnd + 1);
        const enhancedOpeningTag = ensureHasLogoClass(openingTag);
        const logoMarkup = cardLogoMarkup(asset);

        html = html.slice(0, anchorStart)
            + enhancedOpeningTag
            + logoMarkup
            + html.slice(openingTagEnd + 1);

        installed += 1;
        cursor = anchorEnd + (enhancedOpeningTag.length - openingTag.length) + logoMarkup.length;
    }

    return { html, installed };
}

function addLogoToPublisherHero(html, asset) {
    if (!asset || html.includes(`data-publisher-page-logo="${asset.slug}"`)) return html;

    const titleMarker = '<h1 class="ccg-publishers-hero__title">';
    const titleIndex = html.indexOf(titleMarker);
    if (titleIndex === -1) {
        console.warn(`[publisher-logos] No publisher hero title found for ${asset.slug}; skipping page logo.`);
        return html;
    }

    const logoMarkup = `                <div class="ccg-publisher-page-logo" data-publisher-page-logo="${htmlEscape(asset.slug)}" aria-hidden="true">
                    <img src="/resources/images/publishers/${htmlEscape(asset.fileName)}"
                         alt=""
                         loading="eager"
                         decoding="async"
                         onerror="this.parentElement.hidden=true;">
                </div>
`;

    return html.slice(0, titleIndex) + logoMarkup + html.slice(titleIndex);
}

function addPublisherBackLink(html) {
    if (html.includes('class="ccg-publisher-back-link"')) return html;

    const breadcrumbStart = html.indexOf('<nav class="ccg-publisher-breadcrumbs"');
    if (breadcrumbStart === -1) return html;

    const breadcrumbEnd = html.indexOf("</nav>", breadcrumbStart);
    if (breadcrumbEnd === -1) return html;

    const insertionPoint = breadcrumbEnd + "</nav>".length;
    const backLink = `

            <a class="ccg-publisher-back-link" href="/games/publishers/">
                <span aria-hidden="true">←</span> Back to All Publishers
            </a>`;

    return html.slice(0, insertionPoint) + backLink + html.slice(insertionPoint);
}

function enhancePublisherPage(filePath, slug, asset) {
    let html = fs.readFileSync(filePath, "utf8");
    const original = html;

    html = ensureStylesheet(html);
    html = addLogoToPublisherHero(html, asset);
    html = addPublisherBackLink(html);

    html = html.replace(/[ \t]+$/gm, "");
    if (html !== original) fs.writeFileSync(filePath, html, "utf8");
    return html !== original;
}

if (!fs.existsSync(publisherIndexPath)) {
    fail("Publisher index does not exist. Run generate-publisher-pages.js first.");
}

let indexHtml = fs.readFileSync(publisherIndexPath, "utf8");
getSectionBounds(indexHtml);
indexHtml = ensureStylesheet(indexHtml);

const logoAssets = getLogoAssets();
const assetsBySlug = new Map(logoAssets.map((asset) => [asset.slug, asset]));

EXTRA_FEATURED_PUBLISHER_SLUGS.forEach((slug) => {
    if (assetsBySlug.has(slug)) indexHtml = promotePublisherCard(indexHtml, slug);
});

let cardLogosInstalled = 0;
logoAssets.forEach((asset) => {
    const result = addLogoToPublisherCards(indexHtml, asset);
    indexHtml = result.html;
    cardLogosInstalled += result.installed;
});

indexHtml = indexHtml.replace(/[ \t]+$/gm, "");
fs.writeFileSync(publisherIndexPath, indexHtml, "utf8");

let publisherPagesEnhanced = 0;
let publisherPageLogosAvailable = 0;
fs.readdirSync(publishersDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .forEach((entry) => {
        const pagePath = path.join(publishersDir, entry.name, "index.html");
        if (!fs.existsSync(pagePath)) return;

        const asset = assetsBySlug.get(entry.name);
        if (asset) publisherPageLogosAvailable += 1;
        if (enhancePublisherPage(pagePath, entry.name, asset)) publisherPagesEnhanced += 1;
    });

console.log(`[publisher-logos] Found ${logoAssets.length} publisher logo asset${logoAssets.length === 1 ? "" : "s"}.`);
console.log(`[publisher-logos] Added ${cardLogosInstalled} publisher card logo${cardLogosInstalled === 1 ? "" : "s"} across featured and full grids.`);
console.log(`[publisher-logos] ${publisherPageLogosAvailable} individual publisher page${publisherPageLogosAvailable === 1 ? " has" : "s have"} a matching logo.`);
console.log(`[publisher-logos] Enhanced ${publisherPagesEnhanced} publisher page${publisherPagesEnhanced === 1 ? "" : "s"} with logo styling or wayfinding.`);
