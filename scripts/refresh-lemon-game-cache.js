#!/usr/bin/env node

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { extractZzapLinks } = require("./generate-zzap64-review-links.js");

const ROOT = path.resolve(__dirname, "..");
const GAMES_PATH = path.join(ROOT, "games", "games.json");
const CACHE_DIR = path.join(ROOT, "data", "lemon-cache");
const USER_AGENT = "CheekyCommodoreGamer-ZzapArchive/1.0 (+https://www.cheekycommodoregamer.co.uk/)";
const REQUEST_DELAY_MS = 900;
const FETCH_TIMEOUT_MS = 15000;
const RETRIES = 3;
const ALLOWED_HOSTS = new Set(["lemon64.com", "lemonamiga.com"]);
let lastRequestAt = 0;

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function normalizeLemonGameUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (!ALLOWED_HOSTS.has(host)) return "";
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    const pathname = url.pathname.replace(/\/+$/g, "");
    if (!/^\/game\/[^/]+$/i.test(pathname)) return "";
    return `https://www.${host}${pathname}`;
  } catch {
    return "";
  }
}

function extractCanonical(html) {
  const source = String(html || "");
  const patterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) return String(match[1] || "").replace(/&amp;/gi, "&").trim();
  }
  return "";
}

function cacheFileName(url) {
  return `${crypto.createHash("sha1").update(String(url || "")).digest("hex")}.html`;
}

function gameIdentity(game, index) {
  return String(game?.slug || game?.id || game?.title || `game-${index}`).trim().toLowerCase();
}

function gameLemonUrls(game) {
  return [...new Set(toArray(game?.lemon)
    .map((value) => normalizeLemonGameUrl(value))
    .filter(Boolean))];
}

function gameUrlMap(games) {
  const map = new Map();
  (Array.isArray(games) ? games : []).forEach((game, index) => {
    map.set(gameIdentity(game, index), new Set(gameLemonUrls(game)));
  });
  return map;
}

function changedLemonUrls(previousGames, currentGames) {
  const previous = gameUrlMap(previousGames);
  const current = gameUrlMap(currentGames);
  const changed = new Set();

  current.forEach((urls, identity) => {
    const before = previous.get(identity) || new Set();
    urls.forEach((url) => {
      if (!before.has(url)) changed.add(url);
    });
  });

  return [...changed].sort();
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
    const text = execFileSync("git", ["show", `${requested}:games/games.json`], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return parseGames(text);
  } catch (error) {
    throw new Error(`Could not read games/games.json at ${requested}: ${error.message}`);
  }
}

function cachedUrlMap() {
  const map = new Map();
  if (!fs.existsSync(CACHE_DIR)) return map;

  fs.readdirSync(CACHE_DIR)
    .filter((name) => name.endsWith(".html"))
    .sort()
    .forEach((name) => {
      const filePath = path.join(CACHE_DIR, name);
      const html = fs.readFileSync(filePath, "utf8");
      const canonical = normalizeLemonGameUrl(extractCanonical(html));
      if (canonical && !map.has(canonical)) map.set(canonical, filePath);
    });

  return map;
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

function requestedBaseRef(args) {
  const index = args.indexOf("--base");
  if (index >= 0 && args[index + 1]) return args[index + 1];
  return "HEAD^";
}

function targetUrls(args, currentGames) {
  if (args.includes("--all-missing")) {
    return [...new Set(currentGames.flatMap(gameLemonUrls))].sort();
  }
  const previousGames = readGamesAtRef(requestedBaseRef(args));
  return changedLemonUrls(previousGames, currentGames);
}

async function refresh(urls, options = {}) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const existing = cachedUrlMap();
  const failures = [];
  let fetched = 0;
  let reused = 0;

  for (const url of urls) {
    if (!options.refreshAll && existing.has(url)) {
      reused += 1;
      console.log(`Lemon cache already present: ${url}`);
      continue;
    }

    try {
      console.log(`Fetching Lemon game page: ${url}`);
      const html = await fetchText(url);
      const canonical = normalizeLemonGameUrl(extractCanonical(html));
      const destination = existing.get(url)
        || (canonical ? existing.get(canonical) : "")
        || path.join(CACHE_DIR, cacheFileName(url));
      fs.writeFileSync(destination, html, "utf8");
      existing.set(url, destination);
      if (canonical) existing.set(canonical, destination);
      const reviews = extractZzapLinks(html);
      console.log(`Cached ${path.relative(ROOT, destination)} (${reviews.length} Zzap!64 review link${reviews.length === 1 ? "" : "s"}).`);
      fetched += 1;
    } catch (error) {
      failures.push(`${url}: ${error.message}`);
      console.error(`Failed to cache ${url}: ${error.message}`);
    }
  }

  if (failures.length) {
    throw new Error(`Unable to refresh ${failures.length} Lemon game page${failures.length === 1 ? "" : "s"}: ${failures.join(" | ")}`);
  }

  return { fetched, reused, total: urls.length };
}

function checkCoverage(urls) {
  const existing = cachedUrlMap();
  const missing = urls.filter((url) => !existing.has(url));
  if (missing.length) {
    throw new Error(`Missing Lemon cache coverage for: ${missing.join(", ")}`);
  }
  console.log(`Lemon cache coverage check passed for ${urls.length} changed URL${urls.length === 1 ? "" : "s"}.`);
}

async function main() {
  const args = process.argv.slice(2);
  const currentGames = readCurrentGames();
  const urls = targetUrls(args, currentGames);

  if (args.includes("--check")) {
    checkCoverage(urls);
    return;
  }

  if (!urls.length) {
    console.log("No new or changed Lemon game URLs require caching.");
    return;
  }

  const result = await refresh(urls, { refreshAll: args.includes("--refresh") });
  console.log(`Lemon cache refresh complete: ${result.fetched} fetched, ${result.reused} already cached, ${result.total} changed URL${result.total === 1 ? "" : "s"}.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = {
  cacheFileName,
  changedLemonUrls,
  extractCanonical,
  gameLemonUrls,
  normalizeLemonGameUrl,
  parseGames
};
