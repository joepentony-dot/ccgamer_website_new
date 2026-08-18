#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://www.cheekycommodoregamer.co.uk";
const problems = [];

function read(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    problems.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, message) {
  if (!source.includes(needle)) problems.push(message);
}

function forbidText(source, needle, message) {
  if (source.includes(needle)) problems.push(message);
}

function extractLocs(xml) {
  return [...String(xml || "").matchAll(/<loc>([^<]+)<\/loc>/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function collectSitemapFiles() {
  return fs.readdirSync(ROOT)
    .filter((name) => /^sitemap(?:-[a-z0-9-]+)?\.xml$/i.test(name))
    .sort();
}

function routeForHtml(relativePath) {
  const normalized = relativePath.split(path.sep).join("/");
  if (normalized === "index.html" || normalized === "home.html") return `${SITE}/`;
  if (normalized.endsWith("/index.html")) {
    return `${SITE}/${normalized.slice(0, -"index.html".length)}`;
  }
  return `${SITE}/${normalized}`;
}

function walkHtml(startRelative) {
  const start = path.join(ROOT, startRelative);
  if (!fs.existsSync(start)) return [];
  const output = [];
  const stack = [start];
  while (stack.length) {
    const current = stack.pop();
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) stack.push(path.join(current, entry));
      continue;
    }
    if (current.toLowerCase().endsWith(".html")) output.push(current);
  }
  return output;
}

const robots = read("robots.txt");
requireText(robots, "User-agent: *", "robots.txt must define the default crawler policy.");
requireText(robots, "Allow: /", "robots.txt must allow the public site.");
requireText(robots, "Disallow: /admin/", "robots.txt must block the admin area.");
requireText(robots, `Sitemap: ${SITE}/sitemap.xml`, "robots.txt must advertise the canonical sitemap index.");
for (const publicPrefix of ["/games/", "/retro-specials/", "/retro-events/", "/amiga-demo-music/", "/videos/", "/music/"]) {
  if (robots.includes(`Disallow: ${publicPrefix}`)) {
    problems.push(`robots.txt must not block public discovery path ${publicPrefix}`);
  }
}

const legacyBuild = read(".github/workflows/build-games-on-games-json-change.yml");
requireText(legacyBuild, "workflow_dispatch:", "Legacy game-output workflow must remain available as a manual recovery path.");
forbidText(legacyBuild, "\n  push:", "Legacy game-output workflow must not auto-run on games.json; Reliable Games Publishing is authoritative.");
forbidText(legacyBuild, "git push\n", "Legacy recovery workflow must not push directly to main automatically.");

const gamesPublishing = read(".github/workflows/games-publishing.yml");
const rebuildGames = read("scripts/rebuild-games.js");
requireText(gamesPublishing, '- "games/games.json"', "Reliable Games Publishing must trigger when games/games.json changes.");
requireText(gamesPublishing, "node scripts/rebuild-games.js", "Reliable Games Publishing must run the authoritative rebuild command.");
requireText(rebuildGames, '["generate-sitemaps.js"]', "The authoritative rebuild must regenerate all sitemap artifacts.");
requireText(rebuildGames, '["validate-sitemaps.js"]', "The authoritative rebuild must validate all sitemap artifacts.");
requireText(gamesPublishing, "sitemap.xml", "Reliable Games Publishing must stage the root sitemap index.");
requireText(gamesPublishing, "sitemap-*.xml", "Reliable Games Publishing must stage child sitemaps.");
requireText(gamesPublishing, "gh pr merge", "Reliable Games Publishing must merge generated output back to main after validation.");

const seoWorkflow = read(".github/workflows/seo.yml");
requireText(seoWorkflow, "\n  push:\n    branches:\n      - main", "SEO Automation must run after source changes reach main.");
requireText(seoWorkflow, "node scripts/generate-retro-pages.js", "SEO Automation must regenerate Retro Specials, Retro Events and Amiga Demo Music pages.");
requireText(seoWorkflow, "generate:retro-video-seo", "SEO Automation must regenerate retro video structured data.");
requireText(seoWorkflow, "generate:video-library", "SEO Automation must regenerate the Video Library.");
requireText(seoWorkflow, "generate:sitemaps", "SEO Automation must regenerate sitemap artifacts.");
requireText(seoWorkflow, "validate:sitemaps", "SEO Automation must validate sitemap artifacts.");
requireText(seoWorkflow, "authoritative_game_publish=true", "SEO Automation must avoid racing the authoritative game publisher.");
requireText(seoWorkflow, "gh pr merge", "SEO Automation must merge validated generated output back to main.");

const sitemapFiles = collectSitemapFiles();
if (!sitemapFiles.includes("sitemap.xml")) problems.push("Root sitemap.xml is missing.");
const sitemapLocs = new Set();
for (const filename of sitemapFiles) {
  const xml = read(filename);
  for (const loc of extractLocs(xml)) {
    if (loc.startsWith(`${SITE}/admin`) || loc.includes("/admin/")) {
      problems.push(`${filename} exposes an admin URL: ${loc}`);
    }
    if (/\/games\/game\.html(?:\?|$)/i.test(loc)) {
      problems.push(`${filename} exposes the dynamic game handler instead of a canonical game route: ${loc}`);
    }
    if (/\/games\/[^/]+\.html(?:[?#].*)?$/i.test(loc)) {
      problems.push(`${filename} exposes a flat legacy game redirect: ${loc}`);
    }
    sitemapLocs.add(loc.replace(/[?#].*$/, ""));
  }
}

const rootSitemap = read("sitemap.xml");
for (const filename of sitemapFiles.filter((name) => name !== "sitemap.xml")) {
  if (!rootSitemap.includes(`${SITE}/${filename}`)) {
    problems.push(`Root sitemap.xml does not index local child sitemap ${filename}.`);
  }
}

const htmlRoots = ["games", "retro-specials", "retro-events", "amiga-demo-music", "videos", "music"];
for (const htmlRoot of htmlRoots) {
  for (const filePath of walkHtml(htmlRoot)) {
    const html = fs.readFileSync(filePath, "utf8");
    if (!/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)) continue;
    const relative = path.relative(ROOT, filePath);
    const publicUrl = routeForHtml(relative);
    if (sitemapLocs.has(publicUrl)) {
      problems.push(`Noindex page is present in a sitemap: ${relative} -> ${publicUrl}`);
    }
  }
}

if (problems.length) {
  console.error("Publishing automation / indexing guard failed:");
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}

console.log(`Publishing automation / indexing guard passed (${sitemapFiles.length} sitemap files checked).`);
console.log("Verified: single game publisher, authoritative sitemap regeneration/validation, retro/video SEO automation, robots policy, noindex separation, sitemap ownership and legacy-route exclusion.");
