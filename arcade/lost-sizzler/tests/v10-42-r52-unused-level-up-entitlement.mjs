import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const core=read("js/game-core.js");
const main=read("js/game-main.js");
const progression=read("js/progression.js");
const html=read("index.html");
const css=read("css/game.css");
const version=JSON.parse(read("version.json"));

assert.equal(version.build,"V10.42 r52","unused level-up delivery must ship under the r52 build identity");
assert.equal(version.cacheToken,"20260923r52","unused level-up delivery must use a fresh release-wide cache token");

assert.match(progression,/player\.pendingLevels=\(player\.pendingLevels\|\|0\)\+1/,"every earned level must create one unused level-up entitlement");
assert.match(progression,/player\.pendingLevels=Math\.max\(0,\(player\.pendingLevels\|\|1\)-1\)/,"applying one skill must consume one entitlement");
assert.match(progression,/const unused=Math\.max\(0,Math\.floor\(Number\(player\.pendingLevels\)\|\|0\)\);if\(unused>0\)\{player\.pendingLevels=unused-1;lostSkill=\{name:"Unused level-up"\}\}else lostSkill=removeLastSkill\(player\)/,"a death level-loss must consume an unused entitlement before removing an already chosen skill");
assert.match(progression,/player:checkpointClone\(player\)/,"checkpoint cloning must continue to persist the player's pendingLevels field");

assert.match(core,/pendingLevels:0/,"new players must initialise the entitlement counter");
assert.match(core,/\["maxHealth"[\s\S]*?"pendingLevels"/,"floor transitions must preserve pendingLevels");
assert.match(core,/function pendingLevelCount\(p\)/,"core runtime must expose one canonical pending-level count");
assert.match(core,/function rememberPendingLevelChoice\(p\)/,"pending entitlements must be reconstructable into the UI queue");
assert.match(core,/levelQueue\.length=0;for\(const p of localPlayers\(\)\)rememberPendingLevelChoice\(p\)/,"world restore/transition must rebuild the queue from player state rather than stale object references");
assert.match(core,/LEVEL-UP SAVED[\s\S]*unused upgrade[\s\S]*XP panel/,"deferring a choice must tell the player where to recover it");
assert.match(core,/function reopenPendingLevelChoice\(p=p1\)/,"the HUD reminder must reopen the stored entitlement");
assert.match(core,/pendingLevelCount\(p\)<=0\)\{const index=levelQueue\.indexOf\(p\)/,"a queued player must only be removed after their final entitlement is spent");
assert.match(core,/pendingUpgrades===1\?"LEVEL-UP AVAILABLE":\`\$\{pendingUpgrades\} LEVEL-UPS AVAILABLE\`/,"the HUD must show one or multiple unused levels explicitly");

assert.match(html,/id="level-up-later"[^>]*>Choose Later<\/button>/,"the level-up panel must offer an explicit defer action");
assert.match(html,/id="quick-level-up"[^>]*>LEVEL-UP AVAILABLE<\/button>/,"the XP panel must contain a persistent reopen control");
assert.match(html,/Unused level-ups stay available for this run/,"the level-up panel must explain deferred entitlement behaviour");
assert.match(css,/V10\.42 r52 — deferred level-up entitlement/,"the r52 HUD reminder must have bounded styling");

assert.match(main,/getElementById|\$\("level-up-later"\)\?\.addEventListener\("click",deferLevelChoice\)/,"Choose Later must use the canonical defer owner");
assert.match(main,/\$\("quick-level-up"\)\?\.addEventListener\("click",\(\)=>reopenPendingLevelChoice\(p1\)\)/,"the HUD reminder must reopen P1's stored choice");
assert.match(main,/if\(event\.target===UI\.levelUp\)deferLevelChoice\(\)/,"clicking the level-up backdrop must defer rather than discard");
assert.match(main,/if\(mode==="levelup"\)\{deferLevelChoice\(\);return\}/,"Escape must defer a level-up without entering pause or losing it");

console.log("PASS V10.42 R52 unused level-up entitlement contract");
