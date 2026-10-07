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
assert.equal(floors[13].challenge,"arenaTimed","Floor 14 must require the combined arena/timed challenge");
assert.equal(floors[14].challenge,"boss","Floor 15 must culminate in the grotesque boss challenge");
assert.match(coreSource,/function floorChallengeComplete\(spec,explorePct=0\)/,"featured floor challenges must have one derived completion owner");
assert.match(coreSource,/r114-floor-challenge-cache-f/,"featured floor challenges must create a high-tier reward cache");
assert.match(coreSource,/FLOOR CHALLENGE COMPLETE/,"featured floor challenges must announce completion and reward");

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

for(const html of [canonical,alias]){
  assert.match(html,/fifteen procedural floors/i,"public metadata must advertise the fifteen-floor campaign");
  assert.match(html,/15-FLOOR RUN/,"public menu must advertise the fifteen-floor run");
}
console.log("Dungeon Carnage R87 fifteen-floor campaign and floor-theme contract passed.");
