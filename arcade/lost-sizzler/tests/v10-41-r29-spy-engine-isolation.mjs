import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const runtime=read("js/v10-41-r29-spy-engine-isolation.js");
const finalizer=read("js/v10-41-r29-loop-finalizer.js");

assert.match(finalizer,/v10-41-r29-spy-engine-isolation\.js/,"r29 finalizer must load the isolated Spy runtime");
assert.match(finalizer,/data-ccg-r29-spy-engine|ccgR29SpyEngine/,"Spy runtime loader must be deduplicated");
assert.match(finalizer,/spyRuntimeReady/,"release diagnostics must expose whether the Spy runtime registered");

assert.match(runtime,/MODE_ID="sizzler-saboteurs"/,"isolated runtime must be scoped to Spy Vs Spy only");
assert.match(runtime,/ROOM_STEP_X=11,ROOM_STEP_Y=11,ROOM_W=9,ROOM_H=9/,"Spy physical rooms must be materially smaller than the old 13x13 grid");
assert.match(runtime,/api\.distributeContents\(api\.createMap/,"host must rebuild the old 40-room override from the dedicated Saboteurs map generator");
assert.match(runtime,/Number\(match\.map\.rooms\?\.length\|\|0\)>30/,"old oversized 40-room Spy maps must be compacted before play");
assert.match(runtime,/while\(room\.furniture\.length<4\)/,"every compact Spy room must expose four searchable furniture objects");
assert.match(runtime,/room\.furniture\[0\]\.type="bookcase";room\.furniture\[1\]\.type="bookcase"/,"each Spy room must retain at least two bookcases");

assert.match(runtime,/spyUnbreakable:true/,"Spy furniture must be marked indestructible");
assert.match(runtime,/host\.blockingDecor\.push\(\{\.\.\.decor\}\)/,"Spy furniture must be installed into the authoritative collision blockers");
assert.match(runtime,/if\(furnitureAt\(nx,ny\)\)\{state\.furnitureBlocks\+\+;break\}/,"isolated movement must explicitly reject furniture cells");
assert.match(runtime,/occupiedByOther\(player,nx,ny\)/,"two active agents must not occupy the same tile");

assert.match(runtime,/E — SEARCH \$\{label\}/,"adjacent searchable furniture must show a persistent E interaction prompt");
assert.match(runtime,/ALREADY SEARCHED/,"searched furniture must communicate its state instead of inviting another search");
assert.match(runtime,/X — EXTRACT COMPLETE SIZZLER CASE/,"completed-case extraction must also have a contextual prompt");

assert.match(runtime,/for\(const key of \["enemies","generators","traps","hazardRooms","arenas","timedRooms"/,"Spy boundary must continuously remove ordinary Dungeon combat and hazard collections");
assert.match(runtime,/campStates\?\.clear/,"ordinary Dungeon idle/camping state must not survive inside Spy");
assert.match(runtime,/function spyHurtOwner[\s\S]*if\(spyActive\(\)\)\{state\.dungeonDamageBlocked\+\+;return false\}/,"ordinary Dungeon hurtPlayer damage must be rejected while Spy owns combat");
assert.match(runtime,/function spyUpdateOwner\(\)\{if\(spyActive\(\)\)return isolatedUpdate\(\);return typeof state\.baseUpdate/,"Spy update must bypass the inherited Dungeon update instead of running it first");

assert.match(runtime,/id==="timeBomb"\?"snare":id/,"the delayed floor time bomb must be removed from the functional Spy loadout");
assert.match(runtime,/filter\(trap=>trap\?\.trapId!=="timeBomb"\)/,"already armed time bombs must be stripped from isolated Spy state");
assert.match(runtime,/if\(!event\.repeat&&!state\.trapHeld\)\{state\.trapHeld=true;state\.trapPulse=true/,"T trap input must be edge-triggered instead of repeating while held");
assert.match(runtime,/if\(!state\.trapPulse\)match\.trapLoadout=original\.filter/,"a held/stale trap key must not keep placing floor traps on every rules tick");

assert.match(runtime,/window\.CCGLostSizzlerModeRuntime=runtimeRegistry/,"mode runtime registry must expose the new isolation boundary for future per-mode engines");
assert.match(runtime,/isolatedRules:true,sharedRenderer:true/,"Spy must own rules while deliberately sharing only the renderer");
assert.match(runtime,/state\.timer=setInterval\(monitor,MONITOR_MS\)/,"Spy ownership must be reasserted if an older deferred wrapper attempts to reclaim globals");
assert.match(runtime,/window\.update=spyUpdateOwner;window\.movePlayer=spyMoveOwner;window\.hurtPlayer=spyHurtOwner/,"entering Spy must atomically take ownership of update, movement and damage");
assert.match(runtime,/window\.update===spyUpdateOwner&&typeof state\.baseUpdate==="function"/,"leaving Spy must restore the inherited Dungeon runtime instead of leaking Spy rules outward");

console.log("Lost Sizzler V10.41 r29 isolated Spy engine, compact rooms, furniture collision, interaction prompts and idle-trap regression checks passed.");