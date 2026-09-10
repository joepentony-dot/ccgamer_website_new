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
assert.match(diagnostics,/rafAcceptedRate/,"diagnostics must measure the accepted RAF cadence independently of update cadence");
assert.match(diagnostics,/maxSampleGapMs/,"diagnostics must expose main-thread sampling stalls");
assert.match(diagnostics,/ownerChangeLog/,"diagnostics must retain runtime ownership changes");
assert.match(diagnostics,/lifecycleLog/,"diagnostics must retain focus and visibility transitions");
assert.match(diagnostics,/OWNER_DEPTH_LIMIT=128/,"diagnostics must observe wrapper depth well beyond the historical 32-layer truncation");
assert.match(diagnostics,/OWNER_SIGNATURE_LIMIT=24/,"deep ownership signatures must remain bounded even while full depth is counted");
assert.match(diagnostics,/ownerMarkerCount/,"diagnostics must count retained historical owner markers through the wrapper ancestry");
assert.match(diagnostics,/loopOwnerDepth/,"diagnostics must expose RAF-owner wrapper depth");
assert.match(diagnostics,/updateOwnerDepth/,"diagnostics must expose update-owner wrapper depth");
assert.match(diagnostics,/moveOwnerDepth/,"diagnostics must expose movement-owner wrapper depth");
assert.match(diagnostics,/damageOwnerDepth/,"diagnostics must expose damage-owner wrapper depth");
assert.match(diagnostics,/damageR29Layers/,"diagnostics must count retained R29 damage-owner layers");
assert.match(diagnostics,/damageR56Layers/,"diagnostics must count retained R56 damage-owner layers");
assert.match(diagnostics,/damageR60Layers/,"diagnostics must count retained R60 damage-owner layers");
assert.match(diagnostics,/sharedFrameBoundaryReassertions/,"diagnostics must record shared update-owner reassertions");
assert.match(diagnostics,/ownedSystemReassertions/,"diagnostics must record mode-owned system reassertions");
assert.match(diagnostics,/r29FrameStalls/,"diagnostics must correlate r29 frame stalls");
assert.match(diagnostics,/r30OwnershipRepairs/,"diagnostics must correlate r30 ownership repairs");
assert.match(diagnostics,/r30WatchdogRecoveries/,"diagnostics must correlate held-key watchdog recoveries");
assert.match(diagnostics,/ownerSealRepairs/,"diagnostics must expose the 16 ms movement owner seal activity");
assert.match(diagnostics,/ownerSealBlockedWrites/,"diagnostics must expose blocked movement-owner replacements");
assert.match(diagnostics,/r59AcceptedFrames/,"diagnostics must correlate r59 accepted RAF frames");
assert.match(diagnostics,/r59PauseBoundaries/,"diagnostics must correlate r59 pause boundaries");
assert.match(diagnostics,/r59SuppressRecoveryUntil/,"diagnostics must expose the r59 pause recovery guard window");
assert.match(diagnostics,/r59SoloSubsteps/,"diagnostics must expose bounded Solo simulation substeps");
assert.match(diagnostics,/r59SoloCatchupFrames/,"diagnostics must expose how often Solo needs more than one simulation substep per render");
assert.match(diagnostics,/r59SoloDiscardedVisibleMs/,"diagnostics must expose active visible wall time discarded by the Solo catch-up ceiling");
assert.match(diagnostics,/r59SoloLastSteps/,"diagnostics must expose the most recent Solo substep count");
assert.match(diagnostics,/setInterval\(sample,SAMPLE_MS\)/,"diagnostics must use only its bounded passive sampling interval");

const forbiddenMutations=[
  /window\.loop\s*=/,
  /window\.update\s*=/,
  /window\.movePlayer\s*=/,
  /window\.hurtPlayer\s*=/,
  /window\.openChest\s*=/,
  /window\.tryChest\s*=/,
  /Object\.defineProperty\s*\(\s*window/,
  /\bmove1\s*[+\-*/]?=/,
  /\bmove2\s*[+\-*/]?=/,
  /\bfire1\s*[+\-*/]?=/,
  /\bfire2\s*[+\-*/]?=/,
  /\bprojectileCD\s*[+\-*/]?=/,
  /\benemyCD\s*[+\-*/]?=/,
  /requestAnimationFrame\s*\(/,
  /cancelAnimationFrame\s*\(/,
  /setTimeout\s*\(/
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

console.log("Lost Sizzler Solo stability diagnostics passive-observer contract passed with deep owner and bounded-clock telemetry.");
