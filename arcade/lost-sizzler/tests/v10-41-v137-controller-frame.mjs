import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const focus=fs.readFileSync(path.join(root,"js/v10-37-horde-focus.js"),"utf8");
const controller=fs.readFileSync(path.join(root,"js/v10-41-mode-runtime.js"),"utf8");

assert.doesNotMatch(focus,/window\.update\s*=\s*function\s+updateV137HordeFocus/,"V10.37 must not intercept the shared update function");
assert.match(focus,/controllerOwnedUpdate:true/,"V10.37 must declare controller ownership for its update-side work");
assert.match(focus,/function wrapRender\(/,"V10.37 render ownership must remain independent while update ownership migrates");
assert.match(controller,/function installSharedFrameBoundary\(/,"the authoritative mode runtime must own one shared-frame boundary");
assert.match(controller,/boundary\.__ccgV141ModeFrameBoundary=true/,"the controller frame boundary must be explicitly identifiable");
assert.match(controller,/const focus=window\.CCGLostSizzlerV137\?\.updateHordeFocus/,"the controller must dispatch V10.37 Horde focus work itself");
assert.match(controller,/if\(current\.profile\.family!=="horde"\)return current/,"V10.37 post-frame work must be rejected outside Horde controllers");
assert.match(controller,/hordeFocusPostFrames/,"controller telemetry must expose V10.37 Horde-only post-frame execution");

console.log("Lost Sizzler V10.37 controller-owned shared-frame contract passed.");
