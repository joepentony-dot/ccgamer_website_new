#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const matcher = require("../js/ccg-zzap64-matcher.js");

const ROOT = path.resolve(__dirname, "..");
const REVIEW_INDEX_PATH = path.join(ROOT, "data", "zzap64-review-links.json");
const GAMES_PATH = path.join(ROOT, "games", "games.json");
const CACHE_DIR = path.join(ROOT, "data", "lemon-cache");
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const GAME_REVIEW_SCOPE = "game-review";
const OFFICIAL_HOST = "www.zzap64.co.uk";

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function extractMetaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, "i")
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return stripTags(match[1]);
  }
  return "";
}

function extractCanonical(html) {
  const patterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtml(match[1]).trim();
  }
  return "";
}

function extractTitle(html) {
  const ogTitle = extractMetaContent(html, "og:title");
  if (ogTitle) return ogTitle;
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!title) return "";
  return stripTags(title[1]).replace(/\s+-\s+(?:Commodore 64|Amiga).*$/i, "").trim();
}

function officialPageUrl(issue, page) {
  return `https://${OFFICIAL_HOST}/cgi-bin/displaypage.pl?issue=${issue}&page=${page}`;
}

function addZzapLink(links, issue, page) {
  const numericIssue = Number(issue);
  const numericPage = Number(page);
  if (!Number.isInteger(numericIssue) || numericIssue < 1) return;
  if (!Number.isInteger(numericPage) || numericPage < 1) return;
  const key = `${numericIssue}|${numericPage}`;
  if (links.some((item) => item.key === key)) return;
  links.push({
    key,
    issue: numericIssue,
    page: numericPage,
    url: officialPageUrl(numericIssue, numericPage)
  });
}

function extractZzapLinks(html) {
  const links = [];
  const hrefPattern = /href=["']([^"']*zzap64\.co\.uk\/cgi-bin\/displaypage\.pl\?[^"']+)["']/gi;
  let match;
  while ((match = hrefPattern.exec(String(html || "")))) {
    const href = decodeHtml(match[1]).replace(/^http:\/\//i, "https://");
    let parsed;
    try {
      parsed = new URL(href);
    } catch {
      continue;
    }
    addZzapLink(links, parsed.searchParams.get("issue"), parsed.searchParams.get("page"));
  }
  return links;
}

function issueDate(issue) {
  const numericIssue = Number(issue);
  if (!Number.isInteger(numericIssue) || numericIssue < 1) return null;
  const absoluteMonth = (1985 * 12 + 4) + (numericIssue - 1); // Issue 1 = May 1985.
  const year = Math.floor(absoluteMonth / 12);
  const monthIndex = absoluteMonth % 12;
  return { year, month: MONTHS[monthIndex] };
}

function systemFromLemonUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "lemon64.com") return "c64";
    if (host === "lemonamiga.com") return "amiga";
  } catch {}
  return "";
}

function normalizeExternalGameUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "lemon64.com" && host !== "lemonamiga.com") return "";
    const pathname = url.pathname.replace(/\/+$/g, "").toLowerCase();
    if (!pathname.startsWith("/game/")) return "";
    return `${host}${pathname}`;
  } catch {
    return "";
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function gameSystem(game) {
  return matcher.systemKey(game?.system || game?.platform) === "amiga" ? "amiga" : "c64";
}

function gameSlug(game) {
  return String(game?.slug || game?.id || "").trim().replace(/^\/+|\/+$/g, "");
}

function gameTitle(game) {
  return String(game?.title || game?.sorttitle || game?.name || gameSlug(game)).trim();
}

function directZzapRecords(game) {
  const raw = game?.zzap || game?.zzap64 || game?.zzapReviewUrl || game?.zzapReviewUrls;
  return toArray(raw).map((value) => {
    const candidate = value && typeof value === "object" ? value.url : value;
    try {
      const rawUrl = String(candidate || "").trim().replace(/^http:\/\//i, "https://");
      const url = new URL(rawUrl);
      const host = url.hostname.replace(/^www\./i, "").toLowerCase();
      const issue = Number(url.searchParams.get("issue"));
      const page = Number(url.searchParams.get("page"));
      if (url.protocol !== "https:" || host !== "zzap64.co.uk") return null;
      if (url.pathname.toLowerCase() !== "/cgi-bin/displaypage.pl") return null;
      if (!Number.isInteger(issue) || issue < 1 || !Number.isInteger(page) || page < 1) return null;
      return { issue, page, url: officialPageUrl(issue, page) };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function readGames() {
  const parsed = JSON.parse(fs.readFileSync(GAMES_PATH, "utf8"));
  return Array.isArray(parsed) ? parsed : (parsed.games || []);
}

function readReviewIndex() {
  const parsed = JSON.parse(fs.readFileSync(REVIEW_INDEX_PATH, "utf8"));
  if (!parsed || typeof parsed !== "object") throw new Error("Zzap review index is not an object.");
  if (!parsed.entries || typeof parsed.entries !== "object") parsed.entries = {};
  return parsed;
}

function readCachedPages() {
  if (!fs.existsSync(CACHE_DIR)) return [];
  const records = [];
  fs.readdirSync(CACHE_DIR)
    .filter((name) => name.endsWith(".html"))
    .sort()
    .forEach((name) => {
      const html = fs.readFileSync(path.join(CACHE_DIR, name), "utf8");
      const links = extractZzapLinks(html);
      if (!links.length) return;
      const lemonUrl = extractCanonical(html);
      const system = systemFromLemonUrl(lemonUrl);
      const title = extractTitle(html);
      if (!lemonUrl || !system || !title) return;
      records.push({
        title,
        system: system === "amiga" ? "Amiga" : "C64",
        systemKey: system,
        lemonUrl,
        lemonKey: normalizeExternalGameUrl(lemonUrl),
        links,
        cacheFile: name
      });
    });
  return records;
}

function buildLemonGameLookup(games) {
  const lookup = new Map();
  games.forEach((game) => {
    toArray(game?.lemon).forEach((value) => {
      const key = normalizeExternalGameUrl(value);
      if (key && !lookup.has(key)) lookup.set(key, game);
    });
  });
  return lookup;
}

function reviewRecordKey(game, issue) {
  const date = issueDate(issue);
  if (!date) return "";
  return [
    date.year,
    date.month.toLowerCase(),
    gameSystem(game),
    gameTitle(game)
  ].join("|");
}

function reviewIdentity(record) {
  return `${Number(record?.issue) || 0}|${Number(record?.page) || 0}`;
}

function addGameReview(entries, game, link, metadata = {}) {
  const key = reviewRecordKey(game, link.issue);
  if (!key) return false;
  const existing = entries[key];
  const slug = gameSlug(game);
  const title = gameTitle(game);
  const system = gameSystem(game);

  if (existing && reviewIdentity(existing) === reviewIdentity(link)) {
    entries[key] = {
      ...existing,
      ...(slug ? { gameSlug: slug } : {}),
      ...(title ? { gameTitle: title } : {}),
      gameSystem: system,
      ...(metadata.lemonUrl ? { lemonUrl: metadata.lemonUrl } : {})
    };
    return false;
  }

  if (existing) {
    // A title can theoretically have more than one review in one issue. Preserve both
    // while keeping the fourth key component as the exact game title for matching.
    const parts = key.split("|");
    let suffix = 2;
    let uniqueKey = `${parts[0]}|${parts[1]}-review-${suffix}|${parts[2]}|${parts.slice(3).join("|")}`;
    while (entries[uniqueKey]) {
      suffix += 1;
      uniqueKey = `${parts[0]}|${parts[1]}-review-${suffix}|${parts[2]}|${parts.slice(3).join("|")}`;
    }
    entries[uniqueKey] = {
      issue: Number(link.issue),
      page: Number(link.page),
      precision: "page",
      url: officialPageUrl(Number(link.issue), Number(link.page)),
      source: metadata.source || "cached-game-magazine-reference",
      scope: GAME_REVIEW_SCOPE,
      gameSlug: slug,
      gameTitle: title,
      gameSystem: system,
      ...(metadata.lemonUrl ? { lemonUrl: metadata.lemonUrl } : {})
    };
    return true;
  }

  entries[key] = {
    issue: Number(link.issue),
    page: Number(link.page),
    precision: "page",
    url: officialPageUrl(Number(link.issue), Number(link.page)),
    source: metadata.source || "cached-game-magazine-reference",
    scope: GAME_REVIEW_SCOPE,
    gameSlug: slug,
    gameTitle: title,
    gameSystem: system,
    ...(metadata.lemonUrl ? { lemonUrl: metadata.lemonUrl } : {})
  };
  return true;
}

function tagExistingRecordsByScan(entries, scanToGame) {
  let tagged = 0;
  Object.entries(entries).forEach(([key, record]) => {
    if (!record || record.scope === GAME_REVIEW_SCOPE) return;
    const system = String(key.split("|")[2] || "").toLowerCase();
    const scanKey = `${system}|${reviewIdentity(record)}`;
    const game = scanToGame.get(scanKey);
    if (!game) return;
    const slug = gameSlug(game);
    const title = gameTitle(game);
    if (!slug) return;
    record.gameSlug = slug;
    record.gameTitle = title;
    record.gameSystem = gameSystem(game);
    tagged += 1;
  });
  return tagged;
}

function stripPreviousGameReviewRows(output) {
  const entries = output.entries || {};
  Object.keys(entries).forEach((key) => {
    if (entries[key]?.scope === GAME_REVIEW_SCOPE) delete entries[key];
  });
  if (output.totals && typeof output.totals === "object") {
    delete output.totals.reviewRecords;
    delete output.totals.additionalReviewRecords;
    delete output.totals.gameReviewGames;
    delete output.totals.awardRecordsLinkedToGames;
    delete output.totals.unmatchedCachedReviewPages;
  }
  return output;
}

function enrich(output) {
  stripPreviousGameReviewRows(output);
  const games = readGames();
  const gameIndex = matcher.buildGameIndex(games);
  const lemonLookup = buildLemonGameLookup(games);
  const cachedPages = readCachedPages();
  const scanToGame = new Map();
  const linkedGameSlugs = new Set();
  let additional = 0;
  let matchedCachedPages = 0;
  let unmatchedCachedPages = 0;

  cachedPages.forEach((cached) => {
    const direct = cached.lemonKey ? lemonLookup.get(cached.lemonKey) : null;
    const game = direct || matcher.findGame({ title: cached.title, system: cached.system }, gameIndex);
    if (!game || !gameSlug(game)) {
      unmatchedCachedPages += 1;
      return;
    }
    matchedCachedPages += 1;
    linkedGameSlugs.add(gameSlug(game));
    cached.links.forEach((link) => {
      scanToGame.set(`${gameSystem(game)}|${reviewIdentity(link)}`, game);
      if (addGameReview(output.entries, game, link, {
        source: "cached-game-magazine-reference",
        lemonUrl: cached.lemonUrl
      })) additional += 1;
    });
  });

  games.forEach((game) => {
    directZzapRecords(game).forEach((link) => {
      scanToGame.set(`${gameSystem(game)}|${reviewIdentity(link)}`, game);
      linkedGameSlugs.add(gameSlug(game));
      if (addGameReview(output.entries, game, link, { source: "game-record-magazine-reference" })) additional += 1;
    });
  });

  const taggedAwards = tagExistingRecordsByScan(output.entries, scanToGame);
  const totalReviewRecords = Object.values(output.entries).filter((record) => (
    record?.precision === "page" && Number.isInteger(Number(record?.issue)) && Number.isInteger(Number(record?.page))
  )).length;

  output.version = Math.max(Number(output.version) || 0, 3);
  output.generatedFrom = "Verified Zzap!64 award review pages plus all direct Zzap!64 review references found on cached Lemon64/LemonAmiga game pages and explicit CCG game records.";
  output.totals = {
    ...(output.totals || {}),
    reviewRecords: totalReviewRecords,
    additionalReviewRecords: Object.values(output.entries).filter((record) => record?.scope === GAME_REVIEW_SCOPE).length,
    gameReviewGames: linkedGameSlugs.size,
    awardRecordsLinkedToGames: taggedAwards,
    unmatchedCachedReviewPages: unmatchedCachedPages
  };

  return {
    output,
    stats: {
      games: games.length,
      cachedPages: cachedPages.length,
      matchedCachedPages,
      unmatchedCachedPages,
      additional,
      linkedGames: linkedGameSlugs.size,
      taggedAwards,
      totalReviewRecords
    }
  };
}

function serialize(output) {
  return `${JSON.stringify(output, null, 2)}\n`;
}

function main() {
  const check = process.argv.includes("--check");
  const current = readReviewIndex();
  const { output, stats } = enrich(current);
  const next = serialize(output);

  if (check) {
    const onDisk = fs.readFileSync(REVIEW_INDEX_PATH, "utf8");
    if (onDisk !== next) {
      console.error("All-game Zzap!64 review data is out of date. Run: node scripts/enrich-zzap64-game-reviews.js");
      process.exit(1);
    }
    console.log(`All-game Zzap review index is current: ${stats.totalReviewRecords} review records across ${stats.linkedGames} CCG games.`);
    return;
  }

  fs.writeFileSync(REVIEW_INDEX_PATH, next, "utf8");
  console.log(
    `Enriched Zzap review index: ${stats.totalReviewRecords} direct review records across ${stats.linkedGames} CCG games; `
    + `${stats.taggedAwards} award records linked by exact scan; ${stats.unmatchedCachedPages} cached review pages unmatched.`
  );
}

if (require.main === module) main();

module.exports = {
  enrich,
  extractZzapLinks,
  issueDate,
  normalizeExternalGameUrl,
  reviewRecordKey
};
