#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    problems.push(`Missing Phase 7C file: ${relativePath}.`);
    return "";
  }
  const source = fs.readFileSync(filePath, "utf8");
  if (!source.trim()) problems.push(`Empty Phase 7C file: ${relativePath}.`);
  return source;
}

function requireAll(source, label, needles) {
  needles.forEach((needle) => {
    if (!source.includes(needle)) {
      problems.push(`${label} is missing: ${needle}.`);
    }
  });
}

const originalMigration = read(
  "supabase/migrations/20260805_member_hub_public_profiles.sql"
);
const compatibilityMigration = read(
  "supabase/migrations/20260805230000_member_hub_public_profiles_compatibility.sql"
);
const diagnostic = read(
  "supabase/diagnostics/member_hub_schema_report.sql"
);
const communityAudit = read("scripts/audit-member-community.js");
const workflow = read(".github/workflows/ccg-site-safety.yml");

[originalMigration, compatibilityMigration].forEach((migration, index) => {
  const label = index === 0
    ? "Original public-profile migration"
    : "Phase 7C compatibility migration";

  requireAll(migration, label, [
    "ccg_first_existing_column",
    "ccg_member_rating_rows",
    "ccg_member_comment_rows",
    "ccg_member_badge_rows",
    "information_schema.columns",
    "to_regclass('public.game_ratings')",
    "to_regclass('public.ratings')",
    "to_regclass('public.game_comments')",
    "to_regclass('public.comments')",
    "badge_key",
    "badge_code",
    "badge_id",
    "assigned_at",
    "awarded_at",
    "earned_at",
    "get_public_member_profile",
    "get_my_member_activity",
    "g.deleted_at is null",
    "is_public boolean not null default false",
    "create table if not exists public.member_submissions"
  ]);

  [
    "from public.game_ratings r\n    where r.user_id = auth.uid()",
    "from public.user_badges b\n      where b.user_id = p.id",
    "jsonb_build_object('badge_key', b.badge_key, 'assigned_at', b.assigned_at)"
  ].forEach((unsafeNeedle) => {
    if (migration.includes(unsafeNeedle)) {
      problems.push(
        `${label} still hard-codes a deployed-schema column combination: ${unsafeNeedle}.`
      );
    }
  });
});

requireAll(diagnostic, "Read-only schema report", [
  "information_schema.columns",
  "pg_policies",
  "pg_get_function_identity_arguments",
  "to_regclass('public.profile_game_library')",
  "deletion_tombstones_ready"
]);

const diagnosticWithoutComments = diagnostic
  .replace(/--.*$/gm, "")
  .trim();
if (/^\s*(alter|create|drop|insert|update|delete|truncate|grant|revoke)\b/im.test(
  diagnosticWithoutComments
)) {
  problems.push("The Phase 7C schema report is not read-only.");
}

requireAll(communityAudit, "Member Community audit", [
  "20260805_member_hub_public_profiles.sql",
  "get_public_member_profile",
  "get_my_member_activity"
]);

requireAll(workflow, "Site-safety workflow", [
  "scripts/audit-member-hub-phase7c.js",
  "node --check scripts/audit-member-hub-phase7c.js",
  "node scripts/audit-member-hub-phase7c.js"
]);

if (problems.length) {
  console.error("Phase 7C Supabase compatibility audit failed:");
  problems.forEach((problem) => console.error(` - ${problem}`));
  process.exit(1);
}

console.log(
  "Phase 7C Supabase compatibility audit passed with adaptive activity and badge schemas."
);
