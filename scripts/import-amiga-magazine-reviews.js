#!/usr/bin/env node

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, "data", "lemon-cache");
const GAMES_PATH = path.join(ROOT, "games", "games.json");
const RECORDS_PATH = path.join(ROOT, "data", "magazine-review-records");
const RECORD_CHUNKS = ["0-d", "e-h", "i-l", "m-p", "q-t", "u-z"];
const OVERRIDES_PATH = path.join(ROOT, "data", "magazine-review-overrides.json");
const CACHE_IMPORT_EXCLUSIONS = new Set([
  "amiga:arcade-pool" // The legacy Lemon ID resolves to the separate CD32 edition.
]);

const LANGUAGE_BY_FLAG = {
  DE: "German",
  DK: "Danish",
  ES: "Spanish",
  FI: "Finnish",
  FR: "French",
  IT: "Italian",
  NL: "Dutch",
  NO: "Norwegian",
  PL: "Polish",
  SE: "Swedish"
};

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

function normalTitle(value) {
  return stripTags(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalFromHtml(html) {
  const match = String(html).match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)
    || String(html).match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return decodeHtml(match?.[1] || "");
}

function titleFromHtml(html) {
  const match = String(html).match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)/i)
    || String(html).match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i);
  return stripTags(match?.[1] || "");
}

function normalizedLemonUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "lemonamiga.com" && host !== "lemon64.com") return "";
    return `https://www.${host}${url.pathname.replace(/\/+$/, "")}${url.search}`;
  } catch {
    return "";
  }
}

function cacheNameForUrl(value) {
  const url = normalizedLemonUrl(value);
  return url ? `${crypto.createHash("sha1").update(url).digest("hex")}.html` : "";
}

function scorePercent(score) {
  const value = String(score || "").trim();
  const percent = value.match(/^(\d+(?:\.\d+)?)%$/);
  if (percent) return Number(percent[1]);
  const fraction = value.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!fraction || Number(fraction[2]) <= 0) return null;
  return Math.round((Number(fraction[1]) / Number(fraction[2])) * 10000) / 100;
}

function monthDate(value) {
  const match = String(value || "").trim().match(/^([a-z]{3})\s+(\d{2}|\d{4})$/i);
  if (!match) return stripTags(value);
  const months = {
    jan: "January", feb: "February", mar: "March", apr: "April", may: "May", jun: "June",
    jul: "July", aug: "August", sep: "September", oct: "October", nov: "November", dec: "December"
  };
  const year = match[2].length === 2 ? `${Number(match[2]) >= 70 ? "19" : "20"}${match[2]}` : match[2];
  return `${months[match[1].toLowerCase()] || match[1]} ${year}`;
}

