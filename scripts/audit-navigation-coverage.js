#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
    const filePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(filePath)) {
        problems.push(`Missing required navigation file: ${relativePath}`);
        return "";
    }
    return fs.readFileSync(filePath, "utf8");
}

function requireText(source, expected, message) {
    if (!source.includes(expected)) problems.push(message);
}

const navCore = read("js/ccg-nav-core.js");
const navFit = read("js/ccg-nav-fit.js");
const auth = read("js/ccg-auth.js");
const publicAuth = read("js/ccg-public-header-auth.js");
const musicConfig = read("js/ccg-music-config.js");
const musicNavigation = read("js/ccg-music-navigation.js");
const navigationCss = read("resources/css/ccg-navigation-fit.css");

requireText(navCore, "/js/ccg-nav-fit.js", "The responsive navigation fit module is not loaded site-wide.");
requireText(navCore, "/js/ccg-public-header-auth.js", "The public profile bootstrap is not loaded site-wide.");
requireText(navFit, "ccg-nav-fit--compact", "Desktop compact navigation fallback is missing.");
requireText(navFit, "ccg-nav-fit--wrapped", "Desktop wrapped navigation fallback is missing.");
requireText(navFit, "Profile: ${raw}", "Profile labels are not made explicit in the shared navigation.");
requireText(navFit, "ccg-drawer-profile-link", "The mobile drawer profile link is missing.");
requireText(auth, "const profileLabel = 'Profile: ' + username", "Signed-in header identity does not include the Profile label.");
requireText(auth, "if (document.readyState === 'loading')", "Header auth cannot initialise after DOMContentLoaded.");
requireText(publicAuth, "/js/ccg-community-auth.js", "Public header auth does not load community profile state.");
requireText(publicAuth, "window.ccgCommunityAuth?.init?.()", "Dynamically loaded community auth is not activated.");
requireText(musicConfig, "/js/ccg-music-navigation.js", "Generated music pages do not request the shared navigation bootstrap.");
requireText(musicNavigation, "data-ccg-music-header", "Music navigation does not inject the established public header.");
requireText(musicNavigation, "/js/ccg-nav-core.js", "Music navigation does not load the shared navigation core.");
requireText(navigationCss, ".ccg-nav-fit--compact", "Compact desktop navigation styles are missing.");
requireText(navigationCss, ".ccg-nav-fit--wrapped", "Wrapped desktop navigation styles are missing.");
requireText(navigationCss, "left: calc(50% + 3px)", "The mobile Amiga mode thumb does not have an explicit aligned position.");
requireText(navigationCss, "left: 4px", "The mobile C64 mode thumb does not have an explicit aligned position.");

if (problems.length) {
    console.error("Navigation coverage audit failed:");
    problems.forEach((problem) => console.error(` - ${problem}`));
    process.exit(1);
}

console.log("Navigation coverage audit passed.");
