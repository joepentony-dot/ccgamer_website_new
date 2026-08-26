#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const gamesPath = path.resolve(__dirname, "..", "games", "games.json");
const oldPath = "resources/images/thumbnails/all/ruff-n-tumble.png";
const newPath = "resources/images/thumbnails/all/ruff_n_tumble.png";
const newFile = path.resolve(__dirname, "..", ...newPath.split("/"));

if (!fs.existsSync(newFile)) {
  throw new Error(`Expected Ruff 'N' Tumble thumbnail is missing: ${newPath}`);
}

const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
const game = games.find((entry) => entry && entry.slug === "ruff-n-tumble");
if (!game) throw new Error("Ruff 'N' Tumble game entry was not found.");

if (game.thumbnail === newPath) {
  console.log("Ruff 'N' Tumble thumbnail source already points to the underscore PNG.");
  process.exit(0);
}

if (game.thumbnail !== oldPath) {
  throw new Error(`Ruff 'N' Tumble thumbnail source is ${game.thumbnail || "(blank)"}; expected historical path ${oldPath}.`);
}

game.thumbnail = newPath;
fs.writeFileSync(gamesPath, `${JSON.stringify(games, null, 2)}\n`, "utf8");
console.log(`Ruff 'N' Tumble thumbnail source corrected: ${oldPath} -> ${newPath}`);
