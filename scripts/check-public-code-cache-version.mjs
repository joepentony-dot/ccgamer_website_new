#!/usr/bin/env node

"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION_RE = /const\s+CODE_CACHE_VERSION\s*=\s*"([^"]+)"\s*;/;
const CODE_EXTENSION_RE = /\.(?:css|js|mjs)$/i;
const EXCLUDED_PREFIXES = Object.freeze([
  ".github/",
  "admin/",
  "auth/",
  "community/",
  "docs/",
  "node_modules/",
  "scripts/",
  "supabase/",
  "tests/",
  "arcade/lost-sizzler/",
  "games/ccg-games/cheeky-commodore-quest/",
  "multiplayer-server/"
]);

function normalizePath(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\.\//, "");
}

export function isCacheablePublicCodePath(value) {
  const relativePath = normalizePath(value);
  if (!relativePath || relativePath === "service-worker.js") return false;
  if (!CODE_EXTENSION_RE.test(relativePath)) return false;
  return !EXCLUDED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

export function extractCodeCacheVersion(source) {
  const match = String(source || "").match(VERSION_RE);
  if (!match) throw new Error("service-worker.js is missing CODE_CACHE_VERSION");
  return match[1];
}

function git(args) {
  return childProcess.execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function changedFiles(baseRef) {
  return git(["diff", "--name-only", `${baseRef}...HEAD`])
    .split(/\r?\n/)
    .map((value) => normalizePath(value.trim()))
    .filter(Boolean);
}

function readAtRef(ref, relativePath) {
  return git(["show", `${ref}:${relativePath}`]);
}

function runSelfTest() {
  assert.equal(isCacheablePublicCodePath("js/ccg-nav.js"), true);
  assert.equal(isCacheablePublicCodePath("resources/css/ccg-global.css"), true);
  assert.equal(isCacheablePublicCodePath("resources/js/auth/member-hub.js"), true);
  assert.equal(isCacheablePublicCodePath("quiz/quiz.js"), true);
  assert.equal(isCacheablePublicCodePath("service-worker.js"), false);
  assert.equal(isCacheablePublicCodePath("admin/js/admin-nav.js"), false);
  assert.equal(isCacheablePublicCodePath("scripts/rebuild-games.js"), false);
  assert.equal(isCacheablePublicCodePath("arcade/lost-sizzler/js/game.js"), false);
  assert.equal(isCacheablePublicCodePath("games/ccg-games/cheeky-commodore-quest/js/game.js"), false);
  assert.equal(extractCodeCacheVersion('const CODE_CACHE_VERSION = "test-v3";'), "test-v3");
  assert.throws(() => extractCodeCacheVersion("const CACHE_VERSION = \"v1\";"));
  console.log("Public code cache-version self-test passed.");
}

function runGuard(baseRef) {
  const currentSource = fs.readFileSync(path.join(ROOT, "service-worker.js"), "utf8");
  const currentVersion = extractCodeCacheVersion(currentSource);
  const changed = changedFiles(baseRef);
  const cacheableCodeChanges = changed.filter(isCacheablePublicCodePath);

  if (!cacheableCodeChanges.length) {
    console.log(`Public code cache-version guard passed: no cacheable public CSS/JS/MJS changed (${currentVersion}).`);
    return;
  }

  let baseSource;
  try {
    baseSource = readAtRef(baseRef, "service-worker.js");
  } catch (error) {
    throw new Error(`Unable to read service-worker.js from ${baseRef}.`);
  }

  const baseVersion = extractCodeCacheVersion(baseSource);
  if (currentVersion === baseVersion) {
    console.error("Public code cache-version guard failed.");
    console.error(`CODE_CACHE_VERSION is still ${currentVersion}, but cacheable public code changed:`);
    for (const relativePath of cacheableCodeChanges) console.error(`- ${relativePath}`);
    console.error("Bump CODE_CACHE_VERSION in service-worker.js so the new code receives a fresh cache namespace.");
    process.exit(1);
  }

  console.log(`Public code cache-version guard passed: ${baseVersion} -> ${currentVersion}.`);
  for (const relativePath of cacheableCodeChanges) console.log(`- ${relativePath}`);
}

const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  runSelfTest();
} else {
  const baseIndex = args.indexOf("--base");
  const baseRef = baseIndex >= 0 && args[baseIndex + 1] ? args[baseIndex + 1] : "origin/main";
  runGuard(baseRef);
}
