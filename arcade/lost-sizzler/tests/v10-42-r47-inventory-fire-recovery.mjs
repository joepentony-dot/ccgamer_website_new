import assert from "node:assert/strict";
import fs from "node:fs";
const root=new URL("../",import.meta.url);
const src=fs.readFileSync(new URL("js/v10-42-r47-inventory-fire-recovery.js",root),"utf8");
const bootstrap=fs.readFileSync(new URL("js/v10-42-bootstrap.js",root),"utf8");
assert.match(src,/gameplayOwnership:false/);
assert.match(src,/inputOwnership:false/);
assert.match(src,/fireOwnership:false/);
for(const owner of ["firePlayer","queueAttack","movePlayer","toggleInventory"]){
  assert.doesNotMatch(src,new RegExp(String.raw`\\b${owner}\\s*=`),`r47 recovery must not replace ${owner}`);
}
assert.match(src,/CCGLostSizzlerV142R20LiveRegressionStability/);
assert.match(src,/attackNow/);
assert.match(src,/MutationObserver/);
assert.match(src,/inventory-panel/);
assert.match(src,/validAttack/);
assert.match(src,/setTimeout\(\(\)=>\{/);
const r18=bootstrap.indexOf('v10-42-r18-solo-playtest-stability.js');
const recovery=bootstrap.indexOf('v10-42-r47-inventory-fire-recovery.js');
const reporter=bootstrap.indexOf('v10-42-bug-reporter.js');
assert.ok(r18>=0&&recovery>r18&&reporter>recovery,"r47 recovery must load after established stability owners and before diagnostics");
console.log("Dungeon Carnage r47 Inventory FIRE recovery ownership contract passed.");
