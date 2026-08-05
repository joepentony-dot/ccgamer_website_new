#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    problems.push(`Missing required Member Hub file: ${relativePath}.`);
    return "";
  }
  const source = fs.readFileSync(filePath, "utf8");
  if (!source.trim()) problems.push(`Empty required Member Hub file: ${relativePath}.`);
  return source;
}

const html = read("community/profile.html");
const css = read("resources/css/member-hub.css");
const script = read("resources/js/auth/member-hub.js");

[
  'data-ccg-page="member-hub"',
  'id="memberHub"',
  'id="memberOverview"',
  'id="memberFavourites"',
  'id="personalGameLibrary"',
  'id="memberAchievements"',
  'id="memberCommunity"',
  'id="memberSettings"',
  'id="favouriteGamesList"',
  'id="prefsForm"',
  'id="logoutBtn"',
  '/js/ccg-nav-core.js',
  '/js/ccg-mode-engine.js',
  '/resources/js/auth/profile-page.js',
  '/resources/js/auth/profile-lists.js',
  '/resources/js/auth/member-hub.js'
].forEach((needle) => {
  if (!html.includes(needle)) problems.push(`Member Hub HTML is missing: ${needle}.`);
});

const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g), (match) => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length) problems.push(`Member Hub contains duplicate IDs: ${[...new Set(duplicateIds)].join(", ")}.`);

[
  ".member-hub-hero",
  ".member-stats",
  ".member-hub-grid",
  ".member-achievements",
  ".member-community-grid",
  ".member-account-settings"
].forEach((selector) => {
  if (!css.includes(selector)) problems.push(`Member Hub stylesheet is missing: ${selector}.`);
});

[
  "ccgPersonalGameLibraryV1",
  "ccgRecentlyViewedGamesV1",
  "memberStatFavourites",
  "memberRecentlyViewed",
  "memberWantSuggestion",
  "memberRecentContent",
  "memberActivityFeed",
  "MutationObserver"
].forEach((needle) => {
  if (!script.includes(needle)) problems.push(`Member Hub script is missing: ${needle}.`);
});

if (!/<meta name="robots" content="noindex,follow">/.test(html)) {
  problems.push("The private Member Hub must remain noindex,follow.");
}

if (problems.length) {
  console.error("Member Hub audit failed:");
  problems.forEach((problem) => console.error(` - ${problem}`));
  process.exit(1);
}

console.log("Member Hub audit passed.");
