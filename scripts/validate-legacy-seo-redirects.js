#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { MARKER, SITE_ORIGIN, loadRedirects } = require("./generate-legacy-seo-redirects");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) throw new Error("[validate-legacy-seo-redirects] " + message);
}

function targetFilePath(root, target) {
  const relative = String(target).replace(/^\/+/, "");
  if (!relative) return path.join(root, "home.html");
  if (target.endsWith("/")) return path.join(root, relative, "index.html");
  return path.join(root, relative);
}

function readSeo(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const robots = (html.match(/<meta\b[^>]*name=["\x27]robots["\x27][^>]*content=["\x27]([^"\x27]+)["\x27]/i) || [])[1] || "";
  const canonical = (html.match(/<link\b[^>]*rel=["\x27]canonical["\x27][^>]*href=["\x27]([^"\x27]+)["\x27]/i) || [])[1] || "";
  const redirects = /http-equiv=["\x27]refresh["\x27]/i.test(html) || /window\.location\.replace\s*\(/i.test(html);
  return { html, robots, canonical, redirects };
}

function main() {
  const entries = loadRedirects(repoRoot);
  const sitemapFiles = ["sitemap-pages.xml", "sitemap-games.xml"];
  const sitemaps = sitemapFiles
    .filter((name) => fs.existsSync(path.join(repoRoot, name)))
    .map((name) => fs.readFileSync(path.join(repoRoot, name), "utf8"))
    .join("\n");

  for (const entry of entries) {
    const sourceFile = path.join(repoRoot, entry.source);
    assert(fs.existsSync(sourceFile), entry.source + " was not generated.");
    const source = readSeo(sourceFile);
    assert(source.html.includes(MARKER), entry.source + " is missing the generated redirect marker.");
    assert(/(?:^|,)\s*noindex(?:,|$)/i.test(source.robots), entry.source + " must remain noindex.");
    assert(source.redirects, entry.source + " must redirect.");
    assert(source.canonical === SITE_ORIGIN + entry.target, entry.source + " canonical target is incorrect.");

    const targetFile = targetFilePath(repoRoot, entry.target);
    assert(fs.existsSync(targetFile), entry.source + " targets a missing file: " + entry.target);
    const target = readSeo(targetFile);
    assert(!/\bnoindex\b/i.test(target.robots), entry.source + " targets a noindex page: " + entry.target);

    const sourceUrl = SITE_ORIGIN + "/" + entry.source.replace(/index\.html$/, "");
    assert(!sitemaps.includes("<loc>" + sourceUrl + "</loc>"), entry.source + " leaked into a sitemap.");
  }

  assert(!entries.some((entry) => entry.source.toLowerCase() === "this" || entry.source.toLowerCase() === "this/index.html"),
    "The malformed historical /This URL must remain a genuine 404, not a fabricated redirect.");

  console.log("[validate-legacy-seo-redirects] PASS — " + entries.length + " legacy routes point directly to live indexable canonical pages.");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { readSeo, targetFilePath };
