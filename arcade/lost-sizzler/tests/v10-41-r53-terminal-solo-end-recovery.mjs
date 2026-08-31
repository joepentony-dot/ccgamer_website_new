import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameRoot=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(gameRoot,relative),"utf8");

const r53=read("js/v10-41-r53-terminal-solo-end-recovery.js");
const loader=read("js/v10-41-lake-item-safety.js");
const core=read("js/game-core.js");
const play=read("js/game-play.js");

assert.match(play,/run\.xpGameOver=true[\s\S]{0,400}endRun\("Game over: XP reached zero for the second time after the final warning"\)/,"canonical death handling must set the terminal XP flag before ending the run");
assert.match(core,/run\.xpGameOver\?"GAME OVER — XP DEPLETED"/,"canonical endRun remains the owner of the normal GAME OVER title");

assert.match(r53,/run\?\.xpGameOver===true/,"R53 must be gated by the canonical terminal XP flag");
assert.match(r53,/!run\?\.daily&&playMode==="solo"&&!p2&&!special/,"R53 must remain isolated to ordinary Solo Dungeon");
assert.match(r53,/if\(!terminal\)return current\.apply/,"non-terminal and non-Solo endings must preserve canonical error behaviour");
assert.match(r53,/if\(!presentFallback\(reason,error\)\)throw error/,"R53 may swallow an error only when terminal Solo presentation recovery succeeds");
assert.match(r53,/queueMicrotask\(\(\)=>ensureTerminalVisible\(reason\)\)/,"R53 must also recover a terminal end chain that silently leaves the overlay hidden");
assert.match(r53,/node\.addEventListener\?\.\("load",\(\)=>queueMicrotask\(install\)/,"R53 must reclaim only the endRun presentation boundary after later scripts load");
assert.match(r53,/[">"]:"&gt;"/,"fallback HTML escaping must encode greater-than characters");
assert.doesNotMatch(r53,/applyDeathPenalty|bankedXP\s*=|score\s*=|PGR\.clearCheckpoint|saveFloorCheckpoint|broadcastWorld|sendIntent|net\./,"R53 must not take XP, scoring, save or multiplayer authority");

assert.match(loader,/v10-41-r53-terminal-solo-end-recovery\.js/,"canonical late loader must install R53");
assert.ok(loader.indexOf("v10-41-r52-audio-accessibility.js")<loader.indexOf("v10-41-r53-terminal-solo-end-recovery.js"),"R53 must load after the R52 accessibility layer");

console.log("Lost Sizzler V10.41 r53 terminal Solo end-screen recovery contract passed.");
