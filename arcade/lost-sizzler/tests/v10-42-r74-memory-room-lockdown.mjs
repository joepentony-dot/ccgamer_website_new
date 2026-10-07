import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const systems=read("js/systems.js");
const play=read("js/game-play.js");
const render=read("js/game-render.js");

assert.match(systems,/padEntryByPlayer:\{\}/,"memory puzzle generation must initialise per-player pad-entry state");
assert.match(systems,/lockdownActive:false/,"memory puzzle generation must initialise chamber lockdown state");

assert.match(play,/function memoryPadEntry\(p,z=host\.memoryPuzzle\)/,"memory puzzle must own an entry-edge detector independent of a single movement callback");
assert.match(play,/if\(current===previous\)return false/,"standing on the same pad must not double-trigger it");
assert.match(play,/z\.padEntryByPlayer\[id\]=current/,"leaving and entering a new pad must update the edge latch");
assert.match(play,/if\(current<0\)return false;return activateMemoryTile\(p,current\)/,"a fresh numbered-pad entry must activate the pad");
assert.match(play,/if\(z\.phase==="input"\)\{for\(const player of roomPlayers\)memoryPadEntry\(player,z\)\}/,"frame update must provide a fallback pad-entry owner so later pads cannot be missed");
assert.match(play,/for\(const player of roomPlayers\)\{const occupied=\(z\.tiles\|\|\[\]\)\.find\(t=>t\.x===player\.x&&t\.y===player\.y\).*z\.padEntryByPlayer\[id\]=occupied\?Number\(occupied\.index\):-1\}/,"players already standing on numbered pads when replay ends must be latched without counting as fresh entries");
assert.match(play,/else\{host\.revision\+\+;\}return true/,"every accepted non-final pad must publish its updated progress through the authoritative local revision");
assert.ok(play.includes("showToast(`MEMORY PAD ${tileIndex+1}`"),"each correct pad must give explicit progress feedback");

assert.match(play,/SYS\.lockRoomDoors\(host,z\.roomId,true\)/,"entering an unsolved memory room must seal its room doors");
assert.ok(play.includes("MEMORY VAULT LOCKDOWN"),"lockdown must be explained to the player");
assert.match(play,/Complete the full \$\{z\.sequence\.length\}-pad memory sequence to reopen every exit/,"the lock condition must state the actual five- or seven-pad target");
assert.match(play,/z\.hardMode\?"SEVEN-PAD MEMORY VAULT":"MEMORY PAD SEQUENCE"/,"the Floor 12 hard vault must announce itself as the seven-pad variant");
assert.match(play,/Teleport is suppressed in this room/,"memory-vault lockdown feedback must explicitly explain that Teleport is disabled");

assert.match(play,/SYS\.lockRoomDoors\(host,z\.roomId,false\)/,"solving the sequence must release the room doors");
assert.match(play,/beginDoorOpening\(d,900\)/,"released memory-room doors must visibly reopen");
assert.ok(play.includes("Correct sequence. The chamber doors reopen"),"solve feedback must confirm escape is restored");

assert.match(render,/MEMORY VAULT LOCKED — \$\{mem\.inputIndex\|\|0\}\/\$\{mem\.sequence\?\.length\|\|5\}/,"room overlay must show live progress against the active five- or seven-pad sequence");
assert.match(render,/mem\.lockdownActive\?P\.red:P\.cyan/,"locked room status must be visually distinct");
assert.match(render,/function memoryPuzzleOverviewTarget\(mem,p,v\)/,"large Memory Vaults must own a camera visibility policy");
assert.match(render,/screenY>=marginY&&screenY<=v\.h-marginY/,"Memory Vault overview must verify that the player remains inside the visible safe frame");
assert.match(render,/return visible\?\{\.\.\.overview,followPlayer:false\}:\{x:p\.rx,y:p\.ry,followPlayer:true\}/,"camera must refocus on the player when they walk beyond the puzzle overview frame");
assert.match(render,/if\(mem&&!mem\.solved&&roomId===mem\.roomId\)\{const target=memoryPuzzleOverviewTarget/,"the live memory-room camera must use the player-aware target");

console.log("Dungeon R74 memory-pad reliability and chamber-lockdown contract passed.");
