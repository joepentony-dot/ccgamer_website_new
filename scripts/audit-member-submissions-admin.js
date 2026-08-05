#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    problems.push(`Missing Phase 10 file: ${relativePath}.`);
    return "";
  }
  const source = fs.readFileSync(filePath, "utf8");
  if (!source.trim()) problems.push(`Empty Phase 10 file: ${relativePath}.`);
  return source;
}

function requireAll(source, label, needles) {
  needles.forEach((needle) => {
    if (!source.includes(needle)) problems.push(`${label} is missing: ${needle}.`);
  });
}

const migration = read("supabase/migrations/20260806000500_member_submissions_admin_inbox.sql");
const page = read("admin/member-submissions.html");
const controller = read("admin/js/member-submissions.js");
const navigation = read("admin/js/admin-nav.js");
const css = read("resources/css/member-submissions-admin.css");
const workflow = read(".github/workflows/ccg-site-safety.yml");

requireAll(migration, "Phase 10 migration", [
  "admin_notes text not null default ''",
  "reviewed_by uuid",
  "resolved_at timestamptz",
  "ccg_is_submission_admin",
  "admin_list_member_submissions",
  "admin_update_member_submission",
  "lower(coalesce(p.role, '')) in ('admin', 'superadmin')",
  "Administrator access required",
  "Invalid submission status",
  "left(trim(coalesce(p_admin_notes, '')), 5000)",
  "grant execute",
  "to authenticated"
]);

requireAll(page, "Admin submissions page", [
  'data-admin-submissions-gate="pending"',
  '<meta name="robots" content="noindex,nofollow"',
  '/resources/css/member-submissions-admin.css',
  'id="submissionsSearch"',
  'id="submissionsStatusFilter"',
  'id="submissionsTypeFilter"',
  'id="submissionsList"',
  '/admin/js/member-submissions.js'
]);

requireAll(controller, "Admin submissions controller", [
  "ensureRole(['admin', 'superadmin'])",
  "startAccessMonitor",
  "admin_list_member_submissions",
  "admin_update_member_submission",
  "document.documentElement.dataset.adminSubmissionsGate = 'granted'",
  "textContent",
  "encodeURIComponent(submission.game_slug)",
  "Private review notes. These are not shown to the member.",
  "await loadSubmissions()"
]);

if (controller.includes(".from('member_submissions')") || controller.includes('.from("member_submissions")')) {
  problems.push("The admin submissions controller bypasses the administrator RPC boundary.");
}

[
  migration,
  page,
  controller,
  css
].forEach((source, index) => {
  if (source.includes("games/games.json")) {
    problems.push(`Phase 10 source ${index + 1} references the protected master archive.`);
  }
});

requireAll(navigation, "Admin navigation", [
  '/admin/member-submissions.html',
  'data-nav="submissions"',
  'Member Submissions'
]);

requireAll(css, "Admin submissions stylesheet", [
  'html[data-admin-submissions-gate="pending"] body',
  ".submissions-admin",
  ".submission-review",
  '.submission-review[data-status="new"]',
  ".submission-review__notes"
]);

requireAll(workflow, "Site-safety workflow", [
  "scripts/audit-member-submissions-admin.js",
  "node --check admin/js/member-submissions.js",
  "node --check scripts/audit-member-submissions-admin.js",
  "node scripts/audit-member-submissions-admin.js"
]);

if (problems.length) {
  console.error("Member submissions admin audit failed:");
  problems.forEach((problem) => console.error(` - ${problem}`));
  process.exit(1);
}

console.log("Member submissions admin audit passed with administrator-only review and no archive writes.");
