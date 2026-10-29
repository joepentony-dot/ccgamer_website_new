import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const developer = require("../scripts/generate-developer-pages.js");
const publisher = require("../scripts/generate-publisher-pages.js");
const { buildDeveloperGroups } = require("../scripts/developer-utils.js");
const { buildPublisherGroups } = require("../scripts/publisher-utils.js");

const SITE = "https://www.cheekycommodoregamer.co.uk";
const catalog = JSON.parse(fs.readFileSync(path.resolve("games/games.json"), "utf8"));

function group(system = "C64", year = 1987) {
  return {
    name: "A&B Studio", slug: "a-and-b-studio",
    count: 1, c64Count: system === "C64" ? 1 : 0,
    amigaCount: system === "Amiga" ? 1 : 0,
    firstYear: year, lastYear: year,
    games: [{ title: "Test & Win", slug: "test-and-win", year, system, thumbnail: "" }]
  };
}

function schemaFrom(html) {
  const match = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, "CollectionPage JSON-LD exists");
  return JSON.parse(match[1])["@graph"];
}

test("developer single-game page names its actual game, platform, year and attribution", () => {
  const html = developer.renderDeveloperPage(group());
  assert.match(html, /<title>A&amp;B Studio: Test &amp; Win \(1987\) \| Commodore 64 Developer/);
  assert.match(html, /name="description" content="Test &amp; Win \(1987\) on Commodore 64 carries a recorded developer credit for A&amp;B Studio\./);
  assert.match(html, /<h1 class="ccg-developers-hero__title">A&amp;B Studio: Test &amp; Win<\/h1>/);
  assert.match(html, /name="robots" content="index,follow"/);
  assert.match(html, new RegExp('rel="canonical" href="' + SITE.replace(/\./g, "\\.") + '\/games\/developers\/a-and-b-studio\/"'));
  assert.match(html, /href="\/games\/test-and-win\/"/);
  const graph = schemaFrom(html);
  assert.equal(graph.find(node => node["@type"] === "CollectionPage").description.includes("Test & Win"), true);
  assert.equal(graph.find(node => node["@type"] === "ItemList").itemListElement[0].name, "Test & Win");
});

test("publisher Amiga-only single-game page does not claim a C64 release or original edition", () => {
  const html = publisher.renderPublisherPage(group("Amiga", 1991), {});
  assert.match(html, /<title>A&amp;B Studio: Test &amp; Win \(1991\) \| Amiga Publisher/);
  assert.match(html, /name="description" content="Test &amp; Win \(1991\) on Amiga appears in the A&amp;B Studio publisher archive\./);
  assert.match(html, /<h1 class="ccg-publishers-hero__title">A&amp;B Studio: Test &amp; Win<\/h1>/);
  assert.match(html, /name="robots" content="index,follow"/);
  assert.match(html, /rel="canonical" href="https:\/\/www\.cheekycommodoregamer\.co\.uk\/games\/publishers\/a-and-b-studio\/"/);
  assert.match(html, /href="\/games\/test-and-win\/"/);
  assert.doesNotMatch(html.match(/<meta name="description"[^>]+>/)[0], /C64|Commodore 64/);
  assert.equal(schemaFrom(html).find(node => node["@type"] === "ItemList").numberOfItems, 1);
});

test("unknown year stays unknown; multi-game page metadata and headings remain unchanged", () => {
  const noYear = developer.renderDeveloperPage(group("C64", null));
  assert.doesNotMatch(noYear.match(/<meta name="description"[^>]+>/)[0], /\(null\)|\(0\)/);
  const multi = group();
  multi.games.push({ title: "Another Game", slug: "another-game", year: 1988, system: "C64", thumbnail: "" });
  multi.count = 2; multi.c64Count = 2; multi.lastYear = 1988;
  const dev = developer.renderDeveloperPage(multi);
  const pub = publisher.renderPublisherPage(multi, {});
  assert.match(dev, /Browse 2 Commodore 64 games carrying a A&amp;B Studio developer credit/);
  assert.match(pub, /Browse 2 A&amp;B Studio Commodore 64 games in the Cheeky Commodore Gamer archive/);
  assert.match(dev, /<h1 class="ccg-developers-hero__title">A&amp;B Studio Games<\/h1>/);
  assert.match(pub, /<h1 class="ccg-publishers-hero__title">A&amp;B Studio Games<\/h1>/);
});

test("real single-credit cohorts retain direct game links and source-backed snippets", () => {
  const families = [
    { name: "developer", groups: buildDeveloperGroups(catalog), render: (g) => developer.renderDeveloperPage(g) },
    { name: "publisher", groups: buildPublisherGroups(catalog), render: (g) => publisher.renderPublisherPage(g, {}) }
  ];
  for (const family of families) {
    const oneGame = family.groups.filter(g => g.count === 1 && g.games.length === 1);
    assert.ok(oneGame.length > 0, family.name + " has at least one single-credit record");
    for (const entry of oneGame) {
      const html = family.render(entry);
      const meta = html.match(/<meta name="description" content="([^"]*)"/);
      assert.ok(meta, family.name + ": " + entry.slug + " has description");
      assert.ok(meta[1].includes(entry.games[0].title.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")), family.name + ": " + entry.slug + " names credited game");
      assert.ok(html.includes('href="/games/' + entry.games[0].slug + '/"'), family.name + ": " + entry.slug + " has game link");
      assert.ok(html.includes('name="robots" content="index,follow"'), family.name + ": " + entry.slug + " remains indexable");
    }
  }
});
