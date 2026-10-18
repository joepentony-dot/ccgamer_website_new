import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = file => fs.readFileSync(file, "utf8");
const games = JSON.parse(read("games/games.json"));
const direct = JSON.parse(read("emulator/c64/library.json")).entries;
const activatedCRT = JSON.parse(read("emulator/c64/media/cartridge-replacements/active.json"));
const blast = JSON.parse(read("emulator/c64/media/blast/catalog.json"));
const c64App = read("js/ccg-c64/app.js");
const css = read("resources/css/game-pages.css");
const generator = read("scripts/link-c64-emulator-games.js");
const c64Games = games.filter(g => g.system === "C64");

function linked(slug) {
  const html = read("games/" + slug + "/index.html");
  const tag = html.match(/<a\b[^>]*data-ccg-play-in-emulator="true"[^>]*>/g) || [];
  assert.equal(tag.length, 1, "Expected one emulator button on " + slug);
  assert.match(html, /data-ccg-schema="game-graph"/);
  return tag[0];
}

test("owner-approved CRT-first catalogue is active and all listed media have titles", () => {
  assert.equal(activatedCRT.ownerRedistributionAttested, true);
  assert.equal(activatedCRT.originalFormatsPreserved, true);
  assert.equal(activatedCRT.recordCount, activatedCRT.games.length);
  assert.ok(activatedCRT.games.length >= 1500);
  assert.ok(direct.some(e => e.approved && e.id === "wasteland" && e.format === "crt"));
  assert.equal(blast.recordCount, blast.games.length);
  assert.match(generator, /activatedCartridges\(\)/);
  assert.match(generator, /packedEntries\("blast"\)/);
  assert.match(generator, /packedEntries\("prg-archive", true\)/);
  assert.match(generator, /const priority = \{ crt: 0, prg: 1, d64: 2/);
  assert.match(generator, /gameCounts\.get\(title\) !== 1/);
});

test("all three media priorities create the expected exact-game deep links", () => {
  assert.match(linked("wasteland"), /href="\/emulator\/c64\/\?game=wasteland\&amp;autoplay=1"/);
  assert.match(linked("sanxion"), /href="\/emulator\/c64\/\?game=owner-crt-more-sanxion\&amp;autoplay=1"/);
  assert.match(linked("dan-dare-pilot-of-the-future"),
    /href="\/emulator\/c64\/\?game=owner-crt-more-dan-dare-pilot-of-the-future\&amp;autoplay=1"/);
  assert.match(linked("720-degrees"),
    /href="\/emulator\/c64\/\?game=owner-crt-more-720-degrees\&amp;autoplay=1"/);
  assert.match(linked("20-tons"), /href="\/emulator\/c64\/\?game=blast-0008\&amp;autoplay=1"/);
  assert.match(linked("paradroid"), /href="\/emulator\/c64\/\?game=owner-crt-more-paradroid\&amp;autoplay=1"/);
});

test("no fabricated emulator media and only C64 archive pages are considered", () => {
  assert.match(generator, /g\.system === "C64"/);
  assert.match(generator, /e\.approved === true/);
  assert.match(generator, /e\.license\.trim\(\)/);
  assert.match(generator, /e\.sha256/);
  assert.match(generator, /ready\.catalogSHA256 !== sha256\(bytes\)/);
  assert.match(generator, /!safeFile\(relative \+ "\/" \+ pack\.file, pack\.bytes\)/);
  const linkCount = c64Games.reduce((count, g) =>
    count + (read("games/" + g.slug + "/index.html").includes('data-ccg-play-in-emulator="true"') ? 1 : 0), 0);
  assert.ok(linkCount >= 350,
    "Expected the expanded emulator library to link at least 350 C64 pages, got " + linkCount);
  const amiga = games.find(g => g.system === "AMIGA");
  assert.ok(amiga);
  assert.doesNotMatch(read("games/" + amiga.slug + "/index.html"),
    /data-ccg-play-in-emulator="true"/);
});

test("game-page deep links request one-click load without changing ordinary search selection", () => {
  assert.match(c64App, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(c64App, /deepLink\.get\("game"\)/);
  assert.match(c64App, /deepLink\.get\("autoplay"\) === "1"/);
  assert.match(c64App, /onlineLibraryEntries\.find\(entry => entry\.id === linkedGameId\)/);
  assert.match(c64App, /selectOnlineLibraryEntry\(linkedGame\.id, false\)/);
  assert.match(c64App, /linkedGame && linkedGameAutoplay && !gamePageAutoloadConsumed/);
  assert.match(c64App, /gamePageAutoloadConsumed = true;\s*void loadSelectedLibraryEntry\(\)/);
  assert.match(c64App, /Press LOAD to play/);
});

test("credits and emulator CTA styling remain unchanged", () => {
  assert.match(css, /OMEGA RECORD — aligned credits/);
  assert.match(css, /\.ccg-behind-pixels-inline__item\s*\{\s*display: grid;/);
  assert.match(css, /\.ccg-btn--emulator-play:focus-visible/);
  assert.match(css, /@media \(max-width: 560px\)/);
});

test("audited game-page spelling variations link only to real emulator entries", () => {
  const auditedSlugs = [
      "bcs-quest-for-tires",
      "bc2-grogs-revenge",
      "beach-head-2",
      "boulder-dash",
      "the-captive",
      "ghetto-blaster",
      "the-great-escape",
      "halls-of-the-things",
      "the-hitchhikers-guide-to-the-galaxy",
      "jack-the-nipper-2-in-coconut-capers",
      "the-last-ninja",
      "leader-board",
      "the-lords-of-midnight",
      "the-movie-monster-game",
      "the-official-father-christmas",
      "pitfall-2-lost-caverns",
      "the-prince",
      "the-sacred-armour-of-antiriad",
      "the-staff-of-karnath",
      "summer-games-2",
      "the-sword-of-fargoal",
      "thunder-blade",
      "through-the-trap-door",
      "up-n-down",
      "water-polo",
      "the-way-of-the-exploding-fist",
      "the-willow-pattern-adventure",
      "wonder-boy",
      "the-wombles",
      "the-transformers",
      "the-trap-door"
  ];
  for (const slug of auditedSlugs) {
    const tag = linked(slug);
    assert.match(tag, /href="\/emulator\/c64\/\?game=[a-z0-9-]+&amp;autoplay=1"/);
  }
});

test("Uridium and Uridium+ remain distinct; IK+ retains its exact edition", () => {
  assert.match(linked("uridium"), /game=owner-crt-more-uridium-14770873b1ee&amp;autoplay=1/);
  assert.match(linked("ik-c64"), /game=owner-crt-more-ik&amp;autoplay=1/);
  assert.match(generator, /replace\(\/\\\+\/g, " plus "\)/);
});

// Maintain one exact, playable media target for every reviewed title conflict.
test("reviewed duplicate CRTs and historical title spellings use pinned visible media IDs", () => {
  assert.match(linked("the-faces-of-haarne"), /game=owner-crt-more-facesofhaarne-3f498ebd2059&amp;autoplay=1/);
  assert.match(linked("the-sentinel"), /game=owner-crt-more-sentinel-the&amp;autoplay=1/);
  assert.match(linked("the-snowman"), /game=archive-07817&amp;autoplay=1/);
  assert.match(linked("the-train-escape-to-normandy"), /game=owner-crt-more-the-train&amp;autoplay=1/);
  assert.match(linked("badlands"), /game=owner-crt-badlands&amp;autoplay=1/);
  assert.match(linked("congo-bongo"), /game=owner-crt-congo-bongo&amp;autoplay=1/);
  assert.match(linked("gateway-to-apshai"), /game=owner-crt-gateway-to-apshai&amp;autoplay=1/);
  assert.match(linked("ghostbusters"), /game=owner-crt-ghostbusters&amp;autoplay=1/);
  assert.match(linked("hero"), /game=owner-crt-h-e-r-o&amp;autoplay=1/);
  assert.match(linked("kung-fu-master"), /game=owner-crt-kung-fu-master&amp;autoplay=1/);
  assert.match(linked("tapper"), /game=owner-crt-tapper&amp;autoplay=1/);
  // Both different Popeye page editions remain deliberately unlinked.
  for (const slug of ["popeye-c64", "popeye-c64-popeye-donpriestley"]) {
    assert.doesNotMatch(read("games/" + slug + "/index.html"), /data-ccg-play-in-emulator="true"/);
  }
});
