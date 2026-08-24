import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const ammo=read("js/v10-26-ammo-budget.js");
const loader=read("js/asset-overrides.js");

assert.match(loader,/const CCG_AMMO_BUDGET_REV="20260823a"/,"ammo budget must have a dedicated cache revision");
assert.match(loader,/v10-26-ammo-budget\.js\?v=\$\{CCG_AMMO_BUDGET_REV\}/,"ammo budget must load after the sword-first balance layer");
assert.ok(loader.indexOf("v10-25-melee-ammo-balance.js")<loader.indexOf("v10-26-ammo-budget.js"),"V10.26 must wrap the final V10.25 combat behaviour");
assert.match(ammo,/const BASE_MAX_AMMO=120/,"normal firearm capacity must be large enough to support gunplay without restoring the old 240-round pool");
assert.match(ammo,/const FIRST_GUN_ROUNDS=24/,"the first firearm must arrive with 24 rounds");
assert.match(ammo,/const RESPAWN_ROUNDS=12/,"respawn must provide a modest firearm reserve rather than leaving the player helpless");
assert.match(ammo,/const ASSUMED_DAMAGE_PER_HIT=1\.8/,"ammo budget must use a conservative average weapon hit value");
assert.match(ammo,/const ASSUMED_ACCURACY=\.50/,"ammo budget must explicitly allow for 50 percent missed shots");
assert.match(ammo,/const SAFETY_RESERVE=1\.10/,"ammo budget must retain a small safety margin beyond calculated enemy durability");
assert.match(ammo,/PACK_ROUNDS_BY_FLOOR=\[36,38,40,42,44\]/,"deeper floor packs must carry slightly more ammunition");
assert.match(ammo,/MIN_PACKS_BY_FLOOR=\[8,9,10,11,12\]/,"every floor must retain a useful minimum number of ammunition packs");
assert.match(ammo,/MAX_PACKS_BY_FLOOR=\[12,14,15,17,18\]/,"ammo pack clutter must remain bounded even on very durable seeds");
assert.match(ammo,/const MAX_BALANCED_PACK_ROUNDS=72/,"ordinary late-floor packs must remain sensibly capped");
assert.match(ammo,/enemy\.hp\|\|enemy\.maxHp/,"budget must include enemy HP");
assert.match(ammo,/Number\(enemy\.armor\|\|0\)/,"budget must include enemy armour");
assert.match(ammo,/enemy\.follower[\s\S]*?namedPotionHeal/,"budget must account for named-enemy healing");
assert.match(ammo,/futureGeneratorDurability/,"budget must reserve ammunition for generator-spawned enemies");
assert.match(ammo,/roundsNeeded=Math\.ceil\(\(totalDurability\/ASSUMED_DAMAGE_PER_HIT\)\/ASSUMED_ACCURACY\*SAFETY_RESERVE\)/,"round budget must be derived from actual durability, damage, accuracy and safety reserve");
assert.match(ammo,/host\.ammoBudget=\{\.\.\.budget\}/,"generated floors must retain their calculated ammo budget for inspection/debugging");
assert.match(ammo,/Spread supplies across rooms/,"ammo packs must be distributed rather than stacked into one area");
assert.match(ammo,/budget\.meetsAccuracyBudget=planned>=budget\.roundsNeeded/,"the final placed supply must record whether it meets the advertised accuracy budget");
assert.match(ammo,/v130ReserveAmmo:true/,"a final-objective reserve must cover any amount left after bounded ordinary packs");
assert.match(ammo,/Number\(i\.ammoRounds\|\|packRounds/,"pickup value must use each placed pack's calculated ammunition amount");
assert.match(ammo,/i\.v130ReserveAmmo\?1:1\+Math\.max/,"reserve rounds must not be inflated by scavenger bonuses after they have already been budgeted");
assert.doesNotMatch(ammo,/emergencyAmmo\s*=\s*[1-9]/,"V10.26 must not reintroduce regenerating emergency bullets");

console.log("Lost Sizzler V10.26 enemy-budgeted ammo regression checks passed.");
