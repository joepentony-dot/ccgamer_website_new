#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const dataDir = path.join(repoRoot, "data");
const overridesPath = path.join(dataDir, "publisher-evidence-overrides.json");
const PROFILE_FILE_PATTERN = /^publisher-histories(?:-[a-z0-9-]+)?\.json$/i;

const EXPECTED_RESEARCH_SLUGS = new Set([
  "american-action", "amersoft", "artworx-software", "beyond", "black-legend",
  "blade-software", "bloodhouse", "bulldog-software", "cbs-electronics-software",
  "commodore-plus", "corgi", "craig-communications", "creative-software",
  "creative-sparks", "datamost", "digital-magic-software", "hodder-and-stoughton",
  "ice", "interdisc", "mc-lothlorien", "melody-hall-publishing", "micro-fun",
  "monarch-software", "sight-and-sound-music-software", "simulmondo",
  "tronix-publishing", "mogul"
]);

const APPROVED_EVIDENCE_HOSTS = new Set([
  "www.computinghistory.org.uk", "mastertronic.co.uk", "www.c64.com", "journal.fi",
  "www.atarimagazines.com", "blog.playstation.com", "commodore-plus.itch.io",
  "www.c64-wiki.de", "worldofspectrum.org", "datamost.applearchives.com",
  "www.ataricompendium.com", "gb64.com", "elisoftware.org", "manuals.plus",
  "www.ryokawasaki.com", "www.ivproductions.it", "preservation64.de"
]);

const RESEARCH_CORRECTIONS = {
  "mc-lothlorien": {
    summary: "M.C. Lothlorien was an early British strategy-software publisher active across 8-bit home computers. Museum records preserve a substantial catalogue from the early 1980s, including Roman Empire, Confrontation, Johnny Reb and Waterloo.",
    facts: [
      "The Centre for Computing History preserves Lothlorien releases from 1982 onward across several 8-bit home-computer systems.",
      "Its museum catalogue includes strategy titles such as Roman Empire, Confrontation, Johnny Reb, Warlord and Waterloo."
    ],
    strengths: ["British strategy software", "Early 8-bit publishing", "Historical and tactical games"],
    related: [],
    note: "The museum record is strong on the software catalogue; unsupported founder or ownership details are omitted here.",
    confidence: "high",
    verified_on: "2026-08-13",
    sources: [
      {
        label: "Centre for Computing History — Lothlorien games",
        url: "https://www.computinghistory.org.uk/cgi/archive.pl?platform=&publisher=Lothlorien&type=Games",
        type: "museum collection"
      }
    ]
  }
};

