#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    problems.push(`Missing required file: ${relativePath}.`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

const html = read("zzap64/index.html");
const script = read("js/zzap64-awards.js");
const css = read("resources/css/zzap64-performance.css");

[
  ['id="zzapLoading"', "Visible Zzap loading panel is missing."],
  ['id="zzapLoadingProgress"', "Zzap progressbar element is missing."],
  ['role="progressbar"', "Zzap loading element lacks progressbar semantics."],
  ['aria-valuenow="0"', "Zzap progressbar has no initial value."],
  ['id="zzapLoadingBar"', "Zzap progress fill element is missing."],
  ['id="zzapLoadingDetail"', "Zzap loading detail text is missing."],
  ['resources/css/zzap64-performance.css', "Zzap performance stylesheet is not loaded."],
  ['src="/js/ccg-zzap64-matcher.js"', "Zzap matcher is not requested directly by the page."],
  ['id="zzapAwardsGrid" aria-busy="true"', "Zzap results grid lacks its initial busy state."]
].forEach(([needle, message]) => {
  if (!html.includes(needle)) problems.push(message);
});

const matcherPosition = html.indexOf('src="/js/ccg-zzap64-matcher.js"');
const archivePosition = html.indexOf('src="/js/zzap64-awards.js"');
if (matcherPosition < 0 || archivePosition < 0 || matcherPosition > archivePosition) {
  problems.push("The Zzap matcher must load before the archive controller.");
}

[
  ["BATCH_SIZE", "Zzap card batching is missing."],
  ["requestAnimationFrame", "Zzap rendering is not scheduled between browser frames."],
  ["createDocumentFragment", "Zzap rendering does not use document fragments."],
  ["linksStatus", "Zzap reviewed-game linking state is missing."],
  ["Checking review link", "Zzap does not distinguish links still being checked."],
  ["Review link unavailable", "Zzap lacks a non-destructive game-link failure state."],
  ["updateProgress", "Zzap loading progress updates are missing."],
  ['cache: "default"', "Static Zzap data is not using normal browser caching."],
  ["await loadAwardEntries();", "Zzap award records are not loaded before game-link enrichment."],
  ["await loadReviewedGameLinks();", "Zzap reviewed-game links are not loaded as a separate stage."],
  ["matchReviewedGamesResponsively", "Zzap reviewed-game matching is not chunked responsively."],
  ["await yieldToMainThread();", "Zzap reviewed-game matching does not yield to navigation/input."],
  ["gameMatchCache", "Zzap reviewed-game matches are not cached before card rendering."]
].forEach(([needle, message]) => {
  if (!script.includes(needle)) problems.push(message);
});

if (script.includes('cache: "no-store"') || script.includes("cache: 'no-store'")) {
  problems.push("Zzap static data still forces a no-store network reload.");
}

const awardFetchPosition = script.indexOf("async function loadAwardEntries");
const gameFetchPosition = script.indexOf("async function loadReviewedGameLinks");
if (awardFetchPosition < 0 || gameFetchPosition < 0 || awardFetchPosition > gameFetchPosition) {
  problems.push("Zzap award loading must be defined before reviewed-game enrichment.");
}

[
  [".zzap-loading", "Zzap loading panel styles are missing."],
  [".zzap-loading:not([hidden])", "Zzap active loading state styles are missing."],
  ['content: "PLEASE WAIT"', "Zzap top loader does not show the PLEASE WAIT cue."],
  ["position: fixed", "Zzap loading progress is not fixed in the viewport."],
  ["top: 0", "Zzap loading progress is not anchored to the top edge."],
  [".zzap-loading__bar", "Zzap progress fill styles are missing."],
  ["content-visibility: auto", "Off-screen Zzap cards are not render-contained."],
  ["contain-intrinsic-size", "Zzap cards lack intrinsic placeholder sizing."],
  ["prefers-reduced-motion", "Zzap progress motion lacks a reduced-motion rule."],
  ["pointer-events: none", "Zzap progress strip can intercept site navigation while loading."]
].forEach(([needle, message]) => {
  if (!css.includes(needle)) problems.push(message);
});

if (css.includes("0 0 0 100vmax")) {
  problems.push("Zzap loading progress still dims the whole page instead of remaining a compact top strip.");
}

if (problems.length) {
  console.error("Zzap progressive loading audit failed:");
  problems.forEach((problem) => console.error(` - ${problem}`));
  process.exit(1);
}

console.log("Zzap progressive loading audit passed: cached data, staged enrichment, batched rendering and top-edge real progress verified.");
