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
    youtubeThumbnailCardUrl("https://img.youtube.com/vi/USTUwD_eH2c/maxresdefault.jpg"),
    "https://img.youtube.com/vi/USTUwD_eH2c/mqdefault.jpg"
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


const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function retroSpecialsThumbnailRuntime(documentStub = { addEventListener() {} }) {
  const source = fs.readFileSync(path.join(__dirname, "../js/retro-specials-loader.js"), "utf8");
  const entrypoint = source.lastIndexOf("\nccgPrimeRetroSpecialsUi();");
  assert.ok(entrypoint > 0, "Expected original collection bootstrap");
  const sandbox = { document: documentStub };
  vm.runInNewContext(source.slice(0, entrypoint) +
    "\nglobalThis.__retroThumbnailTest = { build: ccgBuildRetroSpecialCard, bind: ccgBindRetroSpecialThumbnailFallback };", sandbox);
  return sandbox.__retroThumbnailTest;
}

test("Retro Specials cards retain thumbnails, dimensions and member badges without inline executable fallback", () => {
  const runtime = retroSpecialsThumbnailRuntime();
  const markup = runtime.build({
    youtubeId: "USTUwD_eH2c",
    slug: "zx-spectrum-quiz",
    title: "Spectrum Quiz",
    summary: "50 games",
    membersOnly: true
  }, 0);
  assert.match(markup, /src="https:\/\/img\.youtube\.com\/vi\/USTUwD_eH2c\/hqdefault\.jpg"/);
  assert.match(markup, /data-ccg-retro-fallback="https:\/\/img\.youtube\.com\/vi\/USTUwD_eH2c\/mqdefault\.jpg"/);
  assert.match(markup, /width="480" height="270"/);
  assert.match(markup, /fetchpriority="high"/);
  assert.match(markup, /Members only/);
  assert.doesNotMatch(markup, /\sonerror\s*=/i);
});

test("Retro Specials hostile metadata stays inert in the thumbnail fallback attribute", () => {
  const runtime = retroSpecialsThumbnailRuntime();
  const markup = runtime.build({
    youtubeId: "x'-alert(1)-'",
    slug: "quiz",
    title: 'Quiz "Retro" <arcade>',
    summary: "C64 & Amiga"
  });
  assert.match(markup, /data-ccg-retro-fallback="https:\/\/img\.youtube\.com\/vi\/x&#39;-alert\(1\)-&#39;\/mqdefault\.jpg"/);
  assert.match(markup, /alt="Quiz &quot;Retro&quot; &lt;arcade&gt; – Retro Specials video thumbnail"/);
  assert.match(markup, /C64 &amp; Amiga/);
  assert.doesNotMatch(markup, /\sonerror\s*=/i);
  assert.doesNotMatch(markup, /<arcade>/);
});

test("Retro Specials image-error fallback is delegated once and retries at most once", () => {
  const listeners = [];
  const runtime = retroSpecialsThumbnailRuntime({
    addEventListener(type, listener, capture) { listeners.push({ type, listener, capture }); }
  });
  runtime.bind();
  runtime.bind();
  assert.equal(listeners.length, 1);
  assert.equal(listeners[0].type, "error");
  assert.equal(listeners[0].capture, true, "Capture is required for non-bubbling image errors");

  const fallback = "https://img.youtube.com/vi/USTUwD_eH2c/mqdefault.jpg";
  const attrs = new Map([["data-ccg-retro-fallback", fallback]]);
  const image = {
    tagName: "IMG",
    src: "https://example.com/missing-thumbnail.jpg",
    hasAttribute(name) { return attrs.has(name); },
    getAttribute(name) { return attrs.get(name); },
    removeAttribute(name) { attrs.delete(name); }
  };
  listeners[0].listener({ target: image });
  assert.equal(image.src, fallback);
  assert.equal(attrs.has("data-ccg-retro-fallback"), false);
  image.src = "https://example.com/second-failure.jpg";
  listeners[0].listener({ target: image });
  assert.equal(image.src, "https://example.com/second-failure.jpg", "Failed fallback must not loop");

  const unrelated = { tagName: "DIV", hasAttribute() { throw new Error("Should not inspect unrelated element"); } };
  assert.doesNotThrow(() => listeners[0].listener({ target: unrelated }));
});

test("Retro Specials binds the image error handler before rendering dynamically rebuilt cards", () => {
  const source = fs.readFileSync(path.join(__dirname, "../js/retro-specials-loader.js"), "utf8");
  const run = source.slice(source.indexOf("async function ccgRunCollection()"));
  const bound = run.indexOf("ccgBindRetroSpecialThumbnailFallback();");
  const rendered = run.indexOf("ccgRenderRetroSpecialsDiscovery();");
  assert.ok(bound >= 0 && rendered > bound);
});
