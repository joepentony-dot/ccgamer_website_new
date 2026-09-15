import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameRoot=path.resolve(here,"..");
const repoRoot=path.resolve(here,"../../..");
const readGame=relative=>fs.readFileSync(path.join(gameRoot,relative),"utf8");
const readRepo=relative=>fs.readFileSync(path.join(repoRoot,relative),"utf8");

const index=readGame("index.html");
const checker=readGame("js/version-check.js");
const manifest=JSON.parse(readGame("version.json"));
const homeScript=readRepo("js/ccg-home-community.js");
const homeCtaCss=readRepo("resources/css/home-lost-sizzler-cta.css");
const legacyPolish=readGame("js/v10-30-polish.js");
const assetOverrides=readGame("js/asset-overrides.js");
const cacheGuard=readGame("js/v10-41-cache-guard.js");
const loadWatchdog=readGame("js/v10-41-load-watchdog.js");
const startupFreezeGuard=readGame("js/v10-41-startup-freeze-guard.js");
const network=readGame("js/network.js");
const r28=readGame("js/v10-41-r28-special-mode-repair.js");
const r29=readGame("js/v10-41-r29-runtime-repair.js");

const metaBuild=index.match(/<meta name="ccg-lost-sizzler-build" content="([^"]+)">/)?.[1];
const metaCache=index.match(/<meta name="ccg-lost-sizzler-cache" content="([^"]+)">/)?.[1];
assert.ok(metaBuild,"game HTML must publish its loaded Dungeon Carnage build number");
assert.equal(metaBuild,manifest.build,"HTML build number and live version manifest must match");
assert.equal(metaCache,manifest.cacheToken,"HTML cache token and live version manifest must match");
assert.equal(manifest.releaseVersion,"V10.42","current semantic release must be V10.42");
assert.equal(manifest.build,"2026.09.10.1","current published build must remain explicit in the regression check");
assert.equal(manifest.cacheToken,"20260910r1","current release cache token must remain explicit in the live manifest");

const activeAssets=[
  "css/game.css","css/v10-6-gameplay.css","css/v10-41-r28.css","css/v10-41-r29.css",
  "js/v10-41-cache-guard.js","js/v10-41-load-watchdog.js","js/version-check.js","js/weekly-challenge.js",
  "js/v10-23-tutorial-guidance.js","js/asset-overrides.js","js/avatar-data.js","js/config.js","js/progression.js",
  "js/audio-assets.js","js/audio.js","js/world.js","js/network.js","js/ai.js","js/systems.js","js/game-core.js",
  "js/game-network.js","js/game-play.js","js/game-render.js","js/game-main.js","js/split-player-hud.js",
  "js/v10-41-lake-item-safety.js","js/v10-41-gambler-devroom.js","js/v10-41-developer-vault-hardening.js",
  "js/v10-41-developer-asset-catalog.js","js/v10-41-split-friendly-fire.js","js/v10-41-landing-notification-polish.js",
  "js/v10-41-major-notification-hardening.js","js/v10-41-r28-special-mode-repair.js","js/v10-41-r29-buglog.js",
  "js/v10-41-r29-runtime-repair.js","js/v10-41-r30-global-movement-guard.js","js/v10-41-r30-buglog.js"
];
for(const asset of activeAssets){
  const escaped=asset.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  assert.match(index,new RegExp(`${escaped}\\?v=${manifest.cacheToken}`),`release cache token missing from ${asset}`);
}

const retiredDirectAssets=[
  "js/v10-41-horde-leaderboard-polish.js",
  "js/v10-41-r25-spy-speed-bounty-hotfix.js",
  "js/v10-41-r26-spy-enemy-stability.js",
  "js/v10-41-r27-spy-isolation.js"
];
for(const asset of retiredDirectAssets){
  const escaped=asset.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  assert.doesNotMatch(index,new RegExp(escaped),`retired runtime asset must not be requested by canonical HTML: ${asset}`);
}
assert.doesNotMatch(index,/id="horde-mode-btn"/,"retired Horde mode must not be exposed in the live menu");
assert.doesNotMatch(index,/id="saboteurs-mode-btn"/,"retired Spy Vs Spy mode must not be exposed in the live menu");
assert.doesNotMatch(index,/Choose Dungeon or Horde|Spy Vs Spy for exactly two/i,"online help must describe Dungeon Multiplayer only");
assert.match(index,/Choose Dungeon Multiplayer for up to four players/,"online help must retain supported Dungeon Multiplayer guidance");

