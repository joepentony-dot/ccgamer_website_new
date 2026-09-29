import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const core=fs.readFileSync(new URL("js/game-core.js",root),"utf8");
const world=fs.readFileSync(new URL("js/world.js",root),"utf8");
const render=fs.readFileSync(new URL("js/game-render.js",root),"utf8");
const gameplayCss=fs.readFileSync(new URL("css/v10-6-gameplay.css",root),"utf8");

assert.match(core,/bronzeHub:\$\("hud-bronze-hub"\)/,"persistent quick-inventory header must own an independent Bronze key HUD field");
assert.match(core,/if\(UI\.bronzeHub\)UI\.bronzeHub\.textContent=\`BRONZE ×\$\{p1\.bronzeKeys\|\|0\}\`/,"persistent Bronze key header must update directly from the authoritative player count");
assert.match(gameplayCss,/\.hub-inventory-flags\{[^}]*overflow:visible!important/s,"quick-inventory status flags must not be clipped by their header");
assert.match(gameplayCss,/\.hub-bronze-key\{[^}]*flex:0 0 auto!important[^}]*white-space:nowrap!important/s,"Bronze key status must stay pinned and non-wrapping above the inventory slots");

assert.match(world,/axis:"horizontal"/,"bonus-room door specs must preserve horizontal orientation");
assert.match(world,/axis:"vertical"/,"bonus-room door specs must preserve vertical orientation");
assert.match(world,/reserveDoorTopology\(doorSpecs\)/,"Stage-5 topology must reserve door anchor cells");
assert.match(world,/doorTopologyValid\(map,door\)/,"generated doors require a final topology invariant");
assert.match(world,/repairDoorTopology\(map,door\)/,"invalid post-carve door topology must be repaired structurally");

assert.match(render,/radarCtx\.setTransform\(1,0,0,1,0,0\)/,"radar renderer must reset its transform before every frame");
assert.match(render,/radarCtx\.globalCompositeOperation="source-over"/,"radar renderer must reset compositing ownership");
assert.match(render,/validPoint=q=>Boolean\(q&&Number\.isFinite\(Number\(q\.x\)\)&&Number\.isFinite\(Number\(q\.y\)\)\)/,"radar markers must reject malformed coordinates");

console.log("Dungeon Carnage R67 persistent Bronze HUD, radar and door-topology contract passed.");
