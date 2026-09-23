import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildUtaMapping,
  matchGameToUta,
  normalizePublisher,
  parseCuratedApprovals,
  parseUtaIndex,
  parseUtaIndexWithDiagnostics
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

test("UTA parser accepts decade-unknown 199x releases without inventing a year", () => {
  const parsed = parseUtaIndex(`
<a href="Ivan_'Ironman'_Stewart's_Super_Off_Road_(199x_Tronix)_[99901]/">Ivan Ironman Stewart</a>
`);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].yearLabel, "199x");
  assert.equal(parsed[0].year, null);
  assert.equal(parsed[0].publisher, "Tronix");
});

test("UTA parser diagnostics expose release-looking directories that would otherwise be silently skipped", () => {
  const parsed = parseUtaIndexWithDiagnostics(`
<a href="Valid_Game_(1989_Ocean_Software_Ltd)_[99902]/">Valid</a>
<a href="Future_Format_(unknown_Label)_[99903]/">Future</a>
`);
  assert.equal(parsed.releases.length, 1);
  assert.deepEqual(parsed.rejectedReleaseDirectories, ["Future_Format_(unknown_Label)_[99903]"]);
});

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
  assert.equal(normalizePublisher("HiTEC Software"), normalizePublisher("Hi-Tec Software"));
  assert.equal(normalizePublisher("Atlantis Gold"), normalizePublisher("Atlantis Software"));
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

test("full-catalogue title normalisation recovers verified punctuation, numeral and subtitle variants", () => {
  const releases = parseUtaIndex(`
<a href="720_(1987_U.S._Gold)_[729]/">720 US Gold</a>
<a href="Cops'n'Robbers_(1985_Atlantis_Gold)_[2857]/">Cops n Robbers</a>
<a href="Cybernoid-_The_Fighting_Machine_(19xx_Kixx)_[1273]/">Cybernoid Kixx</a>
<a href="Hunchback_II_(1985_Ocean_Software_Ltd)_[9001]/">Hunchback II</a>
`);

  const cases = [
    {
      game: { system: "C64", slug: "720-degrees", title: "720 Degrees", year: 1987, credits: { publisher: ["US Gold"], re_releaser: ["Kixx"] } },
      expected: "729"
    },
    {
      game: { system: "C64", slug: "cops-n-robbers", title: "Cops 'N' Robbers", year: 1985, credits: { publisher: ["Atlantis Software"], re_releaser: [] } },
      expected: "2857"
    },
    {
      game: { system: "C64", slug: "cybernoid", title: "Cybernoid", year: 1988, credits: { publisher: ["Hewson"], re_releaser: ["Kixx"] } },
      expected: "1273"
    },
    {
      game: { system: "C64", slug: "hunchback-2-quasimodos-revenge", title: "Hunchback 2", year: 1985, credits: { publisher: ["Ocean Software"], re_releaser: [] } },
      expected: "9001"
    }
  ];

  for (const { game, expected } of cases) {
    const result = matchGameToUta(game, releases);
    assert.equal(result.releases.some((row) => row.archiveId === expected), true, game.slug);
  }
});

