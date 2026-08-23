import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameRoot=path.resolve(here,"..");
const repoRoot=path.resolve(here,"../../../..");
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
assert.equal(manifest.build,"2026.08.23.8","current published build must be explicit in the regression check");
assert.equal(manifest.cacheToken,"20260823r8","current release cache token must be explicit in the live manifest");

for(const asset of [
  "css/game.css","css/v10-6-gameplay.css","js/version-check.js","js/weekly-challenge.js","js/asset-overrides.js",
  "js/avatar-data.js","js/config.js","js/progression.js","js/audio-assets.js","js/audio.js","js/world.js","js/network.js",
  "js/ai.js","js/systems.js","js/game-core.js","js/game-network.js","js/game-play.js","js/game-render.js","js/game-main.js"
]){
  const escaped=asset.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  assert.match(index,new RegExp(`${escaped}\\?v=${manifest.cacheToken}`),`release cache token missing from ${asset}`);
}
assert.match(index,/js\/v10-23-tutorial-guidance\.js\?v=20260823c/,"r8 must retain the simplified tutorial launcher revision");
assert.ok(index.indexOf("js/v10-23-tutorial-guidance.js?v=20260823c")<index.indexOf("js/asset-overrides.js?v=20260823r8"),"tutorial launch guidance must load before the enhancement queue");
assert.match(index,/id="hud-mana">0\/120</,"r8 static HUD must reflect the sword-first 120-round ammunition model");
assert.match(index,/id="hud-weapon">SWORD</,"r8 static HUD must show the starting melee weapon before runtime sync");
assert.match(index,/SPACE ATTACK/,"r8 keyboard help must describe the shared firearm/melee attack action");

assert.match(checker,/Check \/ Refresh Game/,"main menu must expose the update-check button");
assert.match(checker,/fetch\(`version\.json\?check=\$\{Date\.now\(\)\}`/,"version manifest request must use a unique no-cache URL");
assert.match(checker,/cache:"no-store"/,"version manifest fetch must explicitly bypass the browser cache");
assert.match(checker,/state\.latest!==current/,"version checker must compare the cached page build with the live build");
assert.match(checker,/older cached version of The Lost Sizzler/,"outdated players must be told that their browser has an older cached build");
assert.match(checker,/Refresh to Latest Version/,"outdated-build warning must provide a direct refresh action");
assert.match(checker,/url\.searchParams\.set\("ccg-build"/,"forced refresh must navigate to a build-specific page URL");
assert.match(checker,/url\.searchParams\.set\("ccg-refresh"/,"forced refresh must use a unique reload query to bypass stale HTML caching");
assert.match(checker,/document\.body\?\.dataset\?\.runActive!=="true"/,"automatic update modal must not interrupt an active dungeon run");

assert.match(homeScript,/home-hero__beta-cta/,"home-page enhancement must target the Lost Sizzler beta CTA");
assert.match(homeScript,/home-hero__sizzler-mark/,"home page must install a dedicated Lost Sizzler recognition mark");
assert.match(homeScript,/cheeky-commodore-quest\/assets\/lost-sizzler\.webp/,"home-page mark must reuse the real Lost Sizzler artwork");
assert.match(homeScript,/home-lost-sizzler-cta\.css\?v=20260823b/,"home-page logo styling must be cache-versioned after the scroll-safety change");
assert.match(homeScript,/document\.createElement\("span"\)/,"Lost Sizzler recognition mark must be decorative rather than a second interactive link");
assert.match(homeScript,/mark\.setAttribute\("aria-hidden", "true"\)/,"decorative Lost Sizzler mark must be removed from the interaction/accessibility path");
assert.match(homeScript,/image\.draggable = false/,"Lost Sizzler recognition image must not start browser drag gestures");
assert.doesNotMatch(homeScript,/addEventListener\(["']wheel["']/,"home recognition script must never intercept mouse-wheel scrolling");
assert.doesNotMatch(homeScript,/preventDefault\(\)/,"home recognition script must not cancel scrolling or pointer defaults");
assert.match(homeCtaCss,/\.home-hero__sizzler-mark/,"Lost Sizzler home logo must have isolated home-page styling");
assert.match(homeCtaCss,/touch-action:\s*pan-y/,"home hero actions must explicitly allow vertical touch scrolling");
assert.match(homeCtaCss,/\.home-hero__sizzler-mark[\s\S]*?pointer-events:\s*none/,"decorative Lost Sizzler mark must never capture pointer or wheel targeting");

console.log("Lost Sizzler r8 build, combat cache refresh, home recognition and scroll-safety regression checks passed.");
