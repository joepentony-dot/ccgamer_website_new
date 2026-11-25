import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

// Execute the actual ordered configuration, progression, field reward and
// hunt guidance owners together. No fabricated second-charge inventory stack.
const context={
  window:{},console,run:{floor:6,stats:{},v142SealFragments:8},
  host:{generators:[{alive:false}],shrines:[{active:false}],memoryPuzzle:{solved:true}},
  p1:{inventory:[],inventorySlots:3,banishmentEssence:0},mode:"playing",
  UI:{quickSpecials:{textContent:"WARD BREAK 0"}},ticks:[],
  clearInterval(){},addEventListener(){},showToast(){},broadcastWorld(){},sync(){},
  S:{sfx(){}}
};
context.setInterval=fn=>(context.ticks.push(fn),context.ticks.length);
vm.createContext(context);
for(const name of ["config","progression","v10-42-warden-charge-routes","v10-42-warden-hunt-guidance"]){
  vm.runInContext(fs.readFileSync(new URL("../js/"+name+".js",import.meta.url),"utf8"),context,{filename:name+".js"});
}
const {run,host,p1}=context,route=context.window.CCGLostSizzlerV142WardenChargeRoutes,
  hunt=context.window.CCGLostSizzlerV142WardenHuntGuidance,PGR=context.window.CCGProgression;
const tick=()=>context.ticks.forEach(fn=>fn());
assert.equal(context.window.CCG_CONFIG.maxFloors,15);
for(let floor=6;floor<=15;floor++){
  run.floor=floor;tick();
  assert.equal(route.routeStatus(floor,run),"WARD ROUTE: ALCHEMIST","Later depths must advertise the actual alchemy route");
  assert.match(context.UI.quickSpecials.textContent,/WARD ROUTE: ALCHEMIST/);
  assert.match(hunt.routeInstruction(floor,run,p1),/No additional field-charge challenge on this floor/);
  assert.match(hunt.floorBriefText(floor,run,p1),/distil a Ward-Break Charge at an Alchemist/);
  assert.equal(route.state(floor,run),null,"Unsupported depths must not manufacture an impossible route record");
  assert.equal(run.v142WardChargeRoutes[String(floor)],undefined);
  assert.equal(route.unlockRoute(floor,host,run),false);
  assert.equal(route.deliverRoute(floor,p1,run),false);
  assert.equal(PGR.inventoryKindCount(p1,"banishment"),0);
}
for(let floor=2;floor<=5;floor++){
  run.v142WardChargeRoutes[String(floor)]={floor,routeId:route.routes[floor].id,unlocked:true,delivered:true,pending:false,rewardType:"charge"};
  assert.match(hunt.routeInstruction(floor,run,p1),/charge already claimed/,"A spent field charge cannot be advertised as a repeatable challenge");
  assert.match(hunt.routeInstruction(floor,run,p1),/distil another Ward-Break Charge/);
  assert.equal(route.unlockRoute(floor,host,run),false);
  assert.equal(route.deliverRoute(floor,p1,run),false);
}
assert.equal(hunt.routeInstruction(1,run,p1),"Baseline route: collect Banishment Essence and distil a Ward-Break Charge at an Alchemist.");
// Preserve a genuine earlier reward across later depths and JSON restoration.
// An old phantom Floor 6 baseline record must not unlock or yield a charge.
run.floor=12;
run.v142WardChargeRoutes["6"]={floor:6,routeId:"alchemist-baseline",unlocked:false,delivered:false,pending:false,rewardType:null};
run.v142WardChargeRoutes["4"]={floor:4,routeId:"ashen-catalyst",unlocked:true,delivered:false,pending:true,rewardType:null};
context.run=JSON.parse(JSON.stringify(run));
assert.match(hunt.routeInstruction(12,context.run,p1),/reserved/);
assert.equal(route.reservedStatus(context.run,12),"RESERVED F4");
tick();
assert.equal(PGR.inventoryKindCount(p1,"banishment"),1);
assert.equal(context.run.v142WardChargeRoutes["4"].delivered,true);
assert.equal(context.run.v142WardChargeRoutes["4"].pending,false);
assert.equal(route.reservedStatus(context.run,12),"");
assert.match(hunt.routeInstruction(12,context.run,p1),/Ward-Break Charge ready/);
tick();
assert.equal(PGR.inventoryKindCount(p1,"banishment"),1,"No duplicate delivery");
assert.equal(context.run.v142WardChargeRoutes["6"].delivered,false);
assert.equal(p1.banishmentEssence,0);
console.log("PASS R187 all fifteen-floor Ward-Break guidance, consumed field rewards, later-floor alchemy and saved reservation delivery");
