import assert from "node:assert/strict";
import fs from "node:fs";
const root=new URL("../",import.meta.url);
const systems=fs.readFileSync(new URL("js/systems.js",root),"utf8");
const play=fs.readFileSync(new URL("js/game-play.js",root),"utf8");
const render=fs.readFileSync(new URL("js/game-render.js",root),"utf8");

assert.match(systems,/function memoryPadLayout/);
assert.match(systems,/[0,2,4,6,8]/,"five-pad memory layouts must retain safe spacing");
assert.match(systems,/memoryPuzzleHardFloor/,"the later campaign must own a separate hard memory-vault floor");
assert.match(systems,/const memoryPads=floor===C\.dungeon\.memoryPuzzleFloor\?5:floor===C\.dungeon\.memoryPuzzleHardFloor\?7:0/,"memory-vault owner must select five pads early and seven pads later");
assert.match(systems,/Math\.floor\(r\(\)\*total\)/,"memory sequence generation must target the configured five- or seven-pad total");
assert.match(systems,/\[-2,-2\],\[0,-2\],\[2,-2\],\[-2,0\],\[0,0\],\[2,0\],\[0,2\]/,"seven-pad vault must use a spaced late-game grid rather than overlapping pads");
assert.doesNotMatch(systems,/findClearSquare\(world,room,used,3\)/,"legacy 3x3 memory grid must be retired");
assert.match(systems,/activator:\{\.\.\.layout\.activator\}/);
assert.match(systems,/label:String\(i\+1\)/);

assert.match(play,/triggerMemoryPuzzle\(p,deliberate=false\)/);
assert.match(play,/if\(!z\|\|z\.solved\|\|!deliberate\)return/,"forced movement must not count as memory input");
assert.match(play,/spawnPuzzleAmbush\(z\.roomId,p,1,"memory-fail"\)/,"wrong memory input must spawn exactly one enemy");
assert.doesNotMatch(play,/spawnPuzzleAmbush\(z\.roomId,p,3\+Math\.min\(2,z\.failures\),"memory-fail"\)/);
assert.match(play,/z\.phase="idle"/,"wrong input must wait for deliberate replay");
assert.match(play,/z\.consoleOccupant=String\(p\.id\|\|""\)/,"console entry must seal one replay to one occupant");
assert.match(play,/z\.replayToken=\(z\.replayToken\|\|0\)\+1/,"each deliberate console entry must create one replay generation");
assert.match(play,/if\(String\(z\.consoleOccupant\|\|""\)!==String\(p\.id\|\|""\)\)startMemoryPuzzle\(p\)/,"deliberate movement must not double-start the same replay");
assert.match(play,/Math\.max\(0,Number\(dt\|\|0\)\)/,"replay timing must reject invalid negative or non-numeric frame deltas");
assert.match(play,/movementTriggers\(p,true\)/,"player movement must explicitly identify deliberate puzzle input");

assert.match(render,/MEMORY CONSOLE — STEP ON TO REPLAY/);
assert.match(render,/MEMORY PAD/);
assert.match(render,/tile\.label/);

console.log("Dungeon Carnage r47 Memory Pad redesign contract passed.");
