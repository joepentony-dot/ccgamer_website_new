import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const {
  materializeMagazineReviewsHtml
} = require(path.join(root, "scripts", "ensure-magazine-review-runtime.js"));

test("Reliable Games Publishing imports local magazine metadata before rebuilding games", () => {
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "games-publishing.yml"), "utf8");
  const importIndex = workflow.indexOf("node scripts/import-amiga-magazine-reviews.js");
  const rebuildIndex = workflow.indexOf("node scripts/rebuild-games.js");

  assert.ok(importIndex >= 0, "Reliable Games Publishing does not import locally cached/curated magazine reviews");
  assert.ok(rebuildIndex >= 0, "Reliable Games Publishing does not run the authoritative rebuild");
  assert.ok(importIndex < rebuildIndex, "magazine reviews must be imported before game pages are rebuilt");
});

test("magazine reviews are materialized after canonical SEO game routes are generated", () => {
  const rebuild = fs.readFileSync(path.join(root, "scripts", "rebuild-games.js"), "utf8");
  const routeIndex = rebuild.indexOf('["prepare-seo-game-routes.js", "--output-root", "."]');
  const materializeIndex = rebuild.indexOf('["ensure-magazine-review-runtime.js"]');

  assert.ok(routeIndex >= 0, "canonical SEO game route generation is missing from the rebuild chain");
  assert.ok(materializeIndex >= 0, "magazine review materialization is missing from the rebuild chain");
  assert.ok(
    routeIndex < materializeIndex,
    "magazine reviews must be materialized after canonical route generation so the route builder cannot wipe them"
  );
});

test("external Lemon availability is not a publishing prerequisite", () => {
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "games-publishing.yml"), "utf8");
  assert.doesNotMatch(workflow, /Cache required Lemon magazine sources/);
  assert.doesNotMatch(workflow, /refresh-lemon-game-cache\.js --check --base HEAD\^/);
  assert.doesNotMatch(workflow, /refresh-lemon-game-cache\.js --base HEAD\^/);
  assert.match(workflow, /External Lemon64\/Lemon Amiga availability is optional/);
});

test("the magazine importer preserves support for existing C64 and Amiga Lemon cache data", () => {
  const importer = fs.readFileSync(path.join(root, "scripts", "import-amiga-magazine-reviews.js"), "utf8");
  assert.match(importer, /\/amiga\|c64\/i/);
  assert.match(importer, /Magazine Reviews/i);
  assert.match(importer, /reviewsFromHtml/);
});

test("generated game HTML receives magazine reviews at build time instead of relying only on browser JavaScript", () => {
  const source = `
<section id="game-reading-section" class="game-section" hidden>
  <article id="game-reading-card" class="ccg-utility-card" hidden>
    <div id="gameMagazineReviews"><p class="game-review-empty">No verified review scan has been attached yet.</p></div>
  </article>
</section>`;
  const rows = [
    { magazine: "C&VG", issue: "69", date: "July 1987", page: 40, reviewer: "", score: "9/10", scorePercent: 90, url: "", language: "English", scanStatus: "missing", era: "contemporary" },
    { magazine: "Commodore User", issue: "46", date: "July 1987", page: 42, reviewer: "Bill Scolding", score: "8/10", scorePercent: 80, url: "", language: "English", scanStatus: "missing", era: "contemporary" },
    { magazine: "Your Commodore", issue: "35", date: "August 1987", page: 34, reviewer: "", score: "9/10", scorePercent: 90, url: "", language: "English", scanStatus: "missing", era: "contemporary" },
    { magazine: "Zzap!64", issue: "28", date: "August 1987", page: 39, reviewer: "White Wizard", score: "70%", scorePercent: 70, url: "https://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=28&page=39", language: "English", scanStatus: "available", era: "contemporary" }
  ];

  const result = materializeMagazineReviewsHtml(source, rows);
  const sectionTag = result.html.match(/<section\b[^>]*id="game-reading-section"[^>]*>/i)?.[0] || "";
  const cardTag = result.html.match(/<article\b[^>]*id="game-reading-card"[^>]*>/i)?.[0] || "";

  assert.equal(result.foundContainer, true);
  assert.ok(sectionTag, "magazine review section disappeared during materialization");
  assert.ok(cardTag, "magazine review card disappeared during materialization");
  assert.doesNotMatch(sectionTag, /\shidden\b/i);
  assert.doesNotMatch(cardTag, /\shidden\b/i);
  assert.doesNotMatch(result.html, /game-review-empty/);
  assert.match(result.html, /data-ccg-static-magazine-reviews="true"/);
  assert.match(result.html, /Magazine Reviews · 4/);
  assert.match(result.html, /C&amp;VG/);
  assert.match(result.html, /Commodore User/);
  assert.match(result.html, /Your Commodore/);
  assert.match(result.html, /Zzap!64/);
  assert.match(result.html, /70%/);
  assert.match(result.html, /issue=28&amp;page=39/);
});

test("Mr Weems retains the three verified contemporary magazine scores", () => {
  const supplementPath = path.join(
    root,
    "data",
    "magazine-review-records",
    "supplements",
    "mr-weems-and-the-she-vampires.json"
  );
  const supplement = JSON.parse(fs.readFileSync(supplementPath, "utf8"));
  const rows = supplement.games?.["c64:mr-weems-and-the-she-vampires"] || [];

  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((row) => [row.magazine, row.score, row.scorePercent]),
    [
      ["Commodore User", "5/10", 50],
      ["Your Commodore", "8/10", 80],
      ["Zzap!64", "19%", 19]
    ]
  );
});

test("Stifflip & Co retains four independently curated contemporary magazine scores", () => {
  const supplementPath = path.join(
    root,
    "data",
    "magazine-review-records",
    "supplements",
    "stifflip-and-co.json"
  );
  const supplement = JSON.parse(fs.readFileSync(supplementPath, "utf8"));
  const rows = supplement.games?.["c64:stifflip-and-co"] || [];

  assert.deepEqual(
    rows.map((row) => [row.magazine, row.score, row.scorePercent]),
    [
      ["C&VG", "9/10", 90],
      ["Commodore User", "8/10", 80],
      ["Your Commodore", "9/10", 90],
      ["Zzap!64", "70%", 70]
    ]
  );
});
