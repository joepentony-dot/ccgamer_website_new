import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const core=fs.readFileSync(new URL("js/game-core.js",root),"utf8");
const main=fs.readFileSync(new URL("js/game-main.js",root),"utf8");
const play=fs.readFileSync(new URL("js/game-play.js",root),"utf8");
const local=fs.readFileSync(new URL("js/game-local-runtime.js",root),"utf8");
const firearm=fs.readFileSync(new URL("js/v10-42-r47-firearm-evolution.js",root),"utf8");
const warden=fs.readFileSync(new URL("js/v10-42-warden-domain-progression.js",root),"utf8");
const notices=fs.readFileSync(new URL("js/v10-41-landing-notification-polish.js",root),"utf8");
const index=fs.readFileSync(new URL("index.html",root),"utf8");
const railCss=fs.readFileSync(new URL("css/v10-41-r29.css",root),"utf8");
const alias=fs.readFileSync(new URL("../c64-dungeon-carnage/index.html",root),"utf8");
const version=JSON.parse(fs.readFileSync(new URL("version.json",root),"utf8"));

assert.equal(version.build,"V10.42 r72");
assert.equal(version.cacheToken,"20260930r72");

for(const html of [index,alias]){
  assert.match(html,/id="stay-floor-btn">Stay on This Floor</,"floor-clear overlay must expose a stay-on-floor choice");
  assert.match(html,/id="descend-btn"[^>]*>Descend Deeper</,"floor-clear overlay must retain descent");
  assert.match(html,/id="extract-btn">Bank Loot & Exit</,"floor-clear overlay must retain extraction");
}
assert.match(core,/stay:\$\("stay-floor-btn"\)/,"core UI map must own the stay-on-floor control");
assert.match(main,/UI\.descend\?\.addEventListener\("click",\(\)=>descendFloor\(\)\)/,"descent click must resolve the late authoritative Warden wrapper at click time");
assert.match(main,/UI\.stay\?\.addEventListener\("click",stayOnFloor\)/,"stay-on-floor control must be wired");
assert.match(core,/function stayOnFloor\(\)[\s\S]*run\.floorComplete=false;[\s\S]*mode="playing"/,"staying must return the current floor to playable state");
assert.match(core,/function bankClearedFloorProgress\([\s\S]*v142BankedFloor[\s\S]*hasNewProgress[\s\S]*run\.stats\.floors=countedFloors/,"revisiting the cleared exit must bank later pickups without double-counting the floor");
assert.match(core,/dispatchEvent\(new CustomEvent\("ccg:floor-start"/,"every generated floor must publish a window lifecycle reset event");
assert.match(core,/document\.dispatchEvent\(new CustomEvent\("ccg:floor-start"/,"floor lifecycle must also reach document-owned progression listeners");
assert.match(core,/retainedToast=false;UI\.toast\?\.classList\.remove\("show"\)/,"floor generation must clear stale ordinary notification ownership");
assert.match(notices,/function resetForFloor\([\s\S]*removeAttribute\("data-ccg-major-notification"\)/,"major notification owner must clear stale floor state");
assert.match(notices,/addEventListener\("ccg:floor-start",resetForFloor\)/,"notification rail must reset on every floor");

const floorCompleteWrapper=warden.match(/if\(baseFloorComplete\)floorComplete=function\(by\)\{[\s\S]*?return result\};/)?.[0]||"";
assert.doesNotMatch(floorCompleteWrapper,/skipFloor\(/,"opening the floor-clear overlay must not create Warden debt");
assert.match(floorCompleteWrapper,/WARDEN DOMAIN: UNRESOLVED/,"unresolved Warden status must remain actionable while the player can stay");
assert.match(warden,/if\(baseDescendFloor\)descendFloor=function\(\)\{[\s\S]*skipFloor\(\)[\s\S]*baseDescendFloor/,"Warden debt must be committed only by actual descent");

assert.match(firearm,/first\?"WEAPON ACQUIRED":"WEAPON EVOLVED"/,"evolution pickups must use generic progression labels");
assert.match(firearm,/WEAPON CAPPED — AMMO RESTORED/,"capped weapon cache must prefer an ammo reward");
assert.match(firearm,/WEAPON CAPPED — \+10 XP/,"full-ammo capped weapon cache must fall back to a small XP reward");
assert.match(firearm,/WEAPON CAPPED — \+250 SCORE/,"fully capped cache must retain a final non-wasted fallback");
assert.doesNotMatch(firearm,/FIREARM PARTS SALVAGED|FIREARM UPGRADED/,"retired misleading firearm pickup labels must remain absent");
assert.match(local,/if\(i\.kind==="weapon"\)return evolvingWeaponMode\(\)\?"WEAPON CACHE"/,"floating weapon pickup text must not expose random gun names during firearm evolution");
assert.match(local,/i\.loot\?\.kind==="weaponLoot"&&evolvingWeaponMode\(\)\?"WEAPON CACHE"/,"weapon-loot collection labels must remain generic during evolution");
assert.match(play,/evolvingWeapon=loot\.kind==="weaponLoot"[\s\S]*name=evolvingWeapon\?"WEAPON CACHE"/,"weapon chests must not announce a generated gun name before evolution is applied");

assert.match(core,/MAX_GAMEPLAY_PARTICLES=360,MAX_GAMEPLAY_RINGS=72/,"gameplay visuals must have a hard bounded budget");
assert.match(core,/particles\.push=function\(\.\.\.items\)\{return boundedVisualPush\(particles,MAX_GAMEPLAY_PARTICLES,items\)\}/,"all shared particle producers must pass through the hard cap");
assert.match(play,/burst\(h\.x,h\.y,P\.orange,h\.direct\?16:12/,"anti-loitering explosions must use the reduced burst size");
assert.match(play,/particles\.length>MAX_GAMEPLAY_PARTICLES/,"effect cleanup must preserve the same hard particle ceiling");
assert.match(play,/rings\.length>MAX_GAMEPLAY_RINGS/,"effect cleanup must preserve the ring ceiling");

console.log("V10.42 R65 floor/cache/effect safety contract passed");
