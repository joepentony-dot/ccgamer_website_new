import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const play=fs.readFileSync(new URL("js/game-play.js",root),"utf8");
const main=fs.readFileSync(new URL("js/game-main.js",root),"utf8");
const bootstrap=fs.readFileSync(new URL("js/v10-42-bootstrap.js",root),"utf8");
const version=JSON.parse(fs.readFileSync(new URL("version.json",root),"utf8"));

assert.equal(version.build,"V10.42 r58");
assert.equal(version.cacheToken,"20260927r58");
assert.doesNotMatch(bootstrap,/v10-42-r19-mobile-trap-layout-stability\.js/,"retired R19 trap owner must not load");
assert.doesNotMatch(bootstrap,/v10-42-r20-trap-cycle-handoff-stability\.js/,"retired trap handoff wrapper must not load");
assert.doesNotMatch(bootstrap,/v10-42-r20-live-regression-stability\.js/,"retired FIRE recovery owner must not load");
assert.doesNotMatch(bootstrap,/v10-42-attack-hold-liveness\.js/,"retired held-FIRE recovery module must not load");
assert.doesNotMatch(bootstrap,/v10-42-r47-inventory-fire-recovery\.js/,"retired inventory FIRE recovery module must not load");

assert.match(play,/function queueAttack\(p,requestedDirection=null\)[\s\S]*firePlayer\(p,attackDirection\(p,requestedDirection\)\)/,"fresh FIRE intent must use the core fire owner directly");
assert.match(play,/function firePlayer\(p,d\)[\s\S]*return true\n\}/,"core FIRE owner must report a completed shot");
assert.match(play,/window\.CCGLostSizzlerV142R58AuthoritativeFireCore=authoritativeFireApi/);
assert.match(play,/const trapCycleHits=new Map\(\)/,"trap duplicate suppression must be one per-trap/player cycle ledger");
assert.match(play,/function trapCycleId\(t,now=performance\.now\(\)\)/);
assert.match(play,/trapCycleHits\.get\(key\)===cycle/,"one active trap cycle must not double-hit");
assert.match(play,/trapCycleHits\.set\(key,cycle\)/,"a trap cycle must be consumed only on verified damage");
assert.match(play,/const trapDamage=\/trap\/i\.test/,"canonical damage owner must identify trap-attributed damage itself");
assert.match(play,/!trapDamage&&p\.armor>0/,"trap damage must preserve armour while non-trap damage retains armour semantics");
assert.match(play,/updateActiveTrapContacts\(\);/,"the gameplay simulation must own trap contact checks");
assert.match(play,/window\.CCGLostSizzlerV142R58AuthoritativeTrapCore=authoritativeTrapApi/);
assert.doesNotMatch(play,/CCGLostSizzlerV142R19MobileTrapLayoutStability\?\.updateTrapContacts/,"simulation must not depend on retired R19 implementation");

const pauseBlock=main.match(/function clearPauseAttackCadence[\s\S]*?function settlePauseAttackCadence/)?.[0]||"";
assert.doesNotMatch(pauseBlock,/AttackHoldLiveness|repairCombatTimers|rearmCombat|repairAttackLiveness/,"pause/resume must not invoke historical FIRE recovery owners");

console.log("Dungeon r58 authoritative FIRE/trap ownership contract passed.");
