import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../../..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const configSource=read("arcade/lost-sizzler/js/config.js");
const worldSource=read("arcade/lost-sizzler/js/world.js");
const campaignSource=read("arcade/lost-sizzler/js/v10-42-five-depth-campaign.js");
const balanceSource=read("arcade/lost-sizzler/js/v10-42-floor-balance.js");
const gameplaySource=read("arcade/lost-sizzler/js/game-play.js");
const localRuntimeSource=read("arcade/lost-sizzler/js/game-local-runtime.js");
const systemsSource=read("arcade/lost-sizzler/js/systems.js");
const coreSource=read("arcade/lost-sizzler/js/game-core.js");
const renderSource=read("arcade/lost-sizzler/js/game-render.js");
const floorTrials=read("arcade/lost-sizzler/js/v10-42-r115-floor-trials.js");
const bootstrap=read("arcade/lost-sizzler/js/v10-42-bootstrap.js");
const canonical=read("arcade/lost-sizzler/index.html");
const alias=read("arcade/c64-dungeon-carnage/index.html");

const sandbox={window:{}};
vm.runInNewContext(configSource,sandbox,{filename:"config.js"});
const C=sandbox.window.CCG_CONFIG;
const floors=C.proceduralDungeon.campaignFloors;

assert.equal(C.maxFloors,15,"campaign must finish on Floor 15");
assert.equal(C.floors.length,15,"base floor metadata must cover all fifteen floors");
assert.equal(floors.length,15,"procedural campaign profiles must cover all fifteen floors");
assert.equal(C.levelCaps.length,15,"RPG level caps must cover all fifteen floors");
assert.equal(C.levelCaps.at(-1),75,"Floor 15 RPG level cap must allow the extended campaign to keep progressing");
assert.equal(new Set(floors.map(row=>row.theme)).size,15,"all fifteen floors must have distinct primary themes");
assert.ok(floors.every(row=>row.challenge&&row.challengeTitle&&row.challengeDesc),"every campaign floor must define a featured challenge with player-facing guidance");
assert.equal(floors[1].challenge,"bloodClue","Floor 2 must teach the cross-floor blood clue rather than duplicate its generator objective");
assert.equal(floors[2].challenge,"memory5","Floor 3 must feature the five-pad Memory Vault");
assert.equal(floors[3].challenge,"torch4","Floor 4 must feature the clue-driven torch sequence");
assert.equal(floors[4].challenge,"bridge","Floor 5 must feature the Trickster bridge recovery quest");
assert.equal(floors[11].challenge,"memory7","Floor 12 must feature the seven-pad Memory Vault");
assert.equal(floors[13].challenge,"surveyTimed","Floor 14 must require exploration and the timed chamber without the cancelled arena");
assert.equal(floors[14].challenge,"boss","Floor 15 must culminate in the grotesque boss challenge");
assert.match(coreSource,/function floorChallengeComplete\(spec,explorePct=0\)/,"featured floor challenges must have one derived completion owner");
assert.match(coreSource,/r114-floor-challenge-cache-f/,"featured floor challenges must create a high-tier reward cache");
assert.match(coreSource,/FLOOR CHALLENGE COMPLETE/,"featured floor challenges must announce completion and reward");

