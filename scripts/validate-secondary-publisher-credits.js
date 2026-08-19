#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
    getSecondaryPublisherNames,
    canonicalizePublisherName,
    normalizeSystem
} = require("./publisher-utils");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");
const rulesPath = path.join(repoRoot, "data", "publisher-secondary-credits.json");

function fail(message) {
    console.error(`[secondary-publishers] ${message}`);
    process.exit(1);
}

function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
    }
}

function main() {
    const games = readJson(gamesPath);
    const payload = readJson(rulesPath);
    if (!Array.isArray(games)) fail("games/games.json must contain an array.");
    if (!Array.isArray(payload?.rules)) fail("data/publisher-secondary-credits.json must contain a rules array.");

    for (const rule of payload.rules) {
        const publisher = canonicalizePublisherName(rule?.publisher);
        const sourceTitles = Array.isArray(rule?.titles) ? rule.titles : [];
        if (!publisher) fail("Every secondary publisher rule requires a publisher name.");
        if (!sourceTitles.length) fail(`${publisher}: source title list is empty.`);
        if (!/^https:\/\//i.test(String(rule?.source || ""))) fail(`${publisher}: source URL must use HTTPS.`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(rule?.verified_on || ""))) fail(`${publisher}: verified_on must use YYYY-MM-DD.`);

        if (publisher === "Americana" && sourceTitles.length !== 34) {
            fail(`Americana source catalogue must contain the 34 approved archive entries; found ${sourceTitles.length}.`);
        }

        const matches = games.filter((game) => {
            if (rule?.system && normalizeSystem(game) !== String(rule.system)) return false;
            return getSecondaryPublisherNames(game).includes(publisher);
        });

        if (!matches.length) fail(`${publisher}: none of the source titles match the current game archive.`);
        if (publisher === "Americana" && !matches.some((game) => String(game?.slug || "") === "go-for-the-gold")) {
            fail("Americana: Go For The Gold must match the secondary-publisher catalogue.");
        }

        console.log(`[secondary-publishers] ${publisher}: ${matches.length} existing CCG game(s) matched from ${sourceTitles.length} source titles.`);
        console.log(`[secondary-publishers] ${publisher} matches: ${matches.map((game) => String(game?.title || game?.slug || "Game")).join(" | ")}`);
    }

    console.log("[secondary-publishers] Source-backed secondary publisher mappings passed.");
}

main();
