import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source=readFileSync(new URL("../js/game-play.js",import.meta.url),"utf8");
const start=source.indexOf("function floatText(");
const end=source.indexOf("\nfunction muzzle(",start);
assert.ok(start>=0&&end>start,"Load the actual canonical pickup floater source");

let now=1000;
const scope={
  floaters:[],
  C:{tile:32},
  P:{white:"#ffffff",gold:"#ffd700"},
  performance:{now:()=>now}
};
vm.createContext(scope);
vm.runInContext(source.slice(start,end),scope,{filename:"game-play.js::pickup-floaters"});

const p1={id:"player-one",x:5,y:6},p2={id:"player-two",x:5,y:6};
scope.floatPickupText(p1,"ammunition");
assert.equal(scope.floaters.length,1);
assert.equal(scope.floaters[0].text,"AMMUNITION");
assert.equal(scope.floaters[0].pickupCount,1);
assert.equal(scope.floaters[0].ownerId,p1.id);

now+=100;
scope.floatPickupText(p1,"ammunition");
now+=100;
scope.floatPickupText(p1,"ammunition");
assert.equal(scope.floaters.length,1,"Three genuine rapid pickups must render as one label");
assert.equal(scope.floaters[0].text,"AMMUNITION ×3","The visible label must retain the true event count");
assert.equal(scope.floaters[0].pickupCount,3);
assert.equal(scope.floaters[0].life,1250,"A new pickup must refresh the label lifetime");

scope.floatPickupText(p1,"armour");
assert.equal(scope.floaters.length,2,"Different pickups must not be merged");
assert.equal(scope.floaters[1].text,"ARMOUR");
scope.floatText(5,6,"+100 XP",scope.P.white);
assert.equal(scope.floaters.length,3,"Combat and XP floaters must remain untouched");
assert.equal(scope.floaters[2].text,"+100 XP");
assert.equal(scope.floaters[2].pickup,false);

scope.floatPickupText(p2,"ammunition");
assert.equal(scope.floaters.length,4,"Other players must retain separate pickup labels");
assert.equal(scope.floaters[3].ownerId,p2.id);
now+=451;
scope.floatPickupText(p1,"ammunition");
assert.equal(scope.floaters.length,5,"Pickups outside the burst window must appear separately");
assert.equal(scope.floaters[4].text,"AMMUNITION");

scope.floaters[4].life=0;
now+=10;
scope.floatPickupText(p1,"ammunition");
assert.equal(scope.floaters.length,6,"Expired pickup labels must not be revived");
assert.equal(scope.floaters[5].pickupCount,1);

scope.floatPickupText(null,"ammunition");
scope.floatPickupText(p1,"");
assert.equal(scope.floaters.length,6,"Invalid pickup requests must not create effects");

console.log("R150 source-executed pickup floater aggregation: 14 assertions passed");
