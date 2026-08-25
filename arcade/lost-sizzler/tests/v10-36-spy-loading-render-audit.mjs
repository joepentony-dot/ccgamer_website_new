import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const bootstrap=read("js/v10-36-bootstrap.js");
const version=read("js/version-check.js");
const css=read("css/v10-36-special-ui.css");
const render=read("js/game-render.js");
const quality=read("js/v10-35-quality.js");
const sab=read("js/sizzler-saboteurs.js");

assert.match(version,/v10-36-bootstrap\.js\?v=\$\{encodeURIComponent\(RELEASE_CACHE\)\}/,"V10.36 bootstrap must load before the enhancement queue completes using the current release cache generation");
assert.match(bootstrap,/LOADING — PLEASE WAIT/,"loading overlay must tell players to wait");
assert.match(bootstrap,/ccg-release-loading-progress/,"loading overlay must expose a progress bar");
assert.match(bootstrap,/MutationObserver/,"loading progress must advance as enhancement scripts arrive");
assert.match(bootstrap,/gate\.finish=function finishV136/,"release-gate completion must drive the loading screen to completion");
assert.match(css,/\.ccg-release-loading/,"loading screen styling must remain in CSS");
assert.match(css,/progress::-webkit-progress-value/,"loading progress needs a visible filled state");

assert.match(bootstrap,/SPY VS SPY FIELD KIT/,"TAB inventory must become a Spy-specific field kit");
assert.match(bootstrap,/Normal dungeon inventory information is hidden for this mode/,"Spy inventory must not present legacy dungeon guidance");
assert.match(bootstrap,/if\(spyActive\(\)\)return renderSpyInventoryPanel\(\)/,"legacy inventory rendering must be bypassed only for Spy Vs Spy");
assert.match(bootstrap,/restoreInventoryChrome\(\);return legacyRender/,"normal dungeon inventory must be restored outside Spy Vs Spy");
for(const key of ["WASD / ARROWS","SPACE","E","T","X","SHIFT","C","TAB","M / F","ESC"])assert.ok(bootstrap.includes(`[\"${key}\"`)||bootstrap.includes(`["${key}"`),`Spy field kit is missing the ${key} control`);
for(const text of ["Required objective pieces","Novelty weapons","Trap loadout","Trap counters"])assert.ok(bootstrap.includes(text),`Spy field kit is missing ${text}`);
for(const id of ["case","joystick","tape","key"])assert.ok(sab.includes(`id: \"${id}\"`)||sab.includes(`id:"${id}"`),`Saboteurs rules are missing objective ${id}`);
assert.match(bootstrap,/Object\.values\(SAB\.WEAPONS/,"weapon guide must be generated from the live Saboteurs rules");
assert.match(bootstrap,/Object\.values\(SAB\.TRAPS/,"trap guide must be generated from the live Saboteurs rules");
assert.match(bootstrap,/Object\.values\(SAB\.COUNTERS/,"counter guide must be generated from the live Saboteurs rules");

assert.match(bootstrap,/function relocateDoorObstacle\(blocker\)/,"door-frame repair must be able to move nearby furniture");
assert.match(bootstrap,/if\(blocker&&!blocker\.structural&&relocateDoorObstacle\(blocker\)\)moved\+\+/,"a non-structural obstacle must be relocated before a door frame is abandoned");
assert.match(bootstrap,/world\.map\[q\.y\]\[q\.x\]=1/,"repaired door supports must become real wall cells");
assert.match(bootstrap,/if\(!routeStillExists\(\)\)\{world\.map\[q\.y\]\[q\.x\]=0;continue\}/,"door wall repairs must never break the navigable route");
assert.match(bootstrap,/BOX_TYPES=new Set\(\["crate","box","boxes"/,"box and crate furniture must be explicitly covered");
assert.match(bootstrap,/ensureDestructibleBoxes\(\)/,"box/crate destructibility must be enforced at runtime");
assert.match(bootstrap,/host\.blockingDecor\.push\(blocker\)/,"missing crate blockers must be restored to the standard destructible-furniture path");

assert.match(bootstrap,/installChestFrameGutters\(\)/,"chest animation cells must receive guard pixels");
assert.match(bootstrap,/noDoubleDrawPolicy:true/,"the render audit must document the no-double-draw ownership rule");
assert.match(quality,/drawDoorsV135AtlasOnly/,"V10.35 normal doors must remain atlas-only");
assert.match(quality,/drawWallLightsV135AtlasOnly/,"V10.35 wall torches must remain atlas-only");
assert.match(render,/if\(pixelSheet\?\.complete&&pixelSheet\.naturalWidth>=160\).*?continue/s,"new chest sprites must bypass the procedural chest renderer rather than layer over it");

console.log("Lost Sizzler V10.36 loading, Spy field kit, door-frame, destructible-crate and render-ownership checks passed.");
