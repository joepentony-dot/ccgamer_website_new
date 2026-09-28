import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";

const render=readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
const overrides=readFileSync(new URL("../js/asset-overrides.js",import.meta.url),"utf8");

for(const file of [
  "../assets/pixel/visual-overhaul/0x72/lever-left.png",
  "../assets/pixel/visual-overhaul/0x72/lever-right.png",
  "../assets/pixel/visual-overhaul/0x72/PROVENANCE.md"
]){
  assert.equal(existsSync(new URL(file,import.meta.url)),true,`visual-overhaul file must exist: ${file}`);
}

assert.match(render,/switches:make\(selected\("switchSheet","assets\/pixel\/visual-overhaul\/0x72\/lever-left\.png"\)\)/);
assert.match(render,/secretSwitches:make\(selected\("switchSecretSheet","assets\/pixel\/visual-overhaul\/0x72\/lever-right\.png"\)\)/);
assert.match(render,/const switchArt=sw\.revealSecret\?lostSizzlerPixelAssets\.secretSwitches:lostSizzlerPixelAssets\.switches/);
assert.match(render,/switchArt\?\.complete&&switchArt\.naturalWidth>=16/);
assert.match(render,/ctx\.drawImage\(switchArt,s\.x\+5,s\.y\+5,C\.tile-10,C\.tile-10\)/);
assert.match(render,/REMOTE SECRET SWITCH — SHOOT OR TOUCH/);
assert.match(render,/WALL SWITCH — SHOOT OR TOUCH/);
assert.match(render,/else\{\s*ctx\.fillStyle="#151b26"/,"canvas switch fallback must remain available");
assert.match(overrides,/switchSheet:null/);
assert.match(overrides,/switchSecretSheet:null/);

console.log("Dungeon Carnage Stage 1 CC0 switch visual replacement contract passed.");
