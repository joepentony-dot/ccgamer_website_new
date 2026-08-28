import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const source=read("js/v10-41-multimode-performance.js");
const loader=read("js/v10-41-lake-item-safety.js");

assert.match(loader,/load\("js\/v10-41-multimode-performance\.js","data-ccg-v141-multimode-performance"\)/,"late runtime chain must load the multimode performance layer");
assert.match(source,/const DUNGEON_LIVE_MS=200/,"Dungeon enemy live state must use a compact 5 Hz stream");
assert.match(source,/const DUNGEON_WORLD_RECOVERY_MS=900/,"large Dungeon world snapshots must be recovery packets rather than the movement stream");
assert.match(source,/const FULL_PLAYER_HEARTBEAT_MS=1200/,"Dungeon compact player packets must retain a full repair heartbeat");
assert.match(source,/const SPY_INPUT_HEARTBEAT_MS=225/,"Spy repeated input must retain a bounded heartbeat");
assert.match(source,/const SPY_LOGIC_MS=33/,"Spy isolated rules work must be capped near 30 Hz");
assert.match(source,/const UI_SYNC_MS=80/,"gameplay DOM/HUD refresh must no longer run at animation-frame cadence");
assert.match(source,/const RADAR_MS=100/,"radar rendering must be capped at 10 Hz");
assert.match(source,/if\(specialType\(\)===SPY\)\{state\.spyRadarSkips\+\+;return false\}/,"hidden Spy radar work must be skipped completely");
assert.match(source,/event==="v141_spy_position"&&connectedSpy\(\)&&payload\?\.player/,"Spy position transport must be compacted without replacing the dedicated transport");
assert.match(source,/event==="v133_special_input"&&connectedSpy\(\)/,"Spy input optimisation must remain specific to Spy");
assert.doesNotMatch(source,/event==="v133_special_input"&&connectedDungeon\(\)/,"Dungeon must not interfere with Spy's special-input protocol");

let clock=1000;
let baseSyncCalls=0,baseRadarCalls=0,spyLogicCalls=0;
const sent=[];
const document={body:{dataset:{runActive:"true",specialMode:""}}};
const net={
  connected:true,isHost:true,roomMode:"dungeon",sessionId:"P1",cb:{onPacket(){}},
  getRoomMode(){return{id:this.roomMode}},
  send(event,payload){sent.push({event,payload});return Promise.resolve("ok")}
};
const context={
  console,Date,Promise,Map,Set,Math,Number,String,Boolean,Array,Object,JSON,
  document,performance:{now:()=>clock},net,playMode:"online",mode:"playing",
  run:{seed:"PERF",floor:1},
  p1:{id:"P1",name:"Host",x:2,y:3,health:8,maxHealth:8,mana:60,maxMana:120,dir:{x:1,y:0},armor:2,bronzeKeys:1,level:3,torchMs:0,rapidMs:0,inventory:[{kind:"potion",qty:1}],weapon:{name:"Large Network Payload"},totalXp:999},
  p2:null,
  host:{revision:1,enemies:[{id:"E1",x:5,y:5,hp:4,maxHp:4,alive:true,aiState:"chase"}],stalker:null},
  sendPlayer(){return net.send("player",{id:"P1",x:2,y:3,inventory:[{kind:"potion"}],weapon:{name:"FULL"},totalXp:999})},
  broadcastWorld(){return net.send("world",{revision:context.host.revision,enemies:context.host.enemies.map(row=>({...row})),large:true})},
  sync(){baseSyncCalls++},
  renderRadarPanel(){baseRadarCalls++;return true},
  setInterval(){return 1},clearInterval(){},addEventListener(){},
};
context.window=context;
context.window.CCGLostSizzlerSpecialModes={active:null};
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-41-multimode-performance.js"});
const api=context.window.CCGLostSizzlerMultimodePerformance;
assert.ok(api?.state?.installed,"multimode performance layer must install against the live globals");

sent.length=0;
context.sendPlayer();
clock+=100;
context.sendPlayer();
const playerPackets=sent.filter(row=>row.event==="player");
assert.equal(playerPackets.length,2,"Dungeon must retain its normal 10 Hz player publication attempts");
assert.ok("inventory" in playerPackets[0].payload,"first Dungeon heartbeat must keep a full player repair packet");
assert.ok(!("inventory" in playerPackets[1].payload),"routine Dungeon movement packet must omit inventory");
assert.ok(!("weapon" in playerPackets[1].payload),"routine Dungeon movement packet must omit weapon structures");
assert.equal(playerPackets[1].payload.bronzeKeys,1,"compact Dungeon player state must retain interaction-critical key count");

sent.length=0;
clock+=1000;
context.broadcastWorld();
clock+=100;
context.broadcastWorld();
assert.equal(sent.filter(row=>row.event==="world").length,1,"unchanged Dungeon world must not resend the large snapshot inside the recovery window");
context.host.revision++;
context.broadcastWorld();
assert.equal(sent.filter(row=>row.event==="world").length,2,"Dungeon revision changes must still force an immediate authoritative snapshot");

