import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const loader=read("js/asset-overrides.js"),core=read("js/game-core.js"),rpg=read("js/v10-5-rpg-balance.js"),network=read("js/game-network.js"),render=read("js/game-render.js"),polish=read("js/v10-30-polish.js"),css=read("css/v10-30-polish.css"),index=read("index.html");

assert.match(loader,/const CCG_POLISH_REV=CCG_RELEASE_REV;/,"V10.30 must inherit the canonical release cache token");
assert.match(loader,/CCGLostSizzlerReleaseGate=\{state,finish\}/,"launches must be protected by a release-ready gate");
assert.match(loader,/state\.pendingId=button\.id/,"an early mode selection must be queued rather than discarded");
assert.match(loader,/document\.getElementById\(id\)\?\.click\(\)/,"the queued mode selection must replay after enhancement completion");
assert.ok(loader.indexOf("v10-30-polish.js")>loader.indexOf("v10-29-achievements.js"),"V10.30 must load after achievements and all earlier runtime wrappers");
assert.match(index,/data-release-ready="false"/,"the HTML must begin in a release-gated state");

const follower=core.slice(core.indexOf("function followerLightVisibleTo"),core.indexOf("function visibleTo"));
assert.match(follower,/if\(!p\|\|!world\|\|!host\)return false/,"named-enemy light must require a real player observer");
assert.match(follower,/playerRoom===roomId/,"named-enemy light may be visible to a player sharing its room");
assert.match(follower,/A\.lineOfSight\(world\.map,p,e,pr\+radius\+1,host\)/,"distant named-enemy light must require player line of sight");
assert.doesNotMatch(follower,/continue;\s*return true;\s*}/,"named-enemy light must never reveal an entire remote room globally");

assert.match(rpg,/firearmUsable=Boolean\(player\.firearmUnlocked&&player\.weapon&&Number\(player\.mana\|\|0\)>0\)/,"adaptive combat power must ignore an empty firearm");
assert.match(rpg,/player\.meleeWeapon\|\|\{power:1,cooldown:390\}/,"adaptive combat power must use melee when the firearm cannot fire");
assert.match(rpg,/enemy\._v105ThreatLocked=true/,"enemy threat must lock after its first evaluation");
assert.match(rpg,/enemy\._v105ThreatLocked\)return/,"locked enemies must not gain health during an existing encounter");

assert.match(network,/function resourcePickupBlock\(/,"health and ammunition pickups must have a resource-waste guard");
assert.match(network,/The health pack stays on the floor until you have taken damage/,"full-health collection must preserve the health pack");
assert.match(network,/free<Math\.ceil\(pack\*\.25\)/,"ammunition must remain on the floor when less than a quarter would fit");
assert.match(network,/resourceSnapshot:\{health:p\.health,maxHealth:p\.maxHealth,mana:p\.mana,maxMana:p\.maxMana\}/,"online hosts must receive enough state to enforce the same pickup rules");
assert.match(network,/function reserveAmmoCollection\(/,"the final-objective reserve must support partial collection");
assert.match(network,/i\.ammoRounds=Math\.max\(0,available-rounds\)/,"unused reserve rounds must stay in the cache for a later visit");

assert.match(polish,/const POTION_TARGETS=\[3,4,4,5,5\]/,"ground potion density must rise gradually by floor");
assert.match(polish,/startWorld=function startWorldV130Polish/,"every generated floor must receive the final potion pass");
assert.match(polish,/function setBuildLabel\(\)/,"current build subtitle must be written by the one-shot release label updater");
assert.doesNotMatch(polish,/new MutationObserver\(/,"V10.30 must not keep a version-label MutationObserver alive");
assert.match(render,/function drawAmbientMotes\(\)/,"rooms must have restrained motif-aware ambient detail");
assert.match(render,/prefers-reduced-motion: reduce/,"ambient motion must respect reduced-motion preference");
assert.match(render,/function drawThreatEdgeIndicators\(p\)/,"incoming off-screen projectiles must have a directional warning");
assert.match(render,/candidates\.slice\(0,3\)/,"projectile warnings must remain bounded");
assert.match(css,/grid-template-columns:minmax\(0,1fr\) clamp\(220px,18vw,280px\)!important/,"desktop must reserve a wide dungeon column and narrow tactical sidebar");
assert.match(css,/\.ccg-game>\.game-area\s*\{[\s\S]*?grid-column:1!important[\s\S]*?grid-row:5!important/,"desktop gameplay must be pinned to the wide left column");
assert.match(css,/\.ccg-game>\.tactical-zone\s*\{[\s\S]*?grid-column:2!important[\s\S]*?grid-row:5!important/,"desktop tactical intelligence must be pinned to the narrow right column");
assert.match(css,/\.ccg-game>\.player-hub\s*\{[\s\S]*?grid-column:1\/-1!important[\s\S]*?grid-row:6!important/,"desktop player hub must span both columns below gameplay");

console.log("Lost Sizzler V10.30 release gate, visibility, balance, pickup, graphical polish and desktop layout checks passed.");
