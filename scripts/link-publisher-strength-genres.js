#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const publishersDir = path.join(repoRoot, "games", "publishers");

const GENRES = Object.freeze([
  ["action-adventure", "/games/genres/action-adventure-games.html", ["action adventure", "action-adventure"]],
  ["role-playing", "/games/genres/role-playing-games.html", ["role playing", "role-playing", "rpg"]],
  ["shooting", "/games/genres/shooting-games.html", ["shooting", "shooters", "shooter", "shoot em up", "shoot 'em up", "shoot-em-up"]],
  ["racing", "/games/genres/racing-games.html", ["racing", "driving", "motorsport", "motor sport"]],
  ["platform", "/games/genres/platform-games.html", ["platform games", "platformers", "platformer"]],
  ["fighting", "/games/genres/fighting-games.html", ["fighting games", "fighting"]],
  ["adventure", "/games/genres/adventure-games.html", ["adventure games", "adventures", "adventure"]],
  ["arcade", "/games/genres/arcade-games.html", ["arcade games", "arcade"]],
  ["casino", "/games/genres/casino-games.html", ["casino games", "casino"]],
  ["horror", "/games/genres/horror-games.html", ["horror games", "horror"]],
  ["puzzle", "/games/genres/puzzle-games.html", ["puzzle games", "puzzles", "puzzle"]],
  ["quiz", "/games/genres/quiz-games.html", ["quiz games", "quiz"]],
  ["sports", "/games/genres/sports-games.html", ["sports games", "sports", "sport games"]],
  ["strategy", "/games/genres/strategy-games.html", ["strategy games", "strategy"]]
]);

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, " and ")
    .replace(/&/g, " and ")
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9'-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function genreForStrength(label) {
  const value = normalize(label);
  if (!value) return null;
  for (const [slug, url, aliases] of GENRES) {
    if (aliases.some((alias) => value.includes(alias))) return { slug, url };
  }
  return null;
}

function enhanceHtml(html) {
  return html.replace(
    /<li class="ccg-publisher-history__tag">(?!<a\b)([^<]+)<\/li>/gi,
    (match, label) => {
      const genre = genreForStrength(label);
      if (!genre) return match;
      return `<li class="ccg-publisher-history__tag"><a class="ccg-publisher-history__genre-link" href="${genre.url}" data-ccg-genre="${genre.slug}">${label}</a></li>`;
    }
  );
}

function main() {
  if (!fs.existsSync(publishersDir)) return;
  let checked = 0;
  let changed = 0;
  for (const entry of fs.readdirSync(publishersDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const filePath = path.join(publishersDir, entry.name, "index.html");
    if (!fs.existsSync(filePath)) continue;
    checked += 1;
    const original = fs.readFileSync(filePath, "utf8");
    const next = enhanceHtml(original);
    if (next !== original) {
      fs.writeFileSync(filePath, next, "utf8");
      changed += 1;
    }
  }
  console.log(`[publisher-strength-genres] Publisher pages checked: ${checked}`);
  console.log(`[publisher-strength-genres] Pages with canonical genre strength links: ${changed}`);
}

if (require.main === module) main();

module.exports = { GENRES, genreForStrength, enhanceHtml };
