#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const targetPath = path.join(repoRoot, "js", "music-composer-pages.js");

function replaceOnce(text, before, after, label) {
    if (text.includes(after)) return text;
    const occurrences = text.split(before).length - 1;
    if (occurrences !== 1) {
        throw new Error(`Expected one ${label} block, found ${occurrences}.`);
    }
    return text.replace(before, after);
}

function main() {
    const current = fs.readFileSync(targetPath, "utf8");
    let next = current;

    const oldExtraction = `  function getComposerNamesFromGame(game) {
    if (!game || typeof game !== "object") {
      return [];
    }

    const credits = game.credits && typeof game.credits === "object" ? game.credits : null;
    const fromCredits = credits && Array.isArray(credits.musician) ? credits.musician : [];
    const fromMusicBy = Array.isArray(game.musicBy) ? game.musicBy : [];
    const fromComposers = Array.isArray(game.composers) ? game.composers : [];
    const fromComposer = typeof game.composer === "string" ? [game.composer] : [];
    const fromLegacyMusicNames = Array.isArray(game.music)
      ? game.music.filter((item) => typeof item === "string" && /[a-zA-Z]/.test(item) && !/\.(mp3|ogg|wav|flac)$/i.test(item))
      : [];

    return [...fromCredits, ...fromMusicBy, ...fromComposers, ...fromComposer, ...fromLegacyMusicNames]
      .map((name) => getCanonicalComposerName(name))
      .filter(Boolean);
  }`;

    const newExtraction = `  function toComposerList(value) {
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
      ? game.music.filter((item) => typeof item === "string" && /[a-zA-Z]/.test(item) && !/\.(mp3|ogg|wav|flac|sid|mod|xm|s3m)$/i.test(item))
      : [];

    return [...fromCredits, ...fromMusicBy, ...fromComposers, ...fromComposer, ...fromLegacyMusicNames]
      .map((name) => getCanonicalComposerName(name))
      .filter(Boolean);
  }`;

    next = replaceOnce(next, oldExtraction, newExtraction, "composer extraction");

    const oldRouting = `  function getComposerUrl(composerOrSlug, composerName, options = {}) {
    const slug = typeof composerOrSlug === "object" && composerOrSlug
      ? slugifyName(composerOrSlug.slug || composerOrSlug.name)
      : slugifyName(composerOrSlug);
    const name = typeof composerOrSlug === "object" && composerOrSlug
      ? String(composerOrSlug.name || composerName || "").trim()
      : String(composerName || "").trim();
    const { allowDedicated = false } = options;
    const featuredUrl = getFeaturedComposerUrl(name || composerName || composerOrSlug || slug);

    if (featuredUrl) {
      return featuredUrl;
    }

    if (allowDedicated && slug && DEDICATED_COMPOSER_SLUGS.has(slug)) {
      return \`\${resolveSiteRoot()}music/\${slug}/\`;
    }

    return getFallbackComposerUrl(name || composerName || composerOrSlug || slug);
  }`;

    const newRouting = `  function getComposerUrl(composerOrSlug, composerName, options = {}) {
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
  }`;

    next = replaceOnce(next, oldRouting, newRouting, "composer routing");

    if (next !== current) {
        fs.writeFileSync(targetPath, next, "utf8");
        console.log("[composer-routes] Enabled static routes for known composer records.");
    } else {
        console.log("[composer-routes] Static composer routing is already enabled.");
    }
}

main();
