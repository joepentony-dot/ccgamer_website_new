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
    if (content.includes(token)) failures.push(`${label} must not contain: ${token}`);
}

function changedFiles() {
    const candidates = [
        "origin/main...HEAD",
        "HEAD^...HEAD"
    ];

    for (const range of candidates) {
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

const js = read("resources/js/ccg-performance.js");
const css = read("resources/css/ccg-performance-foundations.css");
const workflow = read(".github/workflows/ccg-performance-foundations.yml");
const documentation = read("docs/seo-baseline/phase-13-performance-foundations.md");

requireText(js, "CCG_PERFORMANCE_FOUNDATIONS_READY", "Performance JavaScript guard");
requireText(js, "/resources/css/ccg-performance-foundations.css", "Performance stylesheet loader");
requireText(js, "MutationObserver", "Dynamic-media normalisation");
requireText(js, "PerformanceObserver", "Performance measurement");
requireText(js, "loading\", \"lazy", "Below-fold image policy");
requireText(js, "loading\", \"eager", "Priority image policy");
requireText(js, "ccg:performance-snapshot", "Performance snapshot event");
rejectText(js, "window.requestAnimationFrame =", "Performance JavaScript");

requireText(css, "content-visibility: auto", "Rendering containment CSS");
requireText(css, "contain-intrinsic-size", "Layout reservation CSS");
requireText(css, "animation-play-state: paused", "Idle animation CSS");
requireText(css, "ccg-perf-save-data", "Reduced-data CSS");
requireText(css, "@media print", "Print fallback CSS");

requireText(workflow, "node --check resources/js/ccg-performance.js", "Performance workflow syntax check");
requireText(workflow, "node scripts/audit-performance-foundations.js", "Performance workflow audit step");
requireText(documentation, "Phase 13", "Performance documentation");

const representativeFiles = [
    "home.html",
    "games/index.html",
    "games/genres/index.html",
    "scripts/generate-publisher-pages.js",
    "scripts/generate-developer-pages.js"
];

for (const relativePath of representativeFiles) {
    const content = read(relativePath);
    requireText(content, "ccg-performance.js", `${relativePath} shared performance loader`);
}

const protectedPaths = new Set([
    "index.html",
    "home.html",
    "resources/css/intro.css",
    "js/index-intro.js",
    "games/games.json"
]);

const allowedPaths = new Set([
    "js/ccg-global.js",
    "resources/css/ccg-master.css",
    "resources/js/ccg-performance.js",
    "resources/css/ccg-performance-foundations.css",
    "scripts/audit-performance-foundations.js",
    ".github/workflows/ccg-performance-foundations.yml",
    "docs/seo-baseline/phase-13-performance-foundations.md"
]);

const shouldCheckScope = !process.env.GITHUB_ACTIONS || process.env.GITHUB_EVENT_NAME === "pull_request";
if (shouldCheckScope) {
    for (const changedPath of changedFiles()) {
        if (protectedPaths.has(changedPath)) {
            failures.push(`Protected file changed during Phase 13: ${changedPath}`);
        }
        if (!allowedPaths.has(changedPath)) {
            failures.push(`Out-of-scope Phase 13 change: ${changedPath}`);
        }
    }
}

if (failures.length) {
    console.error("Performance foundations audit failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log("Performance foundations audit passed.");
console.log("- Shared media loading policy present");
console.log("- Rendering containment present");
console.log("- Decorative animation pausing present");
console.log("- Performance measurement present");
console.log("- Protected project files unchanged");
