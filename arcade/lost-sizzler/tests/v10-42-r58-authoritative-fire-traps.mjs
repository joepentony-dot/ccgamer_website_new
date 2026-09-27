import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const play=fs.readFileSync(new URL("js/game-play.js",root),"utf8");
const main=fs.readFileSync(new URL("js/game-main.js",root),"utf8");
const core=fs.readFileSync(new URL("js/game-core.js",root),"utf8");
const r18=fs.readFileSync(new URL("js/v10-42-r18-solo-playtest-stability.js",root),"utf8");
const r19=fs.readFileSync(new URL("js/v10-42-r19-mobile-trap-layout-stability.js",root),"utf8");
const r20=fs.readFileSync(new URL("js/v10-42-r20-live-regression-stability.js",root),"utf8");
const rare=fs.readFileSync(new URL("js/v10-15-rare-events-balance.js",root),"utf8");
const r54=fs.readFileSync(new URL("js/v10-41-r54-playtest-regressions.js",root),"utf8");
const touch=fs.readFileSync(new URL("js/v10-4-patch.js",root),"utf8");
const bootstrap=fs.readFileSync(new URL("js/v10-42-bootstrap.js",root),"utf8");
const version=JSON.parse(fs.readFileSync(new URL("version.json",root),"utf8"));

assert.equal(version.build,"V10.42 r58");
assert.equal(version.cacheToken,"20260927r58");

assert.match(bootstrap,/v10-42-r19-mobile-trap-layout-stability\.js[\s\S]*CCGLostSizzlerV142R19MobileLayoutCompatibility/,"R19 portrait compatibility may load only behind its explicit non-gameplay compatibility marker");
assert.match(r19,/gameplayOwnership:false/,"R19 portrait compatibility must explicitly disclaim gameplay ownership");
assert.doesNotMatch(r19,/window\.hurtPlayer\s*=|window\.triggerTrap\s*=/,"R19 portrait compatibility must not restore player-damage or trap gameplay ownership");
assert.doesNotMatch(bootstrap,/v10-42-r20-trap-cycle-handoff-stability\.js/,"retired trap handoff wrapper must not load");
assert.match(bootstrap,/v10-42-r20-live-regression-stability\.js/,"non-FIRE R20 presentation/stall safeguards must remain loaded");
assert.doesNotMatch(bootstrap,/v10-42-attack-hold-liveness\.js/,"retired held-FIRE recovery module must not load");
assert.doesNotMatch(bootstrap,/v10-42-r47-inventory-fire-recovery\.js/,"retired inventory FIRE recovery module must not load");

