import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const play=read("arcade/lost-sizzler/js/game-play.js");
const r20=read("arcade/lost-sizzler/js/v10-42-r20-live-regression-stability.js");
const reporter=read("arcade/lost-sizzler/js/v10-42-bug-reporter.js");
const bootstrap=read("arcade/lost-sizzler/js/v10-42-bootstrap.js");
const canonical=read("arcade/lost-sizzler/index.html");
const alias=read("arcade/c64-dungeon-carnage/index.html");
const version=JSON.parse(read("arcade/lost-sizzler/version.json"));
const cache="20260928r65";

assert.match(play,/authoritativeDamagePlayer\(p,1,false,`\$\{hazard\.title\|\|"hazard chamber"\} trap`\)/,"dedicated hazard rooms must continue identifying damage as trap-attributed damage through the guarded R58 boundary");
assert.match(play,/window\.CCGLostSizzlerV142R58AuthoritativeFireCore=authoritativeFireApi/,"r58 core must be the supported FIRE authority");
const queueBlock=play.match(/function queueAttack\(p,requestedDirection=null\)\{[\s\S]*?\n\}/)?.[0]||"";
assert.match(queueBlock,/fireBuffer2=ATTACK_BUFFER_MS;else fireBuffer1=ATTACK_BUFFER_MS/,"attack intent must enter the authoritative buffer");
assert.doesNotMatch(queueBlock,/firePlayer\(/,"input queue must not create projectiles directly");
assert.match(play,/const p1HeldAttack=isAttackHeldInput\(p1\)&&\(input\.has\("Space"\)\|\|input\.has\("Numpad0"\)\)[\s\S]*if\(\(p1HeldAttack\|\|fireBuffer1>0\)&&fire1<=0\)\{const fired=executeAuthoritativeFire\(p1,d1\(\),"buffered"\)/,"the simulation loop must execute one fresh P1 FIRE intent through the captured authoritative owner and repeat only explicitly qualified held FIRE");
assert.doesNotMatch(bootstrap,/v10-42-attack-hold-liveness\.js|v10-42-r47-inventory-fire-recovery\.js/,"historical FIRE recovery modules must not load");
assert.match(r20,/fireOwnership:false/,"retained R20 live safeguards must explicitly disclaim FIRE ownership");
assert.doesNotMatch(r20,/function attackNow\(|recoverThroughDeepFireOwner|recoverThroughCapturedR1FireOwner/,"retained R20 must not provide fallback shot ownership");

assert.match(play,/const trapCycleHits=new Map\(\)/,"ordinary trap ownership must be one player/trap/cycle ledger");
assert.match(play,/function applyActiveTrapContact\(p,t,now=performance\.now\(\)\)/);
assert.match(play,/authoritativeDamagePlayer\(p,1,false,`\$\{String\(t\.kind\|\|"floor"\)\} trap`\)/,"ordinary active trap contact must apply exactly one canonical damage unit through the guarded R58 boundary");
assert.match(play,/const healthLost=afterHealth<beforeHealth,deathRecorded=afterDeaths>beforeDeaths,verified=\(healthLost\|\|deathRecorded\)&&\/trap\/i\.test\(damageSource\)/,"a trap cycle must require real HEALTH loss or a canonical death transition plus trap attribution");
assert.match(play,/if\(!verified\)\{p\.invuln=beforeInvuln;authoritativeTrapState\.damageRetries\+\+;return false\}[\s\S]*trapCycleHits\.set\(key,cycle\)/,"failed trap contacts must restore prior invulnerability, remain retryable and must not consume the cycle");
assert.match(play,/const damageSource=String\(source\|\|"enemy"\),trapDamage=\/trap\/i\.test\(damageSource\),environmentDamage=[\s\S]*\(!environmentDamage&&p\.invuln>0\)[\s\S]*if\(!trapDamage&&p\.armor>0\)/,"trap-attributed damage must bypass stale invulnerability and armour without changing other damage semantics");

assert.match(reporter,/dedicatedHazardUnderPlayer:dedicatedHazardSnapshot\(player\)/,"bug reporter must retain dedicated hazard state under the player");
assert.match(reporter,/meleeSwingAt:Number\(player\._meleeSwingAt\|\|0\)/,"bug reporter must observe melee as valid attack work");
assert.match(reporter,/ANOMALY_POSSIBLE_ATTACK_FAILURE/,"bug reporter must still flag complete attack failures");

assert.ok(canonical.includes(`ccg-lost-sizzler-cache" content="${cache}`),"canonical runtime must publish the r65 cache token");
assert.ok(alias.includes(`ccg-lost-sizzler-cache" content="${cache}`),"raw-main public-route alias must publish the same r64 cache token");
assert.ok(canonical.includes(`game-play.js?v=${cache}`),"canonical game-play script must use r64 cache identity");
assert.ok(alias.includes(`game-play.js?v=${cache}`),"route alias game-play script must use r64 cache identity");
assert.equal(version.cacheToken,cache,"version metadata must publish the r65 cache token");
console.log("PASS authoritative combat/trap and r65 public cache contract");
