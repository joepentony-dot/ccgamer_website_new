import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("Reliable Games Publishing caches and imports Lemon magazine reviews before rebuilding games", () => {
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "games-publishing.yml"), "utf8");
  const cacheIndex = workflow.indexOf("node scripts/refresh-lemon-game-cache.js --base HEAD^");
  const importIndex = workflow.indexOf("node scripts/import-amiga-magazine-reviews.js");
  const rebuildIndex = workflow.indexOf("node scripts/rebuild-games.js");

  assert.ok(cacheIndex >= 0, "Reliable Games Publishing does not refresh changed Lemon game pages");
  assert.ok(importIndex >= 0, "Reliable Games Publishing does not import magazine reviews from the Lemon cache");
  assert.ok(rebuildIndex >= 0, "Reliable Games Publishing does not run the authoritative rebuild");
  assert.ok(cacheIndex < importIndex, "Lemon pages must be cached before magazine reviews are imported");
  assert.ok(importIndex < rebuildIndex, "magazine reviews must be imported before game pages are rebuilt");
});

test("a temporary Lemon fetch failure does not block publishing or invent scores", () => {
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "games-publishing.yml"), "utf8");
  const cacheStep = workflow.slice(
    workflow.indexOf("- name: Cache Lemon magazine sources"),
    workflow.indexOf("- name: Sync verified YouTube metadata")
  );

  assert.match(cacheStep, /continue-on-error:\s*true/);
  assert.match(cacheStep, /refresh-lemon-game-cache\.js --check --base HEAD\^/);
  assert.match(cacheStep, /no scores will be invented/i);
});

test("the magazine importer supports both C64 and Amiga Lemon catalogue pages", () => {
  const importer = fs.readFileSync(path.join(root, "scripts", "import-amiga-magazine-reviews.js"), "utf8");
  assert.match(importer, /\/amiga\|c64\/i/);
  assert.match(importer, /Magazine Reviews/i);
  assert.match(importer, /reviewsFromHtml/);
});
