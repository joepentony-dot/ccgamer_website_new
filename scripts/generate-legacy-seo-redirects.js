#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const MARKER = 'data-ccg-legacy-seo-redirect="true"';
const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const configPath = path.join(repoRoot, "data", "seo-legacy-redirects.json");

function fail(message) {
  throw new Error("[legacy-seo-redirects] " + message);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\x27/g, "&#39;");
}

function normalizeSourcePath(value) {
  const source = String(value || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!source || source.includes("..") || /[?#]/.test(source) || !source.endsWith(".html")) {
    fail("Invalid redirect source path: " + value);
  }
  return source;
}

function normalizeTargetPath(value) {
  const target = String(value || "").trim();
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("..") || /[?#]/.test(target)) {
    fail("Invalid redirect target path: " + value);
  }
  return target;
}

function loadRedirects(root = repoRoot) {
  const filePath = path.join(root, "data", "seo-legacy-redirects.json");
  if (!fs.existsSync(filePath)) fail("Missing data/seo-legacy-redirects.json.");
  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail("Could not parse redirect config: " + error.message);
  }
  if (!Array.isArray(entries)) fail("Redirect config must be an array.");

  const seen = new Set();
  return entries.map((entry, index) => {
    const source = normalizeSourcePath(entry && entry.source);
    const target = normalizeTargetPath(entry && entry.target);
    const title = String((entry && entry.title) || "Moved page").trim();
    if (!title) fail("Redirect entry " + (index + 1) + " has no title.");
    if (seen.has(source)) fail("Duplicate redirect source: " + source);
    seen.add(source);
    return { source, target, title };
  });
}

function renderRedirect(entry) {
  const target = normalizeTargetPath(entry.target);
  const canonical = SITE_ORIGIN + target;
  const title = String(entry.title || "Moved page").trim();
  const jsTarget = JSON.stringify(target);
  return [
    "<!DOCTYPE html>",
    '<html lang="en" ' + MARKER + ">",
    "<head>",
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <meta name="robots" content="noindex,follow">',
    '  <meta http-equiv="refresh" content="0; url=' + escapeHtml(target) + '">',
    "  <script>",
    "    (function () {",
    "      try {",
    "        window.location.replace(" + jsTarget + " + window.location.search + window.location.hash);",
    "      } catch (error) {}",
    "    })();",
    "  </script>",
    "  <title>" + escapeHtml(title) + " | Cheeky Commodore Gamer</title>",
    '  <link rel="canonical" href="' + escapeHtml(canonical) + '">',
    "</head>",
    "<body>",
    '  <p>This page has moved to <a href="' + escapeHtml(target) + '">' + escapeHtml(title) + "</a>.</p>",
    "</body>",
    "</html>",
    ""
  ].join("\n");
}

function writeIfChanged(filePath, content) {
  const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (previous === content) return false;
  if (previous !== null && !previous.includes(MARKER)) {
    fail("Refusing to overwrite non-generated file: " + path.relative(repoRoot, filePath));
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

function run(options = {}) {
  const root = path.resolve(options.root || repoRoot);
  const entries = loadRedirects(root);
  let writes = 0;
  for (const entry of entries) {
    const filePath = path.join(root, entry.source);
    if (writeIfChanged(filePath, renderRedirect(entry))) writes += 1;
  }
  return { entries: entries.length, writes };
}

function main() {
  const result = run();
  console.log("[legacy-seo-redirects] Redirects checked: " + result.entries);
  console.log("[legacy-seo-redirects] Files written: " + result.writes);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  MARKER,
  SITE_ORIGIN,
  loadRedirects,
  normalizeSourcePath,
  normalizeTargetPath,
  renderRedirect,
  run
};
