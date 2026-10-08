import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const read=path=>fs.readFileSync(path,"utf8");
const game="arcade/lost-sizzler/";
const overrides=read(game+"js/asset-overrides.js");
const intro=overrides.split("/* Every enhancement URL inherits")[0];
assert.equal(overrides.split("if(window.CCGDungeonCarnageItchPackage===true)").length,2,
  "Offline-only override must be unique");
const moods={
  normal:"exploration.wav",danger:"danger.wav",sanctuary:"sanctuary.wav",
  named:"named-enemy.wav",stalker:"count-loadula.wav"
};
function catalogue(offline){
  const context={window:{CCGDungeonCarnageItchPackage:offline}};
  vm.createContext(context);
  vm.runInContext(intro,context);
  return context.window.CCG_ASSET_OVERRIDES.audio.music;
}
const local=catalogue(true),live=catalogue(false);
for(const [mood,file] of Object.entries(moods)){
  const expected="assets/audio/music/"+file;
  assert.deepEqual([...local.playlists[mood]],[expected],
    "Offline music must select the local track for "+mood);
  assert.equal(local[mood==="normal"?"exploration":mood],expected);
  assert.ok(fs.statSync(game+expected).size>10000,"Missing offline track: "+file);
  assert.match(live.playlists[mood][0],/\.supabase\.co\//,
    "Existing production soundtrack should not be overwritten");
}
console.log("R119 offline music: five bundled moods, production unaffected: PASS");

const ai=read(game+"js/ai.js");
const event=ai.indexOf('if(kind(e)==="treasure"){');
const goblinStep=ai.slice(event,ai.indexOf("\n    if(seen){",event));
assert.ok(event>=0);
assert.ok(goblinStep.indexOf("if(seen&&!e.treasureGoblinSpotted)")>=0);
assert.ok(goblinStep.indexOf("if(e.treasureGoblinSpotted){")>=0);
assert.ok(goblinStep.indexOf("e.escapeMs=")>goblinStep.indexOf("if(e.treasureGoblinSpotted){"));
assert.ok(goblinStep.includes("TREASURE GOBLIN SPOTTED"));
assert.ok(goblinStep.includes("TREASURE GOBLIN ESCAPED"));
console.log("R119 treasure goblin sight-triggered escape clock: PASS");

const runtime=read(game+"js/game-local-runtime.js");
assert.ok(runtime.includes("goblinEvent||Boolean(source"),
  "Goblin escape message must not be hidden by distance");
const start=runtime.indexOf("function damageEnemy(");
const end=runtime.indexOf("function onFX(",start);
assert.ok(start>=0&&end>start);
const localDamage=runtime.slice(start,end);
const items=[],calls=[],knock=[];
const enemy={id:"treasure-goblin",x:13,y:17,kind:"treasure",hp:1,maxHp:4,alive:true,treasureGoblin:true,armor:0};
const player={id:"p1",x:12,y:17,health:10,maxHealth:10,weapon:{}};
const sandbox={
  host:{items,enemies:[enemy],revision:0},
  run:{floor:9,stats:{kills:0}},p1:player,world:{},score:0,stats:{},Date,Math,
  P:{purple:"#505",blue:"#55f",orange:"#f80",cyan:"#0ff",white:"#fff",pink:"#f9f",gold:"#ff0",red:"#f00"},
  C:{enemy:{hitStunMs:1000},keyTarget:3},explored:new Map([["p1",new Set()]]),
  S:{sfx:()=>{}},elementalDamage:(e,p)=>p,isDeathStalkerEnemy:()=>false,
  recordEnemyDefeat:()=>{},awardXP:()=>{},onFX:()=>{},burst:()=>{},ring:()=>{},floatText:()=>{},
  knockEnemyAway:(e)=>{knock.push(true);e.x++},
  showToast:(...args)=>calls.push(args),updateQuests:()=>{},recoverBridgeThiefStash:()=>{},
  SYS:{updateObjective:()=>{},sigilDefendersAlive:()=>[]},
  PGR:{lootForChest:()=>({kind:"artefact",rarity:"GOLD MEDAL",name:"Gold Medal Artefact"}),roomCompletion:()=>0},
  window:{CCGLostSizzlerV141LandingNotificationPolish:{showMajor:(...args)=>{calls.push(args);return true}}}
};
vm.createContext(sandbox);
vm.runInContext(localDamage,sandbox);
sandbox.damageEnemy(enemy,3,"energy",player);
assert.equal(enemy.alive,false);
assert.equal(enemy.treasureGoblinDefeated,true);
assert.equal(items.length,1);
assert.equal(items[0].x,13);
assert.equal(items[0].y,17);
assert.equal(items[0].loot.name,"Gold Medal Artefact");
assert.equal(knock.length,0,"Fatal hit must not knock loot away");
assert.ok(calls.some(row=>row[0]==="TREASURE GOBLIN CAUGHT"));
console.log("R119 treasure goblin kill: one accessible drop and major alert: PASS");
