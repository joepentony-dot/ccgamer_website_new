#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const presentation = require("./normalize-composer-presentation");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const metadataPath = path.join(repoRoot, "music", "composers", "composers.json");

function fail(message) {
  console.error(`[composer-presentation-sync] ${message}`);
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
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeText(value) {
  return decodeHtml(String(value ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function extractMetaDescription(html) {
  const tag = html.match(/<meta\b[^>]*\bname\s*=\s*(["'])description\1[^>]*>/i);
  if (!tag) return "";
  const content = tag[0].match(/\bcontent\s*=\s*(["'])(.*?)\1/i);
  return content ? decodeHtml(content[2]) : "";
}

function extractClassText(html, className, tagName = "[a-z0-9]+") {
  const pattern = new RegExp(
    `<${tagName}\\b[^>]*class\\s*=\\s*(["'])[^"']*\\b${className}\\b[^"']*\\1[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    "i"
  );
  const match = html.match(pattern);
  return match ? normalizeText(match[2]) : "";
}

function hasResearchProcessCopy(text) {
  const value = String(text || "");
  return /\bprecise public birth date\b/i.test(value)
    || /\bintentionally omitted\b/i.test(value)
    || /\bpublished sources? (?:disagree|conflict)\b/i.test(value)
    || /\breliable biographical sources?\b/i.test(value)
    || /\breliable public birth details?\b/i.test(value)
    || /\bpublic (?:personal )?biographical (?:information|material)\b/i.test(value)
    || /\bsurviving public biographical information\b/i.test(value)
    || /\bprofile (?:concentrates|focuses|avoids)\b/i.test(value);
}

function hasObsoleteArchiveFiller(text) {
  const value = String(text || "");
  return /represented in the Cheeky Commodore Gamer archive/i.test(value)
    || /represented in the CCG archive/i.test(value)
    || /In the Cheeky Commodore Gamer archive/i.test(value)
    || /In the CCG archive/i.test(value)
    || /music-credit games in the CCG archive/i.test(value)
    || /\bCCG-linked credits?\b/i.test(value)
    || /\bCCG music credits?\b/i.test(value);
}

function validateRoute(route, problems) {
  if (!route || !route.slug || !route.name) return;

  const count = Number(route.count);
  if (!Number.isInteger(count) || count < 0) {
    problems.push(`${route.slug}: invalid metadata count ${route.count}`);
    return;
  }

  const filePath = path.join(repoRoot, "music", route.slug, "index.html");
  if (!fs.existsSync(filePath)) {
    problems.push(`${route.slug}: composer page is missing`);
    return;
  }

  const html = fs.readFileSync(filePath, "utf8");
  const text = normalizeText(html);
  const expectedTitle = `${route.name} — Game Music`;
  const expectedMusicHeading = `${route.name} Music`;
  const title = extractClassText(html, "ccg-composer-title", "h1");
  const musicHeading = Array.from(html.matchAll(/<h2\b[^>]*class\s*=\s*(["'])[^"']*\bccg-composer-section-title\b[^"']*\1[^>]*>([\s\S]*?)<\/h2>/gi))
    .map((match) => normalizeText(match[2]))
    .find((value) => value !== "Browse other featured composers") || "";

  if (title !== expectedTitle) {
    problems.push(`${route.slug}: heading is "${title || "missing"}" instead of "${expectedTitle}"`);
  }
  if (musicHeading !== expectedMusicHeading) {
    problems.push(`${route.slug}: music section heading is "${musicHeading || "missing"}" instead of "${expectedMusicHeading}"`);
  }
  if (/\bccg-composer-profile__facts\b/i.test(html)) {
    problems.push(`${route.slug}: linked-credit count is still rendered in the composer profile`);
  }
  if (/\bccg-composer-profile__platform\b/i.test(html)) {
    problems.push(`${route.slug}: catalogue platform is still rendered as a composer identity fact`);
  }
  if (/\bccg-composer-subtitle\b/i.test(html)) {
    problems.push(`${route.slug}: catalogue-count subtitle is still rendered`);
  }
  if (/\bGames featuring\b/i.test(text) || /\bGames matching\b/i.test(text)) {
    problems.push(`${route.slug}: old game-centric section heading is still present`);
  }
  if (/\b\d+ linked game credits?\b/i.test(text)) {
    problems.push(`${route.slug}: linked-game count is still visible as composer copy`);
  }
  if (hasObsoleteArchiveFiller(text)) {
    problems.push(`${route.slug}: obsolete CCG/archive biography language is still present`);
  }
  if (hasResearchProcessCopy(text)) {
    problems.push(`${route.slug}: research-process commentary is still visible`);
  }
  if (!html.includes('/js/composer-presentation-runtime.js')) {
    problems.push(`${route.slug}: composer presentation runtime guard is missing`);
  }

  const description = extractMetaDescription(html);
  if (!description) {
    problems.push(`${route.slug}: meta description is missing`);
  }
  if (/\bsource references\b/i.test(description) || /\bCheeky Commodore Gamer archive\b/i.test(description)) {
    problems.push(`${route.slug}: meta description still contains research/archive filler`);
  }
}

function main() {
  if (!fs.existsSync(metadataPath)) fail("music/composers/composers.json is missing");
  const metadata = readJson(metadataPath);
  if (!Array.isArray(metadata)) fail("Composer metadata must be an array");

  const normalized = presentation.normalizeAllComposerPages();
  const problems = [];
  metadata.forEach((route) => validateRoute(route, problems));

  if (problems.length) {
    fail(`Composer presentation synchronization failed:\n${problems.map((item) => `- ${item}`).join("\n")}`);
  }

  const totalCredits = metadata.reduce((sum, route) => sum + (Number(route?.count) || 0), 0);
  console.log(JSON.stringify({
    composerRoutesChecked: metadata.length,
    catalogueCreditsRetainedInternally: totalCredits,
    presentationFilesNormalized: normalized.changed,
    status: "synchronized"
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  extractClassText,
  extractMetaDescription,
  hasObsoleteArchiveFiller,
  hasResearchProcessCopy,
  normalizeText,
  validateRoute
};
