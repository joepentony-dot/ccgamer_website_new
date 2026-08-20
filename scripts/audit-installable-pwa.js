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
const launchPage = read("app-launch.html");
const launchCode = read("js/ccg-app-launch.js");
const launchCss = read("resources/css/ccg-app-launch.css");
const icon = read("resources/images/ccg-app-icon-v2.svg");
const maskableIcon = read("resources/images/ccg-app-icon-maskable-v2.svg");
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
  if (!String(manifest.start_url || "").startsWith("/app-launch.html")) {
    failures.push("Manifest start_url must use the dedicated app launch page");
  }
  if (manifest.display !== "standalone") failures.push("Manifest display must be standalone");
  if (manifest.background_color !== "#020711") failures.push("Manifest launch background must use CCG dark navy");
  if (manifest.theme_color !== "#020711") failures.push("Manifest theme colour must match the CCG launch background");
  if (manifest.prefer_related_applications !== false) failures.push("Manifest prefer_related_applications must be false");
  if (!Array.isArray(manifest.icons) || !manifest.icons.length) failures.push("Manifest icons are missing");

  const icons = manifest.icons || [];
  const anyIcons = icons.filter((entry) => String(entry.purpose || "any").split(/\s+/).includes("any"));
  const maskableIcons = icons.filter((entry) => String(entry.purpose || "").split(/\s+/).includes("maskable"));
  const anySizes = new Set(anyIcons.flatMap((entry) => String(entry.sizes || "").split(/\s+/)));

  if (!anySizes.has("192x192")) failures.push("Manifest 192x192 launcher icon declaration is missing");
  if (!anySizes.has("512x512")) failures.push("Manifest 512x512 launcher icon declaration is missing");
  if (!anyIcons.every((entry) => entry.src === "/resources/images/ccg-app-icon-v2.svg")) {
    failures.push("Manifest standard launcher icons must use the versioned v2 artwork");
  }
  if (!maskableIcons.some((entry) => entry.src === "/resources/images/ccg-app-icon-maskable-v2.svg")) {
    failures.push("Manifest maskable launcher icon must use the dedicated v2 safe-area artwork");
  }
  if (manifestText.includes("/resources/images/ccg-app-icon.svg")) {
    failures.push("Manifest must not reference the legacy blurred app icon");
  }
  if (!(manifest.shortcuts || []).some((entry) => String(entry.url || "").startsWith("/games/"))) {
    failures.push("Manifest game shortcut is missing");
  }
}

requireText(icon, "viewBox=\"0 0 1024 1024\"", "Versioned square app icon");
requireText(icon, "<title", "Versioned app icon accessible title");
requireText(icon, "CCG", "Versioned app icon brand lettering");
rejectText(icon, "feGaussianBlur", "Versioned app icon");
rejectText(icon, "<filter", "Versioned app icon");

requireText(maskableIcon, "viewBox=\"0 0 1024 1024\"", "Maskable app icon");
requireText(maskableIcon, "maskable", "Maskable app icon description");
requireText(maskableIcon, "CCG", "Maskable app icon brand lettering");
rejectText(maskableIcon, "feGaussianBlur", "Maskable app icon");
rejectText(maskableIcon, "<filter", "Maskable app icon");

requireText(launchPage, 'data-ccg-page="app-launch"', "App launch document identity");
requireText(launchPage, 'meta name="theme-color" content="#020711"', "App launch theme colour");
requireText(launchPage, 'rel="manifest" href="/manifest.webmanifest"', "App launch manifest");
requireText(launchPage, "/resources/images/ccg-app-icon-v2.svg", "App launch artwork");
requireText(launchPage, "/resources/css/ccg-app-launch.css", "App launch stylesheet");
requireText(launchPage, "/js/ccg-app-launch.js", "App launch handoff script");
requireText(launchPage, "Stay a while, stay forever!", "App launch slogan");
requireText(launchPage, ">C64<", "App launch C64 identity");
requireText(launchPage, ">Amiga<", "App launch Amiga identity");
requireText(launchPage, "/home.html?source=pwa", "App launch direct-enter fallback");
rejectText(launchPage, "fonts.googleapis.com", "App launch document");

