import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const bridge=fs.readFileSync(path.join(root,"js/v10-41-r60-horde-owner-composition.js"),"utf8");

assert.match(bridge,/function soloDungeon\(\)/,"R60 owner consolidation must have an explicit Solo Dungeon scope predicate");
assert.match(bridge,/document\.body\?\.dataset\?\.runActive==="true"&&typeof playMode!=="undefined"&&String\(playMode\|\|""\)==="solo"&&!specialType\(\)/,"the consolidation predicate must read Lost Sizzler's lexical playMode owner while excluding menus, multiplayer and every special mode");
assert.doesNotMatch(bridge,/window\.playMode/,"the R60 consolidation bridge must not assume top-level let playMode is exposed on window");
assert.match(bridge,/function protectSoloInstall\(\)/,"R60 composition must protect the production Solo maintenance delegate");
assert.match(bridge,/if\(!soloDungeon\(\)\)return source\.apply\(this,arguments\)/,"Horde, Spy and non-Solo lifecycle states must fall through to the untouched R60 installer");
assert.match(bridge,/chainHasMarker\(moveCurrent,"__ccgV141R60CadenceSeal"\)/,"R60 Solo maintenance must recognise an existing cadence seal anywhere in movement ancestry");
assert.match(bridge,/chainHasMarker\(updateCurrent,"__ccgV141R60TimeSmoothing"\)/,"R60 Solo maintenance must recognise an existing smoothing owner anywhere in update ancestry");
assert.match(bridge,/if\(moveOwned\)\{state\.soloMoveReuse\+\+;if\(live\.state\)live\.state\.moveWrapped=true\}else live\.wrapMovement\?\.\(\)/,"an inherited R60 movement owner must be reused instead of wrapped again");
assert.match(bridge,/if\(updateOwned\)\{state\.soloUpdateReuse\+\+;if\(live\.state\)live\.state\.updateWrapped=true\}else live\.wrapUpdate\?\.\(\)/,"an inherited R60 update owner must be reused instead of wrapped again");
assert.match(bridge,/protectedInstall\.__ccgV141R60ChainAwareMaintenance=true/,"the consolidated maintenance delegate must be idempotently identifiable");
assert.match(bridge,/if\(live\.install\.__ccgV141R60ChainAwareMaintenance===true\)/,"the composition bridge must never stack its maintenance delegate");
assert.doesNotMatch(bridge,/setInterval\([^\n]*protectSoloInstall/,"Solo owner consolidation must not add another permanent maintenance timer");

console.log("Lost Sizzler R60 Solo movement/update ancestry consolidation and special-mode isolation contract passed.");
