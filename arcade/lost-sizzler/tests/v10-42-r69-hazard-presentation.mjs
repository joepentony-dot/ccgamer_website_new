import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const render=read("js/game-render.js");

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

console.log("Dungeon R69 hazard presentation and low-FPS regression checks passed.");
