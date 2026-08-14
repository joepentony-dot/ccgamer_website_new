#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const metadataPath = path.join(repoRoot, "music", "composers", "composers.json");

function fail(message) {
  console.error(`[composer-meta-cleanup] ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
  }
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanupMetaDescriptionText(value) {
  let text = String(value || "").replace(/\s+/g, " ").trim();
  const hadDanglingConjunction = /\b(?:and|with)\s*[.!?…]$/i.test(text);
  if (!hadDanglingConjunction) return text;

  text = text
    .replace(/\s+\b(?:and|with)\s*([.!?…])$/i, "$1")
    .replace(/,\s*([.!?…])$/i, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (/\bbiography\b/i.test(text) && /,\s*([^,.;!?…]+)([.!?…])$/.test(text)) {
    text = text.replace(/,\s*([^,.;!?…]+)([.!?…])$/, " and $1$2");
  }

  return text;
}

function cleanupMetaTag(html, selectorPattern) {
  return String(html || "").replace(selectorPattern, (tag) => {
    const contentMatch = tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i);
    if (!contentMatch) return tag;
    const current = decodeHtml(contentMatch[2]);
    const cleaned = cleanupMetaDescriptionText(current);
    if (cleaned === current) return tag;
    return tag.replace(contentMatch[0], `content="${htmlEscape(cleaned)}"`);
  });
}

function cleanupComposerHtml(html) {
  let next = String(html || "");
  next = cleanupMetaTag(next, /<meta\b[^>]*name\s*=\s*(["'])description\1[^>]*>/i);
  next = cleanupMetaTag(next, /<meta\b[^>]*property\s*=\s*(["'])og:description\1[^>]*>/i);
  next = cleanupMetaTag(next, /<meta\b[^>]*name\s*=\s*(["'])twitter:description\1[^>]*>/i);
  return next;
}

function cleanupAllComposerMetaDescriptions() {
  if (!fs.existsSync(metadataPath)) fail("music/composers/composers.json is missing");
  const metadata = readJson(metadataPath);
  if (!Array.isArray(metadata)) fail("Composer metadata must be an array");

  let checked = 0;
  let changed = 0;
  for (const route of metadata) {
    if (!route?.slug) continue;
    const filePath = path.join(repoRoot, "music", route.slug, "index.html");
    if (!fs.existsSync(filePath)) continue;
    checked += 1;
    const html = fs.readFileSync(filePath, "utf8");
    if (!/data-ccg-page\s*=\s*(["'])music-composer\1/i.test(html)) continue;
    const next = cleanupComposerHtml(html);
    if (next !== html) {
      fs.writeFileSync(filePath, next, "utf8");
      changed += 1;
    }
  }

  console.log(JSON.stringify({ composerMetaPagesChecked: checked, composerMetaPagesCleaned: changed }, null, 2));
  return { checked, changed };
}

if (require.main === module) cleanupAllComposerMetaDescriptions();

module.exports = {
  cleanupAllComposerMetaDescriptions,
  cleanupComposerHtml,
  cleanupMetaDescriptionText
};
