import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const bootstrap=read("js/v10-42-bootstrap.js");
const fix=read("js/v10-42-r18-solo-playtest-stability.js");
const main=read("js/game-main.js");
const play=read("js/game-play.js");
const warden=read("js/v10-42-warden-domain-progression.js");
const reporter=read("js/v10-42-bug-reporter.js");

assert.match(bootstrap,/v10-42-r1-stability\.js[\s\S]*v10-42-r18-solo-playtest-stability\.js/,"r18 must remain after the established V10.42 stability layer");
assert.match(fix,/installInteractionXPSourceContract/,"r18 composition must install the frozen door and switch XP-source guard");
assert.match(fix,/function activeRun\(\)[\s\S]*run&&host&&p1[\s\S]*document\.body\.dataset\.runActive="true"/,"late non-FIRE stability must remain attached to a real run even if the presentation flag becomes stale");
assert.match(fix,/Hidden wall opened[\s\S]*Bronze door unlocked[\s\S]*Hidden wall switch[\s\S]*Gate switch opened/,"r18 composition must preserve all four blocked interaction XP reasons");
assert.match(fix,/CCGLostSizzlerXPSourceContract/,"r18 composition must expose the interaction XP-source contract for browser verification");
assert.match(fix,/hurtPlayer=function\(player,\.\.\.args\)\{repairPlayer\(player\)/,"player damage must retain bounded player-state repair at the damage boundary");
assert.match(fix,/function repairCombatState\(includeEnemies=true\)/,"background stability maintenance may still request bounded enemy repair");
assert.doesNotMatch(fix,/queueAttack=function/,"r18 must not wrap the r58 authoritative attack queue");
assert.match(fix,/function repairAttackLiveness\(\)[\s\S]*return false/,"legacy r18 attack-liveness API must remain callable but non-mutating");
assert.doesNotMatch(fix,/repairAttackLiveness\("pause-resume"\)|observeResumeIntent|repairAfterPauseTransition/,"r18 must not mutate FIRE cadence around pause/resume");
assert.doesNotMatch(fix,/!Number\.isFinite\(value\)\|\|value<0\|\|value>MAX_ENEMY_ATTACK_COOLDOWN_MS/,"normal negative AI countdowns must not be rewritten on every stability pass");

assert.match(main,/function clearPauseAttackCadence\(reason="resume"\)[\s\S]*fire1=0;fire2=0;fireBuffer1=0;fireBuffer2=0;projectileCD=0/,"the core input owner must clear finite player attack cadence on resume");
assert.match(main,/clearPauseAttackCadence[\s\S]*input\.delete\("Space"\)[\s\S]*input\.delete\("Enter"\)[\s\S]*input\.delete\("KeyF"\)[\s\S]*input\.delete\("Numpad0"\)/,"pause recovery must clear canonical and aliased held attack keys");
assert.doesNotMatch(main,/CCGLostSizzlerV142AttackHoldLiveness\?\.clearHeld|repairCombatTimers|repairProjectilePool|CCGLostSizzlerV141R56PlaytestCompletion\?\.rearmCombat/,"pause recovery must not delegate FIRE ownership to historical repair layers");
assert.match(main,/function settlePauseAttackCadence\(reason="resume"\)[\s\S]*return clearPauseAttackCadence\(reason\)/,"resume settlement must be one deterministic core reset");
assert.match(main,/function installInventoryAttackResumeBoundary\(\)[\s\S]*returningFromInventory[\s\S]*settlePauseAttackCadence\("inventory-close"\)/,"inventory close must restore the same core cadence boundary");
assert.match(main,/function returnToGameFromPanel\(\)[\s\S]*returningFromInventory[\s\S]*settlePauseAttackCadence\("inventory-close-top"\)/,"the inventory top-close route must restore the same core cadence boundary");
assert.match(play,/function queueAttack\(p,requestedDirection=null\)/,"all post-resume attacks must return to the r58 authoritative queue");

assert.match(fix,/ai\.stepEnemy=wrapped/,"enemy attack stepping must retain stale enemy-cooldown repair");
assert.match(fix,/quick-warden-status/,"Warden state must own a dedicated HUD node");
assert.match(fix,/stripWardenFromEffects/,"transient effects text must no longer share Warden ownership");
assert.doesNotMatch(warden,/if\(UI\?\.quickSpecials\)[\s\S]*WARDEN CORRUPTED/,"Warden domain sync must not re-add Warden copy to the shared effects node after r18 removes it");
assert.match(warden,/dedicated quick-warden-status owner/,"Warden domain progression must defer visible status to the dedicated HUD owner");
assert.match(reporter,/performanceGovernor:[\s\S]*globalPerformance:[\s\S]*enemySimulation:[\s\S]*liveArrays:/,"bug reports must capture frame governor, global frame diagnostics, enemy simulation and live array pressure");
assert.match(fix,/suppressedSfxRetriggers/,"repeat environmental SFX must remain guarded against frame-level retrigger loops");
assert.match(fix,/wall:180[\s\S]*fireplace:650[\s\S]*lowhealth:900/,"high-risk repeating ambience and collision sounds must retain explicit cooldowns");
console.log("V10.42 r58 R18 non-FIRE stability and core resume ownership contract passed");
