import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const index=read("index.html");
const manifest=JSON.parse(read("version.json"));
const repair=read("js/v10-41-r28-special-mode-repair.js");
const noPause=read("js/v10-41-multiplayer-no-pause.js");
const css=read("css/v10-41-r28.css");
const checker=read("js/version-check.js");
const changelog=read("js/v10-12-developer-changelog.js");
const r29=read("js/v10-41-r29-runtime-repair.js");

assert.equal(manifest.build,"2026.08.26.30");
assert.equal(manifest.cacheToken,"20260826r30");
assert.match(index,/ccg-lost-sizzler-build" content="2026\.08\.26\.30"/);
assert.match(index,/ccg-lost-sizzler-cache" content="20260826r30"/);
assert.match(index,/css\/v10-41-r28\.css\?v=20260826r30/);
assert.match(index,/js\/v10-41-r28-special-mode-repair\.js\?v=20260826r30/);
assert.match(index,/js\/v10-41-r29-runtime-repair\.js\?v=20260826r30/);
assert.ok(index.indexOf("v10-41-r27-spy-isolation.js?v=20260826r30")<index.indexOf("v10-41-r28-special-mode-repair.js?v=20260826r30"),"retained r28 repair must execute after r27");
assert.ok(index.indexOf("v10-41-r28-special-mode-repair.js?v=20260826r30")<index.indexOf("v10-41-r29-runtime-repair.js?v=20260826r30"),"r29 must execute after the retained r28 repair");

const forcePlaying=noPause.match(/function forcePlaying\(\)\{[\s\S]*?return true;\n  \}/)?.[0]||"";
assert.ok(forcePlaying,"multiplayer no-pause must retain forcePlaying");
assert.doesNotMatch(forcePlaying,/input\.clear|input\?\.clear/,"multiplayer pause recovery must never clear held input");
assert.doesNotMatch(noPause,/window\.update\s*=/,"multiplayer no-pause must not own the shared update loop after controller isolation");
assert.match(noPause,/state\.timer=setInterval\(\(\)=>\{install\(\);if\(multiplayerActive\(\)\)forcePlaying\(\)\},80\)/,"multiplayer pause recovery must retain a small mode-checked failsafe outside the shared update ancestry");
assert.match(noPause,/window\.pause=function pauseV141MultiplayerLock/,"direct pause attempts must still be intercepted synchronously");
assert.match(noPause,/window\.openPauseMenu=function openPauseMenuV141MultiplayerLock/,"direct pause-menu attempts must still be intercepted synchronously");

assert.match(repair,/const HORDE_SPEED_SCALE=\.75;/,"Horde dedicated movement must be slowed by 25%");
assert.match(repair,/const HORDE_LIGHT_RADIUS=28;/,"Horde permanent illumination must use the enlarged radius");
assert.match(repair,/HORDE_ARENA_CELLS=Object\.freeze\(\{width:94,height:58\}\)/,"Horde arena must be moderately smaller than the 128x84 dungeon world");
assert.match(repair,/Math\.max\(1,oldMax-1\)/,"Horde enemy maximum HP must drop by one with a one-HP floor");
assert.match(repair,/oldHp-1/,"living Horde enemy HP must drop by one alongside maximum HP");
assert.match(repair,/player\.weapon\.shots=3/,"Horde weapons must be triple-shot from the first wave");
assert.match(repair,/player\.mana=player\.maxMana/,"Horde unlimited ammunition must remain filled");
assert.match(repair,/drawPlayerResourcesV141R28\(\)\{if\(hordeActive\(\)\)return false/,"Horde must suppress transient ammo-over-player rendering");
assert.match(repair,/drawFogV141R28\(\)\{if\(hordeActive\(\)\)return false/,"Horde must suppress darkness/fog while leaving normal dungeon fog intact");
assert.match(repair,/HORDE_SUPPRESSED_TOAST=\/\^HORDE SCORE SAVED\$\/i/,"Horde Score Saved popup must not cover Horde play");
assert.match(repair,/value\.startsWith\("HORDE SURVIVOR"\)\|\|value\.startsWith\("DEFEATED "\)/,"old canvas Horde status banner must be removed");

assert.match(repair,/function cardinalEnemyShot\(/,"enemy-only cardinal shot normaliser must exist");
assert.match(repair,/ax>=ay\?\{\.\.\.shot,dx:[^}]+,dy:0\}:\{\.\.\.shot,dx:0,dy:/,"enemy diagonal shots must collapse to one cardinal axis");
assert.doesNotMatch(repair,/function firePlayer|weaponDirections\s*=|attackDirection\s*=/,"retained r28 repair must not replace player firing direction code");

assert.match(repair,/const SPY_DUNGEON_ONLY=/,"Spy must publish an explicit Dungeon-notification reject boundary");
assert.match(repair,/if\(SPY_DUNGEON_ONLY\.test\(combined\)\)return false/,"Dungeon-only notification wording must lose even if generic Spy words appear elsewhere in the copy");
assert.match(repair,/clearSpyNotificationLeak\(\)/,"Spy must remove already-visible stale notifications");
assert.match(repair,/while\(room\.furniture\.length<4\)/,"Spy rooms must have four searchable furniture objects");
assert.match(repair,/room\.furniture\[0\]\.type="bookcase";room\.furniture\[1\]\.type="bookcase"/,"every normal Spy room must contain at least two bookcases");
assert.match(repair,/thirdBookcase=.*%4===0/,"some Spy rooms must contain a third bookcase");
assert.match(repair,/Math\.abs\(door\.x-cell\.x\)\+Math\.abs\(door\.y-cell\.y\)>=4/,"Spy furniture must keep doorway approaches clear");
assert.match(repair,/structural:true,spyUnbreakable:true,hp:999999,maxHp:999999/,"Spy search furniture must remain indestructible");

for(const [floor,hp,scale] of [[1,2,"1.55"],[2,3,"1.30"],[3,4,"1.10"],[4,5,".95"],[5,6,".82"]]){
  const scalePattern=scale.startsWith(".")?`\\${scale}`:scale.replace(".","\\.");
  assert.match(repair,new RegExp(`${floor}:Object\\.freeze\\(\\{hp:${hp},moveSpeedScale:${scalePattern}\\}\\)`),`Floor ${floor} ordinary Joystick Hunter balance missing`);
}
assert.match(repair,/!enemy\.follower.*!enemy\.ccgBoss.*!enemy\.guardian.*!enemy\.champion/,"named and special Hunter-AI enemies must be excluded from ordinary Joystick Hunter scaling");

assert.match(css,/\.ccg-game,[\s\S]*width:100vw!important;[\s\S]*max-width:none!important/,"large desktop shell must no longer be capped at 1480px");
assert.match(css,/@media \(min-width:1600px\)/,"large desktop override must be isolated from smaller layouts");
assert.match(css,/\.canvas-wrap canvas#game\{[\s\S]*width:100%!important;[\s\S]*height:100%!important/,"the visible canvas must expand with the available 1440p play region");

assert.match(checker,/setTimeout\(\(\)=>checkLatest\(false\),900\)/,"version checker must automatically check shortly after menu load");
assert.match(checker,/if\(menuVisible\(\)\)renderPanel\("outdated"\)/,"an outdated build must automatically display the update panel when the menu is visible");
assert.match(checker,/Refresh to Latest Version/,"automatic update prompt must provide the same fresh-load action as the manual updater");
assert.match(checker,/cache:"no-store"/,"automatic update comparison must bypass stale manifest caches");

for(const id of ["LS-0825-14","LS-0825-15","LS-0825-16","LS-0825-17","LS-0825-18","LS-0825-19","LS-0825-20","LS-0825-21","LS-0825-22"]){
  assert.match(changelog,new RegExp(id),`retained r28 bug log must contain ${id}`)
}
assert.match(changelog,/build 2026\.08\.25\.28/,"historical r28 bug tracker entry must continue to identify the r28 build that introduced these fixes");
assert.match(r29,/__CCG_LOST_SIZZLER_V141_R29_RUNTIME_REPAIR__/,"r29 final runtime layer must remain present above the retained r28 feature layer");

console.log("Lost Sizzler V10.41 retained r28 Horde, Spy, Hunter, 1440p and update protections passed inside r30.");
