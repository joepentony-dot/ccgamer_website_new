#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  parsePackedCatalog, filterCatalog, suggestCatalogGames, loadPackedGameBytes,
  PACK_CATALOG_URL, PACK_ROOT, GAME_PAGE_SIZE, preferSelectedCartridges,
  searchCatalogEntries,
} from "../js/ccg-c64/game-catalog.js";

assert.equal(PACK_CATALOG_URL, "/emulator/c64/media/blast/catalog.json");
assert.equal(GAME_PAGE_SIZE, 36);

const pack = Uint8Array.from([1, 8, 4, 12, 16, 20, 24, 28]);
const sha = b => createHash("sha256").update(b).digest("hex");
const fixture = {
  version: 2, recordCount: 2,
  packs: [{ file: "pack-00.bin", bytes: pack.length, sha256: sha(pack) }],
  games: [
    ["blast-0000", "1942", "prg", 0, 0, 3, sha(pack.subarray(0, 3))],
    ["ccg-snake", "Snake", "d64", 0, 3, 5, sha(pack.subarray(3))],
  ],
};

const { entries, packs } = parsePackedCatalog(fixture);
assert.equal(entries.length, 2);
assert.equal(packs[0].bytes, 8);
assert.equal(entries[0].title, "1942");
assert.equal(entries[1].format, "d64");
assert.deepEqual(filterCatalog(entries).games.map(x => x.title), ["1942", "Snake"]);
assert.equal(filterCatalog(entries, { query: "snake" }).games[0].id, "ccg-snake");
assert.equal(filterCatalog(entries, { format: "prg" }).total, 1);
assert.equal(filterCatalog(entries, { letter: "0-9" }).games[0].title, "1942");
assert.equal(filterCatalog(entries, { letter: "S" }).total, 1);
assert.equal(filterCatalog(entries, { query: "does not exist" }).total, 0);

const many = Array.from({ length: 100 }, (_, n) => ({
  id: "title-" + n, title: "Game " + n, format: "prg",
}));
assert.equal(filterCatalog(many).pages, 3);
assert.equal(filterCatalog(many).games.length, 36);
assert.equal(filterCatalog(many, { page: 2 }).games.length, 28);
assert.equal(filterCatalog(many, { page: 999 }).page, 2);

// A large library must render NOTHING until a title is typed. Results stay
// bounded (no ALL mode), even when 1,878+ owner-approved games are indexed.
assert.deepEqual(suggestCatalogGames(many, "").games, []);
assert.equal(suggestCatalogGames(many, "").total, 0);
assert.equal(suggestCatalogGames(many, "game").total, 100);
assert.equal(suggestCatalogGames(many, "game").games.length, 8);
assert.equal(suggestCatalogGames(many, "Game 9").total, 11);
assert.equal(suggestCatalogGames(many, "gAmE 99").games[0].id, "title-99");
assert.equal(suggestCatalogGames(many, "no matching title").total, 0);
assert.equal(suggestCatalogGames(many, "game", 1000).games.length, 20,
  "A caller cannot request an unbounded result dropdown");
const ranked = [
  { id: "inner", title: "The Super Ghost", format: "prg" },
  { id: "word", title: "Super Ghost", format: "prg" },
  { id: "prefix", title: "Ghostbusters", format: "d64" },
  { id: "stray", title: "Meghostic", format: "prg" },
];
assert.deepEqual(suggestCatalogGames(ranked, "ghost").games.map(x => x.id),
  ["prefix", "word", "inner", "stray"],
  "Exact prefixes must sort before word-start matches and interior matches");

const corrupt = JSON.parse(JSON.stringify(fixture));
corrupt.games.push(corrupt.games[0]);
corrupt.recordCount = 3;
assert.throws(() => parsePackedCatalog(corrupt), /duplicate/i);
corrupt.games.pop();
corrupt.games[0][4] = 900;
corrupt.recordCount = 2;
assert.throws(() => parsePackedCatalog(corrupt), /invalid/i);

const savedFetch = globalThis.fetch;
let fetchCount = 0;
globalThis.fetch = async (url) => {
  assert.equal(url, PACK_ROOT + "pack-00.bin");
  fetchCount++;
  return { ok: true, arrayBuffer: async () => pack.buffer.slice() };
};
try {
  const cache = new Map();
  assert.deepEqual(Array.from(await loadPackedGameBytes(entries[0], cache)), [1, 8, 4]);
  assert.deepEqual(Array.from(await loadPackedGameBytes(entries[1], cache)), [12, 16, 20, 24, 28]);
  assert.equal(fetchCount, 1, "Multiple games in a pack must share a single download");
  const bad = { ...entries[0], sha256: "0".repeat(64) };
  await assert.rejects(loadPackedGameBytes(bad, cache), /integrity/i);
  await assert.rejects(loadPackedGameBytes({
    ...entries[0], byteOffset: 100,
  }, cache), /bounds/i);
} finally {
  globalThis.fetch = savedFetch;
}
// Cartridge promotion must be explicit, deterministic and title-exact across
// independent direct/Blast/archive entries, not inferred from format alone.
const versions = [
  { id: "disk-myth", title: "Myth: History in the Making", format: "d64" },
  { id: "archive-myth", title: "Myth - History in the Making", format: "prg" },
  { id: "crt-myth", title: "Myth - History in the Making", format: "crt",
    preferOverOtherFormats: true },
  { id: "other-myth", title: "Myth II", format: "prg" },
  { id: "disk-pirates", title: "Pirates!", format: "d64" },
  { id: "crt-pirates", title: "Pirates!", format: "crt" },
  { id: "archive-pirates", title: "Pirates!", format: "prg" },
];
assert.deepEqual(preferSelectedCartridges(versions).map(row => row.id),
  ["crt-myth", "other-myth", "disk-pirates", "crt-pirates", "archive-pirates"]);
