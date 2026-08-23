import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const combat=read("js/v10-25-melee-ammo-balance.js");
const loader=read("js/v10-24-mobile-ergonomics.js");

assert.match(loader,/v10-25-melee-ammo-balance\.js\?v=20260823a/,"V10.25 combat balance must be loaded after the existing runtime layers");
assert.match(combat,/const MAX_START_AMMO=60/,"base firearm capacity must be reduced from the old 240-shot pool");
assert.match(combat,/p\.mana=0;\s*p\.weapon=null;\s*p\.firearmUnlocked=false/,"fresh players must start with zero ammo and no firearm");
assert.match(combat,/id:"archive-sword"[\s\S]*?power:1/,"fresh players must start with the Archive Sword");
assert.match(combat,/if\(!hasGun\(p\)\|\|Number\(p\.mana\|\|0\)<=0\)return meleeAttack\(p,d\)/,"attack must automatically fall back to melee without a firearm or at zero ammo");
assert.doesNotMatch(combat,/dashPlayerV125[\s\S]{0,550}p\.mana\s*[-+]=/,"V10.25 dash must not consume firearm ammunition");
assert.match(combat,/updateEmergencyAmmo=function updateEmergencyAmmoV125\(p\)\{if\(p\)p\.emergencyRechargeMs=0\}/,"emergency ammunition regeneration must be disabled");
assert.match(combat,/const FLOOR_AMMO_ARCADE=3/,"Arcade floors must be pruned to three ordinary ammo packs");
assert.match(combat,/const FLOOR_AMMO_LOW=2/,"LOW AMMO floors must be pruned to two ordinary ammo packs");
assert.match(combat,/const FLOOR_AMMO_CASUAL=4/,"Casual must retain a slightly softer ammo allowance");
assert.match(combat,/const FLOOR_MELEE_FIND_CHANCE=\.02/,"rare melee finds must remain genuinely uncommon");
assert.match(combat,/SID Sabre[\s\S]*?power:4/,"rare SID Sabre must substantially outperform the starter sword");
assert.match(combat,/Gold Medal Greatsword[\s\S]*?power:6/,"Gold Medal Greatsword must provide high melee damage");
assert.match(combat,/Zzap! 97% Power Blade[\s\S]*?power:8/,"top-tier rare melee must provide exceptional damage");
assert.match(combat,/kind==="meleeWeapon"/,"rare melee weapons must use a dedicated pickup/equipment path");
assert.match(combat,/dedicated melee slot, not an inventory slot/,"rare melee equipment must not consume inventory capacity");
assert.match(combat,/Potions no longer restore firearm ammunition/,"potions must no longer refill ammo");
assert.match(combat,/RESPAWN_AMMO=6/,"death respawn ammo must be a tiny reserve rather than a large free refill");
assert.match(combat,/ATTACK — START WITH YOUR SWORD/,"tutorial must explain the sword-first combat model");
assert.match(combat,/Ammo is deliberately scarce/,"tutorial must explain firearm scarcity and zero-ammo melee fallback");
assert.match(combat,/gunfire or melee knockback can force them into hazards/,"tutorial must teach melee environmental knockback");

console.log("Lost Sizzler V10.25 sword-first combat regression checks passed.");
