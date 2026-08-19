#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const { normaliseHtml } = require("./normalize-public-header-shell.js");

const root = path.resolve(__dirname, "..");
const failures = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(content, token, label) {
  if (!content.includes(token)) failures.push(`${label} is missing: ${token}`);
}

function forbidText(content, token, label) {
  if (content.includes(token)) failures.push(`${label} must not contain: ${token}`);
}

function changedFiles() {
  for (const range of ["origin/main...HEAD", "HEAD^...HEAD"]) {
    try {
      const output = childProcess.execFileSync(
        "git",
        ["diff", "--name-only", range],
        { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
      );
      const files = output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
      if (files.length) return files;
    } catch (error) {}
  }
  return [];
}

function readGitFile(ref, relativePath) {
  try {
    return childProcess.execFileSync(
      "git",
      ["show", `${ref}:${relativePath}`],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
  } catch (error) {
    return null;
  }
}

function isCanonicalShellMigration(relativePath) {
  if (relativePath !== "home.html") return false;

  const baseline = readGitFile("origin/main", relativePath);
  if (baseline === null) return false;

  const current = read(relativePath);
  const normalised = normaliseHtml(baseline);
  return Boolean(normalised.applicable && !normalised.malformed && normalised.html === current);
}

const page = read("install-app.html");
const moduleCode = read("js/ccg-pwa-visible-install.js");
const navCore = read("js/ccg-nav-core.js");
const css = read("resources/css/ccg-pwa-install-page.css");
const worker = read("service-worker.js");
const documentation = read("docs/phase-17b-visible-app-installation.md");
const workflow = read(".github/workflows/ccg-visible-pwa-install.yml");

requireText(page, "Install Cheeky Commodore Gamer", "Installation page heading");
requireText(page, "data-ccg-pwa-install-action", "Native installation action");
requireText(page, "Android — Chrome", "Android instructions");
requireText(page, "Windows — Chrome or Edge", "Windows instructions");
requireText(page, "iPhone or iPad — Safari", "Apple instructions");
requireText(page, "never placed in the public offline cache", "Privacy explanation");
requireText(page, 'rel="manifest"', "Manifest link");
requireText(page, 'href="https://www.cheekycommodoregamer.co.uk/install-app.html"', "Canonical URL");

requireText(moduleCode, "beforeinstallprompt", "Native prompt capture");
requireText(moduleCode, "appinstalled", "Installed-state handling");
requireText(moduleCode, "isStandalone", "Standalone-state detection");
requireText(moduleCode, "Add to Home Screen", "Apple fallback guidance");
requireText(moduleCode, "Install this site as an app", "Desktop fallback guidance");
requireText(moduleCode, "CCGPWAInstall", "Public installation controller");
requireText(moduleCode, "ccg-pwa-install-page.css", "Installation page stylesheet loader");
forbidText(moduleCode, "ensureNavigationLink", "Visible-install module navigation ownership");
forbidText(moduleCode, "data-ccg-nav-secondary", "Visible-install module navigation ownership");
forbidText(moduleCode, 'dispatchEvent(new Event("resize"))', "Visible-install module forced refit");

requireText(navCore, '["Install CCG App", "/install-app.html"]', "Permanent navigation label and route");
requireText(navCore, "data-ccg-pwa-install-nav", "Canonical install-navigation marker");
requireText(navCore, "/js/ccg-pwa-visible-install.js", "Shared visible-install loader");
requireText(navCore, "data-ccg-pwa-visible-install-loader", "Shared loader marker");

requireText(worker, '"/install-app.html"', "Offline installation guide");
requireText(worker, '"/js/ccg-pwa-visible-install.js"', "Offline installation controller");
requireText(worker, '"/resources/css/ccg-pwa-install-page.css"', "Offline installation styles");
requireText(worker, '"/admin/"', "Administrator cache exclusion");
requireText(worker, '"/community/"', "Community cache exclusion");
requireText(worker, '"/auth/"', "Authentication cache exclusion");

requireText(css, ".ccg-pwa-install-page", "Installation layout styling");
requireText(css, ".ccg-pwa-install-grid", "Instruction grid styling");
requireText(css, "prefers-reduced-motion", "Reduced-motion handling");
requireText(css, "@media print", "Print handling");

requireText(documentation, "Phase 17B", "Phase documentation");
requireText(documentation, "No account", "Privacy documentation");
requireText(workflow, "node scripts/audit-visible-pwa-install.js", "Workflow audit step");
requireText(workflow, "node --check js/ccg-pwa-visible-install.js", "Controller syntax check");

const protectedPaths = new Set([
  "index.html",
  "home.html",
  "resources/css/intro.css",
  "js/index-intro.js",
  "games/games.json"
]);

const allowedPaths = new Set([
  "install-app.html",
  "service-worker.js",
  "js/ccg-nav-core.js",
  "js/ccg-pwa-visible-install.js",
  "resources/css/ccg-pwa-install-page.css",
  "scripts/audit-visible-pwa-install.js",
  ".github/workflows/ccg-visible-pwa-install.yml",
  "docs/phase-17b-visible-app-installation.md"
]);

for (const changedPath of changedFiles()) {
  if (protectedPaths.has(changedPath) && !isCanonicalShellMigration(changedPath)) {
    failures.push(`Protected file changed: ${changedPath}`);
  }
  if (!process.env.GITHUB_ACTIONS && !allowedPaths.has(changedPath)) {
    failures.push(`Out-of-scope local Phase 17B change: ${changedPath}`);
  }
}

if (failures.length) {
  console.error("Visible PWA installation audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Visible PWA installation audit passed.");
console.log("- Install CCG App is owned by the unified shared navigation");
console.log("- The PWA helper does not append or refit public navigation");
console.log("- Android, Windows and Apple installation guidance is present");
console.log("- Native prompt and installed-state handling are present");
console.log("- Private routes remain outside public offline storage");
console.log("- A home-page change is accepted only when it exactly matches the canonical shared-shell normalizer output");
