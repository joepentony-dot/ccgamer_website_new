#!/usr/bin/env node

"use strict";

const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");

const steps = [
  ["validate-games-source.js"],
  ["build-game-description-enrichments.js"],
  ["audit-game-manuals.js"],
  ["build-magazine-review-chunks.js"],
  ["build-games.js"],
  ["ensure-magazine-review-runtime.js"],
  ["prepare-seo-game-routes.js", "--output-root", "."],
  ["prepare-seo-genre-links.js", "--root", "."],
  ["validate-secondary-publisher-credits.js"],
  ["apply-publisher-evidence-overrides.js"],
  ["generate-publisher-pages.js"],
  ["apply-publisher-logos.js"],
  ["validate-publisher-logo-output.js"],
  ["materialize-publisher-histories.js"],
  ["ensure-publisher-history-runtime.js"],
  ["audit-publisher-seo-evidence.js"],
  ["audit-rerelease-publishers.js"],
  ["generate-developer-pages.js"],
  ["generate-composer-pages.js"],
  ["generate-year-platform-pages.js"],
  ["integrate-year-platform-discovery.js"],
  ["generate-video-seo.js"],
  ["generate-video-library.js"],
  ["ensure-secondary-publisher-runtime.js"],
  ["generate-downloads-page.js"],
  ["update-downloads-static-pages.js"],
  ["validate-downloads-page.js"],
  ["generate-sitemaps.js"],
  ["validate-sitemaps.js"],
  ["validate-video-seo.js"],
  ["validate-video-library.js"],
  ["verify-seo.mjs"],
  ["validate-seo-game-routes.js", "--root", "."],
  ["validate-seo-genre-links.js", "--root", "."],
  ["validate-year-platform-discovery.js"],
  ["ensure-magazine-review-runtime.js", "--check"],
  ["ensure-secondary-publisher-runtime.js", "--check"],
  ["ensure-publisher-history-runtime.js", "--check"],
  ["validate-downloads-page.js"],
];

function fail(message) {
  console.error(`[rebuild-games] ${message}`);
  if (process.env.GITHUB_ACTIONS === "true") {
    const safeMessage = String(message || "Reliable Games Publishing failed")
      .replace(/%/g, "%25")
      .replace(/\r/g, "%0D")
      .replace(/\n/g, "%0A");
    console.error(`::error title=Reliable Games Publishing::${safeMessage}`);
  }
  process.exit(1);
}

function runNodeScript(scriptName, args = []) {
  const scriptPath = path.join(__dirname, scriptName);
  console.log(`[rebuild-games] START ${scriptName}${args.length ? ` ${args.join(" ")}` : ""}`);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, CCG_REPO_ROOT: repoRoot },
  });
  if (result.status !== 0) fail(`${scriptName} failed with status ${result.status ?? 1}.`);
  console.log(`[rebuild-games] PASS ${scriptName}`);
}

function main() {
  console.log(`[rebuild-games] Publishing from ${repoRoot}`);
  for (const [scriptName, ...args] of steps) runNodeScript(scriptName, args);
  console.log(`[rebuild-games] Complete publishing chain passed (${steps.length} steps).`);
}

if (require.main === module) main();

module.exports = { steps };
