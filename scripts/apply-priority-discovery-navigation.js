#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");

const integrationPath = path.join(repoRoot, "scripts", "integrate-year-platform-discovery.js");
const validationPath = path.join(repoRoot, "scripts", "validate-year-platform-discovery.js");

function fail(message) {
  console.error(`[priority-discovery-fix] ${message}`);
  process.exit(1);
}

function replaceExact(source, oldValue, newValue, label) {
  if (source.includes(newValue)) return source;
  if (!source.includes(oldValue)) fail(`${label} marker was not found.`);
  return source.replace(oldValue, newValue);
}

function writeIfChanged(filePath, content) {
  const current = fs.readFileSync(filePath, "utf8");
  if (current === content) return false;
  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

let integration = fs.readFileSync(integrationPath, "utf8");

const oldRender = `function renderBrowseShortcut() {
    return \`

                <div class="games-hero__stats" data-games-archive-shortcuts="true">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/years/">Browse by Year</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/platforms/">Browse by Platform</a>
                    <span>Explore the game archive through dedicated release-year and Commodore platform pages.</span>
                </div>\`;
}`;

const newRender = `function renderBrowseShortcut() {
    return \`

                <div class="games-hero__stats" data-games-archive-shortcuts="true">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/years/">Browse by Year</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/genres/">Browse by Genre</a>
                    <span>Explore the game archive through dedicated release-year pages and the complete genre library.</span>
                </div>\`;
}`;

integration = replaceExact(integration, oldRender, newRender, "Browse shortcut renderer");

const oldEnsure = `function ensureBrowseGamesShortcuts(html) {
    if (html.includes(BROWSE_MARKER)) {
        if (!html.includes('href="/games/years/"') || !html.includes('href="/games/platforms/"')) {
            fail("The Browse Games archive shortcut block is incomplete.");
        }
        return html;
    }

    const developerBlock = /(\\s*<div class="games-hero__stats" data-games-developers-shortcut="true">[\\s\\S]*?<\\/div>)/;
    const downloadsBlock = /(\\s*<div class="games-hero__stats" data-games-downloads-shortcut="true">[\\s\\S]*?<\\/div>)/;
    const anchor = html.match(developerBlock) || html.match(downloadsBlock);
    if (!anchor) fail("Could not locate a bounded Browse Games shortcut insertion point.");

    return html.replace(anchor[0], \`${"${anchor[0]}"}${"${renderBrowseShortcut()}"}\`);
}`;

const newEnsure = `function ensureBrowseGamesShortcuts(html) {
    const existingBlock = /\\s*<div class="games-hero__stats" data-games-archive-shortcuts="true">[\\s\\S]*?<\\/div>/;
    if (html.includes(BROWSE_MARKER)) {
        if (!existingBlock.test(html)) {
            fail("The Browse Games archive shortcut block could not be isolated.");
        }
        return html.replace(existingBlock, renderBrowseShortcut());
    }

    const developerBlock = /(\\s*<div class="games-hero__stats" data-games-developers-shortcut="true">[\\s\\S]*?<\\/div>)/;
    const downloadsBlock = /(\\s*<div class="games-hero__stats" data-games-downloads-shortcut="true">[\\s\\S]*?<\\/div>)/;
    const anchor = html.match(developerBlock) || html.match(downloadsBlock);
    if (!anchor) fail("Could not locate a bounded Browse Games shortcut insertion point.");

    return html.replace(anchor[0], \`${"${anchor[0]}"}${"${renderBrowseShortcut()}"}\`);
}`;

integration = replaceExact(integration, oldEnsure, newEnsure, "Browse shortcut integration");
integration = replaceExact(
  integration,
  "- Added bounded Browse Games links to `/games/years/` and `/games/platforms/`.",
  "- Added bounded Browse Games links to `/games/years/` and `/games/genres/`.",
  "Phase 4C report navigation copy"
);

let validation = fs.readFileSync(validationPath, "utf8");
validation = replaceExact(
  validation,
  'if (countAnchorHref(browseGames, "/games/platforms/") !== 1) problems.push("Browse Games must contain exactly one platform-hub link");',
  'if (countAnchorHref(browseGames, "/games/genres/") !== 1) problems.push("Browse Games must contain exactly one genre-hub link");',
  "Browse Games validation"
);
validation = replaceExact(
  validation,
  "- Browse Games contained one bounded year/platform discovery block.",
  "- Browse Games contained one bounded year/genre discovery block.",
  "Phase 4D report navigation copy"
);

const changed = [];
if (writeIfChanged(integrationPath, integration)) changed.push(path.relative(repoRoot, integrationPath));
if (writeIfChanged(validationPath, validation)) changed.push(path.relative(repoRoot, validationPath));

console.log(`[priority-discovery-fix] Updated ${changed.length} source file${changed.length === 1 ? "" : "s"}.`);
