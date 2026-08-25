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
const landingPolish=readGame("js/v10-41-landing-notification-polish.js");
const majorHardening=readGame("js/v10-41-major-notification-hardening.js");
const r25=readGame("js/v10-41-r25-spy-speed-bounty-hotfix.js");
const r26=readGame("js/v10-41-r26-spy-enemy-stability.js");
const legacyPolish=readGame("js/v10-30-polish.js");
const assetOverrides=readGame("js/asset-overrides.js");
const cacheGuard=readGame("js/v10-41-cache-guard.js");
const loadWatchdog=readGame("js/v10-41-load-watchdog.js");
const startupFreezeGuard=readGame("js/v10-41-startup-freeze-guard.js");
const network=readGame("js/network.js");

const metaBuild=index.match(/<meta name="ccg-lost-sizzler-build" content="([^"]+)">/)?.[1];
const metaCache=index.match(/<meta name="ccg-lost-sizzler-cache" content="([^"]+)">/)?.[1];
assert.ok(metaBuild,"game HTML must publish its loaded Lost Sizzler build number");
assert.equal(metaBuild,manifest.build,"HTML build number and live version manifest must match");
assert.equal(metaCache,manifest.cacheToken,"HTML cache token and live version manifest must match");
assert.equal(manifest.releaseVersion,"V10.41","current semantic release must remain V10.41");
assert.equal(manifest.build,"2026.08.25.26","current published build must be explicit in the regression check");
assert.equal(manifest.cacheToken,"20260825r26","current release cache token must be explicit in the live manifest");

for(const asset of [
  "css/game.css","css/v10-6-gameplay.css","js/v10-41-cache-guard.js","js/v10-41-load-watchdog.js",
  "js/version-check.js","js/weekly-challenge.js","js/v10-23-tutorial-guidance.js","js/asset-overrides.js",
  "js/avatar-data.js","js/config.js","js/progression.js","js/audio-assets.js","js/audio.js","js/world.js","js/network.js",
  "js/ai.js","js/systems.js","js/game-core.js","js/game-network.js","js/game-play.js","js/game-render.js","js/game-main.js","js/split-player-hud.js",
  "js/v10-41-lake-item-safety.js","js/v10-41-gambler-devroom.js","js/v10-41-developer-vault-hardening.js",
  "js/v10-41-developer-asset-catalog.js","js/v10-41-horde-leaderboard-polish.js","js/v10-41-split-friendly-fire.js",
  "js/v10-41-landing-notification-polish.js","js/v10-41-major-notification-hardening.js","js/v10-41-r25-spy-speed-bounty-hotfix.js",
  "js/v10-41-r26-spy-enemy-stability.js"
]){
  const escaped=asset.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  assert.match(index,new RegExp(`${escaped}\\?v=${manifest.cacheToken}`),`release cache token missing from ${asset}`);
}
assert.doesNotMatch(index,/v10-41-live-join-presence\.js/,"live-presence must not be requested twice from the canonical HTML");
assert.match(network,/v10-41-live-join-presence\.js\?v=\$\{encodeURIComponent\(releaseRev\)\}/,"network-owned live-presence must inherit the page release token");
const token=manifest.cacheToken;
assert.ok(index.indexOf(`js/v10-41-cache-guard.js?v=${token}`)<index.indexOf(`js/asset-overrides.js?v=${token}`),"cache guard must begin before the enhancement queue owner loads");
assert.ok(index.indexOf(`js/v10-41-load-watchdog.js?v=${token}`)<index.indexOf(`js/asset-overrides.js?v=${token}`),"load watchdog must start before the enhancement queue");
assert.ok(index.indexOf(`js/game-main.js?v=${token}`)<index.indexOf(`js/v10-41-gambler-devroom.js?v=${token}`),"Gambler/Developer Vault layer must load after the core game globals exist");
assert.ok(index.indexOf(`js/v10-41-gambler-devroom.js?v=${token}`)<index.indexOf(`js/v10-41-developer-vault-hardening.js?v=${token}`),"Developer Vault hardening must load after it captures the private Gambler/Developer closure");
assert.ok(index.indexOf(`js/v10-41-developer-vault-hardening.js?v=${token}`)<index.indexOf(`js/v10-41-developer-asset-catalog.js?v=${token}`),"expanded asset catalogue must load after Developer Vault hardening");
assert.ok(index.indexOf(`js/v10-41-landing-notification-polish.js?v=${token}`)<index.indexOf(`js/v10-41-major-notification-hardening.js?v=${token}`),"major-alert hardening must load after the visual notification layer it protects");
assert.ok(index.indexOf(`js/v10-41-major-notification-hardening.js?v=${token}`)<index.indexOf(`js/v10-41-r25-spy-speed-bounty-hotfix.js?v=${token}`),"r25 Spy speed/bounty hotfix must load after the existing notification/runtime wrappers");
assert.ok(index.indexOf(`js/v10-41-r25-spy-speed-bounty-hotfix.js?v=${token}`)<index.indexOf(`js/v10-41-r26-spy-enemy-stability.js?v=${token}`),"r26 Spy/enemy stability must load after r25 as the final gameplay hotfix");
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

