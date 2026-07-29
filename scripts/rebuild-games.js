#!/usr/bin/env node

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const pythonCommand = process.env.PYTHON || "python";
const suppliedBaselineDir = String(process.env.CCG_BASELINE_DIR || "").trim();
let baselineDir = suppliedBaselineDir ? path.resolve(suppliedBaselineDir) : "";
let temporaryBaselineDir = "";

function fail(message) {
  console.error(`[rebuild-games] ${message}`);
  process.exit(1);
}

function run(command, args = [], options = {}) {
  const label = options.label || `${command} ${args.join(" ")}`.trim();
  console.log(`\n[rebuild-games] ${label}`);
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, ...(options.env || {}) },
  });
  if (result.error) fail(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) fail(`${label} failed with status ${result.status ?? 1}.`);
}

function nodeScript(scriptName, args = [], options = {}) {
  run(process.execPath, [path.join(__dirname, scriptName), ...args], {
    ...options,
    label: options.label || `node scripts/${scriptName}${args.length ? ` ${args.join(" ")}` : ""}`,
  });
}

function pythonScript(scriptName, args = [], options = {}) {
  run(pythonCommand, [path.join(__dirname, scriptName), ...args], {
    ...options,
    label: options.label || `${pythonCommand} scripts/${scriptName}${args.length ? ` ${args.join(" ")}` : ""}`,
  });
}

function baselineFile(name) {
  return baselineDir ? path.join(baselineDir, name) : "";
}

function ensureBaselineSnapshot() {
  if (baselineDir) return;
  temporaryBaselineDir = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-game-publish-baseline-"));
  baselineDir = temporaryBaselineDir;
  const mappings = [
    ["games/games.json", "games.json"],
    ["tools/seo/static-pages.json", "static-pages.json"],
    ["sitemap.xml", "sitemap.xml"],
    ["sitemap-pages.xml", "sitemap-pages.xml"],
    ["sitemap-games.xml", "sitemap-games.xml"],
  ];
  mappings.forEach(([relative, name]) => {
    const source = path.join(repoRoot, relative);
    if (!fs.existsSync(source)) fail(`Cannot snapshot missing publishing baseline: ${relative}`);
    fs.copyFileSync(source, path.join(baselineDir, name));
  });
  console.log(`[rebuild-games] Created local publishing baseline: ${baselineDir}`);
}

function cleanupBaselineSnapshot() {
  if (temporaryBaselineDir) fs.rmSync(temporaryBaselineDir, { recursive: true, force: true });
}

function validateSourceCatalogue() {
  const args = ["--source-only"];
  const baselineGames = baselineFile("games.json");
  if (baselineGames) args.push("--baseline-games", baselineGames);
  nodeScript("validate-game-catalogue.js", args, { label: "Validate source game catalogue" });
}

function validateYearPlatformOutput() {
  const args = [];
  const mappings = [
    ["--baseline-static-pages", "static-pages.json"],
    ["--baseline-sitemap-index", "sitemap.xml"],
    ["--baseline-sitemap-pages", "sitemap-pages.xml"],
    ["--baseline-sitemap-games", "sitemap-games.xml"],
  ];
  mappings.forEach(([option, name]) => {
    const filePath = baselineFile(name);
    if (filePath) args.push(option, filePath);
  });
  nodeScript("validate-year-platform-discovery.js", args, { label: "Validate year and platform discovery" });
}

function validateInternalLinks() {
  if (process.env.CCG_SKIP_INTERNAL_LINK_AUDIT === "1") {
    console.log("[rebuild-games] Internal-link audit skipped by CCG_SKIP_INTERNAL_LINK_AUDIT=1.");
    return;
  }
  const stamp = `${process.pid}-${Date.now()}`;
  const jsonOutput = path.join(os.tmpdir(), `ccg-game-publish-links-${stamp}.json`);
  const reportOutput = path.join(os.tmpdir(), `ccg-game-publish-links-${stamp}.md`);
  pythonScript("phase5a_internal_link_audit.py", [
    "--json-output", jsonOutput,
    "--report-output", reportOutput,
  ], { label: "Audit generated internal links" });
  pythonScript("validate-game-publishing-link-audit.py", [jsonOutput], {
    label: "Reject game publishing link regressions",
  });
}

function publishGames() {
  ensureBaselineSnapshot();
  validateSourceCatalogue();

  nodeScript("build-games.js", [], {
    label: "Build game index, search data, canonical wrappers and legacy redirects",
    env: { CCG_DEFER_SEO_VERIFY: "1" },
  });
  nodeScript("generate-publisher-pages.js", [], { label: "Generate publisher archives" });
  nodeScript("apply-publisher-logos.js", [], { label: "Apply publisher archive logos" });
  nodeScript("generate-developer-pages.js", [], { label: "Generate developer archives" });
  nodeScript("generate-composer-pages.js", [], { label: "Generate composer archives" });
  nodeScript("generate-year-platform-pages.js", [], { label: "Generate year and platform archives" });
  nodeScript("integrate-year-platform-discovery.js", [], { label: "Integrate year and platform discovery" });
  nodeScript("generate-downloads-page.js", [], { label: "Generate downloads archive" });
  nodeScript("update-downloads-static-pages.js", [], { label: "Update downloads registry entries" });
  nodeScript("generate-sitemaps.js", [], { label: "Generate all sitemaps" });
  nodeScript("preserve-sitemap-lastmods.js", [baselineDir], { label: "Preserve historical sitemap modification dates" });

  nodeScript("validate-game-catalogue.js", [], { label: "Validate generated game catalogue outputs" });
  nodeScript("validate-sitemaps.js", [], { label: "Validate generated sitemaps" });
  validateYearPlatformOutput();
  pythonScript("validate_structured_data.py", [], { label: "Validate structured data" });
  nodeScript("verify-seo.mjs", [], { label: "Run final SEO verification" });
  validateInternalLinks();

  console.log("\n[rebuild-games] Full game publishing pipeline completed successfully.");
}

try {
  publishGames();
} finally {
  cleanupBaselineSnapshot();
}
