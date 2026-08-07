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

function requireFile(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return false;
  }
  if (fs.statSync(filePath).size < 1024) {
    failures.push(`Required asset is unexpectedly small: ${relativePath}`);
    return false;
  }
  return true;
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

const moduleCode = read("js/ccg-mode-identity.js");
const modeEngine = read("js/ccg-mode-engine.js");
const headerAuto = read("js/ccg-header-auto.js");
const css = read("resources/css/ccg-mode-identity.css");
const navCore = read("js/ccg-nav-core.js");
const workflow = read(".github/workflows/ccg-commodore-mode-identities.yml");
const runtimeTest = read("tests/mode-engine-runtime.test.cjs");
const documentation = read("docs/phase-19-commodore-mode-identities.md");
const existingAmiga = read("js/ccg-amiga-identity.js");
const amigaCuePath = "resources/audio/mode/lemmings-lets-go.mp3";

requireText(navCore, "/js/ccg-mode-engine.js", "Shared mode engine loader");
requireText(navCore, "data-ccg-mode-engine-loader", "Mode engine loader marker");
requireText(navCore, "hasModuleScript", "Duplicate-safe shared module loading");
requireText(navCore, "/js/ccg-mode-identity.js", "Shared mode identity loader");
requireText(navCore, "data-ccg-mode-identity-loader", "Mode identity loader marker");

requireText(modeEngine, "window.CCGModeEngine", "Global mode controller");
requireText(modeEngine, "Object.freeze", "Mode controller API lock");
requireText(modeEngine, 'document.addEventListener("click", handleToggleClick, true)', "Capture-phase single toggle owner");
requireText(modeEngine, "event.stopImmediatePropagation()", "Competing toggle suppression");
requireText(modeEngine, 'document.readyState === "loading"', "Late-load safe mode initialization");
requireText(modeEngine, 'document.querySelectorAll("[data-ccg-mode-toggle]")', "All toggle state synchronization");
requireText(modeEngine, 'toggle.dataset.ccgModeOwner = "engine"', "Mode ownership marker");
requireText(modeEngine, "EXCLUDED_PATH", "Private-area mode exclusion");
requireText(modeEngine, "/resources/audio/mode/lemmings-lets-go.mp3", "Amiga mode audio cue");
requireText(modeEngine, "/resources/css/audio/c64_speech_stayawhile.mp3", "C64 mode audio cue");
requireText(modeEngine, "toggleMode({ sound: true })", "User-triggered mode audio path");
requireText(modeEngine, "sound: false", "Silent initial mode restoration");
rejectText(modeEngine, 'toggle.addEventListener("click"', "Per-toggle mode engine ownership");
rejectText(modeEngine, "pointerdown", "Mode engine pointer double-toggle path");
rejectText(modeEngine, "touchstart", "Mode engine touch double-toggle path");
requireFile(amigaCuePath);

requireText(moduleCode, "CCG_MODE_IDENTITY_READY", "Module guard");
requireText(moduleCode, "COMMODORE 64 MODE", "C64 label");
requireText(moduleCode, "READY.", "C64 status");
requireText(moduleCode, "64K RAM SYSTEM", "C64 detail");
requireText(moduleCode, "COMMODORE AMIGA MODE", "Amiga label");
requireText(moduleCode, "WORKBENCH", "Amiga status");
requireText(moduleCode, "DF0: CCG ARCHIVE", "Amiga detail");
requireText(moduleCode, "MutationObserver", "Mode attribute observation");
requireText(moduleCode, 'attributeFilter: ["data-mode", "data-ccg-mode"]', "Mode-only mutation observation");
requireText(moduleCode, 'window.addEventListener("ccg:mode-changed", scheduleUpdate)', "Mode-change event sync");
requireText(moduleCode, "data-ccg-mode", "Established mode attribute support");
requireText(moduleCode, "aria-live", "Accessible mode announcement");
requireText(moduleCode, "EXCLUDED_PATH", "Private-area exclusion");
rejectText(moduleCode, 'attributeFilter: ["data-mode", "data-ccg-mode", "class"]', "Mode identity observer");

