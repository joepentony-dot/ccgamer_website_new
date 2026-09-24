import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const html=read("index.html");
const version=JSON.parse(read("version.json"));
const css=read("css/game.css");
const core=read("js/game-core.js");
const world=read("js/world.js");
const systems=read("js/systems.js");
const play=read("js/game-play.js");
const ai=read("js/ai.js");
const local=read("js/game-local-runtime.js");
const render=read("js/game-render.js");
const landing=read("js/v10-41-landing-notification-polish.js");

assert.ok(html.includes(`preload" as="image" href="assets/pixel/chest-sheet-v10-34.png?v=${version.cacheToken}"`),"the authored chest sheet must be preloaded under the current release cache token");
assert.match(html,/id="hud-bronze">BRONZE 0<\/strong>/,"the critical HUD must name the Bronze Key count explicitly");
assert.match(html,/If a chest is inside a room you already unlocked with a bronze key,[\s\S]*costs no second key/i,"the Rulebook must explain the single-key bronze-room rule");
assert.match(html,/Pickups now name the thing you actually collected:[\s\S]*weapons show their generated weapon name,[\s\S]*armour and XP show the amount gained,[\s\S]*health is identified as a potion,[\s\S]*ammunition shows the rounds added/i,"the Rulebook must describe literal pickup feedback");

assert.match(core,/UI\.bronze\.textContent=\`BRONZE \$\{p1\.bronzeKeys\|\|0\}\`/,"the live HUD must show the actual Bronze Key count rather than a combined key total");
assert.match(core,/UI\.quickKeyring\.textContent=\`MAIN \$\{host\.keysCollected\|\|0\}\/\$\{C\.keyTarget\}\$\{host\.exitSigilCollected\?" • SIGIL 1":" • SIGIL 0"\}\`/,"the secondary key line must leave Bronze Keys to the dedicated prominent counter");
assert.doesNotMatch(core,/const totalKeys=\(host\.keysCollected/,"the Bronze HUD must not reuse the old combined-key total");

assert.match(css,/\.keys-card strong\{[^}]*overflow:visible[^}]*text-overflow:clip/,"Bronze Key count styling must not ellipsize the value");
assert.match(css,/\.keys-card span\{[^}]*white-space:normal[^}]*overflow:visible/,"key detail text must remain readable rather than clipped");

assert.doesNotMatch(world,/kind:cycle\[i%cycle\.length\],title:C\.c64Loot/,"generic gameplay pickups must not inherit C64 collectible titles");
assert.match(world,/kind:"game",title:C\.c64Loot/,"actual rescued C64 game collectibles must retain their game title");

assert.match(systems,/const bronzeRewardRooms=new Set\(bonus\.filter\(d=>d\.type==="bronze"\)\.map\(d=>d\.roomId\)\)/,"bronze-gated reward rooms must be identified after door mechanics are assigned");
assert.match(systems,/if\(bronzeRewardRooms\.has\(chest\.roomId\)\)\{chest\.locked=false;chest\.bronzeDoorReward=true\}/,"a chest behind a Bronze Key door must be unlocked before key balancing");

assert.match(play,/function chestBronzeDoorAlreadyPaid\(chest\)/,"runtime chest interaction must recognise an already-paid Bronze-door room");
assert.match(play,/const roomKeyPaid=chestBronzeDoorAlreadyPaid\(chest\)/,"bronze-room chest interaction must derive whether the room key was already paid");
assert.match(play,/if\(chest\.locked&&!roomKeyPaid\)p\.bronzeKeys--/,"standalone locked chests may still consume one Bronze Key while paid Bronze rooms do not");

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

assert.match(css,/\/\* R54 message-rail repair\./,"R54 must own the final notice-rail layout");
assert.match(css,/@media\(max-width:820px\)\{[\s\S]*?\.game-message-rail\{[\s\S]*?display:block!important/,"compact layouts must keep the message rail visible below the canvas");
assert.match(css,/\.game-message-rail \.pickup-toast span\{[\s\S]*?white-space:normal!important;[\s\S]*?overflow:auto!important/,"notice copy must wrap/scroll rather than disappear behind the dark rail");
assert.match(landing,/rail\.insertBefore\(panel,pickup\)/,"major notices must occupy the message rail before the ordinary pickup slot");
assert.match(landing,/body\[data-ccg-major-notification="true"\] #pickup-toast\{[^}]*display:none!important[^}]*visibility:hidden!important[^}]*opacity:0!important/,"major notices must release the ordinary toast's layout space");
assert.match(landing,/\.major-copy span\{[^}]*white-space:normal;[^}]*overflow:auto/,"major notice copy must remain readable when long");
assert.doesNotMatch(html,/ONLINE room code remains your rejoin key/i,"retired online rejoin wording must not return to the public page");
assert.doesNotMatch(html,/rejoin key/i,"public Dungeon Carnage HTML must not advertise a retired rejoin key");



console.log("PASS V10.42 R54 graphics/UI and animation contract");
