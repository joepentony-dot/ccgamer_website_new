import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const map=read("js/v10-41-solo-full-map.js");
const splitHud=read("js/split-player-hud.js");

assert.match(map,/playMode==="solo"\|\|playMode==="split"/,"full map must be eligible in both supported local runs");
assert.match(map,/const MAP_MODE="fullmap"/,"map must use a dedicated mode, not the generic pause state");
assert.match(map,/event\.code==="KeyM"/,"M must remain the full-map control");
assert.match(map,/if\(event\.repeat\)return;/,"held M must not repeatedly toggle the map");
assert.match(map,/state\.open&&event\.code==="Escape"/,"Escape must close an open full map");
assert.match(map,/explored\?\.get\?\.\(p1\?\.id\)/,"map must use the established shared exploration knowledge");
assert.match(map,/if\(!ex\.has\(`\$\{x\},\$\{y\}`\)\)continue;/,"unexplored cells must remain hidden");
assert.match(splitHud,/IJKL · ENTER · O · M MAP/,"split HUD must advertise the shared map control");

console.log("V10.41 split full-map contract passed");
