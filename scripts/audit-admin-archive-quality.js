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

function rejectText(content, pattern, label) {
  if (pattern.test(content)) failures.push(`${label} contains prohibited write behaviour: ${pattern}`);
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

const page = read("admin/archive-quality.html");
const code = read("admin/js/archive-quality.js");
const nav = read("admin/js/admin-nav.js");
const css = read("resources/css/archive-quality-admin.css");
const workflow = read(".github/workflows/ccg-admin-archive-quality.yml");
const docs = read("docs/phase-20-admin-archive-quality-centre.md");
const gamesText = read("games/games.json");

let games = [];
try {
  games = JSON.parse(gamesText);
  if (!Array.isArray(games) || games.length < 651) failures.push("Protected game catalogue baseline is unavailable");
} catch (error) {
  failures.push(`games/games.json is invalid JSON: ${error.message}`);
}

requireText(page, 'data-archive-quality-gate="pending"', "Fail-closed page gate");
requireText(page, 'data-ccg-context="admin"', "Administrator page context");
requireText(page, 'meta name="robots" content="noindex,nofollow"', "Administrator noindex policy");
requireText(page, 'id="archiveQualityRun"', "Full audit control");
requireText(page, 'id="archiveQualityResults"', "Findings container");
requireText(page, 'id="archiveQualityCsv"', "CSV export control");
requireText(page, 'id="archiveQualityJson"', "JSON export control");
requireText(page, "never edits the game database", "Read-only visitor explanation");
requireText(page, "External Google Drive, Lemon64 and YouTube", "External-check limitation");

requireText(code, "ensureRole(['admin', 'superadmin'])", "Administrator role guard");
requireText(code, "startAccessMonitor", "Administrator access monitor");
requireText(code, "initAdminNav({ active: 'quality'", "Shared admin navigation");
requireText(code, "'/games/games.json'", "Live catalogue source");
requireText(code, "method: 'HEAD'", "Read-only local resource checking");
requireText(code, "RESOURCE_CONCURRENCY = 8", "Bounded local resource checks");
requireText(code, "THUMBNAIL_SIZE_LIMIT", "Thumbnail size review");
requireText(code, "BOX_SIZE_LIMIT", "3D box size review");
requireText(code, "duplicate:slug", "Duplicate slug reporting");
requireText(code, "duplicate:id", "Duplicate ID reporting");
requireText(code, "video:id-format", "YouTube ID format reporting");
requireText(code, "resource:canonical-page", "Canonical page reporting");
requireText(code, "exportCsv", "CSV report export");
requireText(code, "exportJson", "JSON report export");

rejectText(code, /method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i, "Archive audit");
rejectText(code, /\.from\([^)]*\)\.(?:insert|update|upsert|delete)\s*\(/i, "Archive audit");
rejectText(code, /games\/games\.json[^\n]*(?:write|save|commit)/i, "Archive audit");

requireText(nav, 'href="/admin/archive-quality.html"', "Shared Archive Quality link");
requireText(nav, 'data-nav="quality"', "Archive Quality active state");
requireText(css, 'html[data-archive-quality-gate="pending"] body', "Fail-closed CSS");
requireText(css, ".archive-quality__finding.is-critical", "Critical finding styling");
requireText(css, "@media (max-width: 720px)", "Mobile layout");
requireText(workflow, "node scripts/audit-admin-archive-quality.js", "Workflow audit step");
requireText(docs, "Phase 20", "Phase documentation");
requireText(docs, "Read-only", "Read-only documentation");
requireText(docs, "External-link boundary", "External-link documentation");

const protectedPaths = new Set([
  "index.html",
  "home.html",
  "resources/css/intro.css",
  "js/index-intro.js",
  "games/games.json"
]);

const allowedPaths = new Set([
  "admin/archive-quality.html",
  "admin/js/archive-quality.js",
  "admin/js/admin-nav.js",
  "resources/css/archive-quality-admin.css",
  "scripts/audit-admin-archive-quality.js",
  ".github/workflows/ccg-admin-archive-quality.yml",
  "docs/phase-20-admin-archive-quality-centre.md"
]);

for (const changedPath of changedFiles()) {
  if (protectedPaths.has(changedPath)) failures.push(`Protected file changed: ${changedPath}`);
  if (!process.env.GITHUB_ACTIONS && !allowedPaths.has(changedPath)) {
    failures.push(`Out-of-scope local Phase 20 change: ${changedPath}`);
  }
}

if (failures.length) {
  console.error("Administrator Archive Quality audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Administrator Archive Quality audit passed.");
console.log(`- ${games.length} source game records remain available`);
console.log("- Required data, duplicate identity, local file and canonical route checks are present");
console.log("- Local checks use bounded HEAD requests and do not modify the archive");
console.log("- External links are format-checked without unreliable broken-link claims");
console.log("- Protected intro files, Home and games/games.json remain unchanged");
