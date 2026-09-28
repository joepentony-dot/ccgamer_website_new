import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const renderer=readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
const overrides=readFileSync(new URL("../js/asset-overrides.js",import.meta.url),"utf8");
const manifest=JSON.parse(readFileSync(new URL("../assets/asset-manifest.json",import.meta.url),"utf8"));
const provenance=readFileSync(new URL("../assets/pixel/visual-overhaul/0x72/PROVENANCE.md",import.meta.url),"utf8");

assert.equal(manifest.images.visualOverhaul.switchButtonUp,"assets/pixel/visual-overhaul/0x72/button-blue-up.png");
assert.equal(manifest.images.visualOverhaul.switchButtonDown,"assets/pixel/visual-overhaul/0x72/button-blue-down.png");
assert.match(overrides,/switchButtonUp:null/);
assert.match(overrides,/switchButtonDown:null/);
assert.match(provenance,/button_blue_up\.png\s*\|\s*button-blue-up\.png/i);
assert.match(provenance,/button_blue_down\.png\s*\|\s*button-blue-down\.png/i);

assert.match(renderer,/switchButtonUp:make\(selected\("switchButtonUp","assets\/pixel\/visual-overhaul\/0x72\/button-blue-up\.png"\)\)/);
assert.match(renderer,/switchButtonDown:make\(selected\("switchButtonDown","assets\/pixel\/visual-overhaul\/0x72\/button-blue-down\.png"\)\)/);
assert.match(renderer,/const switchRenderDiagnostics=window\.__CCG_SWITCH_RENDER_DIAGNOSTICS__/);
assert.match(renderer,/function drawSwitchVisual\(sw,s,now=performance\.now\(\)\)/);
assert.match(renderer,/const buttonArt=active\?lostSizzlerPixelAssets\.switchButtonUp:lostSizzlerPixelAssets\.switchButtonDown/);
assert.match(renderer,/const leverArt=secret\?lostSizzlerPixelAssets\.secretSwitches:lostSizzlerPixelAssets\.switches/);
assert.match(renderer,/switchRenderDiagnostics\.lastState=active\?"armed":"activated"/);
assert.match(renderer,/if\(!visibleTo\(focus,sw\.x,sw\.y\)\)continue;/,"switch renderer must no longer discard activated switches solely because active=false");
assert.doesNotMatch(renderer,/if\(!sw\.active\|\|!visibleTo\(focus,sw\.x,sw\.y\)\)continue/);
assert.match(renderer,/REMOTE SECRET SWITCH — ACTIVATED/);
assert.match(renderer,/WALL SWITCH — ACTIVATED/);
assert.match(renderer,/switchRenderDiagnostics\.lastMode="procedural-fallback"/);

console.log("PASS Dungeon CC0 switch armed/activated state contract");
