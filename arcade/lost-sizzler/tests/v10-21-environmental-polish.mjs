import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), "utf8");

const env = read("js/v10-21-environmental-polish.js");
const loader = read("js/asset-overrides.js");
const onboarding = read("js/v10-20-onboarding-safety.js");
const changelog = read("js/v10-18-expansion-changelog.js");

assert.match(env, /const PIT_RUN_CHANCE=\.04;/, "Vortex pits must remain very rare");
assert.match(env, /const PIT_MIN_FLOOR=3;/, "Vortex pits must not appear in the opening floors");
assert.match(env, /designatedPitFloor/, "Pit floor selection must be deterministic per run seed");
assert.match(env, /target!==floor/, "Only the designated deep floor may receive a real vortex");
assert.match(env, /routeExistsAvoiding\(\[q\]\)/, "Pit placement must preserve a start-to-exit route");
assert.match(env, /room\.id!==world\.startRoomId/, "Start room must be excluded from real pit placement");
assert.match(env, /training:true,harmless:true/, "Tutorial must use a harmless demonstration vortex");
assert.match(env, /const PIT_PLAYER_DAMAGE=1;/, "A real vortex must deal exactly 1 HP of direct damage");
assert.match(env, /pit\(\)\?\.training&&tutorialActive\(\)/, "A training vortex must only be harmless while the tutorial is active");
assert.match(env, /hurtPlayer\(player,PIT_PLAYER_DAMAGE,false,"vortex pit"\)/, "A normal-mode vortex must damage the player");
assert.match(env, /player\.x=q\.x;player\.y=q\.y;player\.rx=q\.x;player\.ry=q\.y/, "A normal-mode vortex must knock the player onto a safe cell");
assert.match(env, /HAZARDS &amp; RARE VORTEX PITS/, "Tutorial must explain rare vortex pits");
assert.match(env, /Enemies normally avoid floor traps and vortex pits/, "Tutorial must explain hazard avoidance and knockback");
assert.match(env, /window\.CCGAI\.stepEnemies=function stepEnemiesV121HazardAvoidance/, "Enemy AI must treat static hazards as undesirable path cells");
assert.match(env, /resolveForcedHazard\(enemy,from\|\|p1,origin\)/, "Forced knockback must resolve environmental hazards");
assert.match(env, /damageEnemy\(enemy,Math\.max\(9999/, "Vortex knock-ins must be lethal to ordinary enemies through normal defeat handling");
assert.match(env, /TRAP_ENEMY_DAMAGE/, "Knocked enemies must take trap/hazard damage");
assert.match(env, /VORTEX REJECTED/, "Indestructible Death Stalkers must not bypass their special defeat rule through pits");
assert.match(env, /repairDoorFrames/, "Door geometry repair must be installed");
assert.match(env, /world\.doorFrameCells/, "Door supports must be tracked");
assert.match(env, /routeExistsAvoiding\(\[\]\)/, "Door-frame repair must be reverted if it breaks traversal");
assert.match(env, /VORTEX PIT AHEAD/, "Players must receive a warning before a nearby real pit");
assert.match(env, /drawVortex/, "Vortex must have a dedicated animated visual");
assert.match(env, /S\.sfx\("warp"\)/, "Vortex must have a distinctive sound layer");
assert.match(env, /doorDust/, "Heavy/special doors must receive extra environmental visual feedback");
assert.match(loader, /v10-21-environmental-polish\.js/, "Environmental polish module must be loaded by the game");
assert.match(changelog, /Rare vortex pits/, "Developer changelog must record the vortex/hazard pass");
assert.match(onboarding, /Training Archive/, "Existing tutorial must remain present");

console.log("V10.21 door geometry, rare vortex, hazard knockback and tutorial regression checks passed");

// Execute the real knockback -> environmental hazard -> recursive damage path.
// A lethal outer hit still has an alive actor during knockback; its nested
// hazard can finish the death first. Only that death may award the dossier.
function hazardDefeat({hp=1,power=10,active=true,vortex=false,stalker=false}={}){
  const storage=new Map(),scheduled=[],effects=[];
  const context={window:{addEventListener(){},CCGQueueEnemyDefeatVisual:fx=>effects.push(fx)},console,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    performance:{now:()=>1000},setInterval:()=>1,clearInterval(){},setTimeout:(fn,ms)=>scheduled.push({fn,ms}),
    mode:"playing",score:0,shake:0,stats:{elites:0},OVERRIDES:{images:{}},explored:new Map(),
    P:{purple:"purple",gold:"gold",orange:"orange",blue:"blue",cyan:"cyan",white:"white",pink:"pink"},
    S:{sfx(){}},showToast(){},floatText(){},burst(){},ring(){},onFX:fx=>effects.push(fx),updateQuests(){},
    awardXP:(p,xp)=>{p.totalXp=(p.totalXp||0)+xp}
  };
  vm.createContext(context);
  for(const name of ["config","world","progression","systems"])vm.runInContext(read(`js/${name}.js`),context,{filename:`${name}.js`});
  Object.assign(context,{C:context.window.CCG_CONFIG,W:context.window.CCGWorld,PGR:context.window.CCGProgression,SYS:context.window.CCGSystems});
  const follower={...context.C.followerElites[0]};
  const enemy={id:"hazard-target",x:5,y:5,hp,maxHp:hp,kind:"guard",alive:true,...(stalker?{deathStalker:true,voidStalker:true}:{follower})};
  context.p1={id:"p1",x:4,y:5,totalXp:0,inventory:[],inventorySlots:3};context.localPlayers=()=>[context.p1];
  context.world={rooms:[{id:0,x:1,y:1,w:10,h:10}],map:Array.from({length:13},()=>Array(13).fill(0))};
  context.run={floor:4,elapsed:0,stats:{kills:0},namedDossierAutoShown:false};
  context.host={enemies:[enemy],items:[],blockingDecor:[],doors:[],traps:[{x:6,y:5,active,kind:"spike",period:5000,phase:0}],
    rareVortexPit:vortex?{training:false,cells:[{x:6,y:5}]}:null,revision:0};
  const gameplay=read("js/game-play.js");
  vm.runInContext(gameplay.slice(0,gameplay.indexOf("function knockPlayerAway")),context,{filename:"game-play.js::knockEnemyAway"});
  vm.runInContext(read("js/game-local-runtime.js"),context,{filename:"game-local-runtime.js"});
  vm.runInContext(env,context,{filename:"v10-21-environmental-polish.js"});
  assert.equal(context.window.CCGLostSizzlerEnvironmentalV121.state.installed.knock,true);
  context.damageEnemy(enemy,power,"energy",context.p1);
  return{context,enemy,follower,scheduled,effects};
}
for(const scenario of [{},{hp:3,power:1},{vortex:true}]){
  const {context:c,enemy,follower,scheduled,effects}=hazardDefeat(scenario);
  assert.equal(enemy.alive,false,"Lethal combat or its knockback hazard must permanently defeat the target");
  assert.equal(c.run.stats.kills,1,"Recursive hazard death must be recorded exactly once");
  assert.equal(c.run.stats.namedDefeats,1);
  assert.equal(c.PGR.readDossier()[follower.name].defeats,1,"First named defeat must persist exactly once");
  assert.equal(c.run.enemyDefeats[0].count,1);
  assert.equal(c.score,500);assert.equal(c.p1.totalXp,250);
  assert.equal(c.host.items.filter(item=>item.id.startsWith("named-loot-")).length,1);
  assert.equal(effects.length,1,"Death visual must not be emitted twice");
  assert.equal(scheduled.filter(timer=>timer.ms===320).length,1,"The one-time dossier opening must be scheduled once");
  c.damageEnemy(enemy,10,"energy",c.p1);
  assert.equal(c.run.stats.kills,1,"Hitting a defeated actor again cannot award another death");
  assert.equal(c.PGR.readDossier()[follower.name].defeats,1);
}
const ordinary=hazardDefeat({active:false});
assert.equal(ordinary.context.run.stats.kills,1,"Ordinary lethal hit must retain its normal death owner");
const survivor=hazardDefeat({hp:10,power:1});
assert.equal(survivor.enemy.hp,7,"Nonlethal hit plus active hazard retains both damage contributions");
assert.equal(survivor.enemy.alive,true);assert.equal(survivor.context.run.stats.kills,0);
assert.equal(survivor.context.PGR.readDossier()[survivor.follower.name],undefined);
const immune=hazardDefeat({stalker:true,vortex:true});
assert.equal(immune.enemy.alive,true);assert.equal(immune.context.run.stats.kills,0,"Vortex cannot bypass a Death Stalker's ward");
console.log("PASS real-source recursive hazard death: exact-once dossier/score/XP/loot, nonlethal damage and Stalker immunity");
