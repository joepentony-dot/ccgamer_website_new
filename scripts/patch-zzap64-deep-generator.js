#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const target = path.resolve(__dirname, "generate-zzap64-review-links.js");
let source = fs.readFileSync(target, "utf8");

function replaceOnce(before, after, label) {
  if (!source.includes(before)) {
    if (source.includes(after)) return;
    throw new Error(`Could not find generator section for ${label}`);
  }
  source = source.replace(before, after);
}

replaceOnce(
  'const matcher = require("../js/ccg-zzap64-matcher.js");',
  'const matcher = require("../js/ccg-zzap64-matcher.js");\nconst zzapBible = require("./zzap64-bible-client.js");',
  "Zzap Bible client import"
);

replaceOnce(
  'const OUTPUT_PATH = path.join(ROOT, "data", "zzap64-review-links.json");',
  'const OUTPUT_PATH = path.join(ROOT, "data", "zzap64-review-links.json");\nconst OVERRIDES_PATH = path.join(ROOT, "data", "zzap64-review-overrides.json");',
  "verified override path"
);

replaceOnce(
  '? { year, month: raw[0], title: raw[1], system: raw[4] || "C64" }',
  '? { year, month: raw[0], title: raw[1], score: raw[3], system: raw[4] || "C64" }',
  "array award score"
);

replaceOnce(
  '            title: raw.title || raw.game,\n            system: raw.system || raw.platform || "C64"',
  '            title: raw.title || raw.game,\n            score: raw.score,\n            system: raw.system || raw.platform || "C64"',
  "object award score"
);

replaceOnce(
  `function readExistingOutput() {
  if (!fs.existsSync(OUTPUT_PATH)) return { entries: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : { entries: {} };
  } catch {
    return { entries: {} };
  }
}`,
  `function readExistingOutput() {
  if (!fs.existsSync(OUTPUT_PATH)) return { entries: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : { entries: {} };
  } catch {
    return { entries: {} };
  }
}

function readOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) return {};
  const parsed = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"));
  return parsed && typeof parsed.entries === "object" && parsed.entries ? parsed.entries : {};
}`,
  "override reader"
);

replaceOnce(
  `function persistedExact(existing, entry, issue) {`,
  `function verifiedOverride(overrides, entry, issue) {
  const record = overrides?.[recordKey(entry)];
  if (
    Number(record?.issue) !== Number(issue)
    || !Number.isInteger(Number(record?.page))
    || Number(record.page) < 1
  ) return null;

  return {
    issue: Number(issue),
    page: Number(record.page),
    precision: "page",
    url: officialPageUrl(issue, Number(record.page)),
    source: String(record.source || "verified-review-exception")
  };
}

function persistedExact(existing, entry, issue) {`,
  "verified override resolver"
);

replaceOnce(
  '    ...(record.lemonUrl ? { lemonUrl: String(record.lemonUrl) } : {})',
  '    ...(record.lemonUrl ? { lemonUrl: String(record.lemonUrl) } : {}),\n    ...(record.bibleTitle ? { bibleTitle: String(record.bibleTitle) } : {}),\n    ...(Number.isFinite(Number(record.bibleScore)) ? { bibleScore: Number(record.bibleScore) } : {})',
  "persist Zzap Bible verification fields"
);

replaceOnce(
  `function buildOutput(existing = readExistingOutput()) {
  const awards = readAwards();
  const years = awardYears();`,
  `function buildOutput(existing = readExistingOutput()) {
  const awards = readAwards();
  const years = awardYears();
  const overrides = readOverrides();`,
  "load verified overrides"
);

replaceOnce(
  `    const key = recordKey(entry);
    const persisted = persistedExact(existing, entry, issue);`,
  `    const key = recordKey(entry);
    const override = verifiedOverride(overrides, entry, issue);
    const persisted = persistedExact(existing, entry, issue);`,
  "resolve verified override"
);

replaceOnce(
  `    if (persisted) {
      entries[key] = persisted;`,
  `    if (override) {
      entries[key] = override;
    } else if (persisted) {
      entries[key] = persisted;`,
  "prioritize verified override"
);

replaceOnce(
  '    generatedFrom: "Verified Zzap!64 magazine references from the repository Lemon cache plus optional live Lemon64/Lemon Amiga lookups. Exact page numbers are never guessed; unresolved entries fall back to the correct official issue.",',
  '    generatedFrom: "Verified Zzap!64 review pages from the official Zzap Bible, verified exception records, and repository Lemon cache/live Lemon lookups as secondary verification. Exact page numbers are never guessed; unresolved entries fall back to the correct official issue.",',
  "generated source description"
);

replaceOnce(
  '  console.log(`Deep Lemon lookup: ${unresolved.length} unresolved award entries to check.`);',
  '  console.log(`Deep Zzap review lookup: ${unresolved.length} unresolved award entries to check.`);',
  "lookup heading"
);

replaceOnce(
  '      const exact = await resolveLiveExact(entry);',
  '      const issue = issueNumber(entry.year, entry.month);\n      const bibleExact = issue\n        ? await zzapBible.resolveReview({\n            entry,\n            issue,\n            searchVariants: searchVariants(entry),\n            userAgent: USER_AGENT\n          })\n        : null;\n      const lemonExact = bibleExact ? null : await resolveLiveExact(entry);\n      const exact = bibleExact\n        ? { ...bibleExact, url: officialPageUrl(bibleExact.issue, bibleExact.page) }\n        : lemonExact;',
  "official Bible before Lemon"
);

replaceOnce(
  '        console.log(`  · ${entry.year} ${entry.month} ${entry.system} — ${entry.title}: no direct Lemon page reference found`);',
  '        console.log(`  · ${entry.year} ${entry.month} ${entry.system} — ${entry.title}: no verified direct review page found`);',
  "unresolved log"
);

replaceOnce(
  `  buildOutput,
  enrichLive,`,
  `  buildOutput,
  enrichLive,
  readOverrides,`,
  "override export"
);

fs.writeFileSync(target, source, "utf8");
console.log("Prepared Zzap review enrichment with verified exceptions, official Zzap Bible verification and Lemon fallback.");
