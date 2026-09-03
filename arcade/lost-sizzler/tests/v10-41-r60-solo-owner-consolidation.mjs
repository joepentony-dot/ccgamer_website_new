import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const bridge=fs.readFileSync(path.join(root,"js/v10-41-r60-horde-owner-composition.js"),"utf8");

assert.match(bridge,/function protectSoloInstall\(\)/,"R60 composition must protect the production Solo maintenance delegate");
assert.match(bridge,/chainHasMarker\(moveCurrent,"__ccgV141R60CadenceSeal"\)/,"R60 maintenance must recognise an existing cadence seal anywhere in movement ancestry");
assert.match(bridge,/chainHasMarker\(updateCurrent,"__ccgV141R60TimeSmoothing"\)/,"R60 maintenance must recognise an existing smoothing owner anywhere in update ancestry");
assert.match(bridge,/if\(moveOwned\)\{state\.soloMoveReuse\+\+;if\(live\.state\)live\.state\.moveWrapped=true\}else live\.wrapMovement\?\.\(\)/,"an inherited R60 movement owner must be reused instead of wrapped again");
assert.match(bridge,/if\(updateOwned\)\{state\.soloUpdateReuse\+\+;if\(live\.state\)live\.state\.updateWrapped=true\}else live\.wrapUpdate\?\.\(\)/,"an inherited R60 update owner must be reused instead of wrapped again");
assert.match(bridge,/protectedInstall\.__ccgV141R60ChainAwareMaintenance=true/,"the consolidated maintenance delegate must be idempotently identifiable");
assert.match(bridge,/if\(live\.install\.__ccgV141R60ChainAwareMaintenance===true\)/,"the composition bridge must never stack its maintenance delegate");
assert.doesNotMatch(bridge,/setInterval\([^\n]*protectSoloInstall/,"Solo owner consolidation must not add another permanent maintenance timer");

console.log("Lost Sizzler R60 Solo movement/update ancestry consolidation contract passed.");
