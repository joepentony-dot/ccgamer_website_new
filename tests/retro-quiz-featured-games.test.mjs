import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const { featuredGamesFor } = require("../scripts/generate-video-library.js");
const games = [
  { slug: "premiere", title: "Premiere" },
  { slug: "arcade-classics", title: "Arcade Classics" },
  { slug: "the-last-ninja", title: "The Last Ninja" }
];
const bySlug = new Map(games.map((game) => [game.slug, game]));

test("identification quizzes do not link unrelated catalogue games found in general YouTube prose", () => {
  const quiz = { title: "50 ZX Spectrum Games Quiz", disableAutoFeaturedGames: true };
  const metadata = { description: "Our premiere includes arcade classics and some difficult titles." };
  assert.deepEqual(featuredGamesFor(quiz, metadata, bySlug, games), []);
});

test("explicit curator-selected game links remain allowed when automatic matching is disabled", () => {
  const quiz = { disableAutoFeaturedGames: true, featuredGameSlugs: ["the-last-ninja"] };
  const metadata = { description: "Premiere of arcade classics, do not auto-link those words." };
  assert.deepEqual(featuredGamesFor(quiz, metadata, bySlug, games).map(x => x.slug), ["the-last-ninja"]);
});

test("non-quiz features retain existing automatic exact-title matching", () => {
  const feature = { title: "The Last Ninja", description: "A review of the The Last Ninja game" };
  assert.deepEqual(featuredGamesFor(feature, {}, bySlug, games).map(x => x.slug), ["the-last-ninja"]);
});

test("all three CCG identification quizzes opt out in authoritative Retro Specials data", () => {
  const entries = JSON.parse(fs.readFileSync(new URL("../data/retro-specials.json", import.meta.url), "utf8"));
  const expected = [
    ["qJZa1zB2zHU", "50-commodore-64-games-can-you-identify-them"],
    ["kc86gnQh7ww", "50-amiga-games-can-you-identify-them"],
    ["XxEhpjSoYc8", "50-zx-spectrum-games-can-you-identify-them"]
  ];
  for (const [youtubeId, slug] of expected) {
    const matching = entries.filter(e => e.youtubeId === youtubeId && e.slug === slug);
    assert.equal(matching.length, 1, `Expected exactly one ${slug} source entry`);
    assert.equal(matching[0].disableAutoFeaturedGames, true);
  }
});
