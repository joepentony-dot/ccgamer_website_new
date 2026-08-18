#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
  canonicalizePublisherName,
  slugifyPublisher
} = require("./publisher-utils");
const {
  loadProfiles,
  normaliseSlug
} = require("./materialize-publisher-histories");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");
const metadataPath = path.join(repoRoot, "games", "publishers", "publishers.json");
const publishersDir = path.join(repoRoot, "games", "publishers");
const logosDir = path.join(repoRoot, "resources", "images", "publishers");
const LOGO_EXTENSIONS = [".webp", ".png", ".svg", ".jpg", ".jpeg"];

function fail(message) {
  console.error(`[rerelease-publishers] ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
  }
}

function list(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function hasLogo(slug) {
  return LOGO_EXTENSIONS.some((ext) => fs.existsSync(path.join(logosDir, `${slug}${ext}`)));
}

const games = readJson(gamesPath);
const metadata = readJson(metadataPath);
if (!Array.isArray(games)) fail("games/games.json must contain an array.");
if (!Array.isArray(metadata)) fail("games/publishers/publishers.json must contain an array.");

const profileSlugs = new Set(loadProfiles().map((profile) => normaliseSlug(profile.slug)).filter(Boolean));
const metadataBySlug = new Map(metadata.map((record) => [normaliseSlug(record?.slug), record]));
const rereleaseMap = new Map();

for (const game of games) {
  const gameSlug = String(game?.slug || "").trim();
  const rawLabels = list(game?.credits?.re_releaser || game?.credits?.reReleaser);
  for (const rawLabel of rawLabels) {
    const canonical = canonicalizePublisherName(rawLabel);
    const slug = slugifyPublisher(canonical);
    if (!canonical || !slug) continue;
    if (!rereleaseMap.has(slug)) {
      rereleaseMap.set(slug, { slug, label: canonical, games: new Set(), rawLabels: new Set() });
    }
    const entry = rereleaseMap.get(slug);
    if (gameSlug) entry.games.add(gameSlug);
    entry.rawLabels.add(String(rawLabel).trim());
  }
}

const failures = [];
const missingProfiles = [];
const missingLogos = [];
const rows = Array.from(rereleaseMap.values()).sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));

for (const entry of rows) {
  const metadataRecord = metadataBySlug.get(entry.slug);
  const pagePath = path.join(publishersDir, entry.slug, "index.html");
  const profile = profileSlugs.has(entry.slug);
  const logo = hasLogo(entry.slug);
  const expectedGames = entry.games.size;

  if (!metadataRecord) failures.push(`${entry.label}: missing generated publisher metadata route ${entry.slug}`);
  if (metadataRecord && Number(metadataRecord.count || 0) < expectedGames) {
    failures.push(`${entry.label}: publisher archive count ${metadataRecord.count || 0} is below ${expectedGames} explicit re-release credits`);
  }
  if (!fs.existsSync(pagePath)) failures.push(`${entry.label}: missing generated publisher page games/publishers/${entry.slug}/index.html`);
  if (!profile) missingProfiles.push(entry.label);
  if (!logo) missingLogos.push(entry.label);

  console.log(
    `[rerelease-publishers] ${entry.label} -> ${entry.slug} · ` +
    `${expectedGames} explicit re-release game${expectedGames === 1 ? "" : "s"} · ` +
    `profile=${profile ? "yes" : "no"} · logo=${logo ? "yes" : "no"}`
  );
}

if (failures.length) {
  console.error("Re-release publisher discovery audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[rerelease-publishers] Re-release labels represented: ${rows.length}`);
console.log(`[rerelease-publishers] Labels without researched profiles: ${missingProfiles.length ? missingProfiles.join(", ") : "none"}`);
console.log(`[rerelease-publishers] Labels without matching publisher logos: ${missingLogos.length ? missingLogos.join(", ") : "none"}`);
console.log("[rerelease-publishers] Every explicit re-release credit resolves to a generated publisher archive.");
