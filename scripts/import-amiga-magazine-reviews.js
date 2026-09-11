#!/usr/bin/env node

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { cleanRecord } = require("./build-magazine-review-chunks.js");

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

function exactTitleKey(value) {
  return stripTags(value).normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
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

function descriptionFromHtml(html) {
  const match = String(html).match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)
    || String(html).match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
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

  return cleanRecord({
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
  });
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

function creditValueHtml(html, label) {
  const escaped = String(label || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(new RegExp(`<td\\b[^>]*>\\s*${escaped}:\\s*<\\/td>\\s*<td\\b[^>]*>([\\s\\S]*?)<\\/td>`, "i"));
  return match?.[1] || "";
}

function releaseFromHtml(html) {
  const releasedHtml = creditValueHtml(html, "Released") || creditValueHtml(html, "Year") || creditValueHtml(html, "Release Year");
  const releasedText = stripTags(releasedHtml);
  const description = descriptionFromHtml(html);
  const descriptionMatch = description.match(/\breleased\s+in\s+((?:19|20)\d{2})\s+by\s+([^.!?]+)/i);
  const yearMatch = releasedText.match(/\b((?:19|20)\d{2})\b/) || descriptionMatch;
  const year = yearMatch ? Number(yearMatch[1]) : null;

  const publisherHtml = creditValueHtml(html, "Publisher");
  let publishers = [...publisherHtml.matchAll(/<a\b[^>]*href=["'][^"']*(?:list_company|list_publisher|publisher=)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);
  if (!publishers.length && publisherHtml) {
    const firstAnchor = publisherHtml.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i);
    const fallback = stripTags(firstAnchor?.[1] || publisherHtml.replace(/<span\b[\s\S]*$/i, ""));
    if (fallback) publishers = [fallback];
  }
  if (!publishers.length && descriptionMatch?.[2]) {
    publishers = [stripTags(descriptionMatch[2])].filter(Boolean);
  }

  const seen = new Set();
  publishers = publishers.filter((publisher) => {
    const key = publisherKey(publisher);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { year, publishers };
}

function publisherKey(value) {
  return stripTags(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null || value === "" ? [] : [value];
}

function gamePublishers(game) {
  const values = [
    ...toArray(game?.publisher),
    ...toArray(game?.credits?.publisher)
  ];
  const seen = new Set();
  return values.map(stripTags).filter((publisher) => {
    const key = publisherKey(publisher);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function gamePlatform(game) {
  const system = String(game?.system || "").toLowerCase();
  if (system.includes("amiga")) return "amiga";
  if (system.includes("c64") || system.includes("commodore 64")) return "c64";
  return "";
}

function releaseMatchesGame(game, release) {
  const gameYear = Number(game?.year);
  if (!Number.isInteger(gameYear) || !Number.isInteger(release?.year) || gameYear !== release.year) return false;
  const gamePublisherKeys = new Set(gamePublishers(game).map(publisherKey));
  const sourcePublisherKeys = toArray(release?.publishers).map(publisherKey).filter(Boolean);
  if (!gamePublisherKeys.size || !sourcePublisherKeys.length) return false;
  return sourcePublisherKeys.some((publisher) => gamePublisherKeys.has(publisher));
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
      return {
        cacheName: name,
        canonical: normalizedLemonUrl(canonical),
        platform,
        title: titleFromHtml(html),
        release: releaseFromHtml(html),
        reviews: reviewsFromHtml(html)
      };
    })
    .filter(Boolean);
}

function sourceIndex(pages) {
  return {
    byUrl: new Map(pages.map((page) => [page.canonical, page]).filter(([url]) => Boolean(url))),
    byCacheName: new Map(pages.map((page) => [page.cacheName, page]).filter(([name]) => Boolean(name)))
  };
}

function uniqueSourceCandidates(pages) {
  const candidates = new Map();
  pages.forEach((page) => {
    const key = page.canonical || page.cacheName;
    if (key && !candidates.has(key)) candidates.set(key, page);
  });
  return [...candidates.values()];
}

function sourcePageMatchesGame(game, page, platform = gamePlatform(game)) {
  const title = exactTitleKey(game?.title);
  return Boolean(
    page
    && platform
    && page.platform === platform
    && title
    && exactTitleKey(page.title) === title
    && releaseMatchesGame(game, page.release)
  );
}

function resolveSourcePage(game, pages, index = sourceIndex(pages)) {
  const platform = gamePlatform(game);
  if (!platform) return { page: null, resolution: "unsupported-platform", candidates: 0 };

  const lemonUrls = toArray(game?.lemon).map(normalizedLemonUrl).filter(Boolean);
  if (lemonUrls.length) {
    let page = lemonUrls.map((url) => index.byUrl.get(url)).find(Boolean);
    if (!page) page = lemonUrls.map((url) => index.byCacheName.get(cacheNameForUrl(url))).find(Boolean);
    if (!page) return { page: null, resolution: "manual-unresolved", candidates: 0 };
    if (sourcePageMatchesGame(game, page, platform)) return { page, resolution: "manual", candidates: 1 };
    return { page: null, resolution: "manual-mismatch", candidates: 1 };
  }

  const title = exactTitleKey(game?.title);
  if (!title) return { page: null, resolution: "unmatched", candidates: 0 };
  const candidates = uniqueSourceCandidates(pages.filter((page) => sourcePageMatchesGame(game, page, platform)));

  if (candidates.length === 1) return { page: candidates[0], resolution: "inferred", candidates: 1 };
  return {
    page: null,
    resolution: candidates.length > 1 ? "ambiguous" : "unmatched",
    candidates: candidates.length
  };
}

function uniqueReviews(rows) {
  const seen = new Set();
  return rows
    .map(stabilizeReviewUrl)
    .map(cleanRecord)
    .filter(Boolean)
    .filter((row) => {
      const key = [row.magazine, row.issue, row.date, row.page, row.score].join("|").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function stabilizeReviewUrl(row) {
  if (!row || row.magazine !== "ACE") return row;
  const issue = Number(row.issue);
  const page = Number(row.page);
  const date = String(row.date || "").match(/([A-Za-z]+)\s+(19\d{2})/);
  if (!Number.isInteger(issue) || issue < 1 || issue > 55 || !Number.isInteger(page) || page < 1 || !date) return row;
  const months = { january: "01", february: "02", march: "03", april: "04", may: "05", june: "06", july: "07", august: "08", september: "09", october: "10", november: "11", december: "12" };
  const month = months[date[1].toLowerCase()];
  if (!month) return row;
  const identifier = `ACE_Issue_${String(issue).padStart(2, "0")}_${date[2]}-${month}_Future_Publishing_GB`;
  return {
    ...row,
    url: `https://archive.org/details/${identifier}/page/n${page - 1}/mode/2up?view=theater`,
    scanStatus: "available"
  };
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
  const index = sourceIndex(pages);
  const catalogueGames = games.filter((game) => /amiga|c64/i.test(String(game.system || "")));
  const unmatched = [];
  const ambiguous = [];
  const withoutReviews = [];
  let importedGames = 0;
  let importedReviews = 0;

  catalogueGames.forEach((game) => {
    const platform = gamePlatform(game);
    const key = `${platform}:${game.slug}`;
    if (CACHE_IMPORT_EXCLUSIONS.has(key)) return;

    const resolved = resolveSourcePage(game, pages, index);
    const page = resolved.page;
    if (!page && resolved.resolution === "ambiguous" && !overrides.games?.[key]?.length) {
      ambiguous.push(`${game.slug}: ${game.title}`);
      return;
    }
    if (!page && !overrides.games?.[key]?.length) {
      unmatched.push(`${game.slug}: ${game.title}`);
      return;
    }
    if (!page && overrides.games?.[key]?.length) return;

    const reviews = uniqueReviews(page.reviews || []);
    if (!reviews.length && !overrides.games?.[key]?.length) {
      withoutReviews.push(`${game.slug}: ${game.title}`);
      return;
    }

    source.games[key] = uniqueReviews([...(source.games[key] || []), ...reviews]);
    importedGames += 1;
    importedReviews += reviews.length;
  });

  Object.entries(overrides.games || {}).forEach(([key, rows]) => {
    source.games[key] = uniqueReviews([...(source.games[key] || []), ...rows]);
  });

  source.description = "Verified magazine review metadata for CCG game pages, imported from locally cached reference pages. Store facts and outbound archive links only; do not copy review text.";
  writeRecords(source);
  return { totalGames: catalogueGames.length, importedGames, importedReviews, unmatched, ambiguous, withoutReviews };
}

function main() {
  const result = importReviews();
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) main();

module.exports = {
  exactTitleKey,
  gamePublishers,
  importReviews,
  parseReviewRow,
  releaseFromHtml,
  releaseMatchesGame,
  resolveSourcePage,
  reviewsFromHtml,
  scorePercent,
  sourcePageMatchesGame,
  stabilizeReviewUrl,
  uniqueReviews
};
