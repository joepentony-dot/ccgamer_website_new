#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const sitemapIndexPath = path.join(repoRoot, "sitemap.xml");
const CORE_SITEMAPS = new Set(["sitemap-pages.xml", "sitemap-games.xml"]);

function readAdditionalSitemaps() {
  if (!fs.existsSync(sitemapIndexPath)) return [];
  const xml = fs.readFileSync(sitemapIndexPath, "utf8");
  const entries = [];
  const regex = /<sitemap>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?\s*<\/sitemap>/gi;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const loc = match[1].trim();
    const filename = loc.split("/").pop();
    if (!filename || CORE_SITEMAPS.has(filename)) continue;

    const localPath = path.join(repoRoot, filename);
    if (!fs.existsSync(localPath)) {
      console.warn(`[generate-sitemaps] Skipping missing additional sitemap: ${filename}`);
      continue;
    }

    entries.push({
      loc,
      lastmod: String(match[2] || "").trim(),
    });
  }

  return entries;
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
  console.log(`[generate-sitemaps] Preserved additional sitemap children: ${missing.map((entry) => entry.loc).join(", ")}`);
}

const additionalSitemaps = readAdditionalSitemaps();
require("../tools/seo/generate-sitemap.js");
restoreAdditionalSitemaps(additionalSitemaps);
