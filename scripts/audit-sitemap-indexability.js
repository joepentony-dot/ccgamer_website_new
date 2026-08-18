#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const SITEMAP_INDEX = path.join(ROOT, "sitemap.xml");
const problems = [];
let checkedPages = 0;

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractLocs(xml) {
  return [...String(xml || "").matchAll(/<loc>([^<]+)<\/loc>/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function getAttribute(tag, name) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i");
  const match = String(tag || "").match(pattern);
  return match ? match[2].trim() : "";
}

function pageRobotsDirectives(html) {
  const directives = [];
  const tags = String(html || "").match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = getAttribute(tag, "name").toLowerCase();
    if (name !== "robots" && name !== "googlebot") continue;
    const content = getAttribute(tag, "content");
    if (content) directives.push({ name, content });
  }
  return directives;
}

function hasMetaRefresh(html) {
  const tags = String(html || "").match(/<meta\b[^>]*>/gi) || [];
  return tags.some((tag) => getAttribute(tag, "http-equiv").toLowerCase() === "refresh");
}

function resolveLocalHtml(url) {
  let pathname;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== SITE_ORIGIN) {
      problems.push(`Sitemap URL is outside the canonical origin: ${url}`);
      return null;
    }
    pathname = decodeURIComponent(parsed.pathname);
  } catch (error) {
    problems.push(`Invalid sitemap URL: ${url}`);
    return null;
  }

  if (pathname.includes("..")) {
    problems.push(`Unsafe sitemap path: ${url}`);
    return null;
  }

  if (pathname === "/") {
    const home = path.join(ROOT, "home.html");
    return fs.existsSync(home) ? home : path.join(ROOT, "index.html");
  }

  const relative = pathname.replace(/^\/+/, "");
  if (pathname.endsWith("/")) {
    return path.join(ROOT, relative, "index.html");
  }
  if (pathname.toLowerCase().endsWith(".html")) {
    return path.join(ROOT, relative);
  }

  problems.push(`Sitemap page URL is not a supported static HTML route: ${url}`);
  return null;
}

function validatePage(url, sourceSitemap) {
  const filePath = resolveLocalHtml(url);
  if (!filePath) return;

  if (!fs.existsSync(filePath)) {
    problems.push(`${sourceSitemap} references a page with no local HTML file: ${url}`);
    return;
  }

  const html = read(filePath);
  checkedPages += 1;

  for (const directive of pageRobotsDirectives(html)) {
    if (/(?:^|[,\s])noindex(?:[,\s]|$)/i.test(directive.content)) {
      problems.push(`${sourceSitemap} includes a ${directive.name}=noindex page: ${url}`);
    }
  }

  if (hasMetaRefresh(html)) {
    problems.push(`${sourceSitemap} includes a meta-refresh redirect page: ${url}`);
  }
}

function main() {
  if (!fs.existsSync(SITEMAP_INDEX)) {
    throw new Error("Missing sitemap.xml.");
  }

  const indexLocs = extractLocs(read(SITEMAP_INDEX));
  const childFiles = [];

  for (const loc of indexLocs) {
    let parsed;
    try {
      parsed = new URL(loc);
    } catch (error) {
      problems.push(`Invalid child sitemap URL: ${loc}`);
      continue;
    }

    if (parsed.origin !== SITE_ORIGIN || !/^\/sitemap-[a-z0-9-]+\.xml$/i.test(parsed.pathname)) {
      problems.push(`Invalid child sitemap reference: ${loc}`);
      continue;
    }

    const child = parsed.pathname.slice(1);
    const childPath = path.join(ROOT, child);
    if (!fs.existsSync(childPath)) {
      problems.push(`sitemap.xml references a missing child sitemap: ${child}`);
      continue;
    }
    childFiles.push(child);
  }

  for (const child of childFiles) {
    const childPath = path.join(ROOT, child);
    for (const loc of extractLocs(read(childPath))) {
      validatePage(loc, child);
    }
  }

  if (problems.length) {
    console.error("Sitemap indexability audit failed:");
    problems.forEach((problem) => console.error(` - ${problem}`));
    process.exit(1);
  }

  console.log(`Sitemap indexability audit passed (${childFiles.length} child sitemaps, ${checkedPages} sitemap page entries checked).`);
}

if (require.main === module) main();

module.exports = {
  extractLocs,
  hasMetaRefresh,
  pageRobotsDirectives,
  resolveLocalHtml,
};
