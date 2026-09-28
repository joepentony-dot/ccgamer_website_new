import assert from "node:assert/strict";
import fs from "node:fs";

const play=fs.readFileSync(new URL("../js/game-play.js", import.meta.url),"utf8");

assert.match(play,/const trapBoundaryAt=performance\.now\(\),trapBoundary=activeTrapAtPlayer\(p,trapBoundaryAt\)/,
  "R66 must snapshot trap activity at the exact movement boundary");
assert.match(play,/if\(trapBoundary\)applyActiveTrapContact\(p,trapBoundary,trapBoundaryAt\)/,
  "R66 must commit the snapshotted active trap using the same boundary timestamp");
assert.match(play,/MAX_PROJECTILE_WALL_MS=2600/,
  "R66 must wall-clock expire stale projectiles during browser slowdown");
assert.match(play,/__ccgWallBornAt/,
  "R66 must wall-clock age visual effects independently of capped simulation dt");
assert.match(play,/expired\(particles\[i\],260\)/,
  "R66 must expire stale particles after real-time stalls");
assert.match(play,/expired\(rings\[i\],220\)/,
  "R66 must expire stale rings after real-time stalls");
assert.match(play,/expired\(floaters\[i\],360\)/,
  "R66 must expire stale floaters after real-time stalls");

console.log("Dungeon Carnage R66 trap-boundary and wall-clock effect lifetime contract passed");
