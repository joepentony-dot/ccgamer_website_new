import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const performanceSource=read("js/v10-41-horde-network-performance.js");
const hordeSafety=read("js/v10-41-horde-mode-safety.js");
const lakeLoader=read("js/v10-41-lake-item-safety.js");
const specialModes=read("js/v10-33-special-modes.js");
const network=read("js/network.js");

assert.match(lakeLoader,/load\("js\/v10-41-horde-network-performance\.js","data-ccg-v141-horde-network-performance"\)/,"the live late-module chain must load the Horde network performance layer");
assert.match(lakeLoader,/script\.src=`\$\{path\}\?v=\$\{encodeURIComponent\(releaseRev\)\}`/,"the performance layer must inherit the current release cache token");

assert.match(performanceSource,/const HORDE_WORLD_RECOVERY_MS=900/,"large generic Horde world snapshots must be limited to the recovery cadence");
assert.match(performanceSource,/const FULL_PLAYER_HEARTBEAT_MS=1200/,"full player state must remain as a periodic repair heartbeat");
assert.match(performanceSource,/net\.send\("player",compactPlayerState\(p1\)\)/,"normal Horde movement ticks must use compact player packets");
assert.match(performanceSource,/if\(!connectedHorde\(\)\|\|typeof p1==="undefined"\|\|!p1\)return original\.apply/,"player packet optimisation must be Horde-only and leave every other mode unchanged");
assert.match(performanceSource,/if\(!connectedHorde\(\)\|\|!net\?\.isHost\)return original\.apply/,"world snapshot throttling must affect only an online Horde host");

const compactBody=performanceSource.match(/function compactPlayerState\(player\)\{([\s\S]*?)\r?\n  \}/)?.[1]||"";
assert.ok(compactBody,"compact Horde player state helper must exist");
for(const required of ["id:player.id","name:player.name","x:player.x","y:player.y","health:player.health","dir:player.dir"])assert.ok(compactBody.includes(required),`compact player packet must retain ${required}`);
for(const forbidden of ["inventory:","weapon:","meleeWeapon:","totalXp:","damageBonus:","potionBonus:"])assert.ok(!compactBody.includes(forbidden),`10 Hz compact Horde packets must not repeatedly send ${forbidden}`);

