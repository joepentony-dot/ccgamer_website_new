#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const gamesIndexPath = path.join(repoRoot, "games", "index.html");
const marker = 'data-games-developers-shortcut="true"';

function readRequired(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing required file: ${path.relative(repoRoot, filePath)}`);
    }
    return fs.readFileSync(filePath, "utf8");
}

function ensureDeveloperShortcut(html) {
    if (html.includes(marker)) return html;

    const downloadsBlock = /(\s*<div class="games-hero__stats" data-games-downloads-shortcut="true">[\s\S]*?<\/div>)/;
    const match = html.match(downloadsBlock);
    if (!match) {
        throw new Error("Could not locate the Browse Games downloads shortcut block.");
    }

    const shortcut = `

                <div class="games-hero__stats" data-games-developers-shortcut="true">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/developers/">Browse by Developer</a>
                    <span>Explore games through the developer credits already recorded in the CCG archive.</span>
                </div>`;

    return html.replace(downloadsBlock, `${match[1]}${shortcut}`);
}

function validate(html) {
    if (!html.includes(marker) || !html.includes('href="/games/developers/"')) {
        throw new Error("Browse Games developer shortcut validation failed.");
    }
}

function main() {
    const current = readRequired(gamesIndexPath);
    const next = ensureDeveloperShortcut(current);
    validate(next);

    if (current === next) {
        console.log("[developers-discovery] Browse Games developer shortcut is current.");
        return;
    }

    fs.writeFileSync(gamesIndexPath, next, "utf8");
    console.log("[developers-discovery] Added Browse Games developer shortcut.");
}

main();
