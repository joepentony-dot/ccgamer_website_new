import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("Reliable Games Publishing caches and imports Lemon magazine reviews before rebuilding games", () => {
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "games-publishing.yml"), "utf8");
  const cacheIndex = workflow.indexOf("node scripts/refresh-lemon-game-cache.js --base HEAD^");
  const coverageIndex = workflow.indexOf("node scripts/refresh-lemon-game-cache.js --check --base HEAD^");
  const importIndex = workflow.indexOf("node scripts/import-amiga-magazine-reviews.js");
  const rebuildIndex = workflow.indexOf("node scripts/rebuild-games.js");

  assert.ok(cacheIndex >= 0, "Reliable Games Publishing does not refresh changed Lemon game pages");
  assert.ok(coverageIndex >= 0, "Reliable Games Publishing does not verify Lemon cache coverage for changed game pages");
  assert.ok(importIndex >= 0, "Reliable Games Publishing does not import magazine reviews from the Lemon cache");
  assert.ok(rebuildIndex >= 0, "Reliable Games Publishing does not run the authoritative rebuild");
  assert.ok(cacheIndex < coverageIndex, "Lemon pages must be fetched before cache coverage is checked");
  assert.ok(coverageIndex < importIndex, "Lemon cache coverage must pass before magazine reviews are imported");
  assert.ok(importIndex < rebuildIndex, "magazine reviews must be imported before game pages are rebuilt");
});

test("a new or changed Lemon source is a publishing prerequisite rather than a silent fallback", () => {
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "games-publishing.yml"), "utf8");
  const cacheStart = workflow.indexOf("- name: Cache required Lemon magazine sources");
  const importStart = workflow.indexOf("- name: Import Lemon magazine reviews");
  assert.ok(cacheStart >= 0, "required Lemon cache step is missing");
  assert.ok(importStart > cacheStart, "magazine import must follow the required Lemon cache step");

  const cacheStep = workflow.slice(cacheStart, importStart);
  assert.doesNotMatch(cacheStep, /continue-on-error:\s*true/);
  assert.match(cacheStep, /refresh-lemon-game-cache\.js --check --base HEAD\^/);
});

test("the magazine importer supports both C64 and Amiga Lemon catalogue pages", () => {
  const importer = fs.readFileSync(path.join(root, "scripts", "import-amiga-magazine-reviews.js"), "utf8");
  assert.match(importer, /\/amiga\|c64\/i/);
  assert.match(importer, /Magazine Reviews/i);
  assert.match(importer, /reviewsFromHtml/);
});

test("Mr Weems retains the three verified contemporary magazine scores", () => {
  const supplementPath = path.join(
    root,
    "data",
    "magazine-review-records",
    "supplements",
    "mr-weems-and-the-she-vampires.json"
  );
  const supplement = JSON.parse(fs.readFileSync(supplementPath, "utf8"));
  const rows = supplement.games?.["c64:mr-weems-and-the-she-vampires"] || [];

  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((row) => [row.magazine, row.score, row.scorePercent]),
    [
      ["Commodore User", "5/10", 50],
      ["Your Commodore", "8/10", 80],
      ["Zzap!64", "19%", 19]
    ]
  );
});
