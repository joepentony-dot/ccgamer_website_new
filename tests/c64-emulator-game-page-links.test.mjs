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
  assert.match(linked("wasteland"), /href="\/emulator\/c64\/\?game=wasteland"/);
  assert.match(linked("sanxion"), /href="\/emulator\/c64\/\?game=owner-crt-more-sanxion"/);
  assert.match(linked("dan-dare-pilot-of-the-future"),
    /href="\/emulator\/c64\/\?game=owner-crt-more-dan-dare-pilot-of-the-future"/);
  assert.match(linked("720-degrees"),
    /href="\/emulator\/c64\/\?game=owner-crt-more-720-degrees"/);
  assert.match(linked("20-tons"), /href="\/emulator\/c64\/\?game=blast-0008"/);
  assert.match(linked("paradroid"), /href="\/emulator\/c64\/\?game=paradroid"/);
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

test("a deep link only selects the approved entry; visitor must explicitly LOAD", () => {
  assert.match(c64App, /new URLSearchParams\(window\.location\.search\)\.get\("game"\)/);
  assert.match(c64App, /onlineLibraryEntries\.find\(entry => entry\.id === linkedGameId\)/);
  assert.match(c64App, /selectOnlineLibraryEntry\(linkedGame\.id, false\)/);
  const start = c64App.indexOf("// A game page may deep-link");
  const end = c64App.indexOf("  if (onlineLibraryPanel)", start);
  assert.ok(start > 0 && end > start);
  assert.doesNotMatch(c64App.slice(start, end), /loadSelectedLibraryEntry\(/);
  assert.match(c64App, /Press LOAD to play/);
});

test("credits and emulator CTA styling remain unchanged", () => {
  assert.match(css, /OMEGA RECORD — aligned credits/);
  assert.match(css, /\.ccg-behind-pixels-inline__item\s*\{\s*display: grid;/);
  assert.match(css, /\.ccg-btn--emulator-play:focus-visible/);
  assert.match(css, /@media \(max-width: 560px\)/);
});