function fail(message) {
  console.error(`[publisher-evidence-overrides] ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
  }
}

function normaliseSlug(value) {
  return String(value || "").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
}

function sourceKey(source) {
  return String(source?.url || "").trim().toLowerCase();
}

function mergeUnique(existing, additions, keyFn) {
  const output = Array.isArray(existing) ? [...existing] : [];
  const seen = new Set(output.map(keyFn).filter(Boolean));
  for (const item of Array.isArray(additions) ? additions : []) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function validateSource(slug, source) {
  let url;
  try {
    url = new URL(source?.url || "");
  } catch (error) {
    fail(`${slug}: invalid evidence URL`);
  }
  if (url.protocol !== "https:") fail(`${slug}: evidence URL must use HTTPS`);
  if (!APPROVED_EVIDENCE_HOSTS.has(url.hostname)) {
    fail(`${slug}: unapproved evidence host ${url.hostname}`);
  }
  if (String(source?.label || "").trim().length < 12) fail(`${slug}: evidence source label is too vague`);
  if (!String(source?.type || "").trim()) fail(`${slug}: evidence source type is missing`);
}

function validateResearchOverride(override) {
  const slug = override.slug;
  if (!EXPECTED_RESEARCH_SLUGS.has(slug)) fail(`${slug}: unexpected full-profile research override`);
  if (String(override.summary || "").trim().length < 80) fail(`${slug}: researched summary is too short`);
  if (!Array.isArray(override.facts) || override.facts.length < 2) fail(`${slug}: researched profile requires at least two facts`);
  if (!Array.isArray(override.strengths) || override.strengths.length === 0) fail(`${slug}: researched profile requires strengths`);
  if (override.confidence !== "high") fail(`${slug}: researched profile confidence must be high`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(override.verified_on || ""))) fail(`${slug}: verified_on must use YYYY-MM-DD`);
}

function applyResearchProfile(entry, override) {
  for (const key of ["summary", "note", "confidence", "verified_on"]) {
    if (Object.prototype.hasOwnProperty.call(override, key)) entry[key] = override[key];
  }
  for (const key of ["facts", "strengths", "related", "sources"]) {
    if (Object.prototype.hasOwnProperty.call(override, key)) {
      entry[key] = Array.isArray(override[key]) ? [...override[key]] : override[key];
    }
  }
}

function main() {
  if (!fs.existsSync(overridesPath)) fail("Missing data/publisher-evidence-overrides.json");
  const overrides = readJson(overridesPath);
  if (!Array.isArray(overrides) || overrides.length === 0) {
    fail("data/publisher-evidence-overrides.json must contain a non-empty array");
  }

  const rawOverrides = fs.readFileSync(overridesPath, "utf8").toLowerCase();
  for (const prohibited of ["lemon64.com", "mobygames.com", "gamefaqs.gamespot.com"]) {
    if (rawOverrides.includes(prohibited)) fail(`Evidence data must not reference ${prohibited}`);
  }

  const overrideBySlug = new Map();
  const researchSlugs = new Set();
  for (const rawOverride of overrides) {
    const slug = normaliseSlug(rawOverride?.slug);
    if (!slug) fail("Evidence override contains an empty slug");
    if (overrideBySlug.has(slug)) fail(`Duplicate evidence override for ${slug}`);

    const correction = RESEARCH_CORRECTIONS[slug] || {};
    const override = { ...rawOverride, ...correction, slug };
    if (!Array.isArray(override.sources) || override.sources.length === 0) {
      fail(`${slug}: evidence override must contain at least one source`);
    }
    override.sources.forEach((source) => validateSource(slug, source));
    if (override.mode === "replace_profile") {
      validateResearchOverride(override);
      researchSlugs.add(slug);
    }
    overrideBySlug.set(slug, override);
  }

  for (const slug of EXPECTED_RESEARCH_SLUGS) {
    if (!researchSlugs.has(slug)) fail(`Missing researched publisher override: ${slug}`);
  }
  if (researchSlugs.size !== EXPECTED_RESEARCH_SLUGS.size) {
    fail(`Expected ${EXPECTED_RESEARCH_SLUGS.size} researched publisher overrides, found ${researchSlugs.size}`);
  }

  const files = fs.readdirSync(dataDir)
    .filter((name) => PROFILE_FILE_PATTERN.test(name))
    .sort((a, b) => a.localeCompare(b));

  const matched = new Map();
  let filesChanged = 0;

  for (const name of files) {
    const filePath = path.join(dataDir, name);
    const entries = readJson(filePath);
    if (!Array.isArray(entries)) fail(`data/${name} must contain an array`);
    let changed = false;

    for (const entry of entries) {
      const slug = normaliseSlug(entry?.slug);
      const override = overrideBySlug.get(slug);
      if (!override) continue;

      matched.set(slug, (matched.get(slug) || 0) + 1);
      if (override.mode === "replace_profile") {
        applyResearchProfile(entry, override);
      } else {
        entry.facts = mergeUnique(entry.facts, override.facts, (value) => String(value || "").trim());
        entry.sources = mergeUnique(entry.sources, override.sources, sourceKey);
      }
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
      filesChanged += 1;
    }
  }

  for (const slug of overrideBySlug.keys()) {
    const count = matched.get(slug) || 0;
    if (count !== 1) fail(`${slug}: expected exactly one publisher profile match, found ${count}`);
  }

  console.log(`[publisher-evidence-overrides] Applied ${overrides.length} evidence override(s) across ${filesChanged} history file(s), including ${researchSlugs.size} validated full research profile replacement(s).`);
}

if (require.main === module) main();
