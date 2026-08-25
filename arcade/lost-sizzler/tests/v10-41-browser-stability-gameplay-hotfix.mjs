import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

const hotfix=read("js/v10-41-browser-stability-gameplay-hotfix.js");
const lake=read("js/v10-41-lake-item-safety.js");
const render=read("js/game-render.js");

assert.match(lake,/v10-41-browser-stability-gameplay-hotfix\.js\?v=20260825f/,"the late V10.41 runtime chain must load the browser stability gameplay hotfix");

assert.match(render,/function loop\(t\)\{const dt=Math\.min\(45,t-last\|\|16\);last=t;.*update\(dt\);render\(\);requestAnimationFrame\(loop\)\}/s,"the inherited frame loop remains the unguarded baseline that the hotfix must contain");
assert.match(hotfix,/function loopV141CrashContained\(timestamp\)/,"the hotfix must replace the frame callback with a crash-contained loop");
assert.match(hotfix,/try\{if\(typeof update==="function"\)update\(dt\)\}catch\(error\)\{failed=true;noteFault\("update",error\)\}/,"update exceptions must be contained rather than killing requestAnimationFrame");
assert.match(hotfix,/try\{if\(typeof render==="function"\)render\(\)\}catch\(error\)\{failed=true;noteFault\("render",error\)\}/,"render exceptions must be contained rather than killing requestAnimationFrame");
assert.match(hotfix,/requestAnimationFrame\(loop\)/,"the guarded frame path must always reschedule the game loop");
assert.match(hotfix,/state\.faultBurst>=4.*setTimeout\(schedule,90\)/,"repeated frame faults must be throttled so an exception storm cannot peg the browser");

assert.match(hotfix,/closePauseMenuV141StableResume/,"pause resume must use the hardened resume wrapper");
assert.match(hotfix,/forceResumeFallback\(\)/,"pause resume must have a fallback when inherited resume code throws");
assert.match(hotfix,/addEventListener\("focus",recoverFocus/,"returning to the tab must reset stale frame/input state");
assert.match(hotfix,/visibilitychange.*recoverFocus/s,"visibility restoration must run the same recovery path");
assert.match(hotfix,/fullscreenchange.*requestSafeResize/s,"fullscreen changes must reset timing/cameras and request a safe resize");

assert.match(hotfix,/w=Math\.min\(58,maxW\),h=Math\.min\(38,maxH\)/,"Horde must use the compact arena dimensions rather than nearly the full 128x84 world");
assert.match(hotfix,/world\._v141CompactHordeArena=true/,"the compact Horde arena must be marked so inherited geometry cannot rebuild it every frame");
assert.match(hotfix,/hordePerimeter\(room,enemyIndex\+\+\)/,"existing Horde enemies outside the compact arena must be moved back to its perimeter");

assert.match(hotfix,/function movePlayerV141SpyFallback\(player,dx,dy,dash=false\)/,"Spy Vs Spy must have a movement fallback around inherited dungeon movement rejection");
assert.match(hotfix,/window\.CCGWorld\.walkable\(world\.map,nx,ny,host\)/,"the Spy fallback may only step onto genuinely walkable tiles");
assert.match(hotfix,/repairSpySpawn\(\)/,"Spy rounds must repair an accidentally trapped spawn");
assert.match(hotfix,/player\.hitStunMs=0/,"Spy spawn repair must clear stale inherited hit-stun that can leave a player rotating without moving");

console.log("Lost Sizzler V10.41 browser crash containment, pause recovery, compact Horde arena and Spy movement hotfix checks passed.");
