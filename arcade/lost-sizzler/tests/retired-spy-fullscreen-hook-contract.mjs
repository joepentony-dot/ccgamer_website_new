import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const main=fs.readFileSync(path.join(root,"js/game-main.js"),"utf8");
const render=fs.readFileSync(path.join(root,"js/game-render.js"),"utf8");
const r20=fs.readFileSync(path.join(root,"js/v10-42-r20-live-regression-stability.js"),"utf8");
const hold=fs.readFileSync(path.join(root,"js/v10-42-attack-hold-liveness.js"),"utf8");
const inventoryRecovery=fs.readFileSync(path.join(root,"js/v10-42-r47-inventory-fire-recovery.js"),"utf8");

assert.doesNotMatch(main,/CCGLostSizzlerV141R32SpyLoader/,"supported keyboard handling must not consult the retired R32 Spy loader");
assert.doesNotMatch(main,/handleSpyFullscreenKey/,"supported keyboard handling must not dispatch fullscreen through retired Spy ownership");
assert.match(main,/if\(e\.code==="KeyF"\)\{\s*toggleFullscreen\(\);return\s*\}/,"F must remain directly owned by the supported fullscreen handler");
assert.match(main,/\$\("fullscreen-btn"\)\?\.addEventListener\("click",toggleFullscreen\)/,"fullscreen button must retain the same supported owner");
assert.match(render,/async function toggleFullscreen\(\)\{const shell=document\.querySelector\("\.ccg-game"\);try\{if\(!document\.fullscreenElement\)await shell\.requestFullscreen\(\);else await document\.exitFullscreen\(\)\}/,"supported fullscreen owner must still request/exit browser fullscreen directly");

assert.match(render,/if\(document\.fullscreenElement\)return 1\.35/,"desktop fullscreen Solo must use the focused 1.35x camera to consume the otherwise empty lower playfield");
for(const [name,source] of [["r20",r20],["held attack",hold],["inventory recovery",inventoryRecovery]]){
  assert.doesNotMatch(source,/ATTACK_KEYS=new Set\([^\n]*"KeyF"/,`${name} must not claim fullscreen F as an attack key`);
}

console.log("Dungeon Carnage retired Spy fullscreen hook contract passed.");
