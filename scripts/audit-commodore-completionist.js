#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = path.resolve(__dirname, "..");
const failures = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(content, token, label) {
  if (!content.includes(token)) failures.push(`${label} is missing: ${token}`);
}

function rejectText(content, token, label) {
  if (content.toLowerCase().includes(token.toLowerCase())) {
    failures.push(`${label} must not contain: ${token}`);
  }
}

function changedFiles() {
  for (const range of ["origin/main...HEAD", "HEAD^...HEAD"]) {
    try {
      const output = childProcess.execFileSync(
        "git",
        ["diff", "--name-only", range],
        { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
      );
      const files = output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
      if (files.length) return files;
    } catch (error) {}
  }
  return [];
}

const memberCode = read("resources/js/auth/member-achievement-badges.js");
const publicCode = read("resources/js/auth/public-member.js");
const css = read("resources/css/commodore-completionist.css");
const workflow = read(".github/workflows/ccg-commodore-completionist.yml");
const documentation = read("docs/member-hub-phase16-commodore-completionist.md");

const requiredKeys = [
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
];

for (const key of requiredKeys) {
  requireText(memberCode, `'${key}'`, `Member milestone key ${key}`);
  requireText(publicCode, `'${key}'`, `Public milestone key ${key}`);
}

requireText(memberCode, "COMMODORE_COMPLETIONIST", "Private completion reward key");
requireText(memberCode, "Commodore Completionist", "Private completion reward name");
requireText(memberCode, "Share achievement", "Completion sharing control");
requireText(memberCode, "navigator.share", "Native share support");
requireText(memberCode, "navigator.clipboard", "Clipboard share fallback");
requireText(memberCode, "completionState", "Completion derivation");
requireText(memberCode, "Complete all twelve milestones", "Member Hub completion explanation");

requireText(publicCode, "COMMODORE_COMPLETIONIST", "Public completion reward key");
requireText(publicCode, "withCompletionBadge", "Public completion derivation");
requireText(publicCode, "public-member-badge--completionist", "Public completion presentation");
requireText(publicCode, "Completed every Commodore Milestone", "Public completion description");

requireText(css, ".member-completionist", "Private completion styling");
requireText(css, ".public-member-badge--completionist", "Public completion styling");
requireText(css, "prefers-reduced-motion", "Reduced-motion fallback");
requireText(workflow, "node --check resources/js/auth/member-achievement-badges.js", "Workflow member syntax check");
requireText(workflow, "node scripts/audit-commodore-completionist.js", "Workflow reward audit");
requireText(documentation, "Phase 16", "Phase documentation");
requireText(documentation, "No database migration", "Migration-free documentation");

rejectText(memberCode, "insert into", "Member completion code");
rejectText(publicCode, "insert into", "Public completion code");
rejectText(memberCode, "service_role", "Member completion code");
rejectText(publicCode, "service_role", "Public completion code");

const protectedPaths = new Set([
  "index.html",
  "home.html",
  "resources/css/intro.css",
  "js/index-intro.js",
  "games/games.json"
]);

const allowedPaths = new Set([
  "resources/js/auth/member-achievement-badges.js",
  "resources/js/auth/public-member.js",
  "resources/css/commodore-completionist.css",
  "scripts/audit-commodore-completionist.js",
  ".github/workflows/ccg-commodore-completionist.yml",
  "docs/member-hub-phase16-commodore-completionist.md"
]);

for (const changedPath of changedFiles()) {
  if (protectedPaths.has(changedPath)) failures.push(`Protected file changed: ${changedPath}`);
  if (!process.env.GITHUB_ACTIONS && !allowedPaths.has(changedPath)) {
    failures.push(`Out-of-scope local Phase 16 change: ${changedPath}`);
  }
}

if (failures.length) {
  console.error("Commodore Completionist audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Commodore Completionist audit passed.");
console.log("- All twelve milestone keys are required");
console.log("- Private and public completion displays are present");
console.log("- Sharing includes native and clipboard paths");
console.log("- No database migration or protected-file change is required");
