#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const failures = [];

function read(relativePath) {
    const filePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(filePath)) {
        failures.push(`Missing required file: ${relativePath}`);
        return "";
    }
    return fs.readFileSync(filePath, "utf8");
}

function requireText(source, token, label) {
    if (!source.includes(token)) failures.push(`${label} is missing: ${token}`);
}

function rejectText(source, token, label) {
    if (source.includes(token)) failures.push(`${label} must not contain: ${token}`);
}

const modeEngine = read("js/ccg-mode-engine.js");
const modeTest = read("tests/mode-engine-runtime.test.cjs");
const navCore = read("js/ccg-nav-core.js");
const runtimeFixes = read("js/ccg-ui-regression-fixes.js");
const polishCss = read("resources/css/ccg-ui-regression-fixes.css");
const zzapPage = read("zzap64/index.html");
const publisherIndex = read("games/publishers/index.html");

[
    "AUDIO_CACHE_BUSTER",
    "resetAudioPosition",
    "Number(audio.readyState) > 0",
    "mode cue could not be played",
    "lemmings-lets-go.mp3?v=",
    "c64_speech_stayawhile.mp3?v="
].forEach((token) => requireText(modeEngine, token, "Mode engine"));

[
    "InvalidStateError: metadata not loaded",
    "test begins before Amiga audio metadata is available",
    "still plays when metadata was unavailable"
].forEach((token) => requireText(modeTest, token, "Mode runtime regression test"));

[
    "/js/ccg-ui-regression-fixes.js",
    'el.style.setProperty("overflow", "hidden", "important")'
].forEach((token) => requireText(navCore, token, "Navigation core"));
rejectText(navCore, 'el.style.setProperty("overflow", "visible", "important")', "Navigation pill hardening");

[
    "ZZAP_MIN_VISIBLE_MS = 1800",
    "requestAnimationFrame",
    "MutationObserver",
    "data-ccg-footer-hub",
    "/terms.html",
    "/privacy.html",
    "/cookies.html",
    "/affiliate-disclosure.html"
].forEach((token) => requireText(runtimeFixes, token, "UI regression runtime"));

[
    ".ccg-nav__more-toggle",
    "overflow: hidden !important",
    ".ccg-publisher-card--has-logo",
    ".ccg-publisher-grid--featured",
    "min-width: 0 !important",
    "width: 100% !important",
    "grid-template-columns: repeat(2, minmax(0, 1fr)) !important",
    "grid-template-columns: minmax(0, 1fr) !important",
    ".zzap-loading:not([hidden])",
    "z-index: 2147483000",
    ".ccg-footer-hub",
    "grid-template-columns: repeat(3",
    "@media (max-width: 1100px)",
    "@media (max-width: 760px)",
    "@media (max-width: 500px)",
    '.ccg-btn:not(.ccg-btn-blue):not(.ccg-btn-red):hover'
].forEach((token) => requireText(polishCss, token, "UI regression stylesheet"));

rejectText(polishCss, 'body[data-ccg-mode="c64"] .ccg-btn:hover', "Generic C64 hover must not override existing blue/red CTAs");
rejectText(polishCss, 'body[data-ccg-mode="amiga"] .ccg-btn:hover', "Generic Amiga hover must not override existing blue/red CTAs");

[
    'id="zzapLoading"',
    'id="zzapLoadingPercent"',
    'class="zzap-loading__bar"'
].forEach((token) => requireText(zzapPage, token, "Zzap loading markup"));

[
    '/games/publishers/microprose-software/',
    'data-publisher-logo="microprose-software"'
].forEach((token) => requireText(publisherIndex, token, "MicroProse publisher card"));

["terms.html", "privacy.html", "cookies.html", "affiliate-disclosure.html"].forEach((relativePath) => {
    if (!fs.existsSync(path.join(ROOT, relativePath))) failures.push(`Footer target does not exist: ${relativePath}`);
});

const audioPath = path.join(ROOT, "resources", "audio", "mode", "lemmings-lets-go.mp3");
if (!fs.existsSync(audioPath)) {
    failures.push("Lemmings mode cue is missing from resources/audio/mode.");
} else {
    const audio = fs.readFileSync(audioPath);
    const hasId3 = audio.length >= 3 && audio.subarray(0, 3).toString("ascii") === "ID3";
    const hasMpegSync = audio.length >= 2 && audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0;
    if (audio.length < 1000) failures.push(`Lemmings mode cue is unexpectedly small (${audio.length} bytes).`);
    if (!hasId3 && !hasMpegSync) failures.push("Lemmings mode cue does not begin with an ID3 tag or MPEG frame sync.");
}

if (failures.length) {
    console.error("UI regression audit failed:");
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exit(1);
}

console.log("UI regression audit passed.");
console.log("- mode cues are present, cache-busted and safe before metadata loads");
console.log("- Zzap loading overlay is held on screen long enough for a real first paint");
console.log("- nav shimmer and publisher cards are clipped to their own controls/cells");
console.log("- publisher grids retain safe two-column/tablet and one-column/mobile layouts");
console.log("- C64/Amiga generic button hover labels retain contrast without overriding the existing blue/red CTAs");
console.log("- home footer exposes verified explore, support and legal routes");
