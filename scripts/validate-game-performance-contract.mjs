#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const GAMES_PATH = path.join(ROOT, "games", "games.json");
const THUMBNAIL_PREFIX = "resources/images/thumbnails/all/";
const THUMBNAIL_MAX_BYTES = 500 * 1024;
const BOX3D_MAX_BYTES = 500 * 1024;

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { base: "", requireGenerated: false, sharedOnly: false };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--base") {
      result.base = String(args[index + 1] || "").trim();
      index += 1;
    } else if (value === "--require-generated") {
      result.requireGenerated = true;
    } else if (value === "--shared-only") {
      result.sharedOnly = true;
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  return result;
}

function readText(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function readJson(relative) {
  return JSON.parse(readText(relative));
}

function previousGames(base) {
  if (!base) return null;
  try {
    const source = execFileSync(
      "git",
      ["show", `${base}:games/games.json`],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Unable to read games/games.json from ${base}: ${error.message}`);
  }
}

function openingTag(html, id) {
  const expression = new RegExp(`<(?:img|iframe)\\b[^>]*\\bid=["']${id}["'][^>]*>`, "i");
  return html.match(expression)?.[0] || "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\function hasAttribute(tag, name, expected) {
  const expression = expected == null
    ? new RegExp(`\\b${name}\\s*=`, "i")
    : new RegExp(`\\b${name}\\s*=\\s*["']${expected}["']`, "i");
  return expression.test(tag);
}
");
}

function getAttributeValue(tag, name) {
  const safe = escapeRegExp(name);
  const match = String(tag || "").match(new RegExp(`(?:^|\\s)${safe}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match ? match[1] : "";
}

function hasAttribute(tag, name, expected) {
  const safe = escapeRegExp(name);
  const expression = expected == null
    ? new RegExp(`(?:^|\\s)${safe}\\s*=`, "i")
    : new RegExp(`(?:^|\\s)${safe}\\s*=\\s*["']${escapeRegExp(expected)}["']`, "i");
  return expression.test(String(tag || ""));
}

function validateSharedOwners(errors) {
  const shell = readText("games/game.html");
  const video = openingTag(shell, "game-video-embed");
  if (!video) {
    errors.push("games/game.html: shared game video iframe is missing.");
  } else {
    if (!hasAttribute(video, "loading", "lazy")) {
      errors.push("games/game.html: game video iframe must retain loading=lazy.");
    }
    if (hasAttribute(video, "src")) {
      errors.push("games/game.html: game video iframe must not ship with an eager src.");
    }
    if (!hasAttribute(video, "width") || !hasAttribute(video, "height")) {
      errors.push("games/game.html: game video iframe must reserve width and height.");
    }
  }

  if (!shell.includes('id="game-video-facade"') || !shell.includes('id="game-video-poster"')) {
    errors.push("games/game.html: lightweight video facade shell is missing.");
  }

  const generator = readText("scripts/prepare-seo-game-routes.js");
  const requiredGeneratorTokens = [
    'loading="eager"',
    'decoding="async"',
    'fetchpriority="high"',
    'width="${Number(imageMetadata?.width || 300)}"',
    'height="${Number(imageMetadata?.height || 400)}"'
  ];
  for (const token of requiredGeneratorTokens) {
    if (!generator.includes(token)) {
      errors.push(`scripts/prepare-seo-game-routes.js: missing generated hero contract token ${token}`);
    }
  }

  const optimiser = readText("admin/js/content-publisher-image-optimizer.js");
  if (!/const TARGET_BYTES = 350 \* 1024;/.test(optimiser)) {
    errors.push("Content Publisher thumbnail target must remain 350 KB.");
  }
  if (!/const HARD_BYTES = 500 \* 1024;/.test(optimiser)) {
    errors.push("Content Publisher thumbnail hard limit must remain 500 KB.");
  }
  if (!/const BOX3D_HARD_BYTES = 500 \* 1024;/.test(optimiser)) {
    errors.push("Content Publisher 3D-box hard limit must remain 500 KB.");
  }

  const publisher = readText("admin/js/content-publisher.js");
  if (!/New game thumbnails must use WebP/.test(publisher)) {
    errors.push("Content Publisher must enforce WebP for newly published games.");
  }

  const rebuild = readText("scripts/rebuild-games.js");
  if (!rebuild.includes("validate-game-performance-contract.mjs")) {
    errors.push("Authoritative game rebuild must run the game performance contract.");
  }
}

function validateGeneratedPage(game, requireGenerated, errors) {
  const slug = String(game?.slug || "").trim();
  if (!slug) return;

  const relative = path.posix.join("games", slug, "index.html");
  const absolute = path.join(ROOT, relative);
  if (!fs.existsSync(absolute)) {
    if (requireGenerated) errors.push(`${relative}: canonical generated game page is missing.`);
    return;
  }

  const html = fs.readFileSync(absolute, "utf8");
  const hero = openingTag(html, "gameHeroThumb");
  if (!hero) {
    errors.push(`${relative}: generated hero image is missing.`);
  } else {
    if (!hasAttribute(hero, "loading", "eager")) errors.push(`${relative}: hero must load eagerly.`);
    if (!hasAttribute(hero, "decoding", "async")) errors.push(`${relative}: hero must decode asynchronously.`);
    if (!hasAttribute(hero, "fetchpriority", "high")) errors.push(`${relative}: hero must retain high fetch priority.`);
    if (!hasAttribute(hero, "width") || !hasAttribute(hero, "height")) {
      errors.push(`${relative}: hero must reserve intrinsic width and height.`);
    }
  }

  const video = openingTag(html, "game-video-embed");
  if (video) {
    if (!hasAttribute(video, "loading", "lazy")) errors.push(`${relative}: video iframe must remain lazy.`);
    const source = getAttributeValue(video, "src");
    const provider = getAttributeValue(video, "data-video-provider");
    if (source && !provider) errors.push(`${relative}: generated HTML must not eagerly load a video iframe src.`);
    if (!hasAttribute(video, "width") || !hasAttribute(video, "height")) {
      errors.push(`${relative}: video iframe must reserve width and height.`);
    }

    const deferredSource = getAttributeValue(video, "data-video-src");
    if (deferredSource) {
      if (!html.includes('id="game-video-facade"')) errors.push(`${relative}: deferred YouTube video is missing its play facade.`);
      if (!html.includes('id="game-video-poster"')) errors.push(`${relative}: deferred YouTube video is missing its poster image.`);
    }
  }

  if (!/load-single-game\.js["'][^>]*\bdefer\b/i.test(html)) {
    errors.push(`${relative}: shared single-game runtime must remain deferred.`);
  }
}

function validateNewGameAssets(game, errors) {
  const slug = String(game?.slug || "").trim();
  const title = String(game?.title || slug || "new game").trim();
  const thumbnail = String(game?.thumbnail || "").trim().replace(/^\//, "");

  if (!thumbnail.startsWith(THUMBNAIL_PREFIX)) {
    errors.push(`${title}: new-game thumbnail must live under ${THUMBNAIL_PREFIX}`);
    return;
  }
  if (!/\.webp$/i.test(thumbnail)) {
    errors.push(`${title}: new-game thumbnail must be WebP under the Lighthouse protocol.`);
    return;
  }

  const absoluteThumbnail = path.join(ROOT, thumbnail);
  if (!fs.existsSync(absoluteThumbnail)) {
    errors.push(`${title}: thumbnail file is missing at ${thumbnail}`);
  } else {
    const size = fs.statSync(absoluteThumbnail).size;
    if (size > THUMBNAIL_MAX_BYTES) {
      errors.push(`${title}: thumbnail is ${Math.ceil(size / 1024)} KB; hard limit is 500 KB.`);
    }
  }

  const boxPath = path.join(ROOT, "resources", "images", "games", "boxes-3d", `${slug}.webp`);
  if (slug && fs.existsSync(boxPath)) {
    const size = fs.statSync(boxPath).size;
    if (size > BOX3D_MAX_BYTES) {
      errors.push(`${title}: 3D box is ${Math.ceil(size / 1024)} KB; hard limit is 500 KB.`);
    }
  }
}

function main() {
  const args = parseArgs();
  const errors = [];
  validateSharedOwners(errors);

  const current = readJson("games/games.json");
  if (!Array.isArray(current)) throw new Error("games/games.json is not an array.");

  if (!args.sharedOnly) {
    for (const game of current) validateGeneratedPage(game, args.requireGenerated, errors);
  }

  const previous = previousGames(args.base);
  let newGames = [];
  if (previous) {
    const priorSlugs = new Set(previous.map((game) => String(game?.slug || "").trim()).filter(Boolean));
    newGames = current.filter((game) => {
      const slug = String(game?.slug || "").trim();
      return slug && !priorSlugs.has(slug);
    });
    for (const game of newGames) validateNewGameAssets(game, errors);
  }

  if (errors.length) {
    console.error("CCG Lighthouse game performance contract failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`CCG Lighthouse game performance contract passed: ${current.length} game records checked${args.base ? `, ${newGames.length} new game(s) checked against ${args.base}` : ""}.`);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
