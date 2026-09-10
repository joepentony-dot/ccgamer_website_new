import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../js/v10-42-warden-hunt-guidance.js",import.meta.url),"utf8");
const toasts=[];
const player={name:"TESTER",x:9,y:9,inventory:[]};
const run={floor:2,v142SealFragments:2,v142WardenFloors:{"2":{floor:2,available:true,resolved:false,killFragmentAwarded:false,cacheFragmentAwarded:false}},v142WardChargeRoutes:{"2":{floor:2,routeId:"capacitor-core",unlocked:false,delivered:false,pending:false}}};
const host={exitOpen:true,v142WardenDomain:{floor:2,profileName:"IRON SURGE",active:true}};
const world={exit:{x:9,y:9}};
const UI={quests:{innerHTML:""},floorSummary:{innerHTML:"BASE FLOOR SUMMARY"}};
const routeApi={routes:{
  1:{name:"ALCHEMIST ROUTE",objective:"Distil Banishment Essence at the sanctuary Alchemist."},
  2:{name:"CAPACITOR CORE",objective:"Destroy any monster generator on this depth."},
  3:{name:"ARENA SEAL",objective:"Clear both waves of the sealed arena."},
  4:{name:"ASHEN CATALYST",objective:"Invoke any shrine on this depth."},
  5:{name:"SEAL FORGE",objective:"Enter Floor 5 carrying at least 6 Seal Fragments."}
}};
const progression={firstInventory:(p,kind)=>(p.inventory||[]).findIndex(item=>item?.kind===kind)};
let startCalls=0,questCalls=0,floorCalls=0;
const context={
  console,window:{},run,host,world,p1:player,p2:null,mode:"playing",UI,S:{sfx:()=>{}},
  showToast:(title,text,tone,duration)=>toasts.push({title,text,tone,duration}),
  updateQuests:()=>{questCalls++;UI.quests.innerHTML="<div>BASE QUEST</div>"},
  startWorld:()=>{startCalls++;return true},
  floorComplete:by=>{floorCalls++;return`BASE FLOOR COMPLETE:${by}`}
};
context.window.CCG_CONFIG={maxFloors:5};
context.window.CCGProgression=progression;
context.window.CCGLostSizzlerV142WardenChargeRoutes=routeApi;
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-42-warden-hunt-guidance.js"});

const api=context.window.CCGLostSizzlerV142WardenHuntGuidance;
assert.ok(api,"Warden hunt guidance API should install");
context.updateQuests();
assert.equal(questCalls,1,"Guidance should preserve the existing quest renderer");
assert.match(UI.quests.innerHTML,/BASE QUEST/,"Guidance must preserve existing quest content");
assert.match(UI.quests.innerHTML,/OPTIONAL WARDEN — IRON SURGE/,"Floor 2 should add a visible Iron Surge Warden contract");
assert.match(UI.quests.innerHTML,/PREPARE WARD BREAK/,"A player without a charge should see the preparation state");
assert.match(UI.quests.innerHTML,/Destroy any monster generator on this depth/,"The optional quest should expose the floor-specific field route");
assert.match(UI.quests.innerHTML,/\+10% maximum HP and \+1 armour/,"The optional quest should state the persistent Warden Debt penalty before the player skips it");
assert.equal(api.playerExitContact("TESTER"),true,"A named local player standing on the open floor exit should own Warden exit confirmation");

