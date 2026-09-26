import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const genre = fs.readFileSync("js/genre-loader.js", "utf8");
const collection = fs.readFileSync("js/collection-loader.js", "utf8");

for (const [name, source] of [
  ["genre", genre],
  ["collection", collection]
]) {
  test(`${name} hydration preserves generated first-paint cards`, () => {
    assert.match(source, /serverRenderedCards = Array\.from/);
    assert.match(source, /querySelectorAll\("\.ccg-game-card--fallback"\)/);
    assert.match(source, /let cursor = Math\.min\(serverRenderedCards\.length, games\.length\)/);
    assert.match(source, /if \(!serverRenderedCards\.length\) \{[\s\S]*container\.innerHTML = "";[\s\S]*appendBatch\(initialBatch\)/);
    assert.doesNotMatch(
      source,
      /container\.innerHTML = "";\s*appendBatch\(initialBatch\);\s*\n\s*if \(cursor < games\.length\)/,
      "initial client hydration must not unconditionally replace the generated card grid"
    );
  });

  test(`${name} Load More continues after the server-rendered card count`, () => {
    assert.match(source, /const remaining = games\.length - cursor/);
    assert.match(source, /const next = games\.slice\(cursor, cursor \+ size\)/);
    assert.match(source, /container\.appendChild\(fragment\)/);
    assert.match(source, /cursor \+= next\.length/);
    assert.match(source, /btn\.addEventListener\("click", \(\) => appendBatch\(batchSize\)\)/);
  });
}
