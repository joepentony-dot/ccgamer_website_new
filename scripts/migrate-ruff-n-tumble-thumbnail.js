#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const gamesPath = path.join(ROOT, "games", "games.json");
const historicalThumbnail = "resources/images/thumbnails/all/ruff-n-tumble.png";
const canonicalThumbnail = "resources/images/thumbnails/all/ruff_n_tumble.png";
const canonicalThumbnailFile = path.join(ROOT, ...canonicalThumbnail.split("/"));
const canonicalLemonUrl = "https://www.lemonamiga.com/game/ruff-n-tumble";
const canonicalYear = 1994;

if (!fs.existsSync(canonicalThumbnailFile)) {
  throw new Error(`Expected Ruff 'N' Tumble thumbnail is missing: ${canonicalThumbnail}`);
}

const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
const game = games.find((entry) => entry && entry.slug === "ruff-n-tumble");
if (!game) throw new Error("Ruff 'N' Tumble game entry was not found.");

const changes = [];

if (game.thumbnail !== canonicalThumbnail) {
  if (game.thumbnail && game.thumbnail !== historicalThumbnail) {
    throw new Error(`Ruff 'N' Tumble thumbnail source is ${game.thumbnail}; expected ${historicalThumbnail} or ${canonicalThumbnail}.`);
  }
  game.thumbnail = canonicalThumbnail;
  changes.push(`thumbnail ${historicalThumbnail} -> ${canonicalThumbnail}`);
}

if (game.year !== canonicalYear) {
  changes.push(`year ${game.year || "(blank)"} -> ${canonicalYear}`);
  game.year = canonicalYear;
}

const lemonUrls = Array.isArray(game.lemon) ? game.lemon.filter(Boolean) : (game.lemon ? [game.lemon] : []);
if (lemonUrls.length !== 1 || lemonUrls[0] !== canonicalLemonUrl) {
  const oldValue = lemonUrls.length ? lemonUrls.join(", ") : "(blank)";
  game.lemon = [canonicalLemonUrl];
  changes.push(`Lemon source ${oldValue} -> ${canonicalLemonUrl}`);
}

if (!changes.length) {
  console.log("Ruff 'N' Tumble source is already canonical (1994, underscore thumbnail, Lemon Amiga reference).");
  process.exit(0);
}

fs.writeFileSync(gamesPath, `${JSON.stringify(games, null, 2)}\n`, "utf8");
console.log(`Ruff 'N' Tumble source corrected: ${changes.join("; ")}`);
