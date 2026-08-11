import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const { build, cleanRecord } = require(path.join(root, "scripts", "build-magazine-review-chunks.js"));

function reviewSource() {
  const games = {};
  for (const name of ["0-d", "e-h", "i-l", "m-p", "q-t", "u-z"]) {
    const parsed = JSON.parse(fs.readFileSync(path.join(root, "data", "magazine-review-records", `${name}.json`), "utf8"));
    Object.assign(games, parsed.games || {});
  }
  return { version: 1, games };
}

test("builds platform-aware review keys without mixing C64 and Amiga", () => {
  const built = build({
    games: {
      "amiga:test-game": [{ magazine: "Amiga Format", score: "90%", scorePercent: 90, url: "https://example.com/a" }],
      "c64:test-game": [{ magazine: "Zzap!64", score: "91%", scorePercent: 91, url: "https://example.com/c" }]
    }
  });
  const chunk = JSON.parse(built.files["q-t.json"]);
  assert.equal(chunk.games["amiga:test-game"][0].scorePercent, 90);
  assert.equal(chunk.games["c64:test-game"][0].scorePercent, 91);
});

test("rejects invalid scores and unsafe review URLs", () => {
  assert.equal(cleanRecord({ magazine: "Magazine", score: "110%", scorePercent: 110 }), null);
  const record = cleanRecord({ magazine: "Magazine", score: "8/10", scorePercent: 80, url: "http://example.com" });
  assert.equal(record.url, "");
  assert.equal(record.scanStatus, "missing");
});

test("Arcade Pool contains the verified Amiga Format review", () => {
  const source = reviewSource();
  const reviews = source.games["amiga:arcade-pool"];
  const format = reviews.find((review) => review.magazine === "Amiga Format" && review.issue === "59");
  assert.equal(format.scorePercent, 94);
  assert.equal(format.page, 65);
  assert.equal(reviews.length, 13);
});

test("cached magazine references cover almost the entire Amiga catalogue without cross-edition matches", () => {
  const games = JSON.parse(fs.readFileSync(path.join(root, "games/games.json"), "utf8"));
  const source = reviewSource();
  const amigaGames = games.filter((game) => /amiga/i.test(String(game.system || "")));
  const covered = amigaGames.filter((game) => source.games[`amiga:${game.slug}`]?.length);
  assert.equal(amigaGames.length, 99);
  assert.equal(covered.length, 98);
});

test("Amiga title variants retain their complete verified review sets", () => {
  const source = reviewSource();
  assert.equal(source.games["amiga:aladdin"].length, 14);
  assert.equal(source.games["amiga:brutal-sports-football"].length, 14);
  assert.equal(source.games["amiga:sensible-soccer"].length, 19);
  assert.equal(source.games["amiga:zeewolf"].length, 11);
});

test("Ace of Aces uses its scored direct Zzap review reference", () => {
  const source = reviewSource();
  const review = source.games["c64:ace-of-aces"].find((row) => row.magazine === "Zzap!64" && row.issue === "20");
  assert.equal(review.scorePercent, 88);
  assert.equal(review.page, 148);
  assert.equal(review.url, "https://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=20&page=148");
});

test("schema loader uses the combined magazine runtime", () => {
  const schema = fs.readFileSync(path.join(root, "js", "ccg-schema.js"), "utf8");
  assert.match(schema, /magazine-game-reviews-runtime\.js/);
  assert.doesNotMatch(schema, /script\.src = '\/js\/zzap64-game-reviews-runtime\.js'/);
});

test("game music requests metadata when its player opens", () => {
  const player = fs.readFileSync(path.join(root, "js", "ccg-game-music-player.js"), "utf8");
  assert.doesNotMatch(player, /audio\.preload = "none"/);
  assert.match(player, /audio\.preload = "metadata"/);
  assert.match(player, /audio\.load\(\)/);
});

test("3D box artwork opens in the shared accessible image modal", () => {
  const loader = fs.readFileSync(path.join(root, "js", "load-single-game.js"), "utf8");
  const modalCss = fs.readFileSync(path.join(root, "resources", "css", "ccg-modal.css"), "utf8");
  assert.match(loader, /bindHeroBox3dZoom\(box, img\)/);
  assert.match(loader, /event\.key !== "Enter" && event\.key !== " "/);
  assert.match(loader, /ccg-modal--box3d/);
  assert.match(modalCss, /\.ccg-box3d-modal-image/);
});
