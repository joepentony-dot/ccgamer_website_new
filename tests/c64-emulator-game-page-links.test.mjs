import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = file => fs.readFileSync(file, "utf8");
const games = JSON.parse(read("games/games.json"));
const media = JSON.parse(read("emulator/c64/library.json")).entries;
const c64App = read("js/ccg-c64/app.js");
const css = read("resources/css/game-pages.css");
const generator = read("scripts/link-c64-emulator-games.js");
const normalise = value => String(value || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

test("Wasteland is a verified approved emulator item and page gets a deep link", () => {
  const game = games.find(x => x.slug === "wasteland");
  const item = media.find(x => x.id === "wasteland");
  assert.equal(game.system, "C64");
  assert.ok(item && item.approved === true && item.license && /^[a-f0-9]{64}$/.test(item.sha256));
  assert.equal(item.format, "crt");
  assert.equal(normalise(game.title), normalise(item.title));
  const html = read("games/wasteland/index.html");
  assert.match(html, /data-ccg-play-in-emulator="true"/);
  assert.match(html, /href="\/emulator\/c64\/\?game=wasteland"/);
  assert.equal((html.match(/data-ccg-play-in-emulator/g)||[]).length,1);
  assert.match(html, /data-ccg-schema="game-graph"/);
  assert.match(html, /gameManualBtn/);
});

test("unmatched and Amiga-only pages do not acquire C64 play links", () => {
  const html = read("games/20-tons/index.html");
  assert.doesNotMatch(html, /data-ccg-play-in-emulator="true"/);
  assert.match(generator, /g\.system === "C64"/);
  assert.match(generator, /e\.approved === true/);
  assert.match(generator, /gameCounts\.get\(title\) === 1/);
  assert.match(generator, /matches\.length === 1/);
  assert.match(generator, /e\.license\.trim\(\)/);
  assert.match(generator, /e\.sha256/);
});

test("deep-link selects only a verified library entry; load remains explicit", () => {
  assert.match(c64App, /new URLSearchParams\(window\.location\.search\)\.get\("game"\)/);
  assert.match(c64App, /onlineLibraryEntries\.find\(entry => entry\.id === linkedGameId\)/);
  assert.match(c64App, /selectOnlineLibraryEntry\(linkedGame\.id, false\)/);
  const start=c64App.indexOf("// A game page may deep-link");
  const end=c64App.indexOf("  if (onlineLibraryPanel)",start);
  assert.ok(start>0 && end>start);
  assert.doesNotMatch(c64App.slice(start,end),/loadSelectedLibraryEntry\(/);
  assert.match(c64App, /Press LOAD to play/);
});

test("credits rows share continuous borders and CTA keeps visible focus",()=>{
  assert.match(css, /OMEGA RECORD — aligned credits/);
  assert.match(css, /\.ccg-behind-pixels-inline__item\s*\{\s*display: grid;/);
  assert.match(css, /\.ccg-btn--emulator-play:focus-visible/);
  assert.match(css, /@media \(max-width: 560px\)/);
});
