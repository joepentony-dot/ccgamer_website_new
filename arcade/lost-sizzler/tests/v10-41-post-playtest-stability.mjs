import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const source=read("js/v10-41-post-playtest-stability.js");
const loader=read("js/v10-41-r30-spy-exit-control-reset.js");

assert.match(loader,/v10-41-post-playtest-stability\.js/,"r30 tail must load the post-playtest stability layer");
assert.match(loader,/data-ccg-post-playtest-stability/,"post-playtest stability loader must be deduplicated");

assert.match(source,/function resolveSoloHordeDefeat/,"Solo Horde must have an explicit terminal-death repair");
assert.match(source,/Number\(runState\.playerCount\|\|0\)!==1/,"Solo Horde death repair must never collapse multiplayer revive rules");
assert.match(source,/String\(player\.status\|\|""\)!=="downed"/,"only a genuinely downed Solo player may be converted to immediate defeat");
assert.match(source,/player\.status="eliminated"/,"unrevivable Solo Horde death must eliminate the player");
assert.match(source,/runState\.state="defeat"/,"unrevivable Solo Horde death must terminate the run");
assert.match(source,/if\(Number\(player\.health\)!==0\)\{player\.health=0/,"downed or eliminated Horde physical players must remain at zero HP");
assert.match(source,/setPatchLock\(player,true\)/,"non-active Horde players must not retain live controls");
assert.match(source,/clearTerminalInput\(\)/,"terminal Horde states must clear movement/fire input");

assert.match(source,/compactHordeArena\?\.\(\)/,"real Horde starts must retry compact arena creation");
assert.match(source,/shapeHordeArena\?\.\(\)/,"real Horde starts must retry traversal geometry after compaction");
assert.match(source,/function hordeTraversalGeometryHealthy/,"live Horde traversal readiness must validate actual map geometry instead of trusting a stale marker");
assert.match(source,/interiorWalls<40/,"real Horde traversal validation must require meaningful interior wall cells");
assert.match(source,/function invalidateHordeTraversalGeometry/,"stale traversal metadata must be invalidated before rebuilding wiped walls");
assert.match(source,/delete world\._v141TraversalHordeArena/,"a stale Horde traversal world marker must be cleared before repair");
assert.match(source,/!hordeTraversalGeometryHealthy\(\)/,"Horde arena maintenance must rebuild whenever the real map no longer matches its traversal metadata");

assert.match(source,/legacyHordeBannerRect/,"obsolete Horde canvas banner rectangles must be identified narrowly");
assert.match(source,/legacyHordeBannerText/,"obsolete Horde canvas banner copy must be identified narrowly");
assert.match(source,/^\s*ctx\.fillRect=function/m,"the late renderer must suppress only matched legacy canvas rectangles");
assert.match(source,/^\s*ctx\.fillText=function/m,"the late renderer must suppress only matched legacy Horde canvas text");

assert.match(source,/function installSpySmoothing/,"Spy must install a render-coordinate smoothing owner");
assert.match(source,/moved&&distance<=1\.5&&snapped/,"Spy smoothing must only restore interpolation for accepted short grid steps");
assert.match(source,/factor=local\?\.32:\.28/,"Spy local/remote render easing must mirror the shared renderer cadence");
assert.match(source,/engine\.isolatedUpdate=wrapped/,"the controller-called isolated Spy update must receive smoothing");
assert.match(source,/registered\.update=wrapped/,"the mode registry must expose the same smoothed Spy runtime");

assert.match(source,/function repairSoloFireState/,"Solo must have a bounded fire-state recovery guard");
assert.match(source,/Number\(fire1\)>2500/,"an absurdly large Solo fire cooldown must be rejected");
assert.match(source,/!Number\.isFinite\(Number\(fire1\)\)/,"a non-finite Solo fire cooldown must be repaired");
assert.match(source,/Number\(fireBuffer1\)>2000/,"a poisoned fire buffer must be bounded");
assert.match(source,/if\(specialType\(\)\)return false/,"Solo fire recovery must not leak into Horde or Spy");

assert.match(source,/trimArray\("particles",horde\?420:560\)/,"busy multiplayer visual particles must have a bounded backlog");
assert.match(source,/trimArray\("rings",horde\?90:130\)/,"busy multiplayer ring effects must have a bounded backlog");
assert.doesNotMatch(source,/trimArray\("bullets"/,"performance trimming must not delete gameplay player projectiles");
assert.doesNotMatch(source,/trimArray\("enemyBullets"/,"performance trimming must not delete hostile gameplay projectiles");

console.log("Lost Sizzler post-playtest Horde death/arena/HUD, Spy smoothing, Solo fire recovery and visual-budget contracts passed.");
