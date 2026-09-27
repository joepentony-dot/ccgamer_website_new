import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const play=fs.readFileSync(new URL("js/game-play.js",root),"utf8");
const main=fs.readFileSync(new URL("js/game-main.js",root),"utf8");
const core=fs.readFileSync(new URL("js/game-core.js",root),"utf8");
const r18=fs.readFileSync(new URL("js/v10-42-r18-solo-playtest-stability.js",root),"utf8");
const r20=fs.readFileSync(new URL("js/v10-42-r20-live-regression-stability.js",root),"utf8");
const rare=fs.readFileSync(new URL("js/v10-15-rare-events-balance.js",root),"utf8");
const r54=fs.readFileSync(new URL("js/v10-41-r54-playtest-regressions.js",root),"utf8");
const touch=fs.readFileSync(new URL("js/v10-4-patch.js",root),"utf8");
const bootstrap=fs.readFileSync(new URL("js/v10-42-bootstrap.js",root),"utf8");
const version=JSON.parse(fs.readFileSync(new URL("version.json",root),"utf8"));

assert.equal(version.build,"V10.42 r58");
assert.equal(version.cacheToken,"20260927r58");

assert.doesNotMatch(bootstrap,/v10-42-r19-mobile-trap-layout-stability\.js/,"retired R19 trap owner must not load");
assert.doesNotMatch(bootstrap,/v10-42-r20-trap-cycle-handoff-stability\.js/,"retired trap handoff wrapper must not load");
assert.match(bootstrap,/v10-42-r20-live-regression-stability\.js/,"non-FIRE R20 presentation/stall safeguards must remain loaded");
assert.doesNotMatch(bootstrap,/v10-42-attack-hold-liveness\.js/,"retired held-FIRE recovery module must not load");
assert.doesNotMatch(bootstrap,/v10-42-r47-inventory-fire-recovery\.js/,"retired inventory FIRE recovery module must not load");

assert.match(play,/function queueAttack\(p,requestedDirection=null\)[\s\S]*firePlayer\(p,attackDirection\(p,requestedDirection\)\)/,"fresh FIRE intent must use the core fire owner directly");
assert.match(play,/function firePlayer\(p,d\)[\s\S]*return true\n\}/,"core FIRE owner must report a completed shot");
assert.match(play,/const shotIds=\[\],beforeMana=Number\(p\.mana\|\|0\),beforeCount=[\s\S]*try\{[\s\S]*spawnBullet\(b,false\)[\s\S]*\}catch\(_\)\{[\s\S]*bullets\.splice\(i,1\);[\s\S]*return false/,"projectile creation must fail transactionally and remove any partial volley");
assert.match(play,/if\(afterCount<=beforeCount\)[\s\S]*return false[\s\S]*p\.mana=beforeMana-ammoCost/,"FIRE must not spend ammo until at least one projectile exists");
assert.match(play,/const delay=.*[\s\S]*if\(isP2\)fire2=delay;else fire1=delay/,"FIRE cooldown must be committed only after projectile creation succeeds");
assert.match(play,/window\.CCGLostSizzlerV142R58AuthoritativeFireCore=authoritativeFireApi/);
assert.doesNotMatch(play,/CCGLostSizzlerV142R20LiveRegressionStability=authoritativeFireApi/,"the r58 FIRE core must not occupy the R20 stability namespace");
assert.match(play,/firePressed&&\(!gamepadFireDown\|\|fire1<=0\)\)queueAttack\(p1,attackDirection\(p1,dir\)\)/,"gamepad FIRE must use the same core queue");
assert.match(touch,/if\(typeof queueAttack === "function"\) queueAttack\(p1\)/,"touch FIRE must use the same core queue");
assert.doesNotMatch(touch,/CCGLostSizzlerV142R20LiveRegressionStability\?\.attackNow/,"touch FIRE must not call a historical recovery owner");

assert.match(play,/const trapCycleHits=new Map\(\)/,"trap duplicate suppression must be one per-trap/player cycle ledger");
assert.match(play,/function trapCycleId\(t,now=performance\.now\(\)\)/);
assert.match(play,/trapCycleHits\.get\(key\)===cycle/,"one active trap cycle must not double-hit");
assert.match(play,/trapCycleHits\.set\(key,cycle\)/,"a trap cycle must be consumed only on verified damage");
assert.match(play,/const healthLost=afterHealth<beforeHealth,deathRecorded=afterDeaths>beforeDeaths,verified=\(healthLost\|\|deathRecorded\)&&\/trap\/i\.test\(damageSource\)/,"trap verification must require actual HEALTH loss or a canonical death transition, never timestamp-only evidence");
assert.match(play,/if\(!verified\)\{authoritativeTrapState\.damageRetries\+\+;return false\}[\s\S]*trapCycleHits\.set\(key,cycle\)/,"failed trap contacts must remain retryable and unconsumed");
assert.match(play,/const trapDamage=\/trap\/i\.test/,"canonical damage owner must identify trap-attributed damage itself");
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
assert.match(r18,/function repairAttackLiveness\(\)[\s\S]*return false/,"legacy R18 attack repair must be observation-compatible and non-mutating");
assert.match(r20,/fireOwnership:false/,"R20 must explicitly disclaim FIRE ownership");
assert.doesNotMatch(r20,/function attackNow\(|ATTACK_KEYS|recoverPersistentFireBlock|recoverThroughDeepFireOwner|recoverThroughCapturedR1FireOwner/,"R20 must contain no FIRE recovery implementation");

console.log("Dungeon r58 authoritative FIRE/trap ownership contract passed.");
