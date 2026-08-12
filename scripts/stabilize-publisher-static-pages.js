#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");
const PUBLISHER_PREFIX = "games/publishers/";
const INSERT_BEFORE = ["games/downloads/index.html", "games/developers/"];

function fail(message) {
  console.error(`[publisher-static-pages] ${message}`);
  process.exit(1);
}

function isPublisherEntry(value) {
  return typeof value === "string" && value.replace(/^\/+/, "").startsWith(PUBLISHER_PREFIX);
}

function dedupe(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function insertionIndex(values) {
  const index = values.findIndex((entry) => (
    entry === INSERT_BEFORE[0] || entry.startsWith(INSERT_BEFORE[1])
  ));
  return index === -1 ? values.length : index;
}

function main() {
  if (!fs.existsSync(staticPagesPath)) {
    fail("Missing tools/seo/static-pages.json");
  }

  let current;
  try {
    current = JSON.parse(fs.readFileSync(staticPagesPath, "utf8"));
  } catch (error) {
    fail(`Could not parse tools/seo/static-pages.json: ${error.message}`);
  }

  if (!Array.isArray(current)) {
    fail("tools/seo/static-pages.json must contain an array");
  }

  const publishers = dedupe(current.filter(isPublisherEntry));
  if (!publishers.length || publishers[0] !== "games/publishers/index.html") {
    fail("Publisher sitemap eligibility block is missing its index route");
  }

  const others = dedupe(current.filter((entry) => !isPublisherEntry(entry)));
  const withoutRoot = others.filter((entry) => entry !== "");
  const base = ["", ...withoutRoot];
  const at = insertionIndex(base);
  const next = [
    ...base.slice(0, at),
    ...publishers,
    ...base.slice(at)
  ];

  const output = `${JSON.stringify(next, null, 2)}\n`;
  const previous = fs.readFileSync(staticPagesPath, "utf8");
  if (previous === output) {
    console.log("[publisher-static-pages] Static page ordering already matches the authoritative archive layout.");
    return;
  }

  fs.writeFileSync(staticPagesPath, output, "utf8");
  console.log(`[publisher-static-pages] Stabilized ${publishers.length} publisher sitemap entries without reordering unrelated archive groups.`);
}

if (require.main === module) main();
