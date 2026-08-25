import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const hordeBoard=read("js/v10-41-horde-leaderboard-polish.js");
const ui=read("js/v10-6-ui-polish.js");
const combat=read("js/v10-41-dungeon-combat-safety.js");

assert.match(hordeBoard,/observer\.disconnect\(\)[\s\S]*decorateTabs\(observedSection\)[\s\S]*decorateList\(observedSection,observedList\)[\s\S]*observe\(observedSection,observedList\)/,"Horde leaderboard observer must disconnect while its own decoration mutates the observed subtree");
assert.match(hordeBoard,/if\(node&&node\.textContent!==String\(value\)\)node\.textContent=String\(value\)/,"Horde leaderboard text writes must be idempotent");
assert.match(hordeBoard,/requestAnimationFrame\(\(\)=>[\s\S]*runObserverDecoration\(\)/,"Horde leaderboard observer work must be coalesced to one animation frame");
assert.doesNotMatch(hordeBoard,/new MutationObserver\(\(\)=>\{decorateTabs\(section\);decorateList\(section,list\)\}\)/,"Horde leaderboard must not directly mutate its observed subtree from the MutationObserver callback");

assert.match(ui,/function stabiliseWeeklyLeaderboard\(\)/,"Weekly leaderboard must have an explicit stability normaliser");
assert.match(ui,/if\(section\.tagName==="DETAILS"\)/,"legacy expandable Weekly leaderboard markup must be converted back to a normal section");
assert.match(ui,/section\.style\.maxHeight="min\(420px,46vh\)"/,"Weekly leaderboard must remain height-bounded inside the title menu");
assert.match(ui,/section\.style\.contain="layout paint"/,"Weekly leaderboard layout changes must be contained from the game shell");

assert.match(combat,/const TIMED_WAVE_SIZE=3/,"timed chambers must cap each active wave at exactly three enemies");
assert.match(combat,/SYS\?\.lockRoomDoors\?\.\(host,t\.roomId,true\)/,"timed chamber must lock its room doors when triggered");
assert.match(combat,/if\(alive\.length>TIMED_WAVE_SIZE\)/,"timed chamber runtime must enforce the three-enemy ceiling");
assert.match(combat,/player\.health=Math\.max\(1,Number\(player\.maxHealth/,"clearing a timed wave must restore participating players to full health");
assert.match(combat,/t\.wave=Math\.max\(1,Number\(t\.wave\|\|1\)\)\+1[\s\S]*spawnTimedWave\(t\)/,"after a cleared wave, another three-enemy wave must spawn while time remains");
assert.match(combat,/enforceOneNamedPerRoom/,"named-enemy room cap must be installed");
assert.match(combat,/if\(!occupied\.has\(Number\(roomId\)\)\)\{occupied\.add\(Number\(roomId\)\);continue\}/,"the first named enemy in a room must be retained and additional named enemies handled as duplicates");
assert.match(combat,/softenDuplicateNamed\(enemy\)/,"a duplicate named enemy must be downgraded if it cannot be safely relocated");
assert.doesNotMatch(combat,/timedHunter=true/,"timed chambers must no longer turn the floor Death Stalker into the timed-room wave");

console.log("Lost Sizzler V10.41 menu crash and dungeon combat safety checks passed.");
