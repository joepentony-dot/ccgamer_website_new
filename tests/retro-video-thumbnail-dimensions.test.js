#!/usr/bin/env node

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { youtubeThumbnailCardUrl, youtubeThumbnailIntrinsicAttributes } = require("../scripts/lib/youtube-thumbnail-dimensions.js");

test("generated video cards reserve known YouTube thumbnail geometry", () => {
  assert.equal(
    youtubeThumbnailIntrinsicAttributes("https://img.youtube.com/vi/USTUwD_eH2c/hqdefault.jpg"),
    ' width="480" height="360"'
  );
  assert.equal(
    youtubeThumbnailIntrinsicAttributes("https://i.ytimg.com/vi/V9JD67SRm8w/maxresdefault.jpg"),
    ' width="1280" height="720"'
  );
  assert.equal(
    youtubeThumbnailIntrinsicAttributes("https://i.ytimg.com/vi/V9JD67SRm8w/sddefault.jpg"),
    ' width="640" height="480"'
  );
  assert.equal(
    youtubeThumbnailIntrinsicAttributes("https://i.ytimg.com/vi/V9JD67SRm8w/mqdefault.jpg"),
    ' width="320" height="180"'
  );
  assert.equal(
    youtubeThumbnailIntrinsicAttributes("https://i.ytimg.com/vi/V9JD67SRm8w/default.jpg"),
    ' width="120" height="90"'
  );
});

test("dimension helper does not guess unrelated image geometry", () => {
  assert.equal(youtubeThumbnailIntrinsicAttributes("/resources/images/example.webp"), "");
  assert.equal(youtubeThumbnailIntrinsicAttributes("https://example.com/custom.jpg"), "");
  assert.equal(youtubeThumbnailIntrinsicAttributes(""), "");
});


test("video-library cards right-size normal YouTube thumbnails without changing custom artwork", () => {
  assert.equal(
    youtubeThumbnailCardUrl("https://i.ytimg.com/vi/V9JD67SRm8w/maxresdefault.jpg"),
    "https://i.ytimg.com/vi/V9JD67SRm8w/mqdefault.jpg"
  );
  assert.equal(
    youtubeThumbnailCardUrl("https://img.ytimg.com/vi/USTUwD_eH2c/hqdefault.jpg?foo=1"),
    "https://img.ytimg.com/vi/USTUwD_eH2c/mqdefault.jpg?foo=1"
  );
  assert.equal(
    youtubeThumbnailCardUrl("/resources/images/custom-video-card.webp"),
    "/resources/images/custom-video-card.webp"
  );
  assert.equal(
    youtubeThumbnailCardUrl("https://example.com/custom.jpg"),
    "https://example.com/custom.jpg"
  );
});
