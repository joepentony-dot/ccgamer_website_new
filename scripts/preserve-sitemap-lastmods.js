#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const baselineDir = process.argv[2] ? path.resolve(process.argv[2]) : "";

function readRequired(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing required sitemap snapshot: ${filePath}`);
    }
    return fs.readFileSync(filePath, "utf8");
}

function extractValue(block, tagName) {
    const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
    return match ? match[1].trim() : "";
}

function collectLastmods(xml, blockName) {
    const map = new Map();
    const pattern = new RegExp(`<${blockName}>[\\s\\S]*?<\\/${blockName}>`, "gi");
    for (const block of xml.match(pattern) || []) {
        const loc = extractValue(block, "loc");
        const lastmod = extractValue(block, "lastmod");
        if (loc && lastmod) map.set(loc, lastmod);
    }
    return map;
}

function restoreExistingEntries(fileName, blockName) {
    const baselinePath = path.join(baselineDir, fileName);
    const currentPath = path.join(repoRoot, fileName);
    const baseline = readRequired(baselinePath);
    const generated = readRequired(currentPath);
    const baselineLastmods = collectLastmods(baseline, blockName);
    const pattern = new RegExp(`<${blockName}>[\\s\\S]*?<\\/${blockName}>`, "gi");
    let restoredCount = 0;

    const next = generated.replace(pattern, (block) => {
        const loc = extractValue(block, "loc");
        const oldLastmod = baselineLastmods.get(loc);
        if (!oldLastmod) return block;

        const currentLastmod = extractValue(block, "lastmod");
        if (!currentLastmod || currentLastmod === oldLastmod) return block;
        restoredCount += 1;
        return block.replace(
            /<lastmod>[\s\S]*?<\/lastmod>/i,
            `<lastmod>${oldLastmod}</lastmod>`
        );
    });

    fs.writeFileSync(currentPath, next, "utf8");
    return {
        changedFromBaseline: next !== baseline,
        restoredCount
    };
}

function restoreSitemapIndex(pagesChanged, gamesChanged) {
    const fileName = "sitemap.xml";
    const baseline = readRequired(path.join(baselineDir, fileName));
    const currentPath = path.join(repoRoot, fileName);
    const generated = readRequired(currentPath);
    const baselineLastmods = collectLastmods(baseline, "sitemap");
    const pattern = /<sitemap>[\s\S]*?<\/sitemap>/gi;
    let restoredCount = 0;

    const next = generated.replace(pattern, (block) => {
        const loc = extractValue(block, "loc");
        const childChanged = loc.endsWith("/sitemap-pages.xml")
            ? pagesChanged
            : loc.endsWith("/sitemap-games.xml")
                ? gamesChanged
                : true;
        if (childChanged) return block;

        const oldLastmod = baselineLastmods.get(loc);
        const currentLastmod = extractValue(block, "lastmod");
        if (!oldLastmod || !currentLastmod || oldLastmod === currentLastmod) return block;
        restoredCount += 1;
        return block.replace(
            /<lastmod>[\s\S]*?<\/lastmod>/i,
            `<lastmod>${oldLastmod}</lastmod>`
        );
    });

    fs.writeFileSync(currentPath, next, "utf8");
    return restoredCount;
}

function main() {
    if (!baselineDir || !fs.existsSync(baselineDir)) {
        throw new Error("Usage: node scripts/preserve-sitemap-lastmods.js <baseline-sitemap-directory>");
    }

    const pages = restoreExistingEntries("sitemap-pages.xml", "url");
    const games = restoreExistingEntries("sitemap-games.xml", "url");
    const indexRestored = restoreSitemapIndex(pages.changedFromBaseline, games.changedFromBaseline);

    console.log(JSON.stringify({
        pagesLastmodsRestored: pages.restoredCount,
        gamesLastmodsRestored: games.restoredCount,
        sitemapIndexLastmodsRestored: indexRestored,
        pagesChangedFromBaseline: pages.changedFromBaseline,
        gamesChangedFromBaseline: games.changedFromBaseline
    }, null, 2));
}

main();
