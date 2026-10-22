import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildGamesSearchData } = require("../scripts/build-games.js");

const masterText = fs.readFileSync("games/games.json", "utf8");
const compactText = fs.readFileSync("games/games-search.json", "utf8");
const master = JSON.parse(masterText);
const compact = JSON.parse(compactText);
const librarySource = fs.readFileSync("js/games-library.js", "utf8");

test("generated compact browse data stays complete and reproducible", () => {
  const rebuilt = buildGamesSearchData(master);
  assert.deepEqual(compact, rebuilt, "games-search.json must match the authoritative generator output");
  assert.equal(compact.length, master.length, "compact browse data must cover every catalogue game");

  compact.forEach((game) => {
    assert.ok(String(game.slug || "").trim(), "every compact entry needs a slug");
    assert.ok(String(game.title || "").trim(), `${game.slug}: compact title missing`);
    assert.match(String(game.system || ""), /^(C64|AMIGA)$/, `${game.slug}: compact platform missing`);
    assert.ok(String(game.thumbnail || "").trim(), `${game.slug}: compact thumbnail missing`);
  });

  assert.ok(
    compactText.length < masterText.length * 0.5,
    `compact browse payload must remain below half of games.json (${compactText.length} vs ${masterText.length})`
  );
});

test("Browse Games keeps first-scroll startup progressive", () => {
  assert.match(librarySource, /document\.addEventListener\("DOMContentLoaded", scheduleGamesLibraryInit\)/);
  assert.doesNotMatch(librarySource, /document\.addEventListener\("DOMContentLoaded",\s*\(\) => \{\s*initGamesLibrary\(\);/);
  assert.match(librarySource, /const MIN_START_DELAY_MS = 1800/);
  assert.match(librarySource, /const QUIET_WINDOW_MS = 1400/);
  assert.match(librarySource, /window\.addEventListener\("scroll", handleActivity, \{ passive: true \}\)/);
  assert.match(librarySource, /window\.addEventListener\("wheel", handleActivity, \{ passive: true \}\)/);
  assert.match(librarySource, /window\.addEventListener\("touchmove", handleActivity, \{ passive: true \}\)/);
  assert.match(librarySource, /requestIdleCallback\(\(\) => \{[\s\S]*stillQuietFor < QUIET_WINDOW_MS/);
  assert.match(librarySource, /#gamesSearchInput[\s\S]*\[data-system-filter\][\s\S]*#gamesYearSelect/);
  assert.match(librarySource, /handleIntent[\s\S]*start\(\)/);
  assert.match(librarySource, /window\.CCG_GAMES_LIBRARY_READY = true/);
});

test("Browse Games prefers compact data and fails safely to games.json", () => {
  const compactIndex = librarySource.indexOf('label: "games-search.json"');
  const masterIndex = librarySource.indexOf('label: "games.json"');
  assert.ok(compactIndex >= 0 && masterIndex > compactIndex, "games-search.json must be attempted before games.json");
  assert.match(librarySource, /String\(game\?\.system \|\| ""\)\.trim\(\)/);
  assert.match(librarySource, /String\(game\?\.thumbnail \|\| ""\)\.trim\(\)/);
  assert.match(librarySource, /failures\.push\(\`\$\{candidate\.label\} was incomplete or returned 0 entries\`\)/);
});