assert.equal(preferSelectedCartridges(versions.filter(row => row.id !== "crt-myth")).length, 6,
  "An absent promoted cartridge must never hide its existing fallback");
assert.strictEqual(preferSelectedCartridges([]).length, 0);
assert.equal(preferSelectedCartridges([{ title: "Gorf", format: "crt",
  preferOverOtherFormats: false }, { title: "Gorf", format: "prg" }]).length, 2);
assert.deepEqual(preferSelectedCartridges([
  { id: "gorf", title: "Gorf", format: "crt", preferOverOtherFormats: true },
  { id: "gorf-variant", title: "Gorf", format: "crt", preferOverOtherFormats: true },
  { id: "gorf-prg", title: "Gorf", format: "prg" },
]).map(row => row.id), ["gorf"], "Only one explicitly chosen CRT may win a title");

// The already-hosted and previously approved Pirates! cartridge is now the
// public default where the archive also contains a PRG edition.
const hosted = JSON.parse(readFileSync(
  new URL("../emulator/c64/library.json", import.meta.url), "utf8")).entries;
const piratesCRT = hosted.find(item => item.id === "pirates");
assert.equal(piratesCRT?.format, "crt");
assert.equal(piratesCRT?.approved, true);
assert.equal(piratesCRT?.preferOverOtherFormats, true);
assert.deepEqual(preferSelectedCartridges([
  { id: "pirates-archive", title: "Pirates!", format: "prg" },
  piratesCRT,
  { id: "another-game", title: "Pirates! Gold", format: "prg" },
]).map(item => item.id), ["pirates", "another-game"]);

console.log("CCG C64 game catalogue, bounded typeahead, search ranking, pack caching and SHA-256 checks passed.");


// All public emulator search surfaces use the same tolerant, ranked title rules.
// Suggestions may include a shortened/alternative name; game-page auto-links
// must remain separately verified and may not be guessed from fuzzy search.
const aliasPairs = [
  ["B.C.'S Quest For Tires", "BC's Quest for Tires"],
  ["B.C. II: Grog's Revenge", "BC II - Grog's Revenge"],
  ["Beach-Head II", "Beach-head 2"],
  ["Boulder Dash", "Boulderdash"],
  ["The Captive", "Captive, The"],
  ["Cops 'N' Robbers", "Cops & Robbers"],
  ["Creatures 2: Torture Trouble", "Creatures 2"],
  ["Dan Dare III - The Escape", "Dan Dare 3 - The Escape"],
  ["Double Dragon II: The Revenge", "Double Dragon 2"],
  ["Dragon Skulle", "Dragonskulle"],
  ["The Faces Of Haarne", "Faces of Haarne, The"],
  ["Ghetto Blaster", "Ghettoblaster"],
  ["The Great Escape", "Great Escape, The"],
  ["Halls Of The Things", "Halls of the Things, The"],
  ["He-Man and the Masters of the Universe: The Ilearth Stone",
    "He-Man and Masters of the Universe - The Ilearth Stone"],
  ["The Hitchhikers Guide To The Galaxy", "Hitchhiker's Guide to the Galaxy, The"],
  ["The Trap Door", "Trapdoor"],
];
const fuzzyFixture = aliasPairs.map(([query, title], n) => ({
  id: "alias-" + n, title, format: "prg",
}));
fuzzyFixture.push(
  { id: "unrelated", title: "Beach-Head II: Special Edition", format: "crt" },
  { id: "wrong-version", title: "Beach Head 3", format: "prg" },
  { id: "another-game", title: "Boulder Dash II", format: "prg" },
);
for (let n = 0; n < aliasPairs.length; n++) {
  const [query, title] = aliasPairs[n];
  const suggestions = suggestCatalogGames(fuzzyFixture, query, 8);
  assert.equal(suggestions.games[0]?.title, title, "Quick search failed: " + query);
  assert.equal(filterCatalog(fuzzyFixture, { query }).games[0]?.title, title,
    "Paginated search failed: " + query);
  assert.equal(searchCatalogEntries(fuzzyFixture, query)[0]?.title, title,
    "Full browser search failed: " + query);
}
assert.equal(suggestCatalogGames(fuzzyFixture, "Boulderdash").games[0].title, "Boulderdash");
assert.equal(suggestCatalogGames(fuzzyFixture, "Bouldr Dash").games[0].title, "Boulderdash",
  "A short spelling mistake must be suggested after exact matches fail");
assert.equal(suggestCatalogGames(fuzzyFixture, "Beach Head 1").total, 0,
  "A differently numbered sequel must not be suggested as a typo");
assert.ok(!searchCatalogEntries(fuzzyFixture, "Boulder Dash").some(entry =>
  entry.title === "Beach-head 2" || entry.title === "Beach Head 3"),
"Never confuse Boulder Dash with Beach-Head or another unrelated game");
assert.deepEqual(suggestCatalogGames(fuzzyFixture, "").games, []);
assert.ok(suggestCatalogGames(fuzzyFixture, "the").games.length <= 8,
  "Fuzzy search must not open an unbounded suggestions list");
const browserSource = readFileSync(new URL("../js/ccg-c64/catalogue-browser.js", import.meta.url), "utf8");
assert.match(browserSource, /searchCatalogEntries\(visible, query\)/,
  "Browse All must use the same fuzzy matching implementation as the quick search");
