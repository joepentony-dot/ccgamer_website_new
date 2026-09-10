import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../js/v10-42-warden-navigation-cues.js",import.meta.url),"utf8");
const run={floor:2,v142WardenFloors:{"2":{floor:2,available:true,resolved:false,cacheFragmentAwarded:false}}};
const player={x:2,y:2};
let world={rooms:[null,{id:1,x:10,y:10,w:8,h:8}],map:[]};
let host={v142WardenDomain:{floor:2,roomId:1,profileName:"IRON SURGE",active:true,cleansed:false,inside:false},enemies:[],chests:[]};
let baseRadarCalls=0;
const drawCalls=[];
const ctx=new Proxy({save(){},restore(){},beginPath(){},closePath(){},moveTo(){},lineTo(){},fill(){},stroke(){},fillRect(){},strokeRect(){},arc(){}},{set(target,key,value){target[key]=value;return true}});
const canvas={width:320,height:160,getBoundingClientRect:()=>({width:320,height:160}),getContext:()=>ctx};
const context={
  console,window:{},run,host,world,p1:player,
  document:{getElementById:id=>id==="radar-canvas"?canvas:null},
  renderRadarPanel:p=>{baseRadarCalls++;drawCalls.push({x:p.x,y:p.y});return"BASE RADAR"}
};
context.window.CCG_CONFIG={maxFloors:5,worldWidth:80,worldHeight:60};
context.window.CCGWorld={roomAt:(w,x,y)=>{const room=w?.rooms?.[1];return room&&x>=room.x&&x<=room.x+room.w&&y>=room.y&&y<=room.y+room.h?1:-1}};
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-42-warden-navigation-cues.js"});

const api=context.window.CCGLostSizzlerV142WardenNavigationCues;
assert.ok(api,"Warden navigation cue API should install");
assert.deepEqual([...api.markerState(player,run,host,world)],[],"An undiscovered corruption domain must not be revealed on radar");
assert.equal(run.v142WardenFloors["2"].domainDiscovered,undefined,"Knowledge should not be granted while the player is outside the corruption room");

player.x=12;player.y=13;
let markers=api.markerState(player,run,host,world);
assert.equal(run.v142WardenFloors["2"].domainDiscovered,true,"Entering the corruption room should persist earned domain knowledge");
assert.equal(markers.filter(m=>m.kind==="corruption").length,1,"A discovered active corruption domain should appear on radar");
assert.deepEqual({...markers.find(m=>m.kind==="corruption")},{kind:"corruption",x:14,y:14,label:"IRON SURGE",roomId:1},"Corruption marker should use the corrupted room centre");

player.x=3;player.y=3;
host={v142WardenDomain:{floor:2,roomId:1,profileName:"IRON SURGE",active:true,cleansed:false,inside:false},enemies:[],chests:[]};
context.host=host;
world={rooms:[null,{id:1,x:10,y:10,w:8,h:8}],map:[]};
context.world=world;
markers=api.markerState(player,run,host,world);
assert.equal(markers.filter(m=>m.kind==="corruption").length,1,"Persisted domain knowledge should survive a same-floor host/world rebuild after the player leaves the room");

host.v142WardenDomain.active=false;host.v142WardenDomain.cleansed=true;
host.v142WardenCheckpoint={active:true,floor:2,x:15,y:14,roomId:1};
markers=api.markerState(player,run,host,world);
assert.equal(markers.some(m=>m.kind==="corruption"),false,"Cleansing the domain should remove the corruption radar marker");
assert.deepEqual({...markers.find(m=>m.kind==="refuge")},{kind:"refuge",x:15,y:14,label:"CLEANSED REFUGE",roomId:1},"A cleansed recovery anchor should become a known refuge marker");

host.chests=[{id:"warden-cache",x:16,y:14,roomId:1,active:true,v142WardenCache:true}];
markers=api.markerState(player,run,host,world);
assert.equal(markers.some(m=>m.kind==="cache"),true,"An unclaimed spawned Warden Cache should be marked because the player created it by winning the fight");
host.chests[0].active=false;
markers=api.markerState(player,run,host,world);
assert.equal(markers.some(m=>m.kind==="cache"),false,"Opening the Warden Cache should remove its radar marker");

host.enemies=[{id:"sealed-warden",x:20,y:20,alive:true,deathStalker:true,v142WardBroken:false}];
markers=api.markerState(player,run,host,world);
assert.equal(markers.some(m=>m.kind==="broken-warden"),false,"A sealed unengaged Warden must not be globally revealed on radar");
host.enemies[0].v142WardBroken=true;
markers=api.markerState(player,run,host,world);
assert.deepEqual({...markers.find(m=>m.kind==="broken-warden")},{kind:"broken-warden",x:20,y:20,label:"WARD BROKEN"},"Breaking a Warden's ward should make the active combat target trackable");
host.enemies[0].v142WardenDefeated=true;
markers=api.markerState(player,run,host,world);
assert.equal(markers.some(m=>m.kind==="broken-warden"),false,"A defeated Warden should no longer be tracked as an active fight");

host.enemies=[];
host.stalker={x:22,y:22,awake:true,v142WardBroken:false,v142WardenDefeated:false};
markers=api.markerState(player,run,host,world);
assert.equal(markers.some(m=>m.kind==="broken-warden"),false,"A sealed Count Loadula must remain hidden until Ward Break engages it");
host.stalker.v142WardBroken=true;
markers=api.markerState(player,run,host,world);
assert.equal(markers.some(m=>m.kind==="broken-warden"),true,"An actively Ward-Broken Count Loadula should be trackable");

const baseResult=context.renderRadarPanel(player);
assert.equal(baseResult,"BASE RADAR","The navigation wrapper must preserve the underlying radar renderer's return value");
assert.equal(baseRadarCalls,1,"The navigation wrapper must call the underlying radar renderer exactly once");
assert.equal(drawCalls.length,1,"Base radar invocation should remain intact");

run.floor=3;
run.v142WardenFloors["3"]={floor:3,available:false,noWarden:true};
host={v142WardenDomain:null,enemies:[],chests:[]};context.host=host;
markers=api.markerState(player,run,host,world);
assert.deepEqual([...markers],[],"A floor without Warden knowledge or Warden objects should add no navigation markers");

console.log("PASS v10-42 earned Warden radar navigation cues contract");
