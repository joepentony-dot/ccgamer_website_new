import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const read=relative=>fs.readFileSync(new URL(relative,root),"utf8");

const v104=read("js/v10-4-collectible-effects.js");
const v105=read("js/v10-5-collectible-effects.js");
const play=read("js/game-play.js");
const core=read("js/game-core.js");
const render=read("js/game-render.js");
const reporter=read("js/v10-42-bug-reporter.js");
const index=read("index.html");
const loaderCss=read("css/v10-36-special-ui.css");
const packageScript=fs.readFileSync(new URL("../../../scripts/build-c64-dungeon-carnage-itch-package.mjs",import.meta.url),"utf8");

assert.match(v104,/S\.sfx\("creak"\)/,"Archive Wraith arrival must no longer reuse the Death Stalker sting");
assert.doesNotMatch(v104,/horrorBeatTimer/,"horror collectible audio must not allocate a recurring beat-owner timer");
assert.match(v104,/if\(typeof mode==="undefined"\|\|mode!=="playing"\)\{stopHorrorMusic\(\);return\}/,"horror ambience must stop outside active gameplay");
assert.match(v104,/addEventListener\("pagehide",stopHorrorMusic\)/,"horror ambience must stop when the page is retired");
assert.match(v104,/CustomEvent\("ccg:collectible-effect"/,"legacy themed collectible effects must publish diagnostic composition");
assert.match(v105,/CustomEvent\("ccg:collectible-effect"/,"current themed collectible effects must publish diagnostic composition");
assert.match(reporter,/addEventListener\("ccg:collectible-effect"/,"bug reports must record composed collectible effects");
assert.match(reporter,/horrorAlive:Number\(event\.detail\?\.horrorAlive\|\|0\)/);
assert.match(reporter,/rapidMs:Number\(event\.detail\?\.rapidMs\|\|0\)/);

assert.match(play,/function memoryConsoleContact\(p\)/,"Memory Pad replay console needs a dedicated contact edge");
assert.match(play,/z\.consoleOccupants=Array\.isArray\(z\.consoleOccupants\)/,"Memory Pad console contact must be edge-triggered rather than restarting every frame");
assert.match(play,/for\(const player of localPlayers\(\)\)memoryConsoleContact\(player\)/,"Memory Pad replay must be recovered even if a movement wrapper misses the contact boundary");
assert.match(core,/function memoryPuzzleVisibleTo\(p,x,y\)/,"Memory Pad visibility must have a dedicated room-scoped owner");
assert.match(core,/return W\.roomAt\(world,x,y\)===z\.roomId/,"the complete Memory Pad room must bypass ordinary dungeon darkness while the puzzle is active");
assert.match(core,/memoryPuzzleVisibleTo\(p,x,y\)\|\|permanentLightVisibleTo/);

assert.match(render,/function memoryPuzzleFrame\(p\)/,"Memory Pad room must have a bounded framing target");
assert.match(render,/return Math\.max\(\.65,Math\.min\(1,v\.w\/requiredW,v\.h\/requiredH\)\)/,"Memory Pad camera may zoom out enough to show the complete room");
assert.match(render,/const viewportWidth=Number\(window\.innerWidth\|\|0\)/,"mobile zoom must use the actual viewport rather than the sidebar-narrowed canvas");
assert.doesNotMatch(render,/querySelector\("\.canvas-wrap"\).*<=900/,"desktop camera must not become mobile-zoomed just because the sidebar narrows the canvas");
assert.match(render,/memoryPuzzleFramed:Boolean\(memoryPuzzleFrame\(p\)\)/,"camera diagnostics must expose puzzle framing");

assert.match(index,/class="ccg-release-loading-art" src="\.\.\/\.\.\/resources\/images\/hero\/c64-dungeon-carnage-home-v2\.webp"/,"release loader must use the new Dungeon Carnage WEBP");
assert.match(loaderCss,/\.ccg-release-loading-art\{/,"loader artwork must have a stable first-paint style");
assert.match(packageScript,/c64-dungeon-carnage-home-v2\.webp","assets\/c64-dungeon-carnage-loader\.webp"/,"itch package must carry the same new loader artwork");
assert.match(packageScript,/src="assets\/c64-dungeon-carnage-loader\.webp"/,"itch staging must rewrite the website artwork path to its packaged asset");

console.log("Dungeon Carnage r50 playtest blocker contract passed.");
