#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");

const publisherIndexPath = path.join(repoRoot, "games", "publishers", "index.html");
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

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    const { featuredStart, allPublishersStart } = getSectionBounds(html);
    const card = findPublisherCard(html, slug, featuredStart, allPublishersStart);
    if (!card) return { html, installed: false };

    const openingTagEnd = card.html.indexOf(">");
    if (openingTagEnd === -1) return { html, installed: false };

    const openingTag = card.html.slice(0, openingTagEnd + 1);
    const enhancedOpeningTag = openingTag.includes("ccg-publisher-card--has-logo")
        ? openingTag
        : openingTag.replace(
            "ccg-publisher-card--featured",
            "ccg-publisher-card--featured ccg-publisher-card--has-logo"
        );

    const logoMarkup = `
            <span class="ccg-publisher-card__logo" data-publisher-logo="${htmlEscape(slug)}">
                <img src="/resources/images/publishers/${htmlEscape(slug)}.png"
                     alt=""
                     aria-hidden="true"
                     loading="lazy"
                     decoding="async"
                     onerror="this.parentElement.hidden=true;this.parentElement.parentElement.classList.remove('ccg-publisher-card--has-logo');this.remove();">
            </span>`;

    const existingLogoPattern = new RegExp(
        `\\s*<span class="ccg-publisher-card__logo" data-publisher-logo="${escapeRegExp(slug)}">[\\s\\S]*?<\\/span>`
    );

    let updatedCard = card.html.replace(openingTag, enhancedOpeningTag);
    if (existingLogoPattern.test(updatedCard)) {
        updatedCard = updatedCard.replace(existingLogoPattern, logoMarkup);
    } else {
        updatedCard = updatedCard.replace(enhancedOpeningTag, enhancedOpeningTag + logoMarkup);
    }

    const nextHtml = html.slice(0, card.anchorStart)
        + updatedCard
        + html.slice(card.anchorEnd);

    return { html: nextHtml, installed: true };
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

EXTRA_FEATURED_PUBLISHER_SLUGS.forEach((slug) => {
    const imagePath = path.join(publisherImagesDir, `${slug}.png`);
    if (fs.existsSync(imagePath)) html = promotePublisherCard(html, slug);
});

let installed = 0;
getLogoSlugs().forEach((slug) => {
    const result = addLogoToFeaturedCard(html, slug);
    html = result.html;
    if (result.installed) installed += 1;
});

fs.writeFileSync(publisherIndexPath, html, "utf8");
console.log(`[publisher-logos] Applied ${installed} featured publisher logo${installed === 1 ? "" : "s"}.`);
