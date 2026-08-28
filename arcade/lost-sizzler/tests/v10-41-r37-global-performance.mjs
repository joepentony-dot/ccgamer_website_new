import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const source=read("js/v10-41-r37-global-performance.js");
const loader=read("js/v10-41-lake-item-safety.js");

assert.match(loader,/load\("js\/v10-41-r37-global-performance\.js","data-ccg-v141-r37-global-performance"\)/,"late chain must load the r37 global performance finalizer");
assert.match(source,/const FULL_PLAYER_HEARTBEAT_MS=2500/,"full player repair must be reduced to a 2.5 second heartbeat");
assert.match(source,/const IDLE_PLAYER_HEARTBEAT_MS=500/,"stationary player packets must be de-duplicated between bounded heartbeats");
assert.match(source,/const WORLD_RECOVERY_MS=2500/,"large generic world snapshots must be recovery traffic rather than the live stream");
assert.match(source,/const WORLD_BURST_MIN_MS=280/,"bursts of structural world revisions must be coalesced");
assert.match(source,/const SPY_POSITION_HEARTBEAT_MS=350/,"unchanged Spy position packets must be de-duplicated");
assert.match(source,/const HORDE_STATE_HEARTBEAT_MS=300/,"unchanged Horde state packets must be de-duplicated while retaining a heartbeat");
assert.match(source,/trimArray\(particles,budget\.particles\)/,"purely visual particles must have a bounded budget");
assert.match(source,/trimArray\(rings,budget\.rings\)/,"purely visual rings must have a bounded budget");
assert.match(source,/trimArray\(floaters,budget\.floaters\)/,"purely visual floating text must have a bounded budget");
assert.doesNotMatch(source,/trimArray\(bullets/,"gameplay bullets must never be dropped for performance");
assert.doesNotMatch(source,/trimArray\(enemyBullets/,"enemy projectiles must never be dropped for performance");
assert.doesNotMatch(source,/host\.enemies\.splice|host\.enemies=host\.enemies\.slice/,"enemy simulation must not be trimmed by the visual performance layer");

let clock=1000;
const sent=[];
const document={body:{dataset:{runActive:"true",specialMode:""}}};
const particles=Array.from({length:700},(_,i)=>({i}));
const rings=Array.from({length:130},(_,i)=>({i}));
const floaters=Array.from({length:140},(_,i)=>({i}));
const bullets=Array.from({length:250},(_,i)=>({i}));
const enemyBullets=Array.from({length:260},(_,i)=>({i}));
const net={
  connected:true,isHost:true,roomMode:"dungeon",roomCode:"R37AA",sessionId:"P1",
  getRoomMode(){return{id:this.roomMode}},
  send(event,payload){sent.push({event,payload});return Promise.resolve("ok")}
};
const context={
  console,Date,Promise,Map,Set,Math,Number,String,Boolean,Array,Object,JSON,
  document,performance:{now:()=>clock},net,playMode:"online",mode:"playing",
  run:{seed:"R37",floor:1},host:{revision:1},
  p1:{id:"P1",name:"Host",x:3,y:4,health:8,maxHealth:8,mana:20,maxMana:120,dir:{x:1,y:0},armor:1,bronzeKeys:1,level:2,torchMs:0,rapidMs:0,inventory:[{kind:"potion"}],weapon:{name:"FULL"},totalXp:900},
  particles,rings,floaters,bullets,enemyBullets,
  playerStateForNetwork(player){return{...player,inventory:player.inventory.map(row=>({...row})),weapon:{...player.weapon}}},
  sendPlayer(){return net.send("player",context.playerStateForNetwork(context.p1))},
  broadcastWorld(){return net.send("world",{revision:context.host.revision,large:true})},
  setInterval(){return 1},clearInterval(){},addEventListener(){},
  requestAnimationFrame(){return 1},cancelAnimationFrame(){},
};
context.window=context;
context.window.CCGLostSizzlerSpecialModes={active:null};
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-41-r37-global-performance.js"});
const api=context.window.CCGLostSizzlerV141R37GlobalPerformance;
assert.ok(api?.state?.installed,"r37 finalizer must install against the live networking globals");

sent.length=0;
context.sendPlayer();
clock+=100;context.sendPlayer();
assert.equal(sent.filter(row=>row.event==="player").length,1,"unchanged player state must not be published every 100 ms");
clock+=500;context.sendPlayer();
assert.equal(sent.filter(row=>row.event==="player").length,2,"idle player state must retain a bounded heartbeat");
assert.ok(!("inventory" in sent.filter(row=>row.event==="player")[1].payload),"idle heartbeat between repairs must stay compact");
context.p1.x=4;clock+=100;context.sendPlayer();
assert.equal(sent.filter(row=>row.event==="player").length,3,"movement must publish immediately rather than wait for the idle heartbeat");
clock+=2500;context.sendPlayer();
const playerPackets=sent.filter(row=>row.event==="player");
assert.ok("inventory" in playerPackets.at(-1).payload,"periodic full player repair must still carry inventory/state recovery data");

sent.length=0;
clock+=1000;context.broadcastWorld();
context.host.revision++;clock+=100;context.broadcastWorld();
assert.equal(sent.filter(row=>row.event==="world").length,1,"rapid structural revisions must not emit back-to-back huge world snapshots");
clock+=300;context.broadcastWorld();
assert.equal(sent.filter(row=>row.event==="world").length,2,"coalesced structural change must be allowed through after the burst window");
clock+=500;context.broadcastWorld();
assert.equal(sent.filter(row=>row.event==="world").length,2,"unchanged generic world must stay suppressed inside the recovery window");
clock+=2500;context.broadcastWorld();
assert.equal(sent.filter(row=>row.event==="world").length,3,"full generic world recovery must still occur periodically");

context.net.roomMode="sizzler-saboteurs";context.window.CCGLostSizzlerSpecialModes.active={type:"sizzler-saboteurs"};
sent.length=0;clock+=1000;
const spy={roomMode:"sizzler-saboteurs",actorId:"P1",player:{id:"P1",x:9,y:7,health:6,maxHealth:6,dir:{x:1,y:0}}};
await context.net.send("v141_spy_position",spy);clock+=85;await context.net.send("v141_spy_position",spy);
assert.equal(sent.filter(row=>row.event==="v141_spy_position").length,1,"unchanged Spy heartbeat must not be transmitted every 85 ms");
clock+=20;await context.net.send("v141_spy_position",{...spy,player:{...spy.player,x:10}});
assert.equal(sent.filter(row=>row.event==="v141_spy_position").length,2,"changed Spy position must transmit immediately");

context.net.roomMode="horde-survivor";context.window.CCGLostSizzlerSpecialModes.active={type:"horde-survivor"};
sent.length=0;clock+=1000;
const horde={roomMode:"horde-survivor",state:{state:"wave",wave:3,score:100,kills:2,playerCount:4,players:[{id:"P1",x:4,y:4,hp:10,status:"active"}],activeEnemies:[{id:"E1",kind:"fighter",x:8,y:8,hp:3,alive:true}]}};
await context.net.send("v133_special_state",horde);clock+=125;await context.net.send("v133_special_state",horde);
assert.equal(sent.filter(row=>row.event==="v133_special_state").length,1,"unchanged Horde authoritative state must not be rebroadcast at the old high idle cadence");
clock+=300;await context.net.send("v133_special_state",horde);
assert.equal(sent.filter(row=>row.event==="v133_special_state").length,2,"Horde state must retain a bounded recovery heartbeat");
clock+=20;await context.net.send("v133_special_state",{...horde,state:{...horde.state,activeEnemies:[{...horde.state.activeEnemies[0],x:9}]}});
assert.equal(sent.filter(row=>row.event==="v133_special_state").length,3,"Horde enemy movement must still publish immediately");

context.playMode="split";context.net.connected=false;context.window.CCGLostSizzlerSpecialModes.active=null;document.body.dataset.specialMode="";
const bulletsBefore=bullets.length,enemyBulletsBefore=enemyBullets.length,removed=api.trimVisuals();
assert.ok(removed>0,"global performance layer must discard excess purely visual transients");
assert.ok(particles.length<=320&&rings.length<=80&&floaters.length<=96,"Split Screen must receive bounded visual-effect budgets");
assert.equal(bullets.length,bulletsBefore,"player projectile simulation must remain untouched");
assert.equal(enemyBullets.length,enemyBulletsBefore,"enemy projectile simulation must remain untouched");

const diagnostics=api.getDiagnostics();
assert.ok(diagnostics.playerPacketsSuppressed>=1,"diagnostics must expose suppressed player traffic");
assert.ok(diagnostics.worldPacketsSuppressed>=1,"diagnostics must expose suppressed world traffic");
assert.ok(diagnostics.visualItemsRemoved>0,"diagnostics must expose visual transient reductions");

console.log("Lost Sizzler V10.41 r37 global network/FPS performance regressions passed.");
