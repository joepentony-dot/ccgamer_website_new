import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const core=fs.readFileSync(new URL("js/game-core.js",root),"utf8");
const r19=fs.readFileSync(new URL("js/v10-42-r19-mobile-trap-layout-stability.js",root),"utf8");
const reporter=fs.readFileSync(new URL("js/v10-42-bug-reporter.js",root),"utf8");

assert.match(core,/MAX_GAMEPLAY_FLOATERS=96/,"R64 must hard-cap floaters as well as particles/rings");
assert.match(core,/currentVisualHardCap\(MAX_GAMEPLAY_PARTICLES,260,180\)/,"severe-mode particle cap must be immediate");
assert.match(core,/currentVisualHardCap\(MAX_GAMEPLAY_RINGS,52,36\)/,"severe-mode ring cap must be immediate");
assert.match(core,/currentVisualHardCap\(MAX_GAMEPLAY_FLOATERS,72,48\)/,"severe-mode floater cap must be immediate");

assert.match(r19,/function serviceTrapLiveness\(\)/,"R64 must restore an independent trap liveness scheduler");
assert.match(r19,/const api=core\(\),fn=api\?\.updateTrapContacts/,"trap liveness must delegate into the captured R58 authoritative trap core");
assert.match(r19,/Boolean\(fn\("monitor"\)\)/,"trap monitor must invoke canonical updateTrapContacts in monitor mode");
assert.doesNotMatch(r19,/\bhurtPlayer\s*\(/,"layout/liveness compatibility must not implement its own player damage");
assert.doesNotMatch(r19,/\bp\.health\s*[-+]?=/,"layout/liveness compatibility must not mutate player HEALTH directly");

assert.match(reporter,/soloRuntime:safe\(\(\)=>window\.CCGLostSizzlerSoloDiagnostics\?\.snapshot/,"bug reporter must capture Solo scheduler diagnostics");
assert.match(reporter,/authoritativeFire:safe\(\(\)=>/,"bug reporter must export authoritative FIRE trace evidence");
assert.match(reporter,/ANOMALY_SIMULATION_STALL/,"bug reporter must identify visible/focused simulation stalls");
assert.match(reporter,/shotComplete=newFireTrace\.some/,"FIRE probes must use authoritative shot-completion evidence");
assert.match(reporter,/FX\/live arrays:/,"text report must expose live FX array counts");
assert.match(reporter,/FIRE trace tail:/,"text report must expose the recent authoritative FIRE trace");

console.log("PASS Dungeon Carnage R64 runtime freeze, trap liveness and diagnostics contract");