function parseReviewRow(row) {
  const rawUrl = decodeHtml((row.match(/<a[^>]+href=["']([^"']+)/i) || [])[1] || "");
  const url = /^http:\/\/(?:www\.)?(?:zzap64\.co\.uk|amr\.abime\.net|dmzarkivet\.se)\//i.test(rawUrl)
    ? rawUrl.replace(/^http:/i, "https:")
    : rawUrl;
  const magazine = stripTags((row.match(/<strong>([\s\S]*?)<\/strong>/i) || [])[1] || "");
  const score = stripTags((row.match(/magazine-rating[^>]*>([^<]+)/i) || [])[1] || "");
  const percent = scorePercent(score);
  if (!url || !magazine || /^Average magazine rating/i.test(magazine) || !score || percent === null || percent < 0 || percent > 100) return null;

  const anchorText = stripTags((row.match(/<a[^>]*>([\s\S]*?)<\/a>/i) || [])[1] || "");
  const issue = (anchorText.match(/\bNo\.\s*([^,(]+?)(?=\s*\(|,|$)/i) || [])[1]?.trim() || "";
  const date = monthDate((anchorText.match(/\(([^)]+)\)/) || [])[1] || "");
  const page = Number((anchorText.match(/,\s*p(\d+)/i) || [])[1]) || null;
  const info = stripTags((row.match(/<div[^>]*small-text[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "");
  const reviewer = info.replace(/^Review by\s+/i, "").replace(/\s*\(scan missing\)\s*$/i, "").trim();
  const flag = ((row.match(/class=["'][^"']*magazine-country-flag[^"']*["'][^>]*alt=["']([^"']+)/i)
    || row.match(/alt=["']([^"']+)["'][^>]*class=["'][^"']*magazine-country-flag/i) || [])[1] || "").toUpperCase();
  const missing = /scan missing/i.test(row);

  return {
    magazine,
    issue,
    date,
    page,
    reviewer: /^No info available$/i.test(reviewer) ? "" : reviewer,
    score,
    scorePercent: percent,
    url: missing ? "" : url,
    language: LANGUAGE_BY_FLAG[flag] || "English",
    scanStatus: missing ? "missing" : "available",
    era: /Amiga Addict/i.test(magazine) && /202\d/.test(date) ? "retrospective" : "contemporary"
  };
}

function reviewsFromHtml(html) {
  const source = String(html || "");
  const start = source.search(/Magazine Reviews/i);
  if (start < 0) return [];
  const tail = source.slice(start);
  const end = tail.search(/YouTube Links/i);
  const section = end >= 0 ? tail.slice(0, end) : tail;
  return [...section.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => parseReviewRow(match[1]))
    .filter(Boolean);
}

function cachePages() {
  return fs.readdirSync(CACHE_DIR)
    .filter((name) => name.endsWith(".html"))
    .map((name) => {
      const html = fs.readFileSync(path.join(CACHE_DIR, name), "utf8");
      const canonical = canonicalFromHtml(html);
      const platform = /https:\/\/www\.lemonamiga\.com\/game\//i.test(canonical)
        ? "amiga"
        : (/https:\/\/www\.lemon64\.com\/game\//i.test(canonical) ? "c64" : "");
      if (!platform) return null;
      return { cacheName: name, canonical: normalizedLemonUrl(canonical), platform, title: titleFromHtml(html), reviews: reviewsFromHtml(html) };
    })
    .filter(Boolean);
}

function uniqueReviews(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = [row.magazine, row.issue, row.date, row.page, row.score].join("|").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function recordChunkName(key) {
  const slug = String(key || "").split(":")[1] || "";
  const first = slug.charAt(0).toLowerCase();
  if (/\d/.test(first) || first < "e") return "0-d";
  if (first < "i") return "e-h";
  if (first < "m") return "i-l";
  if (first < "q") return "m-p";
  if (first < "u") return "q-t";
  return "u-z";
}

function readRecords() {
  const games = {};
  RECORD_CHUNKS.forEach((name) => {
    const parsed = JSON.parse(fs.readFileSync(path.join(RECORDS_PATH, `${name}.json`), "utf8"));
    Object.assign(games, parsed.games || {});
  });
  return { version: 1, games };
}

function writeRecords(source) {
  const chunks = Object.fromEntries(RECORD_CHUNKS.map((name) => [name, {}]));
  Object.entries(source.games || {}).forEach(([key, rows]) => {
    chunks[recordChunkName(key)][key] = rows;
  });
  RECORD_CHUNKS.forEach((name) => {
    fs.writeFileSync(path.join(RECORDS_PATH, `${name}.json`), `${JSON.stringify({ version: 1, games: chunks[name] })}\n`, "utf8");
  });
}

function importReviews() {
  const games = JSON.parse(fs.readFileSync(GAMES_PATH, "utf8"));
  const source = readRecords();
  const overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"));
  const pages = cachePages();
  const byUrl = new Map(pages.map((page) => [page.canonical, page]));
  const byCacheName = new Map(pages.map((page) => [page.cacheName, page]));
  const catalogueGames = games.filter((game) => /amiga|c64/i.test(String(game.system || "")));
  const unmatched = [];
  const withoutReviews = [];
  let importedGames = 0;
  let importedReviews = 0;

  catalogueGames.forEach((game) => {
    const platform = String(game.system || "").toLowerCase().includes("amiga") ? "amiga" : "c64";
    const key = `${platform}:${game.slug}`;
    if (CACHE_IMPORT_EXCLUSIONS.has(key)) return;
    const lemonUrls = (Array.isArray(game.lemon) ? game.lemon : [game.lemon]).map(normalizedLemonUrl).filter(Boolean);
    let page = lemonUrls.map((url) => byUrl.get(url)).find(Boolean);
    if (!page) page = lemonUrls.map((url) => byCacheName.get(cacheNameForUrl(url))).find(Boolean);
    if (page?.platform !== platform) page = null;
    if (!page && !overrides.games?.[key]?.length) {
      unmatched.push(`${game.slug}: ${game.title}`);
      return;
    }
    if (!page && overrides.games?.[key]?.length) return;
    if (!page.reviews.length && !overrides.games?.[key]?.length) {
      withoutReviews.push(`${game.slug}: ${game.title}`);
      return;
    }

    source.games[key] = uniqueReviews([...(source.games[key] || []), ...page.reviews]);
    importedGames += 1;
    importedReviews += page.reviews.length;
  });

  Object.entries(overrides.games || {}).forEach(([key, rows]) => {
    source.games[key] = uniqueReviews([...(source.games[key] || []), ...rows]);
  });

  source.description = "Verified magazine review metadata for CCG game pages, imported from locally cached reference pages. Store facts and outbound archive links only; do not copy review text.";
  writeRecords(source);
  return { totalGames: catalogueGames.length, importedGames, importedReviews, unmatched, withoutReviews };
}

function main() {
  const result = importReviews();
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) main();

module.exports = { importReviews, parseReviewRow, reviewsFromHtml, scorePercent };
