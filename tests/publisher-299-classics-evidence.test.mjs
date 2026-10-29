import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const history = require("../scripts/materialize-publisher-histories.js");
const genres = require("../scripts/link-publisher-strength-genres.js");
const root = process.cwd();
const publisherPage = fs.readFileSync(path.join(root, "games/publishers/2-99-classics/index.html"), "utf8");
const metadata = JSON.parse(fs.readFileSync(path.join(root, "games/publishers/publishers.json"), "utf8"));
const games = JSON.parse(fs.readFileSync(path.join(root, "games/games.json"), "utf8"));

test("2.99 Classics has independently documented game context without changing original C64 credits", () => {
  const profile = history.loadProfiles().find((entry) => entry.slug === "2-99-classics");
  assert.ok(profile, "publisher history registry should include the budget label");
  const safe = history.sanitizeProfile(profile);
  assert.equal(safe.sourceBacked, true);
  assert.equal(safe.sources.length, 3);
  assert.ok(safe.sources.some((source) => source.url.includes("computinghistory.org.uk/det/33953/Skooldaze/")));
  assert.ok(safe.sources.some((source) => source.url.includes("elite-systems.co.uk/elite/htdocs/newsarchive.php?show=31")));
  assert.ok(safe.facts.some((fact) => fact.includes("Elite Systems")));
  assert.ok(safe.facts.some((fact) => fact.includes("1984 ZX Spectrum") && fact.includes("Microsphere")));
  assert.ok(safe.facts.some((fact) => fact.includes("March 2011")));
  assert.ok(safe.note.includes("1985 year") && safe.note.includes("re-release label"));
  const record = metadata.find((entry) => entry.slug === "2-99-classics");
  assert.ok(record && record.count === 1 && record.firstYear === 1985 && record.indexable);
  assert.equal(history.isPublisherIndexable(record, safe), true);

  const game = games.find((entry) => entry.slug === "skool-daze");
  assert.equal(game.year, 1985);
  assert.ok(game.credits.publisher.includes("Microsphere"));
  assert.ok(game.credits.re_releaser.includes("2.99 Classics"));
});

test("checked-in budget label page matches authoritative source-backed publisher renderer", () => {
  const profile = history.loadProfiles().find((entry) => entry.slug === "2-99-classics");
  const map = history.buildArchiveMap(metadata);
  const expected = genres.enhanceHtml(history.renderHistorySection(profile, map));
  const begin = publisherPage.indexOf(history.HISTORY_START);
  const end = publisherPage.indexOf(history.HISTORY_END);
  assert.ok(begin >= 0 && end > begin, "source-backed history must be rendered into static HTML");
  assert.equal(publisherPage.slice(begin, end + history.HISTORY_END.length), expected);
  assert.ok(publisherPage.includes('<link rel="stylesheet" href="/resources/css/publisher-history.css">'));
  assert.ok(publisherPage.includes('<meta name="robots" content="index,follow">'));
  assert.ok(publisherPage.includes('<link rel="canonical" href="https://www.cheekycommodoregamer.co.uk/games/publishers/2-99-classics/">'));
  assert.ok(publisherPage.includes('href="/games/skool-daze/"'));
  assert.ok(publisherPage.includes('href="/games/publishers/microsphere/"'));
  assert.ok(publisherPage.includes('href="/games/publishers/elite/"'));
  assert.ok(expected.includes("2011") && expected.includes("Elite Systems"));
});
