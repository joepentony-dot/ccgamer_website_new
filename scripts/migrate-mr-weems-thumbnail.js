#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const gamesPath = path.resolve(__dirname, "..", "games", "games.json");
const oldPath = "resources/images/thumbnails/all/mr-weems-and-the-she-vampires.webp";
const newPath = "resources/images/thumbnails/all/mr-weems-and-the-she-vampires.jpg";
const newFile = path.resolve(__dirname, "..", ...newPath.split("/"));

if (!fs.existsSync(newFile)) {
  throw new Error(`Expected thumbnail is missing: ${newPath}`);
}

const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
const game = games.find((entry) => entry && entry.slug === "mr-weems-and-the-she-vampires");
if (!game) throw new Error("Mr Weems game entry was not found.");

if (game.thumbnail === newPath) {
  console.log("Mr Weems thumbnail source already points to the JPEG.");
  process.exit(0);
}

if (game.thumbnail !== oldPath) {
  throw new Error(`Unexpected Mr Weems thumbnail source: ${game.thumbnail || "(blank)"}`);
}

game.thumbnail = newPath;
fs.writeFileSync(gamesPath, `${JSON.stringify(games, null, 2)}\n`, "utf8");
console.log(`Mr Weems thumbnail source corrected: ${oldPath} -> ${newPath}`);