assert.doesNotMatch(checker,/v10-37-horde-focus\.js|v10-38-horde-live\.js|v10-39-horde-live-loadout\.js|v10-40-horde-final\.js|v10-41-horde-combat-polish\.js|v10-41-horde-completion\.js/,"version loader must not inject retired Horde runtime modules");
assert.match(checker,/v10-36-bootstrap\.js/,"version loader must retain the active V10.36 bootstrap");
assert.match(checker,/v10-41-multiplayer-presence\.js/,"version loader must retain Dungeon multiplayer presence");
assert.match(checker,/v10-41-world-safety\.js/,"version loader must retain shared world safety");
assert.match(checker,/v10-41-sanctuary-hardening\.js/,"version loader must retain sanctuary hardening");
assert.match(checker,/v10-41-sanctuary-azalea\.js/,"version loader must retain sanctuary scenery and AZALEA");
assert.match(checker,/v10-41-progression-recovery\.js/,"version loader must retain progression recovery");
assert.match(checker,/v10-41-xp-permadeath-hardening\.js/,"version loader must retain zero-XP permadeath hardening");
assert.match(checker,/v10-41-solo-full-map\.js/,"version loader must retain the Solo full-map layer");

assert.doesNotMatch(index,/v10-41-live-join-presence\.js/,"live-presence must not be requested twice from canonical HTML");
assert.match(network,/v10-41-live-join-presence\.js\?v=\$\{encodeURIComponent\(releaseRev\)\}/,"network-owned live-presence must inherit the page release token");
const token=manifest.cacheToken;
assert.ok(index.indexOf(`js/v10-41-cache-guard.js?v=${token}`)<index.indexOf(`js/asset-overrides.js?v=${token}`),"cache guard must begin before the enhancement queue owner loads");
assert.ok(index.indexOf(`js/v10-41-load-watchdog.js?v=${token}`)<index.indexOf(`js/asset-overrides.js?v=${token}`),"load watchdog must start before the enhancement queue");
assert.ok(index.indexOf(`js/game-main.js?v=${token}`)<index.indexOf(`js/v10-41-gambler-devroom.js?v=${token}`),"Gambler/Developer Vault layer must load after core game globals exist");
assert.ok(index.indexOf(`js/v10-41-r28-special-mode-repair.js?v=${token}`)<index.indexOf(`js/v10-41-r29-runtime-repair.js?v=${token}`),"retained r29 runtime repair must remain after the mixed r28 compatibility layer");
assert.ok(index.indexOf(`js/v10-41-r29-runtime-repair.js?v=${token}`)<index.indexOf(`js/v10-41-r30-global-movement-guard.js?v=${token}`),"r30 movement ownership must load after r29 runtime repair");

assert.ok(index.includes('<h1>C64 Dungeon Carnage</h1>'),"static title bar must identify C64 Dungeon Carnage");
assert.match(index,/BUILD V10\.42/,"static build badge must identify V10.42");
assert.match(index,/id="hud-mana">0\/120</,"static HUD must reflect the sword-first ammunition model");
assert.match(index,/id="hud-weapon">SWORD</,"static HUD must show the starting melee weapon");
assert.match(index,/SPACE ATTACK/,"keyboard help must describe the shared firearm/melee attack action");
assert.match(index,/M MAP/,"keyboard help must reserve M for the Solo full dungeon map");
assert.doesNotMatch(index,/M SOUND/,"keyboard help must not advertise the retired M sound shortcut");
assert.match(index,/essential keys or an Exit Sigil are returned safely to the floor and marked on the maps/,"published death rules must explain progression-item protection");
assert.match(index,/THE GAMBLER/,"published rulebook must document the rare Gambler encounter");

