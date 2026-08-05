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

const composerUtils = read("js/music-composer-utils.js");
const shell = read("js/ccg-music-shell.js");
const amigaIdentity = read("js/ccg-amiga-identity.js");
const mobileAlignment = read("resources/css/ccg-amiga-mobile-alignment.css");
const musicHub = read("music/index.html");
const composerHub = read("music/composers/index.html");

requireText(composerUtils, "/js/ccg-music-shell.js", "Music pages do not request the shared shell.");
requireText(shell, "CCG_MUSIC_SHELL_READY", "The music shell duplicate-load guard is missing.");
requireText(shell, "data-ccg-header", "The music shell does not inject the established public header.");
requireText(shell, "/js/ccg-nav-core.js", "The music shell does not load the unified navigation core.");
requireText(shell, "data-ccg-nav-drawer", "The music shell is missing the mobile navigation drawer.");
requireText(shell, "data-ccg-mode-toggle", "The music shell is missing the C64/Amiga mode control.");
requireText(shell, "bindDrawer(header)", "The injected mobile navigation drawer is not activated.");
requireText(shell, "bindMode(header)", "The injected C64/Amiga mode control is not activated.");
requireText(musicHub, "/js/music-composer-utils.js", "The Music Hub does not load the shared music shell entry point.");
requireText(composerHub, "/js/music-composer-utils.js", "The composer hub does not load the shared music shell entry point.");
requireText(amigaIdentity, "/resources/css/ccg-amiga-mobile-alignment.css", "The mobile alignment stylesheet is not loaded site-wide.");
requireText(mobileAlignment, "left: calc(50% + 3px)", "The mobile Amiga position is not explicitly aligned.");
requireText(mobileAlignment, "left: 4px", "The mobile C64 position is not explicitly aligned.");
requireText(mobileAlignment, "transform: none !important", "Legacy transform positioning can still displace the mobile mode thumb.");

if (problems.length) {
    console.error("Music navigation audit failed:");
    problems.forEach((problem) => console.error(` - ${problem}`));
    process.exit(1);
}

console.log("Music navigation and mobile mode audit passed.");
