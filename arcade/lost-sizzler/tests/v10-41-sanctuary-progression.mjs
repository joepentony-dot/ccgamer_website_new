import fs from "node:fs";
import assert from "node:assert/strict";

const patch=fs.readFileSync(new URL("../js/v10-41-sanctuary-hardening.js",import.meta.url),"utf8");
const quality=fs.readFileSync(new URL("../js/v10-35-quality.js",import.meta.url),"utf8");

assert.match(patch,/\["arenas","timedRooms"\]/,"sanctuary hardening must remove arena and timed-room assignments");
assert.match(patch,/challenge=>!ids\.has\(Number\(challenge\?\.roomId\)\)/,"sanctuary challenge filtering must be keyed to sanctuary room ids");
assert.match(patch,/triggerArenaV141SanctuaryGuard/,"arena trigger must have a sanctuary guard");
assert.match(patch,/triggerTimedV141SanctuaryGuard/,"timed-room trigger must have a sanctuary guard");
assert.match(patch,/tryDoorV141SanctuaryFailSafe/,"ordinary sanctuary doors must have a runtime release fail-safe");
assert.match(patch,/leaf\.locked=false;\s*leaf\.open=true/,"a blocked sanctuary challenge door must be unlocked and opened");
assert.match(patch,/door\.type==="secret"\|\|door\.sigilGate\|\|door\.sigilAnnex/,"secret and Sigil gates must not be accidentally converted into sanctuary exits");
assert.match(quality,/if\(room\.sanctuary\)continue/,"sanctuary enemy expulsion must remain active");
assert.match(quality,/host\.sanctuaryRegeneration/,"sanctuary regeneration tiles must remain installed");

assert.match(patch,/ADVENTURER_SCORE_REWARD=1000/,"Lost Adventurer rescue must award 1,000 score");
assert.match(patch,/ADVENTURER_XP_REWARD=200/,"Lost Adventurer rescue must award 200 XP");
assert.match(patch,/Please get me out of here! I'll follow you\. Lead me to any SANCTUARY\. Reward: \+1,000 score and \+200 XP\./,"Lost Adventurer recruitment must explain the escort objective and rewards");
assert.match(patch,/adventurer\.following=true/,"Lost Adventurer must enter a following state when recruited");
assert.match(patch,/function nextEscortStep\(/,"Lost Adventurer following must use pathfinding rather than a single greedy step");
assert.match(patch,/index<3500/,"Lost Adventurer pathfinding must have a bounded search");
assert.match(patch,/ADVENTURER_CATCHUP_MS=1800/,"Lost Adventurer must have a catch-up fail-safe if blocked");
assert.match(patch,/safeEscortCatchupCell/,"Lost Adventurer must be able to recover from an unreachable or closed-off route");
assert.match(patch,/CCGProgression\?\.gainXP\?\.\(player,run,ADVENTURER_XP_REWARD,"Lost Adventurer Rescue"\)/,"Lost Adventurer XP must use the normal progression system");
assert.match(patch,/Safe at last! \+1,000 score and \+200 XP\./,"successful rescue must show the upgraded reward popup");
assert.match(patch,/function drawFriendlyAdventurer\(/,"Lost Adventurer must use the generated friendly character renderer");
assert.match(patch,/drawEnemyV141FriendlyAdventurer/,"the friendly character renderer must replace the old orb renderer");
assert.match(patch,/ctx\.arc\(0,-8,6\.2,0,Math\.PI\*2\)/,"generated adventurer must have a visible head rather than an orb-only body");
assert.match(patch,/ctx\.arc\(0,-4,2\.6,\.2,Math\.PI-\.2\)/,"generated adventurer must have a friendly smiling face");
assert.match(patch,/updateLostAdventurerEscort\(Number\(dt\)\|\|0\)[\s\S]*?const result=original\.apply/,"escort hardening must run before the older rare-event update to prevent the obsolete +500 rescue path winning first");

assert.match(patch,/SOLO_ENEMY_AMMO_ROUNDS=5/,"normal Solo enemy ammo drops must contain exactly five rounds");
assert.match(patch,/net\?\.mode!=="solo"/,"enemy ammo drops must be restricted to solo network mode");
assert.match(patch,/Boolean\(run\.daily\)/,"weekly dungeon runs must not receive the normal Solo enemy ammo rule");
assert.match(patch,/tutorialActive\(\)\|\|specialModeActive\(\)/,"tutorial and special modes must be excluded from normal Solo enemy ammo drops");
assert.match(patch,/typeof p2!=="undefined"&&p2/,"split-screen runs must be excluded from normal Solo enemy ammo drops");
assert.match(patch,/enemy\.passiveNpc\|\|enemy\.lostAdventurer\|\|enemy\.gildedElf/,"friendly/passive dungeon characters must never generate enemy ammo drops");
assert.match(patch,/ammoRounds:SOLO_ENEMY_AMMO_ROUNDS/,"each defeated eligible Solo enemy must create a five-round ammo pickup");
assert.match(patch,/title:"ENEMY AMMO DROP · 5 ROUNDS"/,"Solo enemy ammo drops must identify their exact five-round value");
assert.match(patch,/wasAlive&&enemy&&!enemy\.alive/,"ammo must be released only on the transition from alive to defeated");
assert.match(patch,/enemy\._v141SoloAmmoDropped/,"each defeated enemy must be guarded against duplicate ammo drops");
assert.match(patch,/item\.v130ReserveAmmo=true;\s*item\.ammoRounds=SOLO_ENEMY_AMMO_ROUNDS/,"the five-round enemy pickup must bypass scavenger multiplication and remain exactly five ammo");

console.log("V10.41 sanctuary progression, Lost Adventurer and Solo ammo regression checks passed.");
