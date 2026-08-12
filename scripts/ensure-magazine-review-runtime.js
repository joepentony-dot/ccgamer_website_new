#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const GAMES_DIR = path.join(ROOT, "games");
const GAMES_JSON = path.join(GAMES_DIR, "games.json");
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

function delegatesToGameTemplate(html) {
  const source = String(html || "");
  const hasRefresh = /<meta\b[^>]*http-equiv=(["'])refresh\1[^>]*content=(["'])[^"']*\/games\/game\.html\?id=[^"']+\2/i.test(source);
  const hasRedirect = /window\.location\.replace\(\s*(["'])\/games\/game\.html\?id=[^"']+\1\s*\)/i.test(source);
  return hasRefresh && hasRedirect;
}

function ensureScript(filePath, loader, runtime, options = {}) {
  const relative = path.relative(ROOT, filePath).replace(/\\/g, "/");
  if (!fs.existsSync(filePath)) fail(`${relative}: canonical game page is missing.`);

  const html = fs.readFileSync(filePath, "utf8");
  if (html.includes(runtime)) return { checked: true, changed: false, delegated: false };

  if (options.allowTemplateDelegation && delegatesToGameTemplate(html)) {
    return { checked: true, changed: false, delegated: true };
  }

  if (!html.includes(loader)) fail(`${relative}: cannot find load-single-game.js insertion point.`);

  if (CHECK_ONLY) fail(`${relative}: magazine review runtime is missing.`);

  const updated = html.replace(loader, `${loader}\n${runtime}`);
  fs.writeFileSync(filePath, updated, "utf8");
  console.log(`[magazine-review-runtime] Added runtime to ${relative}`);
  return { checked: true, changed: true, delegated: false };
}

function canonicalPages() {
  if (!fs.existsSync(GAMES_JSON)) fail("games/games.json is missing.");

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(GAMES_JSON, "utf8"));
  } catch (error) {
    fail(`Could not parse games/games.json: ${error.message}`);
  }

  const games = Array.isArray(payload) ? payload : (Array.isArray(payload?.games) ? payload.games : []);
  const slugs = [...new Set(games
    .map((game) => String(game?.slug || "").trim())
    .filter((slug) => /^[a-z0-9-]+$/.test(slug)))];

  if (!slugs.length) fail("games/games.json did not contain any canonical game slugs.");
  return slugs.map((slug) => path.join(GAMES_DIR, slug, "index.html"));
}

function main() {
  let checked = 0;
  let changed = 0;
  let delegated = 0;

  const templateResult = ensureScript(TEMPLATE, TEMPLATE_LOADER, TEMPLATE_RUNTIME);
  checked += templateResult.checked ? 1 : 0;
  changed += templateResult.changed ? 1 : 0;

  const pages = canonicalPages();
  for (const filePath of pages) {
    const result = ensureScript(filePath, PAGE_LOADER, PAGE_RUNTIME, { allowTemplateDelegation: true });
    checked += result.checked ? 1 : 0;
    changed += result.changed ? 1 : 0;
    delegated += result.delegated ? 1 : 0;
  }

  if (CHECK_ONLY) {
    console.log(`[magazine-review-runtime] Verified runtime coverage for template and ${pages.length} canonical game pages (${delegated} delegated redirect wrapper(s)).`);
  } else {
    console.log(`[magazine-review-runtime] Checked template plus ${pages.length} canonical game pages; updated ${changed}; ${delegated} delegated to games/game.html.`);
  }
}

main();
