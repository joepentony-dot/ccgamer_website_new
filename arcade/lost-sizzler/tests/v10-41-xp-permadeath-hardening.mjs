import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {fileURLToPath} from "node:url";
import path from "node:path";

const here=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.resolve(here,"../js/v10-41-xp-permadeath-hardening.js"),"utf8");

const context={
  console,
  setInterval(fn){context._timer=fn;return 1},
  clearInterval(){},
  addEventListener(){},
  document:{body:{dataset:{}}},
  playMode:"solo",
  window:{addEventListener(){}}
};
context.window.window=context.window;
context.window.CCGProgression={
  applyDeathPenalty(player,score,run){
    const before=Math.max(0,Number(player.totalXp||0));
    player.totalXp=0;
    return{score:Math.floor(Number(score||0)/2),xpBefore:before,xpAfter:0,xpZeroDeaths:0,zeroWarning:false,gameOver:false};
  }
};
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-41-xp-permadeath-hardening.js"});
context._timer?.();

const PGR=context.window.CCGProgression;
const run={xpZeroDeaths:0,xpZeroDeathsByPlayer:{},everEarnedXp:true};
const player={id:"p1",totalXp:20};
const first=PGR.applyDeathPenalty(player,1000,run);
assert.equal(first.zeroWarning,true,"first zero-XP death must produce the final warning");
assert.equal(first.gameOver,false,"first zero-XP death must still allow recovery");
assert.equal(run.xpZeroDeathsByPlayer.p1,1,"first zero-XP strike is persisted for the player");

player.totalXp=25;
const second=PGR.applyDeathPenalty(player,500,run);
assert.equal(second.zeroWarning,false,"second strike is no longer a warning");
assert.equal(second.gameOver,true,"second death that leaves XP at zero must be permanent game over");
assert.equal(run.xpZeroDeathsByPlayer.p1,2,"second zero-XP strike is persisted");

const recoveredSave={xpZeroDeaths:1,xpZeroDeathsByPlayer:{},everEarnedXp:true};
const resumed={id:"different-solo-runtime-id",totalXp:10};
const resumedDeath=PGR.applyDeathPenalty(resumed,300,recoveredSave);
assert.equal(resumedDeath.gameOver,true,"an older solo save's aggregate final-warning strike must survive runtime/player-id changes");

context.playMode="online";
const onlineRun={xpZeroDeaths:1,xpZeroDeathsByPlayer:{host:1},everEarnedXp:true};
const guest={id:"guest",totalXp:10};
const guestFirst=PGR.applyDeathPenalty(guest,300,onlineRun);
assert.equal(guestFirst.zeroWarning,true,"another online player's strike must not count against this player");
assert.equal(guestFirst.gameOver,false,"online zero-XP strikes remain per-player");

console.log("V10.41 zero-XP permadeath hardening checks passed.");
