import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const archive = fs.readFileSync("js/games-library.js", "utf8");
const globalSearch = fs.readFileSync("js/ccg-global-search.js", "utf8");
const sourceGames = JSON.parse(fs.readFileSync("games/games.json", "utf8"));
const getSection = (source, from, to) => {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, "Missing search source boundary: " + from);
  return source.slice(start, end);
};

function globalLookup(games, query) {
  const source = [
    getSection(globalSearch, "    function normalize(value) {", "    function slugify(value) {"),
    getSection(globalSearch, "    function scoreItem(item, query) {", "    function createResultLink(item, type) {"),
    "findGameMatches(items, normalize(userQuery));"
  ].join("\n");
  const items = games.map(game => ({
    title: game.title, href: "/games/" + game.slug + "/",
    meta: "Commodore 64", searchText: game.title
  }));
  return vm.runInNewContext(source, { items, userQuery: query, Map, Object, Array, Math,
    String, Number, Intl, Infinity, Set }).map(item => item.title);
}

function archiveLookup(games, query, system = "all") {
  const source = [
    "const CCG_ALL_GAMES = games;",
    "const CCG_SEARCH_CACHE = new WeakMap();",
    "let CCG_ACTIVE_QUERY = '';",
    "const CCG_ACTIVE_SYSTEM_FILTER = filter;",
    "function normalizeSystemValue(value) { return String(value || '').toUpperCase(); }",
    "function matchesYearRange() { return true; }",
    getSection(archive, "function getFilteredGames() {", "/* ============================================================\n   COUNTS"),
    getSection(archive, "function normalizeSearchText(text) {", "function parseGameYear(year) {"),
    "CCG_ACTIVE_QUERY = normalizeSearchText(userQuery);",
    "getFilteredGames().map(game => game.title);"
  ].join("\n");
  return vm.runInNewContext(source, { games, userQuery: query, filter: system, WeakMap, Set,
    Math, String, Number, Array, Object, Infinity }).map(String);
}

const examples = [
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
  ["The Hitchhikers Guide To The Galaxy", "Hitchhiker's Guide to the Galaxy, The"]
];
const fixtures = examples.map(([title], i) => ({
  title, slug: "test-game-" + i, system: i % 2 ? "AMIGA" : "C64"
}));
fixtures.push(
  { title: "Beach-Head III", slug: "beach-head-3", system: "C64" },
  { title: "Boulder Dash II", slug: "boulder-dash-2", system: "C64" },
  { title: "Game 9", slug: "game9", system: "C64" },
  { title: "Game 90", slug: "game90", system: "C64" },
  { title: "Game 91", slug: "game91", system: "C64" }
);

test("all owner-supplied title aliases work in both website game searches", () => {
  for (const [name, alias] of examples) {
    assert.ok(globalLookup(fixtures, alias).includes(name),
      "Sitewide search missed " + alias + " → " + name);
    assert.ok(archiveLookup(fixtures, alias).includes(name),
      "A–Z search missed " + alias + " → " + name);
  }
});

test("the website accepts shortened terms and misspellings without unrelated games", () => {
  for (const lookup of [globalLookup, archiveLookup]) {
    assert.ok(lookup(fixtures, "BCs Quest").includes("B.C.'S Quest For Tires"));
    assert.ok(lookup(fixtures, "Ghettoblaster").includes("Ghetto Blaster"));
    assert.ok(lookup(fixtures, "Bouldr Dash").includes("Boulder Dash"));
    assert.ok(!lookup(fixtures, "Boulder Dash").includes("Beach-Head II"),
      "The incorrect Boulder Dash → Beach-Head II pairing must be rejected");
    assert.ok(!lookup(fixtures, "Beach Head 1").includes("Beach-Head II"),
      "An explicitly different numbered sequel must not be suggested");
    assert.ok(lookup(fixtures, "Game 9").includes("Game 90"),
      "Partial numeric input remains searchable");
  }
});

test("C64/Amiga filter and page identity remain unchanged", () => {
  const target = fixtures.find(game => game.title === "The Captive");
  assert.equal(target.system, "AMIGA");
  assert.ok(archiveLookup(fixtures, "Captive The", "amiga").includes("The Captive"));
  assert.ok(!archiveLookup(fixtures, "Captive The", "c64").includes("The Captive"));
  assert.match(globalSearch, /"Games", "Game", findGameMatches\(state\.games, query\)/);
  assert.match(globalSearch, /"Publishers", "Publisher", findMatches\(state\.publishers, query\)/);
  assert.match(globalSearch, /MAX_GROUP_RESULTS\s*=\s*8/);
  assert.match(archive, /fuzzyArchiveTitleMatch\(game, queryData\.normalized\)/);
  assert.match(archive, /fuzzyArchiveTitleTypo\(game, queryData\.normalized\)/);
  assert.match(archive, /const matchesSystem =/);
});

test("canonical games and site data are still the source of search links", () => {
  assert.ok(sourceGames.some(game => game.slug === "boulder-dash"));
  assert.ok(sourceGames.some(game => game.slug === "beach-head-2"));
  assert.ok(sourceGames.some(game => game.system === "AMIGA"));
  assert.match(globalSearch, /link\.href = item\.href/);
  assert.doesNotMatch(globalSearch, /href = [^;]*fuzzyGameTitle/);
});
