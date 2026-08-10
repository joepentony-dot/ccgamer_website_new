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
  '    ...(record.lemonUrl ? { lemonUrl: String(record.lemonUrl) } : {})',
  '    ...(record.lemonUrl ? { lemonUrl: String(record.lemonUrl) } : {}),\n    ...(record.bibleTitle ? { bibleTitle: String(record.bibleTitle) } : {}),\n    ...(Number.isFinite(Number(record.bibleScore)) ? { bibleScore: Number(record.bibleScore) } : {})',
  "persist Zzap Bible verification fields"
);

replaceOnce(
  '    generatedFrom: "Verified Zzap!64 magazine references from the repository Lemon cache plus optional live Lemon64/Lemon Amiga lookups. Exact page numbers are never guessed; unresolved entries fall back to the correct official issue.",',
  '    generatedFrom: "Verified Zzap!64 review pages from the official Zzap Bible, with repository Lemon cache/live Lemon lookups as secondary verification. Exact page numbers are never guessed; unresolved entries fall back to the correct official issue.",',
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

fs.writeFileSync(target, source, "utf8");
console.log("Prepared Zzap review enrichment with official Zzap Bible verification first and Lemon as fallback.");
