import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");

test("shared template keeps community and Amazon recommendations collapsed", () => {
  const template = read("games/game.html");

  assert.match(template, /ccg-community-compact-shell/);
  assert.match(template, /id="ccg-community-compact-score" hidden/);
  assert.match(template, /id="ccg-community-rating-panel"/);
  assert.doesNotMatch(template, /ccg-community-rating-panel" open/);
  assert.match(template, />CCG Picks</);
  assert.match(template, /data-hardware-panel hidden/);
});

test("existing generated game pages are retrofitted into the same community shell", () => {
  const loader = read("js/load-single-game.js");
  const davy = read("games/davy-king-of-the-wild-frontier/index.html");

  assert.match(loader, /function initCompactCommunityShell\(\)/);
  assert.match(loader, /ccg-community-compact-shell/);
  assert.match(loader, /shell\.open = false/);
  assert.match(loader, /rating\.open = false/);
  assert.match(loader, /comments\.open = false/);

  assert.match(davy, /\/js\/load-single-game\.js/);
  assert.match(davy, /ccg-community-game-section/);
  assert.match(davy, /id="affiliate-products-section"/);
});

test("collapsed community summary only shows a non-zero score", () => {
  const ratings = read("js/ccg-community-ratings.js");
  const css = read("resources/css/ccg-community.css");

  assert.match(ratings, /ccg-community-compact-score/);
  assert.match(ratings, /if \(!count \|\| average <= 0\)/);
  assert.match(ratings, /compact\.hidden = true/);
  assert.match(ratings, /compact\.hidden = false/);
  assert.match(css, /SINGLE-GAME ONE-ROW COMMUNITY SUMMARY/);
  assert.match(css, /\.ccg-community-compact-score\[hidden\]/);
});

test("overview shares a compact desktop row with a 4 by 3 video", () => {
  const css = read("resources/css/game-pages.css");

  assert.match(css, /#game-video-section/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,/);
  assert.match(css, /aspect-ratio:\s*4 \/ 3/);
  assert.match(css, /#game-utility-hub-section:not\(\[hidden\]\)/);
  assert.match(css, /#game-music-archive-section/);
  assert.match(css, /#game-discovery-links/);
});

test("affiliate picks remain a compact bottom accordion with one click owner", () => {
  const affiliate = read("js/affiliate-products.js");
  const loader = read("js/load-single-game.js");
  const css = read("resources/css/ccg-affiliate-showcase.css");

  assert.match(affiliate, /const communitySection = document\.querySelector\("\.ccg-community-game-section"\)/);
  assert.match(affiliate, /title\.textContent = "CCG Picks"/);
  assert.match(affiliate, /panel\.hidden = true/);
  assert.match(affiliate, /ccgAffiliateToggleBound/);
  assert.match(affiliate, /toggle\.addEventListener\("click"/);
  assert.doesNotMatch(loader, /initHardwareAccordion/);
  assert.doesNotMatch(loader, /hardwareAccordionBound/);
  assert.match(css, /SINGLE-GAME COMPACT AMAZON ACCORDION/);
  assert.match(css, /\.ccg-hardware-toggle::before/);
  assert.match(css, /content:\s*"a"/);
  assert.match(css, /\.ccg-hardware-panel\[hidden\]/);
});


test("single-game hero credits stay aligned in tidy rows", () => {
  const css = read("resources/css/game-pages.css");
  const badges = read("resources/css/ccg-game-badges.css");

  assert.match(css, /SINGLE-GAME HERO IDENTITY TIDY/);
  assert.match(css, /\.ccg-behind-pixels-inline__item\s*\{\s*display:\s*contents;/);
  assert.match(css, /grid-template-columns:[\s\S]*minmax\(105px,\s*135px\)[\s\S]*minmax\(105px,\s*165px\)/);
  assert.match(css, /@media \(max-width:\s*1180px\)[\s\S]*minmax\(120px,\s*155px\)\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.game-hero__actions \.ccg-btn\.ccg-btn--share/);
  assert.match(css, /@media \(min-width:\s*901px\)[\s\S]*\.game-hero__inner\s*\{\s*align-items:\s*start;/);
  assert.match(badges, /\.ccg-game-badges\s*\{[\s\S]*width:\s*100%;[\s\S]*max-width:\s*none;/);
});

test("public cache version covers the shared CSS and JavaScript change", () => {
  const sw = read("service-worker.js");
  assert.match(sw, /CODE_CACHE_VERSION = "2026-09-22-public-code-v4"/);
});
