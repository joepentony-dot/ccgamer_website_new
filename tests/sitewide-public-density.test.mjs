import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const css = fs.readFileSync("resources/css/ccg-master.css", "utf8");
const serviceWorker = fs.readFileSync("service-worker.js", "utf8");
const performanceCss = fs.readFileSync("resources/css/ccg-performance-foundations.css", "utf8");
const scrollCss = fs.readFileSync("resources/css/ccg-scroll-authority.css", "utf8");

test("public content density pass covers the main browse and information families", () => {
  assert.match(css, /CCG PUBLIC CONTENT DENSITY PASS — 2026-09-18/);
  for (const page of [
    "games-index", "genres-index", "genre-single", "collections-index",
    "publisher-index", "publisher-single", "developers-index", "developer-single",
    "years-index", "year-single", "platforms-index", "platform-single",
    "music-hub", "music-composer", "game-discovery",
    "collection-single", "complete-index", "video-library", "retro-video", "zzap64-awards",
    "about", "contact", "emulation"
  ]) {
    assert.match(css, new RegExp(`data-ccg-page="${page}"`), `missing density scope for ${page}`);
  }
});

test("special runtime pages stay outside the shared density selector set", () => {
  const block = css.slice(css.indexOf("CCG PUBLIC CONTENT DENSITY PASS — 2026-09-18"));
  assert.doesNotMatch(block, /data-ccg-page="home"/);
  assert.doesNotMatch(block, /data-ccg-page="single-game"/);
  assert.doesNotMatch(block, /data-ccg-page="quiz"/);
  assert.doesNotMatch(block, /data-ccg-page="admin"/);
});


test("games archive overrides deferred accordion height estimates with real geometry", () => {
  assert.match(
    css,
    /html\[data-ccg-page="games-index"\]\.ccg-perf-enabled \.games-accordion__section\s*\{[\s\S]*?content-visibility:\s*visible;[\s\S]*?contain-intrinsic-size:\s*none;/
  );
});



test("editorial collection cards avoid compositor churn during wheel scrolling", () => {
  assert.match(scrollCss, /\[data-collection="Retro Specials"\]/);
  assert.match(scrollCss, /\[data-collection="Retro Events"\]/);
  assert.match(scrollCss, /\[data-collection="Amiga Demo Music"\]/);
  assert.match(scrollCss, /\.ccg-game-card--retro-event\s*\{[\s\S]*transform:\s*none;[\s\S]*content-visibility:\s*auto;/);
});

test("public code cache namespace advances with the shared CSS change", () => {
  assert.match(serviceWorker, /CODE_CACHE_VERSION = "2026-09-25-public-code-v23"/);
});
