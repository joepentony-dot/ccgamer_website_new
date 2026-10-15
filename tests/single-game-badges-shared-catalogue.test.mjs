import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("js/ccg-game-badges.js", "utf8");
const start = source.indexOf("    async function loadBadgeGames() {");
const end = source.indexOf("\n    async function init() {", start);
assert.ok(start > 0 && end > start, "Badge catalogue function must be present");
const snippet = source.slice(start, end) + "\n loadBadgeGames;";
function loader(window, fetch) { return vm.runInNewContext(snippet, { window, fetch }); }

test("badge layer reuses single game catalogue without a second fetch", async () => {
  let requested = 0;
  const games = [{slug: "wasteland"}, {slug: "20-tons"}];
  const load = loader({ccgLoadSharedGames: async () => games}, () => { requested++; throw Error("duplicate fetch"); });
  assert.equal(await load(), games);
  assert.equal(requested, 0);
});

test("badge layer preserves a direct fallback on pages without shared loader", async () => {
  let requested = 0;
  const load = loader({}, async (url, options) => {
    requested++;
    assert.equal(url, "/games/games.json");
    assert.equal(options.cache, "no-store");
    return {ok:true, json: async () => ({games: [{slug:"1942"}]})};
  });
  assert.equal((await load())[0].slug, "1942");
  assert.equal(requested, 1);
});

test("badge layer retries direct fetch after a failed shared request", async () => {
  let requested = 0;
  const load = loader({ccgLoadSharedGames: async () => {throw Error("offline cache");}}, async () => {
    requested++;
    return {ok:true,json: async () => [{slug:"fire-king"}]};
  });
  assert.equal((await load())[0].slug, "fire-king");
  assert.equal(requested, 1);
});

test("badge award and original review sources remain in parallel", () => {
  assert.match(source, /const \[games, rawEntries, reviewData\] = await Promise\.all\(\[/);
  assert.match(source, /loadBadgeGames\(\),\s*loadAwards\(\),\s*loadReviewLinks\(\)/);
  assert.match(source, /insertBadges\(awards\)/);
  assert.match(source, /attachReviewLinks\(rawEntries, reviewData, matcher\)/);
});
