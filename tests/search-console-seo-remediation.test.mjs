import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const legacy = require("../scripts/generate-legacy-seo-redirects.js");
const review = require("../scripts/apply-game-review-seo.js");

test("Search Console legacy routes map to current canonical destinations", () => {
  const entries = legacy.loadRedirects(repoRoot);
  const bySource = new Map(entries.map((entry) => [entry.source, entry.target]));

  assert.equal(bySource.get("retro-events/index.html"), "/games/collections/retro-events.html");
  assert.equal(bySource.get("amiga-demo-music/index.html"), "/games/collections/amiga-demo-music.html");
  assert.equal(bySource.get("games/smash-t-v/index.html"), "/games/smash-tv/");
  assert.equal(bySource.get("games/fist-ii-the-legend-continues/index.html"), "/games/fist-2-the-legend-continues/");
  assert.equal(bySource.get("games/genres/miscellaneous-games.html"), "/games/genres/miscellaneous.html");
  assert.equal(bySource.get("amiga-demo-music/amiga-demo-music-track-10/index.html"), "/amiga-demo-music/red-sector-folow-me/");
  assert.ok(!entries.some((entry) => entry.source.toLowerCase().startsWith("this")), "malformed /This must not be redirected");

  const existingBc2 = fs.readFileSync(path.join(repoRoot, "games", "bc2-grog-s-revenge", "index.html"), "utf8");
  assert.match(existingBc2, /name="robots" content="noindex,follow"/);
  assert.match(existingBc2, /canonical" href="https:\/\/www\.cheekycommodoregamer\.co\.uk\/games\/bc2-grogs-revenge\//);
});

test("legacy redirect output is noindex and direct-to-canonical", () => {
  const html = legacy.renderRedirect({
    source: "games/example/index.html",
    target: "/games/smash-tv/",
    title: "Smash TV"
  });
  assert.match(html, /name="robots" content="noindex,follow"/);
  assert.match(html, /rel="canonical" href="https:\/\/www\.cheekycommodoregamer\.co\.uk\/games\/smash-tv\/"/);
  assert.match(html, /window\.location\.replace\("\/games\/smash-tv\/" \+ window\.location\.search \+ window\.location\.hash\)/);
});

test("editorial CCG score becomes a nested visible Review, not an aggregate", () => {
  const game = { slug: "test-game", title: "Test Game", ccg_rating: 8 };
  const html = [
    "<html><head>",
    '<script type="application/ld+json" data-ccg-schema="game-graph">{"@context":"https://schema.org","@graph":[{"@type":"VideoGame","name":"Test Game","url":"https://www.cheekycommodoregamer.co.uk/games/test-game/"},{"@type":"BreadcrumbList"}]}</script>',
    "</head><body>",
    '<div class="game-hero__content"><div class="game-hero__title-row"><h1>Test Game</h1></div></div>',
    "</body></html>"
  ].join("\n");
  const next = review.applyReviewToHtml(html, game);
  const match = next.match(/data-ccg-schema="game-graph">([\s\S]*?)<\/script>/);
  assert.ok(match);
  const payload = JSON.parse(match[1]);
  const gameNode = payload["@graph"].find((entry) => entry["@type"] === "VideoGame");
  assert.equal(gameNode.review["@type"], "Review");
  assert.equal(gameNode.review.reviewRating.ratingValue, 8);
  assert.equal(gameNode.review.reviewRating.bestRating, 10);
  assert.equal(gameNode.review.author.name, "Cheeky Commodore Gamer");
  assert.equal(gameNode.aggregateRating, undefined);
  assert.match(next, /data-ccg-static-editorial-rating="true"/);
  assert.match(next, /Cheeky Commodore Gamer rating: 8\/10/);
});

test("review JSON-LD preserves dollar-prefixed game text", () => {
  const game = { slug: "system-15000", title: "System 15000", ccg_rating: 7 };
  const html = [
    "<html><head>",
    '<script type="application/ld+json" data-ccg-schema="game-graph">{"@context":"https://schema.org","@graph":[{"@type":"VideoGame","name":"System 15000","description":"A $15,000 computer caper with $1 clues.","url":"https://www.cheekycommodoregamer.co.uk/games/system-15000/"},{"@type":"BreadcrumbList"}]}</script>',
    "</head><body>",
    '<div class="game-hero__content"><div class="game-hero__title-row"><h1>System 15000</h1></div></div>',
    "</body></html>"
  ].join("\n");
  const next = review.applyReviewToHtml(html, game);
  const match = next.match(/data-ccg-schema="game-graph">([\s\S]*?)<\/script>/);
  assert.ok(match);
  const payload = JSON.parse(match[1]);
  const gameNode = payload["@graph"].find((entry) => entry["@type"] === "VideoGame");
  assert.equal(gameNode.description, "A $15,000 computer caper with $1 clues.");
  assert.equal(gameNode.review.reviewRating.ratingValue, 7);
});

test("legacy game loader contains guarded redirects for Search Console soft-404 IDs", () => {
  const html = fs.readFileSync(path.join(repoRoot, "games", "game.html"), "utf8");
  for (const token of [
    "willow_pattern",
    "h.e.r.o.",
    "manic_mansion",
    "north_&_south",
    "cops_\x27n\x27_robbers"
  ]) {
    assert.ok(html.includes(token), "missing legacy game alias " + token);
  }
  assert.match(html, /window\.location\.replace\(path \+ window\.location\.hash\)/);
});

test("sitemap generator never invents a retro root URL without an indexable root page", () => {
  const source = fs.readFileSync(path.join(repoRoot, "tools", "seo", "generate-sitemap.js"), "utf8");
  assert.match(source, /Root landing page is not indexable/);
  assert.match(source, /rootIndexPath/);
});
