import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=(relative)=>fs.readFileSync(path.join(root,relative),"utf8");

const mapSource=read("js/v10-41-solo-full-map.js");
const splitHudSource=read("js/split-player-hud.js");
const splitInputSource=read("js/v10-41-split-friendly-fire.js");

assert.match(
  splitHudSource,
  /v10-41-solo-full-map\.js/,
  "split runtime must load the existing explored full-map module"
);
assert.match(
  splitHudSource,
  /IJKL · ENTER · O · M MAP/,
  "split HUD must continue advertising P2 keyboard controls and M map"
);

assert.match(
  mapSource,
  /playMode==="solo"\|\|playMode==="split"/,
  "full map must be eligible in both solo and local split-screen runs"
);
assert.match(
  mapSource,
  /event\.code==="KeyM"/,
  "full map must own KeyM"
);
assert.match(
  mapSource,
  /if\(event\.repeat\)return;/,
  "held M must not repeatedly toggle the map"
);
assert.match(
  mapSource,
  /state\.open&&event\.code==="Escape"/,
  "Escape must close an open full map"
);
assert.match(
  mapSource,
  /explored\?\.get\?\.\(p1\?\.id\)/,
  "full map must use the same P1 exploration knowledge as the existing radar"
);
assert.match(
  mapSource,
  /if\(!ex\.has\(`\$\{x\},\$\{y\}`\)\)continue;/,
  "undiscovered map cells must remain hidden"
);

const p2ControlDeclaration=splitInputSource.match(/const P2_CONTROL_CODES=[^\n]+/)?.[0]??"";
assert.notEqual(p2ControlDeclaration,"","P2 control ownership declaration must remain present");
for(const code of ["KeyI","KeyJ","KeyK","KeyL","KeyO"]){
  assert.match(p2ControlDeclaration,new RegExp(`"${code}"`),`P2 must retain ${code}`);
}
assert.doesNotMatch(
  p2ControlDeclaration,
  /"KeyM"/,
  "KeyM must remain independent from P2 movement/action ownership"
);

console.log("V10.41 split full-map contract passed");
