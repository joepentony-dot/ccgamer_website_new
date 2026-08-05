#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    problems.push(`Missing Member Achievements file: ${relativePath}.`);
    return "";
  }
  const source = fs.readFileSync(fullPath, "utf8");
  if (!source.trim()) problems.push(`Empty Member Achievements file: ${relativePath}.`);
  return source;
}

function requireAll(source, label, needles) {
  needles.forEach((needle) => {
    if (!source.includes(needle)) problems.push(`${label} is missing: ${needle}.`);
  });
}

const migration = read("supabase/migrations/20260805233000_member_badge_engine.sql");
const moduleSource = read("resources/js/auth/member-achievement-badges.js");
const loader = read("js/ccg-member-achievements-loader.js");
const css = read("resources/css/member-achievement-badges.css");
const communityApi = read("resources/js/community/community-api.js");
const navCore = read("js/ccg-nav-core.js");
const profilePage = read("community/profile.html");
const workflow = read(".github/workflows/ccg-site-safety.yml");

requireAll(migration, "Badge engine migration", [
  "get_member_badge_catalog",
  "ccg_award_badge_code",
  "award_badge_if_eligible",
  "get_my_member_badges",
  "ccg_member_rating_rows",
  "ccg_member_comment_rows",
  "ccg_member_badge_rows",
  "on conflict do nothing",
  "auth.uid() <> target_user_id",
  "g.deleted_at is null",
  "FIRST_RATING",
  "RATED_10",
  "RATED_50",
  "FIRST_COMMENT",
  "COMMENTER_10",
  "FIRST_LIBRARY_GAME",
  "LIBRARY_10",
  "LIBRARY_50",
  "LIBRARY_100",
  "C64_EXPLORER",
  "AMIGA_EXPLORER",
  "DUAL_SYSTEM"
]);

requireAll(moduleSource, "Achievement module", [
  "memberAchievementPanel",
  "memberAchievementGrid",
  "award_badge_if_eligible",
  "get_member_badge_catalog",
  "get_my_member_badges",
  "ccg:member-badges-updated",
  "ccg:personal-library-updated",
  "Achievements are awaiting the Phase 8 Supabase migration",
  "is-earned",
  "is-locked"
]);

requireAll(loader, "Achievement loader", [
  "CCG_MEMBER_ACHIEVEMENTS_LOADER_READY",
  "memberHub",
  'import("/resources/js/auth/member-achievement-badges.js")'
]);

requireAll(css, "Achievement stylesheet", [
  ".member-achievement-panel",
  ".member-achievement-grid",
  ".member-achievement-card.is-earned",
  ".member-achievement-card.is-locked",
  "data-ccg-mode=\"amiga\""
]);

requireAll(communityApi, "Community API", [
  "export async function refreshMemberBadges",
  "award_badge_if_eligible",
  "await refreshMemberBadges(profileId)",
  "ccg:member-badges-updated"
]);

const refreshCallCount = (communityApi.match(/await refreshMemberBadges\(profileId\)/g) || []).length;
if (refreshCallCount < 2) {
  problems.push("Community API does not award badges after both comments and ratings.");
}

requireAll(navCore, "Shared module registry", [
  "/js/ccg-member-achievements-loader.js",
  "data-ccg-member-achievements-loader",
  "applyNavGlowPatch"
]);

if (!profilePage.includes('id="memberAchievements"')) {
  problems.push("The Member Hub does not provide the achievements host section.");
}

[
  moduleSource,
  loader,
  css,
  communityApi
].forEach((source, index) => {
  if (source.includes("games/games.json")) {
    problems.push(`Member Achievements source ${index + 1} reads protected master game data.`);
  }
});

requireAll(workflow, "Site-safety workflow", [
  "scripts/audit-member-achievements.js",
  "node --check js/ccg-member-achievements-loader.js",
  "node --check resources/js/auth/member-achievement-badges.js",
  "node --check scripts/audit-member-achievements.js",
  "node scripts/audit-member-achievements.js"
]);

if (problems.length) {
  console.error("Member Achievements audit failed:");
  problems.forEach((problem) => console.error(` - ${problem}`));
  process.exit(1);
}

console.log("Member Achievements audit passed with automatic, private and duplicate-safe badges.");
