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
assert.match(goblinStep,/Number\.isFinite\(e\.escapeMs\)\?e\.escapeMs:22000/,"Escape clock must not reset when it reaches exactly zero");
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

// Exercise actual generated Goblins and their real AI selection/countdown,
// including leaving the room neighbourhood after the first sighting.
const generated={window:{},console,Math,Date,performance};
vm.createContext(generated);
for(const file of ["config.js","progression.js","world.js","systems.js","ai.js"]){
  vm.runInContext(read(game+"js/"+file),generated,{filename:file});
}
const {CCGWorld:W,CCGSystems:SYS,CCGAI:AI}=generated.window;
let goblinCases=0;
for(const floor of [1,9,15])for(let trial=0;trial<3;trial++){
  const seed=`ccg-r133-goblin-${floor}-${trial}`,world=W.generate(seed),host=W.createHostState(world);
  SYS.decorate(world,host,{floor,seed,stats:{}});
  const goblin=host.enemies.find(enemy=>enemy.treasureGoblin);
  const defeatCandidate={...goblin};
  const ordinary=host.enemies.find(enemy=>!enemy.treasureGoblin&&!enemy.follower&&!enemy.guardian);
  assert.ok(goblin,`${seed}: generated floor must retain its Treasure Goblin`);
  const near=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:goblin.x+dx,y:goblin.y+dy})).find(p=>W.walkable(world.map,p.x,p.y,host));
  assert.ok(near,`${seed}: generated Goblin must be reachable`);
  const player={id:"goblin-acceptance",...near,health:8,torchMs:0,dir:{x:1,y:0}},notices=[];
  const hooks={notice:(...args)=>notices.push(args)};
  // Isolate this generated actor from unrelated combat without changing its
  // authored fields, placement, timer or the real AI implementation.
  host.enemies=[goblin];
  const far=world.rooms.map(room=>({x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.h/2)})).find(p=>Math.hypot(p.x-goblin.x,p.y-goblin.y)>40&&!AI.simulationEligibleForTest(goblin,world,[{...player,...p}],AI.simulationRoomsForPlayersForTest(world,[p])));
  assert.ok(far,`${seed}: distant room outside the unseen Goblin's active neighbourhood required`);
  Object.assign(player,far);
  for(let tick=0;tick<240;tick++)AI.stepEnemies(host,world.map,[player],100,hooks,world);
  assert.equal(goblin.escapeMs,22000,"unseen offscreen Goblin must retain its untouched escape clock");
  assert.equal(goblin.treasureGoblinSpotted,undefined);
  Object.assign(player,near);
  AI.stepEnemies(host,world.map,[player],100,hooks,world);
  assert.equal(goblin.treasureGoblinSpotted,true,"actual sighting must start the escape countdown");
  assert.equal(goblin.escapeMs,21900);
  Object.assign(player,far);
  // A crowded active room must not quantize this one-shot timer by the ordinary
  // enemy stride. These ordinary fixtures exercise the real crowd scheduler.
  assert.ok(ordinary);
  host.enemies.push(...Array.from({length:30},(_,index)=>({...ordinary,id:`crowd-${index}`,x:far.x,y:far.y,alive:true,attackCooldown:999999})));
  for(let tick=0;tick<218;tick++)AI.stepEnemies(host,world.map,[player],100,hooks,world);
  assert.equal(AI.getSimulationDiagnostics().crowdStride,3,"escape must be tested under real crowded-AI scheduling");
  assert.equal(goblin.alive,true,"Goblin must not escape before its full authored countdown");
  assert.equal(goblin.escapeMs,100,"spotted offscreen Goblin must keep counting while the player is elsewhere");
  AI.stepEnemies(host,world.map,[player],100,hooks,world);
  assert.equal(goblin.alive,false);assert.equal(goblin.treasureGoblinEscaped,true);
  for(let tick=0;tick<20;tick++)AI.stepEnemies(host,world.map,[player],100,hooks,world);
  assert.equal(notices.filter(args=>args[0].includes("SPOTTED")).length,1);
  assert.equal(notices.filter(args=>args[0].includes("ESCAPED")).length,1,"escape must announce exactly once");
  assert.equal(goblin.treasureGoblinDefeated,undefined,"escape must not count as a defeat");
  // Defeat another copy of this exact generated actor through the real damage
  // owner. Use the real loot generator with deterministic RNG, not the old
  // single-drop fixture's fixed artefact stub.
  const seededMath=Object.create(Math);
  seededMath.random=generated.window.CCGProgression.seededRandom(seed+"-loot");
  sandbox.Math=seededMath;
  sandbox.PGR=generated.window.CCGProgression;
  sandbox.run={floor,stats:{kills:0}};
  sandbox.host={items:[],enemies:[defeatCandidate],revision:0};
  const killTile={x:defeatCandidate.x,y:defeatCandidate.y};
  sandbox.damageEnemy(defeatCandidate,999,"energy",player);
  assert.equal(defeatCandidate.alive,false);assert.equal(defeatCandidate.treasureGoblinDefeated,true);
  assert.equal(sandbox.host.items.length,1,`${seed}: real generated Goblin defeat must create exactly one loot drop`);
  const drop=sandbox.host.items[0];
  assert.equal(drop.x,killTile.x);assert.equal(drop.y,killTile.y);
  assert.equal(drop.kind,"loot");assert.equal(drop.active,true);
  assert.ok(drop.loot?.kind,"real loot generator must produce a collectable reward");
  assert.ok(W.walkable(world.map,drop.x,drop.y,host),`${seed}: loot must remain on an accessible kill tile`);
  sandbox.damageEnemy(defeatCandidate,999,"energy",player);
  assert.equal(sandbox.host.items.length,1,"repeated damage on the fallen Goblin must not duplicate loot");
  goblinCases++;
}
console.log(`R133 generated Goblin sighting/offscreen escape: ${goblinCases} seeded early/late cases PASS`);
