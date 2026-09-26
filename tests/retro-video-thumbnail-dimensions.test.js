#!/usr/bin/env node

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { thumbnailIntrinsicAttributes } = require("../scripts/generate-retro-pages.js");

test("retro video generator reserves YouTube thumbnail geometry", () => {
  assert.equal(
    thumbnailIntrinsicAttributes("https://img.youtube.com/vi/USTUwD_eH2c/hqdefault.jpg"),
    ' width="480" height="360"'
  );
  assert.equal(
    thumbnailIntrinsicAttributes("https://i.ytimg.com/vi/V9JD67SRm8w/maxresdefault.jpg"),
    ' width="1280" height="720"'
  );
  assert.equal(
    thumbnailIntrinsicAttributes("https://i.ytimg.com/vi/V9JD67SRm8w/sddefault.jpg"),
    ' width="640" height="480"'
  );
  assert.equal(
    thumbnailIntrinsicAttributes("https://i.ytimg.com/vi/V9JD67SRm8w/mqdefault.jpg"),
    ' width="320" height="180"'
  );
  assert.equal(
    thumbnailIntrinsicAttributes("https://i.ytimg.com/vi/V9JD67SRm8w/default.jpg"),
    ' width="120" height="90"'
  );
});

test("retro video generator does not guess dimensions for unrelated thumbnails", () => {
  assert.equal(thumbnailIntrinsicAttributes("/resources/images/example.webp"), "");
  assert.equal(thumbnailIntrinsicAttributes("https://example.com/custom.jpg"), "");
  assert.equal(thumbnailIntrinsicAttributes(""), "");
});
