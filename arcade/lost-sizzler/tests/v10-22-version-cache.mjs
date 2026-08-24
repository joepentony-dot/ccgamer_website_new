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

const metaBuild=index.match(/<meta name="ccg-lost-sizzler-build" content="([^"]+)">/)?.[1];
assert.ok(metaBuild,"game HTML must publish its loaded Lost Sizzler build number");
assert.equal(metaBuild,manifest.build,"HTML build number and live version manifest must match");
assert.equal(manifest.releaseVersion,"V10.41","current semantic release must remain V10.41");
assert.equal(manifest.build,"2026.08.24.14","current published build must be explicit in the regression check");
assert.equal(manifest.cacheToken,"20260824r14","current release cache token must be explicit in the live manifest");

for(const asset of [
  "css/game.css","css/v10-6-gameplay.css","js/version-check.js","js/weekly-challenge.js","js/asset-overrides.js",
  "js/avatar-data.js","js/config.js","js/progression.js","js/audio-assets.js","js/audio.js","js/world.js","js/network.js",
  "js/ai.js","js/systems.js","js/game-core.js","js/game-network.js","js/game-play.js","js/game-render.js","js/game-main.js","js/split-player-hud.js"
]){
  const escaped=asset.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  assert.match(index,new RegExp(`${escaped}\\?v=${manifest.cacheToken}`),`release cache token missing from ${asset}`);
}
assert.match(index,/js\/v10-23-tutorial-guidance\.js\?v=20260824e/,"r14 must preserve the current tutorial launcher revision");
assert.ok(index.indexOf("js/v10-23-tutorial-guidance.js?v=20260824e")<index.indexOf("js/asset-overrides.js?v=20260824r14"),"tutorial launch guidance must load before the enhancement queue");
assert.match(index,/js\/v10-41-lake-item-safety\.js\?v=20260824a/,"r14 must directly load the independent sanctuary lake/item safety guard");
assert.match(index,/js\/v10-41-gambler-devroom\.js\?v=20260824a/,"r14 must directly load the Gambler and owner Developer Vault layer");
assert.match(index,/js\/v10-41-developer-vault-hardening\.js\?v=20260824a/,"r14 must load Developer Vault disposal and authorization hardening");
assert.match(index,/js\/v10-41-developer-asset-catalog\.js\?v=20260824a/,"r14 must load the expanded special-asset catalogue");
assert.ok(index.indexOf("js/game-main.js?v=20260824r14")<index.indexOf("js/v10-41-gambler-devroom.js?v=20260824a"),"Gambler/Developer Vault layer must load after the core game globals exist");
assert.ok(index.indexOf("js/v10-41-gambler-devroom.js?v=20260824a")<index.indexOf("js/v10-41-developer-vault-hardening.js?v=20260824a"),"Developer Vault hardening must load after it captures the private Gambler/Developer closure");
assert.ok(index.indexOf("js/v10-41-developer-vault-hardening.js?v=20260824a")<index.indexOf("js/v10-41-developer-asset-catalog.js?v=20260824a"),"expanded asset catalogue must load after Developer Vault hardening");
assert.match(index,/THE LOST SIZZLER — V10\.41/,"static title bar must identify V10.41 before runtime label correction");
assert.match(index,/BUILD V10\.41/,"static build badge must identify V10.41 before runtime label correction");
assert.match(index,/id="hud-mana">0\/120</,"static HUD must reflect the sword-first 120-round ammunition model");
assert.match(index,/id="hud-weapon">SWORD</,"static HUD must show the starting melee weapon before runtime sync");
assert.match(index,/SPACE ATTACK/,"keyboard help must describe the shared firearm/melee attack action");
assert.match(index,/M MAP/,"keyboard help must reserve M for the Solo full dungeon map");
assert.doesNotMatch(index,/M SOUND/,"keyboard help must not advertise the retired M sound shortcut");
assert.match(index,/essential keys or an Exit Sigil are returned safely to the floor and marked on the maps/,"published death rules must explain progression-item protection");
assert.match(index,/THE GAMBLER/,"published rulebook must document the rare Gambler encounter");
assert.match(index,/press G to stake 1,000 score/i,"published rulebook must explain how the Gambler is used");

