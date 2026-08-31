import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameRoot=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(gameRoot,relative),"utf8");

const audio=read("js/audio.js");
const r52=read("js/v10-41-r52-audio-accessibility.js");
const loader=read("js/v10-41-lake-item-safety.js");

assert.match(audio,/sfxLevel=1/,"SFX accessibility must preserve the current full-volume default");
assert.match(audio,/function setSfxLevel\(v\)/,"CCGSound must expose a bounded SFX bus control");
assert.match(audio,/sfxGain\.gain\.value=\.46\*sfxLevel/,"synthesised SFX must scale through the established SFX gain bus");
assert.match(audio,/a\.volume=\.7\*sfxLevel/,"asset-backed SFX must use the same independent level");
assert.match(audio,/setSfxLevel,getSfxLevel:\(\)=>sfxLevel/,"the SFX level must be observable by the accessibility layer and browser regression");

assert.match(r52,/sfxPercent:\s*percent\(source\.sfxPercent\?\?100\)/,"existing players must default SFX to the established loudness");
assert.match(r52,/voicePercent:\s*percent\(source\.voicePercent\?\?100\)/,"existing players must default voice to the established loudness");
assert.match(r52,/SFX LEVEL/,"Accessibility & Audio must expose an independent SFX slider");
assert.match(r52,/VOICE LEVEL/,"Accessibility & Audio must expose an independent voice slider");
assert.match(r52,/active\.dungeonFx\?level:base\*level/,"recorded voices routed through dungeon FX must retain their existing cue gain while applying the user multiplier");
assert.match(r52,/active\.speech\)active\.speech\.volume=clamp\(base\*level\)/,"speech fallback must obey the same voice level");
assert.match(r52,/active\?\.audio===this/,"voice scaling must be applied before active recorded media starts");
assert.match(r52,/active\?\.speech===utterance/,"voice scaling must be applied before active speech synthesis starts");
assert.doesNotMatch(r52,/health|damage|score\s*=|host\.enemies|broadcastWorld|sendIntent/,"audio accessibility must not take gameplay or multiplayer authority");

assert.match(loader,/v10-41-r52-audio-accessibility\.js/,"the canonical late loader must install R52");
assert.ok(loader.indexOf("v10-41-r51-menu-focus-polish.js")<loader.indexOf("v10-41-r52-audio-accessibility.js"),"R52 must load after the R51 menu/options presentation layer");
assert.ok(loader.indexOf("v10-41-r51-render-ownership-finalizer.js")<loader.indexOf("v10-41-r52-audio-accessibility.js"),"R52 must load after the final R51 renderer ownership seal");

console.log("Lost Sizzler V10.41 r52 independent SFX/voice accessibility contract passed.");