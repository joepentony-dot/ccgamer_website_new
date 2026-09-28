import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const renderer=readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
const overrides=readFileSync(new URL("../js/asset-overrides.js",import.meta.url),"utf8");
const manifest=JSON.parse(readFileSync(new URL("../assets/asset-manifest.json",import.meta.url),"utf8"));

assert.match(renderer,/switchButtonUp:make\(selected\("switchButtonUp","assets\/pixel\/visual-overhaul\/0x72\/button-blue-up\.png"\)\)/);
assert.match(renderer,/switchButtonDown:make\(selected\("switchButtonDown","assets\/pixel\/visual-overhaul\/0x72\/button-blue-down\.png"\)\)/);
assert.match(overrides,/switchButtonUp:null/);
assert.match(overrides,/switchButtonDown:null/);
assert.equal(manifest.images.visualOverhaul.switchButtonUp,"assets/pixel/visual-overhaul/0x72/button-blue-up.png");
assert.equal(manifest.images.visualOverhaul.switchButtonDown,"assets/pixel/visual-overhaul/0x72/button-blue-down.png");

const shrineStart=renderer.indexOf("function drawShrinesSwitches(){");
const shrineEnd=renderer.indexOf("\nfunction drawTraps(){",shrineStart);
assert.ok(shrineStart>=0&&shrineEnd>shrineStart,"drawShrinesSwitches must remain present");
const shrineBlock=renderer.slice(shrineStart,shrineEnd);

assert.doesNotMatch(shrineBlock,/if\(!sw\.active\|\|!visibleTo/,"spent switches must remain visible");
assert.match(shrineBlock,/const s=ws\(sw\.x,sw\.y\),spent=!sw\.active/,"switch visual state must follow existing active flag");
assert.match(shrineBlock,/drawSwitchVisual\(sw,s,performance\.now\(\)\)/,"switch caller must delegate visual ownership to the shared switch renderer");
assert.match(shrineBlock,/spent\?"SWITCH TOGGLED"/,"spent switch must show an explicit toggled label");

const switchStart=renderer.indexOf("function drawSwitchVisual(sw,s,now=performance.now()){");
const switchEnd=renderer.indexOf("\nfunction drawShrinesSwitches(){",switchStart);
assert.ok(switchStart>=0&&switchEnd>switchStart,"drawSwitchVisual must remain present");
const switchBlock=renderer.slice(switchStart,switchEnd);
assert.match(switchBlock,/const buttonArt=spent\?lostSizzlerPixelAssets\.switchButtonDown:lostSizzlerPixelAssets\.switchButtonUp/,"switch button state must reflect activation");
assert.match(switchBlock,/switchRenderDiagnostics\.lastState=spent\?"activated":"armed"/,"switch diagnostics must expose armed and activated states");
assert.match(switchBlock,/switchRenderDiagnostics\.lastMode="cc0-switch"/,"authored switch rendering must expose the CC0 switch mode");
assert.match(switchBlock,/switchRenderDiagnostics\.lastMode="procedural-fallback"/,"switch rendering must retain a procedural fallback");
assert.match(shrineBlock,/const s=ws\(sh\.x,sh\.y\).*sigilArt=lostSizzlerPixelAssets\.sigils/s,"shrine must use the authored sigil core");
assert.match(shrineBlock,/ctx\.drawImage\(sigilArt,frame\*32,0,32,40,cx-10,s\.y\+4,20,25\)/,"shrine must render animated sigil art");

const doorStart=renderer.indexOf("function drawDoors(){");
const doorEnd=renderer.indexOf("\nfunction drawExit(){",doorStart);
const doorBlock=renderer.slice(doorStart,doorEnd);
assert.match(doorBlock,/if\(d\.sigilGate\)/,"sigil gate must have a distinct visual pass");
assert.match(doorBlock,/ctx\.drawImage\(sigilArt,frame\*32,0,32,40,s\.x\+C\.tile\/2-10,s\.y\+C\.tile\/2-13,20,25\)/,"sigil gate must render the animated authored sigil emblem");

console.log("Dungeon rune/switch/shrine visual contract passed.");
