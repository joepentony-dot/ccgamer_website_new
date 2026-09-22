import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=(rel)=>fs.readFileSync(path.join(root,rel),"utf8");

const collectible=read("js/v10-4-collectible-effects.js");
const play=read("js/game-play.js");
const render=read("js/game-render.js");
const index=read("index.html");
const loaderCss=read("css/v10-36-special-ui.css");

assert.match(collectible,/S\.sfx\("alert"\);showToast\("HORROR GAME DISTURBED THE ARCHIVE"/,"Archive Wraith spawn uses its own alert cue rather than the Death Stalker sting");
assert.doesNotMatch(collectible,/createOscillator\(\)/,"collectible horror ambience must not allocate an independent oscillator stream");
assert.doesNotMatch(collectible,/new \(window\.AudioContext\|\|window\.webkitAudioContext\)/,"collectible horror effect must not own a second AudioContext");
assert.match(collectible,/\},250\);/,"collectible-effect maintenance is bounded to a low-frequency cadence");
assert.match(collectible,/ccg:collectible-effect/,"Archive Wraith horror state remains observable for bug reports");

assert.match(play,/onConsole=activator\?localPlayers\(\)\.find/,"Memory Console occupancy is checked from the simulation update");
assert.match(play,/occupant!==String\(z\.consoleOccupant\|\|""\)/,"Memory Console replay is edge-triggered rather than restarted every frame");
assert.match(play,/startMemoryPuzzle\(onConsole\)/,"stepping onto the Memory Console reliably starts/replays the sequence");

assert.match(render,/targetX=\(minX\+maxX\)\/2;targetY=\(minY\+maxY\)\/2/,"camera centres the unresolved memory puzzle footprint");
assert.match(render,/viewportWidth=Number\(window\.innerWidth\|\|0\)/,"mobile zoom is based on the browser viewport rather than the sidebar-reduced canvas width");
assert.match(render,/memoryRoomVisible=W\.roomAt\(world,focus\.x,focus\.y\)===mem\.roomId/,"all Memory Pads remain readable while the player is in the puzzle room");

assert.match(index,/c64-dungeon-carnage-home-v2\.webp/,"release loader uses the new Dungeon Carnage WEBP");
assert.match(loaderCss,/\.ccg-release-loading-art\{/,"release loader has bounded artwork styling");

console.log("V10.42 R50 combined blocker contract passed.");
