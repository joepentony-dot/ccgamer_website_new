import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const games = JSON.parse(fs.readFileSync("games/games.json", "utf8"));
const enrichmentPayload = JSON.parse(
  fs.readFileSync("data/game-description-enrichments.json", "utf8")
);
const enrichments = enrichmentPayload.games;
const loader = fs.readFileSync("js/load-single-game.js", "utf8");
const routeGenerator = fs.readFileSync("scripts/prepare-seo-game-routes.js", "utf8");
const videoGenerator = fs.readFileSync("scripts/generate-video-seo.js", "utf8");
const { structuralErrors } = require("../scripts/audit-game-manuals.js");

function wordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

test("every game has a concise sourced archive description", () => {
  assert.equal(games.length, 654);
  assert.equal(Object.keys(enrichments).length, games.length);

  for (const game of games) {
    const entry = enrichments[game.slug];
    assert.ok(entry, `missing description enrichment for ${game.slug}`);
    assert.ok(wordCount(entry.description) >= 90, `${game.slug} description is too short`);
    assert.ok(wordCount(entry.description) <= 165, `${game.slug} description is too long`);
    assert.ok(Array.isArray(entry.sources) && entry.sources.length, `${game.slug} has no sources`);
    assert.doesNotMatch(entry.description, /https?:\/\/|www\.|#[a-z0-9_]+/i);
  }
});

test("Activision Decathlon overview contains the useful gameplay specifics", () => {
  const description = enrichments["the-activision-decathlon"].description;
  assert.match(description, /Up to four players/i);
  assert.match(description, /all ten events/i);
  assert.match(description, /joystick movement/i);
  assert.match(description, /highest combined score wins/i);
});

test("description enrichment feeds browser, static route and video output", () => {
  assert.match(loader, /fetchGameDescriptionEnrichments/);
  assert.match(loader, /videoDescription\.textContent = game\.description/);
  assert.match(routeGenerator, /readGameDescriptionEnrichments/);
  assert.match(videoGenerator, /readGameDescriptionEnrichments/);
  assert.doesNotMatch(videoGenerator, /gameDescription \? `\$\{intro\}/);
  assert.match(videoGenerator, /replace\(match\[3\], \(\) => json\)/);
  assert.match(videoGenerator, /replace\(scriptRe, \(\) => replacement\)/);
});

test("manual fields are structurally separate from game media", () => {
  assert.deepEqual(structuralErrors(games), []);
  const decathlon = games.find((game) => game.slug === "the-activision-decathlon");
  const bcQuest = games.find((game) => game.slug === "bcs-quest-for-tires");
  const bcTwo = games.find((game) => game.slug === "bc2-grogs-revenge");
  assert.match(decathlon.pdf, /archive\.org\/download\/Commodore64Manuals\/Decathlon/i);
  assert.doesNotMatch(decathlon.pdf, /\.d64|\.t64|\.tap|\.adf|\.zip/i);
  assert.match(bcQuest.pdf, /drive\.google\.com\/file\/d\/1n4JisEpwTy/);
  assert.match(bcTwo.pdf, /Commodore64Manuals\/BC%20II%20-%20Grog/);

  for (const game of games) {
    const manual = String(game.pdf || "");
    assert.doesNotMatch(manual, /gamesnostalgia\.com\/download|\.d64|\.t64|\.tap|\.adf|\.zip/i);
  }
});
