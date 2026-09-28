import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";

const render=readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
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

assert.match(render,/switches:make\(selected\("switchSheet","assets\/pixel\/visual-overhaul\/0x72\/lever-left\.png"\)\)/);
assert.match(render,/secretSwitches:make\(selected\("switchSecretSheet","assets\/pixel\/visual-overhaul\/0x72\/lever-right\.png"\)\)/);
assert.match(render,/const switchArt=sw\.revealSecret\?lostSizzlerPixelAssets\.secretSwitches:lostSizzlerPixelAssets\.switches/);
assert.match(render,/const buttonArt=active\?lostSizzlerPixelAssets\.switchButtonUp:lostSizzlerPixelAssets\.switchButtonDown/);
assert.match(render,/const leverReady=switchArt\?\.complete&&switchArt\.naturalWidth>=16,buttonReady=buttonArt\?\.complete&&buttonArt\.naturalWidth>=16/);
assert.match(render,/ctx\.drawImage\(buttonArt,s\.x\+4,s\.y\+4,C\.tile-8,C\.tile-8\)/);
assert.match(render,/ctx\.drawImage\(switchArt,s\.x\+inset,s\.y\+inset-\(active\?2:0\),C\.tile-inset\*2,C\.tile-inset\*2\)/);
assert.match(render,/REMOTE SECRET SWITCH — SHOOT OR TOUCH/);
assert.match(render,/WALL SWITCH — SHOOT OR TOUCH/);
assert.match(render,/REMOTE SECRET SWITCH — ACTIVATED/);
assert.match(render,/WALL SWITCH — ACTIVATED/);
assert.match(render,/ctx\.fillStyle=active\?"#151b26":"#152019"/,"canvas switch fallback must remain available");
assert.match(overrides,/switchSheet:null/);
assert.match(overrides,/switchSecretSheet:null/);
assert.match(overrides,/switchButtonUp:null/);
assert.match(overrides,/switchButtonDown:null/);

console.log("Dungeon Carnage Stage 1 CC0 switch visual replacement contract passed.");
