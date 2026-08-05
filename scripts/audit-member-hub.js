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
const syncCss = read("resources/css/member-library-sync.css");
const syncScript = read("resources/js/auth/member-library-sync.js");
const syncLoader = read("js/ccg-member-library-sync-loader.js");
const navCore = read("js/ccg-nav-core.js");
const migration = read("supabase/migrations/20260805_member_hub_cloud_library.sql");

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

[
  "profile_game_library",
  "ccgPersonalGameLibraryV1",
  "memberLibrarySyncStatus",
  "memberSyncLibraryNow",
  "exportPersonalLibraryCsv",
  "importPersonalLibraryFile",
  "MISSING_SCHEMA_CODES",
  "reconcileLibraries",
  "deleteRemoteSlugs",
  "Device-only mode"
].forEach((needle) => {
  if (!syncScript.includes(needle)) problems.push(`Member library sync is missing: ${needle}.`);
});

if (!syncLoader.includes('import("/resources/js/auth/member-library-sync.js")')) {
  problems.push("The Member Hub sync loader does not import the account library module.");
}
if (!navCore.includes('/js/ccg-member-library-sync-loader.js')) {
  problems.push("The shared module system does not load the Member Hub sync loader.");
}
if (!syncCss.includes('.member-sync-status') || !syncCss.includes('[data-state="synced"]')) {
  problems.push("Member library synchronisation status styling is incomplete.");
}

[
  "create table if not exists public.profile_game_library",
  "preferred_system",
  "enable row level security",
  "profile_game_library_owner_select",
  "profile_game_library_owner_insert",
  "profile_game_library_owner_update",
  "profile_game_library_owner_delete",
  "profile_id = auth.uid()"
].forEach((needle) => {
  if (!migration.includes(needle)) problems.push(`Member library migration is missing: ${needle}.`);
});

if (!/<meta name="robots" content="noindex,follow">/.test(html)) {
  problems.push("The private Member Hub must remain noindex,follow.");
}

if (problems.length) {
  console.error("Member Hub audit failed:");
  problems.forEach((problem) => console.error(` - ${problem}`));
  process.exit(1);
}

console.log("Member Hub audit passed with account-library synchronisation safeguards.");
