import assert from "node:assert/strict";
import fs from "node:fs";
const root=new URL("../",import.meta.url);
const src=fs.readFileSync(new URL("js/v10-42-attack-hold-liveness.js",root),"utf8");

assert.match(src,/pressVerifications:0/);
assert.match(src,/pressRecoveries:0/);
assert.match(src,/function attackSnapshot\(\)/);
assert.match(src,/function verifyFreshPress\(code,before\)/);
assert.match(src,/const handled=after\.mana<before\.mana\|\|after\.shots>before\.shots\|\|after\.fire>0\|\|after\.buffer>0/);
assert.match(src,/CCGLostSizzlerV142R20LiveRegressionStability/);
assert.match(src,/r20\.attackNow\(code\)/);
assert.match(src,/const fresh=!event\.repeat&&!held\.has\(event\.code\)/);
assert.match(src,/if\(fresh\)verifyFreshPress\(event\.code,before\)/);
assert.doesNotMatch(src,/KeyF/,"F must remain reserved for fullscreen and must not become an attack key");

console.log("PASS V10.42 R51 fresh FIRE press recovery contract");
