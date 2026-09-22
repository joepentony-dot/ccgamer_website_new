import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const bootstrap=fs.readFileSync(new URL("js/v10-42-bootstrap.js",root),"utf8");
const visual=fs.readFileSync(new URL("js/v10-42-r46-final-visual-polish.js",root),"utf8");
const css=fs.readFileSync(new URL("css/v10-42-r46-final-visual-polish.css",root),"utf8");
const gameplay=fs.readFileSync(new URL("js/game-play.js",root),"utf8");
const version=JSON.parse(fs.readFileSync(new URL("version.json",root),"utf8"));

assert.equal(version.build,"V10.42 r47");
assert.equal(version.cacheToken,"20260922r47");
const r16=bootstrap.indexOf('v10-42-r16-environment-presentation.js');
const r46=bootstrap.indexOf('v10-42-r46-final-visual-polish.js');
const tutorial=bootstrap.indexOf('v10-42-tutorial-campaign.js');
assert.ok(r16>=0&&r46>r16&&tutorial>r46,"r46 visual polish must consume established environment metadata before later gameplay support modules");
assert.match(visual,/presentationOnly:true/);
for(const owner of ["simulationOwnership","collisionOwnership","combatOwnership","progressionOwnership","saveOwnership","economyOwnership"]){
  assert.match(visual,new RegExp(owner+":false"),owner+" must remain false");
}
assert.doesNotMatch(visual,/setInterval\(|requestAnimationFrame\(/,"final visual polish must not add a perpetual animation/polling loop");
assert.match(visual,/__ccgV142R46FinalVisual/,"r46 must wrap established render owners instead of replacing core rendering");
assert.match(visual,/v141R47PerformanceTier/,"r46 must read the established performance tier through body.dataset");
assert.match(css,/data-v141-r47-performance-tier="severe"/,"severe performance mode must disable nonessential visual framing");
assert.match(gameplay,/spawnPuzzleAmbush\(z\.roomId,p,1,"torch-fail"\)/,"wrong Level 3 directional inputs must spawn exactly one monster");
assert.doesNotMatch(gameplay,/spawnPuzzleAmbush\(z\.roomId,p,3\+Math\.min\(2,z\.failures\),"torch-fail"\)/);

console.log("Dungeon Carnage r46 final visual polish and Level 3 penalty contract passed.");
