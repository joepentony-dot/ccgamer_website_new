import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexSource=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const cacheGuardSource=readFileSync(new URL("../js/v10-41-cache-guard.js",import.meta.url),"utf8");
const unifiedUiSource=readFileSync(new URL("../js/v10-42-unified-ui.js",import.meta.url),"utf8");
const legacyBootstrapSource=readFileSync(new URL("../js/v10-36-bootstrap.js",import.meta.url),"utf8");
const developerLogSource=readFileSync(new URL("../js/v10-12-developer-changelog.js",import.meta.url),"utf8");

const buttonIds=[
  "solo-btn",
  "tutorial-zone-btn",
  "create-btn",
  "horde-mode-btn",
  "saboteurs-mode-btn",
  "continue-save-btn",
  "daily-btn",
  "split-btn",
];

test("the current Dungeon Carnage menu remains the public title owner",()=>{
  assert.match(indexSource,/<h1>C64 Dungeon Carnage<\/h1>/);
  assert.match(indexSource,/<h2><span>C64 DUNGEON<\/span><strong>CARNAGE<\/strong><\/h2>/);
  assert.match(indexSource,/id="menu" class="overlay"/);
  for(const id of buttonIds)assert.match(indexSource,new RegExp(`id="${id}"`),`${id} must remain wired`);
  assert.match(indexSource,/id="horde-mode-btn"[^>]+data-room-mode="horde-survivor"/);
});

test("the first static startup guard retires the legacy visual overlay before V10.36 loads",()=>{
  const cacheGuardIndex=indexSource.indexOf('src="js/v10-41-cache-guard.js');
  const versionCheckIndex=indexSource.indexOf('src="js/version-check.js');
  assert.ok(cacheGuardIndex>=0&&versionCheckIndex>cacheGuardIndex);
  assert.match(cacheGuardSource,/function startV142UnifiedUi\(\)/);
  assert.match(cacheGuardSource,/#ccg-release-loading\{display:none!important;visibility:hidden!important;pointer-events:none!important\}/);
  assert.match(cacheGuardSource,/v10-42-unified-ui\.js/);
  assert.match(cacheGuardSource,/startV142UnifiedUi\(\);/);
  assert.match(legacyBootstrapSource,/overlay\.id="ccg-release-loading"/);
  assert.match(legacyBootstrapSource,/CHEEKY COMMODORE QUEST/);
  assert.match(legacyBootstrapSource,/THE LOST SIZZLER/);
});

test("pre-run gameplay chrome is hidden while gameplay controls remain untouched",()=>{
  for(const selector of [
    ">.critical-strip",
    ">.mission",
    ">.fullscreen-hint",
    ">.tactical-zone",
    ">.player-hub",
    ".game-message-rail",
    ".canvas-wrap",
  ])assert.ok(unifiedUiSource.includes(selector),`${selector} should be retired before a run`);
  assert.match(unifiedUiSource,/data-run-active="false"/);
  assert.doesNotMatch(unifiedUiSource,/remove\(\).*solo-btn|remove\(\).*tutorial-zone-btn|remove\(\).*horde-mode-btn/s);
});

test("menu copy is deliberately reduced and long legacy guidance is moved out of presentation",()=>{
  assert.match(unifiedUiSource,/Five floors\. Fight, loot, level up and get out alive/);
  assert.match(unifiedUiSource,/const selectors=\["\.feature-strip","\.online-howto","#collection-summary","#menu-note","\.keys-help"\]/);
  assert.match(unifiedUiSource,/ccg-retired-menu-content/);
  assert.match(unifiedUiSource,/VIEW WEEKLY HIGH-SCORE VAULT LEADERBOARD/);
  assert.match(unifiedUiSource,/ccg-weekly-board-wrap/);
});

test("the Live Development Log contains no historical entries or monitoring backlog",()=>{
  assert.doesNotMatch(developerLogSource,/const days=/);
  assert.doesNotMatch(developerLogSource,/developer-log-day/);
  assert.doesNotMatch(developerLogSource,/KNOWN \/ MONITORING/);
  assert.doesNotMatch(developerLogSource,/25 AUGUST 2026/);
  assert.match(developerLogSource,/LOG CLEARED · 15 SEP 2026/);
  assert.match(developerLogSource,/No public development entries are currently listed/);
});

test("Horde remains playable but its public leaderboard is retired",()=>{
  assert.match(indexSource,/id="horde-mode-btn"/);
  assert.match(indexSource,/data-room-mode="horde-survivor"/);
  assert.match(cacheGuardSource,/window\.__CCG_LOST_SIZZLER_V141_HORDE_BOARD_POLISH__=true/);
  assert.match(unifiedUiSource,/const HORDE_BOARD_ID="horde-leaderboard"/);
  assert.match(unifiedUiSource,/function retireHordeLeaderboard\(\)/);
  assert.match(unifiedUiSource,/board\.remove\(\)/);
  assert.match(indexSource,/id="weekly-vault"/);
  assert.match(indexSource,/id="weekly-leaderboard"/);
});
