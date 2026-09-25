#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const STATIC_BADGE_MARKER = 'data-ccg-static-editorial-rating="true"';
const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\x27/g, "&#39;");
}

function ratingValueFor(game) {
  const value = Number(game && game.ccg_rating);
  return Number.isFinite(value) && value >= 1 && value <= 10 ? value : null;
}

function formatRating(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return Number.isInteger(number) ? String(number) : String(Math.round(number * 10) / 10);
}

function reviewFor(game, canonicalUrl) {
  const rating = ratingValueFor(game);
  if (rating === null) return null;
  return {
    "@type": "Review",
    "@id": canonicalUrl + "#ccg-review",
    "author": {
      "@type": "Organization",
      "name": "Cheeky Commodore Gamer",
      "url": SITE_ORIGIN + "/about.html"
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": rating,
      "bestRating": 10,
      "worstRating": 1
    }
  };
}

function updateGraph(html, game) {
  const scriptRe = /<script\b(?=[^>]*type\s*=\s*(["\x27])application\/ld\+json\1)(?=[^>]*data-ccg-schema\s*=\s*(["\x27])game-graph\2)[^>]*>([\s\S]*?)<\/script>/i;
  const match = String(html).match(scriptRe);
  if (!match) throw new Error("Missing game graph for " + game.slug);

  let payload;
  try {
    payload = JSON.parse(match[3].trim());
  } catch (error) {
    throw new Error("Invalid game graph for " + game.slug + ": " + error.message);
  }

  const graph = Array.isArray(payload && payload["@graph"]) ? payload["@graph"] : [];
  const gameNode = graph.find((entry) => {
    const types = Array.isArray(entry && entry["@type"]) ? entry["@type"] : [entry && entry["@type"]];
    return types.includes("VideoGame");
  });
  if (!gameNode) throw new Error("Game graph has no VideoGame node for " + game.slug);

  const canonicalUrl = SITE_ORIGIN + "/games/" + game.slug + "/";
  const review = reviewFor(game, canonicalUrl);
  if (review) {
    gameNode.review = review;
  } else if (gameNode.review && gameNode.review["@id"] === canonicalUrl + "#ccg-review") {
    delete gameNode.review;
  }

  payload["@context"] = payload["@context"] || "https://schema.org";
  payload["@graph"] = graph;
  const json = JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const replacement = match[0].replace(match[3], () => json);
  return String(html).replace(scriptRe, () => replacement);
}

function updateStaticRatingBadge(html, game) {
  let output = String(html);
  const existing = /\s*<div\b(?=[^>]*class=(["\x27])[^"\x27]*\bgame-hero__badges\b[^"\x27]*\1)(?=[^>]*data-ccg-static-editorial-rating=(["\x27])true\2)[^>]*>[\s\S]*?<\/div>/i;
  output = output.replace(existing, "");

  const rating = ratingValueFor(game);
  if (rating === null) return output;
  const label = formatRating(rating) + "/10";
  const badge = [
    '                    <div class="game-hero__badges" ' + STATIC_BADGE_MARKER + ">",
    '                        <span class="game-badge game-badge--rating" aria-label="Cheeky Commodore Gamer rating: ' + escapeHtml(label) + '" title="Cheeky Commodore Gamer rating">' + escapeHtml(label) + "</span>",
    "                    </div>"
  ].join("\n");

  const titleRowRe = /(<div\b[^>]*class=(["\x27])[^"\x27]*\bgame-hero__title-row\b[^"\x27]*\2[^>]*>[\s\S]*?<\/div>)/i;
  if (!titleRowRe.test(output)) throw new Error("Missing hero title row for " + game.slug);
  return output.replace(titleRowRe, "$1\n\n" + badge);
}

function applyReviewToHtml(html, game) {
  return updateStaticRatingBadge(updateGraph(html, game), game);
}

function writeIfChanged(filePath, content) {
  const previous = fs.readFileSync(filePath, "utf8");
  if (previous === content) return false;
  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

function run(options = {}) {
  const root = path.resolve(options.root || repoRoot);
  const source = JSON.parse(fs.readFileSync(path.join(root, "games", "games.json"), "utf8"));
  const games = Array.isArray(source) ? source : (source.games || []);
  let rated = 0;
  let updated = 0;

  for (const game of games) {
    const slug = String(game && game.slug || "").trim();
    if (!slug) continue;
    const filePath = path.join(root, "games", slug, "index.html");
    if (!fs.existsSync(filePath)) throw new Error("Missing canonical game page: games/" + slug + "/index.html");
    if (ratingValueFor(game) !== null) rated += 1;
    const html = fs.readFileSync(filePath, "utf8");
    const next = applyReviewToHtml(html, game);
    if (writeIfChanged(filePath, next)) updated += 1;
  }

  return { games: games.length, rated, updated };
}

function main() {
  const result = run();
  console.log("[game-review-seo] Canonical games checked: " + result.games);
  console.log("[game-review-seo] Rated games marked up: " + result.rated);
  console.log("[game-review-seo] Pages updated: " + result.updated);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("[game-review-seo] " + error.message);
    process.exit(1);
  }
}

module.exports = {
  SITE_ORIGIN,
  STATIC_BADGE_MARKER,
  applyReviewToHtml,
  formatRating,
  ratingValueFor,
  reviewFor,
  run,
  updateGraph,
  updateStaticRatingBadge
};
