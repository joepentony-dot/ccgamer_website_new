#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");
const DOWNLOAD_PAGE = "games/downloads/index.html";

function fail(message) {
    console.error(`[downloads-static-pages] ${message}`);
    process.exit(1);
}

function main() {
    if (!fs.existsSync(staticPagesPath)) {
        fail("Missing tools/seo/static-pages.json.");
    }

    let current;
    try {
        current = JSON.parse(fs.readFileSync(staticPagesPath, "utf8"));
    } catch (error) {
        fail(`Could not parse tools/seo/static-pages.json: ${error.message}`);
    }

    if (!Array.isArray(current)) {
        fail("tools/seo/static-pages.json must contain a top-level array.");
    }

    const seen = new Set();
    const next = [""];
    seen.add("");

    current.forEach((entry) => {
        if (typeof entry !== "string") return;
        const normalized = entry.trim();
        if (!normalized || normalized === DOWNLOAD_PAGE || seen.has(normalized)) return;
        seen.add(normalized);
        next.push(normalized);
    });

    next.push(DOWNLOAD_PAGE);
    fs.writeFileSync(staticPagesPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");

    console.log("[downloads-static-pages] Preserved the root entry and registered games/downloads/index.html.");
}

main();
