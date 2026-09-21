import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const source=fs.readFileSync(new URL("js/v10-42-r47-depth-polish.js",root),"utf8");

assert.match(source,/presentationOnly:true/);
for(const owner of ["simulationOwnership","collisionOwnership","combatOwnership","progressionOwnership","saveOwnership","economyOwnership"]){
  assert.match(source,new RegExp(owner+":false"),owner+" must remain false");
}
assert.doesNotMatch(source,/setInterval\(|requestAnimationFrame\(/,"r47 depth polish must not create a perpetual render or polling loop");
assert.match(source,/v141R47PerformanceTier/,"r47 depth polish must respect the existing performance tier");
assert.match(source,/__ccgV142R47Depth/,"r47 must wrap established render owners rather than replacing core rendering");
assert.match(source,/window\.drawItem=wrapped/);
assert.match(source,/window\.drawChests=wrapped/);
assert.match(source,/window\.renderView=wrapped/);

console.log("Dungeon Carnage r47 depth and loot readability prep contract passed.");
