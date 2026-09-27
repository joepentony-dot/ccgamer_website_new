import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const bootstrap=fs.readFileSync(new URL("js/v10-42-bootstrap.js",root),"utf8");
const main=fs.readFileSync(new URL("js/game-main.js",root),"utf8");
const play=fs.readFileSync(new URL("js/game-play.js",root),"utf8");
const legacy=fs.readFileSync(new URL("js/v10-42-r47-inventory-fire-recovery.js",root),"utf8");

assert.doesNotMatch(bootstrap,/v10-42-r47-inventory-fire-recovery\.js/,"retired inventory FIRE recovery must not load");
assert.match(legacy,/fireOwnership:false/,"historical r47 file must remain non-owning if inspected from cache/history");
for(const owner of ["firePlayer","queueAttack","movePlayer","toggleInventory"]){
  assert.doesNotMatch(legacy,new RegExp(String.raw`\\b${owner}\\s*=`),`historical r47 must not replace ${owner}`);
}

const reset=main.match(/function clearPauseAttackCadence[\s\S]*?function settlePauseAttackCadence/)?.[0]||"";
assert.match(reset,/fire1=0;fire2=0;fireBuffer1=0;fireBuffer2=0;projectileCD=0/,"inventory/pause return must reset only core transient cadence");
assert.match(reset,/input\.delete\("Space"\)[\s\S]*input\.delete\("Numpad0"\)/,"inventory/pause return must clear stale held attack keys");
assert.doesNotMatch(reset,/R20LiveRegressionStability|AttackHoldLiveness|repairAttackLiveness|rearmCombat/,"inventory/pause return must not invoke a recovery owner");

assert.match(main,/returningFromInventory&&mode==="playing"[\s\S]*settlePauseAttackCadence\("inventory-close-top"\)[\s\S]*focusGameplayKeyboard/,"top inventory close must restore core cadence and keyboard focus");
assert.match(main,/returningFromInventory&&mode==="playing"[\s\S]*settlePauseAttackCadence\("inventory-close"\)[\s\S]*focusGameplayKeyboard/,"inventory toggle close must restore core cadence and keyboard focus");
assert.match(play,/function queueAttack\(p,requestedDirection=null\)/,"post-inventory FIRE must return to the one core attack queue");

console.log("Dungeon Carnage r58 inventory-to-FIRE core ownership contract passed.");
