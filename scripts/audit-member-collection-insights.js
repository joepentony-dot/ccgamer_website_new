#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    problems.push(`Missing Phase 11 file: ${relativePath}.`);
    return "";
  }
  const source = fs.readFileSync(filePath, "utf8");
  if (!source.trim()) problems.push(`Empty Phase 11 file: ${relativePath}.`);
  return source;
}

function requireAll(source, label, needles) {
  needles.forEach((needle) => {
    if (!source.includes(needle)) problems.push(`${label} is missing: ${needle}.`);
  });
}

const moduleSource = read("resources/js/auth/member-collection-insights.js");
const loader = read("js/ccg-member-collection-insights-loader.js");
const css = read("resources/css/member-collection-insights.css");
const navCore = read("js/ccg-nav-core.js");
const customCollections = read("resources/js/auth/member-custom-collections.js");
const workflow = read(".github/workflows/ccg-site-safety.yml");

requireAll(moduleSource, "Collection insights module", [
  "CCG_MEMBER_COLLECTION_INSIGHTS_READY",
  "ccgPersonalGameLibraryV1",
  "memberCollectionInsights",
  "memberCollectionInsightStats",
  "memberCollectionRandomButton",
  "memberCollectionRandomResult",
  "systemCounts",
  "yearRange",
  "ratingAverage",
  "Math.random()",
  "game.slug !== lastRandomSlug",
  "ccg:personal-library-updated",
  "localStorage.getItem",
  "observer.disconnect()",
  "encodeURIComponent(selected.slug)",
  "Private Collection Insights"
]);

if (/localStorage\.(?:setItem|removeItem|clear)\s*\(/.test(moduleSource)) {
  problems.push("Collection insights must remain read-only and cannot write browser storage.");
}

if (moduleSource.includes("games/games.json")) {
  problems.push("Collection insights reads the protected master game database.");
}

if (!moduleSource.includes("games.length > 1") || !moduleSource.includes("lastRandomSlug")) {
  problems.push("Random selection does not guard against immediate repeats.");
}

requireAll(loader, "Collection insights loader", [
  "CCG_MEMBER_COLLECTION_INSIGHTS_LOADER_READY",
  "memberHub",
  'import("/resources/js/auth/member-collection-insights.js")'
]);

requireAll(css, "Collection insights stylesheet", [
  ".member-collection-insights",
  ".member-collection-insights__stats",
  ".member-collection-insights__random",
  'data-ccg-mode="amiga"',
  "@media (max-width: 580px)"
]);

requireAll(navCore, "Shared module registry", [
  "/js/ccg-member-collection-insights-loader.js",
  "data-ccg-member-collection-insights-loader",
  "applyNavGlowPatch"
]);

requireAll(customCollections, "Custom collections foundation", [
  "memberCustomCollectionManager",
  "memberCustomCollectionActiveTitle",
  "member-custom-collections__tab",
  "ccg:personal-library-updated"
]);

requireAll(workflow, "Site-safety workflow", [
  "scripts/audit-member-collection-insights.js",
  "node --check js/ccg-member-collection-insights-loader.js",
  "node --check resources/js/auth/member-collection-insights.js",
  "node --check scripts/audit-member-collection-insights.js",
  "node scripts/audit-member-collection-insights.js"
]);

if (problems.length) {
  console.error("Member collection insights audit failed:");
  problems.forEach((problem) => console.error(` - ${problem}`));
  process.exit(1);
}

console.log("Member collection insights audit passed with private read-only statistics and non-repeating random selection.");
