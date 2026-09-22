import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildUtaMapping,
  matchGameToUta,
  normalizePublisher,
  parseUtaIndex
} from "../scripts/generate-uta-map.mjs";

const sampleIndex = `
<html><body>
<a href="Ace_of_Aces_(1986_U.S._Gold)_[730]/">Ace of Aces</a>
<a href="Ace_of_Aces_(1988_Kixx)_[1258]/">Ace of Aces Kixx</a>
<a href="Ace_of_Aces_(1984_Random_Label)_[9999]/">Wrong publisher</a>
<a href="1942_(1986_Elite_Systems_Ltd)_[951]/">1942 Elite</a>
<a href="1942_(1989_Encore)_[10797]/">1942 Encore</a>
<a href="Bangkok_Knights_(0_Summit)_[8568]/">Bangkok Knights Summit</a>
<a href="Bangkok_Knights_(1987_Activision)_[3551]/">Bangkok Knights Activision</a>
</body></html>`;

const ace = {
  system: "C64",
  slug: "ace-of-aces",
  title: "Ace Of Aces",
  year: 1986,
  credits: { publisher: ["Accolade", "US Gold"], re_releaser: ["Kixx"] }
};

const amiga = {
  system: "AMIGA",
  slug: "agony",
  title: "Agony",
  year: 1992,
  credits: { publisher: ["Psygnosis"], re_releaser: [] }
};

test("UTA parser preserves multiple releases and normalises known publisher variants", () => {
  const releases = parseUtaIndex(sampleIndex);
  assert.equal(releases.length, 7);
  assert.equal(normalizePublisher("U.S. Gold"), normalizePublisher("US Gold"));
  assert.equal(normalizePublisher("Elite Systems Ltd"), normalizePublisher("Elite"));
});

test("UTA publisher normalisation covers common C64 label variants without title-only guessing", () => {
  assert.equal(normalizePublisher("Firebird Silver"), normalizePublisher("Firebird"));
  assert.equal(normalizePublisher("CBS Software"), normalizePublisher("CBS Electronics Software"));
  assert.equal(normalizePublisher("Virgin Games"), normalizePublisher("Virgin"));
  assert.equal(normalizePublisher("Ultimate Play The Game"), normalizePublisher("Ultimate"));
  assert.equal(normalizePublisher("Mastertronic Added Dimension"), normalizePublisher("Mastertronic"));
  assert.equal(normalizePublisher("MAD (Mastertronic)"), normalizePublisher("Mastertronic"));
  assert.equal(normalizePublisher("Rack-It (Hewson)"), normalizePublisher("Hewson (Rack IT)"));
});

test("Wonder Boy resolves both the Activision original and Hit Squad cassette re-release", () => {
  const releases = parseUtaIndex(`
<a href="Wonder_Boy_(1987_Activision)_[6764]/">Wonder Boy Activision</a>
<a href="Wonder_Boy_(1991_Hit_Squad)_[1677]/">Wonder Boy Hit Squad</a>
`);
  const wonderBoy = {
    system: "C64",
    slug: "wonder-boy",
    title: "Wonder Boy",
    year: 1987,
    credits: { publisher: ["Activision"], re_releaser: ["The Hit Squad"] }
  };
  const result = matchGameToUta(wonderBoy, releases);
  assert.deepEqual(result.releases.map((row) => row.archiveId), ["6764", "1677"]);
  assert.deepEqual(result.releases.map((row) => row.sourceRole), ["publisher", "re-release"]);
  assert.deepEqual(result.review, []);
});

test("C64 matching requires title plus known publisher/re-release evidence and uses year confidence", () => {
  const releases = parseUtaIndex(sampleIndex);
  const result = matchGameToUta(ace, releases);

  assert.deepEqual(result.releases.map((row) => row.archiveId), ["730", "1258"]);
  assert.equal(result.releases[0].sourceRole, "publisher");
  assert.equal(result.releases[1].sourceRole, "re-release");
  assert.ok(result.review[0].excludedCandidates.some((row) => row.archiveId === "9999"));
});

test("Amiga games are excluded from UTA mapping", () => {
  const result = matchGameToUta(amiga, parseUtaIndex(sampleIndex));
  assert.deepEqual(result.releases, []);
  assert.deepEqual(result.review, []);
});

