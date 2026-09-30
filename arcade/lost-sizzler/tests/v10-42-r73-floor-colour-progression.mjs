import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const render=read("js/game-render.js");
const biome=read("js/v10-42-r6-biome-environment-director.js");

assert.match(render,/const FLOOR_TILE_PALETTES=Object\.freeze\(\{/,"renderer must own a five-floor palette table");
for(const id of ["threshold-stone","iron-blue","crypt-moss","ember-amber","crimson-sigil"]){
  assert.ok(render.includes(`id:"${id}"`),`missing floor palette ${id}`);
}
assert.match(render,/function applyFloorTilePalette\(s,wall\)/,"floor palette must apply at tile level");
assert.ok((render.match(/applyFloorTilePalette\(s,true\)/g)||[]).length>=2,"both normal and severe wall rendering must keep floor identity");
assert.ok((render.match(/applyFloorTilePalette\(s,false\)/g)||[]).length>=2,"both normal and severe floor rendering must keep floor identity");
assert.match(render,/1:Object\.freeze\(\{id:"threshold-stone".*rgba\(105,99,94,/s,"Floor 1 must remain neutral stone");
assert.match(render,/2:Object\.freeze\(\{id:"iron-blue".*rgba\(55,88,122,/s,"Floor 2 must be cold blue/steel");
assert.match(render,/3:Object\.freeze\(\{id:"crypt-moss".*rgba\(66,99,57,/s,"Floor 3 must be moss/crypt green");
assert.match(render,/4:Object\.freeze\(\{id:"ember-amber".*rgba\(139,70,32,/s,"Floor 4 must be ember amber/orange");
assert.match(render,/5:Object\.freeze\(\{id:"crimson-sigil".*rgba\(145,29,48,/s,"Floor 5 must be crimson danger red");
assert.match(render,/Crimson Sigil corridors: danger-red rails/,"final-floor corridors must reinforce the crimson identity");

assert.match(biome,/threshold:\{id:"threshold",name:"RUINED THRESHOLD".*accent:"168,163,156"/,"Threshold accents must stay neutral");
assert.match(biome,/iron:\{id:"iron",name:"IRON KEEP",material:"blue-steel keepstone".*accent:"127,179,221"/,"Iron Keep accents must support the cold-blue floor");
assert.match(biome,/bone:\{id:"bone",name:"MOSS CRYPT".*accent:"122,176,105"/,"Moss Crypt must remain green");
assert.match(biome,/ash:\{id:"ash",name:"EMBER DEPTHS".*accent:"255,103,52"/,"Ember Depths must remain orange");
assert.match(biome,/sigil:\{id:"sigil",name:"CRIMSON SIGIL SANCTUM",material:"blood-rune obsidian".*accent:"255,96,118"/,"final floor biome must finish in crimson danger colours");

console.log("Dungeon R73 five-floor colour progression contract passed.");