/* Browser-crash regression: V10.30 and V10.41 once used opposing MutationObservers
 * to force different version labels, producing an endless mutation loop. */
assert.match(legacyPolish,/RELEASE_VERSION="V10\.41"/,"legacy polish must write the current V10.41 branding rather than V10.35");
assert.doesNotMatch(legacyPolish,/keepSubtitleCurrent/,"legacy polish must not reinstall a persistent subtitle observer");
assert.doesNotMatch(legacyPolish,/new MutationObserver/,"legacy V10.30 polish must never observe/rewrite release branding again");
assert.doesNotMatch(legacyPolish,/THE LOST SIZZLER — V10\.35|BUILD V10\.35/,"legacy polish must contain no stale V10.35 runtime label writer");
assert.match(assetOverrides,/const CCG_RELEASE_REV=/,"enhancement queue must derive one release-wide cache revision");
assert.match(assetOverrides,/CCG_POLISH_REV=CCG_RELEASE_REV/,"crash-fixed legacy polish must inherit the current release cache token");
assert.match(assetOverrides,/v10-4-death-cache\.js\?v=\$\{CCG_RELEASE_REV\}/,"formerly unversioned death-cache code must now be release-tokened");
assert.match(assetOverrides,/v10-6-runtime\.js\?v=\$\{CCG_RELEASE_REV\}/,"formerly unversioned multiplayer runtime must now be release-tokened");
assert.match(assetOverrides,/if\(guard\?\.ready\)await Promise\.race/,"enhancement queue must wait for bounded cache sanitation");
assert.match(assetOverrides,/CCGLostSizzlerCacheGuard\?\.runtimeErrors/,"uncaught startup module errors must fail the release gate instead of being silently treated as loaded");

