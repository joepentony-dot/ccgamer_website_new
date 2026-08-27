import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const combat=fs.readFileSync(path.join(root,"js/v10-41-horde-combat-polish.js"),"utf8");
const controller=fs.readFileSync(path.join(root,"js/v10-41-mode-runtime.js"),"utf8");

assert.doesNotMatch(combat,/window\.update\s*=\s*function\s+updateV141HordeCombatPolish/,"Horde combat polish must not intercept the shared update function");
assert.match(combat,/controllerOwnedUpdate:true/,"Horde combat polish must declare controller-owned update work");
assert.match(combat,/function preHordeCombatFrame\(\)/,"combat polish must expose its pre-frame phase");
assert.match(combat,/function postHordeCombatFrame\(context\)/,"combat polish must expose its post-frame phase");
assert.match(combat,/context=\{previousPhase:/,"pre-frame phase must retain transition state across the engine frame");
assert.match(combat,/snapshotApproachSteps\(\)/,"pre-frame phase must preserve Horde enemy positions for sidestep filtering");
assert.match(combat,/filterRapidSideSteps\(context\?\.before\|\|null,Date\.now\(\)\)/,"post-frame phase must consume the pre-frame enemy snapshot");
assert.match(controller,/const combat=window\.CCGLostSizzlerV141HordeCombatPolish\?\.preHordeCombatFrame/,"controller must dispatch combat pre-frame work before the shared engine");
assert.match(controller,/const context=preSharedFrame\(dt\);[\s\S]*source\.apply\(this,arguments\);[\s\S]*postSharedFrame\(dt,context\)/,"controller must preserve pre → engine → post ordering");
assert.match(controller,/CCGLostSizzlerV137\?\.updateHordeFocus[\s\S]*CCGLostSizzlerV138\?\.updateHordeLive[\s\S]*CCGLostSizzlerV141HordeCombatPolish\?\.postHordeCombatFrame/,"Horde post-frame order must remain focus → live movement → combat polish");

console.log("Lost Sizzler Horde combat controller pre/post frame contract passed.");
