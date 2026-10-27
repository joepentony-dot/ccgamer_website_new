import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");
const entry = JSON.parse(read("data/retro-specials.json")).find((item) => item.youtubeId === "qJZa1zB2zHU");
const slug = "50-commodore-64-games-can-you-identify-them";
const route = `/retro-specials/${slug}/`;
const page = read(`retro-specials/${slug}/index.html`);
const template = read("admin/templates/retro-video-template.html");
const generator = read("scripts/generate-retro-pages.js");
const player = read("js/video-watch.js");
const collection = read("games/collections/retro-specials.html");
const library = read("videos/index.html");
const index = JSON.parse(read("videos/video-index.json"));

test("C64 identification quiz is present once in both collection and video library", () => {
  assert.ok(entry);
  assert.equal(entry.slug, slug);
  assert.equal(entry.deferYouTubePlayer, true);
  assert.equal(index.items.filter((item) => item.id === entry.youtubeId).length, 1);
  assert.equal(index.items.find((item) => item.id === entry.youtubeId)?.url, route);
  assert.equal(index.counts.total, index.items.length);
  assert.match(collection, /qJZa1zB2zHU/);
  assert.match(library, /50-commodore-64-games-can-you-identify-them/);
  assert.match(library, /<strong>39<\/strong> retro features/);
});

test("new video has a canonical watch page with no eager third-party player request", () => {
  assert.match(page, /<link rel="canonical" href="https:\/\/www\.cheekycommodoregamer\.co\.uk\/retro-specials\/50-commodore-64-games-can-you-identify-them\/"/);
  assert.match(page, /<iframe src="about:blank" data-ccg-youtube-src="https:\/\/www\.youtube-nocookie\.com\/embed\/qJZa1zB2zHU"/);
  assert.doesNotMatch(page, /<iframe src="https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\/qJZa1zB2zHU"/);
  assert.match(page, /data-ccg-primary-video="true"/);
  assert.match(page, /data-ccg-video-facade-play/);
  assert.match(page, /id="watch-video"/);
});

test("owning retro page generator preserves the opt-in facade on rebuild", () => {
  assert.match(generator, /entry\.deferYouTubePlayer === true/);
  assert.match(generator, /YOUTUBE_PLAYER_SRC: deferredPlayer \? 'about:blank'/);
  assert.match(generator, /YOUTUBE_DEFER_ATTRIBUTE: deferredPlayer/);
  assert.match(generator, /YOUTUBE_FACADE_HTML: playerFacadeHtml/);
  assert.match(template, /<iframe src="\{\{YOUTUBE_PLAYER_SRC\}\}"\{\{YOUTUBE_DEFER_ATTRIBUTE\}\}/);
  assert.match(template, /\{\{YOUTUBE_FACADE_HTML\}\}/);
  assert.match(player, /data-ccg-youtube-src/);
  assert.match(player, /facadeButton\?\.addEventListener\('click'/);
  assert.match(player, /initial > 0 && !facadeButton/);
});

test("previous retro watch pages retain their existing video player contract", () => {
  const existing = read("retro-specials/50-essential-commodore-64-games/index.html");
  assert.match(existing, /<iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/QHYAdbqWzoY"/);
  assert.doesNotMatch(existing, /data-ccg-video-facade-play/);
});
