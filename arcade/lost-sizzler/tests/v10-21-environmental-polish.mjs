import fs from "node:fs";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), "utf8");

const env = read("js/v10-21-environmental-polish.js");
const loader = read("js/asset-overrides.js");
const onboarding = read("js/v10-20-onboarding-safety.js");
const changelog = read("js/v10-18-expansion-changelog.js");

assert.match(env, /const PIT_RUN_CHANCE=\.04;/, "Vortex pits must remain very rare");
assert.match(env, /const PIT_MIN_FLOOR=3;/, "Vortex pits must not appear in the opening floors");
assert.match(env, /designatedPitFloor/, "Pit floor selection must be deterministic per run seed");
assert.match(env, /target!==floor/, "Only the designated deep floor may receive a real vortex");
assert.match(env, /routeExistsAvoiding\(\[q\]\)/, "Pit placement must preserve a start-to-exit route");
assert.match(env, /room\.id!==world\.startRoomId/, "Start room must be excluded from real pit placement");
assert.match(env, /training:true,harmless:true/, "Tutorial must use a harmless demonstration vortex");
assert.match(env, /const PIT_PLAYER_DAMAGE=1;/, "A real vortex must deal exactly 1 HP of direct damage");
assert.match(env, /pit\(\)\?\.training&&tutorialActive\(\)/, "A training vortex must only be harmless while the tutorial is active");
assert.match(env, /hurtPlayer\(player,PIT_PLAYER_DAMAGE,false,"vortex pit"\)/, "A normal-mode vortex must damage the player");
assert.match(env, /player\.x=q\.x;player\.y=q\.y;player\.rx=q\.x;player\.ry=q\.y/, "A normal-mode vortex must knock the player onto a safe cell");
assert.match(env, /HAZARDS &amp; RARE VORTEX PITS/, "Tutorial must explain rare vortex pits");
assert.match(env, /Enemies normally avoid floor traps and vortex pits/, "Tutorial must explain hazard avoidance and knockback");
assert.match(env, /window\.CCGAI\.stepEnemies=function stepEnemiesV121HazardAvoidance/, "Enemy AI must treat static hazards as undesirable path cells");
assert.match(env, /resolveForcedHazard\(enemy,from\|\|p1,origin\)/, "Forced knockback must resolve environmental hazards");
assert.match(env, /damageEnemy\(enemy,Math\.max\(9999/, "Vortex knock-ins must be lethal to ordinary enemies through normal defeat handling");
assert.match(env, /TRAP_ENEMY_DAMAGE/, "Knocked enemies must take trap/hazard damage");
assert.match(env, /VORTEX REJECTED/, "Indestructible Death Stalkers must not bypass their special defeat rule through pits");
assert.match(env, /repairDoorFrames/, "Door geometry repair must be installed");
assert.match(env, /world\.doorFrameCells/, "Door supports must be tracked");
assert.match(env, /routeExistsAvoiding\(\[\]\)/, "Door-frame repair must be reverted if it breaks traversal");
assert.match(env, /VORTEX PIT AHEAD/, "Players must receive a warning before a nearby real pit");
assert.match(env, /drawVortex/, "Vortex must have a dedicated animated visual");
assert.match(env, /S\.sfx\("warp"\)/, "Vortex must have a distinctive sound layer");
assert.match(env, /doorDust/, "Heavy/special doors must receive extra environmental visual feedback");
assert.match(loader, /v10-21-environmental-polish\.js/, "Environmental polish module must be loaded by the game");
assert.match(changelog, /Rare vortex pits/, "Developer changelog must record the vortex/hazard pass");
assert.match(onboarding, /Training Archive/, "Existing tutorial must remain present");

console.log("V10.21 door geometry, rare vortex, hazard knockback and tutorial regression checks passed");
