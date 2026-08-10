#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const target = path.resolve(__dirname, "..", "js", "load-single-game.js");
let source = fs.readFileSync(target, "utf8");
const before = "const matches = matcher.findAwardsForGame(game, entries, CCG_SINGLE_ALL_GAMES);";
const after = "const matches = matcher.findAwardsForGame(game, entries, [game]);";

if (source.includes(before)) {
  source = source.replace(before, after);
  fs.writeFileSync(target, source, "utf8");
  console.log("Optimized Zzap matching to compare review records only against the active game.");
} else if (source.includes(after)) {
  console.log("Zzap game-page matching is already optimized.");
} else {
  throw new Error("Could not find the Zzap automatic game-match call.");
}