requireText(launchCode, 'const HOME_URL = "/home.html?source=pwa"', "App launch destination");
requireText(launchCode, "window.location.replace(HOME_URL)", "App launch history-safe handoff");
requireText(launchCode, "prefers-reduced-motion", "App launch reduced-motion timing");
requireText(launchCode, "DEFAULT_DELAY = 1150", "Short app launch duration");

requireText(launchCss, "min-height: 100dvh", "App launch dynamic viewport sizing");
requireText(launchCss, "env(safe-area-inset-top)", "App launch safe-area handling");
requireText(launchCss, "#020711", "App launch dark background");
requireText(launchCss, "@media (prefers-reduced-motion: reduce)", "App launch reduced-motion styling");
requireText(launchCss, "ccg-launch-progress", "App launch boot animation");

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
requireText(pwaCode, "/resources/images/ccg-app-icon-v2.svg", "Shared PWA launcher icon");
rejectText(pwaCode, "/resources/images/ccg-app-icon.svg", "Shared PWA metadata");
requireText(pwaCode, 'window.addEventListener("online"', "Online-state handling");
requireText(pwaCode, 'window.addEventListener("offline"', "Offline-state handling");

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
requireText(serviceWorker, 'const CACHE_VERSION = "2026-08-20-public-release-v9"', "Launch-shell cache release");
requireText(serviceWorker, '"/app-launch.html"', "App launch shell precache");
requireText(serviceWorker, '"/resources/images/ccg-app-icon-v2.svg"', "Versioned launcher icon precache");
requireText(serviceWorker, '"/resources/images/ccg-app-icon-maskable-v2.svg"', "Maskable launcher icon precache");
requireText(serviceWorker, '"/resources/css/ccg-app-launch.css"', "Launch stylesheet precache");
requireText(serviceWorker, '"/js/ccg-app-launch.js"', "Launch script precache");
requireText(serviceWorker, "navigationPreload.enable", "Navigation preload");
requireText(serviceWorker, "CLEAR_PUBLIC_CACHES", "Public cache reset control");
rejectText(serviceWorker, "supabase.co", "Service worker");
rejectText(serviceWorker, "self.skipWaiting();\n  event.waitUntil(precache", "Automatic update activation");

requireText(offline, "CCG Offline", "Offline page title");
requireText(offline, "No connection", "Offline status message");
requireText(offline, "/resources/images/ccg-app-icon-v2.svg", "Offline app identity");
requireText(offline, 'href="/games/"', "Offline Games link");
requireText(offline, 'href="/games/discover/"', "Offline game-finder link");
requireText(offline, 'rel="manifest"', "Offline manifest link");

requireText(pwaCss, ".ccg-pwa-panel", "Install/update panel styling");
requireText(pwaCss, ".ccg-pwa-network", "Network notice styling");
requireText(pwaCss, "prefers-reduced-motion", "Reduced-motion styling");
requireText(pwaCss, "@media print", "Print exclusion");

requireText(workflow, "node --check service-worker.js", "Service worker syntax validation");
requireText(workflow, "node --check js/ccg-app-launch.js", "App launch syntax validation");
requireText(workflow, "node scripts/audit-installable-pwa.js", "PWA audit step");
requireText(documentation, "Phase 17", "Phase documentation");
requireText(documentation, "No private pages", "Private cache documentation");
requireText(documentation, "two-stage", "Two-stage launch documentation");
requireText(documentation, "versioned", "Versioned icon documentation");

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
  "app-launch.html",
  "js/ccg-app-launch.js",
  "js/ccg-pwa.js",
  "js/ccg-nav-core.js",
  "resources/css/ccg-app-launch.css",
  "resources/css/ccg-pwa.css",
  "resources/images/ccg-app-icon-v2.svg",
  "resources/images/ccg-app-icon-maskable-v2.svg",
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
console.log("- Manifest uses a dark branded launch route and versioned launcher artwork");
console.log("- Standard and maskable icons avoid the legacy blur filter");
console.log("- The lightweight launch bridge is safe-area aware and reduced-motion friendly");
console.log("- Public offline shell and navigation fallback are present");
console.log("- Administrator, member and authentication routes are excluded from caching");
console.log("- Install prompts require repeat engagement and updates require user action");
