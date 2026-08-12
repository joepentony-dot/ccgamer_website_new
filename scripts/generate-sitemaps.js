#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const repoRoot = path.resolve(__dirname, "..");
const sitemapIndexPath = path.join(repoRoot, "sitemap.xml");
const CORE_SITEMAPS = new Set(["sitemap-pages.xml", "sitemap-games.xml"]);
const CHILD_SITEMAP_PATTERN = /^sitemap-[a-z0-9-]+\.xml$/i;

function fail(message) {
  console.error(`[generate-sitemaps] ${message}`);
  process.exit(1);
}

function runNodeScript(scriptName) {
  const scriptPath = path.join(__dirname, scriptName);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, CCG_REPO_ROOT: repoRoot },
  });
  if (result.status !== 0) {
    fail(`${scriptName} failed with status ${result.status ?? 1}.`);
  }
}

function synchronizeComposerArchives() {
  // Keep static composer facts, SEO copy and sitemap eligibility on the same
  // current-catalogue snapshot before sitemap URLs are generated.
  runNodeScript("apply-curated-composer-research.js");
  runNodeScript("enrich-generated-composer-pages.js");
  runNodeScript("validate-composer-count-sync.js");
}

function latestLastmodFromSitemap(filename) {
  const localPath = path.join(repoRoot, filename);
  if (!fs.existsSync(localPath)) return "";
  const xml = fs.readFileSync(localPath, "utf8");
  const dates = [...xml.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/gi)]
    .map((match) => match[1])
    .sort();
  return dates.at(-1) || "";
}

function readAdditionalSitemaps() {
  const entriesByFilename = new Map();

  if (fs.existsSync(sitemapIndexPath)) {
    const xml = fs.readFileSync(sitemapIndexPath, "utf8");
    const regex = /<sitemap>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?\s*<\/sitemap>/gi;
    let match;

    while ((match = regex.exec(xml)) !== null) {
      const loc = match[1].trim();
      const filename = loc.split("/").pop();
      if (!filename || CORE_SITEMAPS.has(filename) || !CHILD_SITEMAP_PATTERN.test(filename)) continue;

      const localPath = path.join(repoRoot, filename);
      if (!fs.existsSync(localPath)) {
        console.warn(`[generate-sitemaps] Skipping missing additional sitemap: ${filename}`);
        continue;
      }

      entriesByFilename.set(filename, {
        loc,
        lastmod: String(match[2] || "").trim() || latestLastmodFromSitemap(filename),
      });
    }
  }

  for (const filename of fs.readdirSync(repoRoot).sort()) {
    if (CORE_SITEMAPS.has(filename) || !CHILD_SITEMAP_PATTERN.test(filename)) continue;
    if (entriesByFilename.has(filename)) continue;

    entriesByFilename.set(filename, {
      loc: `${SITE_ORIGIN}/${filename}`,
      lastmod: latestLastmodFromSitemap(filename),
    });
    console.log(`[generate-sitemaps] Discovered unindexed local child sitemap: ${filename}`);
  }

  return [...entriesByFilename.values()];
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function restoreAdditionalSitemaps(entries) {
  if (!entries.length) return;
  let xml = fs.readFileSync(sitemapIndexPath, "utf8");
  const missing = entries.filter((entry) => !xml.includes(`<loc>${escapeXml(entry.loc)}</loc>`));
  if (!missing.length) return;

  const blocks = missing.map((entry) => [
    "  <sitemap>",
    `    <loc>${escapeXml(entry.loc)}</loc>`,
    ...(entry.lastmod ? [`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`] : []),
    "  </sitemap>",
  ].join("\n"));

  xml = xml.replace(
    "</sitemapindex>",
    `${blocks.join("\n")}\n</sitemapindex>`
  );
  fs.writeFileSync(sitemapIndexPath, xml, "utf8");
  console.log(`[generate-sitemaps] Restored additional sitemap children: ${missing.map((entry) => entry.loc).join(", ")}`);
}

synchronizeComposerArchives();
const additionalSitemaps = readAdditionalSitemaps();
require("../tools/seo/generate-sitemap.js");
restoreAdditionalSitemaps(additionalSitemaps);