test("build mapping keeps ambiguous title-only matches out of public data", () => {
  const games = [
    ace,
    {
      system: "C64",
      slug: "1942",
      title: "1942",
      year: 1986,
      credits: { publisher: ["Elite"], re_releaser: [] }
    },
    {
      system: "C64",
      slug: "bangkok-knights",
      title: "Bangkok Knights",
      year: 1987,
      credits: { publisher: ["System 3"], re_releaser: ["Summit"] }
    }
  ];
  const result = buildUtaMapping(games, parseUtaIndex(sampleIndex));

  assert.deepEqual(result.mapping.games["1942"].releases.map((row) => row.archiveId), ["951"]);
  assert.deepEqual(result.mapping.games["bangkok-knights"].releases.map((row) => row.archiveId), ["8568"]);
  assert.ok(result.manualReview.entries.some((entry) =>
    entry.gameSlug === "1942" && entry.excludedCandidates.some((row) => row.archiveId === "10797")
  ));
});

test("seed mapping covers match, multiple releases, no-match and Amiga exclusion cases", () => {
  const mapping = JSON.parse(fs.readFileSync("data/uta-game-matches.json", "utf8"));
  assert.equal(mapping.games["bangkok-knights"].releases.length, 1);
  assert.equal(mapping.games["ace-of-aces"].releases.length, 2);
  assert.equal(mapping.games["20-tons"], undefined);
  assert.equal(mapping.games.agony, undefined);
});

