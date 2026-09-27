import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const read=file=>fs.readFileSync(new URL(file,root),"utf8").replace(/\r\n/g,"\n");
const bootstrap=read("js/v10-42-bootstrap.js");
const play=read("js/game-play.js");
const main=read("js/game-main.js");
const touch=read("js/v10-4-patch.js");

assert.doesNotMatch(bootstrap,/v10-42-attack-hold-liveness\.js/,"fresh-press recovery module must remain retired");
assert.doesNotMatch(bootstrap,/v10-42-r47-inventory-fire-recovery\.js/,"inventory FIRE recovery module must remain retired");

assert.match(play,/const ATTACK_BUFFER_MS=700/,"quick taps must retain one bounded core input buffer");
const queueBlock=play.match(/function queueAttack\(p,requestedDirection=null\)\{[\s\S]*?\n\}/)?.[0]||"";
assert.match(queueBlock,/fireBuffer2=ATTACK_BUFFER_MS;else fireBuffer1=ATTACK_BUFFER_MS/,"a fresh press must enter the bounded canonical FIRE buffer");
assert.doesNotMatch(queueBlock,/firePlayer\(/,"physical input must not create a projectile outside the simulation owner");
assert.match(play,/const p1HeldAttack=isAttackHeldInput\(p1\)&&\(input\.has\("Space"\)\|\|input\.has\("Numpad0"\)\)[\s\S]*\(p1HeldAttack\|\|fireBuffer1>0\)&&fire1<=0[\s\S]*const fired=firePlayer\(p1,attackDirection\(p1,d1\(\)\)\);if\(fired\)fireBuffer1=0/,"fresh buffered and explicitly qualified held desktop FIRE must converge on the single simulation owner");
assert.match(play,/function firePlayer\(p,d\)[\s\S]*if\(cd>0\)return false[\s\S]*const shotIds=\[\],beforeMana=Number\(p\.mana\|\|0\),beforeCount=[\s\S]*spawnBullet\(b,false\)[\s\S]*if\(afterCount<=beforeCount\)[\s\S]*return false[\s\S]*p\.mana=beforeMana-ammoCost[\s\S]*if\(isP2\)fire2=delay;else fire1=delay[\s\S]*return true/,"shot success must require created projectile work before ammo and cooldown are committed");
assert.match(play,/catch\(_\)\{[\s\S]*shotIds\.includes\(bullets\[i\]\?\.id\)[\s\S]*bullets\.splice\(i,1\)[\s\S]*return false/,"partial projectile creation failure must roll back the volley and report failure");
assert.match(play,/\(p1HeldAttack\|\|fireBuffer1>0\)&&fire1<=0[\s\S]*const fired=firePlayer\(p1,attackDirection\(p1,d1\(\)\)\);if\(fired\)fireBuffer1=0/,"qualified held and buffered desktop FIRE must use the same core owner at weapon cadence and consume one queued intent only after a successful attack");
assert.match(play,/if\(firePressed\)[\s\S]*const direction=attackDirection\(p1,dir\)[\s\S]*if\(!gamepadFireDown\)\{[\s\S]*if\(!attackNowUnbuffered\(p1,direction\)\)queueAttack\(p1,direction\)[\s\S]*else if\(fire1<=0\)attackNowUnbuffered\(p1,direction\)/,"gamepad FIRE must use the authoritative direct owner for the initial press, buffer only when cadence blocks it, and route held repeats through the same core when cooldown is ready");
assert.match(touch,/if\(typeof queueAttack === "function"\) queueAttack\(p1\)/,"touch FIRE must use the same core queue");
assert.match(touch,/if\(!tutorialActive&&typeof input !== "undefined"\)\{[\s\S]*input\.add\("Space"\);[\s\S]*setAttackHeldInput\(p1,true\)/,"held touch FIRE must use canonical Space state plus explicit held-FIRE ownership");
assert.match(touch,/input\.delete\("Space"\)[\s\S]*setAttackHeldInput\(p1,false\)/,"touch release must stop canonical and qualified held FIRE");
assert.match(touch,/CCGLostSizzlerV142R58AuthoritativeFireCore\?\.attackNow\?\.\(\)/,"Tutorial touch FIRE may use only the R58 unbuffered immediate entry point");
assert.doesNotMatch(touch,/CCGLostSizzlerV142R20LiveRegressionStability\?\.attackNow/,"touch FIRE must not call historical R20 recovery ownership");

const reset=main.match(/function clearPauseAttackCadence[\s\S]*?function settlePauseAttackCadence/)?.[0]||"";
assert.match(reset,/fire1=0;fire2=0;fireBuffer1=0;fireBuffer2=0;projectileCD=0/,"pause/inventory return must reset stale transient cadence once");
assert.doesNotMatch(reset,/repairAttackLiveness|repairCombatTimers|rearmCombat|R20LiveRegressionStability/,"pause/inventory return must not invoke an attack recovery chain");

console.log("PASS V10.42 R58 authoritative physical FIRE press contract");
