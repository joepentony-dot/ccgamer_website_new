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
  assert.ok(profile.bio.trim().split(/\s+/).length >= 130);
  assert.match(profile.bio, /Airwolf television theme/);
  assert.match(profile.bio, /Felix and Storm Warrior/);
  assert.ok(profile.sources.some((source) => source.url === "https://remix64.com/interviews/interview-mark-cooksey.html"));
  assert.ok(profile.sources.some((source) => source.url === "https://www.8-bit-symphony.com/mark-cooksey.html"));
  const composer = { name: "Mark Cooksey", slug: "mark-cooksey", c64Count: 4, amigaCount: 0, count: 4 };
  const output = enrich.buildDescription(composer, profile, ["Ghosts 'n Goblins"]);
  assert.equal(output, "Mark Cooksey is an English game composer and audio programmer whose Commodore 64 work is closely associated with Elite Systems.");
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

test("a verified single-credit composer archive is indexable without promoting legacy fallbacks", () => {
  const generator = require("../scripts/generate-composer-pages.js");
  const credited = {
    name: "Neil Crossley",
    slug: "neil-crossley",
    variants: ["Neil Crossley"],
    count: 1,
    c64Count: 1,
    amigaCount: 0,
    firstYear: 1991,
    lastYear: 1991,
    games: [{ title: "Shadow Dancer", slug: "shadow-dancer", year: 1991, system: "C64" }]
  };
  assert.equal(generator.INDEXABLE_MIN_GAMES, 1);
  const [single] = generator.mergeComposerRoutes([credited], []);
  assert.equal(single.indexable, true);
  assert.equal(single.generated, true);
  const html = generator.renderGeneratedComposerPage(single);
  assert.match(html, /name="robots" content="index,follow"/);
  assert.match(html, /rel="canonical" href="https:\/\/www\.cheekycommodoregamer\.co\.uk\/music\/neil-crossley\/"/);
  assert.match(html, /href="\/games\/shadow-dancer\/"/);
  assert.doesNotMatch(html, /name="robots" content="noindex/);

  const [curated] = generator.mergeComposerRoutes([credited], [{
    name: "Neil Crossley", slug: "neil-crossley", indexable: false
  }]);
  assert.equal(curated.generated, false);
  assert.equal(curated.indexable, false, "existing curated exclusions remain preserved");

  const fallback = fs.readFileSync(path.join("music", "composer.html"), "utf8");
  assert.match(fallback, /name="robots" content="noindex,follow"/,
    "generic query-string fallback remains excluded");
});

test("all current single-credit generated composer routes qualify under the new source policy", () => {
  const generator = require("../scripts/generate-composer-pages.js");
  const { buildComposerGroups } = require("../scripts/composer-utils.js");
  const games = JSON.parse(fs.readFileSync(path.join("games", "games.json"), "utf8"));
  const existingMetadata = JSON.parse(fs.readFileSync(path.join("music", "composers", "composers.json"), "utf8"));
  const oneCredit = existingMetadata.filter(entry => entry.generated && entry.count === 1);
  assert.ok(oneCredit.length > 0, "expected a real single-credit composer cohort");
  const routes = generator.mergeComposerRoutes(buildComposerGroups(games), []);
  const bySlug = new Map(routes.map(item => [item.slug, item]));
  for (const entry of oneCredit) {
    const route = bySlug.get(entry.slug);
    assert.ok(route, "lost credited composer " + entry.slug);
    assert.equal(route.count, 1, "unexpected credit count change " + entry.slug);
    assert.equal(route.indexable, true, "single-credit route remains noindex: " + entry.slug);
    assert.match(generator.renderGeneratedComposerPage(route), /name="robots" content="index,follow"/);
  }
});

test("publisher and developer single-credit routes are indexable without inventing credits", () => {
  const publisher = require("../scripts/generate-publisher-pages.js");
  const developer = require("../scripts/generate-developer-pages.js");
  const game = {
    title: "Dancing Monster",
    slug: "dancing-monster",
    year: 1983,
    system: "C64",
    publisher: "Commodore"
  };
  const publisherRoute = {
    name: "Example Publisher",
    slug: "example-publisher",
    count: 1,
    c64Count: 1,
    amigaCount: 0,
    firstYear: 1983,
    lastYear: 1983,
    games: [game]
  };
  const developerRoute = { ...publisherRoute, name: "Example Developer", slug: "example-developer" };
  assert.equal(publisher.INDEXABLE_MIN_GAMES, 1);
  assert.equal(developer.INDEXABLE_MIN_GAMES, 1);
  assert.equal(publisher.buildMetadata([publisherRoute], {})[0].indexable, true);
  assert.equal(developer.buildMetadata([developerRoute])[0].indexable, true);
  const pubHtml = publisher.renderPublisherPage(publisherRoute, {});
  const devHtml = developer.renderDeveloperPage(developerRoute);
  for (const html of [pubHtml, devHtml]) {
    assert.match(html, /name="robots" content="index,follow"/);
    assert.match(html, /href="\/games\/dancing-monster\/"/);
    assert.doesNotMatch(html, /name="robots" content="noindex/);
  }
  assert.match(pubHtml, /rel="canonical" href="https:\/\/www\.cheekycommodoregamer\.co\.uk\/games\/publishers\/example-publisher\/"/);
  assert.match(devHtml, /rel="canonical" href="https:\/\/www\.cheekycommodoregamer\.co\.uk\/games\/developers\/example-developer\/"/);
});

test("single-game canonical year archive emits indexable robots and stable discovery links", () => {
  const years = require("../scripts/generate-year-platform-pages.js");
  const games = JSON.parse(fs.readFileSync(path.join("games", "games.json"), "utf8"));
  const data = years.buildArchiveData(games);
  const singletonYears = data.years.filter(group => group.count === 1);
  assert.ok(singletonYears.length >= 1, "the catalogue must include a one-title year for this regression");
  assert.equal(years.INDEXABLE_MIN_GAMES, 1);
  for (const group of singletonYears) {
    assert.equal(group.indexable, true);
    const html = years.renderYearPage(group);
    assert.match(html, /name="robots" content="index,follow"/);
    assert.ok(html.includes('rel="canonical" href="https://www.cheekycommodoregamer.co.uk/games/years/' + group.year + '/"'));
    assert.ok(html.includes('/games/' + group.games[0].slug + '/'));
  }
});

test("publisher-history postprocessing cannot undo one-credit indexability", () => {
  const histories = require("../scripts/materialize-publisher-histories.js");
  assert.equal(histories.INDEXABLE_MIN_GAMES, 1);
  assert.equal(histories.isPublisherIndexable({ count: 1 }, null), true);
  assert.equal(histories.isPublisherIndexable({ count: 0 }, null), false,
    "zero-credit unrelated routes are not promoted");
  assert.equal(histories.isPublisherIndexable({ count: 0 }, { sourceBacked: true }), true,
    "existing independently sourced exceptions remain supported");
});

test("Music Hub and accessible composer directory consolidate canonical signals without losing navigation or portraits", () => {
  const generator = require("../scripts/generate-composer-pages.js");
  const featured = [{
    name: "Rob Hubbard", slug: "rob-hubbard", count: 32, c64Count: 24,
    amigaCount: 8, games: []
  }];
  const music = generator.renderHub(featured, false);
  const directory = generator.renderHub(featured, true);
  const root = "https://www.cheekycommodoregamer.co.uk/music/";
  const alias = "https://www.cheekycommodoregamer.co.uk/music/composers/";

  for (const markup of [music, directory]) {
    assert.ok(markup.includes('<link rel="canonical" href="' + root + '">'));
    assert.ok(markup.includes('<meta property="og:url" content="' + root + '">'));
    assert.ok(markup.includes('<meta name="twitter:url" content="' + root + '">'));
    assert.match(markup, /name="robots" content="index,follow"/);
    assert.match(markup, /<h2>🎼 Featured Composers<\/h2>/);
    assert.match(markup, /<h2>All Composers<\/h2>/);
    assert.ok(markup.includes('/resources/images/composers/hub/rob-hubbard.webp'));
    assert.ok(markup.includes('href="/music/rob-hubbard/"'));
    assert.ok(markup.includes('href="/music/composers/"'));
    assert.ok(markup.includes('composer-discovery-search'));
  }
  assert.match(directory, /C64 &amp; Amiga Composer Archive/);
  assert.ok(directory.includes('"item": "' + alias + '"'),
    "the directory's own breadcrumb remains accurate for visitors");

  const published = fs.readFileSync(path.join("music", "composers", "index.html"), "utf8");
  assert.ok(published.includes('<link rel="canonical" href="' + root + '">'));
  assert.ok(published.includes('<meta property="og:url" content="' + root + '">'));
  assert.ok(published.includes('<meta name="twitter:url" content="' + root + '">'));
  assert.ok(published.includes('/resources/images/composers/hub/'));
  assert.ok(published.includes('href="/music/composers/"'));

  const sitemap = fs.readFileSync("sitemap-pages.xml", "utf8");
  assert.ok(sitemap.includes("<loc>" + root + "</loc>"),
    "preferred Music Hub must remain discoverable");
  assert.ok(!sitemap.includes("<loc>" + alias + "</loc>"),
    "duplicate directory URL must not be offered as a competing sitemap canonical");
  assert.ok(sitemap.includes("<loc>" + root + "neil-crossley/</loc>"),
    "independently indexable composer profiles remain discoverable");
});
