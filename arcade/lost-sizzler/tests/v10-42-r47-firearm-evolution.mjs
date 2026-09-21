import assert from "node:assert/strict";
import fs from "node:fs";
const root=new URL("../",import.meta.url);
const src=fs.readFileSync(new URL("js/v10-42-r47-firearm-evolution.js",root),"utf8");
const bootstrap=fs.readFileSync(new URL("js/v10-42-bootstrap.js",root),"utf8");

assert.match(src,/1:2,2:3,3:4,4:5,5:6/,"floor progression caps changed unexpectedly");
assert.match(src,/Tri-Pulse I/);
assert.match(src,/shots:3/);
assert.match(src,/player\.ownedWeapons=\[clone\(canonical\)\]/,"only one firearm may remain owned");
assert.match(src,/FIREARM PARTS SALVAGED/,"capped pickups must still give a useful reward");
assert.match(src,/salvageAmmo/);
assert.match(src,/EVOLVING FIREARM/);
assert.doesNotMatch(src,/data-ccg-equip-weapon/,"r47 UI must not reintroduce weapon switching");
const clarity=bootstrap.indexOf('v10-42-owned-firearm-clarity.js');
const evolution=bootstrap.indexOf('v10-42-r47-firearm-evolution.js');
assert.ok(clarity>=0&&evolution>clarity,"single-firearm evolution must load after the legacy comparison layer");
console.log("Dungeon Carnage r47 single evolving firearm contract passed.");
