#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
  FALLBACK_LIMIT,
  START_MARKER,
  END_MARKER,
  genreKeyFromFilename,
} = require("./prepare-seo-genre-links.js");

function readArg(argv, name, fallback) {
  const index = argv.indexOf(name);
  if (index === -1 || !argv[index + 1]) return fallback;
  return argv[index + 1];
}

function extractBlock(html) {
  const start = html.indexOf(START_MARKER);
  const end = html.indexOf(END_MARKER);
  if (start === -1 || end === -1 || end < start) return "";
  return html.slice(start, end + END_MARKER.length);
}

function run(options = {}) {
  const root = path.resolve(options.root || path.resolve(__dirname, ".."));
  const games = JSON.parse(fs.readFileSync(path.join(root, "games", "games.json"), "utf8"));
  const genresDir = path.join(root, "games", "genres");
  const errors = [];
  const knownSlugs = new Set(games.map((game) => String(game?.slug || "").trim()).filter(Boolean));
  const genreFiles = fs.readdirSync(genresDir)
    .filter((name) => name.endsWith(".html") && name !== "index.html")
    .sort();

  let pages = 0;
  let links = 0;

  for (const filename of genreFiles) {
    const filePath = path.join(genresDir, filename);
    const html = fs.readFileSync(filePath, "utf8");
    if (!/id=["']genreGamesGrid["']/i.test(html)) continue;
    pages += 1;

    const key = genreKeyFromFilename(filename);
    const expected = games
      .filter((game) => Array.isArray(game?.genres) && game.genres.includes(key))
      .map((game) => String(game?.slug || "").trim())
      .filter(Boolean)
      .slice(0, FALLBACK_LIMIT);

    const block = extractBlock(html);
    if (!block) {
      errors.push(`${filename}: static genre fallback block is missing.`);
      continue;
    }

    if (/game\.html\?id=/i.test(block)) {
      errors.push(`${filename}: fallback block contains a query-string game route.`);
    }

    const cardCount = (block.match(/data-ccg-static-genre-fallback=["']true["']/gi) || []).length;
    if (cardCount !== expected.length) {
      errors.push(`${filename}: expected ${expected.length} fallback cards, found ${cardCount}.`);
    }

    const hrefs = [...block.matchAll(/href=["']\/games\/([a-z0-9]+(?:-[a-z0-9]+)*)\/["']/gi)]
      .map((match) => match[1]);
    const uniqueSlugs = [...new Set(hrefs)];
    links += uniqueSlugs.length;

    if (uniqueSlugs.length !== expected.length) {
      errors.push(`${filename}: expected ${expected.length} unique canonical game links, found ${uniqueSlugs.length}.`);
    }

    for (const slug of uniqueSlugs) {
      if (!knownSlugs.has(slug)) errors.push(`${filename}: fallback links to unknown slug ${slug}.`);
      if (!expected.includes(slug)) errors.push(`${filename}: ${slug} is not in the expected ${key} fallback batch.`);
    }
    for (const slug of expected) {
      if (!uniqueSlugs.includes(slug)) errors.push(`${filename}: expected fallback link for ${slug} is missing.`);
    }
  }

  return { root, pages, links, errors };
}

function main(argv = process.argv.slice(2)) {
  const root = readArg(argv, "--root", path.resolve(__dirname, ".."));
  const result = run({ root });
  console.log(`[validate-seo-genre-links] Validation root: ${result.root}`);
  console.log(`[validate-seo-genre-links] Genre pages checked: ${result.pages}`);
  console.log(`[validate-seo-genre-links] Unique canonical fallback links checked: ${result.links}`);
  console.log(`[validate-seo-genre-links] Errors: ${result.errors.length}`);
  if (result.errors.length) {
    result.errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }
  console.log("[validate-seo-genre-links] PASS — genre pages expose deterministic crawlable game links.");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[validate-seo-genre-links] ${error.message}`);
    process.exit(1);
  }
}

module.exports = { run };