test("single-game community runtime uses compact aggregate/read RPCs and preserves write paths", () => {
  const ratings = fs.readFileSync("js/ccg-community-ratings.js", "utf8");
  const comments = fs.readFileSync("js/ccg-community-comments.js", "utf8");
  const migration = fs.readFileSync("supabase/migrations/20260922003000_single_game_community_read_models.sql", "utf8");

  assert.match(ratings, /rpc\('ccg_game_rating_summary'/);
  assert.match(ratings, /ccg-rating-choice-grid/);
  assert.doesNotMatch(ratings, /<select required name="rating"/);
  assert.match(ratings, /upsert\(\{ user_id: activeUser\.id, game_key: slug, rating: rating \}/);
  assert.match(ratings, /Log in to rate/);

  assert.match(comments, /rpc\('ccg_game_reviews'/);
  assert.match(comments, /Most Helpful/);
  assert.match(comments, /Highest Rating/);
  assert.match(comments, /Lowest Rating/);
  assert.match(comments, /ccg-review-pagination/);
  assert.match(comments, /ccg-review-rating/);
  assert.doesNotMatch(comments, /game_slug: slug/);
  assert.match(comments, /data-action="edit"/);
  assert.match(comments, /data-action="delete"/);
  assert.match(comments, /data-action="report"/);
  assert.match(comments, /data-action="helpful"/);
  assert.match(comments, /from\('comments'\)\.insert/);
  assert.match(comments, /from\('comment_reports'\)\.insert/);
  assert.match(comments, /rpc\('submit_helpful_vote'/);
  assert.match(comments, /Log in to post a review/);
  assert.match(comments, /Anyone can read reviews/);

  assert.match(migration, /security invoker/gi);
  assert.match(migration, /create table if not exists public\.comment_helpful_votes/);
  assert.match(migration, /create or replace function public\.submit_helpful_vote/);
  assert.match(migration, /comment_reports_owner_read/);
});

test("shared community and tape styles retain compact desktop and mobile layouts", () => {
  const communityCss = fs.readFileSync("resources/css/ccg-community.css", "utf8");
  const gameCss = fs.readFileSync("resources/css/game-pages.css", "utf8");

  assert.match(communityCss, /\.ccg-rating-choice-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(10,/);
  assert.match(communityCss, /@media \(max-width:\s*760px\)[\s\S]*\.ccg-rating-choice-grid\s*\{[\s\S]*repeat\(5,/);
  assert.match(communityCss, /\.ccg-review-pagination/);

  assert.match(gameCss, /\.ccg-uta-release-list/);
  assert.match(gameCss, /@media \(max-width:\s*620px\)[\s\S]*\.ccg-uta-release\s*\{[\s\S]*grid-template-columns:\s*1fr/);
});

test("shared template and runtime keep UTA C64-only and hidden without a confident map entry", () => {
  const template = fs.readFileSync("games/game.html", "utf8");
  const runtime = fs.readFileSync("js/ccg-uta-archive.js", "utf8");
  const loader = fs.readFileSync("js/load-single-game.js", "utf8");

  assert.match(template, /id="game-tape-archive-section"/);
  assert.doesNotMatch(template, /ccg-community-rating-panel" open/);
  assert.match(template, /ccg-uta-archive\.js/);
  assert.ok(template.indexOf("ccg-uta-archive.js") < template.indexOf("load-single-game.js"));

  assert.match(runtime, /if \(!game \|\| !isC64\(game\)\)/);
  assert.match(runtime, /loadData\(\)/);
  assert.ok(runtime.indexOf("if (!game || !isC64(game))") < runtime.indexOf("const data = await loadData()"));
  assert.match(runtime, /if \(!record\) \{/);
  assert.match(loader, /label: "Tape"/);
});

test("single-game runtime defers to generated schema and never invents a video upload date from the game release year", () => {
  const loader = fs.readFileSync("js/load-single-game.js", "utf8");
  const validator = fs.readFileSync("scripts/validate-video-seo.js", "utf8");

  assert.match(loader, /data-ccg-schema="game-graph"/);
  assert.match(loader, /if \(staticGameGraph\) return/);
  assert.doesNotMatch(loader, /"uploadDate":\s*game\.year/);
  assert.doesNotMatch(loader, /\$\{game\.year\}-01-01/);

  assert.match(validator, /\(\?:Z\|\[\+\-\]\\d\{2\}:\\d\{2\}\)/);
});


test("UTA runtime omits unknown release years instead of displaying archive sentinel values", () => {
  const runtime = fs.readFileSync("js/ccg-uta-archive.js", "utf8");
  assert.match(runtime, /makeMeta\("Year", release\.year\)/);
  assert.doesNotMatch(runtime, /release\.year \|\| release\.yearLabel/);
});


test("single-game presentation keeps primary content compact and secondary sections collapsed", () => {
  const template = fs.readFileSync("games/game.html", "utf8");
  const loader = fs.readFileSync("js/load-single-game.js", "utf8");
  const ratings = fs.readFileSync("js/ccg-community-ratings.js", "utf8");
  const affiliate = fs.readFileSync("js/affiliate-products.js", "utf8");
  const gameCss = fs.readFileSync("resources/css/game-pages.css", "utf8");
  const communityCss = fs.readFileSync("resources/css/ccg-community.css", "utf8");
  const affiliateCss = fs.readFileSync("resources/css/ccg-affiliate-showcase.css", "utf8");

  assert.match(template, /data-ccg-video-description hidden/);
  assert.doesNotMatch(template, /ccg-community-rating-panel" open/);
  assert.match(loader, /if \(hasVideo && overview\)/);
  assert.match(loader, /videoDescription\.hidden = false/);

  assert.match(gameCss, /SINGLE-GAME COMPACT CONTENT FLOW/);
  assert.match(gameCss, /grid-template-areas:[\s\S]*"description video"/);
  assert.match(gameCss, /aspect-ratio:\s*4\s*\/\s*3/);
  assert.match(gameCss, /#game-utility-hub-section:not\(\[hidden\]\)/);
  assert.match(gameCss, /#game-discovery-links:not\(\[hidden\]\)/);

  assert.match(communityCss, /SINGLE-GAME COMPACT COMMUNITY ACCORDION/);
  assert.match(ratings, /panel\.open = false/);
  assert.match(ratings, /meta\.hidden = true/);
  assert.match(ratings, /toFixed\(1\) \+ '\/10'/);

  assert.match(affiliate, /const communitySection = document\.querySelector\("\.ccg-community-game-section"\)/);
  assert.match(affiliate, /panel\.hidden = true/);
  assert.match(affiliate, /toggle\.hidden = false/);
  assert.match(affiliateCss, /SINGLE-GAME COMPACT AMAZON ACCORDION/);
  assert.match(affiliateCss, /\.ccg-hardware-panel\[hidden\]/);
});
