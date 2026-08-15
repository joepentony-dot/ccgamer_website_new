#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const failures = [];

function read(relativePath) {
    const absolutePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) {
        failures.push(`Missing required file: ${relativePath}`);
        return "";
    }
    return fs.readFileSync(absolutePath, "utf8");
}

function requireText(source, token, label) {
    if (!source.includes(token)) failures.push(`${label} is missing: ${token}`);
}

function balancedBraces(source, label) {
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
    let depth = 0;
    for (const character of withoutComments) {
        if (character === "{") depth += 1;
        if (character === "}") depth -= 1;
        if (depth < 0) {
            failures.push(`${label} closes a CSS block before it opens`);
            return;
        }
    }
    if (depth !== 0) failures.push(`${label} has unbalanced CSS braces (${depth})`);
}

function requireJson(relativePath, validator, label) {
    const source = read(relativePath);
    if (!source) return;

    try {
        const value = JSON.parse(source);
        if (!validator(value)) failures.push(`${label} has an unexpected data shape: ${relativePath}`);
    } catch (error) {
        failures.push(`${label} is not valid JSON: ${relativePath} (${error.message})`);
    }
}

const searchJs = read("js/ccg-global-search.js");
const searchCss = read("resources/css/ccg-global-search.css");
const performanceJs = read("resources/js/ccg-performance.js");
const performanceCss = read("resources/css/ccg-performance-foundations.css");
const home = read("home.html");

[
    'const VIDEO_INDEX = "/videos/video-index.json"',
    'const DEMO_MUSIC_INDEX = "/data/amiga-demo-music.json"',
    'const RETRO_EVENTS_INDEX = "/data/retro-events.json"',
    'title: "Music Hub"',
    '["Website Sections", "Section"',
    '["Videos", "Video"',
    '["Amiga Demo Music", "Music"',
    '["Retro Events", "Event"',
    'Search anything on CCG',
    'Search the Entire CCG Website',
    'homeMain.insertBefore(command, homeMain.firstChild)'
].forEach((token) => requireText(searchJs, token, "Whole-site search runtime"));

[
    ".ccg-home-search-command",
    ".ccg-global-search-trigger--home",
    ".ccg-global-search-trigger__scope",
    "grid-template-columns: 42px minmax(0, 1fr) auto",
    "width: min(1180px, calc(100% - 20px))"
].forEach((token) => requireText(searchCss, token, "Whole-site search presentation"));

[
    'const compactViewportQuery = window.matchMedia?.("(max-width: 1199px), (max-height: 700px)")',
    "if (state.scrolling) return true",
    'root.classList.toggle("ccg-perf-compact"',
    "bindCapabilityEvents()"
].forEach((token) => requireText(performanceJs, token, "Responsive performance runtime"));

[
    "html.ccg-perf-paused .home-hero__title",
    "html.ccg-perf-compact .ccg-bg-starfield",
    "html.ccg-perf-compact .home-visitor-callout__headline--interactive",
    "will-change: auto !important"
].forEach((token) => requireText(performanceCss, token, "Responsive performance stylesheet"));

[
    '<script src="js/ccg-nav-core.js" defer></script>',
    '<script src="resources/js/ccg-performance.js" defer></script>',
    'class="ccg-main ccg-main--home"'
].forEach((token) => requireText(home, token, "Home integration"));

balancedBraces(searchCss, "ccg-global-search.css");
balancedBraces(performanceCss, "ccg-performance-foundations.css");

requireJson("videos/video-index.json", (value) => Array.isArray(value.items), "Video search index");
requireJson("data/amiga-demo-music.json", Array.isArray, "Amiga demo music search index");
requireJson("data/retro-events.json", Array.isArray, "Retro events search index");

if (failures.length) {
    console.error("Home search and responsive performance audit failed:");
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exit(1);
}

console.log("Home search and responsive performance audit passed.");
console.log("- homepage search is promoted outside the desktop header grid");
console.log("- search covers the main site sections, videos, music and retro events");
console.log("- scroll pauses decorative effects and viewport capability classes resynchronise after resize");
