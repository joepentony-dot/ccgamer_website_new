import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../js/v10-42-warden-charge-routes.js",import.meta.url),"utf8");
let tick=null;
const toasts=[];
const player={inventory:[],banishmentEssence:0,forceFull:false};
const run={floor:2,stats:{},v142SealFragments:0,v142WardenFloors:{}};
let host={generators:[{id:"g2",alive:true}],arenas:[],shrines:[]};
const UI={quickSpecials:{textContent:"WARD BREAK 0"}};
const progression={
  firstInventory(p,kind){return (p.inventory||[]).findIndex(item=>item?.kind===kind)},
  inventoryCanAdd(p){return !p.forceFull},
  inventoryAdd(p,item){if(p.forceFull)return false;p.inventory=p.inventory||[];p.inventory.push({...item});return true}
};
const context={
  console,window:{},run,host,p1:player,mode:"playing",UI,
  S:{sfx:()=>{}},showToast:(title,text,tone,duration)=>toasts.push({title,text,tone,duration}),broadcastWorld:()=>{},sync:()=>{},
  setInterval:fn=>(tick=fn,1),clearInterval:()=>{},addEventListener:()=>{}
};
context.window.CCG_CONFIG={maxFloors:5};
context.window.CCGProgression=progression;
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-42-warden-charge-routes.js"});

const api=context.window.CCGLostSizzlerV142WardenChargeRoutes;
assert.ok(api,"Warden charge route API should install");
assert.equal(api.routeStatus(2,run),"WARD ROUTE: DESTROY GENERATOR","Floor 2 should advertise the generator route before completion");
assert.equal(player.inventory.length,0,"A live Floor 2 generator must not award a field charge");

context.host.generators[0].alive=false;
tick();
assert.equal(player.inventory.length,1,"Destroying a Floor 2 generator should award one field-ready charge");
assert.equal(player.inventory[0].kind,"banishment","The field reward should use the existing banishment inventory kind");
assert.equal(run.v142WardChargeRoutes["2"].delivered,true,"Floor 2 route delivery should persist in run state");
assert.equal(run.v142WardChargeRoutes["2"].rewardType,"charge","Floor 2 should record charge delivery");
assert.equal(run.stats.wardChargeRoutesUnlocked,1,"Unlock statistics should increment once");
assert.match(UI.quickSpecials.textContent,/CAPACITOR CORE → CHARGE EARNED/,"HUD should show the completed Floor 2 field route");

tick();
assert.equal(player.inventory.length,1,"Repeated route scans must not duplicate a delivered charge");
assert.equal(run.stats.wardChargeRoutesUnlocked,1,"Repeated scans must not duplicate unlock statistics");

context.host={generators:[{id:"rebuilt-g2",alive:false}],arenas:[],shrines:[]};
tick();
assert.equal(player.inventory.length,1,"Rebuilding the host on the same floor must not duplicate the persisted route reward");
assert.equal(run.stats.wardChargeRoutesUnlocked,1,"A same-floor host rebuild must preserve one unlock record");

run.floor=3;
context.host={generators:[],arenas:[{id:"arena3",cleared:true}],shrines:[]};
tick();
assert.equal(player.inventory.length,1,"An already-carried charge should prevent a second free charge stack");
assert.equal(player.banishmentEssence,1,"An already-carried charge should convert the Floor 3 route to +1 Essence");
assert.equal(run.v142WardChargeRoutes["3"].rewardType,"essence","Floor 3 should persist the conversion reward type");
assert.match(api.routeStatus(3,run),/ARENA SEAL → \+1 ESSENCE/,"Floor 3 HUD status should report Essence conversion");

tick();
assert.equal(player.banishmentEssence,1,"Repeated scans must not duplicate converted Essence");

run.floor=4;
context.host={generators:[],arenas:[],shrines:[{id:"shrine4",active:false}]};
player.inventory=[];
player.forceFull=true;
tick();
assert.equal(run.v142WardChargeRoutes["4"].unlocked,true,"Invoking a Floor 4 shrine should unlock the Ashen Catalyst route");
assert.equal(run.v142WardChargeRoutes["4"].pending,true,"A full inventory should reserve the earned Floor 4 charge");
assert.equal(run.v142WardChargeRoutes["4"].delivered,false,"A full inventory must not mark the reserved reward delivered");
assert.equal(player.inventory.length,0,"A full inventory should not lose or force-add the field charge");
assert.match(api.routeStatus(4,run),/ASHEN CATALYST READY/,"HUD should show that a reserved field reward is ready");

run.v142WardenFloors["4"]={resolved:true};
tick();
assert.equal(run.v142WardChargeRoutes["4"].resolvedWarningShown,true,"A reserved reward should remain tracked even if the floor Warden is cleansed first");

run.floor=5;
run.v142SealFragments=5;
context.host={generators:[],arenas:[],shrines:[]};
tick();
assert.equal(run.v142WardChargeRoutes["4"].pending,true,"A full-inventory Floor 4 reward should stay reserved after descending");
assert.equal(run.v142WardChargeRoutes["4"].delivered,false,"Descending must not silently discard or mark the reserved reward delivered");
assert.equal(api.reservedStatus(run,5),"RESERVED F4","Later-floor HUD should identify a carried pending route reward");
assert.match(UI.quickSpecials.textContent,/RESERVED F4/,"Later-floor quick status should expose the carried reservation");
assert.equal(api.conditionMet(5,context.host,run),false,"Five Seal Fragments must not unlock the Floor 5 Seal Forge");
assert.equal(run.v142WardChargeRoutes["5"].delivered,false,"Floor 5 should not deliver before Ward Temper is active");
assert.equal(api.routeStatus(5,run),"WARD ROUTE: SEALS 5/6","Floor 5 HUD should show Seal progress before the forge unlocks");

player.forceFull=false;
tick();
assert.equal(player.inventory.length,1,"Freeing an inventory slot on a later floor should automatically deliver the reserved Floor 4 charge");
assert.equal(run.v142WardChargeRoutes["4"].delivered,true,"Cross-floor delayed delivery should persist in run state");
assert.equal(run.v142WardChargeRoutes["4"].pending,false,"Cross-floor delayed delivery should clear the reservation");
assert.equal(api.reservedStatus(run,5),"","Delivered prior-floor rewards should disappear from reserved status");

run.v142SealFragments=6;
tick();
assert.equal(api.conditionMet(5,context.host,run),true,"Six Seal Fragments should unlock the Floor 5 Seal Forge");
assert.equal(player.inventory.length,1,"The Seal Forge should not stockpile a second free charge when a carried charge already exists");
assert.equal(player.banishmentEssence,2,"The Seal Forge should convert to +1 Essence when a carried charge already exists, without spending banked Essence");
assert.equal(run.v142WardChargeRoutes["5"].rewardType,"essence","Floor 5 should persist the converted reward type when a charge is already carried");
assert.match(api.routes[5].objective,/Floor 5 carrying at least 6 Seal Fragments/,"Floor 5 route copy should match its actual trigger");

assert.equal(api.routeStatus(1,run),"WARD ROUTE: ALCHEMIST","Floor 1 should remain the baseline Alchemist route");
assert.equal(api.unlockRoute(1,context.host,run),false,"Floor 1 baseline should not manufacture a free field-route unlock");
assert.equal(api.deliverRoute(1,player,run),false,"Floor 1 baseline should never deliver a free route reward");

assert.ok(toasts.some(row=>/INVENTORY FULL/.test(row.title)),"Inventory-full reservation should give explicit player feedback");
console.log("PASS v10-42 Warden charge routes contract");
