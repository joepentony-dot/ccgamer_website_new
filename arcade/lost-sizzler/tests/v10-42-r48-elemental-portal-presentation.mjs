import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const bootstrap=fs.readFileSync(new URL("js/v10-42-bootstrap.js",root),"utf8");
const portal=fs.readFileSync(new URL("js/v10-42-r48-elemental-portal-presentation.js",root),"utf8");
const version=JSON.parse(fs.readFileSync(new URL("version.json",root),"utf8"));

assert.equal(version.build,"V10.42 r56");
assert.equal(version.cacheToken,"20260924r56");
const visual=bootstrap.indexOf('v10-42-r46-final-visual-polish.js');
const r48=bootstrap.indexOf('v10-42-r48-elemental-portal-presentation.js');
const tutorial=bootstrap.indexOf('v10-42-tutorial-campaign.js');
assert.ok(visual>=0&&r48>visual&&tutorial>r48,"elemental portal presentation must wrap the final visual renderer before later gameplay-support modules");
assert.match(portal,/presentationOnly:true/);
for(const owner of ["simulationOwnership","progressionOwnership","collisionOwnership","combatOwnership","aiOwnership","saveOwnership","economyOwnership"]){
  assert.match(portal,new RegExp(owner+":false"),owner+" must remain false");
}
assert.doesNotMatch(portal,/setInterval\(|requestAnimationFrame\(/,"portal presentation must not add a perpetual timer or render loop");
assert.match(portal,/routeForFloor/,"portal presentation must consume the established elemental portal route");
assert.match(portal,/host\?\.exitOpen/,"portal presentation must only decorate the established open exit");
assert.match(portal,/__ccgV142R48PortalPresentation/,"portal presentation must wrap the established render owner");
assert.match(portal,/v141R47PerformanceTier/,"portal presentation must respect the established performance tier");
for(const element of ["water","fire","earth","air"])assert.match(portal,new RegExp('"'+element+'"'),element+" portal motif must be represented");
console.log("Dungeon Carnage R54 retained elemental portal presentation contract passed.");
