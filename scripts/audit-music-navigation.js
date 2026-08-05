#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
    const filePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(filePath)) {
        problems.push(`Missing required file: ${relativePath}`);
        return "";
    }
    return fs.readFileSync(filePath, "utf8");
}

function requireText(source, expected, message) {
    if (!source.includes(expected)) problems.push(message);
}

const config = read("js/ccg-music-config.js");
const navigation = read("js/ccg-music-navigation.js");
const navCss = read("resources/css/ccg-nav-fit.css");
const musicHub = read("music/index.html");
const composerHub = read("music/composers/index.html");

requireText(config, "/js/ccg-music-navigation.js", "Music pages do not request the shared header bootstrap.");
requireText(navigation, "data-ccg-music-header", "The injected music header marker is missing.");
requireText(navigation, "/js/ccg-nav-core.js", "The music header does not load the unified navigation core.");
requireText(navigation, "function applyMode", "The late-loaded music header does not initialise its mode control.");
requireText(navigation, "function bindDrawer", "The late-loaded music header does not initialise its mobile drawer.");
requireText(navigation, "data-ccg-nav-drawer", "The music header is missing the mobile navigation drawer.");
requireText(navigation, "data-ccg-mode-toggle", "The music header is missing the C64/Amiga mode control.");
requireText(musicHub, "/js/ccg-music-config.js", "The Music Hub does not load the music configuration bootstrap.");
requireText(composerHub, "/js/ccg-music-config.js", "The composer hub does not load the music configuration bootstrap.");
requireText(navCss, "left: calc(50% + 3px)", "The mobile Amiga mode position is not explicitly aligned.");
requireText(navCss, "left: 4px", "The mobile C64 mode position is not explicitly aligned.");
requireText(navCss, "transform: none !important", "Legacy transform positioning can still displace the mobile mode thumb.");

if (problems.length) {
    console.error("Music navigation audit failed:");
    problems.forEach((problem) => console.error(` - ${problem}`));
    process.exit(1);
}

console.log("Music navigation and mobile mode audit passed.");
