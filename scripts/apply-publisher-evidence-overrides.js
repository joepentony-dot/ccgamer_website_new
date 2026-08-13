#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const dataDir = path.join(repoRoot, "data");
const overridesPath = path.join(dataDir, "publisher-evidence-overrides.json");
const PROFILE_FILE_PATTERN = /^publisher-histories(?:-[a-z0-9-]+)?\.json$/i;

function fail(message) {
  console.error(`[publisher-evidence-overrides] ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
  }
}

function normaliseSlug(value) {
  return String(value || "").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
}

function sourceKey(source) {
  return String(source?.url || "").trim().toLowerCase();
}

function mergeUnique(existing, additions, keyFn) {
  const output = Array.isArray(existing) ? [...existing] : [];
  const seen = new Set(output.map(keyFn).filter(Boolean));
  for (const item of Array.isArray(additions) ? additions : []) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function applyResearchProfile(entry, override) {
  const scalarKeys = ["summary", "note", "confidence", "verified_on"];
  const arrayKeys = ["facts", "strengths", "related", "sources"];

  for (const key of scalarKeys) {
    if (Object.prototype.hasOwnProperty.call(override, key)) entry[key] = override[key];
  }
  for (const key of arrayKeys) {
    if (Object.prototype.hasOwnProperty.call(override, key)) {
      entry[key] = Array.isArray(override[key]) ? [...override[key]] : override[key];
    }
  }
}

function main() {
  if (!fs.existsSync(overridesPath)) fail("Missing data/publisher-evidence-overrides.json");
  const overrides = readJson(overridesPath);
  if (!Array.isArray(overrides) || overrides.length === 0) {
    fail("data/publisher-evidence-overrides.json must contain a non-empty array");
  }

  const overrideBySlug = new Map();
  for (const override of overrides) {
    const slug = normaliseSlug(override?.slug);
    if (!slug) fail("Evidence override contains an empty slug");
    if (overrideBySlug.has(slug)) fail(`Duplicate evidence override for ${slug}`);
    if (!Array.isArray(override?.sources) || override.sources.length === 0) {
      fail(`${slug}: evidence override must contain at least one source`);
    }
    overrideBySlug.set(slug, { ...override, slug });
  }

  const files = fs.readdirSync(dataDir)
    .filter((name) => PROFILE_FILE_PATTERN.test(name))
    .sort((a, b) => a.localeCompare(b));

  const matched = new Map();
  let filesChanged = 0;

  for (const name of files) {
    const filePath = path.join(dataDir, name);
    const entries = readJson(filePath);
    if (!Array.isArray(entries)) fail(`data/${name} must contain an array`);
    let changed = false;

    for (const entry of entries) {
      const slug = normaliseSlug(entry?.slug);
      const override = overrideBySlug.get(slug);
      if (!override) continue;

      matched.set(slug, (matched.get(slug) || 0) + 1);

      if (override.mode === "replace_profile") {
        applyResearchProfile(entry, override);
      } else {
        entry.facts = mergeUnique(entry.facts, override.facts, (value) => String(value || "").trim());
        entry.sources = mergeUnique(entry.sources, override.sources, sourceKey);
      }
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
      filesChanged += 1;
    }
  }

  for (const slug of overrideBySlug.keys()) {
    const count = matched.get(slug) || 0;
    if (count !== 1) fail(`${slug}: expected exactly one publisher profile match, found ${count}`);
  }

  const researchCount = overrides.filter((entry) => entry?.mode === "replace_profile").length;
  console.log(`[publisher-evidence-overrides] Applied ${overrides.length} evidence override(s) across ${filesChanged} history file(s), including ${researchCount} full research profile replacement(s).`);
}

if (require.main === module) main();
