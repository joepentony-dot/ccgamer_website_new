#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    problems.push(`Missing Member Community file: ${relativePath}.`);
    return "";
  }
  const source = fs.readFileSync(filePath, "utf8");
  if (!source.trim()) problems.push(`Empty Member Community file: ${relativePath}.`);
  return source;
}

const migration = read("supabase/migrations/20260805_member_hub_public_profiles.sql");
const hubModule = read("resources/js/auth/member-community.js");
const publicModule = read("resources/js/auth/public-member.js");
const publicPage = read("community/member.html");
const css = read("resources/css/member-community.css");
const loader = read("js/ccg-member-community-loader.js");
const navCore = read("js/ccg-nav-core.js");

[
  "is_public boolean not null default false",
  "public_bio",
  "show_top_picks",
  "show_badges",
  "public_list_key",
  "create table if not exists public.member_submissions",
  "member_submissions_owner_select",
  "member_submissions_owner_insert",
  "member_submissions_admin_select",
  "member_submissions_admin_update",
  "get_public_member_profile",
  "where p.is_public = true",
  "get_my_member_activity",
  "on function public.get_my_member_activity(int)"
].forEach((needle) => {
  if (!migration.includes(needle)) problems.push(`Member Community migration is missing: ${needle}.`);
});

[
  "memberPublicProfileForm",
  "memberPublicEnabled",
  "memberPublicListKey",
  "memberSubmissionForm",
  "member_submissions",
  "get_my_member_activity",
  "HANDLE_PATTERN",
  "Your profile remains private unless you switch this on"
].forEach((needle) => {
  if (!hubModule.includes(needle)) problems.push(`Member Community module is missing: ${needle}.`);
});

[
  'data-ccg-page="public-member-profile"',
  '<meta name="robots" content="noindex,follow">',
  'id="publicMemberPage"',
  'id="publicMemberTopPicksGrid"',
  'id="publicMemberSharedListGrid"',
  'id="publicMemberBadgesGrid"',
  '/resources/js/auth/public-member.js'
].forEach((needle) => {
  if (!publicPage.includes(needle)) problems.push(`Public member page is missing: ${needle}.`);
});

[
  "get_public_member_profile",
  "publicMemberTopPicksGrid",
  "publicMemberSharedListGrid",
  "publicMemberBadgesGrid",
  "This member profile is private"
].forEach((needle) => {
  if (!publicModule.includes(needle)) problems.push(`Public member renderer is missing: ${needle}.`);
});

[
  ".member-public-settings",
  ".member-submission-panel",
  ".public-member-main",
  ".public-member-grid"
].forEach((needle) => {
  if (!css.includes(needle)) problems.push(`Member Community stylesheet is missing: ${needle}.`);
});

if (!loader.includes('import("/resources/js/auth/member-community.js")')) {
  problems.push("The Member Community loader does not import its module.");
}
if (!navCore.includes('/js/ccg-member-community-loader.js')) {
  problems.push("The shared module system does not load Member Community tools.");
}

if (problems.length) {
  console.error("Member Community audit failed:");
  problems.forEach((problem) => console.error(` - ${problem}`));
  process.exit(1);
}

console.log("Member Community audit passed with private defaults and explicit sharing controls.");
