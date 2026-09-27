import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const core=fs.readFileSync(new URL("js/v10-42-r58-combat-trap-core.js",root),"utf8");
const bootstrap=fs.readFileSync(new URL("js/v10-42-bootstrap.js",root),"utf8");
const r19=fs.readFileSync(new URL("js/v10-42-r19-mobile-trap-layout-stability.js",root),"utf8");
const r20=fs.readFileSync(new URL("js/v10-42-r20-live-regression-stability.js",root),"utf8");
const r20Trap=fs.readFileSync(new URL("js/v10-42-r20-trap-cycle-handoff-stability.js",root),"utf8");
const r56=fs.readFileSync(new URL("../lost-sizzler/js/v10-41-r56-playtest-completion.js",root),"utf8");
const r57=fs.readFileSync(new URL("../lost-sizzler/js/v10-41-r57-desktop-prep-stability.js",root),"utf8");
const hold=fs.readFileSync(new URL("js/v10-42-attack-hold-liveness.js",root),"utf8");
const inventory=fs.readFileSync(new URL("js/v10-42-r47-inventory-fire-recovery.js",root),"utf8");
const rareBalance=fs.readFileSync(new URL("js/v10-15-rare-events-balance.js",root),"utf8");

assert.match(bootstrap,/v10-42-r58-combat-trap-core\.js/,"ordered bootstrap must load the authoritative FIRE/trap core");
assert.ok(bootstrap.indexOf("v10-42-r58-combat-trap-core.js")<bootstrap.indexOf("v10-42-bug-reporter.js"),"core must own gameplay before observation-only reporting loads");

assert.match(core,/window\.firePlayer=firePlayerFresh;window\.triggerTrap=triggerTrapFresh;window\.queueAttack=queueAttackFresh/,"new core must directly own FIRE, trap and attack-buffer entry points");
assert.match(core,/function trapDamageFirewall\(player,amount,friendly=false,source="enemy"\)[\s\S]*if\(\/\\btrap\\b\/i\.test\(String\(source\|\|""\)\)\)[\s\S]*return false;[\s\S]*inheritedHurtPlayer\.apply\(this,arguments\)/,"new trap core must firewall legacy trap-labelled damage while preserving non-trap damage");
assert.match(core,/canonicalHurtPlayer\.call\(window,p,1,false,/,"ordinary traps must use the canonical damage/death primitive exactly once");
assert.match(core,/window\.hurtPlayer=trapDamageFirewall/,"trap-source firewall must be the final runtime hurtPlayer boundary after the rewrite loads");
assert.match(core,/const healthLost=Number\(p\.health\|\|0\)<beforeHealth,deathRecorded=Number\(run\?\.stats\?\.deaths\|\|0\)>beforeDeaths;[\s\S]*if\(!healthLost&&!deathRecorded\).*return false/s,"failed trap damage must remain unconsumed/retryable while lethal trap deaths count as successful damage");
assert.match(core,/trapContacts\.set\(key,\{cycle,at:now\}\)/,"trap contact may be consumed only after verified HEALTH loss");
assert.match(core,/if\(record\?\.cycle===cycle\)return true/,"same physical active-cycle contact must not double-hit");
assert.match(core,/if\(!live\.has\(key\)\)\{trapContacts\.delete\(key\);state\.trapRearms\+\+\}/,"leaving/inactive contacts must rearm without legacy latches");
assert.match(core,/trapHitsByKind:\{fire:0,spike:0,shock:0,other:0\}/,"core diagnostics must retain FIRE/SPIKE/SHOCK coverage");
assert.match(core,/active>=max/,"FIRE must keep the projectile-cap guard");
assert.match(core,/Number\(p\.mana\|\|0\)<1/,"FIRE must keep the ammunition guard");
assert.match(core,/fireBuffer1=Math\.max\(Number\(fireBuffer1\|\|0\),ATTACK_BUFFER_MS\)/,"finite cooldown attack intents must use one bounded buffer");
assert.doesNotMatch(core,/recoverThroughDeepFireOwner|recoverThroughCapturedR1FireOwner|deepestFireOwner/,"new FIRE core must not traverse legacy FIRE owner chains");

assert.match(rareBalance,/CCGLostSizzlerV142R58CombatTrapCore;if\(core\).*core\.updateTrapContacts\("v115"\)/s,"legacy rare-event trap runtime must delegate to the new core instead of applying direct trap damage");
assert.match(r19,/CCGLostSizzlerV142R58CombatTrapCore;if\(core\)return core\.applyTrapDamage/,"R19 damage compatibility must delegate to the new trap core");
assert.match(r19,/if\(window\.CCGLostSizzlerV142R58CombatTrapCore\)return true;[\s\S]*const current=window\.hurtPlayer/,"R19 must stop installing trap hurtPlayer ownership after the new core exists");
assert.match(r56,/CCGLostSizzlerV142R58CombatTrapCore;if\(core\)return core\.updateTrapContacts\("r56"\)/,"R56 trap cycle must delegate to the new core");
assert.match(r57,/CCGLostSizzlerV142R58CombatTrapCore;if\(core\)return core\.updateTrapContacts\("r57"\)/,"R57 trap contact must delegate to the new core");
assert.match(r20Trap,/CCGLostSizzlerV142R58CombatTrapCore;if\(core\).*core\.rearmTrapContacts/s,"R20 trap handoff must rearm only the new ledger");
assert.match(r20,/const core=window\.CCGLostSizzlerV142R58CombatTrapCore;[\s\S]*core\?\.attackNow/s,"R20 attack intent must delegate to the new FIRE owner before legacy recovery");
assert.match(hold,/if\(window\.CCGLostSizzlerV142R58CombatTrapCore\)return;/,"held-fire compatibility must not start legacy press recovery when the new core exists");
assert.match(inventory,/if\(window\.CCGLostSizzlerV142R58CombatTrapCore\)return;/,"inventory compatibility must not start legacy FIRE fallback when the new core exists");
assert.match(inventory,/core\.resetAttackState\?\.\(\)/,"inventory-close cleanup must reset the new core boundary only");

console.log("Dungeon Carnage rewritten FIRE/trap single-owner contract passed.");
