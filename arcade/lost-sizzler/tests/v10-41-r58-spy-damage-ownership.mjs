import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const loader=fs.readFileSync(path.join(root,"js/v10-41-r32-spy-loader.js"),"utf8");

assert.doesNotThrow(()=>new Function(loader),"Spy lazy loader must parse");
assert.match(loader,/function guardR56SpyOwnership\(\)/,"Spy loader must own an R56 damage-install guard");
assert.match(loader,/if\(spyActive\(\)\)\{state\.r56OwnerSkips\+\+;return true\}/,"R56 owner installation must be skipped while Spy owns damage");
assert.match(loader,/return current\.apply\(this,arguments\)/,"R56 owner installation must remain unchanged outside Spy");
assert.match(loader,/wrapped\.__ccgV141R58SpySafe=true/,"Spy-safe R56 installer must carry a stable ownership marker");
assert.match(loader,/function prime\(\)\{\s*guardR56SpyOwnership\(\);detachLegacyR27KeyOwner\(\);ensureR59\(\);installModeObserver\(\);/s,"the one-time loader prime must install the R56 guard before event-driven Spy work");
assert.match(loader,/function ensureSpyOwners\(reason="Spy activation"\)\{[\s\S]*guardR56SpyOwnership\(\);detachLegacyR27KeyOwner\(\);ensureR59\(\);[\s\S]*ensureLoaded\(\)/,"every actual Spy activation must re-check damage and keyboard isolation before lazy loading");
assert.doesNotMatch(loader,/setInterval\([^\n]*monitor/,"Spy loader isolation must not reintroduce an always-on cross-mode monitor");
assert.match(loader,/guardR56SpyOwnership,ensureSpyOwners,handleModeSignal,installModeObserver,prime,get state/,"damage ownership and event-driven lifecycle guards must remain observable to browser regressions");

console.log("Lost Sizzler V10.41 r58 Spy-to-Solo damage ownership contract passed with event-driven loader isolation.");