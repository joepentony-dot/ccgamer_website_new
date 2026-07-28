#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");
const DOWNLOAD_PAGE = "games/downloads/index.html";
const DEVELOPER_PREFIX = "games/developers/";

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

    const seen = new Set([""]);
    const next = [""];

    current.forEach((entry) => {
        if (typeof entry !== "string") return;
        const normalized = entry.trim();
        if (!normalized || normalized === DOWNLOAD_PAGE || seen.has(normalized)) return;
        seen.add(normalized);
        next.push(normalized);
    });

    const firstDeveloperIndex = next.findIndex((entry) => entry.startsWith(DEVELOPER_PREFIX));
    const insertionIndex = firstDeveloperIndex >= 0 ? firstDeveloperIndex : next.length;
    next.splice(insertionIndex, 0, DOWNLOAD_PAGE);

    const output = `${JSON.stringify(next, null, 2)}\n`;
    const previous = fs.readFileSync(staticPagesPath, "utf8");
    if (previous !== output) {
        fs.writeFileSync(staticPagesPath, output, "utf8");
    }

    console.log("[downloads-static-pages] Registered downloads before developer archive entries without disturbing other routes.");
}

main();
