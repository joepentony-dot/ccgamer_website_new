#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const targetPath = path.join(repoRoot, "js", "music-composer-pages.js");
const musicDir = path.join(repoRoot, "music");

function replaceBounded(text, startMarker, endMarker, replacement, label) {
    const start = text.indexOf(startMarker);
    const end = text.indexOf(endMarker, start + startMarker.length);
    if (start < 0 || end < 0 || end <= start) {
        throw new Error(`Could not locate bounded ${label} block.`);
    }
    return `${text.slice(0, start)}${replacement}${text.slice(end)}`;
}

// Generated pages are removed first so discovery only classifies hand-maintained composer pages as curated.
function removeGeneratedComposerPages() {
    let removed = 0;
    for (const entry of fs.readdirSync(musicDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name === "composers") continue;
        const filePath = path.join(musicDir, entry.name, "index.html");
        if (!fs.existsSync(filePath)) continue;
        const html = fs.readFileSync(filePath, "utf8");
        if (!html.includes('data-generated-composer="true"')) continue;
        fs.unlinkSync(filePath);
        const directory = path.dirname(filePath);
        if (!fs.readdirSync(directory).length) fs.rmdirSync(directory);
        removed += 1;
    }
    console.log(`[composer-routes] Removed ${removed} generated pages before deterministic rebuild.`);
}

function main() {
    removeGeneratedComposerPages();

    const current = fs.readFileSync(targetPath, "utf8");
    let next = current;

    if (!next.includes("  function toComposerList(value) {")) {
        const extraction = `  function toComposerList(value) {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      return [value];
    }
    return [];
  }

  function getComposerNamesFromGame(game) {
    if (!game || typeof game !== "object") {
      return [];
    }

    const credits = game.credits && typeof game.credits === "object" ? game.credits : null;
    const fromCredits = toComposerList(credits?.musician);
    const fromMusicBy = toComposerList(game.musicBy);
    const fromComposers = toComposerList(game.composers);
    const fromComposer = toComposerList(game.composer);
    const fromLegacyMusicNames = Array.isArray(game.music)
      ? game.music.filter((item) => typeof item === "string" && /[a-zA-Z]/.test(item) && !/\\.(mp3|ogg|wav|flac|sid|mod|xm|s3m)$/i.test(item))
      : [];

    return [...fromCredits, ...fromMusicBy, ...fromComposers, ...fromComposer, ...fromLegacyMusicNames]
      .map((name) => getCanonicalComposerName(name))
      .filter(Boolean);
  }

`;
        next = replaceBounded(
            next,
            "  function getComposerNamesFromGame(game) {",
            "  function buildComposerIndex(games) {",
            extraction,
            "composer extraction"
        );
    }

    if (!next.includes("knownComposer || allowDedicated || DEDICATED_COMPOSER_SLUGS.has(slug)")) {
        const routing = `  function getComposerUrl(composerOrSlug, composerName, options = {}) {
    const knownComposer = typeof composerOrSlug === "object" && composerOrSlug;
    const slug = knownComposer
      ? slugifyName(composerOrSlug.slug || composerOrSlug.name)
      : slugifyName(composerOrSlug);
    const name = knownComposer
      ? String(composerOrSlug.name || composerName || "").trim()
      : String(composerName || "").trim();
    const { allowDedicated = false } = options;
    const featuredUrl = getFeaturedComposerUrl(name || composerName || composerOrSlug || slug);

    if (featuredUrl) {
      return featuredUrl;
    }

    if (slug && (knownComposer || allowDedicated || DEDICATED_COMPOSER_SLUGS.has(slug))) {
      return \`\${resolveSiteRoot()}music/\${slug}/\`;
    }

    return getFallbackComposerUrl(name || composerName || composerOrSlug || slug);
  }

`;
        next = replaceBounded(
            next,
            "  function getComposerUrl(composerOrSlug, composerName, options = {}) {",
            "  function getComposerImageCandidates(slug) {",
            routing,
            "composer routing"
        );
    }

    if (next !== current) {
        fs.writeFileSync(targetPath, next, "utf8");
        console.log("[composer-routes] Enabled static routes for known composer records.");
    } else {
        console.log("[composer-routes] Static composer routing is already enabled.");
    }
}

main();
