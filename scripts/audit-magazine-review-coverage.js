#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const GAMES_PATH = path.join(ROOT, "games", "games.json");
const REVIEW_DIR = path.join(ROOT, "data", "magazine-review-records");
const SUPPLEMENTS_DIR = path.join(REVIEW_DIR, "supplements");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normaliseSystem(value) {
  const system = String(value || "").trim().toLowerCase();
  if (system === "c64" || system.includes("commodore 64")) return "c64";
  if (system === "amiga" || system.includes("amiga")) return "amiga";
  return "";
}

function loadReviewKeys() {
  const keys = new Set();
  const files = [];

  if (fs.existsSync(REVIEW_DIR)) {
    fs.readdirSync(REVIEW_DIR)
      .filter((name) => name.toLowerCase().endsWith(".json"))
      .forEach((name) => files.push(path.join(REVIEW_DIR, name)));
  }
  if (fs.existsSync(SUPPLEMENTS_DIR)) {
    fs.readdirSync(SUPPLEMENTS_DIR)
      .filter((name) => name.toLowerCase().endsWith(".json"))
      .forEach((name) => files.push(path.join(SUPPLEMENTS_DIR, name)));
  }

  files.sort((a, b) => a.localeCompare(b)).forEach((filePath) => {
    const payload = readJson(filePath);
    Object.entries(payload.games || {}).forEach(([key, rows]) => {
      if (Array.isArray(rows) && rows.length) keys.add(String(key).trim().toLowerCase());
    });
  });

  return keys;
}

function main() {
  const games = readJson(GAMES_PATH);
  if (!Array.isArray(games)) throw new Error("games/games.json must contain an array.");

  const reviewKeys = loadReviewKeys();
  const catalogueKeys = [];
  const missing = [];
  const platform = {
    c64: { total: 0, missing: [] },
    amiga: { total: 0, missing: [] }
  };

  games.forEach((game) => {
    const system = normaliseSystem(game?.system);
    const slug = String(game?.slug || "").trim().toLowerCase();
    if (!system || !slug) return;
    const key = `${system}:${slug}`;
    catalogueKeys.push(key);
    platform[system].total += 1;
    if (!reviewKeys.has(key)) {
      missing.push(key);
      platform[system].missing.push(key);
    }
  });

  const covered = catalogueKeys.length - missing.length;
  console.log(`[magazine-review-coverage] Catalogue games checked: ${catalogueKeys.length}`);
  console.log(`[magazine-review-coverage] Games with curated magazine review records: ${covered}`);
  console.log(`[magazine-review-coverage] Games without a curated review record: ${missing.length}`);
  console.log(`[magazine-review-coverage] C64: ${platform.c64.total - platform.c64.missing.length}/${platform.c64.total} with review records; ${platform.c64.missing.length} without.`);
  console.log(`[magazine-review-coverage] Amiga: ${platform.amiga.total - platform.amiga.missing.length}/${platform.amiga.total} with review records; ${platform.amiga.missing.length} without.`);
  console.log("[magazine-review-coverage] New or enrichment-relevant changed games are validated separately before publishing can be marked complete; missing historical reviews are reported but never invented.");

  if (process.argv.includes("--verbose") && missing.length) {
    if (platform.c64.missing.length) {
      console.log(`[magazine-review-coverage] Missing C64 source records: ${platform.c64.missing.join(", ")}`);
    }
    if (platform.amiga.missing.length) {
      console.log(`[magazine-review-coverage] Missing Amiga source records: ${platform.amiga.missing.join(", ")}`);
    }
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[magazine-review-coverage] ${error.message}`);
    process.exit(1);
  }
}

module.exports = { loadReviewKeys, normaliseSystem };
