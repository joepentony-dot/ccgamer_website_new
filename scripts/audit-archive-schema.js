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
    for (const range of ["origin/main...HEAD", "HEAD^...HEAD"]) {
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

const moduleCode = read("js/ccg-archive-schema.js");
const navCore = read("js/ccg-nav-core.js");
const workflow = read(".github/workflows/ccg-archive-schema.yml");
const documentation = read("docs/seo-baseline/phase-15-archive-structured-data.md");

requireText(navCore, "/js/ccg-archive-schema.js", "Archive schema loader");
requireText(navCore, "data-ccg-archive-schema-loader", "Archive schema loader marker");

requireText(moduleCode, "CCG_ARCHIVE_SCHEMA_READY", "Archive schema guard");
requireText(moduleCode, '"@type": "CollectionPage"', "CollectionPage schema");
requireText(moduleCode, '"@type": "ItemList"', "ItemList schema");
requireText(moduleCode, '"@type": "BreadcrumbList"', "BreadcrumbList schema");
requireText(moduleCode, '"@type": "Quiz"', "Quiz schema");
requireText(moduleCode, "collectExistingTypes", "Duplicate-schema protection");
requireText(moduleCode, "MAX_LIST_ITEMS = 200", "Structured-list size limit");
requireText(moduleCode, "numberOfItems: items.length", "Full archive item count");
requireText(moduleCode, "/games/games.json", "Games archive fallback");
requireText(moduleCode, "cache: \"force-cache\"", "Archive data cache policy");
requireText(moduleCode, "MutationObserver", "Dynamic archive observation");
requireText(moduleCode, "collectGameLinks", "Visible game link collection");
requireText(moduleCode, "collectArchiveLinks", "Visible archive link collection");
requireText(moduleCode, "existingTypes.has(\"CollectionPage\")", "CollectionPage duplicate prevention");
requireText(moduleCode, "existingTypes.has(\"ItemList\")", "ItemList duplicate prevention");
requireText(moduleCode, "existingTypes.has(\"BreadcrumbList\")", "Breadcrumb duplicate prevention");

rejectText(moduleCode, "supabase", "Archive schema module");
rejectText(moduleCode, "localStorage", "Archive schema module");
rejectText(moduleCode, "sessionStorage", "Archive schema module");
rejectText(moduleCode, "user_badges", "Archive schema module");
rejectText(moduleCode, "profile_game_library", "Archive schema module");
rejectText(moduleCode, "fetch(\"http", "Archive schema module");

requireText(workflow, "node --check js/ccg-archive-schema.js", "Workflow syntax validation");
requireText(workflow, "node scripts/audit-archive-schema.js", "Workflow audit step");
requireText(documentation, "Phase 15", "Phase documentation");
requireText(documentation, "Schema.org", "Schema source documentation");

const protectedPaths = new Set([
    "index.html",
    "home.html",
    "resources/css/intro.css",
    "js/index-intro.js",
    "games/games.json"
]);

const allowedPaths = new Set([
    "js/ccg-nav-core.js",
    "js/ccg-archive-schema.js",
    "scripts/audit-archive-schema.js",
    ".github/workflows/ccg-archive-schema.yml",
    "docs/seo-baseline/phase-15-archive-structured-data.md"
]);

const shouldCheckScope = !process.env.GITHUB_ACTIONS || process.env.GITHUB_EVENT_NAME === "pull_request";
if (shouldCheckScope) {
    for (const changedPath of changedFiles()) {
        if (protectedPaths.has(changedPath)) failures.push(`Protected file changed: ${changedPath}`);
        if (!allowedPaths.has(changedPath)) failures.push(`Out-of-scope change: ${changedPath}`);
    }
}

if (failures.length) {
    console.error("Archive structured data audit failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log("Archive structured data audit passed.");
console.log("- CollectionPage, ItemList, BreadcrumbList and Quiz coverage present");
console.log("- Existing schema is detected before adaptive schema is added");
console.log("- Archive lists are bounded while full counts are retained");
console.log("- Member data and protected files remain outside scope");
