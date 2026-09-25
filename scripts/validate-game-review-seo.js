#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { SITE_ORIGIN, STATIC_BADGE_MARKER, formatRating, ratingValueFor } = require("./apply-game-review-seo");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) throw new Error("[validate-game-review-seo] " + message);
}

function schemaGraph(html, slug) {
  const match = String(html).match(/<script\b(?=[^>]*type\s*=\s*(["\x27])application\/ld\+json\1)(?=[^>]*data-ccg-schema\s*=\s*(["\x27])game-graph\2)[^>]*>([\s\S]*?)<\/script>/i);
  assert(match, slug + ": missing game graph.");
  try {
    const payload = JSON.parse(match[3].trim());
    return Array.isArray(payload && payload["@graph"]) ? payload["@graph"] : [];
  } catch (error) {
    throw new Error("[validate-game-review-seo] " + slug + ": invalid game graph: " + error.message);
  }
}

function main() {
  const source = JSON.parse(fs.readFileSync(path.join(repoRoot, "games", "games.json"), "utf8"));
  const games = Array.isArray(source) ? source : (source.games || []);
  let rated = 0;
  let unrated = 0;

  for (const game of games) {
    const slug = String(game && game.slug || "").trim();
    if (!slug) continue;
    const filePath = path.join(repoRoot, "games", slug, "index.html");
    assert(fs.existsSync(filePath), slug + ": canonical page is missing.");
    const html = fs.readFileSync(filePath, "utf8");
    const graph = schemaGraph(html, slug);
    const gameNode = graph.find((entry) => {
      const types = Array.isArray(entry && entry["@type"]) ? entry["@type"] : [entry && entry["@type"]];
      return types.includes("VideoGame");
    });
    assert(gameNode, slug + ": VideoGame node is missing.");

    const rating = ratingValueFor(game);
    const canonical = SITE_ORIGIN + "/games/" + slug + "/";
    if (rating === null) {
      unrated += 1;
      assert(!(gameNode.review && gameNode.review["@id"] === canonical + "#ccg-review"), slug + ": unrated game retained CCG review markup.");
      assert(!html.includes(STATIC_BADGE_MARKER), slug + ": unrated game retained static editorial rating badge.");
      continue;
    }

    rated += 1;
    const review = gameNode.review;
    assert(review && review["@type"] === "Review", slug + ": nested Review is missing.");
    assert(review["@id"] === canonical + "#ccg-review", slug + ": Review @id is incorrect.");
    assert(review.author && review.author["@type"] === "Organization", slug + ": Review author must be an Organization.");
    assert(review.author.name === "Cheeky Commodore Gamer", slug + ": Review author name is incorrect.");
    assert(review.author.url === SITE_ORIGIN + "/about.html", slug + ": Review author URL is incorrect.");
    assert(!Object.prototype.hasOwnProperty.call(review, "itemReviewed"), slug + ": nested Review must not duplicate itemReviewed.");
    assert(review.reviewRating && review.reviewRating["@type"] === "Rating", slug + ": reviewRating is missing.");
    assert(Number(review.reviewRating.ratingValue) === rating, slug + ": review rating does not match games.json.");
    assert(Number(review.reviewRating.bestRating) === 10, slug + ": bestRating must be 10.");
    assert(Number(review.reviewRating.worstRating) === 1, slug + ": worstRating must be 1.");
    assert(html.includes(STATIC_BADGE_MARKER), slug + ": static editorial rating badge is missing.");
    const label = formatRating(rating) + "/10";
    assert(html.includes("Cheeky Commodore Gamer rating: " + label), slug + ": visible rating label is missing.");
  }

  assert(rated > 0, "No rated games were validated.");
  console.log("[validate-game-review-seo] PASS — " + rated + " rated games have visible, nested Review markup; " + unrated + " unrated games remain unmarked.");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { schemaGraph };