const queueBlock=play.match(/function queueAttack\(p,requestedDirection=null\)\{[\s\S]*?\n\}/)?.[0]||"";
assert.match(queueBlock,/fireBuffer2=ATTACK_BUFFER_MS;else fireBuffer1=ATTACK_BUFFER_MS/,"fresh FIRE intent must enter the core buffer");
assert.doesNotMatch(queueBlock,/firePlayer\(/,"the input queue must never create a shot directly");
assert.match(play,/if\(\(input\.has\("Space"\)\|\|input\.has\("Numpad0"\)\|\|fireBuffer1>0\)&&fire1<=0\)\{const fired=firePlayer\(p1,/,"the simulation loop must be the sole P1 FIRE execution owner");
assert.match(play,/function firePlayer\(p,d\)[\s\S]*return true\n\}/,"core FIRE owner must report a completed shot");
assert.match(play,/const shotIds=\[\],beforeMana=Number\(p\.mana\|\|0\),beforeCount=[\s\S]*try\{[\s\S]*spawnBullet\(b,false\)[\s\S]*\}catch\(_\)\{[\s\S]*bullets\.splice\(i,1\);[\s\S]*return false/,"projectile creation must fail transactionally and remove any partial volley");
assert.match(play,/if\(afterCount<=beforeCount\)[\s\S]*return false[\s\S]*p\.mana=beforeMana-ammoCost/,"FIRE must not spend ammo until at least one projectile exists");
assert.match(play,/const delay=.*[\s\S]*if\(isP2\)fire2=delay;else fire1=delay/,"FIRE cooldown must be committed only after projectile creation succeeds");
assert.match(play,/window\.CCGLostSizzlerV142R58AuthoritativeFireCore=authoritativeFireApi/);
assert.doesNotMatch(play,/CCGLostSizzlerV142R20LiveRegressionStability=authoritativeFireApi/,"the r58 FIRE core must not occupy the R20 stability namespace");
assert.match(play,/if\(firePressed\)[\s\S]*if\(!gamepadFireDown\)queueAttack\(p1,attackDirection\(p1,dir\)\)[\s\S]*else if\(fire1<=0\)attackNowUnbuffered\(p1,attackDirection\(p1,dir\)\)/,"gamepad FIRE must queue the initial press and route legal held repeats through the authoritative core");
assert.match(touch,/if\(typeof queueAttack === "function"\) queueAttack\(p1\)/,"touch FIRE must use the same core queue");
assert.doesNotMatch(touch,/CCGLostSizzlerV142R20LiveRegressionStability\?\.attackNow/,"touch FIRE must not call a historical recovery owner");

assert.match(play,/const trapCycleHits=new Map\(\)/,"trap duplicate suppression must be one per-trap/player cycle ledger");
assert.match(play,/if\(trapDamage&&authoritativeTrapDamageDepth===0\)[\s\S]*return applyActiveTrapContact\(p,trap,now\)/,"public trap-labelled damage must re-enter the canonical R58 contact ledger");
assert.match(play,/const canonicalPlayerDamage=hurtPlayer;[\s\S]*function authoritativeDamagePlayer\(p,n,friendly=false,source="enemy"\)[\s\S]*authoritativeTrapDamageDepth\+\+[\s\S]*canonicalPlayerDamage\(p,n,friendly,source\)/,"only the guarded internal R58 boundary may reach the captured raw trap-attributed player-damage primitive");
assert.match(play,/if\(trapCycleHits\.get\(key\)===cycle\)\{authoritativeTrapState\.trapContactBlocks\+\+;return false\}/,"same-cycle trap re-entry must be blocked by the canonical ledger");
assert.match(play,/function trapCycleId\(t,now=performance\.now\(\)\)/);
assert.match(play,/trapCycleHits\.get\(key\)===cycle/,"one active trap cycle must not double-hit");
assert.match(play,/trapCycleHits\.set\(key,cycle\)/,"a trap cycle must be consumed only on verified damage");
assert.match(play,/const healthLost=afterHealth<beforeHealth,deathRecorded=afterDeaths>beforeDeaths,verified=\(healthLost\|\|deathRecorded\)&&\/trap\/i\.test\(damageSource\)/,"trap verification must require actual HEALTH loss or a canonical death transition, never timestamp-only evidence");
assert.match(play,/if\(!verified\)\{p\.invuln=beforeInvuln;authoritativeTrapState\.damageRetries\+\+;return false\}[\s\S]*trapCycleHits\.set\(key,cycle\)/,"failed trap contacts must restore prior invulnerability, remain retryable and unconsumed");
assert.match(play,/beforeInvuln=Math\.max\(0,Number\(p\.invuln\|\|0\)\)[\s\S]*p\.invuln=0;[\s\S]*authoritativeDamagePlayer\(p,1,false,/,"validated active trap contacts must bypass unrelated pre-existing player invulnerability at the canonical owner");
assert.match(play,/p\.invuln=Math\.max\(beforeInvuln,Math\.max\(0,Number\(p\.invuln\|\|0\)\)\)/,"a successful trap hit must preserve the stronger of prior and newly granted post-hit protection");
assert.match(play,/const damageSource=String\(source\|\|"enemy"\),trapDamage=\/trap\/i\.test\(damageSource\)/,"canonical damage owner must derive trap attribution directly from the canonical damage source");
assert.match(play,/!trapDamage&&p\.armor>0/,"trap damage must preserve armour while non-trap damage retains armour semantics");
assert.match(play,/updateActiveTrapContacts\(\);/,"the gameplay simulation must own trap contact checks");
assert.match(play,/window\.CCGLostSizzlerV142R58AuthoritativeTrapCore=authoritativeTrapApi/);
assert.match(play,/function resetAuthoritativeTrapContacts\(\)[\s\S]*trapCycleHits\.clear\(\)/,"authoritative trap ledger must expose an explicit world-transition reset");
assert.match(core,/CCGLostSizzlerV142R58AuthoritativeTrapCore\?\.reset\?\.\(\)/,"every new world/floor must clear old player\/trap cycle ownership before play resumes");
assert.doesNotMatch(play,/CCGLostSizzlerV142R19MobileTrapLayoutStability\?\.updateTrapContacts/,"simulation must not depend on the retired R19 implementation");
assert.match(rare,/function observeTrapContact\(player,now=performance\.now\(\)\)/,"Rare Events may retain passive trap-contact observation for warnings and diagnostics");
assert.doesNotMatch(rare,/triggerTrap=function triggerTrapV115Reliable/,"Rare Events must not replace the canonical R58 triggerTrap owner");
assert.doesNotMatch(rare,/hurtPlayer\(player,1,false,\`\$\{kind\} trap\`\)/,"Rare Events must not apply ordinary floor-trap HEALTH damage");
assert.match(rare,/update=function updateV115TrapPresentation\(dt\)[\s\S]*warnForNearbyTrap\(player\)[\s\S]*observeTrapContact\(player,now\)/,"Rare Events update wrapper must remain presentation and diagnostics only");
assert.match(r54,/function trapTick\(\)\{if\(window\.CCGLostSizzlerV142R58AuthoritativeTrapCore\)return;/,"R54 must immediately yield ordinary trap damage to the canonical R58 owner");

const pauseBlock=main.match(/function clearPauseAttackCadence[\s\S]*?function settlePauseAttackCadence/)?.[0]||"";
assert.doesNotMatch(pauseBlock,/AttackHoldLiveness|repairCombatTimers|rearmCombat|repairAttackLiveness/,"pause/resume must not invoke historical FIRE recovery owners");
assert.doesNotMatch(r18,/queueAttack=function/,"R18 must not wrap the authoritative attack queue");
assert.doesNotMatch(r18,/hurtPlayer=function/,"R18 must not wrap the canonical player-damage owner after the r58 rewrite");
assert.match(play,/function hurtPlayer\(p,n,friendly=false,source="enemy"\)\{[\s\S]*if\(p\)\{const inv=Number\(p\.invuln\);[\s\S]*p\.invuln=0\}/,"stale player invulnerability repair must live inside the canonical damage owner rather than a compatibility wrapper");
assert.match(play,/const canonicalPlayerDamage=hurtPlayer;[\s\S]*function authoritativeDamagePlayer\(p,n,friendly=false,source="enemy"\)[\s\S]*canonicalPlayerDamage\(p,n,friendly,source\)/,"trap damage must use the captured canonical player-damage primitive and bypass later generic wrappers");
assert.match(r18,/function repairAttackLiveness\(\)[\s\S]*return false/,"legacy R18 attack repair must be observation-compatible and non-mutating");
assert.match(r20,/fireOwnership:false/,"R20 must explicitly disclaim FIRE ownership");
assert.doesNotMatch(r20,/function attackNow\(|ATTACK_KEYS|recoverPersistentFireBlock|recoverThroughDeepFireOwner|recoverThroughCapturedR1FireOwner/,"R20 must contain no FIRE recovery implementation");

console.log("Dungeon r58 authoritative FIRE/trap ownership contract passed.");
