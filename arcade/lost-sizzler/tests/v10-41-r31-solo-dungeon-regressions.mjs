import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const source=read("js/v10-41-r31-solo-dungeon-regressions.js");
const loader=read("js/v10-41-r30-buglog.js");

assert.match(loader,/v10-41-r31-solo-dungeon-regressions\.js/,"r30 tail must load the r31 Solo Dungeon regression layer");
assert.match(loader,/data-ccg-r31-solo-dungeon/,"r31 Solo Dungeon loader must be deduplicated");
assert.match(source,/dungeon-solo/,"r31 fixes must remain scoped to the Solo Dungeon controller");
assert.match(source,/new Set\(\["horde-survivor","sizzler-saboteurs"\]\)/,"Solo isolation must reject only the two authoritative special-mode controller IDs");
assert.match(source,/\["dungeon-online","horde-solo","horde-online","spy-online","split-screen"\]\.includes\(detected\)/,"Solo fallback detection must explicitly reject every non-Solo controller");

for(const id of ["shop-score","shop-artefacts","shop-next-price","hud-score"])assert.match(source,new RegExp(id),`shop/HUD refresh must own ${id}`);
assert.match(source,/addEventListener\("click",onShopClick,true\)/,"shop refresh must observe purchase clicks before the core handler replaces the button DOM");
assert.match(source,/removeEventListener\("click",onShopClick,true\)/,"shop capture listener cleanup must use the same capture phase");
assert.match(source,/queueMicrotask\(\(\)=>refreshShopWallet\(\)\)/,"shop wallet refresh must commit after the purchase handler finishes");

assert.match(source,/ownedSystemState\?\.\(name\)/,"chest repair must be able to read the source below a mode-owned interaction gate");
assert.match(source,/ownedSource\("openChest"\)/,"chest repair must request the openChest source below the mode-owned gate");
assert.match(source,/ensureOwnedSystemGates\?\.\(\)/,"chest repair must reassert the six-mode interaction gate");
assert.match(source,/Number\(delay\)===500/,"r31 must target the legacy delayed chest delivery narrowly");
assert.match(source,/sourceText\.includes\("floatPickupText"\).*sourceText\.includes\("applyLoot"\)/,"only the known chest loot callback may be accelerated");
assert.match(source,/floatText\(chest\.x,chest\.y,text/,"chest reward feedback must appear at the opened chest");
assert.match(source,/chestImmediateDeliveries/,"immediate chest deliveries must be observable for regression testing");

assert.match(source,/avatarImages\.set\("CPU Cook",avatarImages\.get\("CPU"\)\)/,"CPU Cook must retain the configured CPU portrait");
assert.match(source,/function isCpuCookFollower\(follower\)/,"named CPU recognition must use an explicit identity predicate");
assert.match(source,/name==="CPU"\|\|name==="CPU COOK"\|\|initials==="CPU"\|\|music==="cpu"/,"CPU identity must survive name/presentation changes");
assert.match(source,/name:"CPU Cook",initials:"CPU"/,"the configured CPU follower must be presented as CPU Cook");
assert.match(source,/_v141R31NamedCpuCook=true/,"named CPU Cook normalisation must be explicit and testable");
assert.match(source,/function genericCookDisplayName\(enemy\).*"Kitchen Cook"/s,"ordinary cook enemies must have an identity distinct from CPU Cook");
assert.match(source,/__ccgV141R31CpuCookRenderFix/,"the Solo renderer must install the generic-cook identity correction once");
assert.match(source,/baseLabel\.call\(this,"Kitchen Cook"/,"generic cook labels must no longer impersonate CPU Cook");

assert.match(source,/fire1=0;fireBuffer1=0/,"Solo resume must clear stale attack cooldown and buffer state");
assert.match(source,/p1\.hitStunMs=0/,"Solo resume must clear stale hit-stun");
assert.match(source,/p1\.controlLocked=false/,"Solo resume must clear a stale singular control lock");
assert.match(source,/p1\.controlsLocked=false/,"Solo resume must clear a stale plural control lock");
assert.match(source,/event\.code!=="Space"/,"post-resume attack recovery must be limited to the attack key");
assert.match(source,/addEventListener\("keydown",onPostResumeAttack,true\)/,"post-resume attack recovery must see the key at capture phase");
assert.match(source,/POST_RESUME_ATTACK_GRACE_MS=2600/,"post-resume attack rearm must be a bounded grace period");

assert.match(source,/ccg-v141-r31-solo-dungeon-style/,"Solo score visibility correction must be installed as a late isolated style");
assert.match(source,/body\[data-mode-controller="dungeon-solo"\].*#hud-score/s,"score HUD visibility rules must be scoped to Solo Dungeon");
for(const forbidden of ["window.update=","window.update =","update=function","update = function"]){
  assert.ok(!source.includes(forbidden),`r31 must not acquire shared update ownership: ${forbidden}`);
}

console.log("Lost Sizzler r31 Solo Dungeon shop, chest, CPU Cook, pause-combat and score-HUD contracts passed.");
