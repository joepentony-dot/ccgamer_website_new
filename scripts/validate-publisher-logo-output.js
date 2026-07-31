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
const SUPPORTED_EXTENSIONS = [".webp", ".png", ".svg", ".jpg", ".jpeg"];

function fail(message) {
    console.error(`[publisher-logo-validation] ${message}`);
    process.exit(1);
}

function read(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

function countMatches(value, pattern) {
    return (value.match(pattern) || []).length;
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getLogoAssets() {
    const assets = new Map();

    fs.readdirSync(publisherImagesDir)
        .filter((fileName) => SUPPORTED_EXTENSIONS.includes(path.extname(fileName).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))
        .forEach((fileName) => {
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

if (!fs.existsSync(publisherIndexPath)) {
    fail("Publisher index is missing.");
}
if (!fs.existsSync(publisherImagesDir)) {
    fail("Publisher image directory is missing.");
}

const logoAssets = getLogoAssets();
if (!logoAssets.length) {
    fail("No supported publisher logo files were found.");
}

const indexHtml = read(publisherIndexPath);
if (!indexHtml.includes('/resources/css/publisher-logos.css')) {
    fail("Publisher logo stylesheet is missing from the publisher index.");
}

const missingIndexLogos = [];
const wrongIndexLogoCounts = [];

for (const asset of logoAssets) {
    const hrefPattern = new RegExp(
        `href="/games/publishers/${escapeRegExp(asset.slug)}/"`,
        "g"
    );
    const expectedCardCount = countMatches(indexHtml, hrefPattern);
    if (!expectedCardCount) continue;

    const wrapperPattern = new RegExp(
        `data-publisher-logo="${escapeRegExp(asset.slug)}"`,
        "g"
    );
    const actualLogoCount = countMatches(indexHtml, wrapperPattern);
    const expectedPath = `/resources/images/publishers/${asset.fileName}`;

    if (!indexHtml.includes(expectedPath)) {
        missingIndexLogos.push(asset.slug);
        continue;
    }

    if (actualLogoCount !== expectedCardCount) {
        wrongIndexLogoCounts.push(
            `${asset.slug} expected ${expectedCardCount}, found ${actualLogoCount}`
        );
    }
}

if (missingIndexLogos.length) {
    fail(`Publisher card logos missing from index: ${missingIndexLogos.join(", ")}`);
}
if (wrongIndexLogoCounts.length) {
    fail(`Publisher card logo counts do not match: ${wrongIndexLogoCounts.join("; ")}`);
}

const missingPageLogos = [];
let publisherPagesWithLogos = 0;

for (const asset of logoAssets) {
    const pagePath = path.join(publishersDir, asset.slug, "index.html");
    if (!fs.existsSync(pagePath)) continue;

    const pageHtml = read(pagePath);
    const expectedPath = `/resources/images/publishers/${asset.fileName}`;
    const hasLogo = pageHtml.includes(`data-publisher-page-logo="${asset.slug}"`)
        && pageHtml.includes(expectedPath);

    if (!hasLogo) {
        missingPageLogos.push(asset.slug);
        continue;
    }

    publisherPagesWithLogos += 1;
}

if (missingPageLogos.length) {
    fail(`Publisher page logos missing: ${missingPageLogos.join(", ")}`);
}

const { steps } = require("./rebuild-games");
const stepNames = steps.map(([scriptName]) => scriptName);
const generateIndex = stepNames.indexOf("generate-publisher-pages.js");
const applyIndex = stepNames.indexOf("apply-publisher-logos.js");
const validateIndex = stepNames.indexOf("validate-publisher-logo-output.js");

if (generateIndex === -1 || applyIndex !== generateIndex + 1 || validateIndex !== applyIndex + 1) {
    fail("Publisher generate/apply/validate steps are not consecutive in the authoritative rebuild.");
}

const indexLogoCount = countMatches(indexHtml, /data-publisher-logo=/g);

console.log(`[publisher-logo-validation] ${logoAssets.length} supported logo assets found.`);
console.log(`[publisher-logo-validation] ${indexLogoCount} publisher card logo placements verified.`);
console.log(`[publisher-logo-validation] ${publisherPagesWithLogos} individual publisher page logos verified.`);
console.log("[publisher-logo-validation] Authoritative rebuild order verified.");
