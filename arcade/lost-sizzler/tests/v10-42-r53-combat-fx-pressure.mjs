import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const play=fs.readFileSync(path.join(root,"js/game-play.js"),"utf8");

assert.match(
  play,
  /function projectileImpactFxAllowed\(\)\{return particles\.length<620&&rings\.length<96&&floaters\.length<72\}/,
  "crowded projectile impacts must shed only redundant outer FX before the render pools saturate"
);
assert.match(
  play,
  /if\(projectileImpactFxAllowed\(\)\)\{burst\(e\.x,e\.y,impactCol,20,1\.35\);ring\(e\.x,e\.y,impactCol,28\)\}const owner=findLocal\(b\.owner\);if\(owner\)\{damageEnemy\(e,b\.power,b\.element,owner\)\}/,
  "FX pressure must not skip projectile damage ownership"
);
assert.match(
  play,
  /if\(particles\.length>900\)particles\.splice\(0,particles\.length-900\)/,
  "particle pool cap must remain bounded"
);
assert.match(
  play,
  /if\(rings\.length>120\)rings\.splice\(0,rings\.length-120\)/,
  "ring pool must be bounded during crowded combat"
);
assert.match(
  play,
  /if\(floaters\.length>96\)floaters\.splice\(0,floaters\.length-96\)/,
  "floating combat text pool must be bounded during crowded combat"
);
assert.doesNotMatch(
  play,
  /projectileImpactFxAllowed\(\)[\s\S]{0,260}(?:e\.hp\s*[-+]=|knockEnemyAway\s*=|return\s+false)/,
  "render-pressure shedding must not change damage or knockback semantics"
);

console.log("PASS V10.42 R53 crowded projectile FX pressure contract");