assert.match(specialModes,/if\(!force&&t-lastStateSend<125\)return/,"Horde must retain its existing 125 ms dedicated authoritative state stream");
const hordeUpdate=specialModes.match(/function updateHorde\(t\)\{([\s\S]*?)\r?\n\r?\n  function sabRoom/)?.[1]||"";
assert.ok(hordeUpdate,"the authoritative Horde update function must be present");
assert.ok(!hordeUpdate.includes("inputs.get"),"Horde authority must not consume the v133 special input map");
assert.match(performanceSource,/event==="v133_special_input"&&connectedHorde\(\)/,"the unused 75 ms special-input stream must be suppressed only while Horde is connected");
assert.match(performanceSource,/state\.suppressedHordeInputs\+\+;return Promise\.resolve\("ok"\)/,"suppressed Horde input packets must preserve the existing async send contract");
assert.match(performanceSource,/event==="v133_special_state"&&payload\?\.roomMode===HORDE/,"guest actors must consume the dedicated Horde state stream");
assert.match(performanceSource,/const result=original\?\.\(event,payload\);[\s\S]*syncGuestHordeActors\(payload\)/,"the established special-mode packet handler must hydrate logical state before the performance layer updates physical guest actors");
assert.match(performanceSource,/for\(const model of source\.activeEnemies\|\|\[\]\)/,"guest physical enemies must be driven from authoritative Horde active-enemy models");
assert.match(performanceSource,/source\.boss/,"the Horde boss must also be driven by the fast authoritative state stream");
assert.match(performanceSource,/String\(model\.kind\|\|""\)==="reserve"/,"reinforcement reserve bookkeeping must never materialise as a visible enemy");

assert.match(hordeSafety,/const PURGE_FALLBACK_MS=500/,"Horde isolation scans must be capped at two expensive purge passes per second");
assert.match(hordeSafety,/tick-state\.lastPurgeAt<PURGE_FALLBACK_MS/,"the 90 ms safety scheduler must skip redundant purge scans inside the fallback window");
assert.match(hordeSafety,/state\.lastPurgeAt=0;[\s\S]*purgeDungeonRuntime\(\)/,"entering Horde must still force an immediate isolation purge");

assert.match(network,/client\.channel\(`ccg-quest:\$\{this\.roomCode\}`/,"the optimisation must retain the existing Supabase Realtime room transport");
assert.match(network,/broadcast:\{self:false,ack:true\}/,"the first performance pass must not alter Supabase acknowledgement semantics for critical existing packets");
assert.match(network,/"horde-survivor":Object\.freeze\(\{id:"horde-survivor",label:"Horde Multiplayer",maxPlayers:Math\.max\(1,Number\(C\.maxPlayers\|\|4\)\)\}\)/,"Horde must retain its four-player room capacity");

/* Execute the late wrapper against a minimal game-shaped runtime. This catches
 * mistakes that static contracts cannot: global wrapper installation, async
 * send semantics, cadence state and guest physical actor reconciliation. */
let clock=1000,fullPlayerCalls=0,worldCalls=0,basePacketCalls=0;
const sent=[];
const active={type:"horde-survivor",seed:"HORDE-TEST"};
const p1={
  id:"P1",name:"Host Tester",x:4,y:5,health:10,maxHealth:10,mana:120,maxMana:120,
  dir:{x:1,y:0},armor:2,level:3,torchMs:0,rapidMs:0,
  inventory:[{kind:"potion"}],weapon:{id:"test-gun"},totalXp:999,damageBonus:4,potionBonus:2
};
const host={enemies:[]};
const net={
  connected:true,isHost:false,roomCode:"H4RD",
  cb:{onPacket(){basePacketCalls++}},
  send(event,payload){sent.push({event,payload});return Promise.resolve("ok")}
};
const windowObject={
  CCGLostSizzlerSpecialModes:{active,startOnline(){}},
  addEventListener(){},
};
const sandbox={
  console,Promise,Date,
  performance:{now:()=>clock},
  document:{body:{dataset:{}}},
  window:windowObject,
  net,playMode:"online",run:{seed:"HORDE-TEST"},p1,host,
  sendPlayer(){fullPlayerCalls++;return net.send("player",{id:p1.id,x:p1.x,y:p1.y,inventory:p1.inventory,weapon:p1.weapon,totalXp:p1.totalXp})},
  broadcastWorld(){worldCalls++;return net.send("world",{enemies:host.enemies.map(enemy=>({...enemy})),largeRecovery:true})},
  setInterval(){return 1},clearInterval(){}
};
windowObject.window=windowObject;
vm.createContext(sandbox);
vm.runInContext(performanceSource,sandbox,{filename:"v10-41-horde-network-performance.js"});
assert.equal(sandbox.document.body.dataset.v141HordeNetworkPerformance,"true","runtime performance layer must install once core globals and special modes exist");

await sandbox.sendPlayer();
assert.equal(fullPlayerCalls,1,"first Horde player update must keep a full repair packet");
assert.ok(Array.isArray(sent.at(-1).payload.inventory),"first repair packet must retain inventory state");
clock=1100;await sandbox.sendPlayer();
assert.equal(fullPlayerCalls,1,"next Horde movement tick must use the compact path");
assert.equal(sent.at(-1).event,"player");
assert.equal(sent.at(-1).payload.x,4);
assert.ok(!("inventory" in sent.at(-1).payload),"compact runtime packet must omit inventory");
assert.ok(!("weapon" in sent.at(-1).payload),"compact runtime packet must omit weapon data");
clock=2301;await sandbox.sendPlayer();
assert.equal(fullPlayerCalls,2,"full Horde player state must repair again after the heartbeat interval");

const sentBeforeSuppressed=sent.length;
await sandbox.net.send("v133_special_input",{roomMode:"horde-survivor",actorId:"P1"});
assert.equal(sent.length,sentBeforeSuppressed,"unused Horde special input must never reach the underlying transport");
assert.equal(sandbox.window.CCGLostSizzlerHordeNetworkPerformance.state.suppressedHordeInputs,1);
active.type="sizzler-saboteurs";
await sandbox.net.send("v133_special_input",{roomMode:"sizzler-saboteurs",actorId:"P1"});
assert.equal(sent.at(-1).event,"v133_special_input","Spy Vs Spy special input must still use the underlying transport");
active.type="horde-survivor";

net.isHost=true;clock=2400;await sandbox.broadcastWorld();
assert.equal(worldCalls,1,"first Horde recovery snapshot must be sent immediately");
clock=2600;await sandbox.broadcastWorld();
assert.equal(worldCalls,1,"generic Horde world snapshots inside the recovery window must be skipped");
clock=3401;await sandbox.broadcastWorld();
assert.equal(worldCalls,2,"generic Horde world snapshot must resume after the recovery interval");
active.type="sizzler-saboteurs";clock=3500;await sandbox.broadcastWorld();
assert.equal(worldCalls,3,"non-Horde world broadcasts must never be throttled by this layer");
active.type="horde-survivor";net.isHost=false;

net.cb.onPacket("v133_special_state",{
  roomMode:"horde-survivor",
  state:{
    activeEnemies:[
      {id:"enemy-1",kind:"spider",x:12,y:13,hp:3,maxHp:4,alive:true,speed:1},
      {id:"reserve-1",kind:"reserve",x:20,y:20,hp:1,maxHp:1,alive:true}
    ],
    boss:{id:"warden-1",kind:"warden",name:"The Horde Warden",x:30,y:31,hp:8,maxHp:10,alive:true,speed:.8}
  }
});
assert.equal(basePacketCalls,1,"existing special-mode packet owner must still receive the state first");
assert.equal(host.enemies.length,2,"guest must materialise the live enemy and boss but never reserve bookkeeping");
assert.deepEqual({x:host.enemies.find(enemy=>enemy.id==="enemy-1").x,y:host.enemies.find(enemy=>enemy.id==="enemy-1").y},{x:12,y:13});
assert.ok(!host.enemies.some(enemy=>enemy.id==="reserve-1"),"reserve bookkeeping must never become a guest-side physical actor");
assert.equal(host.enemies.find(enemy=>enemy.id==="warden-1").hordeWarden,true,"boss state must retain Horde Warden identity");

net.cb.onPacket("v133_special_state",{
  roomMode:"horde-survivor",
  state:{activeEnemies:[{id:"enemy-1",kind:"spider",x:14,y:15,hp:2,maxHp:4,alive:true,speed:1}],boss:{id:"warden-1",kind:"warden",x:30,y:31,hp:0,maxHp:10,alive:false}}
});
assert.equal(host.enemies.length,1,"dead/missing guest Horde actors must be removed from the physical list");
assert.deepEqual({x:host.enemies[0].x,y:host.enemies[0].y,hp:host.enemies[0].hp},{x:14,y:15,hp:2},"125 ms Horde state must update the guest physical actor between generic world snapshots");

net.cb.onPacket("v133_special_state",{roomMode:"horde-survivor",state:{activeEnemies:[],boss:null}});
assert.equal(host.enemies.length,0,"guest physical Horde corpses must not accumulate after the authoritative state removes them");

console.log("Lost Sizzler V10.41 four-player Horde Supabase network performance contract passed.");
