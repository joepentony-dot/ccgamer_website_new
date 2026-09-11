import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const {
  releaseFromHtml,
  releaseMatchesGame,
  resolveSourcePage,
  uniqueReviews
} = require(path.join(root, "scripts", "import-amiga-magazine-reviews.js"));

function review(overrides = {}) {
  return {
    magazine: "Zzap!64",
    issue: "1",
    date: "May 1985",
    page: 10,
    reviewer: "",
    score: "80%",
    scorePercent: 80,
    url: "https://example.com/review",
    language: "English",
    scanStatus: "available",
    era: "contemporary",
    ...overrides
  };
}

function page(overrides = {}) {
  return {
    cacheName: "page.html",
    canonical: "https://www.lemon64.com/game/example",
    platform: "c64",
    title: "Example",
    release: { year: 1985, publishers: ["Digital Integration"] },
    reviews: [review()],
    ...overrides
  };
}

test("release parser reads primary Lemon credits", () => {
  const html = `<meta name="description" content="Speed King is a Commodore 64 game released in 1986 by Mastertronic.">
<table>
<tr><td>Released:</td><td><a>1986</a></td></tr>
<tr><td>Publisher:</td><td><a href="/games/list.php?list_company=mastertronic">Mastertronic</a><span><a href="/games/entity_details.php?id=1">Info</a></span></td></tr>
</table>`;
  assert.deepEqual(releaseFromHtml(html), { year: 1986, publishers: ["Mastertronic"] });
});

test("manual Lemon source wins over inferred candidates", () => {
  const manual = page({
    canonical: "https://www.lemon64.com/game/manual",
    title: "Different",
    release: { year: 1986, publishers: ["Mastertronic"] }
  });
  const inferred = page({
    cacheName: "inferred.html",
    canonical: "https://www.lemon64.com/game/inferred",
    title: "Speed King",
    release: { year: 1985, publishers: ["Digital Integration"] }
  });
  const result = resolveSourcePage({
    system: "C64",
    title: "Speed King",
    year: 1985,
    credits: { publisher: ["Digital Integration"] },
    lemon: "https://www.lemon64.com/game/manual"
  }, [manual, inferred]);
  assert.equal(result.resolution, "manual");
  assert.equal(result.page, manual);
});

test("an unresolved manual Lemon source does not silently fall back to inference", () => {
  const inferred = page({
    canonical: "https://www.lemon64.com/game/speed-king-di",
    title: "Speed King"
  });
  const result = resolveSourcePage({
    system: "C64",
    title: "Speed King",
    year: 1985,
    credits: { publisher: ["Digital Integration"] },
    lemon: "https://www.lemon64.com/game/not-cached"
  }, [inferred]);
  assert.equal(result.resolution, "manual-unresolved");
  assert.equal(result.page, null);
});

test("inference requires exact title, platform and one matching release", () => {
  const correct = page({
    canonical: "https://www.lemon64.com/game/speed-king-di",
    title: "Speed King"
  });
  const wrongTitle = page({
    cacheName: "title.html",
    canonical: "https://www.lemon64.com/game/speed-king-bang",
    title: "Speed King!"
  });
  const wrongPlatform = page({
    cacheName: "amiga.html",
    canonical: "https://www.lemonamiga.com/game/speed-king",
    platform: "amiga",
    title: "Speed King"
  });
  const result = resolveSourcePage({
    system: "C64",
    title: "Speed King",
    year: 1985,
    credits: { publisher: ["Digital Integration"] }
  }, [correct, wrongTitle, wrongPlatform]);
  assert.equal(result.resolution, "inferred");
  assert.equal(result.page, correct);
});

test("ambiguous matching releases are rejected", () => {
  const a = page({
    canonical: "https://www.lemon64.com/game/speed-king-a",
    title: "Speed King"
  });
  const b = page({
    cacheName: "b.html",
    canonical: "https://www.lemon64.com/game/speed-king-b",
    title: "Speed King"
  });
  const result = resolveSourcePage({
    system: "C64",
    title: "Speed King",
    year: 1985,
    credits: { publisher: ["Digital Integration"] }
  }, [a, b]);
  assert.equal(result.resolution, "ambiguous");
  assert.equal(result.page, null);
  assert.equal(result.candidates, 2);
});

test("Speed King 1985 Digital Integration does not inherit 1986 Mastertronic reviews by title", () => {
  const mastertronic = page({
    canonical: "https://www.lemon64.com/game/speed-king",
    title: "Speed King",
    release: { year: 1986, publishers: ["Mastertronic"] }
  });
  const game = {
    system: "C64",
    title: "Speed King",
    year: 1985,
    credits: {
      publisher: ["Digital Integration"],
      re_releaser: ["Mastertronic"]
    }
  };
  assert.equal(releaseMatchesGame(game, mastertronic.release), false);
  const result = resolveSourcePage(game, [mastertronic]);
  assert.equal(result.resolution, "unmatched");
  assert.equal(result.page, null);
});

test("publication rows are validated before merge", () => {
  const rows = uniqueReviews([
    review(),
    review({ magazine: "", scorePercent: 80 }),
    review({ magazine: "ACE", score: "999%", scorePercent: 999 })
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].magazine, "Zzap!64");
});
