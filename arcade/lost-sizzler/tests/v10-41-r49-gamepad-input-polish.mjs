import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const loader=fs.readFileSync(path.join(root,"js/v10-41-lake-item-safety.js"),"utf8");
const src=fs.readFileSync(path.join(root,"js/v10-41-r49-gamepad-input-polish.js"),"utf8");

assert.match(loader,/v10-41-r49-gamepad-input-polish\.js/,"late loader must publish r49");
assert.match(src,/navigator\.getGamepads/,"r49 must use the standard Gamepad API");
assert.match(src,/new KeyboardEvent/,"r49 must adapt into the canonical keyboard path instead of owning movement/combat");
assert.match(src,/P1_MOVE=\{up:"KeyW",down:"KeyS",left:"KeyA",right:"KeyD"\}/,"P1 gamepad movement must use canonical WASD bindings");
assert.match(src,/P2_MOVE=\{up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight"\}/,"P2 gamepad movement must use canonical split-screen arrow bindings");
assert.match(src,/setHeld\(slot,"Space",pressed\(b\[0\]\)\)/,"P1 A button must use canonical Space attack");
assert.match(src,/setHeld\(slot,"Enter",pressed\(b\[0\]\)\)/,"P2 A button must use canonical Enter attack");
assert.match(src,/ControlRight/,"P2 dash must stay on the existing split-screen dash action");
assert.match(src,/if\(index===1&&!split\(\)\)\{releaseSlot\(index\);return false\}/,"second pad must be ignored during single-player gameplay");
assert.match(src,/editable\(\)/,"controller input must stand down while editable fields own focus");
assert.match(src,/visibilitychange/,"held controller state must clear when the page is hidden");
assert.match(src,/gamepaddisconnected/,"disconnect must release held controller state");
assert.match(src,/moveFocus\(direction\)/,"gamepads must support menu focus navigation");
assert.match(src,/clickFocused\(\)/,"gamepads must support menu activation");
for(const forbidden of [/p1\.x\s*=/,/p1\.y\s*=/,/health\s*[-+]=/,/net\.send\(/,/CCGNetwork/,/Supabase/i])assert.doesNotMatch(src,forbidden,"r49 must not own simulation, networking or persistence");

console.log("Lost Sizzler V10.41 r49 gamepad/input ownership contract passed.");
