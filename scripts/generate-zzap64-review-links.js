#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const matcher = require("../js/ccg-zzap64-matcher.js");

const ROOT = path.resolve(__dirname, "..");
const AWARDS_DIR = path.join(ROOT, "data", "zzap64-awards");
const CACHE_DIR = path.join(ROOT, "data", "lemon-cache");
const OUTPUT_PATH = path.join(ROOT, "data", "zzap64-review-links.json");
const YEARS = [1985, 1986, 1987, 1988, 1989];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

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
  YEARS.forEach((year) => {
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
    const issue = Number(parsed.searchParams.get("issue"));
    const page = Number(parsed.searchParams.get("page"));
    if (!Number.isInteger(issue) || issue < 1 || !Number.isInteger(page) || page < 1) continue;
    const key = `${issue}|${page}`;
    if (links.some((item) => item.key === key)) continue;
    links.push({ key, issue, page, url: officialPageUrl(issue, page) });
  }
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
        system: system === "amiga" ? "AMIGA" : "C64",
        zzapLinks,
        source: `data/lemon-cache/${name}`
      });
    });

  return bySystem;
}

function buildOutput() {
  const awards = readAwards();
  const cached = readCachedMagazinePages();
  const indexes = {
    c64: matcher.buildGameIndex(cached.c64),
    amiga: matcher.buildGameIndex(cached.amiga)
  };

  const entries = {};
  let exactPages = 0;
  let issueFallbacks = 0;

  awards.forEach((entry) => {
    const issue = issueNumber(entry.year, entry.month);
    if (!issue) throw new Error(`Unable to derive Zzap!64 issue for ${recordKey(entry)}`);

    const system = systemKey(entry.system);
    const cacheMatch = matcher.findGame(entry, indexes[system]);
    const exact = cacheMatch?.zzapLinks?.find((link) => link.issue === issue) || null;
    const key = recordKey(entry);

    if (exact) {
      exactPages += 1;
      entries[key] = {
        issue,
        page: exact.page,
        precision: "page",
        url: exact.url,
        source: "cached-magazine-reference"
      };
    } else {
      issueFallbacks += 1;
      entries[key] = {
        issue,
        page: null,
        precision: "issue",
        url: officialIssueUrl(issue),
        source: "official-issue-fallback"
      };
    }
  });

  return {
    version: 1,
    generatedFrom: "Existing local Lemon64/LemonAmiga magazine-review cache. Exact page numbers are never guessed; unmatched awards fall back to the correct official Zzap!64 issue.",
    officialHost: "www.zzap64.co.uk",
    totals: {
      awards: awards.length,
      exactPages,
      issueFallbacks
    },
    entries
  };
}

function serialize(output) {
  return `${JSON.stringify(output, null, 2)}\n`;
}

function main() {
  const check = process.argv.includes("--check");
  const output = buildOutput();
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

if (require.main === module) main();

module.exports = {
  buildOutput,
  issueNumber,
  recordKey,
  officialIssueUrl,
  officialPageUrl
};
