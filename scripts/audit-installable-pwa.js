#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

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

function rejectText(content, token, label) {
  if (content.toLowerCase().includes(token.toLowerCase())) {
    failures.push(`${label} must not contain: ${token}`);
  }
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

const manifestText = read("manifest.webmanifest");
const serviceWorker = read("service-worker.js");
const pwaCode = read("js/ccg-pwa.js");
const pwaCss = read("resources/css/ccg-pwa.css");
const icon = read("resources/images/ccg-app-icon.svg");
const offline = read("offline.html");
const navCore = read("js/ccg-nav-core.js");
const workflow = read(".github/workflows/ccg-installable-pwa.yml");
const documentation = read("docs/phase-17-installable-pwa.md");

let manifest = null;
try {
  manifest = JSON.parse(manifestText);
} catch (error) {
  failures.push(`manifest.webmanifest is not valid JSON: ${error.message}`);
}

if (manifest) {
  if (!manifest.name && !manifest.short_name) failures.push("Manifest requires name or short_name");
  if (manifest.id !== "/") failures.push("Manifest id must remain stable at /");
  if (manifest.scope !== "/") failures.push("Manifest scope must be /");
  if (!String(manifest.start_url || "").startsWith("/home.html")) failures.push("Manifest start_url must use home.html");
  if (manifest.display !== "standalone") failures.push("Manifest display must be standalone");
  if (manifest.prefer_related_applications !== false) failures.push("Manifest prefer_related_applications must be false");
  if (!Array.isArray(manifest.icons) || !manifest.icons.length) failures.push("Manifest icons are missing");

  const declaredSizes = new Set((manifest.icons || []).flatMap((entry) => String(entry.sizes || "").split(/\s+/)));
  if (!declaredSizes.has("192x192")) failures.push("Manifest 192x192 icon declaration is missing");
  if (!declaredSizes.has("512x512")) failures.push("Manifest 512x512 icon declaration is missing");
  if (!declaredSizes.has("any")) failures.push("Manifest scalable icon declaration is missing");
  if (!(manifest.shortcuts || []).some((entry) => String(entry.url || "").startsWith("/games/"))) {
    failures.push("Manifest game shortcut is missing");
  }
}

requireText(icon, "viewBox=\"0 0 1024 1024\"", "Scalable square app icon");
requireText(icon, "<title", "App icon accessible title");
requireText(icon, "CCG", "App icon brand lettering");

requireText(navCore, "/js/ccg-pwa.js", "Shared PWA loader");
requireText(navCore, "data-ccg-pwa-loader", "Shared PWA loader marker");

requireText(pwaCode, "beforeinstallprompt", "Install prompt capture");
requireText(pwaCode, "appinstalled", "Installed-state handling");
requireText(pwaCode, "navigator.serviceWorker.register", "Service worker registration");
requireText(pwaCode, "updateViaCache: \"none\"", "Service worker update policy");
requireText(pwaCode, "SKIP_WAITING", "Controlled update activation");
requireText(pwaCode, "isPrivateArea", "Private-area UI exclusion");
requireText(pwaCode, "INSTALL_DELAY = 9000", "Restrained install prompt delay");
requireText(pwaCode, "visits < 2", "Repeat-visit install threshold");
requireText(pwaCode, "apple-mobile-web-app-capable", "iOS install metadata");
requireText(pwaCode, "Add to Home Screen", "iOS install guidance");
requireText(pwaCode, "navigator.onLine", "Network-state handling");

requireText(serviceWorker, "PRIVATE_PATH_PREFIXES", "Service worker private path exclusions");
requireText(serviceWorker, '"/admin/"', "Administrator cache exclusion");
requireText(serviceWorker, '"/community/"', "Member-area cache exclusion");
requireText(serviceWorker, '"/auth/"', "Authentication cache exclusion");
requireText(serviceWorker, "request.headers.has(\"authorization\")", "Authorisation cache exclusion");
requireText(serviceWorker, "cacheControl.includes(\"no-store\")", "No-store response exclusion");
requireText(serviceWorker, "cacheControl.includes(\"private\")", "Private response exclusion");
requireText(serviceWorker, "vary.includes(\"cookie\")", "Cookie-varying response exclusion");
requireText(serviceWorker, "request.mode === \"navigate\"", "Navigation fallback strategy");
requireText(serviceWorker, "staleWhileRevalidate", "Public data update strategy");
requireText(serviceWorker, "cacheFirstAsset", "Static asset strategy");
requireText(serviceWorker, 'const OFFLINE_URL = "/offline.html"', "Offline fallback");
requireText(serviceWorker, "navigationPreload.enable", "Navigation preload");
requireText(serviceWorker, "CLEAR_PUBLIC_CACHES", "Public cache reset control");
rejectText(serviceWorker, "supabase.co", "Service worker");
rejectText(serviceWorker, "self.skipWaiting();\n  event.waitUntil(precache", "Automatic update activation");

requireText(offline, "CCG Offline", "Offline page title");
requireText(offline, "No connection", "Offline status message");
requireText(offline, 'href="/games/"', "Offline Games link");
requireText(offline, 'href="/games/discover/"', "Offline game-finder link");
requireText(offline, 'rel="manifest"', "Offline manifest link");

requireText(pwaCss, ".ccg-pwa-panel", "Install/update panel styling");
requireText(pwaCss, ".ccg-pwa-network", "Network notice styling");
requireText(pwaCss, "prefers-reduced-motion", "Reduced-motion styling");
requireText(pwaCss, "@media print", "Print exclusion");

requireText(workflow, "node --check service-worker.js", "Service worker syntax validation");
requireText(workflow, "node scripts/audit-installable-pwa.js", "PWA audit step");
requireText(documentation, "Phase 17", "Phase documentation");
requireText(documentation, "No private pages", "Private cache documentation");
requireText(documentation, "SVG", "Icon-format documentation");

const protectedPaths = new Set([
  "index.html",
  "home.html",
  "resources/css/intro.css",
  "js/index-intro.js",
  "games/games.json"
]);

const allowedPaths = new Set([
  "manifest.webmanifest",
  "service-worker.js",
  "offline.html",
  "js/ccg-pwa.js",
  "js/ccg-nav-core.js",
  "resources/css/ccg-pwa.css",
  "resources/images/ccg-app-icon.svg",
  "scripts/audit-installable-pwa.js",
  ".github/workflows/ccg-installable-pwa.yml",
  "docs/phase-17-installable-pwa.md"
]);

for (const changedPath of changedFiles()) {
  if (protectedPaths.has(changedPath)) failures.push(`Protected file changed: ${changedPath}`);
  if (!process.env.GITHUB_ACTIONS && !allowedPaths.has(changedPath)) {
    failures.push(`Out-of-scope local Phase 17 change: ${changedPath}`);
  }
}

if (failures.length) {
  console.error("Installable PWA audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Installable PWA audit passed.");
console.log("- Manifest, scalable icon, shortcuts and standalone launch are present");
console.log("- Public offline shell and navigation fallback are present");
console.log("- Administrator, member and authentication routes are excluded from caching");
console.log("- Install prompts require repeat engagement and updates require user action");
