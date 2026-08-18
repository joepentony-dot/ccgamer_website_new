#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
  GENRE_ROUTE_SET,
  HISTORY_END,
  HISTORY_START,
  buildArchiveMap,
  isPublisherIndexable,
  loadProfiles,
  normaliseSlug,
  resolveGenreLinkForStrength,
  sanitizeProfile
} = require("./materialize-publisher-histories");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const publishersDir = path.join(repoRoot, "games", "publishers");
const metadataPath = path.join(publishersDir, "publishers.json");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");
const failures = [];

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    failures.push(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
    return fallback;
  }
}

function extract(html, pattern) {
  const match = html.match(pattern);
  return match ? String(match[1] || "").trim() : "";
}

function decodeHtmlText(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&#x27;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function historyBlock(html) {
  const start = html.indexOf(HISTORY_START);
  const end = html.indexOf(HISTORY_END);
  if (start === -1 || end === -1 || end < start) return "";
  return html.slice(start, end + HISTORY_END.length);
}

function sourcePanel(block) {
  const match = block.match(/<div class="ccg-publisher-history__panel ccg-publisher-history__panel--sources">[\s\S]*?<\/div>/i);
  return match ? match[0] : "";
}

function genreStrengthLinks(block) {
  const links = [];
  const pattern = /<a\b[^>]*href="([^"]+)"[^>]*data-ccg-genre-strength="([^"]+)"[^>]*>([^<]*)<\/a>/gi;
  let match;
  while ((match = pattern.exec(block))) {
    links.push({
      href: match[1],
      key: match[2],
      label: decodeHtmlText(match[3]).trim()
    });
  }
  return links;
}

function failIf(condition, message) {
  if (condition) failures.push(message);
}

const metadata = readJson(metadataPath, []);
if (!Array.isArray(metadata)) failures.push("games/publishers/publishers.json must contain an array");
const staticPages = readJson(staticPagesPath, []);
if (!Array.isArray(staticPages)) failures.push("tools/seo/static-pages.json must contain an array");
const staticPageSet = new Set((Array.isArray(staticPages) ? staticPages : []).map((entry) => String(entry || "").trim()));
const archiveMap = buildArchiveMap(metadata);
const profiles = loadProfiles();
const profileBySlug = new Map(profiles.map((profile) => [profile.slug, profile]));

let sourceBackedCount = 0;
let noIndependentSourceCount = 0;
let missingProfileCount = 0;
let linkedStrengthCount = 0;
let indexableCount = 0;
let noindexCount = 0;
const titles = new Map();
const descriptions = new Map();

for (const record of metadata) {
  const slug = normaliseSlug(record?.slug);
  if (!slug) {
    failures.push("Publisher metadata contains an empty slug");
    continue;
  }

  const profile = profileBySlug.get(slug) || null;
  const safeProfile = profile ? sanitizeProfile(profile) : null;
  const expectedIndexable = isPublisherIndexable(record, safeProfile);
  failIf(Boolean(record?.indexable) !== expectedIndexable, `${slug}: publisher metadata indexability does not match evidence/archive-depth policy`);

  if (profile) {
    if (safeProfile.sourceBacked) sourceBackedCount += 1;
    else noIndependentSourceCount += 1;
  } else {
    missingProfileCount += 1;
  }

  const filePath = path.join(publishersDir, slug, "index.html");
  if (!fs.existsSync(filePath)) {
    failures.push(`${slug}: generated publisher page is missing`);
    continue;
  }

  const html = fs.readFileSync(filePath, "utf8");
  const block = historyBlock(html);

  if (profile) {
    failIf(!block, `${slug}: researched history is not embedded in the initial HTML`);
    if (block) {
      failIf(/complete publisher index/i.test(block), `${slug}: rendered history still references the Complete Publisher Index`);
      failIf(/CCG publisher index currently records/i.test(block), `${slug}: rendered history still exposes an internal archive fact`);

      const evidencePanel = sourcePanel(block);
      if (safeProfile.sourceBacked) {
        if (safeProfile.facts.length) {
          failIf(!/Documented company facts/i.test(block), `${slug}: independently sourced profile is missing its documented facts`);
        } else {
          failIf(/Documented company facts/i.test(block), `${slug}: empty independent facts must not render a fact panel`);
        }
        failIf(!evidencePanel, `${slug}: independently sourced profile is missing its evidence panel`);
        failIf(!/Source-backed publisher profile/i.test(block), `${slug}: independently sourced profile is missing its source-backed label`);
      } else {
        failIf(/Documented company facts/i.test(block), `${slug}: unsourced profile must not render a fact panel`);
        failIf(Boolean(evidencePanel), `${slug}: unsourced profile must not render an evidence panel`);
      }

      if (evidencePanel) {
        failIf(/cheekycommodoregamer\.co\.uk/i.test(evidencePanel), `${slug}: evidence panel contains a first-party CCG source`);
      }

      const actualGenreLinks = genreStrengthLinks(block);
      linkedStrengthCount += actualGenreLinks.length;
      actualGenreLinks.forEach((link) => {
        failIf(!GENRE_ROUTE_SET.has(link.href), `${slug}: Archive Strengths links to a non-canonical genre route: ${link.href}`);
      });

      for (const strength of Array.isArray(safeProfile.strengths) ? safeProfile.strengths : []) {
        const expected = resolveGenreLinkForStrength(strength);
        if (!expected) continue;
        const expectedLabel = String(strength).trim();
        const found = actualGenreLinks.some((link) => link.href === expected.href && link.label === expectedLabel);
        failIf(!found, `${slug}: genre-compatible Archive Strength is not linked to ${expected.href}: ${strength}`);
      }
    }
  } else {
    failIf(Boolean(block), `${slug}: unresearched publisher must not render an invented history section`);
  }

  const title = extract(html, /<title>([^<]+)<\/title>/i);
  const description = extract(html, /<meta\s+name="description"\s+content="([^"]+)"/i);
  const canonical = extract(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i);
  const robots = extract(html, /<meta\s+name="robots"\s+content="([^"]+)"/i);

  failIf(!title, `${slug}: missing SEO title`);
  failIf(!description, `${slug}: missing meta description`);
  failIf(!canonical, `${slug}: missing canonical URL`);
  failIf(!html.includes('type="application/ld+json"'), `${slug}: missing structured data`);
  if (profile) {
    failIf(!html.includes('<link rel="stylesheet" href="/resources/css/publisher-history.css">'), `${slug}: publisher history CSS is not linked in initial HTML`);
  }

  if (title) {
    const other = titles.get(title);
    if (other && other !== slug) failures.push(`${slug}: duplicate title also used by ${other}: ${title}`);
    else titles.set(title, slug);
  }
  if (description) {
    const other = descriptions.get(description);
    if (other && other !== slug) failures.push(`${slug}: duplicate meta description also used by ${other}: ${description}`);
    else descriptions.set(description, slug);
  }

  const expectedCanonical = `https://www.cheekycommodoregamer.co.uk/games/publishers/${slug}/`;
  failIf(canonical !== expectedCanonical, `${slug}: canonical mismatch (${canonical || "missing"})`);

  const staticPath = `games/publishers/${slug}/index.html`;
  if (record?.indexable) {
    indexableCount += 1;
    failIf(robots !== "index,follow", `${slug}: indexable publisher has robots=${robots || "missing"}`);
    failIf(!staticPageSet.has(staticPath), `${slug}: indexable publisher is missing from sitemap eligibility config`);
  } else {
    noindexCount += 1;
    failIf(robots !== "noindex,follow", `${slug}: limited publisher has robots=${robots || "missing"}`);
    failIf(staticPageSet.has(staticPath), `${slug}: noindex publisher remains sitemap-eligible`);
    failIf(Number(record?.count || 0) !== 1, `${slug}: only limited one-game publisher pages may remain noindex`);
    failIf(Boolean(safeProfile?.sourceBacked), `${slug}: independently sourced one-game publisher must be indexable`);
  }
}

