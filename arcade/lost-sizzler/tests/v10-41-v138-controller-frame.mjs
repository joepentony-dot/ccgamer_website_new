import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const live=fs.readFileSync(path.join(root,"js/v10-38-horde-live.js"),"utf8");
const controller=fs.readFileSync(path.join(root,"js/v10-41-mode-runtime.js"),"utf8");

assert.doesNotMatch(live,/window\.update\s*=\s*function\s+updateV138HordeLive/,"V10.38 must not intercept the shared update function");
assert.match(live,/controllerOwnedUpdate:true/,"V10.38 must declare controller ownership for its update-side work");
assert.match(live,/function updateHordeLive\(dt\)/,"V10.38 must expose one controller-callable live Horde frame function");
assert.match(live,/driveEnemies\(dt\)/,"V10.38 controller dispatch must preserve real per-frame dt for Horde approach timing");
assert.match(live,/function wrapRender\(/,"V10.38 Horde banner rendering must remain independent from update ownership");
assert.match(controller,/const live=window\.CCGLostSizzlerV138\?\.updateHordeLive/,"the authoritative mode runtime must dispatch V10.38 itself");
assert.match(controller,/hordeLivePostFrames/,"controller telemetry must expose V10.38 Horde-only post-frame execution");
const focusIndex=controller.indexOf("CCGLostSizzlerV137?.updateHordeFocus");
const liveIndex=controller.indexOf("CCGLostSizzlerV138?.updateHordeLive");
assert.ok(focusIndex>=0&&liveIndex>focusIndex,"controller post-frame ordering must remain V10.37 focus before V10.38 live Horde work");

console.log("Lost Sizzler V10.38 controller-owned real-dt shared-frame contract passed.");
