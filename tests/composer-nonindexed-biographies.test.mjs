import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const enrich = require("../scripts/enrich-generated-composer-pages.js");

const CASES = [
  {
    slug: "ben-daglish",
    file: "part-01.json",
    name: "Ben Daglish",
    anchors: [/Tony Crowther/, /The Last Ninja/, /Anthony Lees/, /Trap/],
    sourceHosts: ["www.lemon64.com", "c64audio.com", "remix64.com"]
  },
  {
    slug: "rob-hubbard",
    file: "part-07.json",
    name: "Rob Hubbard",
    anchors: [/SID chip/, /Commando/, /Sanxion/, /Electronic Arts/],
    sourceHosts: ["remix64.com", "www.mobygames.com", "www.c64-wiki.com"]
  }
];

for (const entry of CASES) {
  test(entry.name + " uses a substantive, sourced biography in the authoritative composer research", () => {
    const document = JSON.parse(fs.readFileSync(path.join("data", "composer-research", entry.file), "utf8"));
    const profile = document.profiles[entry.slug];
    assert.equal(profile?.name, entry.name);
    assert.ok(profile.bio.length >= 650 && profile.bio.length < 1600, "substantive but bounded prose");
    for (const anchor of entry.anchors) assert.match(profile.bio, anchor);
    assert.doesNotMatch(profile.bio, /Cheeky Commodore Gamer archive|CCG-linked|birth date not|reliable sources have/i);
    assert.deepEqual(
      profile.sources.map(source => new URL(source.url).hostname),
      entry.sourceHosts
    );
    assert.ok(profile.sources.every(source => source.title.length > 10));
  });
}

test("both composer profiles remain compatible with the shared SEO/social snippet renderer", () => {
  const research = enrich.loadResearchDocument(path.resolve("music/composers/research.json"));
  for (const entry of CASES) {
    const profile = research.profiles[entry.slug];
    assert.ok(profile?.bio?.length >= 650);
    const route = {
      name: entry.name, slug: entry.slug, count: 2,
      c64Count: 2, amigaCount: 0
    };
    const output = enrich.buildDescription(route, profile, ["Example Game"]);
    assert.ok(output.length > 45 && output.length <= 158);
    assert.match(output, /[.!?]$/);
    assert.doesNotMatch(output, /(?:…|\.\.\.)$/);
    assert.equal(output, enrich.buildDescription(route, profile, ["Example Game"]));
  }
});
