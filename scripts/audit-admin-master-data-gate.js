#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    problems.push(`Missing required admin security file: ${relativePath}.`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireText(source, expected, message) {
  if (!source.includes(expected)) problems.push(message);
}

const guard = read("admin/js/guard.js");
const legacyAdmin = read("admin/admin.html");
const gameBuilder = read("admin/games-editor.html");
const gameBuilderScript = read("admin/js/games-editor.js");
const memberSafety = read("js/ccg-member-data-safety.js");

[
  "MASTER_DATA_PAGE_PATTERN",
  "/\\/admin\\/(?:admin|games-editor)\\.html$/i",
  "MASTER_DATA_ROLES = Object.freeze(['admin', 'superadmin'])",
  "document.documentElement.style.visibility = 'hidden'",
  "effectiveAllowedRoles = IS_MASTER_DATA_PAGE ? MASTER_DATA_ROLES : allowedRoles",
  "enforceMasterDataPageAccess",
  "document.documentElement.style.visibility = ''",
  "redirect(AUTH_CONFIG.loginPage, 'role')"
].forEach((needle) => {
  requireText(guard, needle, `Admin master-data guard is missing: ${needle}.`);
});

if (/MASTER_DATA_ROLES[^\n]*(?:editor|user)/.test(guard)) {
  problems.push("The master games-data role list must not include editor or ordinary user roles.");
}

requireText(legacyAdmin, '/admin/js/guard.js', "The legacy games.json editor does not load the shared admin guard.");
requireText(gameBuilderScript, "ensureRole(['editor', 'admin', 'superadmin'])", "The game builder no longer uses the shared role guard.");
requireText(gameBuilder, 'meta name="ccg-context" content="admin"', "The game builder has lost its admin context marker.");

[
  "removeJsonControls",
  "importPersonalLibraryButton",
  "importPersonalLibraryFile",
  "downloadMemberProfileCsv",
  "Master archive JSON cannot be imported or exported here"
].forEach((needle) => {
  requireText(memberSafety, needle, `Member Hub data boundary is missing: ${needle}.`);
});

if (memberSafety.includes('/games/games.json')) {
  problems.push("The Member Hub safety module must not retrieve the master games.json file.");
}

if (problems.length) {
  console.error("Admin master-data gate audit failed:");
  problems.forEach((problem) => console.error(` - ${problem}`));
  process.exit(1);
}

console.log("Admin master-data gate audit passed.");
