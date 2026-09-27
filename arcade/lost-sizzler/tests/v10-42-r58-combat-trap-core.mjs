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
const r54=fs.readFileSync(new URL("js/v10-41-r54-playtest-regressions.js",root),"utf8");
const r60Owners=fs.readFileSync(new URL("js/v10-41-r60-horde-owner-composition.js",root),"utf8");
const gamePlay=fs.readFileSync(new URL("js/game-play.js",root),"utf8");

assert.match(bootstrap,/v10-42-r58-combat-trap-core\.js/,"ordered bootstrap must load the authoritative FIRE/trap core");
assert.ok(bootstrap.indexOf("v10-42-r58-combat-trap-core.js")<bootstrap.indexOf("v10-42-bug-reporter.js"),"core must own gameplay before observation-only reporting loads");

assert.match(core,/window\.firePlayer=firePlayerFresh;window\.triggerTrap=triggerTrapFresh;window\.queueAttack=queueAttackFresh/,"new core must directly own FIRE, trap and attack-buffer entry points");
assert.match(core,/document\.addEventListener\("keydown",onAttackKeyDown,true\)/,"R58 must own Space\/Numpad0 in capture phase before legacy bubbling recovery listeners");
assert.match(core,/event\.stopImmediatePropagation\(\)[\s\S]*attackKeysDown\.add\(event\.code\)[\s\S]*syncHeldAttackInput\(\)[\s\S]*if\(fresh\)attackNow\(event\.code\)/,"authoritative keydown must both own the fresh shot and maintain canonical held-fire state");
assert.match(core,/document\.addEventListener\("keyup",onAttackKeyUp,true\)/,"R58 must own attack-key release and clear held-fire state itself");
assert.match(core,/attackKeysDown\.clear\(\)[\s\S]*input\?\.delete\?\.\("Space"\)/,"pause\/inventory\/blur attack reset must clear the R58 physical-key ledger and canonical hold");
assert.match(gamePlay,/CCGLostSizzlerV142R58CombatTrapCore\?\.updateTrapContacts\?\.\("simulation"\)/,"canonical simulation must call only the rewritten R58 trap engine");
assert.doesNotMatch(gamePlay,/CCGLostSizzlerV142R19MobileTrapLayoutStability\?\.updateTrapContacts\?\.\("simulation"\)/,"canonical simulation must not continue the old R19 trap engine after the rewrite");
assert.match(r19,/function tick\(\)[\s\S]*const core=window\.CCGLostSizzlerV142R58CombatTrapCore;[\s\S]*if\(core\)\{syncPortraitCanvasAspect\(\);return\}/,"R19 monitor must become layout-only once R58 is installed");

assert.match(core,/function trapDamageFirewall\(player,amount,friendly=false,source="enemy"\)[\s\S]*if\(\/\\btrap\\b\/i\.test\(String\(source\|\|""\)\)\)[\s\S]*return false;[\s\S]*inheritedHurtPlayer\.apply\(this,arguments\)/,"new trap core must firewall legacy trap-labelled damage while preserving non-trap damage");
assert.match(core,/canonicalHurtPlayer\.call\(window,p,1,false,/,"ordinary traps must use the canonical damage/death primitive exactly once");
assert.match(core,/window\.hurtPlayer=trapDamageFirewall/,"trap-source firewall must be the final runtime hurtPlayer boundary after the rewrite loads");
assert.match(core,/const healthLost=Number\(p\.health\|\|0\)<beforeHealth,deathRecorded=Number\(run\?\.stats\?\.deaths\|\|0\)>beforeDeaths;[\s\S]*if\(!healthLost&&!deathRecorded\).*return false/s,"failed trap damage must remain unconsumed/retryable while lethal trap deaths count as successful damage");
assert.match(core,/trapContacts\.set\(key,\{cycle,at:now\}\)/,"trap contact may be consumed only after verified HEALTH loss");
assert.match(core,/if\(record\?\.cycle===cycle\)return true/,"same physical active-cycle contact must not double-hit");
assert.match(core,/if\(!live\.has\(key\)\)\{trapContacts\.delete\(key\);state\.trapRearms\+\+\}/,"leaving/inactive contacts must rearm without legacy latches");
assert.match(core,/trapHitsByKind:\{fire:0,spike:0,shock:0,other:0\}/,"core diagnostics must retain FIRE/SPIKE/SHOCK coverage");
assert.match(core,/function normaliseAttackBoundary\(p\)[\s\S]*document\.body\.dataset\.runActive="true"[\s\S]*p\.controlLocked=false[\s\S]*p\.controlsLocked=false[\s\S]*p\.hitStunMs=0[\s\S]*fire1=0[\s\S]*projectileCD=0/s,"r58 must own stale combat-boundary recovery without a historical FIRE owner chain");
assert.match(core,/function contextualMelee\(p,direction\)[\s\S]*CCGLostSizzlerMeleeAmmoV125[\s\S]*melee\.meleeAttack\(p,dir\)/s,"r58 must preserve contextual sword/melee combat through the established melee API");
assert.match(core,/state\.meleeAttacks\+\+/,"r58 must expose successful melee ownership for behavioural qualification");
assert.match(r20,/CCGLostSizzlerV142R58CombatTrapCore[\s\S]*currentMode\(\)==="playing"[\s\S]*core\.attackNow\(event\.code\)/s,"R20 keyboard bridge must route playing-state attack presses to r58 before the old runActive gate");
assert.match(core,/active>=max/,"FIRE must keep the projectile-cap guard");
assert.match(core,/Number\(p\.mana\|\|0\)<1/,"FIRE must keep the ammunition guard");
assert.match(core,/fireBuffer1=Math\.max\(Number\(fireBuffer1\|\|0\),ATTACK_BUFFER_MS\)/,"finite cooldown attack intents must use one bounded buffer");
assert.doesNotMatch(core,/recoverThroughDeepFireOwner|recoverThroughCapturedR1FireOwner|deepestFireOwner/,"new FIRE core must not traverse legacy FIRE owner chains");

assert.match(rareBalance,/CCGLostSizzlerV142R58CombatTrapCore;if\(core\).*core\.updateTrapContacts\("v115"\)/s,"legacy rare-event trap runtime must delegate to the new core instead of applying direct trap damage");
assert.match(r54,/CCGLostSizzlerV142R58CombatTrapCore;if\(core\)\{core\.updateTrapContacts\("r54"\);return\}/,"R54 must not force trap damage outside the rewritten core");
assert.match(r60Owners,/__ccgV142R58TrapFirewall===true[\s\S]*return gatedHurt/,"R60 solo damage gate must return the r58 trap firewall when installed");
assert.match(r60Owners,/value\.__ccgV142R58TrapFirewall===true[\s\S]*gatedHurt=value/,"R60 solo damage gate must accept the r58 trap firewall instead of blocking it");
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
