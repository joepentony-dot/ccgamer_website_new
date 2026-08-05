#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    problems.push(`Missing Phase 9 file: ${relativePath}.`);
    return "";
  }
  const source = fs.readFileSync(filePath, "utf8");
  if (!source.trim()) problems.push(`Empty Phase 9 file: ${relativePath}.`);
  return source;
}

function requireAll(source, label, needles) {
  needles.forEach((needle) => {
    if (!source.includes(needle)) problems.push(`${label} is missing: ${needle}.`);
  });
}

const migration = read("supabase/migrations/20260805234500_member_public_profile_preview.sql");
const publicModule = read("resources/js/auth/public-member.js");
const hubModule = read("resources/js/auth/member-public-profile-preview.js");
const loader = read("js/ccg-member-public-preview-loader.js");
const publicCss = read("resources/css/public-member-profile-phase9.css");
const hubCss = read("resources/css/member-public-profile-preview.css");
const navCore = read("js/ccg-nav-core.js");
const publicPage = read("community/member.html");
const workflow = read(".github/workflows/ccg-site-safety.yml");

requireAll(migration, "Phase 9 migration", [
  "ccg_build_member_profile_payload",
  "get_public_member_profile",
  "get_my_public_profile_preview",
  "p.is_public = true",
  "auth.uid()",
  "show_top_picks",
  "show_badges",
  "public_list_key",
  "g.deleted_at is null",
  "get_member_badge_catalog",
  "badge_name",
  "badge_description",
  "to anon, authenticated",
  "to authenticated"
]);

if (/grant execute[\s\S]*get_my_public_profile_preview\(\)[\s\S]*to anon/i.test(migration)) {
  problems.push("The owner-only preview RPC is granted to anonymous visitors.");
}

requireAll(publicModule, "Public profile renderer", [
  "get_my_public_profile_preview",
  "get_public_member_profile",
  "previewMode",
  "Private owner preview",
  "Only you can see this preview",
  "public-member-badge--detailed",
  "badge_name",
  "badge_description",
  "Copy profile link",
  "Phase 9 database migration"
]);

requireAll(hubModule, "Member Hub privacy preview", [
  "memberPublicProfileForm",
  "memberPublicPrivacySummary",
  "memberOpenPublicProfile",
  "/community/member.html?preview=1",
  "Never included:",
  "email address",
  "private notes",
  "unshared lists",
  "private activity history"
]);

requireAll(loader, "Phase 9 loader", [
  "CCG_MEMBER_PUBLIC_PREVIEW_LOADER_READY",
  "memberHub",
  'import("/resources/js/auth/member-public-profile-preview.js")'
]);

requireAll(publicCss, "Public profile Phase 9 stylesheet", [
  ".public-member-preview-notice",
  ".public-member-actions",
  ".public-member-badge--detailed"
]);

requireAll(hubCss, "Member Hub privacy stylesheet", [
  ".member-public-privacy-summary",
  "data-state=\"public\""
]);

requireAll(navCore, "Shared module registry", [
  "/js/ccg-member-public-preview-loader.js",
  "data-ccg-member-public-preview-loader",
  "applyNavGlowPatch"
]);

requireAll(publicPage, "Public profile page", [
  '<meta name="robots" content="noindex,follow">',
  'data-ccg-page="public-member-profile"',
  '/resources/js/auth/public-member.js'
]);

[
  publicModule,
  hubModule,
  loader,
  publicCss,
  hubCss
].forEach((source, index) => {
  if (source.includes("games/games.json")) {
    problems.push(`Phase 9 browser source ${index + 1} reads protected master game data.`);
  }
});

requireAll(workflow, "Site-safety workflow", [
  "scripts/audit-member-public-profile-preview.js",
  "node --check js/ccg-member-public-preview-loader.js",
  "node --check resources/js/auth/member-public-profile-preview.js",
  "node --check scripts/audit-member-public-profile-preview.js",
  "node scripts/audit-member-public-profile-preview.js"
]);

if (problems.length) {
  console.error("Member public-profile preview audit failed:");
  problems.forEach((problem) => console.error(` - ${problem}`));
  process.exit(1);
}

console.log("Member public-profile preview audit passed with owner-only inspection and private defaults.");
