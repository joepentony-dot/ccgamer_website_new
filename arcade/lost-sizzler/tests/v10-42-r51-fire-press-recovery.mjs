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
assert.match(play,/function queueAttack\(p,requestedDirection=null\)[\s\S]*fireBuffer2=ATTACK_BUFFER_MS;else fireBuffer1=ATTACK_BUFFER_MS[\s\S]*if\(cooldown>0\)return true[\s\S]*firePlayer\(p,attackDirection\(p,requestedDirection\)\)/,"a fresh press must attempt the core owner immediately while cadence-blocked intent stays buffered");
assert.match(play,/function firePlayer\(p,d\)[\s\S]*if\(cd>0\)return false[\s\S]*const shotIds=\[\],beforeMana=Number\(p\.mana\|\|0\),beforeCount=[\s\S]*spawnBullet\(b,false\)[\s\S]*if\(afterCount<=beforeCount\)[\s\S]*return false[\s\S]*p\.mana=beforeMana-ammoCost[\s\S]*if\(isP2\)fire2=delay;else fire1=delay[\s\S]*return true/,"shot success must require created projectile work before ammo and cooldown are committed");
assert.match(play,/catch\(_\)\{[\s\S]*shotIds\.includes\(bullets\[i\]\?\.id\)[\s\S]*bullets\.splice\(i,1\)[\s\S]*return false/,"partial projectile creation failure must roll back the volley and report failure");
assert.match(play,/\(input\.has\("Space"\)\|\|fireBuffer1>0\)&&fire1<=0[\s\S]*firePlayer\(p1,attackDirection\(p1,d1\(\)\)\)[\s\S]*if\(fire1>0\)fireBuffer1=0/,"held and buffered desktop FIRE must use the same core owner at weapon cadence");
assert.match(play,/firePressed&&\(!gamepadFireDown\|\|fire1<=0\)\)queueAttack\(p1,attackDirection\(p1,dir\)\)/,"gamepad FIRE must use the same core queue");
assert.match(touch,/if\(typeof queueAttack === "function"\) queueAttack\(p1\)/,"touch FIRE must use the same core queue");
assert.match(touch,/if\(!tutorialActive&&typeof input !== "undefined"\) input\.add\("Space"\)/,"held touch FIRE must use the canonical Space-held state");
assert.match(touch,/input\.delete\("Space"\)/,"touch release must stop held FIRE");
assert.doesNotMatch(touch,/attackNow|CCGLostSizzlerV142R20LiveRegressionStability\?\.attackNow/,"touch FIRE must not call recovery ownership");

const reset=main.match(/function clearPauseAttackCadence[\s\S]*?function settlePauseAttackCadence/)?.[0]||"";
assert.match(reset,/fire1=0;fire2=0;fireBuffer1=0;fireBuffer2=0;projectileCD=0/,"pause/inventory return must reset stale transient cadence once");
assert.doesNotMatch(reset,/repairAttackLiveness|repairCombatTimers|rearmCombat|R20LiveRegressionStability/,"pause/inventory return must not invoke an attack recovery chain");

console.log("PASS V10.42 R58 authoritative physical FIRE press contract");
