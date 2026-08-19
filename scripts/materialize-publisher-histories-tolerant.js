#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  HISTORY_END,
  HISTORY_START,
  isPublisherIndexable,
  loadProfiles,
  normaliseSlug,
  sanitizeProfile
} = require("./materialize-publisher-histories");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const publishersDir = path.join(repoRoot, "games", "publishers");
const metadataPath = path.join(publishersDir, "publishers.json");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");

function fail(message) {
  console.error(`[publisher-history-tolerant] ${message}`);
  process.exit(1);
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function setRobots(html, indexable) {
  const robots = indexable ? "index,follow" : "noindex,follow";
  if (!/<meta\s+name="robots"\s+content="[^"]*">/i.test(html)) {
    fail("Generated publisher page is missing its robots meta tag.");
  }
  return html.replace(/<meta\s+name="robots"\s+content="[^"]*">/i, `<meta name="robots" content="${robots}">`);
}

function removeHistory(html) {
  const start = html.indexOf(HISTORY_START);
  const end = html.indexOf(HISTORY_END);
  if (start === -1 || end === -1 || end < start) return html;
  return `${html.slice(0, start)}${html.slice(end + HISTORY_END.length)}`;
}

function synchronizeStaticPages(metadata) {
  const current = readJson(staticPagesPath, []);
  const preserved = (Array.isArray(current) ? current : []).filter((entry) => (
    typeof entry === "string" &&
    !entry.replace(/^\/+/, "").startsWith("games/publishers/")
  ));
  const publisherPages = [
    "games/publishers/index.html",
    ...metadata
      .filter((record) => Boolean(record?.indexable))
      .map((record) => `games/publishers/${normaliseSlug(record.slug)}/index.html`)
  ];
  const seen = new Set();
  const next = [...preserved, ...publisherPages].filter((entry) => {
    const value = String(entry || "").trim();
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
  writeJson(staticPagesPath, next);
}

function main() {
  const profiles = loadProfiles();
  const profileBySlug = new Map(profiles.map((profile) => [normaliseSlug(profile.slug), profile]));
  const metadataBefore = readJson(metadataPath, []);
  if (!Array.isArray(metadataBefore)) fail("games/publishers/publishers.json must contain an array.");

  const missing = metadataBefore
    .map((record) => normaliseSlug(record?.slug))
    .filter((slug) => slug && !profileBySlug.has(slug));

  const child = spawnSync(process.execPath, [path.join(__dirname, "materialize-publisher-histories.js")], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, CCG_REPO_ROOT: repoRoot }
  });

  if (child.stdout) process.stdout.write(child.stdout);
  if (child.stderr) process.stderr.write(child.stderr);

  if (child.status !== 0) {
    const combined = `${child.stdout || ""}\n${child.stderr || ""}`;
    const expectedMissingFailure = missing.length > 0 && /Current publisher routes without history profiles \(\d+\):/i.test(combined);
    if (!expectedMissingFailure) {
      fail(`materialize-publisher-histories.js failed with status ${child.status ?? 1}.`);
    }
  }

  const metadata = readJson(metadataPath, metadataBefore);
  let missingIndexable = 0;
  let missingNoindex = 0;

  for (const record of metadata) {
    const slug = normaliseSlug(record?.slug);
    if (!slug) continue;
    const profile = profileBySlug.get(slug);
    const safeProfile = profile ? sanitizeProfile(profile) : null;
    const indexable = isPublisherIndexable(record, safeProfile);
    record.indexable = indexable;

    const filePath = path.join(publishersDir, slug, "index.html");
    if (!fs.existsSync(filePath)) fail(`Missing generated publisher page: games/publishers/${slug}/index.html`);
    let html = fs.readFileSync(filePath, "utf8");

    if (!profile) {
      html = removeHistory(html);
      if (indexable) missingIndexable += 1;
      else missingNoindex += 1;
    }

    const next = setRobots(html, indexable);
    if (next !== fs.readFileSync(filePath, "utf8")) fs.writeFileSync(filePath, next, "utf8");
  }

  writeJson(metadataPath, metadata);
  synchronizeStaticPages(metadata);

  console.log(`[publisher-history-tolerant] Publisher routes without researched profiles: ${missing.length}`);
  console.log(`[publisher-history-tolerant] Missing-profile routes indexable from archive depth: ${missingIndexable}`);
  console.log(`[publisher-history-tolerant] Missing-profile one-game routes kept noindex,follow: ${missingNoindex}`);
  console.log("[publisher-history-tolerant] No publisher history text was generated for routes without a real profile.");
}

if (require.main === module) main();