test("full-catalogue matching tolerates safe word-spacing variants with publisher evidence", () => {
  const releases = parseUtaIndex(`
<a href="Bad_Dudes_vs_Dragon_Ninja_(1989_Imagine)_[4305]/">Bad Dudes</a>
<a href="Bad_Dudes_vs_Dragon_Ninja_(1991_Hit_Squad)_[1152]/">Bad Dudes Hit Squad</a>
<a href="Newzealand_Story,_The_(1989_Ocean_Software_Ltd)_[2154]/">New Zealand Story</a>
<a href="Night_Breed_(1992_Hit_Squad)_[1544]/">Night Breed</a>
<a href="Hero_Quest_(1991_Gremlin_Graphics)_[3167]/">Hero Quest</a>
<a href="Highnoon_(1984_Ocean_Software_Ltd)_[2141]/">Highnoon</a>
<a href="Micro_Mouse_Goes_De-Bugging_(1983_M.C._Lothlorien)_[291]/">Micro Mouse Goes De-Bugging</a>
`);

  const cases = [
    {
      game: { system: "C64", slug: "bad-dudes-vs-dragonninja", title: "Bad Dudes Vs Dragonninja", year: 1989, credits: { publisher: ["Imagine"], re_releaser: ["The Hit Squad"] } },
      expected: ["4305", "1152"]
    },
    {
      game: { system: "C64", slug: "the-new-zealand-story", title: "The New Zealand Story", year: 1989, credits: { publisher: ["Ocean"], re_releaser: ["The Hit Squad"] } },
      expected: ["2154"]
    },
    {
      game: { system: "C64", slug: "nightbreed-the-action-game", title: "Nightbreed: The Action Game", sorttitle: "Nightbreed", year: 1990, credits: { publisher: ["Ocean"], re_releaser: ["The Hit Squad"] } },
      expected: ["1544"]
    },
    {
      game: { system: "C64", slug: "heroquest", title: "Heroquest", year: 1991, credits: { publisher: ["Gremlin Graphics"], re_releaser: [] } },
      expected: ["3167"]
    },
    {
      game: { system: "C64", slug: "high-noon", title: "High Noon", year: 1984, credits: { publisher: ["Ocean"], re_releaser: [] } },
      expected: ["2141"]
    },
    {
      game: { system: "C64", slug: "micro-mouse-goes-debugging", title: "Micro Mouse Goes Debugging", year: 1983, credits: { publisher: ["MC Lothlorien"], re_releaser: [] } },
      expected: ["291"]
    }
  ];

  for (const { game, expected } of cases) {
    const result = matchGameToUta(game, releases);
    assert.deepEqual(result.releases.map((row) => row.archiveId), expected, game.slug);
  }
});

test("UTA comma-article subtitle notation matches the canonical leading-article title", () => {
  const releases = parseUtaIndex(`
<a href="Train,_The-_Escape_to_Normandy_(1988_Electronic_Arts)_[5396]/">The Train</a>
`);
  const game = {
    system: "C64",
    slug: "the-train-escape-to-normandy",
    title: "The Train: Escape To Normandy",
    year: 1987,
    credits: { publisher: ["Accolade", "Electronic Arts"], re_releaser: [] }
  };
  const result = matchGameToUta(game, releases);
  assert.deepEqual(result.releases.map((row) => row.archiveId), ["5396"]);
});

test("publisher-qualified prefix matching does not collapse numbered sequels into the wrong game", () => {
  const releases = parseUtaIndex(`
<a href="Dragon's_Lair_(1986_Software_Projects)_[9100]/">Dragon's Lair</a>
`);
  const game = {
    system: "C64",
    slug: "dragons-lair-2-escape-from-singes-castle",
    title: "Dragon's Lair II: Escape From Singe's Castle",
    year: 1987,
    credits: { publisher: ["Software Projects"], re_releaser: ["Encore"] }
  };
  const result = matchGameToUta(game, releases);
  assert.deepEqual(result.releases, []);
});

test("composite re-release credits expose each explicit label component to UTA matching", () => {
  const releases = parseUtaIndex(`
<a href="Silkworm_(1992_Tronix)_[5873]/">Silkworm Tronix</a>
<a href="Silkworm_(1989_Virgin)_[9783]/">Silkworm Virgin</a>
`);
  const game = {
    system: "C64",
    slug: "silkworm",
    title: "Silkworm",
    year: 1989,
    credits: { publisher: ["The Sales Curve"], re_releaser: ["Tronix (Virgin Games)"] }
  };
  const result = matchGameToUta(game, releases);
  assert.deepEqual(result.releases.map((row) => row.archiveId), ["9783", "5873"]);
  assert.ok(result.releases.every((row) => row.sourceRole === "re-release"));
});

test("later tapes from an explicitly known publisher are retained instead of being dropped by an arbitrary one-year ceiling", () => {
  const releases = parseUtaIndex(`
<a href="Choplifter!_(1984_Ariolasoft)_[4263]/">Choplifter Ariolasoft</a>
<a href="Soccer_Boss_(1987_Alternative_Software)_[24133]/">Soccer Boss Alternative</a>
`);
  const choplifter = matchGameToUta({
    system: "C64",
    slug: "choplifter",
    title: "Choplifter",
    year: 1982,
    credits: { publisher: ["Ariolasoft", "Brøderbund"], re_releaser: [] }
  }, releases);
  assert.deepEqual(choplifter.releases.map((row) => row.archiveId), ["4263"]);

  const soccerBoss = matchGameToUta({
    system: "C64",
    slug: "soccer-boss",
    title: "Soccer Boss",
    year: 1984,
    credits: { publisher: ["Alternative Software"], re_releaser: ["Alternative Software"] }
  }, releases);
  assert.deepEqual(soccerBoss.releases.map((row) => row.archiveId), ["24133"]);
  assert.equal(soccerBoss.releases[0].sourceRole, "re-release");
});