assert.match(cacheGuard,/ccg-lost-sizzler:last-sanitised-cache/,"cache sanitation must run once per published game cache token");
assert.match(cacheGuard,/\/arcade\/lost-sizzler\//,"cache sanitation must target canonical Lost Sizzler cache entries");
assert.match(cacheGuard,/\/games\/ccg-games\/cheeky-commodore-quest\//,"cache sanitation must also target the legacy game alias cache entries");
assert.match(cacheGuard,/navigator\.serviceWorker\.getRegistrations/,"startup sanitation must ask existing service workers to update");
assert.match(cacheGuard,/cache\.delete\(request\)/,"startup sanitation must remove matching cached game requests");
assert.doesNotMatch(cacheGuard,/localStorage\.clear\(|sessionStorage\.clear\(/,"cache sanitation must never wipe saves/settings by clearing browser storage");
assert.doesNotMatch(cacheGuard,/caches\.delete\(name\)|caches\.delete\(key\)/,"page-level sanitation must not blindly delete entire site caches");
assert.match(cacheGuard,/setTimeout\(\(\)=>\{[\s\S]*3500\)/,"cache sanitation must be bounded so it cannot hold the loading screen forever");
assert.match(cacheGuard,/v10-41-startup-freeze-guard\.js\?v=\$\{CACHE_TOKEN\}/,"startup freeze guard must begin before V10.36 can enter its release-finish critical path");
assert.match(loadWatchdog,/observer\?\.disconnect/,"loading watchdog must disconnect the loader MutationObserver after startup");
assert.match(loadWatchdog,/clearInterval\(v136\.loadingTimer\)/,"loading watchdog must stop the loading poll after startup");
assert.match(loadWatchdog,/delay>1800/,"loading watchdog must record severe main-thread stalls during preparation");
assert.match(startupFreezeGuard,/source\.__ccgV136Guttered=true/,"the current release must retain the V10.36 synchronous chest-atlas startup bypass");
assert.doesNotMatch(startupFreezeGuard,/\.toDataURL\s*\(/,"startup guard must never synchronously convert an atlas to a data URL");
assert.match(startupFreezeGuard,/assets\.chests=canvas/,"deferred atlas preparation must keep a direct canvas source");

assert.match(landingPolish,/MAIN ADVENTURES/,"landing page must group the primary game choices");
assert.match(landingPolish,/SPECIAL MODES/,"landing page must visually separate special modes");
assert.match(landingPolish,/TRAINING & WEEKLY CHALLENGE/,"landing page must quieten tutorial/weekly choices into a tertiary group");
assert.match(landingPolish,/feature-strip>span:nth-child\(1\):before/,"feature cards must gain compact visual icon treatment");
assert.match(landingPolish,/horde-leaderboard\.is-empty \.horde-empty\{min-height:58px/,"empty Horde leaderboard must be compressed");
assert.match(landingPolish,/secondary-menu button/,"utility buttons must have a quieter presentation tier");
assert.match(landingPolish,/THE LOST SIZZLER — \$\{RELEASE\}/,"runtime branding must correct stale labels to V10.41");
assert.match(landingPolish,/NEW DUNGEON BOUNTY\|DUNGEON BOUNTY\|BOUNTY START/,"Dungeon Bounty must be classified as the highest visual priority outside Horde");
assert.match(landingPolish,/data-ccg-major-notification/,"major alerts must suppress the ordinary pickup notification layer while active");
assert.match(landingPolish,/if\(priority>=100\)/,"major events must bypass the routine toast queue immediately");
assert.match(landingPolish,/if\(state\.majorUntil>now\)/,"routine messages must not overwrite an active major alert");
assert.match(majorHardening,/eventKey==="bountyStart"/,"the bounty-start voice event itself must force a visual major alert in ordinary dungeon mode");
assert.match(majorHardening,/NEW DUNGEON BOUNTY/,"ordinary dungeon voice-only bounty starts must retain the requested top-screen title");
assert.match(majorHardening,/setInterval\(ensure,300\)/,"major notification wrappers must be re-asserted after late dynamic enhancement loads");
assert.match(majorHardening,/BOUNTY COMPLETE/,"bounty completion must also be treated as a major visual event outside Horde");
assert.match(majorHardening,/if\(isHorde\(\)\)\{hideExistingDungeonAlert\(\);return false\}/,"Horde must reject Dungeon Bounty major alerts completely");
assert.match(majorHardening,/DUNGEON BONUS/,"Horde must also reject legacy Dungeon Bonus wording");
assert.match(r25,/Object\.assign\(wrapped,current\)/,"r25 final wrappers must preserve ownership markers and avoid reassertion loops");
assert.match(r25,/specialActive\(\)&&dungeonOnlyText\(title\)/,"r25 must reject stale dungeon-only notifications in special modes");
assert.match(r26,/SPY_MOVE_CADENCE_MS=220/,"r26 must publish the slower Spy movement governor");
assert.match(r26,/_ccgHomeRoomId/,"r26 must reconcile Solo enemy home-room ownership after population rehomes");

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
assert.match(homeScript,/home-lost-sizzler-cta\.css\?v=20260823b/,"home-page logo styling must remain versioned");
assert.match(homeScript,/document\.createElement\("span"\)/,"Lost Sizzler recognition mark must be decorative rather than a second interactive link");
assert.match(homeScript,/mark\.setAttribute\("aria-hidden", "true"\)/,"decorative Lost Sizzler mark must be removed from the interaction/accessibility path");
assert.match(homeScript,/image\.draggable = false/,"Lost Sizzler recognition image must not start browser drag gestures");
assert.doesNotMatch(homeScript,/addEventListener\(["']wheel["']/,"home recognition script must never intercept mouse-wheel scrolling");
assert.doesNotMatch(homeScript,/preventDefault\(\)/,"home recognition script must not cancel scrolling or pointer defaults");
assert.match(homeCtaCss,/\.home-hero__sizzler-mark/,"Lost Sizzler home logo must have isolated home-page styling");
assert.match(homeCtaCss,/touch-action:\s*pan-y/,"home hero actions must explicitly allow vertical touch scrolling");
assert.match(homeCtaCss,/\.home-hero__sizzler-mark[\s\S]*?pointer-events:\s*none/,"decorative Lost Sizzler mark must never capture pointer or wheel targeting");

console.log("Lost Sizzler r26 build, cache sanitation, Horde isolation, startup-freeze and Spy/enemy stability regression checks passed.");
