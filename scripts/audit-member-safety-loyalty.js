#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    problems.push(`Missing required file: ${relativePath}.`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireText(source, expected, message) {
  if (!source.includes(expected)) problems.push(message);
}

const navCore = read("js/ccg-nav-core.js");
const dataSafety = read("js/ccg-member-data-safety.js");
const loyaltyLoader = read("js/ccg-member-loyalty-loader.js");
const loyalty = read("resources/js/auth/member-loyalty-badges.js");
const loyaltyCss = read("resources/css/member-loyalty-badges.css");
const zzapCss = read("resources/css/zzap64-performance.css");
const profile = read("community/profile.html");
const profileLists = read("resources/js/auth/profile-lists.js");
const memberSync = read("resources/js/auth/member-library-sync.js");
const adminCss = read("resources/css/ccg-admin.css");

requireText(navCore, "/js/ccg-member-loyalty-loader.js", "The monthly loyalty loader is not registered in the shared navigation core.");
requireText(navCore, "/js/ccg-member-data-safety.js", "The Member Hub data-safety module is not registered in the shared navigation core.");

const syncPosition = navCore.indexOf("/js/ccg-member-library-sync-loader.js");
const safetyPosition = navCore.indexOf("/js/ccg-member-data-safety.js");
if (syncPosition < 0 || safetyPosition < syncPosition) {
  problems.push("The Member Hub data-safety module must load after the library synchronisation loader.");
}

[
  "downloadMemberProfileCsv",
  "ccg-member-profile-and-games-",
  "removeJsonControls",
  "importPersonalLibraryButton",
  "importPersonalLibraryFile",
  "Master archive JSON cannot be imported or exported here"
].forEach((needle) => requireText(dataSafety, needle, `Member data-safety module is missing: ${needle}.`));

if (dataSafety.includes("/games/games.json")) {
  problems.push("Member data-safety code must not fetch the master games.json archive.");
}

if (/type=["']file["'][^>]*json/i.test(profile)) {
  problems.push("The Member Hub HTML contains a JSON upload field.");
}

if (/Import JSON|importJsonFile|normalizeImportedLibrary|application\/json/.test(memberSync)) {
  problems.push("The Member Hub synchronisation source still contains JSON import controls or handlers.");
}

if (/exportData\s*\(|personal-game-library\.json|application\/json/.test(profileLists)) {
  problems.push("The device-local profile list source still contains JSON export logic.");
}

requireText(profileLists, "customLists(entry)", "Standard-list removal does not inspect custom collection membership.");
requireText(profileLists, "entryIsEmpty(item)", "Standard-list removal does not preserve custom collection membership.");
requireText(profileLists, "ccgPersonalGameLibraryTombstonesV1", "Standard-list removal does not record persistent deletion tombstones.");

[
  "ccgPersonalGameLibraryTombstonesV1",
  "deleted_at",
  "newerState",
  "upsertStates",
  "Phase 7B deletion-safety migration"
].forEach((needle) => requireText(memberSync, needle, `Account reconciliation is missing tombstone safeguard: ${needle}.`));

if (/\.\.\.\(localEntry\.lists|\.\.\.\(remoteEntry\.lists|customLists:\s*Array\.from\(new Set/.test(memberSync)) {
  problems.push("Account reconciliation still unions stale list memberships.");
}

requireText(memberSync, "Member Hub Features", "Member Hub phase wording is not updated by the synchronisation module.");
requireText(adminCss, "data-ccg-master-data-gate=\"granted\"", "Master-data pages are not concealed in CSS until the role guard grants access.");

[
  "completedMonths",
  "state.month = completedMonths(state.joinedAt) + 1",
  "earliestDate(profile?.created_at, user.created_at)",
  "Share badge",
  "Copy for Discord",
  "navigator.share",
  "ccg-member-badge-month-",
  "A valued member of the CCG community"
].forEach((needle) => requireText(loyalty, needle, `Monthly loyalty badge module is missing: ${needle}.`));

requireText(loyaltyLoader, "member-loyalty-badges.js", "The loyalty loader does not import the loyalty badge module.");
requireText(loyaltyCss, ".member-loyalty-badge", "The loyalty badge stylesheet is missing its main component.");

requireText(zzapCss, ".zzap-loading:not([hidden])", "The Zzap loading panel does not have an active viewport rule.");
requireText(zzapCss, "position: fixed", "The Zzap loading panel is not fixed at eye level.");
requireText(zzapCss, "top: 50%", "The Zzap loading panel is not vertically centred on desktop.");
requireText(zzapCss, "transform: translate(-50%, -50%)", "The Zzap loading panel lacks viewport centring.");

if (problems.length) {
  console.error("Member safety and loyalty audit failed:");
  problems.forEach((problem) => console.error(` - ${problem}`));
  process.exit(1);
}

console.log("Member safety and loyalty audit passed.");