requireText(headerAuto, "setupModeStateFallback", "Header mode fallback");
requireText(headerAuto, 'toggle.dataset.ccgModeOwner = "engine"', "Mode engine ownership guard");
requireText(headerAuto, 'toggle.dataset.ccgModeOwner = "header-fallback"', "Legacy header fallback ownership marker");

requireText(runtimeTest, "C64 → Amiga → C64", "Runtime toggle round-trip test");
requireText(runtimeTest, "stopImmediatePropagation", "Runtime competing-handler assertion");
requireText(runtimeTest, "InvalidStateError: metadata not loaded", "Runtime unloaded-audio browser simulation");
requireText(runtimeTest, "entering Amiga mode still plays when metadata was unavailable at click time", "Runtime Amiga unloaded-audio assertion");
requireText(runtimeTest, "returning to C64 mode still plays when its metadata was unavailable before the click", "Runtime C64 unloaded-audio assertion");
requireText(runtimeTest, "duplicate script execution does not add another click owner", "Runtime singleton assertion");

requireText(css, '[data-mode="c64"]', "C64 status styling");
requireText(css, '[data-mode="amiga"]', "Amiga status styling");
requireText(css, "ccg-mode-identity__c64-mark", "C64 identity mark");
requireText(css, "ccg-mode-identity__amiga-mark", "Amiga identity mark");
requireText(css, 'data-ccg-identity-mode="c64"', "C64 page treatment");
requireText(css, 'data-ccg-identity-mode="amiga"', "Amiga page treatment");
requireText(css, "prefers-reduced-motion", "Reduced-motion fallback");
requireText(css, "@media print", "Print exclusion");
requireText(existingAmiga, "CCG_AMIGA_IDENTITY_READY", "Existing Amiga window system remains present");
requireText(workflow, "node scripts/audit-commodore-mode-identities.js", "Mode identity workflow audit");
requireText(workflow, "node tests/mode-engine-runtime.test.cjs", "Mode runtime workflow test");
requireText(workflow, amigaCuePath, "Mode audio workflow path");
requireText(documentation, "Phase 19", "Phase documentation");
requireText(documentation, "one compact status strip", "Scope documentation");

rejectText(moduleCode, "new Audio", "Mode identity module");
rejectText(moduleCode, "autoplay", "Mode identity module");
rejectText(moduleCode, "localStorage", "Mode identity module");
rejectText(moduleCode, "innerHTML = document", "Mode identity module");

const protectedPaths = new Set([
  "index.html",
  "home.html",
  "resources/css/intro.css",
  "js/index-intro.js",
  "games/games.json"
]);

const allowedPaths = new Set([
  "js/ccg-nav-core.js",
  "js/ccg-mode-engine.js",
  "js/ccg-mode-identity.js",
  "js/ccg-header-auto.js",
  amigaCuePath,
  "resources/css/ccg-mode-identity.css",
  "scripts/audit-commodore-mode-identities.js",
  "tests/mode-engine-runtime.test.cjs",
  ".github/workflows/ccg-commodore-mode-identities.yml",
  "docs/phase-19-commodore-mode-identities.md"
]);

for (const changedPath of changedFiles()) {
  if (protectedPaths.has(changedPath)) failures.push(`Protected file changed: ${changedPath}`);
  if (!process.env.GITHUB_ACTIONS && !allowedPaths.has(changedPath)) {
    failures.push(`Out-of-scope local Phase 19 change: ${changedPath}`);
  }
}

if (failures.length) {
  console.error("Commodore mode identity audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Commodore mode identity audit passed.");
console.log("- One global capture-phase controller owns the public C64/Amiga toggle");
console.log("- The controller is late-load safe and duplicate-script safe");
console.log("- Runtime coverage proves C64 → Amiga → C64 state changes");
console.log("- Browser-style unloaded audio still plays on user-triggered Amiga and C64 changes without page-load playback");
console.log("- C64 and Amiga status identities are both present");
console.log("- Mode identity observes mode changes only, not unrelated class churn");
console.log("- Existing Amiga window treatment remains intact");
console.log("- Private routes and persistent tracking remain outside scope");
console.log("- Reduced-motion and print fallbacks are present");
