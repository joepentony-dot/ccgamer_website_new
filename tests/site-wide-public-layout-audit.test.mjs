import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const publishers = fs.readFileSync("resources/css/publishers.css", "utf8");
const developers = fs.readFileSync("resources/css/developers.css", "utf8");
const archives = fs.readFileSync("resources/css/year-platform-archives.css", "utf8");
const retroVideo = fs.readFileSync("resources/css/retro-video-pages.css", "utf8");
const music = fs.readFileSync("resources/css/music-composer.css", "utf8");
const serviceWorker = fs.readFileSync("service-worker.js", "utf8");

test("large public archive families share a tighter desktop browsing frame", () => {
  assert.match(publishers, /CCG SITE-WIDE COMPACT ARCHIVE AUDIT/);
  assert.match(developers, /CCG SITE-WIDE COMPACT ARCHIVE AUDIT/);
  assert.match(archives, /CCG SITE-WIDE COMPACT ARCHIVE AUDIT/);

  for (const css of [publishers, developers, archives]) {
    assert.match(css, /width:\s*min\(1240px, calc\(100% - 28px\)\)/);
    assert.match(css, /padding:\s*20px 0 48px/);
  }
});

test("long archive grids defer offscreen rendering without removing crawlable cards", () => {
  assert.match(publishers, /\.ccg-publisher-game-grid > \.ccg-publisher-game-card\s*\{[\s\S]*content-visibility:\s*auto/);
  assert.match(developers, /\.ccg-developer-game-grid > \.ccg-developer-game-card\s*\{[\s\S]*content-visibility:\s*auto/);
  assert.match(archives, /\.ccg-archive-game-grid > \.ccg-archive-game-card\s*\{[\s\S]*content-visibility:\s*auto/);
  assert.match(music, /\.ccg-composer-games__item\s*\{[\s\S]*content-visibility:\s*auto/);
});

test("retro video, special and Amiga demo detail pages use the compact shared frame", () => {
  assert.match(retroVideo, /CCG SITE-WIDE COMPACT RETRO DETAIL AUDIT/);
  assert.match(retroVideo, /width:\s*min\(1240px, calc\(100% - 28px\)\)/);
  assert.match(retroVideo, /\.retro-video-page__hero\s*\{[\s\S]*padding:\s*clamp\(18px, 2\.6vw, 30px\)/);
  assert.match(retroVideo, /\.retro-video-page__related-card\s*\{[\s\S]*content-visibility:\s*auto/);
});

test("music pages remain compact rather than inheriting archive-wide widths", () => {
  assert.match(music, /CCG SITE-WIDE MUSIC HUB AUDIT/);
  assert.match(music, /max-width:\s*1040px/);
});

test("public CSS changes use a fresh service-worker code namespace", () => {
  assert.match(serviceWorker, /CODE_CACHE_VERSION = "2026-09-18-public-code-v6"/);
});
