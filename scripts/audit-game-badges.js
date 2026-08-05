#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const problems = [];

function requireFile(relativePath) {
    const filePath = path.join(root, relativePath);
    if (!fs.existsSync(filePath)) {
        problems.push(`Missing required file: ${relativePath}.`);
        return "";
    }
    if (!fs.statSync(filePath).size) problems.push(`Empty required file: ${relativePath}.`);
    return fs.readFileSync(filePath, "utf8");
}

[
    "resources/images/zzap64/zzap64-gold-medal.webp",
    "resources/images/zzap64/zzap64-silver-medal.svg",
    "resources/images/zzap64/zzap64-sizzler.webp",
    "resources/images/platforms/commodore-64-logo.webp",
    "resources/images/platforms/commodore-amiga-logo.webp"
].forEach(requireFile);

const script = requireFile("js/ccg-game-badges.js");
const css = requireFile("resources/css/ccg-game-badges.css");
const nav = requireFile("js/ccg-nav-core.js");

[
    "/games/games.json",
    "/data/zzap64-awards/",
    "ccg-zzap64-matcher.js",
    "commodore-64-logo.webp",
    "commodore-amiga-logo.webp",
    "zzap64-gold-medal.webp",
    "zzap64-silver-medal.svg",
    "zzap64-sizzler.webp",
    "Silver Medal",
    ".game-hero__meta",
    ".ccg-game-badges"
].forEach((needle) => {
    if (!script.includes(needle)) problems.push(`Game badge script is missing: ${needle}.`);
});

[
    ".ccg-game-badges",
    ".ccg-game-badge--platform-c64",
    ".ccg-game-badge--platform-amiga",
    ".ccg-game-badge--gold",
    ".ccg-game-badge--silver",
    ".ccg-game-badge--sizzler"
].forEach((selector) => {
    if (!css.includes(selector)) problems.push(`Game badge stylesheet is missing: ${selector}.`);
});

if (!nav.includes("/js/ccg-game-badges.js")) {
    problems.push("The shared navigation core does not load the game badge module.");
}

const games = JSON.parse(requireFile("games/games.json"));
const gameList = Array.isArray(games) ? games : (games.games || []);
const supported = gameList.filter((game) => /c64|commodore 64|amiga/i.test(String(game.system || game.platform || "")));
if (!supported.length) problems.push("No C64 or Amiga games were found for platform badges.");

if (problems.length) {
    console.error("Game badge audit failed:");
    problems.forEach((problem) => console.error(` - ${problem}`));
    process.exit(1);
}

console.log(`Game badge audit passed for ${supported.length} C64 and Amiga games, including Gold Medal, Silver Medal and Sizzler artwork.`);