sent.length=0;
clock+=250;
assert.equal(api.sendDungeonLive(true),true,"Dungeon host must publish compact enemy live state");
const live=sent.find(row=>row.event===api.DUNGEON_LIVE_PACKET)?.payload;
assert.ok(live,"Dungeon live packet must be emitted");
assert.deepEqual(Object.keys(live.enemies[0]).sort(),["aiState","hp","id","maxHp","x","y"].sort(),"Dungeon live enemy model must stay compact");
context.net.isHost=false;
context.host.enemies[0].x=0;context.host.enemies[0].y=0;
assert.equal(api.applyDungeonLive({...live,enemies:[{...live.enemies[0],x:9,y:7,hp:3}]}),true,"Dungeon guest must consume the compact live packet");
assert.equal(context.host.enemies[0].x,9,"Dungeon live packet must update guest enemy position");
assert.equal(context.host.enemies[0].hp,3,"Dungeon live packet must update guest enemy HP");

context.net.roomMode="sizzler-saboteurs";
context.window.CCGLostSizzlerSpecialModes.active={type:"sizzler-saboteurs"};
context.playMode="online";context.net.isHost=false;
sent.length=0;
clock+=300;
await context.net.send("v141_spy_position",{roomMode:"sizzler-saboteurs",player:{id:"P2",name:"Agent",x:4,y:6,health:5,maxHealth:6,dir:{x:0,y:1},inventory:[{kind:"secret"}],weapon:{huge:true},totalXp:500}});
const spyPosition=sent.find(row=>row.event==="v141_spy_position");
assert.ok(spyPosition,"Spy position heartbeat must remain enabled");
assert.ok(!("inventory" in spyPosition.payload.player),"Spy position heartbeat must not carry inventory");
assert.ok(!("weapon" in spyPosition.payload.player),"Spy position heartbeat must not carry weapon structures");

sent.length=0;
const spyInput={roomMode:"sizzler-saboteurs",actorId:"P2",input:{dx:1,dy:0,fire:false,interact:false,trap:false,extract:false,sentAt:Date.now()}};
clock+=300;await context.net.send("v133_special_input",spyInput);
clock+=75;await context.net.send("v133_special_input",{...spyInput,input:{...spyInput.input,sentAt:Date.now()+1}});
clock+=75;await context.net.send("v133_special_input",{...spyInput,input:{...spyInput.input,dx:0,sentAt:Date.now()+2}});
assert.equal(sent.filter(row=>row.event==="v133_special_input").length,2,"Spy must suppress only unchanged repeated input while sending control changes immediately");

context.playMode="split";context.net.connected=false;context.window.CCGLostSizzlerSpecialModes.active=null;document.body.dataset.specialMode="";context.p2={id:"P2"};
baseSyncCalls=0;clock+=500;context.sync();clock+=20;context.sync();clock+=80;context.sync();
assert.equal(baseSyncCalls,2,"Split/shared HUD work must be throttled instead of running every frame");
assert.ok(api.state.splitSyncSkips>=1,"Split HUD throttle must record skipped frame-cadence DOM work");

baseRadarCalls=0;clock+=500;context.renderRadarPanel(context.p1);clock+=20;context.renderRadarPanel(context.p1);clock+=100;context.renderRadarPanel(context.p1);
assert.equal(baseRadarCalls,2,"radar must render at its lower refresh cadence");
context.window.CCGLostSizzlerSpecialModes.active={type:"sizzler-saboteurs"};document.body.dataset.specialMode="sizzler-saboteurs";
clock+=200;context.renderRadarPanel(context.p1);
assert.equal(baseRadarCalls,2,"Spy must not spend time drawing the hidden radar");

context.playMode="online";context.net.connected=true;context.net.roomMode="sizzler-saboteurs";
const spyOriginal=function(){spyLogicCalls++;return true};
context.window.CCGLostSizzlerV141R29SpyEngine={isolatedUpdate:spyOriginal};
context.window.CCGLostSizzlerModeRuntime={runtimes:{"sizzler-saboteurs":{update:spyOriginal}}};
api.install();
assert.notEqual(context.window.CCGLostSizzlerV141R29SpyEngine.isolatedUpdate,spyOriginal,"Spy isolated rules loop must gain its performance governor");
spyLogicCalls=0;clock+=500;context.window.CCGLostSizzlerV141R29SpyEngine.isolatedUpdate();clock+=10;context.window.CCGLostSizzlerV141R29SpyEngine.isolatedUpdate();clock+=33;context.window.CCGLostSizzlerV141R29SpyEngine.isolatedUpdate();
assert.equal(spyLogicCalls,2,"Spy isolated rules work must run near 30 Hz rather than every animation frame");

console.log("Lost Sizzler V10.41 Dungeon, Spy, Split Screen and shared performance regressions passed.");
