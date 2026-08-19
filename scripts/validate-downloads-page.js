#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
    getDownloadRecords,
    isAllowedManualUrl
} = require("./generate-downloads-page");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");
const downloadsPath = path.join(repoRoot, "games", "downloads", "index.html");
const GAME_MEDIA_EXTENSION = /\.(?:adf|adz|d64|d71|d81|g64|t64|tap|tzx|prg|crt|ipf|hdf|lha|rom)(?:[?#].*)?$/i;

function fail(message) {
    console.error(`[validate-manuals] ${message}`);
    process.exit(1);
}

function flattenLinks(value) {
    if (Array.isArray(value)) return value.flatMap(flattenLinks);
    const text = String(value || "").trim();
    return text ? [text] : [];
}

function main() {
    let games;
    try {
        games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
    } catch (error) {
        fail(`Could not parse games/games.json: ${error.message}`);
    }

    if (!Array.isArray(games)) fail("games/games.json must contain an array.");
    if (!fs.existsSync(downloadsPath)) fail("games/downloads/index.html is missing.");

    const html = fs.readFileSync(downloadsPath, "utf8");
    if (html.trim().length < 5000) {
        fail(`games/downloads/index.html is unexpectedly small (${html.trim().length} characters).`);
    }

    const invalidManualSources = games
        .filter((game) => String(game?.pdf || "").trim())
        .filter((game) => !isAllowedManualUrl(game.pdf));
    if (invalidManualSources.length) {
        fail(`Non-PDF manual source(s) found: ${invalidManualSources.slice(0, 15).map((game) => String(game?.slug || game?.title || "unknown")).join(", ")}${invalidManualSources.length > 15 ? "…" : ""}`);
    }

    const expected = getDownloadRecords(games);
    const missing = expected.filter((game) => !html.includes(`/games/${game.slug}/`));
    if (missing.length) {
        fail(`Manuals A-Z is missing ${missing.length} game(s) with PDF manuals: ${missing.slice(0, 15).map((game) => `${game.title} (${game.slug})`).join(", ")}${missing.length > 15 ? "…" : ""}`);
    }

    const missingManualLinks = expected.filter((game) => !html.includes(`href="${game.manualUrl.replace(/&/g, "&amp;")}"`));
    if (missingManualLinks.length) {
        fail(`Manuals A-Z is missing ${missingManualLinks.length} PDF link(s): ${missingManualLinks.slice(0, 15).map((game) => game.slug).join(", ")}${missingManualLinks.length > 15 ? "…" : ""}`);
    }

    const duplicateSlugs = expected
        .map((game) => game.slug)
        .filter((slug, index, values) => values.indexOf(slug) !== index);
    if (duplicateSlugs.length) {
        fail(`Duplicate manual archive slug(s): ${Array.from(new Set(duplicateSlugs)).join(", ")}`);
    }

    if (/data-direct-download/i.test(html) || />\s*Download Game\s*</i.test(html)) {
        fail("Legacy playable-game download controls remain in the manuals archive.");
    }
    if (!html.includes("data-manual-download") && expected.length) {
        fail("PDF manual controls are missing from the manuals archive.");
    }
    if (!html.includes("Documentation only")) {
        fail("The manuals archive is missing its no-game-media policy notice.");
    }

    const hrefs = Array.from(html.matchAll(/href="([^"]+)"/gi), (match) => match[1].replace(/&amp;/g, "&"));
    const binaryHrefs = hrefs.filter((href) => GAME_MEDIA_EXTENSION.test(href));
    if (binaryHrefs.length) {
        fail(`Playable game-media URL(s) found in manuals archive: ${binaryHrefs.slice(0, 10).join(", ")}`);
    }

    const legacyGameMediaUrls = new Set(
        games.flatMap((game) => flattenLinks(game?.disk)).filter(Boolean)
    );
    const exposedLegacyMedia = hrefs.filter((href) => legacyGameMediaUrls.has(href));
    if (exposedLegacyMedia.length) {
        fail(`Legacy game-media link(s) are exposed by the manuals archive: ${exposedLegacyMedia.slice(0, 10).join(", ")}`);
    }

    console.log(`[validate-manuals] ${expected.length} PDF manuals are present in Manuals A-Z.`);
    console.log("[validate-manuals] The public archive is sourced only from game.pdf manual fields.");
    console.log("[validate-manuals] Legacy game-media fields are checked only to prove their URLs are not exposed.");
    console.log("[validate-manuals] No ADF, D64, tape, cartridge or other playable game-media links are present.");
}

main();
