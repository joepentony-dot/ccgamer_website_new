import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const template = fs.readFileSync("games/game.html", "utf8");
const loader = fs.readFileSync("js/load-single-game.js", "utf8");
const awards = fs.readFileSync("js/ccg-game-badges.js", "utf8");

test("single-game hero has one identity and rating treatment", () => {
  assert.match(template, /class="game-hero__actions ccg-share"/);
  assert.doesNotMatch(template, /id="gameHeroRating"|id="gameMetaYear"|id="gameMetaSystem"/);
  assert.match(loader, /addBadge\(system, "game-badge--system"\)/);
  assert.match(loader, /addBadge\(year, "game-badge--year"\)/);
  assert.match(loader, /addBadge\(ratingLabel, "game-badge--rating"\)/);
  assert.match(loader, /if \(heroRating\) heroRating\.remove\(\)/);
  assert.match(loader, /if \(meta\) meta\.remove\(\)/);
});

test("credits remain compact inside the hero record", () => {
  assert.match(loader, /heroContent\.querySelector\("\.game-hero__actions"\)/);
  assert.match(loader, /ccg-behind-pixels-inline__item/);
  assert.doesNotMatch(loader, /insertAfter\(videoSection, credits\)/);
  assert.doesNotMatch(loader, /insertAfter\(descriptionSection, credits\)/);
});

test("magazine awards do not repeat the platform identity", () => {
  assert.match(awards, /Zzap!64 awards/);
  assert.doesNotMatch(awards, /createPlatformBadge|commodore-64-logo|commodore-amiga-logo/);
});
