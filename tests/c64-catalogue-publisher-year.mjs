import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  parseMetadata, publisherIdentity, matchesCatalogueFacets,
} from "../js/ccg-c64/catalogue-browser.js";
import { catalogGameIdentity, searchCatalogEntries } from "../js/ccg-c64/game-catalog.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const raw = JSON.parse(readFileSync(resolve(root, "emulator/c64/catalogue-metadata.json"), "utf8"));
const index = parseMetadata(raw);
assert.ok(index.size > 8000, "Index must retain the reviewed factual metadata records.");
assert.equal(index.size, raw.entries.length, "Reject duplicate catalogue identities.");
assert.equal(index.get("1942")?.year, 1986);
assert.ok(index.get("1942")?.publishers.includes("Elite"));
assert.equal(index.get("wasteland")?.year, 1988);
assert.ok(index.get("wasteland")?.publishers.includes("Electronic Arts"));
assert.equal(index.get("summer games")?.year, 1984);
assert.equal(index.get("summer games")?.publishers.length, 2,
  "Do not discard legitimate co-publishers.");
assert.notEqual(catalogGameIdentity("Pitfall!"), catalogGameIdentity("Pitfall II"),
  "Do not leak publisher/year data between sequels.");
assert.equal(publisherIdentity("U.S. Gold"), publisherIdentity("US Gold"));
assert.equal(publisherIdentity("Ocean Software Ltd."), publisherIdentity("Ocean Software"));

const one = { id: "id-1942", title: "1942", format: "crt" };
const info = index.get(catalogGameIdentity(one.title));
const option = { publisher: publisherIdentity("Elite"), year: "1986", letter: "#" };
assert.ok(matchesCatalogueFacets(one, option, info));
assert.ok(!matchesCatalogueFacets(one, { ...option, year: "1985" }, info));
assert.ok(!matchesCatalogueFacets(one, { ...option, publisher: publisherIdentity("Ocean Software") }, info));
assert.ok(!matchesCatalogueFacets(one, { ...option, letter: "A" }, info));
assert.ok(matchesCatalogueFacets(one, { publisher: "all", year: "all", letter: "all" }));
assert.ok(matchesCatalogueFacets(one, { publisher: "__unlisted__" },
  { publishers: [], year: 1986 }));
assert.ok(matchesCatalogueFacets(one, { year: "__unlisted__" },
  { publishers: ["Elite"], year: null }));
assert.ok(!matchesCatalogueFacets(one, { publisher: "__unlisted__" }, info));
assert.ok(!matchesCatalogueFacets(one, { year: "__unlisted__" }, info));
assert.ok(!matchesCatalogueFacets(null, {}));
assert.deepEqual(searchCatalogEntries([one], "1942").map(row => row.id), [one.id]);
assert.throws(() => parseMetadata({ version: 1, entries: [["x", [], null], ["x", [], null]] }),
  /Invalid/);
assert.throws(() => parseMetadata({ version: 1, entries: [["x", [], 1980]] }),
  /Invalid/);

const page = readFileSync(resolve(root, "emulator/c64/index.html"), "utf8");
const browser = readFileSync(resolve(root, "js/ccg-c64/catalogue-browser.js"), "utf8");
const css = readFileSync(resolve(root, "resources/css/ccg-c64-emulator.css"), "utf8");
for (const attr of ["data-catalogue-query", "data-catalogue-publisher",
  "data-catalogue-year", "data-catalogue-letter"]) {
  assert.ok(page.includes(attr), `Missing live catalogue control: ${attr}`);
  assert.ok(browser.includes(attr), `Missing listener binding: ${attr}`);
}
assert.ok(!page.includes("data-catalogue-source"), "Remove obsolete Collection filter.");
assert.ok(css.includes("repeat(3, minmax(0, 1fr))"), "Retain desktop four-field layout.");

const check = spawnSync(process.execPath, [
  resolve(root, "scripts/c64/rebuild-catalogue-metadata.mjs"), "--check",
], { encoding: "utf8" });
assert.equal(check.status, 0, check.stderr || check.stdout);
console.log("C64 publisher/year catalogue: schema, examples, combined filters, mobile/desktop wiring and CCG metadata drift passed.");
