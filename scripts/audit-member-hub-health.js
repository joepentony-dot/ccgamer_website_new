#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    problems.push(`Missing Phase 12 file: ${relativePath}.`);
    return "";
  }
  const source = fs.readFileSync(filePath, "utf8");
  if (!source.trim()) problems.push(`Empty Phase 12 file: ${relativePath}.`);
  return source;
}

function requireAll(source, label, needles) {
  needles.forEach((needle) => {
    if (!source.includes(needle)) problems.push(`${label} is missing: ${needle}.`);
  });
}

const migration = read("supabase/migrations/20260806003000_member_hub_health_check.sql");
const page = read("admin/member-hub-health.html");
const controller = read("admin/js/member-hub-health.js");
const navigation = read("admin/js/admin-nav.js");
const css = read("resources/css/member-hub-health-admin.css");
const workflow = read(".github/workflows/ccg-site-safety.yml");

requireAll(migration, "Phase 12 migration", [
  "admin_get_member_hub_health",
  "Administrator access required",
  "lower(coalesce(p.role, '')) in ('admin', 'superadmin')",
  "to_regclass('public.profile_game_library')",
  "information_schema.columns",
  "pg_indexes",
  "relrowsecurity",
  "ccg_member_rating_rows(uuid)",
  "ccg_member_comment_rows(uuid)",
  "ccg_member_badge_rows(uuid)",
  "get_public_member_profile(text)",
  "get_my_public_profile_preview()",
  "get_member_badge_catalog()",
  "award_badge_if_eligible(uuid)",
  "admin_list_member_submissions(text,text,text,integer)",
  "admin_update_member_submission(uuid,text,text)",
  "grant execute",
  "to authenticated"
]);

if (/select\s+\*\s+from\s+public\.(?:profile_game_library|member_submissions|game_ratings|game_comments|user_badges)/i.test(migration)) {
  problems.push("The health RPC reads member records instead of database structure.");
}

requireAll(page, "Member Hub health page", [
  'data-member-hub-health-gate="pending"',
  '<meta name="robots" content="noindex,nofollow"',
  '/resources/css/member-hub-health-admin.css',
  'id="memberHealthReadyCount"',
  'id="memberHealthMissingCount"',
  'id="memberHealthMigrationList"',
  'id="memberHealthGroups"',
  '/admin/js/member-hub-health.js'
]);

requireAll(controller, "Member Hub health controller", [
  "ensureRole(['admin', 'superadmin'])",
  "startAccessMonitor",
  "admin_get_member_hub_health",
  "document.documentElement.dataset.memberHubHealthGate = 'granted'",
  "MIGRATION_ORDER",
  "20260805230000_member_hub_public_profiles_compatibility.sql",
  "20260805233000_member_badge_engine.sql",
  "20260805234500_member_public_profile_preview.sql",
  "20260806000500_member_submissions_admin_inbox.sql",
  "20260806003000_member_hub_health_check.sql",
  "navigator.clipboard.writeText",
  "textContent"
]);

if (/\.from\s*\(/.test(controller)) {
  problems.push("The health controller bypasses the administrator health RPC.");
}

requireAll(navigation, "Admin navigation", [
  '/admin/member-hub-health.html',
  'data-nav="health"',
  'Member Hub Health'
]);

requireAll(css, "Member Hub health stylesheet", [
  'html[data-member-hub-health-gate="pending"] body',
  ".member-health__summary",
  ".member-health__missing",
  ".member-health__item.is-ready",
  ".member-health__action"
]);

[
  migration,
  page,
  controller,
  css
].forEach((source, index) => {
  if (source.includes("games/games.json")) {
    problems.push(`Phase 12 source ${index + 1} references the protected master archive.`);
  }
});

requireAll(workflow, "Site-safety workflow", [
  "scripts/audit-member-hub-health.js",
  "node --check admin/js/member-hub-health.js",
  "node --check scripts/audit-member-hub-health.js",
  "node scripts/audit-member-hub-health.js"
]);

if (problems.length) {
  console.error("Member Hub health audit failed:");
  problems.forEach((problem) => console.error(` - ${problem}`));
  process.exit(1);
}

console.log("Member Hub health audit passed with administrator-only structural checks and migration guidance.");