assert.match(checker,/Check \/ Refresh Game/,"main menu must expose the update-check button");
assert.match(checker,/fetch\(`version\.json\?check=\$\{Date\.now\(\)\}`/,"version manifest request must use a unique no-cache URL");
assert.match(checker,/cache:"no-store"/,"version manifest fetch must explicitly bypass the browser cache");
assert.match(checker,/state\.latest!==current/,"version checker must compare the cached page build with the live build");
assert.match(checker,/older cached version of The Lost Sizzler/,"outdated players must be told that their browser has an older cached build");
assert.match(checker,/Refresh to Latest Version/,"outdated-build warning must provide a direct refresh action");
assert.match(checker,/url\.searchParams\.set\("ccg-build"/,"forced refresh must navigate to a build-specific page URL");
assert.match(checker,/url\.searchParams\.set\("ccg-refresh"/,"forced refresh must use a unique reload query to bypass stale HTML caching");
assert.match(checker,/document\.body\?\.dataset\?\.runActive!=="true"/,"automatic update modal must not interrupt an active dungeon run");
assert.match(checker,/v10-41-xp-permadeath-hardening\.js/,"V10.41 loader must include zero-XP permadeath hardening");
assert.match(checker,/v10-41-solo-full-map\.js/,"V10.41 loader must include the Solo full-map control layer");
assert.match(checker,/v10-41-horde-combat-polish\.js/,"V10.41 loader must include Horde combat balancing");
assert.match(checker,/v10-41-horde-completion\.js/,"V10.41 loader must include Solo Horde and persistent rankings");
assert.match(checker,/v10-41-sanctuary-azalea\.js/,"V10.41 loader must include sanctuary scenery and AZALEA");
assert.match(checker,/v10-41-progression-recovery\.js/,"V10.41 loader must include cache-independent progression recovery hardening");

assert.match(homeScript,/home-hero__beta-cta/,"home-page enhancement must target the Lost Sizzler beta CTA");
assert.match(homeScript,/home-hero__sizzler-mark/,"home page must install a dedicated Lost Sizzler recognition mark");
assert.match(homeScript,/arcade\/lost-sizzler\/assets\/lost-sizzler\.webp/,"home-page mark must reuse the canonical Lost Sizzler artwork");
assert.match(homeScript,/home-lost-sizzler-cta\.css\?v=20260823b/,"home-page logo styling must be cache-versioned after the scroll-safety change");
assert.match(homeScript,/document\.createElement\("span"\)/,"Lost Sizzler recognition mark must be decorative rather than a second interactive link");
assert.match(homeScript,/mark\.setAttribute\("aria-hidden", "true"\)/,"decorative Lost Sizzler mark must be removed from the interaction/accessibility path");
assert.match(homeScript,/image\.draggable = false/,"Lost Sizzler recognition image must not start browser drag gestures");
assert.doesNotMatch(homeScript,/addEventListener\(["']wheel["']/,"home recognition script must never intercept mouse-wheel scrolling");
assert.doesNotMatch(homeScript,/preventDefault\(\)/,"home recognition script must not cancel scrolling or pointer defaults");
assert.match(homeCtaCss,/\.home-hero__sizzler-mark/,"Lost Sizzler home logo must have isolated home-page styling");
assert.match(homeCtaCss,/touch-action:\s*pan-y/,"home hero actions must explicitly allow vertical touch scrolling");
assert.match(homeCtaCss,/\.home-hero__sizzler-mark[\s\S]*?pointer-events:\s*none/,"decorative Lost Sizzler mark must never capture pointer or wheel targeting");

console.log("Lost Sizzler r14 build, V10.41 cache refresh, Gambler and owner Developer Vault catalogue regression checks passed.");