import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameRoot=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(gameRoot,relative),"utf8");

const r54=read("js/v10-41-r54-playtest-regressions.js");
const r53=read("js/v10-41-r53-terminal-solo-end-recovery.js");
const horde=read("js/horde-survivor.js");
const game=read("js/game-play.js");

assert.match(r53,/v10-41-r54-playtest-regressions\.js/,"R53 final edge must load R54 after the established late stack");
assert.match(r54,/H\.tick\(a\.state,now\)/,"browser Horde fallback must advance the Horde rules state");
assert.match(r54,/H\.spawnNext\(a\.state,now\)/,"browser Horde fallback must spawn base-wave models");
assert.match(r54,/hordeLive\(\)\)return/,"browser fallback must stand down when dedicated authority is live");
assert.match(horde,/state\s*:\s*"briefing"/,"Horde starts in briefing and therefore requires its rules tick to progress");

assert.match(r54,/const a=window\.CCGLostSizzlerV141R43SoloSave;if\(typeof a\?\.resumeSolo!=="function"\)return false;st\.continues\+\+;const ok=await a\.resumeSolo\(\);if\(ok\)rearmSoon\(\);return ok/,"R54 compatibility resume must delegate to R43 instead of reconstructing Solo state");
assert.doesNotMatch(r54,/net\.leave\(\)/,"R54 must never wait for transport leave during Solo Continue");
assert.doesNotMatch(r54,/b\.id==="continue-save-btn"/,"R54 must not own the Continue button when R43 is authoritative");
assert.match(r54,/window\.addEventListener\("click",clicks,true\)/,"R54 may retain capture only for non-Continue playtest rearm handling");

assert.match(game,/triggerTrap\(p\)/,"canonical dungeon movement still owns normal trap triggering");
assert.match(r54,/forceDamage\(p,"dungeon trap"\)/,"R54 must enforce trap damage when the canonical path is blocked by stale invulnerability");
assert.match(r54,/anti-loitering blast/,"R54 must enforce direct idle-bomb damage");
assert.match(r54,/SUPABASE FALLBACK\|SAFE FALLBACK TRANSPORT/,"transport fallback diagnostics must be filtered from player toasts");

assert.match(r54,/spy-r45-trap-fx\[data-phase="placed"\]/,"Spy placement visuals must be hidden");
assert.match(r54,/showToast\("TRAP SET","Trap set\."/,"the trap owner gets only a generic local confirmation");
assert.match(r54,/CCG_CONFIG\?\.c64Loot/,"collectibles must use the games.json-backed catalogue pool");
assert.match(r54,/shuffle\(pool,/,"collectible titles must be shuffled instead of assigned alphabetically");
assert.match(r54,/function doors\(\)/,"R54 must validate and open blocked ordinary door approaches");
assert.match(r54,/playMode==="split"/,"split-screen pacing correction must remain isolated to local two-player mode");
assert.match(r54,/move1<min.*move1=min/,"player-one split movement must receive a minimum movement cooldown");
assert.match(r54,/move2<min.*move2=min/,"player-two split movement must receive a minimum movement cooldown");
assert.match(r54,/fire1=0;fire2=0;fireBuffer1=0;fireBuffer2=0/,"resume must rearm both attack inputs after repeated pauses");

console.log("Lost Sizzler V10.41 r54 playtest regression contract passed.");
