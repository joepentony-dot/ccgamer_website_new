#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = path.resolve(__dirname, "..");
const failures = [];

function read(relativePath) {
    const filePath = path.join(root, relativePath);
    if (!fs.existsSync(filePath)) {
        failures.push(`Missing required file: ${relativePath}`);
        return "";
    }
    return fs.readFileSync(filePath, "utf8");
}

function requireText(content, token, label) {
    if (!content.includes(token)) failures.push(`${label} is missing: ${token}`);
}

function rejectText(content, token, label) {
    if (content.toLowerCase().includes(token.toLowerCase())) {
        failures.push(`${label} must not contain: ${token}`);
    }
}

function changedFiles() {
    const ranges = ["origin/main...HEAD", "HEAD^...HEAD"];
    for (const range of ranges) {
        try {
            const output = childProcess.execFileSync(
                "git",
                ["diff", "--name-only", range],
                { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
            );
            const files = output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
            if (files.length) return files;
        } catch (error) {}
    }
    return [];
}

const moduleCode = read("js/ccg-smart-discovery.js");
const css = read("resources/css/ccg-smart-discovery.css");
const navCore = read("js/ccg-nav-core.js");
const workflow = read(".github/workflows/ccg-smart-game-discovery.yml");
const documentation = read("docs/seo-baseline/phase-14-smart-game-discovery.md");

requireText(navCore, "/js/ccg-smart-discovery.js", "Shared optional-module registration");
requireText(navCore, "data-ccg-smart-discovery-loader", "Smart discovery loader marker");

requireText(moduleCode, "CCG_SMART_DISCOVERY_READY", "Module guard");
requireText(moduleCode, "/games/games.json", "Archive data source");
requireText(moduleCode, "cache: \"force-cache\"", "Archive caching policy");
requireText(moduleCode, "#relatedGamesTrack", "Existing related carousel target");
requireText(moduleCode, ".game-section--related", "Existing related section target");
requireText(moduleCode, "Same Publisher", "Publisher matching");
requireText(moduleCode, "Same Developer", "Developer matching");
requireText(moduleCode, "Shared Credit", "Creator matching");
requireText(moduleCode, "Same CCG Collection", "Collection matching");
requireText(moduleCode, "Close Release Period", "Release-year matching");
requireText(moduleCode, "Other Platform Version", "Cross-platform matching");
requireText(moduleCode, "publisherCounts", "Publisher diversity cap");
requireText(moduleCode, "genreCounts", "Genre diversity cap");
requireText(moduleCode, "requestIdleCallback", "Idle scheduling");

rejectText(moduleCode, "localStorage", "Smart discovery module");
rejectText(moduleCode, "sessionStorage", "Smart discovery module");
rejectText(moduleCode, "supabase", "Smart discovery module");
rejectText(moduleCode, "goatcounter", "Smart discovery module");
rejectText(moduleCode, "fetch(\"http", "Smart discovery module");

requireText(css, ".ccg-smart-discovery__copy", "Smart discovery explanation styling");
requireText(css, ".related-card--smart", "Smart related-card styling");
requireText(workflow, "node --check js/ccg-smart-discovery.js", "Workflow syntax check");
requireText(workflow, "node scripts/audit-smart-game-discovery.js", "Workflow audit step");
requireText(documentation, "Phase 14", "Phase documentation");

const protectedPaths = new Set([
    "index.html",
    "home.html",
    "resources/css/intro.css",
    "js/index-intro.js",
    "games/games.json"
]);

const allowedPaths = new Set([
    "js/ccg-nav-core.js",
    "js/ccg-smart-discovery.js",
    "resources/css/ccg-smart-discovery.css",
    "scripts/audit-smart-game-discovery.js",
    ".github/workflows/ccg-smart-game-discovery.yml",
    "docs/seo-baseline/phase-14-smart-game-discovery.md"
]);

const shouldCheckScope = !process.env.GITHUB_ACTIONS || process.env.GITHUB_EVENT_NAME === "pull_request";
if (shouldCheckScope) {
    for (const changedPath of changedFiles()) {
        if (protectedPaths.has(changedPath)) failures.push(`Protected file changed: ${changedPath}`);
        if (!allowedPaths.has(changedPath)) failures.push(`Out-of-scope change: ${changedPath}`);
    }
}

if (failures.length) {
    console.error("Smart game discovery audit failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log("Smart game discovery audit passed.");
console.log("- Existing related carousel reused");
console.log("- Archive-only recommendation factors present");
console.log("- Publisher and genre diversity controls present");
console.log("- No account data, tracking or master-data edits");
