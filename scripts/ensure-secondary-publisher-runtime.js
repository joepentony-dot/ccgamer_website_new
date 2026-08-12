#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");
const checkOnly = process.argv.includes("--check");
const runtimeTag = '<script src="/js/game-secondary-publisher-runtime.js" defer></script>';
const loadSingleGamePattern = /<script\s+src="(?:\.\.\/|\/)js\/load-single-game\.js"\s+defer><\/script>/i;

function fail(message) {
    console.error(`[secondary-publisher-runtime] ${message}`);
    process.exit(1);
}

function readGames() {
    try {
        const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
        if (!Array.isArray(games)) fail("games/games.json must contain an array.");
        return games;
    } catch (error) {
        fail(`Could not read games/games.json: ${error.message}`);
    }
}

function main() {
    const games = readGames();
    const missing = [];
    let checked = 0;
    let changed = 0;

    for (const game of games) {
        const slug = String(game?.slug || "").trim();
        if (!slug) continue;
        const filePath = path.join(repoRoot, "games", slug, "index.html");
        if (!fs.existsSync(filePath)) fail(`Canonical page missing for ${slug}.`);

        checked += 1;
        const html = fs.readFileSync(filePath, "utf8");
        if (html.includes(runtimeTag)) continue;

        if (checkOnly) {
            missing.push(slug);
            continue;
        }

        const anchor = html.match(loadSingleGamePattern)?.[0] || "";
        if (!anchor) fail(`${path.relative(repoRoot, filePath)} is missing load-single-game.js.`);

        const next = html.replace(anchor, `${anchor}\n${runtimeTag}`);
        fs.writeFileSync(filePath, next, "utf8");
        changed += 1;
    }

    if (checkOnly && missing.length) {
        fail(`Secondary publisher runtime missing from ${missing.length} canonical page(s): ${missing.slice(0, 12).join(", ")}${missing.length > 12 ? "…" : ""}`);
    }

    if (checkOnly) {
        console.log(`[secondary-publisher-runtime] Checked ${checked} canonical game pages; runtime present on all pages.`);
    } else {
        console.log(`[secondary-publisher-runtime] Checked ${checked} canonical game pages; updated ${changed}.`);
    }
}

main();
