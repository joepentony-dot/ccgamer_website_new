#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ACTIVE_TAG = "cheekycomm00d-21";
const RETIRED_TAG = "cheekycommo0d-21";
const REQUIRED_DISCLOSURE = "As an Amazon Associate I earn from qualifying purchases.";

const failures = [];

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message) {
    failures.push(message);
}

function expect(condition, message) {
    if (!condition) fail(message);
}

function expectText(source, needle, message) {
    expect(source.includes(needle), message || `Missing expected text: ${needle}`);
}

const configPath = "resources/data/affiliate-products.json";
const rendererPath = "js/affiliate-products.js";
const loaderPath = "js/ccg-livestream-status.js";
const disclosurePath = "affiliate-disclosure.html";
const stylePath = "resources/css/ccg-affiliate-showcase.css";

let config;
try {
    config = JSON.parse(read(configPath));
} catch (error) {
    fail(`${configPath} is not valid JSON: ${error.message}`);
    config = {};
}

expect(config?.account?.activeTag === ACTIVE_TAG, `Active Amazon tag must be ${ACTIVE_TAG}`);
expect(Array.isArray(config?.account?.retiredTags) && config.account.retiredTags.includes(RETIRED_TAG), `Retired Amazon tag ${RETIRED_TAG} must remain deny-listed`);
expect(config?.account?.disclosure === REQUIRED_DISCLOSURE, "Amazon disclosure text does not match the required statement");
expect(config?.defaults?.enabled === true, "Affiliate catalogue must be explicitly enabled");
expect(Number(config?.defaults?.maxProducts) === 3, "Game-page recommendation limit must remain three products");

const products = config?.products && typeof config.products === "object" ? config.products : {};
expect(Object.keys(products).length >= 10, "Expected at least the agreed ten-product launch catalogue");

for (const [productId, product] of Object.entries(products)) {
    const asin = String(product?.asin || "").trim();
    const rawUrl = String(product?.url || "").trim();
    expect(Boolean(asin), `${productId}: missing ASIN`);
    expect(Boolean(rawUrl), `${productId}: missing Amazon URL`);
    if (!rawUrl) continue;

    let url;
    try {
        url = new URL(rawUrl);
    } catch (error) {
        fail(`${productId}: invalid URL (${error.message})`);
        continue;
    }

    const host = url.hostname.toLowerCase();
    const tag = (url.searchParams.get("tag") || "").toLowerCase();
    expect(url.protocol === "https:", `${productId}: Amazon link must use HTTPS`);
    expect(host === "amazon.co.uk" || host.endsWith(".amazon.co.uk"), `${productId}: link must stay on Amazon.co.uk`);
    expect(tag === ACTIVE_TAG, `${productId}: link does not use active tag ${ACTIVE_TAG}`);
    expect(tag !== RETIRED_TAG, `${productId}: retired tag must not appear in live product URL`);
    expect(!host.includes("amzn.to"), `${productId}: shortened Amazon links are not allowed in the new catalogue`);
    if (asin) {
        expect(url.pathname.toLowerCase().includes(asin.toLowerCase()), `${productId}: URL path does not contain expected ASIN ${asin}`);
    }
}

const groups = config?.groups && typeof config.groups === "object" ? config.groups : {};
for (const [groupId, group] of Object.entries(groups)) {
    const ids = Array.isArray(group?.products) ? group.products : [];
    expect(ids.length > 0, `${groupId}: recommendation group is empty`);
    expect(ids.length <= 3, `${groupId}: recommendation group exceeds the three-product conversion limit`);
    ids.forEach((productId) => {
        expect(Boolean(products[productId]), `${groupId}: references unknown product ${productId}`);
    });
}

expect(config?.systemGroups?.C64 === "c64-default", "C64 pages must map to the C64 recommendation group");
expect(config?.systemGroups?.AMIGA === "amiga-default" || config?.systemGroups?.Amiga === "amiga-default", "Amiga pages must map to the Amiga recommendation group");

const spotlight = config?.homepageSpotlight || {};
expect(spotlight.enabled === true, "THEA1200 home spotlight must be enabled");
expect(spotlight.product === "thea1200", "Home spotlight must point at THEA1200");
expect(spotlight.start === "2026-09-01T00:00:00Z", "THEA1200 campaign start date changed unexpectedly");
expect(spotlight.end === "2026-12-31T23:59:59Z", "THEA1200 campaign must expire at the end of 2026");
expect(products?.thea1200?.releaseDate === "2026-12-04T00:00:00Z", "THEA1200 release date must remain 4 December 2026");
expectText(String(spotlight.copy || ""), "helps support the channel", "THEA1200 home copy must explain that the affiliate link supports the channel");

const renderer = read(rendererPath);
expectText(renderer, 'link.rel = "nofollow sponsored noopener"', "Affiliate links must use sponsored/nofollow/noopener relationship attributes");
expectText(renderer, 'data-ccg-revenue-link", "amazon-associates-2026"', "New affiliate links need the 2026 revenue marker");
expectText(renderer, 'window.addEventListener("ccg:game-loaded"', "Renderer must refresh after game data is loaded");
expectText(renderer, 'window.addEventListener("load"', "Renderer must have a post-DOM legacy-cleanup recovery pass");
expectText(renderer, "ccg-affiliate-showcase.css", "Renderer must load the dedicated showcase stylesheet");
expectText(renderer, "Pre-order on Amazon", "THEA1200 pre-release CTA handling is missing");

const loader = read(loaderPath);
expectText(loader, 'script.src = "/js/affiliate-products.js"', "Home page loader must load the affiliate showcase renderer");
expect(loader.indexOf("loadHomeAffiliateShowcase();") < loader.indexOf("if (!API_KEY)"), "Home affiliate loader must run even when the YouTube API key is absent");

const disclosure = read(disclosurePath);
expectText(disclosure, REQUIRED_DISCLOSURE, "Affiliate disclosure page is missing the required Amazon statement");
expectText(disclosure, 'rel="canonical" href="https://www.cheekycommodoregamer.co.uk/affiliate-disclosure.html"', "Affiliate disclosure must self-canonicalise");
expect(!disclosure.includes('name="robots" content="noindex,nofollow"'), "Active affiliate disclosure page must not retain the retired noindex directive");
expectText(disclosure, "Amazon affiliate links active", "Affiliate disclosure page still describes a retired programme");

const styles = read(stylePath);
expectText(styles, ".affiliate-products-section--showcase", "Game-page affiliate showcase styling is missing");
expectText(styles, ".ccg-home-affiliate-spotlight", "THEA1200 home spotlight styling is missing");
expectText(styles, "@media (max-width: 620px)", "Affiliate showcase needs small-phone responsive rules");

if (failures.length) {
    console.error(`Amazon Associates reactivation audit FAILED (${failures.length} issue${failures.length === 1 ? "" : "s"}):`);
    failures.forEach((message) => console.error(` - ${message}`));
    process.exit(1);
}

console.log(`Amazon Associates reactivation audit passed: ${Object.keys(products).length} products, ${Object.keys(groups).length} contextual groups, THEA1200 campaign protected.`);
