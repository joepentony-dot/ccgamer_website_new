#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const overridesPath = path.join(dataDir, "publisher-evidence-overrides.json");
const profilePattern = /^publisher-histories(?:-[a-z0-9-]+)?\.json$/i;
const failures = [];

const expectedResearchSlugs = new Set([
  "american-action",
  "amersoft",
  "artworx-software",
  "beyond",
  "black-legend",
  "blade-software",
  "bloodhouse",
  "bulldog-software",
  "cbs-electronics-software",
  "commodore-plus",
  "corgi",
  "craig-communications",
  "creative-software",
  "creative-sparks",
  "datamost",
  "digital-magic-software",
  "hodder-and-stoughton",
  "ice",
  "interdisc",
  "mc-lothlorien",
  "melody-hall-publishing",
  "micro-fun",
  "monarch-software",
  "sight-and-sound-music-software",
  "simulmondo",
  "tronix-publishing",
  "mogul"
]);

const approvedHosts = new Set([
  "www.computinghistory.org.uk",
  "mastertronic.co.uk",
  "www.c64.com",
  "journal.fi",
  "www.atarimagazines.com",
  "blog.playstation.com",
  "commodore-plus.itch.io",
  "www.c64-wiki.de",
  "worldofspectrum.org",
  "datamost.applearchives.com",
  "www.ataricompendium.com",
  "gb64.com",
  "elisoftware.org",
  "manuals.plus",
  "www.ryokawasaki.com",
  "www.ivproductions.it",
  "preservation64.de"
]);

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    failures.push(`${path.relative(root, filePath)} is invalid JSON: ${error.message}`);
    return [];
  }
}

function slugOf(value) {
  return String(value || "").trim().toLowerCase();
}

const canonicalCounts = new Map();
for (const name of fs.readdirSync(dataDir).filter((name) => profilePattern.test(name))) {
  for (const profile of readJson(path.join(dataDir, name))) {
    const slug = slugOf(profile?.slug);
    if (!slug) continue;
    canonicalCounts.set(slug, (canonicalCounts.get(slug) || 0) + 1);
  }
}

const overrides = readJson(overridesPath);
if (!Array.isArray(overrides)) failures.push("publisher-evidence-overrides.json must contain an array");

const seen = new Set();
const researchSeen = new Set();
for (const override of Array.isArray(overrides) ? overrides : []) {
  const slug = slugOf(override?.slug);
  if (!slug) {
    failures.push("Publisher evidence override contains an empty slug");
    continue;
  }
  if (seen.has(slug)) failures.push(`Duplicate publisher evidence override: ${slug}`);
  seen.add(slug);
  if ((canonicalCounts.get(slug) || 0) !== 1) {
    failures.push(`${slug}: expected exactly one canonical publisher profile, found ${canonicalCounts.get(slug) || 0}`);
  }

  const sources = Array.isArray(override?.sources) ? override.sources : [];
  if (!sources.length) failures.push(`${slug}: evidence override has no sources`);
  for (const source of sources) {
    let url;
    try {
      url = new URL(source?.url || "");
    } catch (error) {
      failures.push(`${slug}: invalid evidence URL`);
      continue;
    }
    if (url.protocol !== "https:") failures.push(`${slug}: source must use HTTPS: ${url.href}`);
    if (!approvedHosts.has(url.hostname)) failures.push(`${slug}: unapproved research evidence host: ${url.hostname}`);
    if (String(source?.label || "").trim().length < 12) failures.push(`${slug}: source label is too vague`);
    if (!String(source?.type || "").trim()) failures.push(`${slug}: source type is missing`);
  }

  if (override?.mode !== "replace_profile") continue;
  researchSeen.add(slug);

  const summary = String(override?.summary || "").trim();
  const facts = Array.isArray(override?.facts) ? override.facts : [];
  const strengths = Array.isArray(override?.strengths) ? override.strengths : [];
  if (summary.length < 80) failures.push(`${slug}: researched summary is too short`);
  if (facts.length < 2) failures.push(`${slug}: researched profile requires at least two documented facts`);
  if (!strengths.length) failures.push(`${slug}: researched profile has no archive strengths`);
  if (override?.confidence !== "high") failures.push(`${slug}: researched profile confidence must be high`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(override?.verified_on || ""))) {
    failures.push(`${slug}: researched profile verified_on must use YYYY-MM-DD`);
  }
  for (const fact of facts) {
    const value = String(fact || "").trim();
    if (value.length < 25 || !/[.!?]$/.test(value)) failures.push(`${slug}: malformed documented fact: ${value}`);
  }
}

for (const slug of expectedResearchSlugs) {
  if (!researchSeen.has(slug)) failures.push(`Missing researched publisher override: ${slug}`);
}
for (const slug of researchSeen) {
  if (!expectedResearchSlugs.has(slug)) failures.push(`Unexpected full-profile research override: ${slug}`);
}
if (researchSeen.size !== expectedResearchSlugs.size) {
  failures.push(`Expected ${expectedResearchSlugs.size} researched publisher overrides, found ${researchSeen.size}`);
}

const raw = fs.existsSync(overridesPath) ? fs.readFileSync(overridesPath, "utf8").toLowerCase() : "";
for (const prohibited of ["lemon64.com", "mobygames.com", "gamefaqs.gamespot.com"]) {
  if (raw.includes(prohibited)) failures.push(`Publisher evidence overrides must not reference ${prohibited}`);
}

if (failures.length) {
  console.error("Publisher research override audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Publisher research override audit passed.");
console.log(`- ${researchSeen.size} full publisher biography/evidence replacements validated`);
console.log(`- ${overrides.length - researchSeen.size} existing evidence-only overrides preserved`);
console.log("- Every researched slug maps to exactly one canonical publisher profile");
console.log("- Research sources are limited to the reviewed archival, institutional, official and first-person host list");
console.log("- Lemon64, MobyGames and GameFAQs remain prohibited from publisher evidence data");
