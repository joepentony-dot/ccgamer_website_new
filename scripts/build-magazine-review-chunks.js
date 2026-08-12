#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "data", "magazine-review-records");
const SUPPLEMENTS = path.join(SOURCE, "supplements");
const OUTPUT = path.join(ROOT, "data", "magazine-game-reviews");
const CHUNKS = ["0-d", "e-h", "i-l", "m-p", "q-t", "u-z"];

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

function readSource() {
  const games = {};
  CHUNKS.forEach((name) => {
    const parsed = JSON.parse(fs.readFileSync(path.join(SOURCE, `${name}.json`), "utf8"));
    Object.assign(games, parsed.games || {});
  });

  if (fs.existsSync(SUPPLEMENTS)) {
    fs.readdirSync(SUPPLEMENTS)
      .filter((name) => name.toLowerCase().endsWith(".json"))
      .sort((a, b) => a.localeCompare(b))
      .forEach((name) => {
        const parsed = JSON.parse(fs.readFileSync(path.join(SUPPLEMENTS, name), "utf8"));
        Object.assign(games, parsed.games || {});
      });
  }

  return { version: 1, games };
}

function validUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function cleanRecord(record) {
  if (!record || typeof record !== "object") return null;
  const magazine = String(record.magazine || "").trim();
  const score = String(record.score || "").trim();
  const scorePercent = Number(record.scorePercent);
  if (!magazine || !score || !Number.isFinite(scorePercent) || scorePercent < 0 || scorePercent > 100) return null;
  const url = validUrl(record.url);

  return {
    magazine,
    issue: String(record.issue || "").trim(),
    date: String(record.date || "").trim(),
    page: Number.isFinite(Number(record.page)) ? Number(record.page) : null,
    reviewer: String(record.reviewer || "").trim(),
    score,
    scorePercent,
    url,
    language: String(record.language || "English").trim(),
    scanStatus: record.scanStatus === "missing" ? "missing" : (url ? "available" : "missing"),
    era: record.era === "retrospective" ? "retrospective" : "contemporary"
  };
}

function build(source) {
  const output = Object.fromEntries(CHUNKS.map((name) => [name, {}]));
  let records = 0;
  let games = 0;

  Object.entries(source.games || {}).forEach(([key, rows]) => {
    const match = String(key).toLowerCase().match(/^(c64|amiga):([a-z0-9-]+)$/);
    if (!match || !Array.isArray(rows)) return;
    const slug = match[2];
    const chunk = chunkName(slug);
    const cleaned = rows.map(cleanRecord).filter(Boolean);
    if (!cleaned.length || !chunk) return;
    output[chunk][key.toLowerCase()] = cleaned;
    games += 1;
    records += cleaned.length;
  });

  const files = Object.fromEntries(CHUNKS.map((name) => [
    `${name}.json`,
    JSON.stringify({ version: 1, games: output[name] })
  ]));
  files["manifest.json"] = JSON.stringify({ version: 1, games, records, chunks: CHUNKS.map((name) => `${name}.json`) });
  return { files, games, records };
}

function write(files) {
  fs.mkdirSync(OUTPUT, { recursive: true });
  Object.entries(files).forEach(([name, content]) => fs.writeFileSync(path.join(OUTPUT, name), content, "utf8"));
}

function check(files) {
  return Object.entries(files)
    .filter(([name, expected]) => {
      const target = path.join(OUTPUT, name);
      return !fs.existsSync(target) || fs.readFileSync(target, "utf8") !== expected;
    })
    .map(([name]) => name);
}

function main() {
  const source = readSource();
  const built = build(source);
  if (process.argv.includes("--check")) {
    const mismatches = check(built.files);
    if (mismatches.length) {
      console.error(`Magazine review chunks are out of date: ${mismatches.join(", ")}`);
      process.exit(1);
    }
    console.log(`Magazine review chunks verified: ${built.records} reviews across ${built.games} games.`);
    return;
  }
  write(built.files);
  console.log(`Built magazine review chunks: ${built.records} reviews across ${built.games} games.`);
}

if (require.main === module) main();

module.exports = { build, chunkName, cleanRecord };
