import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const index=read("index.html");
const horde=read("js/v10-41-horde-leaderboard-polish.js");
const friendly=read("js/v10-41-split-friendly-fire.js");
const play=read("js/game-play.js");

assert.match(index,/v10-41-horde-leaderboard-polish\.js\?v=/,"the polished Horde leaderboard must load from the game page");
assert.match(index,/v10-41-split-friendly-fire\.js\?v=/,"split-screen friendly-fire follow-up must load from the game page");

assert.match(horde,/\.horde-empty\{display:flex!important/,"the empty Horde leaderboard must use a full-width empty-state layout instead of the narrow rank column");
assert.match(horde,/horde-board-columns/,"the Horde leaderboard must provide structured column headings for saved results");
assert.match(horde,/horde-tab-count/,"Horde category tabs must show how many saved runs each category contains");
assert.match(horde,/NO \$\{category\} RECORDS YET/,"empty Horde categories must use a deliberate empty-state message");
assert.match(horde,/data-rank/,"saved Horde rows must receive ranking presentation hooks");

assert.match(play,/lp\.id!==b\.owner[\s\S]*?hurtPlayer\(lp,1,true/,"split-screen projectile friendly fire must remain active");
assert.match(friendly,/String\(playMode\)!=="split"/,"melee player targeting must be restricted to local split-screen mode");
assert.match(friendly,/adjacentOpponent\(player,dir\)/,"split-screen melee must look for the other player in the faced adjacent tile");
assert.match(friendly,/hurtPlayer\(target,damage,true/,"an adjacent player hit must use the normal friendly-fire damage/death path");
assert.match(friendly,/if\(player===p2\)fire2=swingCooldown;else fire1=swingCooldown/,"friendly melee must respect each player's independent attack cooldown");
assert.doesNotMatch(friendly,/mana\s*[-+]=/,"friendly melee must not consume firearm ammunition");

console.log("Lost Sizzler Horde leaderboard polish and split-screen friendly-fire checks passed.");
