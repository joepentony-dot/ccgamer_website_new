#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const GAMES_PATH = path.join(ROOT, "games", "games.json");
const CANONICAL_LEMON_URL = "https://www.lemon64.com/game/speed-king";

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function uniqueStrings(values) {
  const seen = new Set();
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function correctSpeedKing(game) {
  if (!game || String(game.slug || "").toLowerCase() !== "speed-king" || String(game.system || "").toUpperCase() !== "C64") {
    return false;
  }

  const before = JSON.stringify(game);
  game.year = 1985;
  game.credits = game.credits && typeof game.credits === "object" ? game.credits : {};
  game.credits.publisher = ["Digital Integration"];
  game.credits.re_releaser = uniqueStrings([
    ...toArray(game.credits.re_releaser),
    "Mastertronic"
  ]);
  game.lemon = uniqueStrings([
    ...toArray(game.lemon),
    CANONICAL_LEMON_URL
  ]);

  return JSON.stringify(game) !== before;
}

function main() {
  const games = JSON.parse(fs.readFileSync(GAMES_PATH, "utf8"));
  if (!Array.isArray(games)) throw new Error("games/games.json must contain an array.");

  const matches = games.filter((game) => String(game?.slug || "").toLowerCase() === "speed-king" && String(game?.system || "").toUpperCase() === "C64");
  if (matches.length !== 1) throw new Error(`Expected exactly one C64 Speed King entry, found ${matches.length}.`);

  const changed = correctSpeedKing(matches[0]);
  if (changed) {
    fs.writeFileSync(GAMES_PATH, `${JSON.stringify(games, null, 2)}\n`, "utf8");
    console.log("Corrected Speed King to the 1985 Digital Integration release and attached its canonical Lemon64 source.");
  } else {
    console.log("Speed King release identity is already current.");
  }
}

if (require.main === module) main();

module.exports = { CANONICAL_LEMON_URL, correctSpeedKing };
