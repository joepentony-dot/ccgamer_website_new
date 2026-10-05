import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");

const shell = read("games/game.html");
const runtime = read("js/load-single-game.js");
const videoSeo = read("scripts/generate-video-seo.js");
const overrides = read("scripts/apply-game-video-overrides.js");
const gamesCss = read("resources/css/games.css");
const pageCss = read("resources/css/game-pages.css");

test("single-game shell reserves the player but does not eagerly load YouTube", () => {
  assert.match(shell, /id="game-video-facade"/);
  assert.match(shell, /id="game-video-poster"/);
  assert.match(shell, /id="game-video-embed"[\s\S]*loading="lazy"[\s\S]*width="560"[\s\S]*height="315"[\s\S]*hidden/);
  const iframe = shell.match(/<iframe\b[^>]*id="game-video-embed"[^>]*>/i)?.[0] || "";
  assert.ok(iframe, "shared game video iframe is present");
  assert.doesNotMatch(iframe, /\bsrc=/i);
});

test("runtime loads YouTube only after the play facade is activated", () => {
  assert.match(runtime, /function ensureGameVideoFacadeShell\(videoEmbed\)/);
  assert.match(runtime, /document\.createElement\("button"\)/);
  assert.match(runtime, /document\.createElement\("img"\)/);
  assert.match(runtime, /videoEmbed\.removeAttribute\("src"\)/);
  assert.match(runtime, /videoEmbed\.dataset\.videoSrc = embedUrl/);
  assert.match(runtime, /videoFacade\.onclick = \(\) =>/);
  assert.match(runtime, /autoplay=1/);
  assert.match(runtime, /i\.ytimg\.com\/vi\/\$\{vid\}\/hqdefault\.jpg/);
  assert.match(runtime, /videoFacade\.hidden = true/);
});

test("generated canonical pages use poster metadata without materialising a YouTube iframe src", () => {
  assert.match(videoSeo, /removeAttribute\(iframe, "src"\)/);
  assert.match(videoSeo, /setAttribute\(iframe, "data-video-src"/);
  assert.match(videoSeo, /setBooleanAttribute\(iframe, "hidden"\)/);
  assert.match(videoSeo, /game-video-facade/);
  assert.match(videoSeo, /game-video-poster/);
  assert.match(videoSeo, /hasFacade/);
  assert.match(videoSeo, /hasStage/);
  assert.match(videoSeo, /<div class="game-video__stage">/);
  assert.match(videoSeo, /youtubeThumbnail\(videoId, metadata\)/);
  assert.doesNotMatch(videoSeo, /iframe = setAttribute\(iframe, "src"/);
});

test("external non-YouTube overrides keep ownership and suppress the YouTube facade", () => {
  assert.match(overrides, /setAttribute\(iframe, "src", override\.playerUrl\)/);
  assert.match(overrides, /game-video-facade/);
  assert.match(overrides, /setBooleanAttribute\(facade, "hidden"\)/);
  assert.match(overrides, /removeAttribute\(poster, "src"\)/);
});

test("facade preserves the existing player geometry and Omega presentation", () => {
  assert.match(gamesCss, /\.game-video__stage[\s\S]*aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(gamesCss, /\.game-video__play[\s\S]*Orbitron/);
  assert.match(gamesCss, /\.game-video__facade:focus-visible/);
  assert.match(pageCss, /\.game-video__stage[\s\S]*aspect-ratio:\s*4\s*\/\s*3/);
  assert.match(pageCss, /@media \(max-width: 560px\)[\s\S]*\.game-video__stage[\s\S]*aspect-ratio:\s*16\s*\/\s*10/);
});
