import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";

const render=readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
const systems=readFileSync(new URL("../js/systems.js",import.meta.url),"utf8");
const play=readFileSync(new URL("../js/game-play.js",import.meta.url),"utf8");
const overrides=readFileSync(new URL("../js/asset-overrides.js",import.meta.url),"utf8");

for(const file of [
  "../assets/pixel/visual-overhaul/0x72/lever-left.png",
  "../assets/pixel/visual-overhaul/0x72/lever-right.png",
  "../assets/pixel/visual-overhaul/0x72/button-blue-up.png",
  "../assets/pixel/visual-overhaul/0x72/button-blue-down.png",
  "../assets/pixel/visual-overhaul/0x72/PROVENANCE.md"
]){
  assert.equal(existsSync(new URL(file,import.meta.url)),true,`visual-overhaul file must exist: ${file}`);
}

assert.match(systems,/function freeWallSwitchPosition\(world,room,used\)/,"switch placement must have a wall-adjacent owner");
assert.match(systems,/\["north",world\.map\[y-1\]\?\.\[x\]!==0\]/,"north wall adjacency must be checked");
assert.match(systems,/\["south",world\.map\[y\+1\]\?\.\[x\]!==0\]/,"south wall adjacency must be checked");
assert.match(systems,/\["west",world\.map\[y\]\?\.\[x-1\]!==0\]/,"west wall adjacency must be checked");
assert.match(systems,/\["east",world\.map\[y\]\?\.\[x\+1\]!==0\]/,"east wall adjacency must be checked");
assert.match(systems,/freeWallSwitchPosition\(world,room,used\)/,"generated switches must use wall-adjacent placement");
assert.doesNotMatch(systems,/host\.items\.push\([^\n]*switch/i,"switches must not enter item/loot ownership");

assert.match(play,/function activateSwitch\(s,p,shot=false\)\{\s*if\(!s\?\.active\)return false;/,"switch activation must retain the one-shot active guard");
assert.match(play,/if\(s\.weightBridgeSwitch\)[\s\S]*?s\.active=false;s\.toggled=true;/,"bridge rebuild switch must consume itself exactly once after a valid shot");
assert.match(play,/if\(s\.shotOnly&&!shot\)return false;\s*s\.active=false;s\.toggled=true;/,"ordinary wall switch must consume itself exactly once after its activation guard");
assert.match(play,/function triggerSwitch\(p\).*s\.active&&s\.x===p\.x&&s\.y===p\.y/s,"used switches must not reactivate");

assert.match(render,/switches:make\(selected\("switchSheet","assets\/pixel\/visual-overhaul\/0x72\/lever-left\.png"\)\)/);
assert.match(render,/secretSwitches:make\(selected\("switchSecretSheet","assets\/pixel\/visual-overhaul\/0x72\/lever-right\.png"\)\)/);
assert.match(render,/const s=ws\(sw\.x,sw\.y\),spent=!sw\.active/);
assert.match(render,/side=String\(sw\.wallSide\|\|"north"\)/,"renderer must honour stored wall side");
assert.match(render,/const wallOffset=side==="north"/,"switch art must be offset toward its wall");
assert.match(render,/if\(spent\)ctx\.scale\(1,-1\)/,"used lever must visibly flip once");
assert.match(render,/spent\?"SWITCH TOGGLED"/,"used switch label must show toggled state");
assert.match(render,/else\{\s*ctx\.fillStyle="#151b26"/,"canvas switch fallback must remain available");
assert.match(overrides,/switchSheet:null/);
assert.match(overrides,/switchSecretSheet:null/);

console.log("Dungeon Carnage wall-mounted one-shot switch contract passed.");
