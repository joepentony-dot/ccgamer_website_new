#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  exactTitleKey,
  releaseFromHtml,
  releaseMatchesGame
} = require("./import-amiga-magazine-reviews.js");
const {
  cacheFileName,
  normalizeLemonGameUrl
} = require("./refresh-lemon-game-cache.js");

const ROOT = path.resolve(__dirname, "..");
const GAMES_PATH = path.join(ROOT, "games", "games.json");
const CACHE_DIR = path.join(ROOT, "data", "lemon-cache");
const USER_AGENT = "CheekyCommodoreGamer-MagazineSourceDiscovery/1.0 (+https://www.cheekycommodoregamer.co.uk/)";
const FETCH_TIMEOUT_MS = 12000;
const RETRIES = 2;
const REQUEST_DELAY_MS = 900;
let lastRequestAt = 0;

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null || value === "" ? [] : [value];
}

function parseGames(text) {
  const parsed = JSON.parse(String(text || "[]"));
  return Array.isArray(parsed) ? parsed : (parsed.games || []);
}

function readCurrentGames() {
  return parseGames(fs.readFileSync(GAMES_PATH, "utf8"));
}

function readGamesAtRef(ref) {
  const requested = String(ref || "").trim();
  if (!requested) return [];
  try {
    return parseGames(execFileSync("git", ["show", `${requested}:games/games.json`], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }));
  } catch (error) {
    throw new Error(`Could not read games/games.json at ${requested}: ${error.message}`);
  }
}

function gameIdentity(game) {
  return String(game?.slug || game?.id || game?.title || "").trim().toLowerCase();
}

function newlyAddedGames(previousGames, currentGames) {
  const previous = new Set((Array.isArray(previousGames) ? previousGames : []).map(gameIdentity).filter(Boolean));
  return (Array.isArray(currentGames) ? currentGames : []).filter((game) => {
    const identity = gameIdentity(game);
    return identity && !previous.has(identity);
  });
}

function lemonHostForGame(game) {
  const system = String(game?.system || "").trim().toUpperCase();
  if (system === "C64") return "lemon64.com";
  if (system === "AMIGA") return "lemonamiga.com";
  return "";
}

function hasManualLemonSource(game) {
  return toArray(game?.lemon).some((value) => Boolean(normalizeLemonGameUrl(value)));
}

function slugifyTitle(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function candidateUrlsForGame(game) {
  const host = lemonHostForGame(game);
  if (!host || hasManualLemonSource(game)) return [];

  const slugs = [
    String(game?.slug || "").trim().toLowerCase(),
    slugifyTitle(game?.title)
  ].filter((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value));

  return [...new Set(slugs)].map((slug) => `https://www.${host}/game/${slug}`);
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function titleFromHtml(html) {
  const source = String(html || "");
  const match = source.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)/i)
    || source.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i)
    || source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return stripTags(match?.[1] || "");
}

function canonicalFromHtml(html) {
  const source = String(html || "");
  const match = source.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)
    || source.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return normalizeLemonGameUrl(decodeHtml(match?.[1] || ""));
}

function sourceMatchesGame(game, html, expectedHost) {
  const title = titleFromHtml(html);
  if (!title || exactTitleKey(title) !== exactTitleKey(game?.title)) return false;

  const canonical = canonicalFromHtml(html);
  if (!canonical) return false;
  try {
    const host = new URL(canonical).hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== expectedHost) return false;
  } catch {
    return false;
  }

  return releaseMatchesGame(game, releaseFromHtml(html));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  let lastError = null;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < REQUEST_DELAY_MS) await sleep(REQUEST_DELAY_MS - elapsed);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      lastRequestAt = Date.now();
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-GB,en;q=0.9"
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      if (!html || html.length < 500) throw new Error("response was unexpectedly short");
      return html;
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await sleep(500 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error("request failed");
}

function cacheDestination(html, fallbackUrl) {
  const canonical = canonicalFromHtml(html) || normalizeLemonGameUrl(fallbackUrl);
  if (!canonical) return "";
  return path.join(CACHE_DIR, cacheFileName(canonical));
}

async function discoverGame(game) {
  const expectedHost = lemonHostForGame(game);
  const candidates = candidateUrlsForGame(game);
  if (!expectedHost || !candidates.length) return { status: "skipped", url: "" };

  for (const candidate of candidates) {
    try {
      console.log(`Trying verified Lemon source candidate for ${game.title}: ${candidate}`);
      const html = await fetchText(candidate);
      if (!sourceMatchesGame(game, html, expectedHost)) {
        console.log(`Rejected Lemon source candidate after title/release validation: ${candidate}`);
        continue;
      }

      const destination = cacheDestination(html, candidate);
      if (!destination) continue;
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(destination, html, "utf8");
      const canonical = canonicalFromHtml(html) || candidate;
      console.log(`Verified Lemon source cached for ${game.title}: ${canonical}`);
      return { status: "matched", url: canonical, destination };
    } catch (error) {
      console.log(`Lemon source candidate unavailable for ${game.title}: ${candidate} (${error.message})`);
    }
  }

  return { status: "unmatched", url: "" };
}

function requestedBaseRef(args) {
  const index = args.indexOf("--base");
  if (index >= 0 && args[index + 1]) return args[index + 1];
  return "HEAD^";
}

async function main() {
  const args = process.argv.slice(2);
  const currentGames = readCurrentGames();
  const previousGames = readGamesAtRef(requestedBaseRef(args));
  const added = newlyAddedGames(previousGames, currentGames);

  if (!added.length) {
    console.log("No newly added games require Lemon source discovery.");
    return;
  }

  let matched = 0;
  let unmatched = 0;
  let skipped = 0;

  for (const game of added) {
    const result = await discoverGame(game);
    if (result.status === "matched") matched += 1;
    else if (result.status === "unmatched") unmatched += 1;
    else skipped += 1;
  }

  console.log(`Lemon source discovery complete: ${matched} verified, ${unmatched} unmatched, ${skipped} skipped.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = {
  candidateUrlsForGame,
  canonicalFromHtml,
  gameIdentity,
  hasManualLemonSource,
  lemonHostForGame,
  newlyAddedGames,
  slugifyTitle,
  sourceMatchesGame,
  titleFromHtml
};
