#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const gamesDir = path.join(repoRoot, "games");
const templatePath = path.join(gamesDir, "game.html");
const CHECK_ONLY = process.argv.includes("--check");
const GAME_MEDIA_EXTENSION = /\.(?:adf|adz|d64|d71|d81|g64|t64|tap|tzx|prg|crt|ipf|hdf|lha|rom)(?:[?#][^"'\s<]*)?/i;

function fail(message) {
  console.error(`[manual-only-games] ${message}`);
  process.exit(1);
}

function isCanonicalGamePage(filePath) {
  const relative = path.relative(gamesDir, filePath).replace(/\\/g, "/");
  if (!/^[^/]+\/index\.html$/.test(relative)) return false;
  const first = relative.split("/")[0].toLowerCase();
  return !new Set([
    "collections",
    "genres",
    "publishers",
    "developers",
    "years",
    "platforms",
    "downloads"
  ]).has(first);
}

function canonicalGamePages() {
  if (!fs.existsSync(gamesDir)) return [];
  return fs.readdirSync(gamesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(gamesDir, entry.name, "index.html"))
    .filter((filePath) => fs.existsSync(filePath) && isCanonicalGamePage(filePath));
}

function stripLegacyDownloadSection(html) {
  let next = String(html || "");
  next = next.replace(
    /\n?\s*<section\b[^>]*\bid=["']game-download-section["'][\s\S]*?<\/section>\s*/i,
    "\n"
  );
  return next;
}

function validateManualOnlyHtml(html, label) {
  const failures = [];
  if (/\bid=["']game-download-section["']/i.test(html)) failures.push("legacy game-download section remains");
  if (/\bid=["']game-download-card["']/i.test(html)) failures.push("legacy game-download card remains");
  if (/\bid=["']gameDiskBtn["']/i.test(html)) failures.push("legacy disk/tape button remains");
  if (/Authorised Game Download/i.test(html)) failures.push("legacy game-download heading remains");
  if (/Download Disk\s*\/\s*Tape/i.test(html)) failures.push("legacy disk/tape action remains");

  const hrefs = Array.from(String(html || "").matchAll(/href=["']([^"']+)["']/gi), (match) => match[1]);
  const mediaHref = hrefs.find((href) => GAME_MEDIA_EXTENSION.test(href));
  if (mediaHref) failures.push(`playable game-media href remains: ${mediaHref}`);

  if (failures.length) fail(`${label}: ${failures.join("; ")}`);
}

function updateFile(filePath) {
  const label = path.relative(repoRoot, filePath).replace(/\\/g, "/");
  const current = fs.readFileSync(filePath, "utf8");
  const next = stripLegacyDownloadSection(current);

  if (CHECK_ONLY && next !== current) {
    fail(`${label}: legacy game-download UI is still present.`);
  }

  if (!CHECK_ONLY && next !== current) {
    fs.writeFileSync(filePath, next, "utf8");
  }

  validateManualOnlyHtml(CHECK_ONLY ? current : next, label);
  return next !== current;
}

function main() {
  if (!fs.existsSync(templatePath)) fail("games/game.html is missing.");

  const pages = [templatePath, ...canonicalGamePages()];
  let changed = 0;
  pages.forEach((filePath) => {
    if (updateFile(filePath)) changed += 1;
  });

  console.log(`[manual-only-games] Checked ${pages.length} single-game HTML file(s).`);
  console.log(`[manual-only-games] ${CHECK_ONLY ? "Would change" : "Changed"}: ${changed}.`);
  console.log("[manual-only-games] No visitor-facing disk, tape, cartridge or game-image download controls remain on game pages.");
  console.log("[manual-only-games] PDF/manual presentation is unaffected.");
}

main();
