#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
  FEATURED_PUBLISHERS,
  slugifyPublisher,
} = require("./publisher-utils");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const publishersDir = path.join(repoRoot, "games", "publishers");
const publisherIndexPath = path.join(publishersDir, "index.html");
const publisherImagesDir = path.join(repoRoot, "resources", "images", "publishers");
const EXTRA_FEATURED_PUBLISHER_SLUGS = ["microprose-software"];

function fail(message) {
  console.error(`[publisher-logo-validation] ${message}`);
  process.exit(1);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

if (!fs.existsSync(publisherIndexPath)) {
  fail("Publisher index is missing.");
}
if (!fs.existsSync(publisherImagesDir)) {
  fail("Publisher image directory is missing.");
}

const logoSlugs = fs.readdirSync(publisherImagesDir)
  .filter((fileName) => fileName.toLowerCase().endsWith(".png"))
  .map((fileName) => path.basename(fileName, path.extname(fileName)))
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

if (!logoSlugs.length) {
  fail("No publisher PNG logos were found.");
}

const indexHtml = read(publisherIndexPath);
if (!indexHtml.includes('/resources/css/publisher-logos.css')) {
  fail("Publisher logo stylesheet is missing from the publisher index.");
}

const expectedFeaturedSlugs = Array.from(new Set([
  ...FEATURED_PUBLISHERS.map(slugifyPublisher),
  ...EXTRA_FEATURED_PUBLISHER_SLUGS,
])).filter((slug) => logoSlugs.includes(slug));

const missingFeatured = expectedFeaturedSlugs.filter((slug) => (
  !indexHtml.includes(`data-publisher-logo="${slug}"`)
  || !indexHtml.includes(`/resources/images/publishers/${slug}.png`)
));
if (missingFeatured.length) {
  fail(`Featured publisher logos missing from index: ${missingFeatured.join(", ")}`);
}

const indexLogoCount = (indexHtml.match(/data-publisher-logo=/g) || []).length;
if (indexLogoCount !== expectedFeaturedSlugs.length) {
  fail(`Expected ${expectedFeaturedSlugs.length} featured logo wrappers but found ${indexLogoCount}.`);
}

const missingPageLogos = [];
let publisherPagesWithLogos = 0;
for (const slug of logoSlugs) {
  const pagePath = path.join(publishersDir, slug, "index.html");
  if (!fs.existsSync(pagePath)) continue;
  const pageHtml = read(pagePath);
  const hasLogo = pageHtml.includes(`data-publisher-page-logo="${slug}"`)
    && pageHtml.includes(`/resources/images/publishers/${slug}.png`);
  if (!hasLogo) {
    missingPageLogos.push(slug);
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

console.log(`[publisher-logo-validation] ${expectedFeaturedSlugs.length} featured logos verified.`);
console.log(`[publisher-logo-validation] ${publisherPagesWithLogos} individual publisher page logos verified.`);
console.log("[publisher-logo-validation] Authoritative rebuild order verified.");
