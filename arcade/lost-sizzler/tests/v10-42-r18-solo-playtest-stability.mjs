import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const bootstrap=read("js/v10-42-bootstrap.js");
const fix=read("js/v10-42-r18-solo-playtest-stability.js");

assert.match(bootstrap,/v10-42-r1-stability\.js[\s\S]*v10-42-r18-solo-playtest-stability\.js/,"r18 must load after the established V10.42 stability layer");
assert.match(fix,/installInteractionXPSourceContract/,"r18 composition must install the frozen door and switch XP-source guard");
assert.match(fix,/Hidden wall opened[\s\S]*Bronze door unlocked[\s\S]*Hidden wall switch[\s\S]*Gate switch opened/,"r18 composition must preserve all four blocked interaction XP reasons");
assert.match(fix,/CCGLostSizzlerXPSourceContract/,"r18 composition must expose the interaction XP-source contract for browser verification");
assert.match(fix,/hurtPlayer=function\(player,\.\.\.args\)\{repairPlayer\(player\)/,"player damage must repair stale invulnerability at the damage boundary");
assert.match(fix,/queueAttack=function\(player,\.\.\.args\)/,"gun and melee attacks must pass through the combat repair boundary");
assert.match(fix,/repairAttackLiveness/,"pause/resume recovery must own an explicit attack-liveness repair boundary");
assert.match(fix,/fire1!==0[\s\S]*projectileCD!==0[\s\S]*fireBuffer1!==0/,"resume repair must clear finite stuck P1 cadence, projectile and buffer timers");
assert.match(fix,/event\.code!=="KeyP"[\s\S]*schedulePauseResumeRepair/,"keyboard pause/resume must schedule attack-liveness repair on resume");
assert.match(fix,/#resume-btn[\s\S]*schedulePauseResumeRepair/,"pause overlay Continue must schedule the same attack-liveness repair");
assert.match(fix,/ai\.stepEnemy=wrapped/,"enemy attack stepping must repair stale attack cooldowns");
assert.match(fix,/quick-warden-status/,"Warden state must own a dedicated HUD node");
assert.match(fix,/stripWardenFromEffects/,"transient effects text must no longer share Warden ownership");
assert.match(fix,/suppressedSfxRetriggers/,"repeat environmental SFX must be guarded against frame-level retrigger loops");
assert.match(fix,/wall:180[\s\S]*fireplace:650[\s\S]*lowhealth:900/,"high-risk repeating ambience and collision sounds must have explicit cooldowns");
console.log("V10.42 r18 solo playtest, pause attack-liveness and interaction XP composition contract passed");