const unresolvedFirst=context.floorComplete("TESTER");
assert.equal(unresolvedFirst,false,"First exit contact with an unresolved Warden should stop floor completion");
assert.equal(floorCalls,0,"The unresolved-Warden warning must fire before the underlying floor completion can record a skip");
assert.ok(host.v142WardenExitConfirm,"The first blocked exit should arm an explicit second-entry confirmation");
assert.match(toasts.at(-1)?.title||"",/WARDEN BUSINESS REMAINS/,"Blocked exit should show a dedicated Warden warning");
assert.match(toasts.at(-1)?.text||"",/WARDEN UNRESOLVED/,"Exit warning should identify the unresolved Warden");
assert.match(toasts.at(-1)?.text||"",/\+10% maximum HP and \+1 armour/,"Exit warning should state the exact Warden Debt consequence");
assert.match(toasts.at(-1)?.text||"",/enter it again within 12 seconds/i,"Exit warning should explain the opt-in second-entry confirmation");
const unresolvedSecond=context.floorComplete("TESTER");
assert.equal(unresolvedSecond,"BASE FLOOR COMPLETE:TESTER","Second exit entry inside the confirmation window should preserve player choice and complete the floor");
assert.equal(floorCalls,1,"Confirmed unresolved exit should call the underlying floor completion exactly once");
assert.equal(host.v142WardenExitConfirm,undefined,"Consumed exit confirmation should not remain armed");

context.startWorld();
assert.equal(startCalls,1,"Guidance should preserve the existing world-start handler");
assert.deepEqual([...run.v142WardenBriefedFloors],[2],"The first Floor 2 start should persist one briefing marker");
assert.equal(toasts.filter(row=>/OPTIONAL WARDEN CONTRACT/.test(row.title)).length,1,"Floor 2 should announce its Warden contract once");
context.startWorld();
assert.equal(startCalls,2,"Repeated world starts must still call the underlying start handler");
assert.equal(toasts.filter(row=>/OPTIONAL WARDEN CONTRACT/.test(row.title)).length,1,"Same-floor rebuilds must not repeat the Warden briefing");

player.inventory=[{kind:"banishment"}];
context.updateQuests();
assert.match(UI.quests.innerHTML,/WARD BREAK READY/,"Carrying a charge should move the contract to Ward Break ready");
assert.match(UI.quests.innerHTML,/break its immunity with B, then kill it normally/i,"Ward Break ready copy should explain the two-stage fight");

player.inventory=[];
run.v142WardChargeRoutes["2"].unlocked=true;
run.v142WardChargeRoutes["2"].pending=true;
context.updateQuests();
assert.match(UI.quests.innerHTML,/FIELD CHARGE RESERVED/,"A full-inventory field reward should be visible as reserved");
assert.match(UI.quests.innerHTML,/later floor/i,"Reserved reward copy should explain cross-floor delivery");

run.v142WardenFloors["2"].resolved=true;
run.v142WardenFloors["2"].killFragmentAwarded=true;
run.v142WardChargeRoutes["2"].pending=false;
context.updateQuests();
assert.match(UI.quests.innerHTML,/WARDEN CLEANSED — CACHE FRAGMENT UNCLAIMED/,"Killing the Warden should point the player toward the second Seal Fragment");
assert.doesNotMatch(UI.quests.innerHTML,/v142-warden-contract quest-done/,"The contract should remain incomplete until the Warden Cache fragment is claimed");

const cacheFirst=context.floorComplete("TESTER");
assert.equal(cacheFirst,false,"First exit contact with an unclaimed Warden Cache fragment should stop floor completion");
assert.equal(floorCalls,1,"Cache warning must fire before calling the underlying floor completion again");
assert.match(toasts.at(-1)?.text||"",/WARDEN CACHE UNCLAIMED/,"Exit warning should identify the missing second Seal Fragment");
assert.match(toasts.at(-1)?.text||"",/left behind/,"Cache warning should state that the fragment is lost by leaving");
const cacheSecond=context.floorComplete("TESTER");
assert.equal(cacheSecond,"BASE FLOOR COMPLETE:TESTER","Second exit entry should allow the player to knowingly abandon the cache fragment");
assert.equal(floorCalls,2,"Confirmed cache abandonment should call the underlying floor completion once");

