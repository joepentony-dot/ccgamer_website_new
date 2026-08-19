#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const failures = [];
const dataDir = path.join(root, "data");

const approvedHosts = new Set([
  "www.computinghistory.org.uk",
  "mastertronic.co.uk",
  "ourdigitalheritage.org",
  "www.ea.com",
  "thecodemastersarchive.co.uk",
  "investor.activision.com",
  "find-and-update.company-information.service.gov.uk",
  "www.elite-systems.co.uk",
  "firaxis.com",
  "news.microsoft.com",
  "www.ataricompendium.com",
  "markhardisty.wordpress.com",
  "history.bertelsmann.com",
  "atari.com",
  "atarimuseum.nl",
  "archives.museumofplay.org",
  "commodore.net",
  "www.dataeastgames.com",
  "epyxgames.com",
  "firststarsoftware.com",
  "www.infocom-if.org",
  "www.konami.com",
  "www.lucasfilm.com",
  "musesoftware.com",
  "www.ubisoft.com",
  "www.generation-msx.nl",
  "www.sega.co.jp",
  "www.ryokawasaki.com",
  "www.team17.com",
  "finna.fi",
  "timexsinclair.com",
  "www.timexsinclair.com",
  "www.cheekycommodoregamer.co.uk",
  "www.gremlinarchive.com",
  "www.liverpoolmuseums.org.uk",
  "birdsanctuary.co.uk",
  "system3.com",
  "core-design.com"
]);

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    failures.push(`${path.basename(filePath)}: invalid JSON: ${error.message}`);
    return [];
  }
}

const files = fs.readdirSync(dataDir)
  .filter((name) => /^publisher-histories(?:-[a-z0-9-]+)?\.json$/i.test(name))
  .sort((a, b) => a.localeCompare(b));
const profiles = [];
const seen = new Set();
let sourceBacked = 0;

for (const name of files) {
  const payload = readJson(path.join(dataDir, name));
  if (!Array.isArray(payload)) {
    failures.push(`${name}: expected an array`);
    continue;
  }
  for (const profile of payload) {
    const slug = String(profile?.slug || "").trim();
    if (!slug) {
      failures.push(`${name}: profile missing slug`);
      continue;
    }
    if (seen.has(slug)) failures.push(`Duplicate publisher profile slug: ${slug}`);
    seen.add(slug);
    profiles.push(profile);

    const summary = String(profile?.summary || "").trim();
    const strengths = Array.isArray(profile?.strengths) ? profile.strengths.filter(Boolean) : [];
    const facts = Array.isArray(profile?.facts) ? profile.facts.filter(Boolean) : [];
    const sources = Array.isArray(profile?.sources) ? profile.sources.filter(Boolean) : [];

    if (summary.length < 35) failures.push(`${slug}: summary is missing or too short`);
    if (!strengths.length) failures.push(`${slug}: archive strengths are missing`);

    const hasEvidence = facts.length > 0 || sources.length > 0;
    if (!hasEvidence) continue;
    sourceBacked += 1;
    if (!facts.length || !sources.length) failures.push(`${slug}: source-backed profile requires both facts and sources`);
    if (profile?.confidence !== "high") failures.push(`${slug}: source-backed profile confidence must be high`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(profile?.verified_on || ""))) failures.push(`${slug}: verified_on must use YYYY-MM-DD`);

    for (const fact of facts) {
      const value = String(fact || "").trim();
      if (value.length < 18 || !/[.!?]$/.test(value)) failures.push(`${slug}: malformed fact: ${value}`);
    }
    for (const source of sources) {
      let url;
      try {
        url = new URL(source?.url || "");
      } catch (error) {
        failures.push(`${slug}: invalid source URL`);
        continue;
      }
      if (url.protocol !== "https:") failures.push(`${slug}: source must use HTTPS`);
      if (!approvedHosts.has(url.hostname)) failures.push(`${slug}: unapproved evidence host: ${url.hostname}`);
      if (String(source?.label || "").trim().length < 12) failures.push(`${slug}: source label is too vague`);
      if (!String(source?.type || "").trim()) failures.push(`${slug}: source type is missing`);
    }
  }
}

const allText = files.map((name) => fs.readFileSync(path.join(dataDir, name), "utf8")).join("\n");
for (const prohibited of ["lemon64.com", "mobygames.com", "gamefaqs.gamespot.com"]) {
  if (allText.toLowerCase().includes(prohibited)) failures.push(`Publisher history/evidence data contains prohibited host: ${prohibited}`);
}

for (const slug of ["ocean-software", "mastertronic", "firebird", "codemasters", "activision", "electronic-arts", "elite", "microprose-software", "americana"]) {
  const profile = profiles.find((entry) => String(entry?.slug || "") === slug);
  if (!profile || !Array.isArray(profile.sources) || !profile.sources.length) failures.push(`Required source-backed publisher is incomplete: ${slug}`);
}

if (failures.length) {
  console.error("Source-backed publisher audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const metadataPath = path.join(root, "games", "publishers", "publishers.json");
const metadata = fs.existsSync(metadataPath) ? readJson(metadataPath) : [];
const current = new Set((Array.isArray(metadata) ? metadata : []).map((entry) => String(entry?.slug || "").trim()).filter(Boolean));
const missingResearch = [...current].filter((slug) => !seen.has(slug)).sort();
console.log("Source-backed publisher profile audit passed.");
console.log(`- ${profiles.length} researched/curated profiles validated across ${files.length} data files`);
console.log(`- ${sourceBacked} profiles contain reviewed source-backed evidence`);
console.log(`- ${missingResearch.length} current publisher archives do not yet have a researched profile; those archives remain factual catalogue pages and no biography is invented`);
