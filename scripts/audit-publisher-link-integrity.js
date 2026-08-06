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

function readJson(relativePath) {
  const content = read(relativePath);
  if (!content) return [];
  try {
    return JSON.parse(content);
  } catch (error) {
    failures.push(`${relativePath} is invalid JSON: ${error.message}`);
    return [];
  }
}

function requireText(content, token, label) {
  if (!content.includes(token)) failures.push(`${label} is missing: ${token}`);
}

function rejectText(content, token, label) {
  if (content.includes(token)) failures.push(`${label} must not contain: ${token}`);
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

function normaliseSlug(value) {
  return String(value || "").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
}

const histories = readJson("data/publisher-histories.json");
const metadata = readJson("games/publishers/publishers.json");
const moduleCode = read("js/ccg-publisher-history.js");
const css = read("resources/css/publisher-history.css");
const notFound = read("404.html");
const workflow = read(".github/workflows/ccg-publisher-link-integrity.yml");
const documentation = read("docs/phase-19a-publisher-link-integrity.md");

if (!Array.isArray(histories)) failures.push("Publisher histories must remain an array");
if (!Array.isArray(metadata)) failures.push("Publisher metadata must remain an array");

const archiveMap = new Map();
for (const record of Array.isArray(metadata) ? metadata : []) {
  const slug = normaliseSlug(record?.slug);
  const count = Number(record?.count || 0);
  const url = String(record?.url || "").trim();
  const expectedUrl = slug ? `/games/publishers/${slug}/` : "";

  if (!slug) {
    failures.push("Publisher metadata contains a record without a slug");
    continue;
  }
  if (!Number.isFinite(count) || count < 1) {
    failures.push(`${slug}: publisher archive record must contain at least one game`);
    continue;
  }
  if (url !== expectedUrl) {
    failures.push(`${slug}: publisher archive URL must be ${expectedUrl}`);
    continue;
  }
  archiveMap.set(slug, record);
}

let validRelationshipCount = 0;
let associatedLabelCount = 0;
const sourceBackedSlugs = [];

for (const profile of Array.isArray(histories) ? histories : []) {
  const profileSlug = normaliseSlug(profile?.slug);
  if (!profileSlug) continue;

  const facts = Array.isArray(profile?.facts) ? profile.facts : [];
  const sources = Array.isArray(profile?.sources) ? profile.sources : [];
  if (facts.length && sources.length) sourceBackedSlugs.push(profileSlug);

  const seen = new Set();
  for (const relationship of Array.isArray(profile?.related) ? profile.related : []) {
    const slug = normaliseSlug(relationship?.slug);
    const label = String(relationship?.label || "").trim();
    if (!slug) failures.push(`${profileSlug}: related publisher entry requires a slug`);
    if (!label) failures.push(`${profileSlug}: related publisher entry requires a label`);
    if (!slug || !label) continue;
    if (seen.has(slug)) failures.push(`${profileSlug}: duplicate related publisher slug ${slug}`);
    seen.add(slug);

    if (archiveMap.has(slug)) validRelationshipCount += 1;
    else associatedLabelCount += 1;
  }
}

for (const slug of sourceBackedSlugs) {
  if (!archiveMap.has(slug)) {
    failures.push(`${slug}: source-backed profile must correspond to a populated publisher archive record`);
  }
}

requireText(moduleCode, "const METADATA_PATH = \"/games/publishers/publishers.json\"", "Publisher metadata source");
requireText(moduleCode, "function buildPublisherArchiveMap", "Archive validation map");
requireText(moduleCode, "count < 1", "Empty archive rejection");
requireText(moduleCode, "url !== expectedUrl", "Canonical archive-route validation");
requireText(moduleCode, "archiveMap.get(slug)", "Relationship archive lookup");
requireText(moduleCode, "link.href = entry.url", "Metadata-controlled publisher link");
requireText(moduleCode, "Related CCG archives", "Populated archive heading");
requireText(moduleCode, "Associated labels", "Unlinked association heading");
requireText(moduleCode, "Promise.allSettled", "Safe dual-data loading");
requireText(moduleCode, ": new Map()", "Metadata-failure no-link fallback");
requireText(css, ".ccg-publisher-history__associated", "Associated-label styling");
requireText(css, "border-style: dashed", "Non-link visual distinction");

requireText(notFound, "const RESERVED_GAME_SECTIONS", "Reserved archive-route guard");
for (const segment of ["collections", "developers", "genres", "platforms", "publishers", "years"]) {
  requireText(notFound, `\"${segment}\"`, `Reserved ${segment} route`);
}
requireText(notFound, "segments.length !== 2", "Nested archive-route rejection");
requireText(notFound, "!/^[a-z0-9][a-z0-9-]*$/.test(slug)", "Direct game-slug validation");
requireText(notFound, "/games/publishers/", "Publisher recovery link");
rejectText(notFound, "pathname.slice(\"games/\".length)", "Legacy broad game-route fallback");

requireText(workflow, "node scripts/audit-publisher-link-integrity.js", "Publisher-link audit workflow step");
requireText(workflow, "404.html", "404 workflow coverage");
requireText(workflow, "games/publishers/publishers.json", "Publisher metadata workflow coverage");
requireText(documentation, "Phase 19A", "Phase documentation");
requireText(documentation, "Never link", "Permanent link rule documentation");

const protectedPaths = new Set([
  "index.html",
  "home.html",
  "resources/css/intro.css",
  "js/index-intro.js",
  "games/games.json"
]);

const allowedPaths = new Set([
  "404.html",
  "js/ccg-publisher-history.js",
  "resources/css/publisher-history.css",
  "scripts/audit-publisher-link-integrity.js",
  ".github/workflows/ccg-publisher-link-integrity.yml",
  "docs/phase-19a-publisher-link-integrity.md"
]);

const enforcePhaseScope = process.env.CCG_ENFORCE_PHASE_SCOPE === "1";
if (enforcePhaseScope) {
  for (const changedPath of changedFiles()) {
    if (protectedPaths.has(changedPath)) failures.push(`Protected file changed: ${changedPath}`);
    if (!allowedPaths.has(changedPath)) failures.push(`Out-of-scope Phase 19A change: ${changedPath}`);
  }
}

if (failures.length) {
  console.error("Publisher link integrity audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Publisher link integrity audit passed.");
console.log(`- ${archiveMap.size} populated publisher archive records are eligible for links`);
console.log(`- ${validRelationshipCount} history relationships currently resolve to populated archives`);
console.log(`- ${associatedLabelCount} history relationships remain non-clickable associated labels`);
console.log("- Nested publisher and archive paths cannot fall through to the individual-game loader");
console.log("- Link eligibility is validated independently of unrelated pull-request files");
