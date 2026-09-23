import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const html=read("index.html");
const css=read("css/game.css");
const core=read("js/game-core.js");
const world=read("js/world.js");
const systems=read("js/systems.js");
const play=read("js/game-play.js");
const ai=read("js/ai.js");
const local=read("js/game-local-runtime.js");
const render=read("js/game-render.js");

assert.match(html,/preload" as="image" href="assets\/pixel\/chest-sheet-v10-34\.png\?v=20260824r8"/,"the authored chest sheet must be preloaded");
assert.match(html,/id="hud-bronze">BRONZE 0<\/strong>/,"the critical HUD must name the Bronze Key count explicitly");
assert.match(html,/If a reward chest is already behind a Bronze Key door,[\s\S]*does not consume a second key/,"the Rulebook must explain the single-key bronze-room rule");
assert.match(html,/weapons show the weapon name when collected,[\s\S]*XP shows the amount,[\s\S]*health is identified as a potion/,"the Rulebook must describe literal pickup feedback");

assert.match(core,/UI\.bronze\.textContent=\`BRONZE \$\{p1\.bronzeKeys\|\|0\}\`/,"the live HUD must show the actual Bronze Key count rather than a combined key total");
assert.match(core,/UI\.quickKeyring\.textContent=\`MAIN \$\{host\.keysCollected\|\|0\}\/\$\{C\.keyTarget\}\$\{host\.exitSigilCollected\?" • SIGIL 1":" • SIGIL 0"\}\`/,"the secondary key line must leave Bronze Keys to the dedicated prominent counter");
assert.doesNotMatch(core,/const totalKeys=\(host\.keysCollected/,"the Bronze HUD must not reuse the old combined-key total");

assert.match(css,/\.keys-card strong\{[^}]*font-size:17px!important[^}]*overflow:visible!important[^}]*text-overflow:clip!important/,"Bronze Key count styling must not ellipsize the value");
assert.match(css,/\.keys-card span\{[^}]*white-space:normal!important[^}]*overflow:visible!important/,"key detail text must remain readable rather than clipped");

assert.doesNotMatch(world,/kind:cycle\[i%cycle\.length\],title:C\.c64Loot/,"generic gameplay pickups must not inherit C64 collectible titles");
assert.match(world,/kind:"game",title:C\.c64Loot/,"actual rescued C64 game collectibles must retain their game title");

assert.match(systems,/const bronzeRewardRooms=new Set\(bonus\.filter\(d=>d\.type==="bronze"\)\.map\(d=>d\.roomId\)\)/,"bronze-gated reward rooms must be identified after door mechanics are assigned");
assert.match(systems,/if\(bronzeRewardRooms\.has\(chest\.roomId\)\)\{chest\.locked=false;chest\.bronzeDoorReward=true\}/,"a chest behind a Bronze Key door must be unlocked before key balancing");

assert.match(play,/function chestBehindBronzeDoor\(chest\)/,"runtime chest interaction must guard legacy/saved bronze-room state");
assert.match(play,/if\(chest\.locked&&chestBehindBronzeDoor\(chest\)\)\{chest\.locked=false;chest\.bronzeDoorReward=true\}/,"bronze-room chests must not reach the second-key charge");
assert.match(play,/if\(chest\.locked\)p\.bronzeKeys--/,"standalone locked chests may still consume one Bronze Key");

assert.match(local,/function resolvedPickupWeapon\(i,p\)/,"weapon pickups must resolve one concrete weapon before presentation");
assert.match(local,/if\(i\.kind==="weapon"\)return resolvedPickupWeapon\(i,p\)\?\.displayName\|\|"WEAPON CACHE"/,"weapon pickup text must use the actual generated weapon name");
assert.match(local,/if\(i\.kind==="game"\)return i\.title\|\|"C64 GAME"/,"only real C64 game collectibles may present their stored C64 title");
assert.match(local,/health:"HEALTH POTION"/,"health pickup naming must be literal");
assert.match(local,/ammo:"AMMUNITION"/,"ammunition pickup naming must be literal");
assert.match(local,/armour:"\+2 ARMOUR"/,"armour pickup naming must expose the amount");
assert.match(local,/xpOrb:\`\+\$\{pickupXP\("xpOrb"\)\} XP\`/,"XP pickup naming must expose the amount");
assert.match(local,/showToast\(\`\+\$\{n\} AMMO\`/,"ammo collection toast must expose the amount");
assert.match(local,/showToast\("\+2 ARMOUR"/,"armour collection toast must expose the amount");
assert.match(local,/showToast\("HEALTH POTION"/,"health collection toast must identify the potion");
assert.doesNotMatch(local,/function collectedName\(i\)\{[^}]*return i\.title\|\|/,"generic collection naming must not prefer stale C64 titles");

assert.match(render,/function groundItemLabel\(i\)/,"ground labels must have a kind-aware owner");
assert.match(render,/if\(i\.kind==="game"\)return i\.title\|\|"C64 GAME"/,"ground labels may use stored titles only for real game collectibles");
assert.match(render,/health:"HEALTH POTION"/,"ground health label must be literal");
assert.match(render,/xpOrb:"\+10 XP"/,"ground XP label must expose its value");
assert.match(render,/armour:"\+2 ARMOUR"/,"ground armour label must expose its value");
assert.match(render,/weapon:"WEAPON CACHE"/,"unresolved ground weapons must be identified as a weapon cache");
assert.match(render,/pixelSheet\?\.complete&&pixelSheet\.naturalWidth>=160/,"the authored chest sheet must remain the normal chest renderer");
assert.match(render,/The authored chest sheet is authoritative/,"loading presentation must explicitly retain chest-sheet ownership");
assert.doesNotMatch(render,/chunky traditional wooden chest body/,"the old inferior wooden chest fallback must not be the normal renderer");

assert.match(render,/function drawPickupGlyph\(i,col\)/,"R54 must keep one renderer-owned pickup illustration boundary");
for(const token of ["HEALTH POTION","AMMUNITION","BANISHMENT FLASK","BRONZE KEY","WEAPON CACHE","+10 XP"]){
  assert.ok(render.includes(token),`pickup renderer/labels must retain ${token}`);
}
assert.match(render,/function drawCorridorDetail\(s,x,y,h,th\)/,"corridor detail must be renderer-owned");
for(const phrase of ["Threshold corridors","Iron Keep corridors","Bone\/Moss corridors","Ember corridors","Sigil corridors"]){
  assert.ok(render.includes(phrase.replace("\\/","/")),`corridor presentation must cover ${phrase}`);
}
assert.match(render,/if\(roomId<0\)drawCorridorDetail\(s,x,y,h,th\)/,"corridor detail must apply only outside generated rooms and remain presentation-only");
assert.match(render,/function drawMerchantNpc\(t,s,col\)/,"shops must render merchant characters");
assert.match(render,/quartermaster_bex/,"Bex Harrow must receive a distinct merchant visual");
assert.match(render,/collector_nix/,"Nix Calder must receive a distinct merchant visual");
assert.match(render,/archivist_orin/,"Orin Vale must receive a distinct merchant visual");
assert.doesNotMatch(render,/fillText\("SHOP",0,9\)/,"the old generic SHOP square must not remain");

assert.match(ai,/function markAttackAnimation\(e,kind="attack",ms=360\)/,"enemy attacks must expose timestamped renderer poses");
assert.match(ai,/e\._attackAnimAt=performance\.now\(\)/,"enemy attack animation must be timestamp based");
assert.doesNotMatch(ai,/setInterval\(/,"enemy animation state must not add a timer loop");
assert.match(play,/p\._fireAnimAt=performance\.now\(\)/,"successful player fire must expose recoil timing to the renderer");
assert.match(render,/PLAYER_WALK_RENDER_SEQUENCE=Object\.freeze\(\[/,"player movement must use an expanded render sequence");
assert.match(render,/PLAYER_MELEE_RENDER_SEQUENCE=Object\.freeze\(\[/,"player melee must use an expanded render sequence");
assert.match(render,/function playerAnimationPose\(p,moving,now=performance\.now\(\)\)/,"player animation must be derived from current state and time");
assert.match(render,/ENEMY_WALK_RENDER_FRAMES=Object\.freeze\(\[-3,-2,0,2,3,2,0,-2\]\)/,"enemy locomotion must expose eight renderer poses");
assert.match(render,/ENEMY_ATTACK_RENDER_FRAMES=Object\.freeze\(\[/,"enemy attacks must expose staged renderer poses");
assert.match(render,/function enemyAnimationPose\(e,time=performance\.now\(\)\)/,"enemy animation must be state/time derived");
assert.doesNotMatch(render,/setInterval\(/,"R54 rendering must not add a second animation timer loop");
assert.match(render,/const enemyDefeatVisuals=\[\]/,"enemy defeat frames must reuse the normal renderer");
assert.match(render,/if\(enemyDefeatVisuals\.length>12\)/,"defeat snapshots must remain bounded");
assert.match(render,/drawEnemyDefeatVisuals\(\)/,"defeat poses must participate in the existing render pass");
assert.match(local,/window\.CCGQueueEnemyDefeatVisual\?\.\(p\)/,"existing enemy FX must feed the renderer-owned defeat sequence");


console.log("PASS V10.42 R54 graphics/UI and animation contract");
