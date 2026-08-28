import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const source=read("js/v10-41-r36-solo-render-recovery.js");
const loader=read("js/v10-41-r30-buglog.js");

assert.match(loader,/v10-41-r36-solo-render-recovery\.js/,"r30 tail must load the r36 Solo render recovery owner");
assert.match(loader,/data-ccg-r36-solo-render-recovery/,"r36 Solo render recovery loader must be deduplicated");
assert.match(loader,/loadSoloDungeonR31\(\);loadSoloRenderRecoveryR36\(\);/,"r36 must load after the existing r31 Solo recovery layer");

assert.match(source,/dungeon-solo/,"r36 recovery must remain scoped to the Solo Dungeon controller");
assert.match(source,/new Set\(\["horde-survivor","sizzler-saboteurs"\]\)/,"r36 must reject both authoritative special modes");
assert.match(source,/\["dungeon-online","horde-solo","horde-online","spy-online","split-screen"\]\.includes\(detected\)/,"r36 fallback detection must explicitly reject every non-Solo controller");

assert.match(source,/probeCanvas\.width=16;probeCanvas\.height=9/,"black-frame detection must use a tiny bounded probe canvas");
assert.match(source,/const WATCHDOG_MS=280/,"canvas probing must be throttled to a low-frequency Solo watchdog");
assert.match(source,/state\.watchdogTimer=setInterval\(watchdog,WATCHDOG_MS\)/,"black-frame verification must run on the throttled watchdog");
const safeRenderBody=source.match(/function safeRender\([\s\S]*?\n  }\n\n  function installRenderGuard/)?.[0]||"";
assert.ok(safeRenderBody,"r36 must expose the final Solo render fault boundary");
assert.ok(!safeRenderBody.includes("canvasHasVisibleFrame()"),"the animation-frame render wrapper must not perform pixel readback on every frame");

assert.match(source,/backupCtx\.drawImage\(game,0,0\)/,"r36 must preserve the last healthy full game frame");
assert.match(source,/context\.drawImage\(backupCanvas/,"r36 must restore the last healthy frame after a render fault");
assert.match(source,/state\.blankDetections\+\+/,"r36 must count genuinely blank Solo canvases");
assert.match(source,/recoverSoloDisplay\("r36 black-canvas watchdog"\)/,"blank-canvas recovery must re-enter the existing r31 display boundary after restoring the backup");

assert.match(source,/!finite\(p1\.x\)\|\|!finite\(p1\.y\)/,"r36 must detect invalid player coordinates before rendering");
assert.match(source,/p1\.x=Number\(world\?\.start\?\.x\)\|\|1/,"invalid Solo coordinates must recover to the floor start");
assert.match(source,/cameras\?\.clear\?\.\(\)/,"coordinate/display recovery must invalidate stale camera state");

assert.match(source,/state\.consecutiveFaults>=2\)pauseInvisibleCombat\(\)/,"persistent Solo render faults must stop invisible combat");
assert.match(source,/mode="paused"/,"persistent render failure must pause rather than leave the player taking invisible damage");
assert.match(source,/UI\?\.pause\?\.classList\?\.remove\("hidden"\)/,"persistent render failure must expose a visible recovery/pause surface");
assert.match(source,/__ccgV141R36SoloRenderRecovery=true/,"r36 must mark the final render owner");
assert.match(source,/__ccgV141PostPlaytestRender=true/,"r36 must carry the retained post-playtest render marker so the older monitor yields");

for(const forbidden of ["window.update=","window.update =","update=function","update = function"]){
  assert.ok(!source.includes(forbidden),`r36 must not acquire shared update ownership: ${forbidden}`);
}

console.log("Lost Sizzler r36 Solo render-fault, black-canvas watchdog and mode-isolation contracts passed.");