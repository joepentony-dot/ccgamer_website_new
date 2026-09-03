import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const runtime=read("js/v10-41-r29-spy-engine-isolation.js");
const network=read("js/v10-41-r29-spy-network-isolation.js");
const finalizer=read("js/v10-41-r29-loop-finalizer.js");
const controller=read("js/v10-41-mode-runtime.js");
const movementFinalizer=read("js/v10-41-spy-movement-finalizer.js");

assert.match(finalizer,/v10-41-r29-spy-engine-isolation\.js/,"r29 finalizer must load the isolated Spy runtime");
assert.match(finalizer,/data-ccg-r29-spy-engine|ccgR29SpyEngine/,"Spy runtime loader must be deduplicated");
assert.match(finalizer,/spyRuntimeReady/,"release diagnostics must expose whether the Spy runtime registered");
assert.match(finalizer,/v10-41-r29-spy-network-isolation\.js/,"r29 finalizer must load the dedicated Spy position transport after the isolated engine");
assert.match(finalizer,/data-ccg-r29-spy-network|ccgR29SpyNetwork/,"Spy network loader must be deduplicated");
assert.match(finalizer,/spyNetworkReady/,"release diagnostics must expose whether the Spy network transport registered");
assert.match(finalizer,/rail\.style\.setProperty\("display",live\?"contents":"none","important"\)/,"late r29 runtime must own live/idle notification rail geometry above legacy CSS");
assert.match(finalizer,/new MutationObserver\(syncNotificationRail\)/,"notification rail ownership must react immediately to toast visibility changes");

assert.match(network,/PACKET="v141_spy_position"/,"Spy movement must use a dedicated packet instead of Dungeon player movement packets");
assert.match(network,/net\.send\(PACKET,payload\)/,"local Spy movement must publish through the dedicated position transport");
assert.match(network,/remote\?\.set\?\.\(id,next\)/,"received Spy positions must update the remote agent directly");
assert.doesNotMatch(network,/processRemoteMovement\s*\(/,"dedicated Spy positions must never invoke Dungeon remote-movement room triggers");
assert.match(network,/if\(moved\)sendPosition\(true\)/,"successful Spy movement must publish immediately as well as via the heartbeat");

assert.match(runtime,/MODE_ID="sizzler-saboteurs"/,"isolated runtime must be scoped to Spy Vs Spy only");
assert.match(runtime,/ROOM_STEP_X=11,ROOM_STEP_Y=11,ROOM_W=9,ROOM_H=9/,"Spy physical rooms must be materially smaller than the old 13x13 grid");
assert.match(runtime,/const MOVE_MS=220,DASH_MOVE_MS=82/,"Spy walking cadence must remain aligned with the r26 220ms governor instead of the old over-fast 135ms runtime");
assert.match(runtime,/api\.distributeContents\(api\.createMap/,"host must rebuild the old 40-room override from the dedicated Saboteurs map generator");
assert.match(runtime,/Number\(match\.map\.rooms\?\.length\|\|0\)>30/,"old oversized 40-room Spy maps must be compacted before play");
assert.match(runtime,/active\.authoritative&&!match\.map\.spyRuntimeIsolatedR29&&\(match\.map\.largeRoomGridV135\|\|Number\(match\.map\.rooms\?\.length\|\|0\)>30\)/,"an already compacted Spy map must never be regenerated on every frame");
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
assert.match(runtime,/const delegate=typeof spyHurtOwner\.__ccgOriginal==="function"\?spyHurtOwner\.__ccgOriginal:state\.baseHurt/,"Spy damage boundary must retain a durable passthrough delegate outside Spy mode");
assert.doesNotMatch(runtime,/window\.update=spyUpdateOwner/,"Spy engine must not replace the authoritative controller update boundary");
assert.doesNotMatch(runtime,/function spyUpdateOwner/,"obsolete Spy global-update owner must be removed");

assert.match(runtime,/id==="timeBomb"\?"snare":id/,"the delayed floor time bomb must be removed from the functional Spy loadout");
assert.match(runtime,/filter\(trap=>trap\?\.trapId!=="timeBomb"\)/,"already armed time bombs must be stripped from isolated Spy state");
assert.match(runtime,/if\(!event\.repeat&&!state\.trapHeld\)\{state\.trapHeld=true;state\.trapPulse=true/,"T trap input must be edge-triggered instead of repeating while held");
assert.match(runtime,/if\(!state\.trapPulse\)match\.trapLoadout=original\.filter/,"a held/stale trap key must not keep placing floor traps on every rules tick");

assert.match(controller,/context\.controllerId===IDS\.SPY_ONLINE/,"authoritative mode boundary must select Spy instead of the shared Dungeon source");
assert.match(controller,/result=runSpyControllerFrame\(dt\)/,"Spy controller must call the isolated Spy rules frame directly");
assert.match(controller,/state\.spySourceBypasses\+\+/,"controller diagnostics must count Dungeon-source bypasses during Spy");
assert.match(controller,/typeof engine\?\.isolatedUpdate!=="function"[\s\S]*state\.spyFrameMisses\+\+;[\s\S]*return false/,"missing Spy runtime must fail closed instead of falling back to Dungeon rules");
assert.match(controller,/if\(next\.id===IDS\.SPY_ONLINE\)[\s\S]*installSharedFrameBoundary\(\);window\.CCGLostSizzlerV141R29SpyEngine\?\.enterIsolation/,"Spy enter must synchronously restore the authoritative controller boundary before isolation");
assert.match(controller,/window\.CCGLostSizzlerV141R29SpyEngine\?\.leaveIsolation\?\.\(\);installSharedFrameBoundary\(\)/,"Spy controller exit must release mode-owned movement/damage state and retain the controller boundary");
assert.match(runtime,/window\.CCGLostSizzlerModeRuntime=runtimeRegistry/,"mode runtime registry must expose the isolation boundary");
assert.match(runtime,/isolatedRules:true,sharedRenderer:true/,"Spy must own rules while deliberately sharing only the renderer");
assert.match(runtime,/state\.timer=setInterval\(monitor,MONITOR_MS\)/,"Spy movement/damage ownership must still be monitored while the mode is active");
assert.match(runtime,/const currentHurt=window\.hurtPlayer,hurtAlreadyComposed=ownerChainHas\(currentHurt,spyHurtOwner\)/,"Spy entry must inspect the live damage-owner ancestry before installing its boundary");
assert.match(runtime,/if\(!hurtAlreadyComposed\)\{state\.baseHurt=currentHurt;spyHurtOwner\.__ccgOriginal=currentHurt;window\.hurtPlayer=spyHurtOwner\}/,"Spy entry must install its damage boundary with the current owner as its delegate");
assert.match(runtime,/window\.movePlayer=spyMoveOwner;suppressLegacyPhysicalBuilder\(\)/,"entering Spy must still synchronously own movement without replacing the global update frame");
assert.match(runtime,/if\(state\.isolated&&!ownerChainHas\(window\.hurtPlayer,spyHurtOwner\)\)/,"Spy monitor must preserve later damage wrappers that already compose around its boundary");
assert.doesNotMatch(movementFinalizer,/window\.update=function updateV141SpyRespawnFinal/,"Spy respawn finalizer must not add another global update wrapper");
assert.match(movementFinalizer,/controllerOwnedRespawns:true/,"Spy respawns must declare controller-owned execution");

console.log("Lost Sizzler V10.41 controller-owned Spy engine, stable compact map, bounded movement, dedicated position transport, furniture collision and respawn ownership checks passed.");