test("curated exact archive IDs approve verified releases without weakening title or publisher safeguards", () => {
  const releases = parseUtaIndex(`
<a href="Karateka_(1985_Ariolasoft)_[2866]/">Karateka Ariolasoft</a>
<a href="Karateka_(1985_Random_Label)_[9999]/">Karateka random label</a>
<a href="Karateka_Championship_(1985_Ariolasoft)_[7777]/">Karateka Championship</a>
`);
  const game = {
    system: "C64",
    slug: "karateka",
    title: "Karateka",
    year: 1985,
    credits: { publisher: ["Brøderbund"], re_releaser: [] }
  };
  const curated = parseCuratedApprovals({
    entries: [{ gameSlug: "karateka", archiveIds: ["2866", "7777"] }]
  });
  const result = buildUtaMapping([game], releases, curated);

  assert.deepEqual(result.mapping.games.karateka.releases.map((row) => row.archiveId), ["2866"]);
  assert.equal(result.mapping.games.karateka.releases[0].sourceRole, "verified-release");
  assert.equal(result.mapping.games.karateka.releases[0].verification, "curated-archive-id");
  assert.ok(result.manualReview.entries.some((entry) =>
    entry.gameSlug === "karateka"
      && entry.excludedCandidates.some((row) => row.archiveId === "9999")
  ));
  assert.ok(result.manualReview.entries.some((entry) =>
    entry.gameSlug === "karateka"
      && entry.excludedCandidates.some((row) => row.archiveId === "7777")
  ));
});

test("curated semantic title aliases remain archive-ID scoped", () => {
  const releases = parseUtaIndex(`
<a href="Australian_Games_(1990_ERBE_Software)_[20824]/">Australian Games ERBE</a>
<a href="Australian_Games_(1990_Random_Label)_[20825]/">Australian Games random</a>
`);
  const game = {
    system: "C64",
    slug: "aussie-games",
    title: "Aussie Games",
    year: 1989,
    credits: { publisher: ["Mindscape"], re_releaser: [] }
  };
  const curated = parseCuratedApprovals({
    entries: [{
      gameSlug: "aussie-games",
      archiveIds: ["20824"],
      titleAliases: ["Australian Games"]
    }]
  });
  const result = buildUtaMapping([game], releases, curated);

  assert.deepEqual(result.mapping.games["aussie-games"].releases.map((row) => row.archiveId), ["20824"]);
  assert.equal(result.mapping.games["aussie-games"].releases[0].titleMatch, "curated-title-alias");
  assert.equal(result.mapping.games["aussie-games"].releases[0].sourceRole, "verified-release");
  assert.ok(!result.mapping.games["aussie-games"].releases.some((row) => row.archiveId === "20825"));
});

test("curated approvals remain scoped to the named game slug", () => {
  const releases = parseUtaIndex(`
<a href="Karateka_(1985_Ariolasoft)_[2866]/">Karateka Ariolasoft</a>
`);
  const game = {
    system: "C64",
    slug: "karateka-copy",
    title: "Karateka",
    year: 1985,
    credits: { publisher: ["Brøderbund"], re_releaser: [] }
  };
  const curated = parseCuratedApprovals({
    entries: [{ gameSlug: "karateka", archiveIds: ["2866"] }]
  });
  const result = buildUtaMapping([game], releases, curated);

  assert.equal(result.mapping.games["karateka-copy"], undefined);
  assert.equal(result.audit.summary.matchedGames, 0);
  assert.equal(result.audit.summary.manualReviewGames, 1);
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
  assert.equal(result.audit.summary.c64Games, 3);
  assert.equal(result.audit.summary.matchedGames, 3);
  assert.equal(result.audit.summary.unmatchedGames, 0);
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
