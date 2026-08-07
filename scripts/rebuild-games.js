#!/usr/bin/env node

"use strict";

const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");

const steps = [
  ["validate-games-source.js"],
  ["build-games.js"],
  ["prepare-seo-game-routes.js", "--output-root", "."],
  ["generate-publisher-pages.js"],
  ["apply-publisher-logos.js"],
  ["validate-publisher-logo-output.js"],
  ["generate-developer-pages.js"],
  ["generate-composer-pages.js"],
  ["generate-year-platform-pages.js"],
  ["integrate-year-platform-discovery.js"],
  ["generate-downloads-page.js"],
  ["update-downloads-static-pages.js"],
  ["generate-sitemaps.js"],
  ["validate-sitemaps.js"],
  ["verify-seo.mjs"],
  ["validate-seo-game-routes.js", "--root", "."],
  ["validate-year-platform-discovery.js"],
];

function fail(message) {
  console.error(`[rebuild-games] ${message}`);
  process.exit(1);
}

function runNodeScript(scriptName, args = []) {
  const scriptPath = path.join(__dirname, scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, CCG_REPO_ROOT: repoRoot },
  });
  if (result.status !== 0) fail(`${scriptName} failed with status ${result.status ?? 1}.`);
}

function main() {
  console.log(`[rebuild-games] Publishing from ${repoRoot}`);
  for (const [scriptName, ...args] of steps) runNodeScript(scriptName, args);
  console.log(`[rebuild-games] Complete publishing chain passed (${steps.length} steps).`);
}

if (require.main === module) main();

module.exports = { steps };
