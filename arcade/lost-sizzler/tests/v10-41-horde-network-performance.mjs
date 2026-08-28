import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const performance=read("js/v10-41-horde-network-performance.js");
const hordeSafety=read("js/v10-41-horde-mode-safety.js");
const lakeLoader=read("js/v10-41-lake-item-safety.js");
const specialModes=read("js/v10-33-special-modes.js");
const network=read("js/network.js");

assert.match(lakeLoader,/load\("js\/v10-41-horde-network-performance\.js","data-ccg-v141-horde-network-performance"\)/,"the live late-module chain must load the Horde network performance layer");
assert.match(lakeLoader,/script\.src=`\$\{path\}\?v=\$\{encodeURIComponent\(releaseRev\)\}`/,"the performance layer must inherit the current release cache token");

assert.match(performance,/const HORDE_WORLD_RECOVERY_MS=900/,"large generic Horde world snapshots must be limited to the recovery cadence");
assert.match(performance,/const FULL_PLAYER_HEARTBEAT_MS=1200/,"full player state must remain as a periodic repair heartbeat");
assert.match(performance,/net\.send\("player",compactPlayerState\(p1\)\)/,"normal Horde movement ticks must use compact player packets");
assert.match(performance,/if\(!connectedHorde\(\)\|\|typeof p1==="undefined"\|\|!p1\)return original\.apply/,"player packet optimisation must be Horde-only and leave every other mode unchanged");
assert.match(performance,/if\(!connectedHorde\(\)\|\|!net\?\.isHost\)return original\.apply/,"world snapshot throttling must affect only an online Horde host");

const compactBody=performance.match(/function compactPlayerState\(player\)\{([\s\S]*?)\n  \}/)?.[1]||"";
assert.ok(compactBody,"compact Horde player state helper must exist");
for(const required of ["id:player.id","name:player.name","x:player.x","y:player.y","health:player.health","dir:player.dir"])assert.ok(compactBody.includes(required),`compact player packet must retain ${required}`);
for(const forbidden of ["inventory:","weapon:","meleeWeapon:","totalXp:","damageBonus:","potionBonus:"])assert.ok(!compactBody.includes(forbidden),`10 Hz compact Horde packets must not repeatedly send ${forbidden}`);

assert.match(specialModes,/if\(!force&&t-lastStateSend<125\)return/,"Horde must retain its existing 125 ms dedicated authoritative state stream");
const hordeUpdate=specialModes.match(/function updateHorde\(t\)\{([\s\S]*?)\n\n  function sabRoom/)?.[1]||"";
assert.ok(hordeUpdate,"the authoritative Horde update function must be present");
assert.ok(!hordeUpdate.includes("inputs.get"),"Horde authority must not consume the v133 special input map");
assert.match(performance,/event==="v133_special_input"&&connectedHorde\(\)/,"the unused 75 ms special-input stream must be suppressed only while Horde is connected");
assert.match(performance,/state\.suppressedHordeInputs\+\+;return Promise\.resolve\("ok"\)/,"suppressed Horde input packets must preserve the existing async send contract");
assert.match(performance,/event==="v133_special_state"&&payload\?\.roomMode===HORDE/,"guest actors must consume the dedicated Horde state stream");
assert.match(performance,/const result=original\?\.\(event,payload\);[\s\S]*syncGuestHordeActors\(payload\)/,"the established special-mode packet handler must hydrate logical state before the performance layer updates physical guest actors");
assert.match(performance,/for\(const model of source\.activeEnemies\|\|\[\]\)/,"guest physical enemies must be driven from authoritative Horde active-enemy models");
assert.match(performance,/source\.boss/,"the Horde boss must also be driven by the fast authoritative state stream");
assert.match(performance,/String\(model\.kind\|\|""\)==="reserve"/,"reinforcement reserve bookkeeping must never materialise as a visible enemy");

assert.match(hordeSafety,/const PURGE_FALLBACK_MS=500/,"Horde isolation scans must be capped at two expensive purge passes per second");
assert.match(hordeSafety,/tick-state\.lastPurgeAt<PURGE_FALLBACK_MS/,"the 90 ms safety scheduler must skip redundant purge scans inside the fallback window");
assert.match(hordeSafety,/state\.lastPurgeAt=0;[\s\S]*purgeDungeonRuntime\(\)/,"entering Horde must still force an immediate isolation purge");

assert.match(network,/client\.channel\(`ccg-quest:\$\{this\.roomCode\}`/,"the optimisation must retain the existing Supabase Realtime room transport");
assert.match(network,/broadcast:\{self:false,ack:true\}/,"the first performance pass must not alter Supabase acknowledgement semantics for critical existing packets");
assert.match(network,/"horde-survivor":Object\.freeze\(\{id:"horde-survivor",label:"Horde Multiplayer",maxPlayers:Math\.max\(1,Number\(C\.maxPlayers\|\|4\)\)\}\)/,"Horde must retain its four-player room capacity");

console.log("Lost Sizzler V10.41 four-player Horde Supabase network performance contract passed.");
