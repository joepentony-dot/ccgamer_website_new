#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const FALLBACK_LIMIT = 16;
const START_MARKER = "<!-- CCG STATIC GENRE FALLBACK START -->";
const END_MARKER = "<!-- CCG STATIC GENRE FALLBACK END -->";

function readArg(argv, name, fallback) {
  const index = argv.indexOf(name);
  if (index === -1 || !argv[index + 1]) return fallback;
  return argv[index + 1];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function genreKeyFromFilename(filename) {
  return path.basename(filename, ".html")
    .toLowerCase()
    .replace(/-games$/, "")
    .replace(/-indexed$/, "")
    .replace(/-collection$/, "")
    .replace(/^genre-/, "")
    .trim();
}

function thumbnailPath(game) {
  const raw = String(game?.thumbnail || game?.thumb || game?.cover || "").trim();
  if (!raw) return "/resources/images/thumbnails/all/1942.jpg";
  if (/^https?:\/\//i.test(raw)) return raw;
  const filename = path.basename(raw.replace(/\\/g, "/"));
  return `/resources/images/thumbnails/all/${filename}`;
}

function buildStaticCard(game) {
  const slug = String(game?.slug || "").trim();
  const title = escapeHtml(game?.title || "Unknown Game");
  const thumb = escapeHtml(thumbnailPath(game));
  const meta = [game?.year, game?.system, game?.developer]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");
  const url = `/games/${encodeURIComponent(slug)}/`;

  return `                    <div class="ccg-game-card genre-card ccg-game-card--fallback" data-ccg-static-genre-fallback="true">
                        <a href="${url}" class="ccg-game-card__thumb">
                            <img src="${thumb}" srcset="${thumb} 320w" sizes="(max-width: 720px) 48vw, 320px" alt="${title}" loading="lazy" decoding="async" width="320" height="180">
                        </a>
                        <div class="ccg-game-card__body">
                            <div class="game-title-wrapper">
                                <h3 class="ccg-game-card__title">${title}</h3>
                                <div class="ccg-game-card__meta">${meta}</div>
                            </div>
                            <div class="ccg-game-card__actions">
                                <a href="${url}" class="ccg-btn ccg-btn--primary ccg-game-card__btn" aria-label="View ${title}">View ${title}</a>
                            </div>
                        </div>
                    </div>`;
}

function buildFallbackBlock(games) {
  const cards = games.map(buildStaticCard).join("\n");
  return `${START_MARKER}\n${cards}\n                    ${END_MARKER}`;
}

function updateGenrePage(html, fallbackGames) {
  const block = buildFallbackBlock(fallbackGames);
  const existing = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`, "i");
  if (existing.test(html)) return html.replace(existing, block);

  const gridOpen = /(<div\b(?=[^>]*\bid=["']genreGamesGrid["'])[^>]*>)/i;
  if (!gridOpen.test(html)) return null;
  return html.replace(gridOpen, `$1\n                    ${block}`);
}

function writeIfChanged(filePath, content) {
  const previous = fs.readFileSync(filePath, "utf8");
  if (previous === content) return false;
  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

function run(options = {}) {
  const root = path.resolve(options.root || path.resolve(__dirname, ".."));
  const gamesPath = path.join(root, "games", "games.json");
  const genresDir = path.join(root, "games", "genres");
  const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
  if (!Array.isArray(games)) throw new Error("games/games.json must contain a top-level array.");

  const genreFiles = fs.readdirSync(genresDir)
    .filter((name) => name.endsWith(".html") && name !== "index.html")
    .sort();

  let changed = 0;
  let pages = 0;
  let linkedGames = 0;

  for (const filename of genreFiles) {
    const filePath = path.join(genresDir, filename);
    const html = fs.readFileSync(filePath, "utf8");
    if (!/id=["']genreGamesGrid["']/i.test(html)) continue;

    const key = genreKeyFromFilename(filename);
    const matches = games
      .filter((game) => Array.isArray(game?.genres) && game.genres.includes(key))
      .filter((game) => String(game?.slug || "").trim())
      .slice(0, FALLBACK_LIMIT);

    const updated = updateGenrePage(html, matches);
    if (updated === null) throw new Error(`${filename}: could not locate genreGamesGrid opening tag.`);
    if (writeIfChanged(filePath, updated)) changed += 1;
    pages += 1;
    linkedGames += matches.length;
  }

  return { root, pages, changed, linkedGames };
}

function main(argv = process.argv.slice(2)) {
  const root = readArg(argv, "--root", path.resolve(__dirname, ".."));
  const result = run({ root });
  console.log(`[prepare-seo-genre-links] Genre pages checked: ${result.pages}`);
  console.log(`[prepare-seo-genre-links] Genre pages written: ${result.changed}`);
  console.log(`[prepare-seo-genre-links] Static canonical links emitted: ${result.linkedGames}`);
  console.log(`[prepare-seo-genre-links] Root: ${result.root}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[prepare-seo-genre-links] ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  FALLBACK_LIMIT,
  START_MARKER,
  END_MARKER,
  genreKeyFromFilename,
  run,
};
