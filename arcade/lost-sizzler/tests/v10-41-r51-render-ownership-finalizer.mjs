import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameRoot=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(gameRoot,relative),"utf8");
const finalizer=read("js/v10-41-r51-render-ownership-finalizer.js");
const loader=read("js/v10-41-lake-item-safety.js");

assert.match(finalizer,/!window\.drawPlayer\.__ccgV141R51VisualPolish/,"finalizer must detect a detached player wrapper");
assert.match(finalizer,/!window\.drawEnemy\.__ccgV141R51VisualPolish/,"finalizer must detect a detached enemy wrapper");
assert.match(finalizer,/api\.state\.playerSource=null/,"player recovery must release the stale remembered source before re-wrapping");
assert.match(finalizer,/api\.state\.enemySource=null/,"enemy recovery must release the stale remembered source before re-wrapping");
assert.match(finalizer,/api\.installGameplayVisuals\(\)/,"finalizer must reuse the established R51 presentation installer");
assert.match(finalizer,/MAX_CHAIN=12/,"compatibility inspection must stay bounded");
assert.match(finalizer,/current\?\.__ccgOriginal/,"compatibility inspection must follow only the established renderer ancestry chain");
assert.match(finalizer,/__ccgV141R48CharacterAnimation/,"R51 must recognise the retained R48 player-animation owner");
assert.match(finalizer,/current\.__ccgV141R48CharacterAnimation=true/,"an R51 composite above R48 must preserve the R48 ownership marker so the two maintenance timers do not re-wrap each other");
assert.match(finalizer,/sealPlayerCompatibility\(\)/,"renderer recovery must seal the composite player owner after repair");
assert.doesNotMatch(finalizer,/health\s*=|damage\s*=|score\s*=|host\.|sendIntent|broadcastWorld/,"renderer ownership recovery must not take gameplay or network authority");
assert.match(loader,/v10-41-r51-render-ownership-finalizer\.js/,"canonical late loader must install the R51 ownership finalizer");
assert.ok(loader.indexOf("v10-41-r51-menu-focus-polish.js")<loader.indexOf("v10-41-r51-render-ownership-finalizer.js"),"ownership finalizer must load after the R51 presentation modules it maintains");

console.log("Lost Sizzler V10.41 r51 renderer ownership and R48 compatibility recovery contract passed.");