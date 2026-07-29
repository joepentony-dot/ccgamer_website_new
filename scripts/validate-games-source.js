#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");

function fail(messages) {
  const list = Array.isArray(messages) ? messages : [messages];
  console.error(`[games-source] Validation failed:\n - ${list.join("\n - ")}`);
  process.exit(1);
}

function normalizePlatform(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "c64" || raw === "commodore 64") return "c64";
  if (raw === "amiga" || raw === "commodore amiga") return "amiga";
  return "";
}

function main() {
  if (!fs.existsSync(gamesPath)) fail("Missing games/games.json");

  let games;
  try {
    games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
  } catch (error) {
    fail(`games/games.json is invalid JSON: ${error.message}`);
  }

  if (!Array.isArray(games) || games.length === 0) {
    fail("games/games.json must contain a non-empty top-level array");
  }

  const errors = [];
  const ids = new Map();
  const slugs = new Map();
  const platformCounts = { c64: 0, amiga: 0 };
  const years = new Set();

  games.forEach((game, index) => {
    const label = `Record ${index + 1}`;
    const id = String(game?.id || "").trim();
    const slug = String(game?.slug || "").trim();
    const title = String(game?.title || "").trim();
    const platform = normalizePlatform(game?.system || game?.platform);
    const year = Number(game?.year);

    if (!id) errors.push(`${label} is missing id`);
    if (!slug) errors.push(`${label} is missing slug`);
    if (!title) errors.push(`${label} is missing title`);
    if (!platform) errors.push(`${label} has unsupported platform: ${game?.system || game?.platform || "(missing)"}`);
    if (!Number.isInteger(year)) errors.push(`${label} has no usable release year`);

    if (id) {
      if (!ids.has(id)) ids.set(id, []);
      ids.get(id).push(index + 1);
    }
    if (slug) {
      if (!slugs.has(slug)) slugs.set(slug, []);
      slugs.get(slug).push(index + 1);
    }
    if (platform) platformCounts[platform] += 1;
    if (Number.isInteger(year)) years.add(year);
  });

  for (const [id, records] of ids.entries()) {
    if (records.length > 1) errors.push(`Duplicate id "${id}" in records ${records.join(", ")}`);
  }
  for (const [slug, records] of slugs.entries()) {
    if (records.length > 1) errors.push(`Duplicate slug "${slug}" in records ${records.join(", ")}`);
  }

  if (errors.length) fail(errors);

  console.log(JSON.stringify({
    gameCount: games.length,
    c64Count: platformCounts.c64,
    amigaCount: platformCounts.amiga,
    representedYears: years.size,
    minimumProtectedBaseline: 651,
    baselineRetained: games.length >= 651
  }, null, 2));

  if (games.length < 651) {
    fail(`Game total fell below the protected Phase 6A baseline: ${games.length} < 651`);
  }
}

if (require.main === module) main();

module.exports = { normalizePlatform };
