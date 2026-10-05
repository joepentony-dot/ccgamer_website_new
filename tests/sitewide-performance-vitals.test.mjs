import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

test("Home featured YouTube cards stay network-idle until visitor interaction", () => {
  const source = read("js/home-dynamic.js");
  assert.doesNotMatch(source, /if \(hasVideo && iframe && isMobileDevice\)/);
  assert.match(source, /data-ccg-video-play/);
  assert.match(source, /youtube-nocookie\.com\/embed/);
  assert.match(source, /autoplay=1/);
});

test("canonical game-video generator emits a facade and no eager YouTube iframe src", () => {
  const source = read("scripts/generate-video-seo.js");
  assert.match(source, /data-ccg-video-facade/);
  assert.match(source, /removeAttribute\(iframe, "src"\)/);
  assert.match(source, /youtubeThumbnail\(videoId, metadata\)/);
  assert.doesNotMatch(
    source,
    /setAttribute\(iframe, "src", `https:\/\/www\.youtube-nocookie\.com\/embed/
  );
});

test("single-game runtime primes static YouTube facades before hydration", () => {
  const source = read("js/load-single-game.js");
  assert.match(source, /function primeExistingGameVideoFacade\(\)/);
  assert.match(source, /function ensureGameVideoFacade\(videoEmbed, videoId\)/);
  assert.match(source, /videoEmbed\.removeAttribute\("src"\)/);
  assert.match(source, /primeExistingGameVideoFacade\(\);/);
  assert.match(source, /autoplay=1/);
});

test("mode engine does not preload decorative mode audio during an ordinary visit", () => {
  const source = read("js/ccg-mode-engine.js");
  assert.match(source, /audio\.preload = "none"/);
  assert.doesNotMatch(source, /audio\.preload = "auto"/);
  assert.doesNotMatch(source, /audio\.load\(\)/);
  assert.match(source, /if \(nextMode === "amiga"\)/);
});

test("Music hub keeps its build-time cards and accordion instead of rebuilding from games.json", () => {
  const runtime = read("js/music-composer-pages.js");
  const generator = read("scripts/generate-composer-pages.js");
  const hub = read("music/index.html");

  assert.match(runtime, /function bindStaticHubAccordion\(\)/);
  assert.match(runtime, /const isStaticHub = Boolean/);
  assert.match(runtime, /bindStaticHubAccordion\(\);[\s\S]*window\.CCG_MUSIC_PAGE_READY = true;[\s\S]*return;/);
  assert.match(generator, /resolveComposerImagePath/);
  assert.match(generator, /class="composer-thumb"/);
  assert.match(hub, /data-static-composer-fallback="true"/);
  assert.match(hub, /resources\/images\/composers\/rob-hubbard\.webp/);
});

test("Retro Events advertises its CSS background hero before stylesheet discovery", () => {
  const source = read("games/collections/retro-events.html");
  assert.match(
    source,
    /<link rel="preload" as="image" href="\/resources\/images\/genres\/banners\/retro-events-banner\.png" fetchpriority="high">/
  );
});

test("below-fold collection artwork is lazy and stays off the critical request path", () => {
  const source = read("games/collections/index.html");
  for (const image of ["cartridge-collection.png", "licensed-collection.png"]) {
    const index = source.indexOf(image);
    assert.ok(index >= 0, `Missing ${image}`);
    assert.match(source.slice(index, index + 220), /loading="lazy"/);
  }
});

test("public cache namespace changed with the public performance runtime", () => {
  const source = read("service-worker.js");
  assert.match(source, /CODE_CACHE_VERSION = "2026-10-05-public-code-v50"/);
});
