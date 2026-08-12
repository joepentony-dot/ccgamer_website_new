#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
// This metadata is regenerated from the current games catalogue before sitemap output.
const metadataPath = path.join(repoRoot, "music", "composers", "composers.json");

function fail(message) {
  console.error(`[composer-count-sync] ${message}`);
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

function extractProfileFacts(html) {
  const match = html.match(/<p\b[^>]*class\s*=\s*(["'])[^"']*\bccg-composer-profile__facts\b[^"']*\1[^>]*>([\s\S]*?)<\/p>/i);
  return match ? normalizeText(match[2]) : "";
}

function validateRoute(route, problems) {
  if (!route || !route.slug) return;

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
  const creditWord = count === 1 ? "credit" : "credits";
  const expectedFacts = `${count} linked game ${creditWord}`;
  const profileFacts = extractProfileFacts(html);

  if (profileFacts !== expectedFacts) {
    problems.push(`${route.slug}: profile shows "${profileFacts || "missing"}" but metadata requires "${expectedFacts}"`);
  }

  const description = extractMetaDescription(html);
  if (!description) {
    problems.push(`${route.slug}: meta description is missing`);
  } else if (!new RegExp(`\\b${count}\\s+linked\\b`, "i").test(description)) {
    problems.push(`${route.slug}: meta description does not contain the current linked-credit count ${count}`);
  }

  if (count === 1) {
    if (!/represented in the Cheeky Commodore Gamer archive by one recorded\b/i.test(text)) {
      problems.push(`${route.slug}: archive summary does not reflect its single current credit`);
    }
  } else {
    const summaryPattern = new RegExp(`linked to\\s+${count}\\s+recorded game-music credits\\b`, "i");
    if (!summaryPattern.test(text)) {
      problems.push(`${route.slug}: archive summary does not reflect the current count ${count}`);
    }
  }
}

function main() {
  if (!fs.existsSync(metadataPath)) fail("music/composers/composers.json is missing");
  const metadata = readJson(metadataPath);
  if (!Array.isArray(metadata)) fail("Composer metadata must be an array");

  const problems = [];
  metadata.forEach((route) => validateRoute(route, problems));

  if (problems.length) {
    fail(`Composer count synchronization failed:\n${problems.map((item) => `- ${item}`).join("\n")}`);
  }

  const totalCredits = metadata.reduce((sum, route) => sum + (Number(route?.count) || 0), 0);
  console.log(JSON.stringify({
    composerRoutesChecked: metadata.length,
    linkedGameCreditsChecked: totalCredits,
    status: "synchronized"
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  extractMetaDescription,
  extractProfileFacts,
  normalizeText,
  validateRoute
};
