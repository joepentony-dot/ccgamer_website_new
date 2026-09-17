import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const main=fs.readFileSync(path.join(root,"js/game-main.js"),"utf8");
const render=fs.readFileSync(path.join(root,"js/game-render.js"),"utf8");

assert.doesNotMatch(main,/CCGLostSizzlerV141R32SpyLoader/,"supported keyboard handling must not consult the retired R32 Spy loader");
assert.doesNotMatch(main,/handleSpyFullscreenKey/,"supported keyboard handling must not dispatch fullscreen through retired Spy ownership");
assert.match(main,/if\(e\.code==="KeyF"\)\{\s*toggleFullscreen\(\);return\s*\}/,"F must remain directly owned by the supported fullscreen handler");
assert.match(main,/\$\("fullscreen-btn"\)\?\.addEventListener\("click",toggleFullscreen\)/,"fullscreen button must retain the same supported owner");
assert.match(render,/async function toggleFullscreen\(\)\{const shell=document\.querySelector\("\.ccg-game"\);try\{if\(!document\.fullscreenElement\)await shell\.requestFullscreen\(\);else await document\.exitFullscreen\(\)\}/,"supported fullscreen owner must still request/exit browser fullscreen directly");

console.log("Dungeon Carnage retired Spy fullscreen hook contract passed.");