assert.match(legacyPolish,/RELEASE_VERSION="V10\.41"/,"legacy polish must retain current compatibility branding");
assert.doesNotMatch(legacyPolish,/keepSubtitleCurrent/,"legacy polish must not reinstall a persistent subtitle observer");
assert.doesNotMatch(legacyPolish,/new MutationObserver/,"legacy V10.30 polish must never observe/rewrite release branding again");
assert.match(assetOverrides,/const CCG_RELEASE_REV=/,"enhancement queue must derive one release-wide cache revision");
assert.match(assetOverrides,/v10-4-death-cache\.js\?v=\$\{CCG_RELEASE_REV\}/,"death-cache code must remain release-tokened");
assert.match(assetOverrides,/v10-6-runtime\.js\?v=\$\{CCG_RELEASE_REV\}/,"multiplayer runtime must remain release-tokened");
assert.match(assetOverrides,/CCGLostSizzlerCacheGuard\?\.runtimeErrors/,"uncaught startup module errors must fail the release gate");

assert.match(cacheGuard,/ccg-lost-sizzler:last-sanitised-cache/,"cache sanitation must run once per published cache token");
assert.match(cacheGuard,/\/arcade\/lost-sizzler\//,"cache sanitation must target canonical game cache entries");
assert.doesNotMatch(cacheGuard,/localStorage\.clear\(|sessionStorage\.clear\(/,"cache sanitation must never wipe saves/settings");
assert.doesNotMatch(cacheGuard,/caches\.delete\(name\)|caches\.delete\(key\)/,"page sanitation must not blindly delete entire site caches");
assert.match(cacheGuard,/v10-41-startup-freeze-guard\.js\?v=\$\{CACHE_TOKEN\}/,"startup freeze guard must begin before V10.36 release finish");
assert.match(loadWatchdog,/observer\?\.disconnect/,"loading watchdog must disconnect its MutationObserver after startup");
assert.match(loadWatchdog,/clearInterval\(v136\.loadingTimer\)/,"loading watchdog must stop the loading poll after startup");
assert.match(startupFreezeGuard,/source\.__ccgV136Guttered=true/,"startup must retain the synchronous chest-atlas bypass");
assert.doesNotMatch(startupFreezeGuard,/\.toDataURL\s*\(/,"startup guard must never synchronously convert an atlas to a data URL");
assert.match(startupFreezeGuard,/assets\.chests=canvas/,"deferred atlas preparation must keep a direct canvas source");

assert.match(r28,/function installEnemyCardinalFire\(/,"mixed r28 layer must retain shared cardinal enemy-fire compatibility until extraction");
assert.match(r29,/stableLoop\.__ccgV141R29Stable=true/,"r29 must retain the final non-destructive frame loop");

assert.match(checker,/Check \/ Refresh Game/,"main menu must expose the update-check button");
assert.match(checker,/fetch\(`version\.json\?check=\$\{Date\.now\(\)\}`/,"version manifest request must use a unique no-cache URL");
assert.match(checker,/cache:"no-store"/,"version manifest fetch must bypass browser cache");
assert.match(checker,/state\.latest!==current/,"version checker must compare the cached page build with the live build");
assert.match(checker,/Refresh to Latest Version/,"outdated-build warning must provide a refresh action");
assert.match(checker,/document\.body\?\.dataset\?\.runActive!=="true"/,"automatic update modal must not interrupt an active dungeon run");

assert.match(homeScript,/home-hero__beta-cta/,"home-page enhancement must target the Dungeon Carnage beta CTA");
assert.match(homeScript,/home-hero__sizzler-mark/,"home page must retain the game recognition mark");
assert.match(homeScript,/arcade\/lost-sizzler\/assets\/lost-sizzler\.webp/,"home-page mark must reuse canonical artwork");
assert.doesNotMatch(homeScript,/addEventListener\(["']wheel["']/,"home recognition script must never intercept mouse-wheel scrolling");
assert.match(homeCtaCss,/touch-action:\s*pan-y/,"home hero actions must explicitly allow vertical touch scrolling");
assert.match(homeCtaCss,/\.home-hero__sizzler-mark[\s\S]*?pointer-events:\s*none/,"decorative game mark must never capture pointer or wheel targeting");

console.log("Dungeon Carnage V10.42 build/cache/startup and retired-mode boundary contract passed.");