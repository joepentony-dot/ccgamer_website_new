import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");

test("shared single-game template uses compact bottom community and affiliate shells", () => {
  const template = read("games/game.html");

  assert.match(template, /ccg-community-compact-shell/);
  assert.match(template, /id="ccg-community-compact-score" hidden/);
  assert.match(template, /id="ccg-community-rating-panel"/);
  assert.doesNotMatch(template, /ccg-community-rating-panel" open/);

  assert.match(template, /class="ccg-amazon-mark"/);
  assert.match(template, />View Amazon Picks</);
  assert.match(template, /data-hardware-panel hidden/);
});

test("shared runtime pairs overview with a squarer video and retrofits generated pages", () => {
  const loader = read("js/load-single-game.js");

  assert.match(loader, /ccg-game-intro-section/);
  assert.match(loader, /data-ccg-video-description/);
  assert.match(loader, /initCompactSingleGamePanels/);
  assert.match(loader, /ccg-community-compact-shell/);
  assert.match(loader, /rating\.open = false/);
  assert.match(loader, /comments\.open = false/);
  assert.match(loader, /ccg-compact-explore/);
});

test("community collapsed summary exposes a score only after a non-zero rating exists", () => {
  const ratings = read("js/ccg-community-ratings.js");
  const css = read("resources/css/ccg-community.css");

  assert.match(ratings, /ccg-community-compact-score/);
  assert.match(ratings, /if \(!count \|\| average <= 0\)/);
  assert.match(ratings, /compact\.hidden = true/);
  assert.match(ratings, /compact\.hidden = false/);

  assert.match(css, /SINGLE-GAME COMPACT COMMUNITY SHELL/);
  assert.match(css, /\.ccg-community-compact-summary/);
  assert.match(css, /\.ccg-community-compact-score\[hidden\]/);
});

test("affiliate recommendations stay collapsed at the bottom of single-game pages", () => {
  const affiliate = read("js/affiliate-products.js");
  const css = read("resources/css/ccg-affiliate-showcase.css");

  assert.match(affiliate, /const quickActions = parent\.querySelector\(":scope > \.game-quick-actions"\)/);
  assert.match(affiliate, /const community = parent\.querySelector\(":scope > \.ccg-community-game-section"\)/);
  assert.match(affiliate, /panel\.hidden = true/);
  assert.match(affiliate, /ccgAffiliateToggleWired/);
  assert.match(affiliate, /ccg-amazon-mark/);
  assert.match(affiliate, /View Amazon Picks/);

  assert.match(css, /SINGLE-GAME COMPACT AFFILIATE ACCORDION/);
  assert.match(css, /\.ccg-hardware-panel\[hidden\]/);
  assert.match(css, /\.ccg-amazon-mark/);
});

test("manual, music and archive discovery use compact rows and video is 4 by 3 on desktop", () => {
  const css = read("resources/css/game-pages.css");

  assert.match(css, /CCG SINGLE-GAME COMPACT RESOURCE FLOW/);
  assert.match(css, /#game-video-section\.ccg-game-intro-section/);
  assert.match(css, /aspect-ratio:\s*4 \/ 3/);
  assert.match(css, /#game-utility-hub-section:not\(\[hidden\]\)/);
  assert.match(css, /#game-music-archive-section:not\(\[hidden\]\)/);
  assert.match(css, /#game-discovery-links\.ccg-compact-explore:not\(\[hidden\]\)/);
});

test("existing canonical pages inherit the shared compact runtime without per-game rewrites", () => {
  const davy = read("games/davy-king-of-the-wild-frontier/index.html");

  assert.match(davy, /\/resources\/css\/game-pages\.css/);
  assert.match(davy, /\/resources\/css\/ccg-community\.css/);
  assert.match(davy, /\/js\/load-single-game\.js/);
  assert.match(davy, /\/js\/affiliate-products\.js/);
  assert.match(davy, /id="game-video-section"/);
  assert.match(davy, /id="game-utility-hub-section"/);
  assert.match(davy, /ccg-community-game-section/);
  assert.match(davy, /id="affiliate-products-section"/);
});

test("public code cache advances for the shared presentation change", () => {
  const serviceWorker = read("service-worker.js");
  assert.match(serviceWorker, /CODE_CACHE_VERSION = "2026-09-22-public-code-v3"/);
});
