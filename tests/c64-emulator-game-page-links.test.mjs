import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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

test("Amiga-only pages never acquire C64 play links; newly matched C64 games do", () => {
  const html = read("games/agony/index.html");
  assert.doesNotMatch(html, /data-ccg-play-in-emulator="true"/);
  const newlyLinked = read("games/20-tons/index.html");
  assert.match(newlyLinked, /data-ccg-play-in-emulator="true"/);
  assert.match(newlyLinked, /href="\/emulator\/c64\/\?game=blast-0008"/);
  assert.match(generator, /g\.system === "C64"/);
  assert.match(generator, /e\.approved === true/);
  assert.match(generator, /gameCounts\.get\(title\) !== 1/);
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

test("shared publisher audit identifies actual CRT and Blast deep links without touching generated pages", () => {
  const report = JSON.parse(execFileSync(process.execPath,
    ["scripts/link-c64-emulator-games.js", "--audit-json"], { encoding: "utf8" }));
  assert.equal(report.c64Games, games.filter(g => g.system === "C64").length);
  assert.ok(report.additionalCrt > 0, "Active attested CRT catalogue must parse");
  assert.ok(report.blast > 0, "Blast packed catalogue must parse");
  assert.ok(report.matched > 200, "Shared linker must include packed and CRT media, not direct-only");
  const mapped = new Map(report.mappings.map(item => [item.slug, item]));
  assert.deepEqual([mapped.get("sanxion")?.id, mapped.get("sanxion")?.source],
    ["owner-crt-more-sanxion", "additional-crt"]);
  assert.deepEqual([
    mapped.get("dan-dare-pilot-of-the-future")?.id,
    mapped.get("dan-dare-pilot-of-the-future")?.source,
  ], ["owner-crt-more-dan-dare-pilot-of-the-future", "additional-crt"]);
  assert.equal(mapped.get("20-tons")?.id, "blast-0008");
  assert.equal(mapped.get("agony"), undefined);
  const seen = new Set();
  for (const item of report.mappings) {
    assert.match(item.slug, /^[a-z0-9-]+$/);
    assert.match(item.id, /^[a-z0-9-]+$/);
    assert.ok(!seen.has(item.slug), "Duplicate deep link for " + item.slug);
    seen.add(item.slug);
  }
  // The PRG archive is only available when its own SHA-bound catalogue validates.
  if (fs.readFileSync("emulator/c64/media/prg-archive/catalog.json", "utf8").trim() === "") {
    assert.equal(report.prgArchive, 0);
    assert.match(report.warnings.join(" "), /Optional PRG archive excluded/);
    assert.equal(report.mappings.some(item => item.source === "prg-archive"), false);
  }
});

test("the displayed link remains a select-only deep link, not an autoplay URL", () => {
  assert.match(generator, /href="\/emulator\/c64\/\?game=/);
  assert.match(generator, /data-ccg-play-in-emulator="true"/);
  assert.match(c64App, /selectOnlineLibraryEntry\(linkedGame\.id, false\)/);
  assert.match(generator, /preferSelectedCartridges/);
  assert.match(generator, /parseAdditionalCrtCatalog/);
  assert.match(generator, /parsePackedCatalog/);
});

test("all 666 generated pages reconcile exactly against the validated emulator mapping", () => {
  const report = JSON.parse(execFileSync(process.execPath,
    ["scripts/link-c64-emulator-games.js", "--audit-json"], { encoding: "utf8" }));
  const expected = new Map(report.mappings.map(record => [record.slug, record]));
  let covered = 0;
  for (const game of games) {
    const page = read("games/" + game.slug + "/index.html");
    const count = (page.match(/data-ccg-play-in-emulator="true"/g) || []).length;
    const media = expected.get(game.slug);
    if (game.system !== "C64" || !media) {
      assert.equal(count, 0, "Unexpected emulator link on " + game.slug);
      continue;
    }
    assert.equal(count, 1, "Missing or duplicate emulator action on " + game.slug);
    assert.ok(page.includes('href="/emulator/c64/?game=' +
      encodeURIComponent(media.id) + '"'), "Wrong emulator media ID for " + game.slug);
    covered++;
  }
  assert.equal(covered, report.matched);
});
