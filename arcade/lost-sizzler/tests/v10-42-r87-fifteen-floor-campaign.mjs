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
assert.equal(floors[0].theme,"C64_ARCHIVE","Floor 1 must retain the neutral opening archive identity");
assert.equal(floors[14].theme,"BLOOD_CITADEL","Floor 15 must end in the danger-red Blood Citadel");
assert.match(worldSource,/BLOOD_CITADEL:\{name:"Blood Citadel",floor:"#24090d"/,"world palette must define the authored danger-red final theme");
assert.match(campaignSource,/function applyFloorTheme\(/,"campaign must actively apply each floor's primary theme to generated rooms");
assert.match(campaignSource,/floor===CFG\.maxFloors/,"final Sigil ownership must follow the configured maximum floor rather than hard-coded Floor 5");
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
assert.match(gameplaySource,/TRICK! THE BRIDGE COLLAPSES/,"the weight bridge must collapse after the empty-handed crossing");
assert.match(gameplaySource,/function spawnBridgeThief/,"bridge trick must spawn a Dungeon Thief elsewhere on the floor");
assert.match(gameplaySource,/BRIDGE SWITCH — SHOOT IT/,"the far-side rebuild switch must explicitly require a shot");
assert.match(gameplaySource,/BRIDGE EMERGENCY AMMO/,"the bridge puzzle must spawn emergency ammunition when the player reaches the switch dry");
assert.match(gameplaySource,/bridgeStashedItems/,"items dropped for the weight bridge must become the thief's stolen stash rather than remaining safely behind");
assert.match(localRuntimeSource,/function releaseBridgeThiefStash/,"defeating the Dungeon Thief must have an authoritative stash-release owner");
assert.match(localRuntimeSource,/target\.bridgeThiefRecovered=true/,"the entire stolen stash must be reactivated as recoverable floor items when the thief dies");
assert.match(renderSource,/BRIDGE COLLAPSED — SHOOT THE FAR-SIDE SWITCH/,"collapsed bridge state must be visually explained in-world");
assert.match(renderSource,/BRIDGE SWITCH — SHOOT TO DEPLOY/,"the rebuild switch must be labelled as a shooting interaction");
assert.match(bootstrap,/v10-42-r115-floor-trials\.js","CCGLostSizzlerV142R115FloorTrials"/,"R115 floor trials must load through the ordered canonical bootstrap");
for(const [floor,id] of [[6,"tape-relays"],[7,"crypt-braziers"],[8,"arena-lockdown"],[9,"timed-lockdown"],[11,"coolant-valves"],[13,"high-score-hunt"],[14,"crt-sequence"]]){
  assert.match(floorTrials,new RegExp(`${floor}:Object\\.freeze\\(\\{id:"${id}"`),`Floor ${floor} must own its distinct R115 trial identity`)
}
assert.match(floorTrials,/target:10/,"Floor 7 crypt trial must require all ten braziers");
assert.match(floorTrials,/addSupplies\(worldState,hostState,runState,"torch",4,"crypt-torch"\)/,"the ten-brazier trial must guarantee enough trial torches to avoid a resource softlock");
assert.match(floorTrials,/addSupplies\(worldState,hostState,runState,"ammo",2,"coolant-ammo"\)/,"the coolant-valve trial must provide emergency ammunition");
assert.match(floorTrials,/addSupplies\(worldState,hostState,runState,"ammo",2,"crt-ammo"\)/,"the CRT sequence must provide emergency ammunition");
assert.match(floorTrials,/existing&&String\(e\.id\|\|""\)\.startsWith\("crt-sequence-fail-"\)/,"CRT wrong-order punishment must be bounded to one active guard");
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
console.log("Dungeon Carnage R87 fifteen-floor campaign and floor-theme contract passed.");
