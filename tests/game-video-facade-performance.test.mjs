import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");
const require = createRequire(import.meta.url);
const { enhanceVideoSection } = require("../scripts/generate-video-seo.js");

const shell = read("games/game.html");
const runtime = read("js/load-single-game.js");
const globalJs = read("js/ccg-global.js");
const videoSeo = read("scripts/generate-video-seo.js");
const overrides = read("scripts/apply-game-video-overrides.js");
const gamesCss = read("resources/css/games.css");
const pageCss = read("resources/css/game-pages.css");

test("single-game shell reserves the player but does not eagerly load YouTube", () => {
  assert.match(shell, /id="game-video-facade"/);
  assert.match(shell, /id="game-video-poster"/);
  assert.match(shell, /id="game-video-embed"[\s\S]*loading="lazy"[\s\S]*width="560"[\s\S]*height="315"[\s\S]*hidden/);
  const iframe = shell.match(/<iframe\b[^>]*id="game-video-embed"[^>]*>/i)?.[0] || "";
  assert.ok(iframe, "shared game video iframe is present");
  assert.doesNotMatch(iframe, /\bsrc=/i);
});

test("runtime loads YouTube only after the play facade is activated", () => {
  assert.match(runtime, /function ensureGameVideoFacadeShell\(videoEmbed\)/);
  assert.match(runtime, /document\.createElement\("button"\)/);
  assert.match(runtime, /document\.createElement\("img"\)/);
  assert.match(runtime, /videoEmbed\.removeAttribute\("src"\)/);
  assert.match(runtime, /videoEmbed\.dataset\.videoSrc = embedUrl/);
  assert.match(runtime, /videoFacade\.onclick = \(\) =>/);
  assert.match(runtime, /autoplay=1/);
  assert.match(runtime, /i\.ytimg\.com\/vi\/\$\{vid\}\/hqdefault\.jpg/);
  assert.match(runtime, /videoFacade\.hidden = true/);
});

