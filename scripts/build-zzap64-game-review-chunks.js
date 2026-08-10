#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const INDEX_PATH = path.join(ROOT, "data", "zzap64-review-links.json");
const OUTPUT_DIR = path.join(ROOT, "data", "zzap64-game-reviews");
const BROWSER_OUTPUT_DIR = path.join(ROOT, "data", "zzap64-additional-reviews");
const CHUNK_NAMES = ["0-d", "e-h", "i-l", "m-p", "q-t", "u-z"];
const GAME_REVIEW_SCOPE = "game-review";

function chunkName(slug) {
  const first = String(slug || "").charAt(0).toLowerCase();
  if (!first) return "";
  if (/\d/.test(first) || first < "e") return "0-d";
  if (first < "i") return "e-h";
  if (first < "m") return "i-l";
  if (first < "q") return "m-p";
  if (first < "u") return "q-t";
  return "u-z";
}

function safeSlug(value) {
  const slug = String(value || "").trim().replace(/^\/+|\/+$/g, "");
  return /^[a-z0-9-]+$/i.test(slug) ? slug : "";
}

function recordDetails(key, row) {
  if (!row || typeof row !== "object") return null;
  const slug = safeSlug(row.gameSlug);
  const issue = Number(row.issue);
  const page = Number(row.page);
  if (!slug || !Number.isInteger(issue) || issue < 1 || !Number.isInteger(page) || page < 1) return null;

  const parts = key.split("|");
  const system = String(row.gameSystem || parts[2] || "c64").toLowerCase() === "amiga" ? "a" : "c";
  const title = String(row.gameTitle || parts.slice(3).join("|") || slug).trim();
  if (!title) return null;

  return { slug, issue, page, system, title };
}

function chunkFiles(games, totals, version = 1) {
  const chunks = Object.fromEntries(CHUNK_NAMES.map((name) => [name, {}]));
  let recordCount = 0;

  Array.from(games.keys()).sort((a, b) => a.localeCompare(b, "en")).forEach((slug) => {
    const rows = Array.from(games.get(slug).values()).sort((a, b) => a[0] - b[0] || a[1] - b[1] || String(a[2]).localeCompare(String(b[2])));
    const target = chunkName(slug);
    if (!target || !chunks[target] || !rows.length) return;
    chunks[target][slug] = rows;
    recordCount += rows.length;
  });

  const files = {};
  CHUNK_NAMES.forEach((name) => {
    files[`${name}.json`] = JSON.stringify({ v: version, games: chunks[name] });
  });

  files["manifest.json"] = JSON.stringify({
    v: version,
    totals: {
      ...totals,
      records: recordCount,
      games: games.size
    },
    chunks: CHUNK_NAMES.map((name) => `${name}.json`)
  });

  return { files, records: recordCount, games: games.size };
}

function build(index) {
  const games = new Map();

  Object.entries(index?.entries || {}).forEach(([key, row]) => {
    const details = recordDetails(key, row);
    if (!details) return;
    const { slug, issue, page, system, title } = details;

    if (!games.has(slug)) games.set(slug, new Map());
    const identity = `${issue}|${page}`;
    if (!games.get(slug).has(identity)) games.get(slug).set(identity, [issue, page, system, title]);
  });

  return chunkFiles(games, {
    sourceRecords: Number(index?.totals?.reviewRecords) || Object.keys(index?.entries || {}).length,
    unmatched: Number(index?.totals?.unmatchedCachedReviewPages) || 0
  });
}

function buildAdditional(index) {
  const entries = Object.entries(index?.entries || {});
  const awardIssues = new Set();

  entries.forEach(([key, row]) => {
    if (row?.scope === GAME_REVIEW_SCOPE) return;
    const details = recordDetails(key, row);
    if (!details) return;
    awardIssues.add(`${details.slug}|${details.system}|${details.issue}`);
  });

  const games = new Map();
  let sourceScans = 0;
  let excludedAwardIssueScans = 0;

  entries.forEach(([key, row]) => {
    if (row?.scope !== GAME_REVIEW_SCOPE) return;
    const details = recordDetails(key, row);
    if (!details) return;
    const { slug, issue, page, system, title } = details;

    if (awardIssues.has(`${slug}|${system}|${issue}`)) {
      excludedAwardIssueScans += 1;
      return;
    }

    sourceScans += 1;
    if (!games.has(slug)) games.set(slug, new Map());

    // A Lemon page can reference several scan pages belonging to the same review.
    // For the archive browser, keep one card per game/platform/issue and point it
    // at the earliest verified page. The full per-page set remains untouched in
    // data/zzap64-game-reviews for individual game-page linking.
    const identity = `${system}|${issue}`;
    const existing = games.get(slug).get(identity);
    if (!existing || page < existing[1]) games.get(slug).set(identity, [issue, page, system, title]);
  });

  const built = chunkFiles(games, {
    sourceRecords: Number(index?.totals?.reviewRecords) || Object.keys(index?.entries || {}).length,
    sourceScans,
    excludedAwardIssueScans,
    collapsedSameIssuePages: Math.max(0, sourceScans - Array.from(games.values()).reduce((total, rows) => total + rows.size, 0)),
    unmatched: Number(index?.totals?.unmatchedCachedReviewPages) || 0
  }, 2);

  return built;
}

function writeFiles(files, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  Object.entries(files).forEach(([name, content]) => {
    fs.writeFileSync(path.join(outputDir, name), content, "utf8");
  });
}

function checkFiles(files, outputDir) {
  const mismatches = [];
  Object.entries(files).forEach(([name, expected]) => {
    const filePath = path.join(outputDir, name);
    const actual = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
    if (actual !== expected) mismatches.push(name);
  });
  return mismatches;
}

function main() {
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
  const built = build(index);
  const additional = buildAdditional(index);

  if (process.argv.includes("--check")) {
    const mismatches = [
      ...checkFiles(built.files, OUTPUT_DIR).map((name) => `zzap64-game-reviews/${name}`),
      ...checkFiles(additional.files, BROWSER_OUTPUT_DIR).map((name) => `zzap64-additional-reviews/${name}`)
    ];
    if (mismatches.length) {
      console.error(`Zzap game review chunks are out of date: ${mismatches.join(", ")}`);
      process.exit(1);
    }
    console.log(
      `Zzap game review chunks are current: ${built.records} linked scans across ${built.games} CCG games; `
      + `${additional.records} additional browser reviews across ${additional.games} games.`
    );
    return;
  }

  writeFiles(built.files, OUTPUT_DIR);
  writeFiles(additional.files, BROWSER_OUTPUT_DIR);
  console.log(
    `Built Zzap review chunks: ${built.records} linked scans across ${built.games} CCG games; `
    + `${additional.records} additional non-award review entries across ${additional.games} games.`
  );
}

if (require.main === module) main();

module.exports = { build, buildAdditional, chunkName, safeSlug };