for (const profile of profiles) {
  const slug = normaliseSlug(profile?.slug);
  if (!slug || !archiveMap.has(slug)) continue;
  const safeProfile = sanitizeProfile(profile);
  if (safeProfile.sourceBacked) {
    failIf(!safeProfile.sources.length, `${slug}: independent evidence classification is incomplete`);
  }
}

if (failures.length) {
  console.error("Publisher SEO/evidence audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Publisher SEO/evidence audit passed.");
console.log(`- ${metadata.length} current publisher pages checked`);
console.log(`- ${sourceBackedCount} publisher pages have independent evidence`);
console.log(`- ${noIndependentSourceCount} researched publisher pages have no reliable independent evidence and render no facts/evidence panel`);
console.log(`- ${missingProfileCount} publisher pages have no researched profile and render factual archive content only`);
console.log(`- ${linkedStrengthCount} Archive Strength links point only to existing CCG genre routes`);
console.log(`- ${indexableCount} publisher pages are indexable`);
console.log(`- ${noindexCount} limited one-game publisher pages remain noindex,follow`);
console.log("- Publisher SEO titles and descriptions are unique");
console.log("- Canonicals and structured data are present");
console.log("- Sitemap eligibility matches publisher indexability");
console.log("- The CCG Complete Publisher Index is excluded from rendered evidence panels");