test("generated canonical pages use poster metadata without materialising a YouTube iframe src", () => {
  assert.match(videoSeo, /removeAttribute\(iframe, "src"\)/);
  assert.match(videoSeo, /setAttribute\(iframe, "data-video-src"/);
  assert.match(videoSeo, /setBooleanAttribute\(iframe, "hidden"\)/);
  assert.match(videoSeo, /game-video-facade/);
  assert.match(videoSeo, /game-video-poster/);
  assert.match(videoSeo, /hasFacade/);
  assert.match(videoSeo, /hasStage/);
  assert.match(videoSeo, /<div class="game-video__stage">/);
  assert.match(videoSeo, /youtubeThumbnail\(videoId, metadata\)/);
  assert.doesNotMatch(videoSeo, /iframe = setAttribute\(iframe, "src"/);
});

test("external non-YouTube overrides keep ownership and suppress the YouTube facade", () => {
  assert.match(overrides, /setAttribute\(iframe, "src", override\.playerUrl\)/);
  assert.match(overrides, /game-video-facade/);
  assert.match(overrides, /setBooleanAttribute\(facade, "hidden"\)/);
  assert.match(overrides, /removeAttribute\(poster, "src"\)/);
});

test("single-game hidden iframe overrides its more-specific display:block rule", () => {
  // Without this rule, the .ccg-page--single-game selector defeats the
  // shared .game-video__frame[hidden] declaration and paints the iframe.
  assert.match(
    pageCss,
    /\.ccg-page--single-game #game-video-section \.game-video__frame\[hidden\]\s*\{\s*display:\s*none\s*;\s*\}/
  );
});

test("facade preserves the existing player geometry and Omega presentation", () => {
  assert.match(gamesCss, /\.game-video__stage[\s\S]*aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(gamesCss, /\.game-video__play[\s\S]*Orbitron/);
  assert.match(gamesCss, /\.game-video__facade:focus-visible/);
  assert.match(pageCss, /\.game-video__stage[\s\S]*aspect-ratio:\s*4\s*\/\s*3/);
  assert.match(pageCss, /@media \(max-width: 560px\)[\s\S]*\.game-video__stage[\s\S]*aspect-ratio:\s*16\s*\/\s*10/);
});


test("canonical generator upgrades legacy iframe-only markup into one deferred facade", () => {
  const legacy = [
    '<section id="game-video-section">',
    '<h2 class="game-section__title">Watch the Action</h2>',
    '<div class="game-video">',
    '<iframe id="game-video-embed" class="game-video__frame" src="https://www.youtube-nocookie.com/embed/OLDVIDEO123" loading="lazy" width="560" height="315"></iframe>',
    '<div class="game-video__actions"><a id="gameVideoBtn" href="#">Open on YouTube</a></div>',
    '</div>',
    '</section>'
  ].join("\n");

  const first = enhanceVideoSection(
    legacy,
    { title: "Test Game", system: "C64" },
    "NEWVIDEO123",
    { thumbnailUrl: "https://i.ytimg.com/vi/NEWVIDEO123/hqdefault.jpg" }
  );
  const second = enhanceVideoSection(
    first,
    { title: "Test Game", system: "C64" },
    "NEWVIDEO123",
    { thumbnailUrl: "https://i.ytimg.com/vi/NEWVIDEO123/hqdefault.jpg" }
  );

  const iframe = second.match(/<iframe\b[^>]*id="game-video-embed"[^>]*>/i)?.[0] || "";
  assert.ok(iframe);
  assert.doesNotMatch(iframe, /(?:^|\s)src\s*=/i);
  assert.match(iframe, /data-video-src="https:\/\/www\.youtube-nocookie\.com\/embed\/NEWVIDEO123"/);
  assert.equal((second.match(/id="game-video-facade"/g) || []).length, 1);
  assert.equal((second.match(/id="game-video-poster"/g) || []).length, 1);
  assert.equal((second.match(/class="game-video__stage"/g) || []).length, 1);
  // The direct YouTube action must remain OUTSIDE the stage, not parsed as
  // iframe fallback content when legacy iframe-only pages are regenerated.
  assert.match(
    second,
    /<iframe\b[^>]*id="game-video-embed"[^>]*><\/iframe>\s*<\/div>\s*<div class="game-video__actions">/
  );
  assert.equal((second.match(/<\/iframe>/g) || []).length, 1);

});


test("wheel guard follows a deferred player into its facade stage", () => {
  assert.match(globalJs, /frame\.__ccgWheelGuardHost/);
  assert.match(globalJs, /frame\.__ccgWheelGuardShield/);
  assert.match(globalJs, /guarded\.delete\(frame\)/);
  assert.match(globalJs, /previousShield\?\.remove\?\.\(\)/);
});


test("keyboard activation focuses the revealed player without trapping pointer interaction", () => {
  const handlerBody = runtime.match(/videoFacade\.onclick = \(\) => \{([\s\S]*?)\n            \};/)?.[1];
  assert.ok(handlerBody, "video facade click handler exists");
  const activate = new Function("videoEmbed", "videoFacade", "embedUrl", "document", handlerBody);
  const iframe = {
    dataset: { videoSrc: "https://www.youtube-nocookie.com/embed/TEST" },
    hidden: true,
    tabIndex: -1,
    focusCalls: [],
    focus(options) { this.focusCalls.push(options); }
  };
  const facade = { hidden: false };
  const document = { activeElement: facade };
  activate(iframe, facade, iframe.dataset.videoSrc, document);
  assert.equal(iframe.src, "https://www.youtube-nocookie.com/embed/TEST?autoplay=1");
  assert.equal(iframe.hidden, false);
  assert.equal(facade.hidden, true);
  assert.equal(iframe.tabIndex, 0);
  assert.deepEqual(iframe.focusCalls, [{ preventScroll: true }]);

  const pointerIframe = {
    dataset: { videoSrc: "https://www.youtube-nocookie.com/embed/TEST" },
    hidden: true,
    focus() { assert.fail("pointer activation must not force keyboard focus"); }
  };
  const pointerFacade = { hidden: false };
  activate(pointerIframe, pointerFacade, pointerIframe.dataset.videoSrc, { activeElement: null });
  assert.equal(pointerIframe.hidden, false);
  assert.equal(pointerFacade.hidden, true);
});

test("wheel guard retires stale shields when iframe src clears or its host moves", () => {
  const start = globalJs.indexOf("function setupEmbeddedFrameWheelGuards()");
  const end = globalJs.indexOf("function setupScrollPerfPause()", start);
  assert.ok(start >= 0 && end > start, "shared embedded wheel guard source exists");

  const makeClassList = () => {
    const values = new Set();
    return {
      add(value) { values.add(value); },
      remove(...items) { items.forEach(item => values.delete(item)); },
      contains(value) { return values.has(value); }
    };
  };
  class FakeElement {}
  const createHost = () => ({
    offsetWidth: 500,
    offsetHeight: 280,
    scrollLeft: 0,
    scrollTop: 0,
    children: [],
    classList: makeClassList(),
    appendChild(node) { this.children.push(node); node.isConnected = true; },
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 500, height: 280 }; }
  });
  class FakeFrame extends FakeElement {
    constructor(host) {
      super();
      this.parentElement = host;
      this.offsetParent = host;
      this.offsetLeft = 0;
      this.offsetTop = 0;
      this.offsetWidth = 500;
      this.offsetHeight = 280;
      this.isConnected = true;
      this.attrs = { src: "https://www.youtube-nocookie.com/embed/VIDEO" };
      this.dataset = {};
      this.classList = makeClassList();
    }
    getAttribute(name) { return this.attrs[name] || null; }
    closest() { return null; }
    matches() { return true; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 500, height: 280 }; }
  }
  const firstHost = createHost();
  const frame = new FakeFrame(firstHost);
  const shields = [];
  const fakeDocument = {
    documentElement: { hasAttribute() { return true; } },
    querySelectorAll() { return [frame]; },
    createElement() {
      const shield = {
        isConnected: false,
        style: { setProperty() {} },
        setAttribute() {},
        addEventListener() {},
        remove() { this.isConnected = false; },
        getBoundingClientRect() { return { left: 0, top: 0, width: 500, height: 280 }; }
      };
      shields.push(shield);
      return shield;
    }
  };
  let mutationCallback;
  let disconnectCount = 0;
  class FakeMutationObserver {
    constructor(callback) { mutationCallback = callback; }
    observe() {}
  }
  class FakeResizeObserver {
    observe() {}
    disconnect() { disconnectCount += 1; }
  }
  const fakeWindow = { addEventListener() {}, removeEventListener() {} };
  const functionSource = globalJs.slice(start, end);
  const createSetup = new Function(
    "document", "window", "HTMLIFrameElement", "Element",
    "MutationObserver", "ResizeObserver", "requestAnimationFrame",
    functionSource + "\nreturn setupEmbeddedFrameWheelGuards;"
  );
  const setup = createSetup(
    fakeDocument, fakeWindow, FakeFrame, FakeElement,
    FakeMutationObserver, FakeResizeObserver, () => {}
  );
  setup();
  assert.equal(shields.length, 1);
  assert.equal(frame.dataset.ccgWheelGuard, "ready");
  assert.equal(firstHost.classList.contains("ccg-wheel-guard-host"), true);

  delete frame.attrs.src;
  mutationCallback([{ type: "attributes", target: frame, addedNodes: [] }]);
  assert.equal(shields[0].isConnected, false, "old shield is removed immediately");
  assert.equal(firstHost.classList.contains("ccg-wheel-guard-host"), false);
  assert.equal(frame.dataset.ccgWheelGuard, undefined);
  assert.equal(frame.__ccgWheelGuardShield, undefined);
  assert.equal(disconnectCount, 1, "stale ResizeObserver was disconnected");

  frame.attrs.src = "https://www.youtube-nocookie.com/embed/VIDEO";
  mutationCallback([{ type: "attributes", target: frame, addedNodes: [] }]);
  assert.equal(shields.length, 2);
  assert.equal(frame.dataset.ccgWheelGuard, "ready");

  const secondHost = createHost();
  frame.parentElement = secondHost;
  frame.offsetParent = secondHost;
  mutationCallback([{ type: "childList", target: secondHost, addedNodes: [frame] }]);
  assert.equal(shields.length, 3, "reparenting installs a new shield");
  assert.equal(shields[1].isConnected, false, "former host shield retired");
  assert.equal(firstHost.classList.contains("ccg-wheel-guard-host"), false);
  assert.equal(secondHost.classList.contains("ccg-wheel-guard-host"), true);
  assert.equal(frame.dataset.ccgWheelGuard, "ready");
  assert.equal(disconnectCount, 2);
});