assert.equal(floors[0].theme,"C64_ARCHIVE","Floor 1 must retain the neutral opening archive identity");
assert.equal(floors[14].theme,"BLOOD_CITADEL","Floor 15 must end in the danger-red Blood Citadel");
assert.match(worldSource,/BLOOD_CITADEL:\{name:"Blood Citadel",floor:"#24090d"/,"world palette must define the authored danger-red final theme");
assert.match(campaignSource,/function applyFloorTheme\(/,"campaign must actively apply each floor's primary theme to generated rooms");
assert.match(campaignSource,/floor===CFG\.maxFloors/,"final Sigil ownership must follow the configured maximum floor rather than hard-coded Floor 5");
assert.match(campaignSource,/let boss=floor===CFG\.maxFloors\?\(hostState\.guardian\|\|\(hostState\.enemies\|\|\[\]\)\.find\(e=>e\?\.guardian&&!e\.keyGuardian\)\):null/,"Floor 15 grotesque boss must reuse the canonical final guardian instead of creating a competing completion owner");
assert.match(campaignSource,/if\(floor===CFG\.maxFloors&&boss\)\{[\s\S]*?bossCell\(worldState,hostState,room\);boss\.x=q\.x;boss\.y=q\.y;boss\.rx=q\.x;boss\.ry=q\.y/,"the reused Floor 15 guardian must be placed inside the authored boss arena");
assert.match(campaignSource,/hostState\.r114BossFight=\{floor,roomId:room\.id,bossId:boss\.id/,"boss-fight state must reference that same guardian identity");
assert.match(gameplaySource,/The Blood Citadel's final keeper is down\. Finish the Sigil route and escape\./,"Floor 15 boss completion must hand progression back to the Sigil route rather than bypass it");
assert.match(balanceSource,/floor===C\.maxFloors&&named/,"final named-enemy tuning must move with the configured final floor");
assert.deepEqual(Array.from(C.proceduralDungeon.keyDomains,row=>Number(row.floor)),[3,7,11],"Iron, Bone and Ash must be spaced across the longer campaign");
assert.equal(C.proceduralDungeon.pickupDistribution.length,15,"A-Z collectible distribution must cover all fifteen floors");
assert.equal(C.proceduralDungeon.pickupDistribution.reduce((sum,n)=>sum+n,0),26,"A-Z collectible campaign must still contain exactly 26 slots");
assert.match(gameplaySource,/function triggerSequenceTorch\(p,deliberate=false\)[\s\S]*!deliberate/,"Floor 4 torch sequence must accept only deliberate player movement");
assert.match(gameplaySource,/isLocal=localPlayers\(\)\.some/,"torch input must verify a real local player owns the step");
assert.doesNotMatch(gameplaySource,/puzzleTorch[\s\S]{0,240}activateSequenceTorch/,"player projectiles must never activate sequence torches");
assert.match(gameplaySource,/punishmentAlive=.*torch-fail-/,"torch puzzle failure punishment must be capped while an existing punishment enemy is alive");
assert.match(gameplaySource,/TORCH SEQUENCE PUZZLE[\s\S]*Only your footsteps count/,"entering the torch room must explain the player-only interaction");
assert.match(renderSource,/TORCH — \$\{lit\?"LIT":"STEP ON"\}/,"torch labels must instruct STEP ON rather than shooting");
assert.match(systemsSource,/weightBridgeSwitch:true/,"the far side of the trick bridge must contain a dedicated shoot-only rebuild switch");
assert.match(systemsSource,/r114TrickTreatReward\s*=\s*true|r114TrickTreatReward\s*:\s*true/,"the far side bridge cache must be marked as the upgraded Trickster reward");
assert.match(gameplaySource,/function bridgeStashedItems\(b\)/,"bridge collapse must own the dropped-stash theft transaction");
assert.match(gameplaySource,/bridgeThief:true/,"crossing the bridge must create a distinct Dungeon Thief target");
assert.match(gameplaySource,/function ensureBridgeSwitchAmmo\(p,b\)[\s\S]*bridge-emergency-weapon[\s\S]*bridge-emergency-ammo/,"the far-side switch must provide both firearm and ammo failsafes when needed");
assert.match(gameplaySource,/TRICK! THE BRIDGE COLLAPSES/,"successful empty-handed crossing must trigger the trick rather than stabilising the old bridge");
assert.match(gameplaySource,/BRIDGE SWITCH — SHOOT IT/,"the rebuild mechanism must explain that it is a projectile switch");
assert.match(localRuntimeSource,/function recoverBridgeThiefStash\(e,attacker=p1\)/,"the thief kill path must own stolen-item recovery");
assert.match(localRuntimeSource,/PGR\.inventoryCanAdd\(holder,item\)&&PGR\.inventoryAdd\(holder,item\)/,"recovered stolen items must return through canonical inventory stack rules");
assert.match(localRuntimeSource,/bridgeRecovered:true/,"overflow stolen stacks must be dropped safely at the defeated thief instead of being deleted");
assert.match(localRuntimeSource,/if\(e\.bridgeThief\)recoverBridgeThiefStash/,"defeating the Dungeon Thief must actually execute the recovery transaction");
assert.match(coreSource,/TRICKSTER BRIDGE — Find and kill the Dungeon Thief/,"the quest panel must explicitly direct the player to recover the stolen stash");
assert.match(renderSource,/BRIDGE COLLAPSED — SHOOT THE SWITCH/,"collapsed bridge state must be visible in-world");
assert.match(renderSource,/BRIDGE RESTORED — HUNT THE THIEF/,"rebuilt bridge state must lead the player into the thief hunt");
assert.match(bootstrap,/v10-42-r115-floor-trials\.js","CCGLostSizzlerV142R115FloorTrials"/,"R115 floor trials must load through the ordered canonical bootstrap");
for(const [floor,id] of [[6,"tape-relays"],[7,"crypt-braziers"],[8,"undercroft-lockdown"],[9,"timed-lockdown"],[11,"coolant-valves"],[13,"high-score-hunt"],[14,"crt-sequence"]]){
  assert.match(floorTrials,new RegExp(`${floor}:Object\\.freeze\\(\\{id:"${id}"`),`Floor ${floor} must own its distinct R115 trial identity`)
}
assert.match(floorTrials,/target:10/,"Floor 7 crypt trial must require all ten braziers");
assert.match(floorTrials,/!W\.walkable\(worldState\.map,x,y,hostState\)/,"mandatory trial nodes must reject canonically unwalkable cells, including blocking decor");
assert.match(floorTrials,/addSupplies\(worldState,hostState,runState,"torch",4,"crypt-torch"\)/,"the ten-brazier trial must guarantee enough trial torches to avoid a resource softlock");
assert.match(floorTrials,/addSupplies\(worldState,hostState,runState,"ammo",2,"coolant-ammo"\)/,"the coolant-valve trial must provide emergency ammunition");
assert.match(floorTrials,/addSupplies\(worldState,hostState,runState,"ammo",2,"crt-ammo"\)/,"the CRT sequence must provide emergency ammunition");
assert.match(floorTrials,/const existing=\(host\.enemies\|\|\[\]\)\.some\(e=>e\.alive&&String\(e\.id\|\|""\)\.startsWith\("crt-sequence-fail-"\)\)/,"CRT wrong-order punishment must detect an existing live guard");
assert.match(floorTrials,/if\(!existing&&typeof spawnPuzzleAmbush==="function"\)spawnPuzzleAmbush\(sw\.roomId,player,1,"crt-sequence-fail"\)/,"CRT wrong-order punishment must spawn only when no live guard exists");
assert.match(floorTrials,/if\(!done\)\{if\(hostState\.objective\)hostState\.objective\.complete=false;hostState\.exitOpen=false;return false\}/,"unfinished required trials must keep the floor exit sealed");
assert.match(floorTrials,/FLOOR TRIAL: \$\{trialText\(hostState\)\}/,"the mission owner must surface live trial progress");
assert.match(floorTrials,/r115TrialReward:true/,"completed authored trials must award a high-tier Trial Cache");
assert.match(floorTrials,/score\+=1000/,"completed authored trials must also award a meaningful score bonus");
assert.match(floorTrials,/ACTIVE TORCH REQUIRED/,"crypt braziers must visually explain the required interaction");
assert.match(floorTrials,/COOLANT VALVE \$\{sw\.r115TrialIndex\+1\} — \$\{sw\.toggled\?"OPEN":"SHOOT"\}/,"coolant valves must visually instruct the player to shoot them");
assert.match(floorTrials,/CRT RELAY \$\{sw\.r115TrialIndex\+1\} — \$\{sw\.toggled\?"CALIBRATED":"SHOOT"\}/,"CRT relays must show their number and interaction");


for(const html of [canonical,alias]){
  assert.match(html,/fifteen procedural floors/i,"public metadata must advertise the fifteen-floor campaign");
  assert.match(html,/15-FLOOR RUN/,"public menu must advertise the fifteen-floor run");
}

// Engine-first acceptance guard: exercise actual world + placement + trial
// modules across every bespoke R115 floor, rather than only matching source.
const generatedRuntime=vm.createContext({window:{},console});
for(const owner of ["config","world","progression","systems","v10-42-r115-floor-trials"]){
  vm.runInContext(read("arcade/lost-sizzler/js/"+owner+".js"),generatedRuntime,{filename:owner+".js"});
}
const generatedWorld=generatedRuntime.window.CCGWorld;
const generatedSystems=generatedRuntime.window.CCGSystems;
let generatedTrialSamples=0;
for(const floor of [6,7,8,9,11,13,14]){
  for(let sample=0;sample<4;sample++){
    const seed="ccg-engine-trial-guard-20261009-"+floor+"-"+sample;
    const world=generatedWorld.generate(seed);
    const host=generatedWorld.createHostState(world);
    generatedSystems.decorate(world,host,{floor,seed,stats:{}});
    const trial=host.floorTrial;
    assert.ok(trial,"A required authored floor trial must not silently disappear: "+seed);
    if([6,7,11,14].includes(floor)){
      assert.equal(trial.nodes.length,trial.target,"Full objective-node count must spawn: "+seed);
      const used=new Set();
      for(const node of trial.nodes){
        const at=node.x+","+node.y;
        assert.ok(!used.has(at),"Trial nodes must never share a cell: "+seed);
        used.add(at);
        assert.ok(generatedWorld.walkable(world.map,node.x,node.y,host),"Trial node must be walkable: "+seed);
        assert.equal(generatedWorld.roomAt(world,node.x,node.y),node.roomId,"Trial room identity must match the map: "+seed);
      }
    }
    if(floor===7)assert.ok(host.items.some(item=>item.r115TrialSupply&&item.kind==="torch"),"Crypt must supply usable torches: "+seed);
    if([11,14].includes(floor))assert.ok(host.items.some(item=>item.r115TrialSupply&&item.kind==="ammo"),"Shoot-only trials require ammo: "+seed);
    if(floor===8){
      assert.equal(host.arenas.length,0,"Cancelled arena must not return on Floor 8: "+seed);
      assert.equal(trial.kind,"undercroft-lockdown","Solo Floor 8 trial must use its dedicated timed lockdown: "+seed);
      assert.ok(host.timedRooms.some(room=>room.id===trial.sourceId),"Floor 8 timed lockdown source must exist: "+seed);
    }
    if(floor===9)assert.ok(host.timedRooms.some(room=>room.id===trial.sourceId),"Timed trial source must exist: "+seed);
    if(floor===13){
      assert.equal(trial.enemyIds.length,trial.target,"Warden hunt must mark every target: "+seed);
      for(const id of trial.enemyIds)assert.ok(host.enemies.some(enemy=>enemy.id===id&&enemy.alive),"Marked Warden must be alive and present: "+seed);
    }
    generatedTrialSamples++;
  }
}
assert.equal(generatedTrialSamples,28,"Exercise all seven authored trial floors across four seeds each.");


// Exercise actual R115 reward placement through its VM owner, not just source text.
const rewardWalk=(m,x,y)=>m[y]?.[x]===0;
function rewardFixture(map,items=[],overrides={}){
  const h={items:items.map(([x,y])=>({x,y,active:true})),
    enemies:[{x:5,y:7,alive:true}],generators:[{x:7,y:5,active:true}],
    chests:[{x:3,y:5,active:true}],switches:[],shrines:[],doors:[],shops:[],revision:0,
    floorTrial:{kind:"tape-relays",floor:6,label:"TAPE RELAYS",progress:4,target:4,lastPos:{x:5,y:5},rewarded:false}};
  Object.assign(h,overrides);
  const ctx=vm.createContext({window:{CCG_CONFIG:{},CCGProgression:{},
    CCGWorld:{walkable:rewardWalk,playerWalkable:rewardWalk,roomAt:()=>0},
    CCGSystems:{decorate(){},updateObjective(){return true},objectiveText(){return ""}}},
    world:{map,rooms:[{id:0,depth:0}]},host:h,p1:{x:5,y:5},score:0,console,
    S:{sfx(){}},showToast(){},updateQuests(){}});
  vm.runInContext(floorTrials,ctx,{filename:"v10-42-r115-floor-trials.js",timeout:3000});
  return{h,ctx,owner:ctx.window.CCGLostSizzlerV142R115FloorTrials}
}
const busyItems=[[6,5],[4,5],[5,6],[5,4],[6,6],[4,4]];
const busyTrial=rewardFixture(Array.from({length:13},()=>Array(13).fill(0)),busyItems);
busyTrial.owner.refreshTrial(busyTrial.h);
const chest=busyTrial.h.chests.find(c=>c.r115TrialReward);
assert.ok(chest,"Six occupied neighbours must still yield a Trial Cache");
assert.ok(chest.x!==5||chest.y!==5,"Trial Cache must not overlap player");
for(const rows of [busyTrial.h.items,busyTrial.h.enemies,busyTrial.h.generators,busyTrial.h.chests.filter(c=>c!==chest)])
  assert.ok(!rows.some(row=>row.x===chest.x&&row.y===chest.y),"Trial cache cannot overlap item, enemy, generator or chest");
assert.equal(busyTrial.ctx.score,1000);
busyTrial.owner.refreshTrial(busyTrial.h);
assert.equal(busyTrial.h.chests.filter(c=>c.r115TrialReward).length,1,"No duplicated cache");
assert.equal(busyTrial.ctx.score,1000,"No duplicated score");
const blockedMap=Array.from({length:13},()=>Array(13).fill(1));blockedMap[5][5]=0;
const deferredTrial=rewardFixture(blockedMap);
deferredTrial.owner.refreshTrial(deferredTrial.h);
assert.equal(deferredTrial.h.chests.filter(c=>c.r115TrialReward).length,0,"Never issue reward under player when no free tiles");
assert.equal(deferredTrial.h.floorTrial.rewarded,false,"Unplaceable cache stays pending");
assert.ok(deferredTrial.h.floorTrial.rewardRetryAt>0,"Retry bounded");
assert.equal(deferredTrial.ctx.score,0);
blockedMap[5][6]=0;deferredTrial.h.floorTrial.rewardRetryAt=0;
deferredTrial.owner.refreshTrial(deferredTrial.h);
assert.equal(deferredTrial.h.chests.filter(c=>c.r115TrialReward).length,1,"Retry when space becomes free");
assert.equal(deferredTrial.ctx.score,1000);
deferredTrial.owner.refreshTrial(deferredTrial.h);
assert.equal(deferredTrial.h.chests.filter(c=>c.r115TrialReward).length,1,"Retry cannot duplicate cache");


// R115 negative/positive occupancy controls: defeated actors vacate a cell,
// an active Death Cache retains ownership, and deferred reward retries once.
const singleFreeRewardMap=()=>{
  const map=Array.from({length:11},()=>Array(11).fill(1));
  map[5][5]=0;map[5][6]=0;return map
};
for(const [label,overrides] of [
  ["defeated enemy",{enemies:[{x:6,y:5,alive:false}]}],
  ["destroyed generator",{generators:[{x:6,y:5,alive:false}]}],
  ["recovered Death Cache",{deathCaches:[{x:6,y:5,active:false}]}]
]){
  const fixture=rewardFixture(singleFreeRewardMap(),[],overrides);
  fixture.owner.refreshTrial(fixture.h);
  const rewards=fixture.h.chests.filter(c=>c.r115TrialReward);
  assert.equal(rewards.length,1,`${label} must free its tile for a reward`);
  assert.equal(rewards[0].x,6);assert.equal(rewards[0].y,5);
  assert.equal(fixture.ctx.score,1000,`${label} yields the existing reward once`);
  fixture.owner.refreshTrial(fixture.h);
  assert.equal(fixture.h.chests.filter(c=>c.r115TrialReward).length,1,`${label} may not duplicate rewards`);
}
for(const [label,overrides] of [
  ["living enemy",{enemies:[{x:6,y:5,alive:true}]}],
  ["living generator",{generators:[{x:6,y:5,alive:true}]}]
]){
  const fixture=rewardFixture(singleFreeRewardMap(),[],overrides);
  fixture.owner.refreshTrial(fixture.h);
  assert.equal(fixture.h.chests.filter(c=>c.r115TrialReward).length,0,`${label} must block reward placement`);
  assert.equal(fixture.ctx.score,0);
  assert.equal(fixture.h.floorTrial.rewarded,false);
}
const ownedCacheTrial=rewardFixture(singleFreeRewardMap(),[],{deathCaches:[{x:6,y:5,active:true}]});
ownedCacheTrial.owner.refreshTrial(ownedCacheTrial.h);
assert.equal(ownedCacheTrial.h.chests.filter(c=>c.r115TrialReward).length,0,"An active Death Cache blocks trial rewards");
assert.equal(ownedCacheTrial.h.floorTrial.rewarded,false,"An occupied reward stays pending");
assert.equal(ownedCacheTrial.ctx.score,0,"An occupied reward must not award score prematurely");
ownedCacheTrial.h.deathCaches[0].active=false;
ownedCacheTrial.h.floorTrial.rewardRetryAt=0;
ownedCacheTrial.owner.refreshTrial(ownedCacheTrial.h);
ownedCacheTrial.owner.refreshTrial(ownedCacheTrial.h);
assert.equal(ownedCacheTrial.h.chests.filter(c=>c.r115TrialReward).length,1,"Recovered Death Cache permits exactly one pending reward");
assert.equal(ownedCacheTrial.ctx.score,1000,"Deferred trial score is granted exactly once");

console.log("Dungeon Carnage R87 fifteen-floor campaign and floor-theme contract passed.");
