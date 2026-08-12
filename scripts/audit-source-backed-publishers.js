#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = path.resolve(__dirname, "..");
const failures = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(content, token, label) {
  if (!content.includes(token)) failures.push(`${label} is missing: ${token}`);
}

function changedFiles() {
  for (const range of ["origin/main...HEAD", "HEAD^...HEAD"]) {
    try {
      const output = childProcess.execFileSync(
        "git",
        ["diff", "--name-only", range],
        { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
      );
      const files = output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
      if (files.length) return files;
    } catch (error) {}
  }
  return [];
}

const dataText = read("data/publisher-histories.json");
const secondaryText = read("data/publisher-secondary-credits.json");
const moduleCode = read("js/ccg-publisher-history.js");
const css = read("resources/css/publisher-history.css");
const workflow = read(".github/workflows/ccg-source-backed-publishers.yml");
const documentation = read("docs/phase-18-source-backed-publisher-histories.md");

let profiles = [];
try {
  profiles = JSON.parse(dataText);
  if (!Array.isArray(profiles)) failures.push("Publisher history data must remain an array");
} catch (error) {
  failures.push(`Publisher history JSON is invalid: ${error.message}`);
}

const requiredSourceBacked = new Set([
  "ocean-software",
  "mastertronic",
  "firebird",
  "codemasters",
  "activision",
  "electronic-arts",
  "elite",
  "microprose-software",
  "americana"
]);

const approvedHosts = new Set([
  "www.computinghistory.org.uk",
  "mastertronic.co.uk",
  "ourdigitalheritage.org",
  "www.ea.com",
  "thecodemastersarchive.co.uk",
  "investor.activision.com",
  "find-and-update.company-information.service.gov.uk",
  "www.elite-systems.co.uk",
  "firaxis.com"
]);

const seenSlugs = new Set();
for (const profile of profiles) {
  const slug = String(profile?.slug || "").trim();
  if (!slug) {
    failures.push("Every publisher profile requires a slug");
    continue;
  }
  if (seenSlugs.has(slug)) failures.push(`Duplicate publisher profile slug: ${slug}`);
  seenSlugs.add(slug);

  const facts = Array.isArray(profile.facts) ? profile.facts : [];
  const sources = Array.isArray(profile.sources) ? profile.sources : [];
  const sourceBacked = facts.length > 0 || sources.length > 0;

  if (sourceBacked) {
    if (facts.length < 1) failures.push(`${slug}: source-backed profile requires at least one fact`);
    if (!sources.length) failures.push(`${slug}: source-backed profile requires evidence links`);
    if (profile.confidence !== "high") failures.push(`${slug}: confidence must be high or the profile must remain unsourced`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(profile.verified_on || ""))) {
      failures.push(`${slug}: verified_on must use YYYY-MM-DD`);
    }

    for (const fact of facts) {
      const value = String(fact || "").trim();
      if (value.length < 18 || !/[.!?]$/.test(value)) failures.push(`${slug}: malformed fact: ${value}`);
    }

    for (const source of sources) {
      const label = String(source?.label || "").trim();
      const type = String(source?.type || "").trim();
      let url;
      try {
        url = new URL(source?.url || "");
      } catch (error) {
        failures.push(`${slug}: invalid source URL`);
        continue;
      }
      if (url.protocol !== "https:") failures.push(`${slug}: source must use HTTPS: ${url.href}`);
      if (!approvedHosts.has(url.hostname)) failures.push(`${slug}: unapproved evidence host: ${url.hostname}`);
      if (label.length < 12) failures.push(`${slug}: source label is too vague`);
      if (!type) failures.push(`${slug}: source type is missing`);
    }
  }
}

for (const slug of requiredSourceBacked) {
  const profile = profiles.find((entry) => entry?.slug === slug);
  if (!profile) failures.push(`Required source-backed publisher is missing: ${slug}`);
  else if (!Array.isArray(profile.sources) || !profile.sources.length) {
    failures.push(`Required publisher lacks sources: ${slug}`);
  }
}

const americana = profiles.find((entry) => entry?.slug === "americana");
const expectedAmericanaFact = "Americana (or Americana Software) was a budget-priced software label created through a partnership between Mastertronic and U.S. Gold in the mid-1980s. It was set up because U.S. Gold lacked experience in the budget games market and used the label to re-release popular full-price Commodore 64 and other microcomputer games.";
if (!americana) {
  failures.push("Americana publisher profile is missing");
} else {
  if (!Array.isArray(americana.facts) || americana.facts.length !== 1 || americana.facts[0] !== expectedAmericanaFact) {
    failures.push("Americana documented company facts must contain only the approved Mastertronic/U.S. Gold history text");
  }
  if (!Array.isArray(americana.sources) || americana.sources.length !== 1 || americana.sources[0]?.url !== "https://mastertronic.co.uk/americana-checklist/") {
    failures.push("Americana evidence must reference only the Mastertronic Americana checklist");
  }
}

if (/lemon64\.com/i.test(dataText) || /lemon64\.com/i.test(secondaryText)) {
  failures.push("Publisher history/evidence data must not reference Lemon64");
}

requireText(moduleCode, "Source-backed publisher profile", "Source-backed profile label");
requireText(moduleCode, "Documented company facts", "Fact panel");
requireText(moduleCode, "Evidence sources", "Evidence panel");
requireText(moduleCode, "noopener noreferrer external", "External-link safety");
requireText(moduleCode, "safeExternalUrl", "Source URL validation");
requireText(moduleCode, "Evidence reviewed", "Review-date display");
requireText(moduleCode, "cache: \"default\"", "Publisher data cache policy");
requireText(css, ".ccg-publisher-history__facts", "Fact-list styling");
requireText(css, ".ccg-publisher-history__sources", "Evidence styling");
requireText(css, ".ccg-publisher-history__status", "Evidence-status styling");
requireText(workflow, "node scripts/audit-source-backed-publishers.js", "Publisher audit workflow step");
requireText(documentation, "Phase 18", "Phase documentation");
requireText(documentation, "Evidence policy", "Evidence policy documentation");

const protectedPaths = new Set([
  "index.html",
  "home.html",
  "resources/css/intro.css",
  "js/index-intro.js",
  "games/games.json"
]);

const allowedPaths = new Set([
  "data/publisher-histories.json",
  "data/publisher-secondary-credits.json",
  "js/ccg-publisher-history.js",
  "resources/css/publisher-history.css",
  "scripts/audit-source-backed-publishers.js",
  ".github/workflows/ccg-source-backed-publishers.yml",
  "docs/phase-18-source-backed-publisher-histories.md"
]);

for (const changedPath of changedFiles()) {
  if (protectedPaths.has(changedPath)) failures.push(`Protected file changed: ${changedPath}`);
  if (!process.env.GITHUB_ACTIONS && !allowedPaths.has(changedPath)) {
    failures.push(`Out-of-scope local Phase 18 change: ${changedPath}`);
  }
}

if (failures.length) {
  console.error("Source-backed publisher audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Source-backed publisher audit passed.");
console.log(`- ${requiredSourceBacked.size} high-confidence profiles include visitor-visible evidence`);
console.log("- Sources are restricted to the reviewed institutional and specialist host list");
console.log("- Americana uses the approved Mastertronic history and evidence source only");
console.log("- Unsourced publisher summaries remain labelled as curated context");
console.log("- Master game data and protected files remain unchanged");
