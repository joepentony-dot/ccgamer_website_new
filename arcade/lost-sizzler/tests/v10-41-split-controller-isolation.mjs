import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const split=fs.readFileSync(path.join(root,"js/v10-41-split-friendly-fire.js"),"utf8");
const runtime=fs.readFileSync(path.join(root,"js/v10-41-mode-runtime.js"),"utf8");

assert.match(runtime,/SPLIT_SCREEN:"split-screen"/,"authoritative mode runtime must retain a dedicated split-screen controller");
assert.match(runtime,/setAttribute\?\.\("data-mode-controller",next\.id\)/,"mode transitions must publish the active controller for split-owned lifecycle modules");
assert.match(runtime,/function ownedSystemState\(name\)\{[\s\S]*const key=String\(name\|\|""\);[\s\S]*if\(OWNED_SYSTEMS\[key\]\)installOwnedSystemGate\(key\)/,"mode-owned diagnostics must repair the requested gate synchronously instead of waiting for the next 40 ms lifecycle sweep");
assert.match(split,/const P2_CONTROL_CODES=Object\.freeze\(\["KeyJ","KeyL","KeyI","KeyK","Enter","ControlRight","KeyO"\]\)/,"split controller must explicitly own the P2 held gameplay-state keys");
assert.match(split,/function resetP2ControlState\(\)[\s\S]*move2=0[\s\S]*fire2=0[\s\S]*fireBuffer2=0/,"split controller reset must release P2 movement, fire cooldown and buffered fire state");
assert.match(split,/for\(const code of P2_CONTROL_CODES\)input\?\.delete\?\.\(code\)/,"split controller reset must remove stale P2 held gameplay input");
assert.match(split,/function resetControllerState\(reason=[\s\S]*resetAllPushes\(\);[\s\S]*resetP2ControlState\(\)/,"split controller reset must clear both budge state and P2 control state");
assert.match(split,/if\(previous==="split-screen"\|\|id==="split-screen"\)resetControllerState/,"split state must reset on both entry to and exit from split-screen");
assert.match(split,/new MutationObserver\([\s\S]*attributeFilter:\["data-mode-controller"\]/,"split lifecycle must follow authoritative controller transitions without intercepting the game update loop");
assert.doesNotMatch(split,/window\.update\s*=/,"split-screen isolation must not add another global update owner");
assert.match(split,/CCGLostSizzlerV141SplitFriendlyFire=\{P2_CONTROL_CODES,resetControllerState,syncControllerOwnership/,"split controller reset API must remain inspectable for regression diagnostics");

const resetBody=split.match(/function resetP2ControlState\(\)\{([\s\S]*?)\n  \}/)?.[1]||"";
assert.doesNotMatch(resetBody,/move1\s*=|fire1\s*=|fireBuffer1\s*=/,"P2 lifecycle cleanup must not wipe P1 cooldown or buffered-input state");

console.log("Lost Sizzler split-screen controller isolation checks passed.");
