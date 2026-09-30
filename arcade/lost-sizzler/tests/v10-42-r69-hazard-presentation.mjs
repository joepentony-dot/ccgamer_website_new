import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const render=read("js/game-render.js");
const play=read("js/game-play.js");
const audio=read("js/audio.js");
const melee=read("js/v10-25-melee-ammo-balance.js");

assert.match(render,/bladeHazard:make\(selected\("bladeHazard","assets\/pixel\/visual-overhaul\/0x72\/blade-saw\.png"\)\)/,
  "dedicated blade traps must use the imported CC0 blade asset");
assert.match(render,/hazardHole:make\(selected\("hazardHole","assets\/pixel\/visual-overhaul\/0x72\/hole\.png"\)\)/,
  "dedicated blade traps must retain visible floor housing");
assert.match(render,/hazard\.type==="blade"[\s\S]*blade\?\.complete&&blade\.naturalWidth[\s\S]*ctx\.drawImage\(blade/,
  "blade hazard renderer must prefer the imported asset while keeping a fallback");
assert.match(render,/const spin=active\?\(now\/54[\s\S]*warning\?\(Math\.sin/,
  "blade hardware must animate distinctly in warning and active phases");
assert.match(render,/if\(active\)\{ctx\.save\(\);ctx\.globalCompositeOperation="lighter"[\s\S]*ctx\.fillRect/,
  "active blade hardware must add impact/spark motion without altering damage ownership");
assert.match(render,/drawAmbientMotes\(\)[\s\S]*CCGLostSizzlerV141R37GlobalPerformance\?\.state\?\.lowFps/,
  "ambient decoration must shed itself when the global performance owner reports low FPS");
assert.match(render,/drawDynamicLighting\(\)[\s\S]*lowFps=Boolean\(window\.CCGLostSizzlerV141R37GlobalPerformance/,
  "dynamic lighting must consult the established global performance owner");
assert.match(render,/if\(!lowFps\)for\(const l of world\.wallLights/,
  "nonessential wall-light gradients must be skipped during low-FPS recovery");
assert.match(render,/if\(lowFps\)return;[\s\S]*Soft vignette|Soft vignette[\s\S]*if\(lowFps\)return;/,
  "the vignette pass must be removable during low-FPS recovery");

assert.match(render,/function tileInRenderView\(x,y,pad=2\)/,
  "renderer must expose a cheap camera-bound culling predicate");
assert.match(render,/function drawEnemy\(e\)[\s\S]*!tileInRenderView\(e\.x,e\.y,3\)[\s\S]*!visibleTo/,
  "enemy rendering must cull offscreen entities before expensive visibility checks");
assert.match(render,/function drawItem\(i\)[\s\S]*!tileInRenderView\(i\.x,i\.y,2\)[\s\S]*!visibleTo/,
  "item rendering must cull offscreen pickups before expensive visibility checks");
assert.match(render,/for\(const d of world\.decor\|\|\[\]\)[\s\S]*!tileInRenderView\(d\.x,d\.y,2\)[\s\S]*!visibleTo/,
  "furniture rendering must cull offscreen decor before line-of-sight work");
assert.match(render,/function drawFog\(\)[\s\S]*lowFps=Boolean[\s\S]*torchEnemies=\(host\.enemies\|\|\[\]\)\.filter\(e=>e\.alive&&e\.follower\)\.filter\(e=>!lowFps/,
  "fog lighting must preserve follower discovery while removing secondary light-source comparisons when low FPS is active");

assert.match(audio,/melee:\(\)=>\{noise\(/,
  "R69 must provide a dedicated procedural melee SFX fallback");
assert.match(melee,/S\.sfx\("melee"\)/,
  "sword attacks must use the dedicated melee SFX instead of the dash cue");
assert.match(audio,/hazardwarn:\(\)=>/,
  "hazard warning must have a dedicated non-voice SFX cue");
assert.match(audio,/bladehit:\(\)=>/,
  "blade contact must have a dedicated impact SFX cue");
assert.match(play,/S\.sfx\("hazardwarn"\)[\s\S]*hazardWarning/,
  "hazard-cycle warning must pair its SFX with the recorded warning voice");
assert.match(play,/S\.sfx\(hazard\.type==="blade"\?"bladehit":"trap"\)/,
  "dedicated blade contact must use its impact SFX without changing hazard damage ownership");

console.log("Dungeon R69 hazard presentation and low-FPS regression checks passed.");
