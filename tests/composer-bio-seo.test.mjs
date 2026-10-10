import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const enrich = require("../scripts/enrich-generated-composer-pages.js");

const route = {
  name: "Example Composer",
  slug: "example-composer",
  count: 1,
  c64Count: 1,
  amigaCount: 0,
  firstYear: 1987,
  lastYear: 1987
};

test("credit-only composer profile has facts but no manufactured biography", () => {
  const markup = enrich.buildProfileMarkup(route, null);
  assert.match(markup, /data-research-level="credit-only"/);
  assert.match(markup, /1 linked game credit/);
  assert.doesNotMatch(markup, /ccg-composer-profile__bio/);
  assert.doesNotMatch(markup, /Cheeky Commodore Gamer archive/i);
  assert.doesNotMatch(markup, /represented in/i);
});

test("researched profile renders one factual biography and specific source links", () => {
  const markup = enrich.buildProfileMarkup(route, {
    bio: "Example Composer is a documented game musician.",
    nationality: "British",
    sources: [
      { title: "Specific source", url: "https://example.com/people/example-composer" },
      { title: "Generic homepage", url: "https://example.org/" }
    ]
  });

  assert.equal((markup.match(/ccg-composer-profile__bio/g) || []).length, 1);
  assert.match(markup, /Example Composer is a documented game musician/);
  assert.match(markup, /<strong>Sources:<\/strong>/);
  assert.match(markup, /https:\/\/example\.com\/people\/example-composer/);
  assert.doesNotMatch(markup, /https:\/\/example\.org\//);
});

test("SEO description is neutral and does not repeat CCG archive copy", () => {
  const description = enrich.buildDescription(route, null, ["Example Game"]);
  assert.ok(description.length <= 158);
  assert.match(description, /Example Composer/);
  assert.match(description, /Example Game/);
  assert.doesNotMatch(description, /Cheeky Commodore Gamer/i);
  assert.doesNotMatch(description, /\barchive\b/i);
});

test("unresearched schema does not invent a biography", () => {
  const entity = enrich.buildEntitySchema(route, null);
  assert.equal(entity.name, "Example Composer");
  assert.equal(Object.hasOwn(entity, "description"), false);
});

test("generated page copy and structured data are neutralised", () => {
  const html = `<!doctype html>
  <p class="ccg-composer-intro">Browse games grouped under the recorded music credit Example Composer, with playable tracks where archive audio is available.</p>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "description": "Browse games carrying a recorded music credit for Example Composer in the Cheeky Commodore Gamer archive.",
        "about": { "@type": "Thing", "name": "Example Composer" }
      },
      {
        "@type": "ItemList",
        "name": "Example Composer music-credit games in the CCG archive",
        "itemListElement": []
      }
    ]
  }
  </script>`;

  const intro = enrich.replaceComposerIntro(html, route);
  const result = enrich.replaceJsonLd(intro, route, null);

  assert.doesNotMatch(result, /Cheeky Commodore Gamer archive/i);
  assert.doesNotMatch(result, /CCG archive/i);
  assert.doesNotMatch(result, /archive audio/i);
  assert.match(result, /Explore Commodore 64 game-music credits/);
  assert.match(result, /Example Composer Commodore 64 game-music credits/);
});

test("research manifest supports a deliberate verified override layer", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-composer-research-"));
  try {
    fs.writeFileSync(path.join(temp, "base.json"), JSON.stringify({
      profiles: {
        person: {
          name: "Person",
          nationality: "British",
          bio: "Old biography.",
          sources: [{ title: "Old", url: "https://example.com/old/person" }]
        }
      }
    }));
    fs.writeFileSync(path.join(temp, "override.json"), JSON.stringify({
      profiles: {
        person: {
          bio: "Verified replacement biography.",
          sources: [{ title: "New", url: "https://example.com/new/person" }]
        }
      }
    }));
    fs.writeFileSync(path.join(temp, "manifest.json"), JSON.stringify({
      parts: ["base.json"],
      overrides: "override.json"
    }));

    const research = enrich.loadResearchDocument(path.join(temp, "manifest.json"));
    assert.equal(research.profiles.person.name, "Person");
    assert.equal(research.profiles.person.nationality, "British");
    assert.equal(research.profiles.person.bio, "Verified replacement biography.");
    assert.equal(research.profiles.person.sources[0].title, "New");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("research policy rejects generic CCG filler and adds verified biographies", () => {
  const manifest = JSON.parse(fs.readFileSync("music/composers/research.json", "utf8"));
  const overridesPath = path.resolve("music/composers", manifest.overrides);
  const overrides = JSON.parse(fs.readFileSync(overridesPath, "utf8"));

  assert.match(manifest.policy, /without internal catalogue counts, platform labels, CCG archive wording/i);
  assert.ok(Object.keys(overrides.profiles).length >= 15);
  assert.ok(overrides.profiles["russell-lieblich"]?.sources?.some((source) => /mobygames\.com\/person\/342\//.test(source.url)));
  assert.ok(overrides.profiles["david-hanlon"]?.sources?.some((source) => /c64\.com\/gt_display_interview\.php\?interview=7/.test(source.url)));
  assert.ok(overrides.profiles["raphael-gesqua"]?.sources?.some((source) => /mo5\.com\/en\/artwork-artists\/raphael-gesqua/.test(source.url)));
});


test("Mark Cooksey uses a complete sourced SEO sentence rather than a clipped biography", () => {
  const research = enrich.loadResearchDocument(path.resolve("music/composers/research.json"));
  const profile = research.profiles["mark-cooksey"];
  assert.ok(profile?.bio);
  const composer = { name: "Mark Cooksey", slug: "mark-cooksey", c64Count: 4, amigaCount: 0, count: 4 };
  const output = enrich.buildDescription(composer, profile, ["Ghosts 'n Goblins"]);
  assert.equal(output, "Mark Cooksey is an English game composer and audio programmer. Game-music credits include Ghosts 'n Goblins.");
  assert.ok(output.length <= 158);
  assert.doesNotMatch(output, /…|\.\.\.$/);
  assert.match(output, /[.!?]$/);
  assert.equal(enrich.buildDescription(composer, profile, ["Ghosts 'n Goblins"]), output);
});

test("composer snippet chooses complete sourced statements even for oversized overrides", () => {
  const verbose = {
    seoDescription: "Example Composer is a documented game musician. " +
      "This additional editorial passage is much too long to put into a Google meta description, " +
      "and no search result should ever cut its words or put an ellipsis in the middle of a sentence."
  };
  assert.equal(
    enrich.buildDescription(route, verbose, ["Example Game"]),
    "Example Composer is a documented game musician."
  );
});

test("composer snippet uses catalogued credits if a sourced sentence cannot be shortened", () => {
  const profile = { bio: "An extremely long introductory description ".repeat(12) + "without any suitable grammatical shortening." };
  const actual = enrich.buildDescription(route, profile, ["Example Game"]);
  assert.match(actual, /Example Composer/);
  assert.match(actual, /Example Game/);
  assert.ok(actual.length <= 158);
  assert.doesNotMatch(actual, /…|\.\.\./);
  assert.match(actual, /[.!?]$/);
});

test("curated and generated composer social metadata are source-consistent and idempotent", () => {
  const content = "Composer A&F worked on the game Ghosts 'n Goblins.";
  const original = '<html><head><meta name="description" content="Old."></head><body></body></html>';
  const first = enrich.replaceMetaDescription(original, content);
  const twice = enrich.replaceMetaDescription(first, content);
  assert.equal(twice, first);
  assert.match(first, /name="description" content="Composer A&amp;F worked on the game Ghosts &#39;n Goblins\."/);
  assert.match(first, /property="og:description" content="Composer A&amp;F worked on the game Ghosts &#39;n Goblins\."/);
  assert.match(first, /name="twitter:description" content="Composer A&amp;F worked on the game Ghosts &#39;n Goblins\."/);
  assert.doesNotMatch(first, /&amp;amp;/);
});
