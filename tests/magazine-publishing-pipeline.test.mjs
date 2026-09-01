import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("Reliable Games Publishing imports local magazine metadata before rebuilding games", () => {
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "games-publishing.yml"), "utf8");
  const importIndex = workflow.indexOf("node scripts/import-amiga-magazine-reviews.js");
  const rebuildIndex = workflow.indexOf("node scripts/rebuild-games.js");

  assert.ok(importIndex >= 0, "Reliable Games Publishing does not import locally cached/curated magazine reviews");
  assert.ok(rebuildIndex >= 0, "Reliable Games Publishing does not run the authoritative rebuild");
  assert.ok(importIndex < rebuildIndex, "magazine reviews must be imported before game pages are rebuilt");
});

test("external Lemon availability is not a publishing prerequisite", () => {
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "games-publishing.yml"), "utf8");
  assert.doesNotMatch(workflow, /Cache required Lemon magazine sources/);
  assert.doesNotMatch(workflow, /refresh-lemon-game-cache\.js --check --base HEAD\^/);
  assert.doesNotMatch(workflow, /refresh-lemon-game-cache\.js --base HEAD\^/);
  assert.match(workflow, /External Lemon64\/Lemon Amiga availability is optional/);
});

test("the magazine importer preserves support for existing C64 and Amiga Lemon cache data", () => {
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

test("Stifflip & Co retains four independently curated contemporary magazine scores", () => {
  const supplementPath = path.join(
    root,
    "data",
    "magazine-review-records",
    "supplements",
    "stifflip-and-co.json"
  );
  const supplement = JSON.parse(fs.readFileSync(supplementPath, "utf8"));
  const rows = supplement.games?.["c64:stifflip-and-co"] || [];

  assert.deepEqual(
    rows.map((row) => [row.magazine, row.score, row.scorePercent]),
    [
      ["C&VG", "9/10", 90],
      ["Commodore User", "8/10", 80],
      ["Your Commodore", "9/10", 90],
      ["Zzap!64", "70%", 70]
    ]
  );
});