run.v142WardenFloors["2"].cacheFragmentAwarded=true;
context.updateQuests();
assert.match(UI.quests.innerHTML,/WARDEN LEGACY COMPLETE/,"Claiming both fragments should complete the Warden legacy contract");
assert.match(UI.quests.innerHTML,/v142-warden-contract quest-done/,"Completed Warden legacy should render as a completed optional quest");
assert.match(UI.quests.innerHTML,/2\/2 Seal Fragments/,"Completed contract should report both floor fragments secured");
const completedExit=context.floorComplete("TESTER");
assert.equal(completedExit,"BASE FLOOR COMPLETE:TESTER","A fully completed Warden legacy should never require an extra exit confirmation");
assert.equal(floorCalls,3,"Completed Warden legacy should pass straight through to floor completion");

run.v142WardChargeRoutes["2"].pending=true;
run.v142WardChargeRoutes["2"].delivered=false;
UI.floorSummary.innerHTML="BASE FLOOR SUMMARY";
const reservedOnlyExit=context.floorComplete("TESTER");
assert.equal(reservedOnlyExit,"BASE FLOOR COMPLETE:TESTER","A reserved field charge is safe and should not block floor completion");
assert.equal(floorCalls,4,"Reserved-only exit should call the underlying floor completion directly");
assert.match(UI.floorSummary.innerHTML,/WARD-BREAK REWARD RESERVED/,"Floor summary should make the safe carried reservation visible");
assert.match(UI.floorSummary.innerHTML,/auto-deliver on a later floor/,"Floor summary should explain cross-floor reservation delivery");
run.v142WardChargeRoutes["2"].pending=false;

run.floor=5;
run.v142WardenFloors["5"]={floor:5,available:true,resolved:false,killFragmentAwarded:false,cacheFragmentAwarded:false};
run.v142WardChargeRoutes["5"]={floor:5,routeId:"seal-forge",unlocked:false,delivered:false,pending:false};
context.updateQuests();
assert.match(UI.quests.innerHTML,/OPTIONAL WARDEN — SIGIL PRESSURE/,"Floor 5 should expose the Sigil Pressure Warden contract");
assert.match(UI.quests.innerHTML,/live corruption stack to the final encounter/,"Floor 5 briefing should explain direct final-encounter consequences");
assert.match(api.floorBriefText(5,run,player),/Warden Debt permanently gives later major guardians \+10% maximum HP and \+1 armour/,"Floor briefing text should state the exact skip consequence");

run.floor=3;
run.v142WardenFloors["3"]={floor:3,available:false,noWarden:true};
context.updateQuests();
assert.match(UI.quests.innerHTML,/NO WARDEN GENERATED/,"A floor without an available Warden should not imply a hunt is required");
assert.match(UI.quests.innerHTML,/quest-done/,"A no-Warden floor should render the optional contract as resolved rather than failed");
const noWardenExit=context.floorComplete("TESTER");
assert.equal(noWardenExit,"BASE FLOOR COMPLETE:TESTER","A no-Warden floor should never be blocked by Warden exit confirmation");
assert.equal(floorCalls,5,"No-Warden floor should pass directly to the underlying completion handler");

run.floor=2;
run.v142WardenFloors["2"]={floor:2,available:true,resolved:false,killFragmentAwarded:false,cacheFragmentAwarded:false};
player.x=8;player.y=9;
assert.equal(api.playerExitContact("TESTER"),false,"Off-exit lifecycle completion must not be treated as player exit contact");
const lifecycleExit=context.floorComplete("R42 REGRESSION");
assert.equal(lifecycleExit,"BASE FLOOR COMPLETE:R42 REGRESSION","Non-exit lifecycle completion must pass through the Warden confirmation wrapper");
assert.equal(floorCalls,6,"Lifecycle passthrough should call the underlying floor completion exactly once");
assert.equal(host.v142WardenExitConfirm,undefined,"Lifecycle passthrough must not arm Warden exit confirmation");

console.log("PASS v10-42 Warden hunt guidance + safe exit confirmation contract");
