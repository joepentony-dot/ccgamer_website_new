import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const history = require("../scripts/materialize-publisher-histories.js");
const genres = require("../scripts/link-publisher-strength-genres.js");
const root = process.cwd();
const html = fs.readFileSync(path.join(root, "games/publishers/blue-ribbon/index.html"), "utf8");
const metadata = JSON.parse(fs.readFileSync(path.join(root, "games/publishers/publishers.json"), "utf8"));

test("Blue Ribbon profile uses approved museum sources without invented company history", () => {
  const profile = history.loadProfiles().find(x => x.slug === "blue-ribbon");
  assert.ok(profile, "museum profile must survive authoritative registry reload");
  const safe = history.sanitizeProfile(profile);
  assert.equal(safe.sourceBacked, true);
  assert.equal(safe.sources.length, 2);
  assert.ok(safe.sources.every(x => x.url.startsWith("https://www.computinghistory.org.uk/")));
  assert.ok(safe.facts.some(x => /1984 Commodore 64 cassette edition/.test(x)));
  assert.ok(safe.facts.some(x => /Sheldon Leemon and Glen Carbone/.test(x)));
  assert.ok(!safe.facts.some(x => /founder|ownership|formed|separate Blue Ribbon release year/i.test(x)));
  const record = metadata.find(x => x.slug === "blue-ribbon");
  assert.ok(record && record.count === 1 && record.firstYear === 1984);
  assert.equal(history.isPublisherIndexable(record, safe), true);
});

test("checked-in Blue Ribbon page matches the publisher-history renderer exactly", () => {
  const profile = history.loadProfiles().find(x => x.slug === "blue-ribbon");
  const map = history.buildArchiveMap(metadata);
  // Publisher output is deliberately decorated with canonical genre links
  // after materializing the source-backed history. Check the full pipeline.
  const generated = genres.enhanceHtml(history.renderHistorySection(profile, map));
  const a = html.indexOf(history.HISTORY_START), b = html.indexOf(history.HISTORY_END);
  assert.ok(a >= 0 && b > a, "history section must be in initial HTML");
  assert.equal(html.slice(a, b + history.HISTORY_END.length), generated);
  assert.ok(html.includes('<link rel="stylesheet" href="/resources/css/publisher-history.css">'));
  assert.ok(html.includes('name="robots" content="index,follow"'));
  assert.ok(html.includes('rel="canonical" href="https://www.cheekycommodoregamer.co.uk/games/publishers/blue-ribbon/"'));
  assert.ok(html.includes('href="/games/strip-poker-a-sizzling-game-of-chance/"'));
  assert.ok(html.includes('href="/games/publishers/artworx-software/"'));
  assert.ok(html.includes('href="/games/publishers/"'));
  assert.ok(generated.includes("Centre for Computing History") && generated.includes("1984"));
});
