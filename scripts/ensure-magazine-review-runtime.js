#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const GAMES_DIR = path.join(ROOT, "games");
const TEMPLATE = path.join(GAMES_DIR, "game.html");
const CHECK_ONLY = process.argv.includes("--check");

const TEMPLATE_LOADER = '<script src="../js/load-single-game.js" defer></script>';
const TEMPLATE_RUNTIME = '<script src="../js/magazine-game-reviews-runtime.js" defer></script>';
const PAGE_LOADER = '<script src="/js/load-single-game.js" defer></script>';
const PAGE_RUNTIME = '<script src="/js/magazine-game-reviews-runtime.js" defer></script>';

function fail(message) {
  console.error(`[magazine-review-runtime] ${message}`);
  process.exit(1);
}

function ensureScript(filePath, loader, runtime) {
  const relative = path.relative(ROOT, filePath).replace(/\\/g, "/");
  if (!fs.existsSync(filePath)) return { checked: false, changed: false };

  const html = fs.readFileSync(filePath, "utf8");
  if (html.includes(runtime)) return { checked: true, changed: false };
  if (!html.includes(loader)) fail(`${relative}: cannot find load-single-game.js insertion point.`);

  if (CHECK_ONLY) fail(`${relative}: magazine review runtime is missing.`);

  const updated = html.replace(loader, `${loader}\n${runtime}`);
  fs.writeFileSync(filePath, updated, "utf8");
  console.log(`[magazine-review-runtime] Added runtime to ${relative}`);
  return { checked: true, changed: true };
}

function canonicalPages() {
  if (!fs.existsSync(GAMES_DIR)) return [];
  return fs.readdirSync(GAMES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(GAMES_DIR, entry.name, "index.html"))
    .filter((filePath) => fs.existsSync(filePath));
}

function main() {
  let checked = 0;
  let changed = 0;

  const templateResult = ensureScript(TEMPLATE, TEMPLATE_LOADER, TEMPLATE_RUNTIME);
  checked += templateResult.checked ? 1 : 0;
  changed += templateResult.changed ? 1 : 0;

  for (const filePath of canonicalPages()) {
    const result = ensureScript(filePath, PAGE_LOADER, PAGE_RUNTIME);
    checked += result.checked ? 1 : 0;
    changed += result.changed ? 1 : 0;
  }

  if (!checked) fail("No game template or canonical game pages were found to validate.");

  if (CHECK_ONLY) {
    console.log(`[magazine-review-runtime] Verified runtime on template and ${checked - 1} canonical game pages.`);
  } else {
    console.log(`[magazine-review-runtime] Checked ${checked} files; updated ${changed}.`);
  }
}

main();
