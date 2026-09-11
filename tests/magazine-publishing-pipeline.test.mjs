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
const {
  CANONICAL_LEMON_URL,
  correctSpeedKing
} = require(path.join(root, "scripts", "migrate-speed-king-release.js"));

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

test("missing Lemon sources retry before magazine import without becoming a publishing prerequisite", () => {
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "games-publishing.yml"), "utf8");
  const refreshIndex = workflow.indexOf("node scripts/refresh-lemon-game-cache.js --all-missing");
  const importIndex = workflow.indexOf("node scripts/import-amiga-magazine-reviews.js");
  const refreshStep = workflow.match(/- name: Refresh missing Lemon reference pages \(best effort\)[\s\S]*?continue-on-error:\s*true[\s\S]*?node scripts\/refresh-lemon-game-cache\.js --all-missing/);

  assert.ok(refreshIndex >= 0, "uncached Lemon sources are not retried before magazine import");
  assert.ok(importIndex >= 0 && refreshIndex < importIndex, "Lemon source refresh must run before magazine import");
  assert.ok(refreshStep, "Lemon refresh must be explicitly best-effort so an external outage cannot block publishing");
  assert.doesNotMatch(workflow, /refresh-lemon-game-cache\.js --check/);
  assert.match(workflow, /External Lemon64\/Lemon Amiga availability is optional and cannot block publishing/);
});

test("Speed King migration establishes the original Digital Integration release before source refresh", () => {
  const game = {
    system: "C64",
    slug: "speed-king",
    year: 1986,
    credits: {
      publisher: ["Mastertronic"],
      re_releaser: []
    }
  };

  assert.equal(correctSpeedKing(game), true);
  assert.equal(game.year, 1985);
  assert.deepEqual(game.credits.publisher, ["Digital Integration"]);
  assert.deepEqual(game.credits.re_releaser, ["Mastertronic"]);
  assert.deepEqual(game.lemon, [CANONICAL_LEMON_URL]);

  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "games-publishing.yml"), "utf8");
  const migrationIndex = workflow.indexOf("node scripts/migrate-speed-king-release.js");
  const refreshIndex = workflow.indexOf("node scripts/refresh-lemon-game-cache.js --all-missing");
  assert.ok(migrationIndex >= 0 && migrationIndex < refreshIndex, "Speed King release identity must be corrected before Lemon cache refresh");
});

test("Premiere materializes the 15 verified reviews from its local Lemon Amiga cache", () => {
  const sourceRoot = path.join(root, "data", "magazine-review-records");
  const reviewRows = fs.readdirSync(sourceRoot)
    .filter((name) => name.endsWith('.json'))
    .flatMap((name) => {
      const games = JSON.parse(fs.readFileSync(path.join(sourceRoot, name), 'utf8')).games || {};
      return games['amiga:premiere'] || [];
    });

  assert.equal(reviewRows.length, 15, 'Premiere must materialize all 15 verified Lemon Amiga magazine reviews');
  assert.deepEqual(
    reviewRows.map((row) => [row.magazine, row.score, row.scorePercent]),
    [
      ["Amiga Action", "92%", 92],
      ["Amiga Format", "89%", 89],
      ["Amiga Format", "8/10", 80],
      ["Amiga Games", "75%", 75],
      ["Amiga Joker", "78%", 78],
      ["Amiga Magazine", "8/10", 80],
      ["Amiga Mania", "83%", 83],
      ["Amiga Power", "84%", 84],
      ["Amiga Power", "70%", 70],
      ["CU Amiga", "85%", 85],
      ["CU Amiga", "84%", 84],
      ["Datormagazin", "95%", 95],
      ["The One", "81%", 81],
      ["The One", "67%", 67],
      ["Zero", "88%", 88]
    ],
    'Premiere materialized rows must remain the verified Lemon-derived review set'
  );

  const pendingPath = path.join(root, 'data', 'lemon-source-pending.json');
  const pending = fs.existsSync(pendingPath)
    ? JSON.parse(fs.readFileSync(pendingPath, 'utf8'))
    : [];
  assert.equal(pending.includes('premiere'), false, 'Premiere must leave the retry queue once a verified local Lemon Amiga source is cached');

  const cachePath = path.join(root, 'data', 'lemon-cache', 'f07fdfee4a82e132398c03c281fb48fa1a81e0c2.html');
  assert.equal(fs.existsSync(cachePath), true, 'Premiere verified Lemon Amiga cache snapshot is missing');
  const cache = fs.readFileSync(cachePath, 'utf8');
  assert.match(cache, /<link rel="canonical" href="https:\/\/www\.lemonamiga\.com\/game\/premiere">/);
  assert.match(cache, /<tr><td>Released:<\/td><td>1992<\/td><\/tr>/);
  assert.match(cache, /Core Design/);
  assert.equal((cache.match(/class="magazine-rating"/g) || []).length, 15, 'Premiere cache must retain all 15 verified magazine reviews');

  const runtime = fs.readFileSync(path.join(root, 'js', 'magazine-game-reviews-runtime.js'), 'utf8');
  assert.match(runtime, /if \(!rows\.length\)/);
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
