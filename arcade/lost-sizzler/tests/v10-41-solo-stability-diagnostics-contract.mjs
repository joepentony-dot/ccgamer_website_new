import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const diagnosticsPath=path.join(root,"js","v10-41-solo-stability-diagnostics.js");
const loaderPath=path.join(root,"js","v10-41-r30-buglog.js");

assert.ok(fs.existsSync(diagnosticsPath),"Solo stability diagnostics module must exist");
assert.ok(fs.existsSync(loaderPath),"r30 late loader must exist");

const diagnostics=fs.readFileSync(diagnosticsPath,"utf8");
const loader=fs.readFileSync(loaderPath,"utf8");

assert.match(loader,/v10-41-solo-stability-diagnostics\.js/,"r30 late loader must request the Solo diagnostics module");
assert.match(loader,/data-ccg-solo-stability-diagnostics/,"Solo diagnostics loader must use a unique script marker");
assert.match(loader,/loadSoloDiagnostics\(\)/,"Solo diagnostics loader must be invoked during late-load setup");

assert.match(diagnostics,/CCGLostSizzlerSoloDiagnostics/,"diagnostics API must be exported for browser/playtest inspection");
assert.match(diagnostics,/simulationRatio/,"diagnostics must record simulated-time versus active-wall-time ratio");
assert.match(diagnostics,/ownerChangeLog/,"diagnostics must retain runtime ownership changes");
assert.match(diagnostics,/sharedFrameBoundaryReassertions/,"diagnostics must record shared update-owner reassertions");
assert.match(diagnostics,/ownedSystemReassertions/,"diagnostics must record mode-owned system reassertions");
assert.match(diagnostics,/r29FrameStalls/,"diagnostics must correlate r29 frame stalls");
assert.match(diagnostics,/setInterval\(sample,SAMPLE_MS\)/,"diagnostics must use only its bounded passive sampling interval");

const forbiddenMutations=[
  /window\.update\s*=/,
  /window\.movePlayer\s*=/,
  /window\.hurtPlayer\s*=/,
  /window\.openChest\s*=/,
  /window\.tryChest\s*=/,
  /\bmove1\s*[+\-*/]?=/,
  /\bmove2\s*[+\-*/]?=/,
  /\bfire1\s*[+\-*/]?=/,
  /\bfire2\s*[+\-*/]?=/,
  /\bprojectileCD\s*[+\-*/]?=/,
  /\benemyCD\s*[+\-*/]?=/,
  /requestAnimationFrame\s*\(/,
  /cancelAnimationFrame\s*\(/
];
for(const pattern of forbiddenMutations){
  assert.doesNotMatch(diagnostics,pattern,`diagnostics must remain passive and must not match ${pattern}`);
}

const gameplayCalls=[
  /\bmovePlayer\s*\(/,
  /\bhurtPlayer\s*\(/,
  /\bopenChest\s*\(/,
  /\btryChest\s*\(/,
  /\bstepProjectiles\s*\(/,
  /\bhostEnemyStep\s*\(/
];
for(const pattern of gameplayCalls){
  assert.doesNotMatch(diagnostics,pattern,`diagnostics must not execute gameplay behaviour: ${pattern}`);
}

const intervalCalls=[...diagnostics.matchAll(/setInterval\s*\(/g)];
assert.equal(intervalCalls.length,1,"diagnostics must install exactly one passive sampling interval");

console.log("Lost Sizzler Solo stability diagnostics passive-observer contract passed.");
