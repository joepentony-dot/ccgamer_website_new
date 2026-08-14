#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { hasAuthorisedDownload } = require("./download-eligibility");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");
const downloadsPath = path.join(repoRoot, "games", "downloads", "index.html");

function fail(message) {
    console.error(`[validate-downloads] ${message}`);
    process.exit(1);
}

function normalizeLinks(value) {
    const values = Array.isArray(value)
        ? value
        : (value === null || value === undefined || value === "" ? [] : [value]);

    return values
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean)
        .filter((entry) => !/^(?:n\/?a|none|null|undefined|#)$/i.test(entry));
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
    if (html.trim().length < 10000) {
        fail(`games/downloads/index.html is unexpectedly small (${html.trim().length} characters).`);
    }

    const expected = games
        .map((game) => ({
            slug: String(game?.slug || "").trim(),
            title: String(game?.title || "").trim(),
            links: hasAuthorisedDownload(game) ? normalizeLinks(game?.disk) : []
        }))
        .filter((game) => game.slug && game.title && game.links.length > 0);

    const missing = expected.filter((game) => !html.includes(`/games/${game.slug}/`));
    if (missing.length) {
        fail(`Downloads A-Z is missing ${missing.length} downloadable game(s): ${missing.slice(0, 15).map((game) => `${game.title} (${game.slug})`).join(", ")}${missing.length > 15 ? "…" : ""}`);
    }

    const duplicateSlugs = expected
        .map((game) => game.slug)
        .filter((slug, index, values) => values.indexOf(slug) !== index);
    if (duplicateSlugs.length) {
        fail(`Duplicate downloadable game slug(s) in games.json: ${Array.from(new Set(duplicateSlugs)).join(", ")}`);
    }

    console.log(`[validate-downloads] ${expected.length} downloadable games are present in Game Downloads A-Z.`);
    console.log("[validate-downloads] Only explicitly authorised, public-domain or freeware downloads are included in Game Downloads A-Z.");
}

main();
