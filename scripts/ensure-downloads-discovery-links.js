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

function ensureHomeDownloadsCard(html) {
    if (html.includes('data-home-downloads-card="true"')) return html;

    const fullIndexCard = /(<a href="games\/index\.html" class="ccg-card home-highlight-card">[\s\S]*?<h3 class="ccg-card__title">The Full A–Z Index<\/h3>[\s\S]*?<\/a>)/;
    const match = html.match(fullIndexCard);
    if (!match) {
        throw new Error("Could not locate the Full A–Z Index card in home.html.");
    }

    const downloadsCard = `

                    <a href="/games/downloads/" class="ccg-card home-highlight-card" data-home-downloads-card="true">
                        <div class="ccg-card__body">
                            <h3 class="ccg-card__title">Game Downloads A–Z</h3>
                            <p class="ccg-card__text">
                                Search the downloadable C64 and Amiga archive, open a letter and download a game directly.
                            </p>
                        </div>
                    </a>`;

    return html.replace(fullIndexCard, `${match[1]}${downloadsCard}`);
}

function ensureGamesIndexDownloadsShortcut(html) {
    if (html.includes('data-games-downloads-shortcut="true"')) return html;

    const statsBlock = /(<div class="games-hero__stats">\s*<strong id="gamesTotalCount">[\s\S]*?<strong id="gamesResultsCount">[\s\S]*?<\/div>)/;
    const match = html.match(statsBlock);
    if (!match) {
        throw new Error("Could not locate the Browse Games hero statistics block.");
    }

    const shortcut = `

                <div class="games-hero__stats" data-games-downloads-shortcut="true">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/downloads/">Game Downloads A–Z</a>
                    <span>Search and download games with files already available in the CCG archive.</span>
                </div>`;

    return html.replace(statsBlock, `${match[1]}${shortcut}`);
}

function validate(homeHtml, gamesIndexHtml) {
    const problems = [];

    if (!homeHtml.includes('href="/games/downloads/"') || !homeHtml.includes('data-home-downloads-card="true"')) {
        problems.push("homepage downloads highlight card missing");
    }

    if (!gamesIndexHtml.includes('href="/games/downloads/"') || !gamesIndexHtml.includes('data-games-downloads-shortcut="true"')) {
        problems.push("Browse Games downloads shortcut missing");
    }

    if (problems.length) {
        throw new Error(`Downloads discovery validation failed: ${problems.join("; ")}`);
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

    console.log(`[downloads-discovery] Homepage changed: ${homeChanged ? "yes" : "no"}`);
    console.log(`[downloads-discovery] Browse Games changed: ${gamesChanged ? "yes" : "no"}`);
}

main();
