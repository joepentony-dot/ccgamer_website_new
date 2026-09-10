import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-41-r57-desktop-prep-stability.js"),"utf8");

assert.match(source,/function syncR56Bridge\(/,"R57 must route retained R56 ownership through a narrow synchronisation boundary");
assert.match(source,/function queueR56Bridge\(/,"R57 must expose an event/lifecycle queue for retained R56 bridge work");
assert.match(source,/new MutationObserver\(\(\)=>queueR56Bridge\("body lifecycle mutation"\)\)/,"R57 must observe lifecycle attributes instead of polling R56 ownership continuously");
assert.match(source,/attributeFilter:\["data-special-mode","data-run-active","data-mode-controller"\]/,"R57 bridge observer must watch the mode/run/controller lifecycle attributes");
assert.match(source,/const pending=Number\(api\.state\?\.pendingChests\?\.size\|\|0\)>0/,"R57 must still service retained R56 pending chest work when it exists");
assert.match(source,/if\(!state\.r56BridgeDirty&&!pending\)\{state\.lastMode=current;state\.r56BridgeSkips\+\+;return false\}/,"stable Solo ticks must skip retained R56 bridge work when no lifecycle or pending-chest boundary is active");
assert.match(source,/syncR56Bridge\("tick"\)/,"R57's 80 ms tick may only touch the R56 bridge through the skip-aware synchroniser");
assert.doesNotMatch(source,/function tick\(\)\{[^}]*bridgeR56\(\)/s,"R57 tick must not call the retained R56 bridge unconditionally");
assert.doesNotMatch(source,/api\.combatTick\?\.\(\)/,"R57 must not re-run retained R56 combat ownership maintenance from every stable Solo bridge pass");

console.log("R57 stable Solo bridge contract passed: retained R56 ownership is event/pending-driven, not a recurring stable Solo poll.");
