import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const play=fs.readFileSync(new URL("js/game-play.js",root),"utf8");
const core=fs.readFileSync(new URL("js/game-core.js",root),"utf8");
const inventory=fs.readFileSync(new URL("js/v10-6-inventory-hud-fix.js",root),"utf8");

const melee=play.match(/function canonicalMeleeAttackIfRequired\(p,d\)\{[\s\S]*?\n\}/)?.[0]||"";
assert.match(melee,/const hasGun=Boolean\(p\.firearmUnlocked&&p\.weapon\)/);
assert.match(melee,/if\(hasGun&&Number\(p\.mana\|\|0\)>0\)return null/,"a loaded firearm must bypass the melee helper regardless of adjacent furniture or enemies");
assert.doesNotMatch(melee,/adjacentFurniture|adjacentEnemy/,"loaded-firearm routing must not depend on adjacent melee targets");
assert.match(play,/function executeAuthoritativeFire\(p,requestedDirection=null,source="buffered"\)[\s\S]*const owner=authoritativeCoreFirePlayer[\s\S]*const fired=Boolean\(owner\(p,direction\)\)/,"R62 FIRE execution must resolve only the captured authoritative owner");
assert.match(play,/const AUTHORITATIVE_FIRE_TRACE_LIMIT=96[\s\S]*"projectiles-inserted"[\s\S]*"ammo-committed"[\s\S]*"shot-complete"/,"R62 must retain a bounded per-intent FIRE trace through projectile and ammo commit");
assert.match(play,/if\(\(p1HeldAttack\|\|p1BufferedAtFrameStart\|\|fireBuffer1>0\)&&fire1<=0\)\{const fired=executeAuthoritativeFire\(p1,d1\(\),"buffered"\)/,"buffered P1 ATTACK must preserve a fresh long-frame tap and use the authoritative executor");

assert.match(play,/const runtimeDeathRecovery=new WeakSet\(\)/);
assert.match(play,/function enforceCanonicalDeathState\(p\)[\s\S]*Number\(p\.health\)>0[\s\S]*authoritativeDamagePlayer\(p,1,false,"runtime integrity death recovery"\)/,"health <= 0 must re-enter the canonical death owner");
assert.match(play,/for\(const p of localPlayers\(\)\)if\(p&&Number\(p\.health\)<=0\)enforceCanonicalDeathState\(p\)/,"the simulation loop must enforce the death invariant before normal live updates");

assert.match(core,/tierMatch=weaponRaw\.match\(\/TIER\\s\+\(\\d\+\)\/i\)/,"HUD must understand evolved weapon tier names");
assert.match(core,/UI\.weapon\.textContent=\x60L\$\{weaponLevel\} \$\{weaponFamily\}\x60\.toUpperCase\(\)\.slice\(0,18\)/,"HUD must expose compact weapon level plus readable family");
assert.match(core,/UI\.weapon\.title=\x60Weapon Level \$\{weaponLevel\} · \$\{weaponRaw\}\x60/,"full weapon identity must remain available as a title");

const keyHeading=inventory.indexOf('section("QUEST & KEYS")');
const carriedHeading=inventory.indexOf('section("CARRIED ITEMS")');
assert.ok(keyHeading>=0&&carriedHeading>keyHeading,"relevant quest/key status must render before the concise carried-item summary");
assert.match(inventory,/if\(bronze>0\)questRows\.push\(row\(\{kind:"bronze",name:"BRONZE KEYS",qty:\x60×\$\{bronze\}\x60/,"bronze-key status must appear only while keys are actually held");
assert.match(inventory,/if\(potions>0\)itemRows\.push/,"zero-count stored items must not force a scrolling live sidebar");
assert.match(inventory,/if\(!rows\.length\)rows\.push\('<div class="carried-empty">/,"an empty live key/item summary must have a compact empty state");

console.log("Dungeon R61 runtime-integrity and HUD contract passed.");
