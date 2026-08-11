import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const { build, cleanRecord } = require(path.join(root, "scripts", "build-magazine-review-chunks.js"));

test("builds platform-aware review keys without mixing C64 and Amiga", () => {
  const built = build({
    games: {
      "amiga:test-game": [{ magazine: "Amiga Format", score: "90%", scorePercent: 90, url: "https://example.com/a" }],
      "c64:test-game": [{ magazine: "Zzap!64", score: "91%", scorePercent: 91, url: "https://example.com/c" }]
    }
  });
  const chunk = JSON.parse(built.files["q-t.json"]);
  assert.equal(chunk.games["amiga:test-game"][0].scorePercent, 90);
  assert.equal(chunk.games["c64:test-game"][0].scorePercent, 91);
});

test("rejects invalid scores and unsafe review URLs", () => {
  assert.equal(cleanRecord({ magazine: "Magazine", score: "110%", scorePercent: 110 }), null);
  const record = cleanRecord({ magazine: "Magazine", score: "8/10", scorePercent: 80, url: "http://example.com" });
  assert.equal(record.url, "");
  assert.equal(record.scanStatus, "missing");
});

test("Arcade Pool contains the verified Amiga Format review", () => {
  const source = JSON.parse(fs.readFileSync(path.join(root, "data", "magazine-review-records.json"), "utf8"));
  const reviews = source.games["amiga:arcade-pool"];
  const format = reviews.find((review) => review.magazine === "Amiga Format" && review.issue === "59");
  assert.equal(format.scorePercent, 94);
  assert.equal(format.page, 65);
});

test("schema loader uses the combined magazine runtime", () => {
  const schema = fs.readFileSync(path.join(root, "js", "ccg-schema.js"), "utf8");
  assert.match(schema, /magazine-game-reviews-runtime\.js/);
  assert.doesNotMatch(schema, /script\.src = '\/js\/zzap64-game-reviews-runtime\.js'/);
});
