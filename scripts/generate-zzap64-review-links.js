#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const matcher = require("../js/ccg-zzap64-matcher.js");

const ROOT = path.resolve(__dirname, "..");
const AWARDS_DIR = path.join(ROOT, "data", "zzap64-awards");
const CACHE_DIR = path.join(ROOT, "data", "lemon-cache");
const OUTPUT_PATH = path.join(ROOT, "data", "zzap64-review-links.json");
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const LEMON_ORIGINS = Object.freeze({
  c64: "https://www.lemon64.com",
  amiga: "https://www.lemonamiga.com"
});
const USER_AGENT = "CheekyCommodoreGamer-ZzapArchive/1.0 (+https://www.cheekycommodoregamer.co.uk/)";
const REQUEST_DELAY_MS = 900;
const FETCH_TIMEOUT_MS = 15000;
const MAX_LIVE_CANDIDATES = 8;
const LEMON_SEARCH_ALIASES = Object.freeze({
  "Graphic Adventure Creator": ["GAC"],
  "Shoot 'Em Up Construction Kit": ["SEUCK", "Shoot Em Up Construction Kit"],
  "R.I.S.K.": ["Risk"],
  "B-24 Flight Simulator": ["B24 Flight Simulator"],
  "Kikstart II": ["Kikstart 2"],
  "World Class Leaderboard": ["World Class Leader Board"],
  "APB": ["A.P.B."],
  "F-16 Combat Pilot": ["F16 Combat Pilot"],
  "Computer Scrabble Deluxe": ["Scrabble Deluxe"],
  "The Sentinel": ["Sentinel"],
  "Batman: The Movie": ["Batman The Movie", "Batman"],
  "R-Type": ["R Type"],
  "Rambo": ["Rambo: First Blood Part II", "Rambo First Blood Part 2"],
  "Ultima IV": ["Ultima 4"],
  "Doomdark's Revenge": ["Doomdarks Revenge"],
  "Hunter's Moon": ["Hunters Moon"]
});

const requestCache = new Map();
const searchCache = new Map();
let lastRequestAt = 0;

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

function normalizeLemonTitle(value) {
  const title = String(value || "").trim();
  const trailingArticle = title.match(/^(.+),\s*(The|A|An)$/i);
  if (!trailingArticle) return title;
  return `${trailingArticle[2]} ${trailingArticle[1]}`.trim();
}

function normalizeSearchTitle(value) {
  return normalizeLemonTitle(String(value || "").replace(/\s+\([^)]*\)\s*$/g, "").trim());
}

function awardYears() {
  return fs.readdirSync(AWARDS_DIR)
    .map((name) => name.match(/^(\d{4})\.json$/))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .filter((year) => Number.isInteger(year) && year >= 1985)
    .sort((a, b) => a - b);
}

function issueNumber(year, month) {
  const monthIndex = MONTHS.findIndex((name) => name.toLowerCase() === String(month || "").trim().toLowerCase());
  if (monthIndex < 0) return null;
  const issue = ((Number(year) - 1985) * 12) + monthIndex - 3;
  return issue >= 1 ? issue : null;
}

function systemKey(value) {
  return matcher.systemKey(value) === "amiga" ? "amiga" : "c64";
}

function recordKey(entry) {
  return [
    Number(entry.year),
    String(entry.month || "").trim().toLowerCase(),
    systemKey(entry.system),
    String(entry.title || "").trim()
  ].join("|");
}

function officialIssueUrl(issue) {
  return `https://www.zzap64.co.uk/zzap${issue}/zzap${issue}.html`;
}

function officialPageUrl(issue, page) {
  return `https://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=${issue}&page=${page}`;
}

function readAwards() {
  const entries = [];
  awardYears().forEach((year) => {
    const sourcePath = path.join(AWARDS_DIR, `${year}.json`);
    const parsed = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    const records = Array.isArray(parsed) ? parsed : (parsed.entries || parsed.awards || []);
    records.forEach((raw) => {
      const entry = Array.isArray(raw)
        ? { year, month: raw[0], title: raw[1], system: raw[4] || "C64" }
        : {
            year: Number(raw.year || year),
            month: raw.month,
            title: raw.title || raw.game,
            system: raw.system || raw.platform || "C64"
          };
      if (entry.year && entry.month && entry.title && entry.system) entries.push(entry);
    });
  });
  return entries;
}

