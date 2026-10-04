import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const assetsSource=fs.readFileSync(path.join(root,"js/audio-assets.js"),"utf8");
const audioSource=fs.readFileSync(path.join(root,"js/audio.js"),"utf8");

const sandbox={window:{}};
(new Function("window",assetsSource+";return window.CCG_AUDIO_ASSETS;"))(sandbox.window);
const assets=sandbox.window.CCG_AUDIO_ASSETS;
assert.ok(assets?.sfx,"R100 requires the canonical SFX asset map");

const required={
  melee:"enemy-attack.wav",
  hazardwarn:"alert.wav",
  bladehit:"armour-hit.wav",
  chest:"objective-open.wav",
  creak:"door-open.wav",
  pssst:"flame.wav",
  fireplace:"flame.wav",
  woodhit:"wall-hit.wav",
  woodbreak:"explosion.wav",
  bones:"enemy-death.wav"
};

for(const [cue,fileName] of Object.entries(required)){
  const relative=assets.sfx[cue];
  assert.ok(relative,"R100 live cue "+cue+" must be file-backed");
  assert.equal(path.basename(relative),fileName,"R100 "+cue+" must retain its audited semantic file route");
  const absolute=path.join(root,relative);
  assert.ok(fs.existsSync(absolute),"R100 "+cue+" asset is missing: "+relative);
  assert.ok(fs.statSync(absolute).size>4_000,"R100 "+cue+" asset is suspiciously empty: "+relative);
}

assert.match(audioSource,/function playAssetSfx\(name,fallback\)[\s\S]*ASSETS\.sfx\?\.\[name\]/,"audio owner must attempt the file-backed route before procedural fallback");
assert.match(audioSource,/\}\[name\];playAssetSfx\(name,f\)/,"all SFX calls must remain under the single asset-first playback owner");

console.log("Dungeon Carnage R100 file-backed live SFX contract passed.");
