#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    problems.push(`Missing custom collection file: ${relativePath}.`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireText(source, expected, message) {
  if (!source.includes(expected)) problems.push(message);
}

const navCore = read("js/ccg-nav-core.js");
const loader = read("js/ccg-member-custom-collections-loader.js");
const gameControls = read("js/ccg-personal-library-controls.js");
const manager = read("resources/js/auth/member-custom-collections.js");
const sync = read("resources/js/auth/member-library-sync.js");
const dataSafety = read("js/ccg-member-data-safety.js");
const css = read("resources/css/member-custom-collections.css");

requireText(navCore, "/js/ccg-member-custom-collections-loader.js", "The shared navigation core does not load the Member Hub custom-collection manager.");
requireText(loader, "/resources/js/auth/member-custom-collections.js", "The custom-collection loader does not import its manager.");

[
  "ccgCustomCollectionSelect",
  "ccgCustomCollectionName",
  "addToCustomCollection",
  "removeFromCustomCollection",
  "customLists",
  "CUSTOM_COLLECTION_LIMIT",
  "isEntryEmpty"
].forEach((needle) => {
  requireText(gameControls, needle, `Single-game custom collection controls are missing: ${needle}.`);
});

[
  "memberCustomCollections",
  "memberStatCustomCollections",
  "renameActiveCollection",
  "deleteActiveCollection",
  "removeGameFromActive",
  "ccg:personal-library-updated",
  "These remain private"
].forEach((needle) => {
  requireText(manager, needle, `Member Hub custom collection manager is missing: ${needle}.`);
});

[
  "custom_lists",
  "customLists",
  "uniqueStrings(entry.customLists || entry.custom_lists)"
].forEach((needle) => {
  requireText(sync, needle, `Account sync does not preserve custom collections: ${needle}.`);
});

requireText(dataSafety, "custom_lists", "The safe member CSV does not include custom collection names.");
requireText(css, ".member-custom-collections", "The custom collection stylesheet is missing its Member Hub component.");
requireText(css, ".ccg-personal-library__custom", "The custom collection stylesheet is missing its game-page component.");

if (manager.includes('/games/games.json') || gameControls.includes('/games/games.json')) {
  problems.push("Private custom collection modules must not fetch or modify the master games.json archive.");
}

if (/type\s*=\s*["']file["']/i.test(manager) || /type\s*=\s*["']file["']/i.test(gameControls)) {
  problems.push("Private custom collection modules must not introduce file uploads.");
}

if (problems.length) {
  console.error("Member custom collection audit failed:");
  problems.forEach((problem) => console.error(` - ${problem}`));
  process.exit(1);
}

console.log("Member custom collection audit passed.");
