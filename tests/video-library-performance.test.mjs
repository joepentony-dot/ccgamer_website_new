import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("js/video-library.js", "utf8");

test("video library preserves generated first-paint cards until interaction", () => {
  assert.match(source, /function|const syncInitialServerRender/);
  assert.match(source, /syncInitialServerRender\(\);/);
  assert.doesNotMatch(
    source,
    /items = Array\.isArray\(payload\?\.items\)[\s\S]{0,180}render\(\);/,
    "initial index hydration must not replace the generated first-paint card grid"
  );
  assert.match(source, /results\.replaceChildren\(fragment\)/);
  assert.match(source, /search\.addEventListener\('input'/);
  assert.match(source, /data-video-filter|activeFilter/);
});

test("dynamically rendered video cards use stable card-sized YouTube images", () => {
  assert.match(source, /const cardThumbnail = \(value\) =>/);
  assert.match(source, /mqdefault\.jpg/);
  assert.match(source, /image\.width = 320/);
  assert.match(source, /image\.height = 180/);
  assert.match(source, /image\.loading = 'lazy'/);
});