function readExistingOutput() {
  if (!fs.existsSync(OUTPUT_PATH)) return { entries: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : { entries: {} };
  } catch {
    return { entries: {} };
  }
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
  if (ogTitle) return normalizeLemonTitle(ogTitle);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return normalizeLemonTitle(stripTags(h1[1]));
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!title) return "";
  return normalizeLemonTitle(stripTags(title[1]).replace(/\s+-\s+(?:Commodore 64|Amiga).*$/i, "").trim());
}

function canonicalGameSlug(canonical) {
  try {
    const parsed = new URL(canonical);
    const match = parsed.pathname.match(/\/game\/([^/?#]+)/i);
    return match ? decodeURIComponent(match[1]).trim() : "";
  } catch {
    return "";
  }
}

function addZzapLink(links, issue, page, source = "magazine-reference") {
  const numericIssue = Number(issue);
  const numericPage = Number(page);
  if (!Number.isInteger(numericIssue) || numericIssue < 1 || !Number.isInteger(numericPage) || numericPage < 1) return;
  const key = `${numericIssue}|${numericPage}`;
  if (links.some((item) => item.key === key)) return;
  links.push({ key, issue: numericIssue, page: numericPage, url: officialPageUrl(numericIssue, numericPage), source });
}

function extractZzapLinks(html) {
  const links = [];
  const hrefPattern = /href=["']([^"']*zzap64\.co\.uk\/cgi-bin\/displaypage\.pl\?[^"']+)["']/gi;
  let match;
  while ((match = hrefPattern.exec(html))) {
    const href = decodeHtml(match[1]).replace(/^http:\/\//i, "https://");
    let parsed;
    try {
      parsed = new URL(href);
    } catch {
      continue;
    }
    addZzapLink(links, parsed.searchParams.get("issue"), parsed.searchParams.get("page"), "official-link");
  }

  const rows = String(html || "").match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
  rows.forEach((row) => {
    const text = stripTags(row);
    if (!/\bZzap(?:!64)?\b/i.test(text) || /\bZzap\s+Amiga\b/i.test(text)) return;
    const issueMatch = text.match(/\bZzap(?:!64)?\s+(?:No\.?\s*)?(\d+)\b/i);
    const pageMatch = text.match(/(?:^|[,;\s])p(?:age)?\.?\s*(\d+)\b/i);
    if (!issueMatch || !pageMatch) return;
    addZzapLink(links, issueMatch[1], pageMatch[1], "magazine-row");
  });

  return links;
}

function readCachedMagazinePages() {
  const bySystem = { c64: [], amiga: [] };
  if (!fs.existsSync(CACHE_DIR)) return bySystem;

  fs.readdirSync(CACHE_DIR)
    .filter((name) => name.endsWith(".html"))
    .sort()
    .forEach((name) => {
      const filePath = path.join(CACHE_DIR, name);
      const html = fs.readFileSync(filePath, "utf8");
      const zzapLinks = extractZzapLinks(html);
      if (!zzapLinks.length) return;

      const title = extractTitle(html);
      const canonical = extractCanonical(html);
      if (!title || !canonical) return;

      let system = "";
      if (/lemon64\.com/i.test(canonical)) system = "c64";
      else if (/lemonamiga\.com/i.test(canonical)) system = "amiga";
      if (!system) return;

      bySystem[system].push({
        title,
        slug: canonicalGameSlug(canonical),
        system: system === "amiga" ? "AMIGA" : "C64",
        zzapLinks,
        lemonUrl: canonical,
        source: `data/lemon-cache/${name}`
      });
    });

  return bySystem;
}

function persistedExact(existing, entry, issue) {
  const record = existing?.entries?.[recordKey(entry)];
  if (
    record?.precision !== "page"
    || Number(record.issue) !== Number(issue)
    || !Number.isInteger(Number(record.page))
    || Number(record.page) < 1
  ) return null;

  return {
    issue: Number(issue),
    page: Number(record.page),
    precision: "page",
    url: officialPageUrl(issue, Number(record.page)),
    source: String(record.source || "persisted-verified-reference"),
    ...(record.lemonUrl ? { lemonUrl: String(record.lemonUrl) } : {})
  };
}

function recalculateTotals(output) {
  const records = Object.values(output.entries || {});
  const exactPages = records.filter((record) => record?.precision === "page").length;
  const issueFallbacks = records.length - exactPages;
  output.totals = {
    awards: records.length,
    exactPages,
    issueFallbacks,
    directCoveragePercent: records.length ? Number(((exactPages / records.length) * 100).toFixed(1)) : 0
  };
  return output;
}

function buildOutput(existing = readExistingOutput()) {
  const awards = readAwards();
  const years = awardYears();
  const cached = readCachedMagazinePages();
  const indexes = {
    c64: matcher.buildGameIndex(cached.c64),
    amiga: matcher.buildGameIndex(cached.amiga)
  };

  const entries = {};

  awards.forEach((entry) => {
    const issue = issueNumber(entry.year, entry.month);
    if (!issue) throw new Error(`Unable to derive Zzap!64 issue for ${recordKey(entry)}`);

    const key = recordKey(entry);
    const persisted = persistedExact(existing, entry, issue);
    const system = systemKey(entry.system);
    const cacheMatch = matcher.findGame(entry, indexes[system]);
    const cachedExact = cacheMatch?.zzapLinks?.find((link) => link.issue === issue) || null;

    if (persisted) {
      entries[key] = persisted;
    } else if (cachedExact) {
      entries[key] = {
        issue,
        page: cachedExact.page,
        precision: "page",
        url: cachedExact.url,
        source: "cached-magazine-reference",
        ...(cacheMatch?.lemonUrl ? { lemonUrl: cacheMatch.lemonUrl } : {})
      };
    } else {
      entries[key] = {
        issue,
        page: null,
        precision: "issue",
        url: officialIssueUrl(issue),
        source: "official-issue-fallback"
      };
    }
  });

  return recalculateTotals({
    version: 2,
    generatedFrom: "Verified Zzap!64 magazine references from the repository Lemon cache plus optional live Lemon64/Lemon Amiga lookups. Exact page numbers are never guessed; unresolved entries fall back to the correct official issue.",
    officialHost: "www.zzap64.co.uk",
    years,
    totals: {},
    entries
  });
}

function serialize(output) {
  return `${JSON.stringify(output, null, 2)}\n`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  if (requestCache.has(url)) return requestCache.get(url);

  const task = (async () => {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < REQUEST_DELAY_MS) await sleep(REQUEST_DELAY_MS - elapsed);

    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        lastRequestAt = Date.now();
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml"
          }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
      } catch (error) {
        lastError = error;
        if (attempt < 3) await sleep(450 * attempt);
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error(`Unable to fetch ${url}: ${lastError?.message || lastError}`);
  })();

  requestCache.set(url, task);
  return task;
}

function searchVariants(entry) {
  const raw = String(entry.title || "").trim();
  const noArticle = raw.replace(/^(the|a|an)\s+/i, "").trim();
  const canonical = matcher.canonicalTitle(raw);
  const punctuationLight = raw.replace(/[’‘`]/g, "'").replace(/[^A-Za-z0-9'+& -]+/g, " ").replace(/\s+/g, " ").trim();
  const beforeColon = raw.split(":")[0].trim();
  const variants = [raw, noArticle, punctuationLight, canonical, beforeColon, ...(LEMON_SEARCH_ALIASES[raw] || [])];
  const seen = new Set();
  return variants.filter((value) => {
    const key = String(value || "").trim().toLowerCase();
    if (!key || key.length < 2 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractSearchCandidates(html, origin, system) {
  const candidates = [];
  const seen = new Set();
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorPattern.exec(String(html || "")))) {
    const href = decodeHtml(match[1]);
    let url;
    try {
      url = new URL(href, origin);
    } catch {
      continue;
    }
    if (url.origin !== origin || !/^\/game\/[^/?#]+\/?$/i.test(url.pathname)) continue;

    const title = normalizeSearchTitle(stripTags(match[2]));
    if (!title || seen.has(url.href)) continue;
    seen.add(url.href);
    candidates.push({
      title,
      slug: canonicalGameSlug(url.href),
      system: system === "amiga" ? "AMIGA" : "C64",
      url: url.href
    });
  }

  return candidates;
}

async function searchLemon(entry) {
  const system = systemKey(entry.system);
  const origin = LEMON_ORIGINS[system];
  const cacheKey = `${system}|${matcher.canonicalTitle(entry.title)}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);

  const task = (async () => {
    const candidatesByUrl = new Map();

    for (const query of searchVariants(entry)) {
      const searchUrl = new URL("/games/list.php", origin);
      searchUrl.searchParams.set("list_title", query);
      let html;
      try {
        html = await fetchText(searchUrl.href);
      } catch (error) {
        console.warn(`Lemon search failed for ${entry.title} (${system}, ${query}): ${error.message}`);
        continue;
      }

      extractSearchCandidates(html, origin, system).forEach((candidate) => candidatesByUrl.set(candidate.url, candidate));
      const rankedNow = Array.from(candidatesByUrl.values())
        .map((candidate) => ({ candidate, score: matcher.scoreGame(entry, candidate) }))
        .sort((a, b) => b.score - a.score);
      if (rankedNow[0]?.score >= 120) break;
    }

    return Array.from(candidatesByUrl.values())
      .map((candidate) => ({ ...candidate, matchScore: matcher.scoreGame(entry, candidate) }))
      .filter((candidate) => candidate.matchScore >= 88)
      .sort((a, b) => b.matchScore - a.matchScore || a.title.localeCompare(b.title, "en-GB"))
      .slice(0, MAX_LIVE_CANDIDATES);
  })();

  searchCache.set(cacheKey, task);
  return task;
}

async function resolveLiveExact(entry) {
  const issue = issueNumber(entry.year, entry.month);
  if (!issue) return null;

  const candidates = await searchLemon(entry);
  for (const candidate of candidates) {
    let html;
    try {
      html = await fetchText(candidate.url);
    } catch (error) {
      console.warn(`Lemon game page failed for ${entry.title}: ${error.message}`);
      continue;
    }

    const exact = extractZzapLinks(html).find((link) => link.issue === issue);
    if (!exact) continue;

    return {
      issue,
      page: exact.page,
      precision: "page",
      url: exact.url,
      source: systemKey(entry.system) === "amiga" ? "live-lemonamiga-magazine-reference" : "live-lemon64-magazine-reference",
      lemonUrl: candidate.url
    };
  }

  return null;
}

async function enrichLive(output) {
  const awards = readAwards();
  const unresolved = awards.filter((entry) => output.entries?.[recordKey(entry)]?.precision !== "page");
  console.log(`Deep Lemon lookup: ${unresolved.length} unresolved award entries to check.`);

  let resolved = 0;
  let checked = 0;
  for (const entry of unresolved) {
    checked += 1;
    try {
      const exact = await resolveLiveExact(entry);
      if (exact) {
        output.entries[recordKey(entry)] = exact;
        resolved += 1;
        console.log(`  ✓ ${entry.year} ${entry.month} ${entry.system} — ${entry.title}: issue ${exact.issue}, page ${exact.page}`);
      } else {
        console.log(`  · ${entry.year} ${entry.month} ${entry.system} — ${entry.title}: no direct Lemon page reference found`);
      }
    } catch (error) {
      console.warn(`  ! ${entry.title}: ${error.message}`);
    }

    if (checked % 20 === 0 || checked === unresolved.length) {
      console.log(`Deep lookup progress: ${checked}/${unresolved.length}; ${resolved} newly resolved.`);
    }
  }

  recalculateTotals(output);
  console.log(`Deep lookup complete: +${resolved} direct pages; ${output.totals.exactPages}/${output.totals.awards} direct (${output.totals.directCoveragePercent}%).`);
  return output;
}

async function main() {
  const check = process.argv.includes("--check");
  const live = process.argv.includes("--live");
  const existing = readExistingOutput();
  let output = buildOutput(existing);

  if (live) output = await enrichLive(output);
  const next = serialize(output);

  if (check) {
    if (!fs.existsSync(OUTPUT_PATH)) {
      console.error(`Missing generated review-link data: ${path.relative(ROOT, OUTPUT_PATH)}`);
      process.exit(1);
    }
    const current = fs.readFileSync(OUTPUT_PATH, "utf8");
    if (current !== next) {
      console.error("Zzap!64 review-link data is out of date. Run: node scripts/generate-zzap64-review-links.js");
      process.exit(1);
    }
    console.log(`Zzap!64 review-link data is current: ${output.totals.exactPages} exact pages, ${output.totals.issueFallbacks} issue fallbacks.`);
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, next, "utf8");
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_PATH)}: ${output.totals.awards} awards, ${output.totals.exactPages} exact pages, ${output.totals.issueFallbacks} issue fallbacks.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  awardYears,
  buildOutput,
  enrichLive,
  extractZzapLinks,
  issueNumber,
  recordKey,
  officialIssueUrl,
  officialPageUrl,
  searchVariants
};
