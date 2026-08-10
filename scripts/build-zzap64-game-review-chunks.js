#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const INDEX_PATH = path.join(ROOT, "data", "zzap64-review-links.json");
const OUTPUT_DIR = path.join(ROOT, "data", "zzap64-game-reviews");
const CHUNK_NAMES = ["0-d", "e-h", "i-l", "m-p", "q-t", "u-z"];

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

function build(index) {
  const games = new Map();

  Object.entries(index?.entries || {}).forEach(([key, row]) => {
    if (!row || typeof row !== "object") return;
    const slug = safeSlug(row.gameSlug);
    const issue = Number(row.issue);
    const page = Number(row.page);
    if (!slug || !Number.isInteger(issue) || issue < 1 || !Number.isInteger(page) || page < 1) return;

    const parts = key.split("|");
    const system = String(row.gameSystem || parts[2] || "c64").toLowerCase() === "amiga" ? "a" : "c";
    const title = String(row.gameTitle || parts.slice(3).join("|") || slug).trim();
    if (!title) return;

    if (!games.has(slug)) games.set(slug, new Map());
    const identity = `${issue}|${page}`;
    if (!games.get(slug).has(identity)) games.get(slug).set(identity, [issue, page, system, title]);
  });

  const chunks = Object.fromEntries(CHUNK_NAMES.map((name) => [name, {}]));
  let recordCount = 0;

  Array.from(games.keys()).sort((a, b) => a.localeCompare(b, "en")).forEach((slug) => {
    const rows = Array.from(games.get(slug).values()).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const target = chunkName(slug);
    if (!target || !chunks[target]) return;
    chunks[target][slug] = rows;
    recordCount += rows.length;
  });

  const files = {};
  CHUNK_NAMES.forEach((name) => {
    files[`${name}.json`] = JSON.stringify({ v: 1, games: chunks[name] });
  });

  files["manifest.json"] = JSON.stringify({
    v: 1,
    totals: {
      records: recordCount,
      games: games.size,
      sourceRecords: Number(index?.totals?.reviewRecords) || Object.keys(index?.entries || {}).length,
      unmatched: Number(index?.totals?.unmatchedCachedReviewPages) || 0
    },
    chunks: CHUNK_NAMES.map((name) => `${name}.json`)
  });

  return { files, records: recordCount, games: games.size };
}

function writeFiles(files) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  Object.entries(files).forEach(([name, content]) => {
    fs.writeFileSync(path.join(OUTPUT_DIR, name), content, "utf8");
  });
}

function checkFiles(files) {
  const mismatches = [];
  Object.entries(files).forEach(([name, expected]) => {
    const filePath = path.join(OUTPUT_DIR, name);
    const actual = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
    if (actual !== expected) mismatches.push(name);
  });
  return mismatches;
}

function main() {
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
  const built = build(index);

  if (process.argv.includes("--check")) {
    const mismatches = checkFiles(built.files);
    if (mismatches.length) {
      console.error(`Zzap game review chunks are out of date: ${mismatches.join(", ")}`);
      process.exit(1);
    }
    console.log(`Zzap game review chunks are current: ${built.records} scans across ${built.games} CCG games.`);
    return;
  }

  writeFiles(built.files);
  console.log(`Built compact Zzap game review chunks: ${built.records} scans across ${built.games} CCG games.`);
}

if (require.main === module) main();

module.exports = { build, chunkName, safeSlug };
