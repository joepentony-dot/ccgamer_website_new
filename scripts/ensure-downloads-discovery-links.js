#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const homePath = path.join(repoRoot, "home.html");
const gamesIndexPath = path.join(repoRoot, "games", "index.html");

function readRequired(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing required file: ${path.relative(repoRoot, filePath)}`);
    }
    return fs.readFileSync(filePath, "utf8");
}

function writeIfChanged(filePath, nextContent) {
    const current = fs.readFileSync(filePath, "utf8");
    if (current === nextContent) return false;
    fs.writeFileSync(filePath, nextContent, "utf8");
    return true;
}

function hasStreamlinedHomeHierarchy(html) {
    return html.includes("home-explore-grid");
}

function renderHomeManualsCard() {
    return `<a href="/games/downloads/" class="ccg-card home-highlight-card" data-home-downloads-card="true">
                        <div class="ccg-card__body">
                            <h3 class="ccg-card__title">Game Manuals A–Z</h3>
                            <p class="ccg-card__text">
                                Browse PDF instruction manuals for C64 and Amiga games. Documentation only — no playable game files.
                            </p>
                        </div>
                    </a>`;
}

function ensureHomeDownloadsCard(html) {
    const existingCard = /<a href="\/games\/downloads\/" class="ccg-card home-highlight-card" data-home-downloads-card="true">[\s\S]*?<\/a>/;

    // The streamlined homepage intentionally keeps only three secondary routes.
    // Manuals remain discoverable from Browse Games, so remove any legacy
    // downloads/manuals card if an older build left one behind.
    if (hasStreamlinedHomeHierarchy(html)) {
        return html.replace(existingCard, "");
    }

    if (existingCard.test(html)) {
        return html.replace(existingCard, renderHomeManualsCard());
    }

    const fullIndexCard = /(<a href="games\/index\.html" class="ccg-card home-highlight-card">[\s\S]*?<h3 class="ccg-card__title">The Full A–Z Index<\/h3>[\s\S]*?<\/a>)/;
    const match = html.match(fullIndexCard);
    if (!match) {
        throw new Error("Could not locate the Full A–Z Index card in home.html.");
    }

    return html.replace(fullIndexCard, `${match[1]}\n\n                    ${renderHomeManualsCard()}`);
}

function renderGamesManualsShortcut() {
    return `<div class="games-hero__stats" data-games-downloads-shortcut="true">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/downloads/">Game Manuals A–Z</a>
                    <span>Browse PDF manuals and documentation. CCG no longer provides downloadable game media.</span>
                </div>`;
}

function ensureGamesIndexDownloadsShortcut(html) {
    const existingShortcut = /<div class="games-hero__stats" data-games-downloads-shortcut="true">[\s\S]*?<\/div>/;
    if (existingShortcut.test(html)) {
        return html.replace(existingShortcut, renderGamesManualsShortcut());
    }

    const statsBlock = /(<div class="games-hero__stats">\s*<strong id="gamesTotalCount">[\s\S]*?<strong id="gamesResultsCount">[\s\S]*?<\/div>)/;
    const match = html.match(statsBlock);
    if (!match) {
        throw new Error("Could not locate the Browse Games hero statistics block.");
    }

    return html.replace(statsBlock, `${match[1]}\n\n                ${renderGamesManualsShortcut()}`);
}

function validate(homeHtml, gamesIndexHtml) {
    const problems = [];
    const streamlinedHome = hasStreamlinedHomeHierarchy(homeHtml);

    if (!streamlinedHome && (!homeHtml.includes('href="/games/downloads/"') || !homeHtml.includes('data-home-downloads-card="true"'))) {
        problems.push("homepage manuals highlight card missing");
    }

    if (!gamesIndexHtml.includes('href="/games/downloads/"') || !gamesIndexHtml.includes('data-games-downloads-shortcut="true"')) {
        problems.push("Browse Games manuals shortcut missing");
    }
    if (!gamesIndexHtml.includes("Game Manuals A–Z")) {
        problems.push("Browse Games manuals shortcut still has legacy download wording");
    }
    if (/data-games-downloads-shortcut="true"[\s\S]{0,500}Download Game/i.test(gamesIndexHtml)) {
        problems.push("Browse Games still advertises playable game downloads");
    }

    if (problems.length) {
        throw new Error(`Manuals discovery validation failed: ${problems.join("; ")}`);
    }
}

function main() {
    const homeCurrent = readRequired(homePath);
    const gamesCurrent = readRequired(gamesIndexPath);

    const homeNext = ensureHomeDownloadsCard(homeCurrent);
    const gamesNext = ensureGamesIndexDownloadsShortcut(gamesCurrent);

    validate(homeNext, gamesNext);

    const homeChanged = writeIfChanged(homePath, homeNext);
    const gamesChanged = writeIfChanged(gamesIndexPath, gamesNext);

    console.log(`[manuals-discovery] Homepage changed: ${homeChanged ? "yes" : "no"}`);
    if (hasStreamlinedHomeHierarchy(homeNext)) {
        console.log("[manuals-discovery] Streamlined homepage detected; manuals remain discoverable from Browse Games.");
    }
    console.log(`[manuals-discovery] Browse Games changed: ${gamesChanged ? "yes" : "no"}`);
}

main();
