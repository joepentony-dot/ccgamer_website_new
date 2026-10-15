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
// P0 Floor 4: passive displacement updates the torch-pad entry ledger but
// can never light one. Deliberate keyboard/gamepad re-entry must register once.
const torchOwnerStart=gameplaySource.indexOf("function solveSequenceTorch(p){");
const torchOwnerEnd=gameplaySource.indexOf("function weightBridgeCell(",torchOwnerStart);
assert.ok(torchOwnerStart>=0&&torchOwnerEnd>torchOwnerStart,
  "The live Floor 4 torch owner is extractable from game-play.js");
assert.match(gameplaySource,/function reconcileSequenceTorchOccupants\(/,
  "The shared passive displacement reconciler must exist");
assert.match(gameplaySource,/reconcileSequenceTorchOccupants\(\);\s*enemyCD-=dt/,
  "Teleport changes must reconcile before the next deliberate movement frame");
assert.match(gameplaySource,/updateBoulder\(dt\);reconcileSequenceTorchOccupants\(\)/,
  "Late knockback/boulder movement must reconcile before the next frame");
const torchOwnerCode=gameplaySource.slice(torchOwnerStart,torchOwnerEnd);
function torchReentryCase(){
  const player={id:"P1",x:5,y:5,health:10};
  const z={roomId:1,solved:false,progress:0,failures:0,
    sequence:["N","E","S","W"],entryByPlayer:{P1:"N"},
    torches:[{dir:"N",x:5,y:5,lit:false},{dir:"E",x:7,y:5,lit:false},
      {dir:"S",x:5,y:7,lit:false},{dir:"W",x:3,y:5,lit:false}]};
  const hostState={sequenceTorchPuzzle:z,chests:[],enemies:[],revision:0};
  let notices=0,rewards=0,ambushes=0;
  const context=vm.createContext({
    host:hostState,world:{},score:0,
    W:{roomAt:()=>1},localPlayers:()=>[player],
    S:{sfx(){}},P:{gold:"#ffd"},showToast(){notices++},
    floatText(){},awardXP(){rewards++},
    spawnPuzzleAmbush(){ambushes++;return 1}
  });
  vm.runInContext(torchOwnerCode,context,{filename:"game-play.js::Floor4SequenceTorch",timeout:3000});
  return{context,hostState,player,z,
    getNotices:()=>notices,getRewards:()=>rewards,getAmbushes:()=>ambushes};
}
const forcedTorch=torchReentryCase();
forcedTorch.player.x=6;forcedTorch.player.y=5; // involuntary knockback
forcedTorch.context.reconcileSequenceTorchOccupants();
assert.equal(forcedTorch.z.entryByPlayer.P1,"","Forced departure must forget the previously occupied pad");
assert.equal(forcedTorch.z.progress,0,"Knockback itself may not advance puzzle progress");
assert.equal(forcedTorch.getNotices(),0,"Knockback may not announce a torch activation");
forcedTorch.player.x=5;forcedTorch.player.y=5;
assert.equal(forcedTorch.context.triggerSequenceTorch(forcedTorch.player,true),true,
  "Deliberate re-entry onto the old pad must now advance the puzzle");
assert.equal(forcedTorch.z.progress,1);
assert.equal(forcedTorch.context.triggerSequenceTorch(forcedTorch.player,true),false,
  "Repeated stationary input may not relight an occupied pad");
assert.equal(forcedTorch.z.progress,1);

forcedTorch.player.x=7;forcedTorch.player.y=5; // teleported onto next pad
forcedTorch.context.reconcileSequenceTorchOccupants();
assert.equal(forcedTorch.z.entryByPlayer.P1,"E","Forced landing must remember the newly occupied pad");
assert.equal(forcedTorch.z.progress,1,"Teleport onto a torch must not light it");
assert.equal(forcedTorch.context.triggerSequenceTorch(forcedTorch.player,true),false,
  "Pressing movement while still on the forced-landing pad may not claim an entry");
forcedTorch.player.x=6;forcedTorch.player.y=5;
forcedTorch.context.reconcileSequenceTorchOccupants();
forcedTorch.player.x=7;forcedTorch.player.y=5;
assert.equal(forcedTorch.context.triggerSequenceTorch(forcedTorch.player,true),true,
  "Deliberate step away and return must activate the next torch exactly once");
assert.equal(forcedTorch.z.progress,2);

const restoredTorch=torchReentryCase();
restoredTorch.player.x=6;restoredTorch.player.y=5;
restoredTorch.context.reconcileSequenceTorchOccupants();
restoredTorch.context.host.sequenceTorchPuzzle=JSON.parse(JSON.stringify(restoredTorch.z));
restoredTorch.player.x=5;restoredTorch.player.y=5;
assert.equal(restoredTorch.context.triggerSequenceTorch(restoredTorch.player,true),true,
  "JSON-restored entry memory permits a genuine re-entry after displacement");
assert.equal(restoredTorch.context.host.sequenceTorchPuzzle.progress,1);
assert.equal(restoredTorch.getAmbushes(),0,"Legitimate re-entry must not trigger a wrong-order ambush");

const solvedTorch=torchReentryCase();
solvedTorch.player.x=6;solvedTorch.player.y=5;
solvedTorch.context.reconcileSequenceTorchOccupants();
for(const [x,y] of [[5,5],[7,5],[5,7],[3,5]]){
  solvedTorch.player.x=x;solvedTorch.player.y=y;
  assert.equal(solvedTorch.context.triggerSequenceTorch(solvedTorch.player,true),true);
}
assert.equal(solvedTorch.z.solved,true);
assert.equal(solvedTorch.context.score,650,"Completed torch puzzle pays its score once");
assert.equal(solvedTorch.getRewards(),1,"Completed torch puzzle awards XP once");
solvedTorch.player.x=6;solvedTorch.player.y=5;
solvedTorch.context.reconcileSequenceTorchOccupants();
solvedTorch.player.x=5;solvedTorch.player.y=5;
assert.equal(solvedTorch.context.triggerSequenceTorch(solvedTorch.player,true),false);
assert.equal(solvedTorch.context.score,650,"Completed puzzle never pays repeated score");
assert.equal(solvedTorch.getRewards(),1,"Completed puzzle never duplicates XP");

assert.doesNotMatch(gameplaySource,/puzzleTorch[\s\S]{0,240}activateSequenceTorch/,"player projectiles must never activate sequence torches");
assert.match(gameplaySource,/punishmentAlive=.*torch-fail-/,"torch puzzle failure punishment must be capped while an existing punishment enemy is alive");
assert.match(gameplaySource,/TORCH SEQUENCE PUZZLE[\s\S]*Only your footsteps count/,"entering the torch room must explain the player-only interaction");
assert.match(renderSource,/TORCH — \$\{lit\?"LIT":"STEP ON"\}/,"torch labels must instruct STEP ON rather than shooting");
assert.match(systemsSource,/weightBridgeSwitch:true/,"the far side of the trick bridge must contain a dedicated shoot-only rebuild switch");
assert.match(systemsSource,/r114TrickTreatReward\s*=\s*true|r114TrickTreatReward\s*:\s*true/,"the far side bridge cache must be marked as the upgraded Trickster reward");
assert.match(gameplaySource,/function bridgeStashedItems\(b\)/,"bridge collapse must own the dropped-stash theft transaction");
assert.match(gameplaySource,/bridgeThief:true/,"crossing the bridge must create a distinct Dungeon Thief target");

// P0 thief AI and post-theft minimap tracking: execute the real existing
// enemy AI module on a deterministic two-room corridor with an ordinary door.
const thiefAiSource=read("arcade/lost-sizzler/js/ai.js");
function thiefRouteCase({locked=false,distant=false}={}){
  const map=Array.from({length:34},()=>Array(34).fill(1));
  for(let y=1;y<=9;y++)for(let x=1;x<=9;x++)map[y][x]=0;
  for(let x=1;x<=9;x++)map[4][x]=1;
  map[4][5]=0;
  const WTest={
    roomAt:(_world,x,y)=>y<=3?0:y>=5?1:-1,
    sameRoom:(_world,a,b)=>a.y<=3&&b.y<=3||a.y>=5&&b.y>=5,
    doorAt:(host,x,y)=>(host.doors||[]).find(door=>door.x===x&&door.y===y)||null,
    walkable:(grid,x,y,host)=>grid[y]?.[x]===0&&
      !(host.doors||[]).some(door=>door.x===x&&door.y===y&&!door.open)
  };
  const windowTest={CCG_CONFIG:C,CCGWorld:WTest,CCGSystems:{inSanctuary:()=>false}};
  const context=vm.createContext({window:windowTest,performance:{now:()=>0},console});
  vm.runInContext(thiefAiSource,context,{filename:"ai.js::bridge-thief",timeout:3000});
  const thief={id:"bridge-thief-f5",kind:"ambusher",bridgeThief:true,alive:true,
    x:5,y:2,hp:15,maxHp:15,moveCooldown:0,attackCooldown:0,chargeCooldown:0,
    facing:{x:1,y:0},aiState:"idle",moveSpeedScale:.82};
  const player={id:"P1",x:distant?30:5,y:distant?30:2,health:10};
  const hostState={enemies:[thief],doors:[{x:5,y:4,type:"room",locked,open:false}],enteredRoomIds:[0]};
  const worldState={map,rooms:[{id:0},{id:1}],graph:[[1],[0]]};
  let attacks=0,overlap=false;
  const visited=new Set(),initial=windowTest.CCGAI.simulationEligibleForTest(thief,worldState,[player],new Set([0]));
  for(let i=0;i<80;i++){
    windowTest.CCGAI.stepEnemies(hostState,map,[player],600,{
      melee(){attacks++},shoot(){attacks++}
    },worldState);
    visited.add(thief.y>=5?1:0);
    if(thief.x===player.x&&thief.y===player.y)overlap=true;
  }
  return{thief,player,hostState,visited,attacks,overlap,initial};
}
const crossingThief=thiefRouteCase();
assert.equal(crossingThief.initial,true,"Thief must remain in the simulation beyond the local room");
assert.ok(crossingThief.visited.has(0)&&crossingThief.visited.has(1),
  "Fleeing thief must cross a real ordinary unlocked door and move between rooms");
assert.equal(crossingThief.hostState.doors[0].open,true,"Thief opens an unlocked room door");
assert.equal(crossingThief.attacks,0,"Thief must flee instead of attacking");
assert.equal(crossingThief.overlap,false,"Thief cannot step onto player");
assert.equal(crossingThief.thief.aiState,"flee","Thief must retain fleeing state");
const lockedThief=thiefRouteCase({locked:true});
assert.equal(lockedThief.hostState.doors[0].open,false,"Thief may not unlock an actual locked gate");
assert.equal(lockedThief.visited.has(1),false,"Locked route cannot be bypassed");
assert.equal(lockedThief.attacks,0);
assert.equal(lockedThief.overlap,false);
const distantThief=thiefRouteCase({distant:true});
assert.equal(distantThief.initial,true,"Distant thief remains eligible for global simulation");
assert.equal(distantThief.attacks,0);

const radarThiefStart=renderSource.indexOf("function radarBridgeThief(hostState){");
const radarThiefEnd=renderSource.indexOf("function renderRadarPanel(p){",radarThiefStart);
assert.ok(radarThiefStart>=0&&radarThiefEnd>radarThiefStart,"Real minimap thief selector must exist");
const radarThiefContext=vm.createContext({});
vm.runInContext(renderSource.slice(radarThiefStart,radarThiefEnd),radarThiefContext,
  {filename:"game-render.js::bridge-thief-radar",timeout:3000});
const thiefMarkerEnemy={id:"bridge-thief-f5",bridgeThief:true,alive:true,x:12,y:13};
const thiefHost={weightBridge:{crossed:true,collapsed:true,thiefId:thiefMarkerEnemy.id},
  enemies:[thiefMarkerEnemy]};
assert.equal(radarThiefContext.radarBridgeThief(thiefHost)?.id,thiefMarkerEnemy.id);
// Shooting the bridge switch sets collapsed=false while the thief is still
// roaming. Tracking must continue until that specific thief is defeated.
const rebuiltBridgeHost={...thiefHost,weightBridge:{...thiefHost.weightBridge,
  collapsed:false,rebuilt:true,stabilized:true}};
assert.equal(radarThiefContext.radarBridgeThief(rebuiltBridgeHost)?.id,thiefMarkerEnemy.id,
  "Rebuilding the bridge must not hide the still-living thief");

assert.equal(radarThiefContext.radarBridgeThief({...thiefHost,
  weightBridge:{...thiefHost.weightBridge,crossed:false}}),null,"No advance reveal before theft");
assert.equal(radarThiefContext.radarBridgeThief({...thiefHost,
  weightBridge:{...thiefHost.weightBridge,thiefDefeated:true}}),null,"Defeat removes marker");
assert.equal(radarThiefContext.radarBridgeThief({...thiefHost,
  enemies:[{...thiefMarkerEnemy,alive:false}]}),null,"Dead thief cannot retain marker");
thiefMarkerEnemy.x=19;thiefMarkerEnemy.y=21;
assert.equal(radarThiefContext.radarBridgeThief(thiefHost)?.x,19,"Marker tracks real actor X");
assert.equal(radarThiefContext.radarBridgeThief(thiefHost)?.y,21,"Marker tracks real actor Y");
assert.match(renderSource,/radarCtx\.fillText\("T",x,y\+\.25\)/,
  "Radar must draw a recognisable T for tracked thief");

assert.match(gameplaySource,/function ensureBridgeSwitchAmmo\(p,b\)[\s\S]*bridge-emergency-weapon[\s\S]*bridge-emergency-ammo/,"the far-side switch must provide both firearm and ammo failsafes when needed");
assert.match(gameplaySource,/TRICK! THE BRIDGE COLLAPSES/,"successful empty-handed crossing must trigger the trick rather than stabilising the old bridge");
assert.match(gameplaySource,/BRIDGE SWITCH — SHOOT IT/,"the rebuild mechanism must explain that it is a projectile switch");
assert.match(localRuntimeSource,/function recoverBridgeThiefStash\(e=null,attacker=p1\)/,"the thief kill and deferred-retry path must share the canonical stolen-item recovery owner");
assert.match(localRuntimeSource,/PGR\.inventoryCanAdd\(player,item\)&&PGR\.inventoryAdd\(player,item\)/,"recovered stolen items must return through canonical inventory stack rules");
assert.match(localRuntimeSource,/bridgeRecovered:true/,"recoverable overflow stacks must preserve their original item identity on an accessible unoccupied floor tile");
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

// P0: approach every mandatory generator after ordinary room doors are opened.
// This tests structural reachability, not actual owner-save/door interactions.
const generatorAdjacency=[[1,0],[-1,0],[0,1],[0,-1]];
function generatorWalkRegion(worldState,hostState){
  const queue=[worldState.start],visited=new Set([worldState.start.x+","+worldState.start.y]);
  for(let index=0;index<queue.length;index++){
    const current=queue[index];
    for(const [dx,dy] of generatorAdjacency){
      const x=current.x+dx,y=current.y+dy,key=x+","+y;
      if(visited.has(key)||!generatedWorld.playerWalkable(worldState.map,x,y,hostState))continue;
      visited.add(key);queue.push({x,y});
    }
  }
  return visited;
}
function generatorHasAdjacentApproach(generator,visited){
  return generatorAdjacency.some(([dx,dy])=>visited.has((generator.x+dx)+","+(generator.y+dy)));
}
let checkedGeneratorFloors=0;
for(const floor of [2,5,9,12]){
  for(let index=0;index<2;index++){
    const seed="ccg-p0-generator-route-20261015-"+floor+"-"+index;
    const worldState=generatedWorld.generate(seed),hostState=generatedWorld.createHostState(worldState);
    generatedSystems.decorate(worldState,hostState,{floor,seed,stats:{}});
    assert.equal(hostState.objective?.type,"generators","The sampled floor must require generators: "+seed);
    assert.equal(hostState.generators.length,C.dungeon.generatorCount,"All three generators must be placed: "+seed);
    assert.equal(hostState.objective.target,hostState.generators.length,"Objective target must match actual generators: "+seed);
    const openHost={...hostState,doors:(hostState.doors||[]).map(door=>door.type==="room"?{...door,open:true,locked:false}:door)};
    const reachable=generatorWalkRegion(worldState,openHost);
    for(const generator of hostState.generators){
      assert.ok(generatorHasAdjacentApproach(generator,reachable),"Generator has no attack approach after ordinary doors open: "+seed+" "+generator.id);
    }
    if(floor===2&&index===0){
      // Negative control: artificially surrounded generator must be rejected.
      const generator=hostState.generators[0];
      const surround=generatorAdjacency.map(([dx,dy],n)=>({id:"route-block-"+n,x:generator.x+dx,y:generator.y+dy}));
      const sealed={...openHost,blockingDecor:[...(openHost.blockingDecor||[]),...surround]};
      assert.equal(generatorHasAdjacentApproach(generator,generatorWalkRegion(worldState,sealed)),false,"Reachability test must reject a deliberately sealed generator");
    }
    checkedGeneratorFloors++;
  }
}
assert.equal(checkedGeneratorFloors,8,"Sample four generator-objective floors twice each.");



// P0 bridge thief: execute the actual stolen-item recovery owner.
const bridgeStart=localRuntimeSource.indexOf("function bridgeThiefRecoveryCells(");
const bridgeEnd=localRuntimeSource.indexOf("function damageEnemy(",bridgeStart);
assert.ok(bridgeStart>=0&&bridgeEnd>bridgeStart,"Current stolen-item return owner must exist");
const bridgeSource=localRuntimeSource.slice(bridgeStart,bridgeEnd);
assert.match(gameplaySource,/recoverBridgeThiefStash\(null,p1\)/,"Live simulation must retry pending overflow");
function bridgeCase({sealed=false,occupied=false,items=["banishment"],capacity=0}={}){
  const map=Array.from({length:13},()=>Array(13).fill(sealed?1:0));if(sealed)map[5][5]=0;
  const player={id:"P1",x:5,y:5,inventory:[]},thief={id:"thief-5",x:5,y:5,alive:false,bridgeThief:true};
  const drops=items.map((kind,i)=>({id:"dropped-"+i,x:i+2,y:4,active:false,bridgeStolen:true,
    carriedItem:{kind,name:kind,qty:1}}));
  const bridge={thiefId:thief.id,collapsed:true,rebuilt:true,stolenItems:drops.map(d=>({...d,carriedItem:{...d.carriedItem}}))};
  const hostState={weightBridge:bridge,items:drops,enemies:[thief],
    generators:occupied?[{x:6,y:5,alive:true}]:[],
    chests:occupied?[{x:4,y:5,active:true}]:[],
    deathCaches:occupied?[{x:5,y:4,active:true}]:[],revision:0};
  let now=1000,ctx;
  ctx=vm.createContext({host:hostState,world:{map},p1:player,score:0,
    Date:{now:()=>now},console,
    W:{walkable:(m,x,y)=>m[y]?.[x]===0,
      playerWalkable:(m,x,y,h)=>m[y]?.[x]===0&&!h.generators.some(g=>g.alive&&g.x===x&&g.y===y)},
    PGR:{inventoryCanAdd:p=>p.inventory.length<capacity&&!p.inventory.some(it=>it.kind==="banishment"),
      inventoryAdd:(p,item)=>{if(p.inventory.length>=capacity)return false;p.inventory.push({...item});return true}},
    localPlayers:()=>[ctx.p1],S:{sfx(){}},burst(){},ring(){},P:{gold:"#ffd"},
    showToast(){},updateQuests(){}});
  vm.runInContext(bridgeSource,ctx,{filename:"bridge-return",timeout:3000});
  return{ctx,bridge,thief,player,map,host:hostState,retry(){now+=800;return ctx.recoverBridgeThiefStash(null,ctx.p1)}};
}
const blockedBridge=bridgeCase({sealed:true}),firstBlocked=blockedBridge.ctx.recoverBridgeThiefStash(blockedBridge.thief,blockedBridge.player);
assert.equal(firstBlocked.pending,1,"No free tile must retain stolen ownership");
assert.equal(blockedBridge.ctx.score,750,"Thief kill bonus pays once");
assert.equal(blockedBridge.bridge.stolenItems.length,1);
assert.equal(blockedBridge.host.items.filter(x=>x.active).length,0,"Never put recovered loot under corpse/player");
assert.equal(blockedBridge.ctx.recoverBridgeThiefStash(blockedBridge.thief,blockedBridge.player),null,"Cannot duplicate thief kill");
assert.equal(blockedBridge.retry().pending,1,"Blocked room preserves pending item");
blockedBridge.map[5][6]=0;
assert.equal(blockedBridge.retry().pending,0,"Opening reachable ground releases pending stash");
assert.deepEqual([blockedBridge.host.items[0].x,blockedBridge.host.items[0].y],[6,5]);
assert.equal(blockedBridge.retry(),null,"Delivered stash cannot be reissued");
assert.equal(blockedBridge.ctx.score,750,"No duplicate bonus after retries");

const overlapBridge=bridgeCase({occupied:true,items:["potion","torch","banishment"]});
overlapBridge.ctx.recoverBridgeThiefStash(overlapBridge.thief,overlapBridge.player);
const placedBridge=overlapBridge.host.items.filter(x=>x.active);
assert.equal(placedBridge.length,3);
assert.equal(new Set(placedBridge.map(x=>x.x+","+x.y)).size,3,"Overflow stacks require unique walkable cells");
for(const row of placedBridge){
  assert.ok(row.x!==overlapBridge.player.x||row.y!==overlapBridge.player.y,"No player overlap");
  assert.ok(!overlapBridge.host.generators.some(g=>g.x===row.x&&g.y===row.y),"No generator overlap");
  assert.ok(!overlapBridge.host.chests.some(c=>c.x===row.x&&c.y===row.y),"No chest overlap");
  assert.ok(!overlapBridge.host.deathCaches.some(c=>c.x===row.x&&c.y===row.y),"No cache overlap");
}
assert.equal(overlapBridge.bridge.stolenItems.length,0);
assert.equal(overlapBridge.ctx.score,750);

const restoredBridge=bridgeCase({sealed:true,capacity:1});
restoredBridge.player.inventory=[{kind:"potion",qty:1}];
restoredBridge.ctx.recoverBridgeThiefStash(restoredBridge.thief,restoredBridge.player);
assert.equal(restoredBridge.bridge.stolenItems.length,1);
restoredBridge.ctx.host=JSON.parse(JSON.stringify(restoredBridge.ctx.host));
restoredBridge.ctx.p1=JSON.parse(JSON.stringify(restoredBridge.ctx.p1));
restoredBridge.ctx.p1.inventory=[];
assert.equal(restoredBridge.retry().pending,0,"JSON restored inventory can receive stolen Flask");
assert.equal(restoredBridge.ctx.p1.inventory.filter(it=>it.kind==="banishment").length,1);
assert.equal(restoredBridge.ctx.host.weightBridge.stolenItems.length,0);
assert.equal(restoredBridge.retry(),null);
assert.equal(restoredBridge.ctx.score,750);

// P0 Death Stalker singleton: permanent banishment overrides duplicate
// live records, and timed-chamber IDs must follow the sole retained actor.
const makeFloorStalker=(id,alive=true)=>({id,alive,deathStalker:true,voidStalker:true});
const duplicateBanishedHost={
  enemies:[makeFloorStalker("floor-stalker-original"),makeFloorStalker("floor-stalker-duplicate",false)],
  deathStalkerId:"floor-stalker-original",defeatedDeathStalkers:[],
  timedRooms:[{id:"timed0",hunterId:"floor-stalker-duplicate",stalkerDefeated:false}]
};
const originalCanonical=duplicateBanishedHost.enemies[0];
generatedSystems.enforceDeathStalkerSingleton(duplicateBanishedHost);
assert.equal(duplicateBanishedHost.enemies.length,1,"Only one canonical Death Stalker may remain");
assert.equal(duplicateBanishedHost.enemies[0],originalCanonical,"Preserve the existing canonical actor identity");
assert.equal(originalCanonical.alive,false,"A defeated duplicate must never resurrect the canonical actor");
assert.ok(duplicateBanishedHost.defeatedDeathStalkers.includes(originalCanonical.id),"Canonical defeat must be recorded");
assert.equal(duplicateBanishedHost.deathStalkerId,originalCanonical.id);
assert.equal(duplicateBanishedHost.timedRooms[0].hunterId,originalCanonical.id,"Timed Chamber must target the retained actor");
assert.equal(duplicateBanishedHost.timedRooms[0].stalkerDefeated,true,"Timed Chamber must preserve banishment");
generatedSystems.enforceDeathStalkerSingleton(duplicateBanishedHost);
assert.equal(duplicateBanishedHost.defeatedDeathStalkers.filter(id=>id===originalCanonical.id).length,1,"Repeated reconciliation must not duplicate the defeat record");
assert.equal(duplicateBanishedHost.enemies.length,1,"Repeated reconciliation must not create an actor");

const rememberedDefeatHost={
  enemies:[makeFloorStalker("floor-stalker-original"),makeFloorStalker("floor-stalker-duplicate")],
  deathStalkerId:"floor-stalker-original",defeatedDeathStalkers:["floor-stalker-duplicate"],
  timedRooms:[{hunterId:"floor-stalker-duplicate"}]
};
generatedSystems.enforceDeathStalkerSingleton(rememberedDefeatHost);
assert.equal(rememberedDefeatHost.enemies.length,1);
assert.equal(rememberedDefeatHost.enemies[0].alive,false,"Permanent ledger must override stale living duplicate");
assert.equal(rememberedDefeatHost.timedRooms[0].hunterId,"floor-stalker-original");
assert.equal(rememberedDefeatHost.timedRooms[0].stalkerDefeated,true);

const soloLedgerHost={
  enemies:[makeFloorStalker("floor-stalker-original")],
  defeatedDeathStalkers:["floor-stalker-original"],timedRooms:[{hunterId:"floor-stalker-original"}]
};
generatedSystems.enforceDeathStalkerSingleton(soloLedgerHost);
assert.equal(soloLedgerHost.enemies[0].alive,false,"A restored living actor cannot override its banishment ledger");

const activeDoublesHost={
  enemies:[makeFloorStalker("floor-stalker-new"),makeFloorStalker("floor-stalker-original")],
  deathStalkerId:"floor-stalker-original",defeatedDeathStalkers:[],
  timedRooms:[{hunterId:"floor-stalker-new"}]
};
generatedSystems.enforceDeathStalkerSingleton(activeDoublesHost);
assert.equal(activeDoublesHost.enemies.length,1);
assert.equal(activeDoublesHost.enemies[0].id,"floor-stalker-original","Prefer the previously established canonical identity");
assert.equal(activeDoublesHost.enemies[0].alive,true,"Two active duplicates must not imply a banishment");
assert.equal(activeDoublesHost.defeatedDeathStalkers.length,0);
assert.equal(activeDoublesHost.timedRooms[0].hunterId,"floor-stalker-original","Retarget references to a removed duplicate");


// R114 boss reward collision: use actual boss completion code and serialize
// the same fight state; do not synthesize a separate reward implementation.
const bossBegin=gameplaySource.indexOf("function bossFightState(){");
const bossEnd=gameplaySource.indexOf("function triggerBoulder(p)",bossBegin);
assert.ok(bossBegin>=0&&bossEnd>bossBegin,"Live R114 boss reward owner must be extractable");
assert.match(gameplaySource,/function reconcileBossRewards\(fight,force=false\)/);
function bossRewardCase({floor=5,generator=false,blocked=false}={}){
  const map=Array.from({length:12},()=>Array(12).fill(1));
  for(let y=2;y<=7;y++)for(let x=2;x<=7;x++)map[y][x]=0;
  const player={id:"P1",x:3,y:3,health:10},boss={id:"boss",x:5,y:5,alive:false};
  const fight={floor,roomId:1,bossId:"boss",cleared:false,triggered:true,name:"Guardian Maw"};
  const hostState={r114BossFight:fight,enemies:[boss],generators:generator?[{x:4,y:4,alive:true}]:[],
    items:[],chests:[],doors:[],deathCaches:[],switches:[],shrines:[],revision:0};
  if(blocked)for(let y=2;y<=7;y++)for(let x=2;x<=7;x++)
    if(x!==player.x||y!==player.y)hostState.items.push({x,y,active:true});
  let tick=1000,announcements=0;
  const ctx=vm.createContext({
    host:hostState,world:{rooms:[null,{id:1,x:1,y:1,w:7,h:7,depth:6}],map},
    p1:player,W:{roomAt:(_w,x,y)=>x>=2&&x<=7&&y>=2&&y<=7?1:-1,
      playerWalkable:(m,x,y)=>m[y]?.[x]===0},
    localPlayers:()=>[player],SYS:{lockRoomDoors(){}},S:{sfx(){}},
    showToast(){announcements++},beginDoorOpening(){},spawnEnemyShot(){},
    spawnPuzzleAmbush(){},P:{},performance:{now:()=>tick},Date:{now:()=>tick},score:0
  });
  vm.runInContext(gameplaySource.slice(bossBegin,bossEnd),ctx,{filename:"game-play.js::R114",timeout:3000});
  return{ctx,hostState,fight,player,advance(ms=1000){tick+=ms;ctx.updateBossFight(16)},
    getAnnouncements:()=>announcements};
}
const generatorBoss=bossRewardCase({generator:true});
generatorBoss.advance();
assert.equal(generatorBoss.hostState.chests.length,1);
assert.equal(generatorBoss.hostState.items.length,1);
const firstChest=generatorBoss.hostState.chests[0],firstSide=generatorBoss.hostState.items[0];
assert.notDeepEqual([firstChest.x,firstChest.y],[4,4],"Boss chest cannot overlap a live generator");
assert.notDeepEqual([firstSide.x,firstSide.y],[4,4],"Boss side reward cannot overlap generator");
assert.notDeepEqual([firstChest.x,firstChest.y],[firstSide.x,firstSide.y],"Chest and side item cannot overlap");
assert.notDeepEqual([firstChest.x,firstChest.y],[3,3],"Boss chest cannot overlap player");
assert.equal(generatorBoss.ctx.score,2500);
generatorBoss.advance();
assert.equal(generatorBoss.hostState.chests.length,1);
assert.equal(generatorBoss.hostState.items.length,1);
assert.equal(generatorBoss.ctx.score,2500,"Duplicate updates cannot pay boss defeat twice");

const pendingBoss=bossRewardCase({blocked:true});
pendingBoss.advance();
assert.equal(pendingBoss.hostState.chests.length,0,"Full room must not force invalid chest");
assert.equal(pendingBoss.fight.rewarded,undefined,"Unplaced chest stays owed");
assert.equal(pendingBoss.ctx.score,2500);
assert.equal(pendingBoss.getAnnouncements(),1);
pendingBoss.hostState.items.find(i=>i.x===5&&i.y===5).active=false;
pendingBoss.advance();
assert.equal(pendingBoss.hostState.chests.length,1,"Freed reachable cell receives owed chest");
assert.equal(pendingBoss.fight.sideRewarded,undefined,"Side item still pending when only one cell free");
pendingBoss.ctx.host=JSON.parse(JSON.stringify(pendingBoss.ctx.host));
pendingBoss.ctx.host.items.find(i=>i.x===6&&i.y===6).active=false;
pendingBoss.advance();
assert.equal(pendingBoss.ctx.host.items.filter(i=>i.kind==="mapReveal").length,1,
  "Saved pending side reward is delivered exactly once");
assert.equal(pendingBoss.ctx.host.chests.length,1);
assert.equal(pendingBoss.ctx.score,2500);
pendingBoss.advance();
assert.equal(pendingBoss.ctx.host.items.filter(i=>i.kind==="mapReveal").length,1);
assert.equal(pendingBoss.ctx.host.chests.length,1);
assert.equal(pendingBoss.ctx.score,2500);
assert.equal(pendingBoss.getAnnouncements(),1,"Deferred rewards do not repeat victory announcement");

const tenthBoss=bossRewardCase({floor:10,generator:true});
tenthBoss.advance();
assert.equal(tenthBoss.hostState.items.filter(i=>i.kind==="magicSack").length,1);
assert.notDeepEqual([tenthBoss.hostState.chests[0].x,tenthBoss.hostState.chests[0].y],
  [tenthBoss.hostState.items[0].x,tenthBoss.hostState.items[0].y]);

const restoredLegacy=bossRewardCase();
restoredLegacy.fight.cleared=true;restoredLegacy.fight.rewarded=true;
restoredLegacy.advance();
assert.equal(restoredLegacy.hostState.chests.length,0,"Old paid save cannot recreate consumed chest");
assert.equal(restoredLegacy.hostState.items.length,0,"Old paid save cannot recreate consumed map");
assert.equal(restoredLegacy.ctx.score,0,"Older save must not receive another boss payout");

// P0 Timed Chamber: exercise the actual gameplay trigger function in isolation.
// A completed challenge must never restart or teleport the floor's Stalker.
const timedTriggerStart=gameplaySource.indexOf("function triggerTimed(p){");
const timedTriggerEnd=gameplaySource.indexOf("function triggerTrader(p){",timedTriggerStart);
assert.ok(timedTriggerStart>=0&&timedTriggerEnd>timedTriggerStart,"Current timed-chamber source must be available for direct execution");
const timedTriggerOwner=gameplaySource.slice(timedTriggerStart,timedTriggerEnd);
const timedPuzzleStart=gameplaySource.indexOf("function puzzleFloorCells(roomId){");
const timedPuzzleEnd=gameplaySource.indexOf("function spawnPuzzleAmbush(",timedPuzzleStart);
assert.ok(timedPuzzleStart>=0&&timedPuzzleEnd>timedPuzzleStart,"Use actual puzzle cell walkability owner");
const timedPuzzleFloorCells=gameplaySource.slice(timedPuzzleStart,timedPuzzleEnd);
function runTimedTriggerFixture({cleared=false,triggered=false,defeated=false,inside=true}={}){
  const chamber={id:"timed0",roomId:1,triggered,cleared,stalkerDefeated:defeated,timeLeft:0};
  const stalker={id:"death-stalker-floor-4",x:9,y:9,alive:!defeated,deathStalker:true,voidStalker:true};
  const player=inside?{x:3,y:3}:{x:0,y:0};
  const hostState={timedRooms:[chamber],enemies:[stalker],defeatedDeathStalkers:defeated?[stalker.id]:[],
    items:[],chests:[],deathCaches:[],switches:[],shrines:[],shops:[],generators:[]};
  let countdownCalls=0,noticeCalls=0;
  const worldState={rooms:[null,{id:1,x:2,y:2,w:5,h:5}],
    map:Array.from({length:15},()=>Array(15).fill(0))};
  const context=vm.createContext({
    host:hostState,world:worldState,run:{floor:4},
    W:{roomAt:(_world,x,y)=>x>=3&&x<=6&&y>=3&&y<=6?1:0,
       playerWalkable:(map,x,y,host)=>generatedWorld.playerWalkable(map,x,y,host)},
    localPlayers:()=>[player],timedChamberCountdown(){countdownCalls++},
    showToast(){noticeCalls++}
  });
  vm.runInContext(timedPuzzleFloorCells+timedTriggerOwner,context,
    {filename:"game-play.js::timed-chamber",timeout:3000});
  context.triggerTimed(player);
  context.triggerTimed(player); // repeated update must not create another trigger
  return{chamber,stalker,countdownCalls,noticeCalls};
}
for(const defeated of [false,true]){
  const previous=runTimedTriggerFixture({cleared:true,defeated});
  assert.equal(previous.chamber.triggered,false,"A completed chamber cannot restart after returning");
  assert.equal(previous.chamber.timeLeft,0,"A completed challenge cannot reset its countdown");
  assert.equal(previous.stalker.x,9,"A completed chamber cannot relocate the Stalker");
  assert.equal(previous.stalker.y,9,"A completed chamber cannot relocate the Stalker");
  assert.equal(previous.countdownCalls,0,"A cleared chamber must not reopen countdown UI");
  assert.equal(previous.noticeCalls,0,"A cleared chamber must not announce a new challenge");
}
const firstTimedEntry=runTimedTriggerFixture();
assert.equal(firstTimedEntry.chamber.triggered,true,"First genuine entry still starts the trial");
assert.equal(firstTimedEntry.chamber.timeLeft,30000,"First entry still gets the 30-second trial");
assert.equal(firstTimedEntry.stalker.x,4,"An active first trial still calls the existing Stalker encounter");
assert.equal(firstTimedEntry.stalker.y,4);
assert.equal(firstTimedEntry.countdownCalls,1,"Repeated entry during the same active trial may not restart it");
assert.equal(runTimedTriggerFixture({triggered:true}).countdownCalls,0,"Already-active chambers cannot retrigger");
assert.equal(runTimedTriggerFixture({inside:false}).countdownCalls,0,"A player outside the chamber cannot trigger it");

// P0 chamber spawn/overlap: the former direct room-centre teleport ignores
// live player, Guardian, generators and active loot, even when no free cell.
function timedSpawnScenario({player={x:3,y:3},guardian=null,generator=null,cache=null,enemy=null,allOccupied=false}={}){
  const stalker={id:"death-stalker-floor-4",x:9,y:9,rx:9,ry:9,alive:true,deathStalker:true,voidStalker:true};
  const hostState={timedRooms:[{id:"timed0",roomId:1,triggered:false,cleared:false,timeLeft:0}],
    enemies:[stalker,...(enemy?[enemy]:[])],defeatedDeathStalkers:[],
    guardian,generators:generator?[generator]:[],deathCaches:cache?[cache]:[],
    items:[],chests:[],switches:[],shrines:[],shops:[]};
  if(allOccupied)for(let y=3;y<=6;y++)for(let x=3;x<=6;x++)hostState.items.push({x,y,active:true});
  const room={id:1,x:2,y:2,w:5,h:5},worldState={rooms:[null,room],map:Array.from({length:15},()=>Array(15).fill(0))};
  let notices=0;
  const ctx=vm.createContext({
    host:hostState,world:worldState,run:{floor:4},
    W:{roomAt:(_world,x,y)=>x>=3&&x<=6&&y>=3&&y<=6?1:0,
       playerWalkable:(map,x,y,host)=>generatedWorld.playerWalkable(map,x,y,host)},
    localPlayers:()=>[player],timedChamberCountdown(){},showToast(){notices++}
  });
  vm.runInContext(timedPuzzleFloorCells+timedTriggerOwner,ctx,{filename:"game-play.js::timed-placement",timeout:3000});
  ctx.triggerTimed(player);
  return{stalker,hostState,notices};
}
const spawnOverPlayer=timedSpawnScenario({player:{x:4,y:4}});
assert.notDeepEqual([spawnOverPlayer.stalker.x,spawnOverPlayer.stalker.y],[4,4],"Timed Stalker cannot spawn on the current player");
assert.equal(spawnOverPlayer.hostState.timedRooms[0].triggered,true,"Player collision must not softlock challenge");

for(const [name,fixture] of [
  ["guardian",{guardian:{x:4,y:4,alive:true}}],
  ["live generator",{generator:{x:4,y:4,alive:true}}],
  ["active Death Cache",{cache:{x:4,y:4,active:true}}],
  ["living enemy",{enemy:{x:4,y:4,alive:true}}],
]){
  const result=timedSpawnScenario(fixture);
  assert.notDeepEqual([result.stalker.x,result.stalker.y],[4,4],name+" must block timed hunter teleport");
  assert.equal(result.hostState.timedRooms[0].timeLeft,30000,name+" must not stop challenge timer");
}
const blockedTimedSpawn=timedSpawnScenario({allOccupied:true});
assert.deepEqual([blockedTimedSpawn.stalker.x,blockedTimedSpawn.stalker.y],[9,9],"No safe position: retain Stalker location instead of overlapping loot");
assert.equal(blockedTimedSpawn.hostState.timedRooms[0].triggered,true,"No free chamber tile must not strand challenge");
assert.equal(blockedTimedSpawn.notices,1,"Unavailable destination must not repeat challenge notices");
const openTimedSpawn=timedSpawnScenario();
assert.deepEqual([openTimedSpawn.stalker.x,openTimedSpawn.stalker.y],[4,4],"Unoccupied centre remains the preferred first-entry cell");
assert.equal(openTimedSpawn.stalker.rx,4,"Teleport must also synchronise interpolated X coordinate");
assert.equal(openTimedSpawn.stalker.ry,4,"Teleport must also synchronise interpolated Y coordinate");


// Exercise actual R115 reward placement through its VM owner, not just source text.
const rewardWalk=(m,x,y)=>m[y]?.[x]===0;
function rewardFixture(map,items=[],overrides={}){
  const h={items:items.map(([x,y])=>({x,y,active:true})),
    // Canonical generators use alive (world.generatorAt), not item.active.
    enemies:[{x:5,y:7,alive:true}],generators:[{x:7,y:5,alive:true}],
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
