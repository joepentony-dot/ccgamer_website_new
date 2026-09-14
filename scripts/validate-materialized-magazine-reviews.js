#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
  materializeMagazineReviewsHtml,
  reviewRowsForGame,
} = require("./ensure-magazine-review-runtime.js");

const ROOT = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const GAMES_JSON = path.join(ROOT, "games", "games.json");

function fail(message) {
  console.error(`[validate-materialized-magazine-reviews] ${message}`);
  if (process.env.GITHUB_ACTIONS === "true") {
    const safeMessage = String(message || "Magazine review materialization validation failed")
      .replace(/%/g, "%25")
      .replace(/\r/g, "%0D")
      .replace(/\n/g, "%0A");
    console.error(`::error title=Magazine review materialization::${safeMessage}`);
  }
  process.exit(1);
}

function readGames() {
  if (!fs.existsSync(GAMES_JSON)) fail("games/games.json is missing.");
  const parsed = JSON.parse(fs.readFileSync(GAMES_JSON, "utf8"));
  return (Array.isArray(parsed) ? parsed : (parsed?.games || []))
    .filter((game) => /^[a-z0-9-]+$/.test(String(game?.slug || "").trim()));
}

function delegatesToGameTemplate(html) {
  const source = String(html || "");
  const hasRefresh = /<meta\b[^>]*http-equiv=(["'])refresh\1[^>]*content=(["'])[^"']*\/games\/game\.html\?id=[^"']+\2/i.test(source);
  const hasRedirect = /window\.location\.replace\(\s*(["'])\/games\/game\.html\?id=[^"']+\1\s*\)/i.test(source);
  return hasRefresh && hasRedirect;
}

function validateGamePage(game) {
  const slug = String(game?.slug || "").trim();
  const rows = reviewRowsForGame(game, slug);
  if (!rows.length) return { reviewed: false, rows: 0, delegated: false };

  const pagePath = path.join(ROOT, "games", slug, "index.html");
  const relative = path.relative(ROOT, pagePath).replace(/\\/g, "/");
  if (!fs.existsSync(pagePath)) {
    throw new Error(`${relative}: ${rows.length} magazine review record(s) exist but the canonical page is missing.`);
  }

  const html = fs.readFileSync(pagePath, "utf8");
  if (delegatesToGameTemplate(html)) {
    // Redirect wrappers intentionally have no per-game static container. Their shared
    // games/game.html destination is guarded by ensure-magazine-review-runtime.js and
    // serves these same validated review rows at runtime.
    return { reviewed: false, rows: rows.length, delegated: true };
  }

  const expected = materializeMagazineReviewsHtml(html, rows);
  if (!expected.foundContainer) {
    throw new Error(`${relative}: ${rows.length} magazine review record(s) exist but no magazine review container is present.`);
  }
  if (expected.changed) {
    throw new Error(`${relative}: ${rows.length} magazine review record(s) exist but the final canonical HTML is not materialized or is out of date.`);
  }
  if (!html.includes('data-ccg-static-magazine-reviews="true"')) {
    throw new Error(`${relative}: static magazine review marker is missing.`);
  }
  if (!html.includes(`Magazine Reviews · ${rows.length}`)) {
    throw new Error(`${relative}: rendered magazine review count does not match the ${rows.length} source record(s).`);
  }

  return { reviewed: true, rows: rows.length, delegated: false };
}

function main() {
  const games = readGames();
  const errors = [];
  let reviewedPages = 0;
  let reviewRows = 0;
  let delegatedPages = 0;
  let delegatedRows = 0;

  for (const game of games) {
    try {
      const result = validateGamePage(game);
      if (result.reviewed) {
        reviewedPages += 1;
        reviewRows += result.rows;
      }
      if (result.delegated) {
        delegatedPages += 1;
        delegatedRows += result.rows;
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (errors.length) {
    fail(`${errors.length} canonical game page(s) failed magazine review materialization:\n- ${errors.join("\n- ")}`);
  }

  console.log(
    `[validate-materialized-magazine-reviews] Verified ${reviewRows} review record(s) materialized across ${reviewedPages} canonical game page(s); `
    + `${delegatedRows} review record(s) across ${delegatedPages} intentional redirect wrapper(s) remain served by the guarded shared game template.`
  );
}

if (require.main === module) main();

module.exports = {
  delegatesToGameTemplate,
  validateGamePage,
};
