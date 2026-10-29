import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const generator = require("../scripts/generate-year-platform-pages.js");
const site = "https://www.cheekycommodoregamer.co.uk";
const games = JSON.parse(fs.readFileSync(path.join("games", "games.json"), "utf8"));
const archive = generator.buildArchiveData(games);

function field(html, pattern) {
  return html.match(pattern)?.[1] || "";
}

function schema(html) {
  const raw = field(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(raw.trim(), "collection JSON-LD must be available");
  return JSON.parse(raw);
}

test("2023 single-game archive identifies its actual C64 title without changing indexability", () => {
  const group = archive.years.find((year) => year.year === 2023);
  assert.ok(group && group.count === 1);
  const sole = group.games[0];
  assert.equal(sole.slug, "the-smiths-are-dead");
  assert.equal(sole.platform, "c64");
  const generated = generator.renderYearPage(group);
  const committed = fs.readFileSync(path.join("games", "years", "2023", "index.html"), "utf8");

  for (const html of [generated, committed]) {
    const title = field(html, /<title>([^<]+)<\/title>/);
    const description = field(html, /<meta name="description" content="([^"]+)"/);
    const canonical = field(html, /<link rel="canonical" href="([^"]+)"/);
    const social = field(html, /<meta property="og:description" content="([^"]+)"/);
    const twitter = field(html, /<meta name="twitter:description" content="([^"]+)"/);
    assert.match(title, /^2023 C64 Games — The Smiths Are Dead/);
    assert.ok(description.includes("The Smiths Are Dead (2023)"));
    assert.ok(description.includes("Commodore 64"));
    assert.equal(social, description);
    assert.equal(twitter, description);
    assert.equal(canonical, site + "/games/years/2023/");
    assert.match(html, /name="robots" content="index,follow"/);
    assert.ok(html.includes("The 2023 Commodore 64 archive currently features The Smiths Are Dead."));
    assert.ok(html.includes('href="/games/the-smiths-are-dead/"'));
    assert.ok(!description.includes("Commodore 64 and Amiga"));
    const graph = schema(html)["@graph"];
    assert.equal(graph.find((x) => x["@type"] === "CollectionPage")?.description, description);
    assert.equal(graph.find((x) => x["@type"] === "CollectionPage")?.name, "2023 Commodore 64 Games");
    assert.equal(graph.find((x) => x["@type"] === "ItemList")?.numberOfItems, 1);
  }
});

test("multi-game years retain the existing title and metadata contract", () => {
  const group = archive.years.find((year) => year.year === 1986);
  assert.ok(group && group.count > 1);
  const html = generator.renderYearPage(group);
  assert.match(html, /<title>1986 C64 &amp; Amiga Games \| Cheeky Commodore Gamer<\/title>/);
  assert.ok(html.includes("Browse every Commodore 64 and Amiga title currently recorded for 1986."));
  assert.ok(field(html, /<meta name="description" content="([^"]+)"/).includes("Browse " + group.count));
  assert.equal(schema(html)["@graph"].find((x) => x["@type"] === "ItemList")?.numberOfItems, group.count);
});

test("singleton copy works for Amiga and escapes untrusted game titles", () => {
  const record = games.find((game) => String(game.system || "").toLowerCase().includes("amiga"));
  assert.ok(record, "catalogue includes Amiga games");
  const singleArchive = generator.buildArchiveData([{ ...record, slug: "test-title", title: "A&B <Game>", year: 1996 }]);
  const html = generator.renderYearPage(singleArchive.years[0]);
  assert.match(html, /<title>1996 Amiga Games — A&amp;B &lt;Game&gt;/);
  assert.ok(html.includes("The 1996 Amiga archive currently features A&amp;B &lt;Game&gt;."));
  assert.ok(html.includes('href="/games/test-title/"'));
  assert.ok(html.includes('name="robots" content="index,follow"'));
});
