#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");
const publishersDir = path.join(repoRoot, "games", "publishers");
const checkOnly = process.argv.includes("--check");
const runtimeTag = '<script src="/js/ccg-publisher-history.js" defer></script>';
const anchorTag = '<script src="/js/publisher-pages.js" defer></script>';

function fail(message) {
    console.error(`[publisher-history-runtime] ${message}`);
    process.exit(1);
}

function publisherPages() {
    if (!fs.existsSync(publishersDir)) return [];
    return fs.readdirSync(publishersDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
            slug: entry.name,
            filePath: path.join(publishersDir, entry.name, "index.html")
        }))
        .filter((entry) => fs.existsSync(entry.filePath));
}

function main() {
    const pages = publisherPages();
    const missing = [];
    let changed = 0;

    for (const page of pages) {
        const html = fs.readFileSync(page.filePath, "utf8");
        if (html.includes(runtimeTag)) continue;

        if (checkOnly) {
            missing.push(page.slug);
            continue;
        }

        if (!html.includes(anchorTag)) {
            fail(`${path.relative(repoRoot, page.filePath)} is missing the publisher runtime anchor.`);
        }

        const next = html.replace(anchorTag, `${runtimeTag}\n${anchorTag}`);
        fs.writeFileSync(page.filePath, next, "utf8");
        changed += 1;
    }

    if (checkOnly && missing.length) {
        fail(`Publisher history runtime missing from ${missing.length} page(s): ${missing.slice(0, 12).join(", ")}${missing.length > 12 ? "…" : ""}`);
    }

    if (checkOnly) {
        console.log(`[publisher-history-runtime] Checked ${pages.length} publisher pages; runtime present on all pages.`);
    } else {
        console.log(`[publisher-history-runtime] Checked ${pages.length} publisher pages; updated ${changed}.`);
    }
}

main();
