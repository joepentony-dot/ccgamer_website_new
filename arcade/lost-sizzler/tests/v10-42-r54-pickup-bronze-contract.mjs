import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(path,"utf8");
const world=read("arcade/lost-sizzler/js/world.js");
const local=read("arcade/lost-sizzler/js/game-local-runtime.js");
const play=read("arcade/lost-sizzler/js/game-play.js");
const core=read("arcade/lost-sizzler/js/game-core.js");
const render=read("arcade/lost-sizzler/js/game-render.js");
const html=read("arcade/lost-sizzler/index.html");
const css=read("arcade/lost-sizzler/css/game.css");
const landing=read("arcade/lost-sizzler/js/v10-41-landing-notification-polish.js");

assert.ok(!/kind:cycle\[i%cycle\.length\],title:C\.c64Loot/.test(world),"generic pickups must not inherit C64 game titles");
assert.match(local,/if\(i\.kind==="game"\)return i\.title\|\|"C64 GAME"/,"only real C64 game collectibles may use their game title");
assert.match(local,/health:"HEALTH POTION"/,"health pickups need mechanic-led naming");
assert.match(local,/xpOrb:`\+\$\{pickupXP\("xpOrb"\)\} XP`/,"XP pickups need visible numeric XP naming from the authoritative pickup value");
assert.match(local,/armour:"\+2 ARMOUR"/,"armour pickups need visible numeric armour naming");
assert.match(local,/showToast\("\+2 ARMOUR"/,"armour toast must expose its actual mechanic value");
assert.match(local,/showToast\(`\+\$\{n\} XP`/,"XP toast must expose its actual mechanic value");
assert.match(local,/function resolvedPickupWeapon\(i,p\)/,"weapon pickup must resolve one concrete weapon before presentation");
assert.match(local,/if\(i\.kind==="weapon"\)return resolvedPickupWeapon\(i,p\)\?\.displayName\|\|"WEAPON CACHE"/,"weapon pickup text must name the exact generated weapon");
assert.match(local,/name:collectedName\(i,p\)/,"pickup diagnostics must report the resolved weapon identity shown to the player");
assert.match(local,/equipWeapon\(p,resolvedPickupWeapon\(i,p\)\)/,"the same resolved weapon must be equipped after collection");
assert.match(render,/function groundItemLabel\(i\)/,"ground labels need a mechanic-led display owner");
assert.match(render,/if\(i\.kind==="game"\)return i\.title\|\|"C64 GAME"/,"only game collectibles may surface C64 titles on the floor");

assert.match(play,/function chestBronzeDoorAlreadyPaid\(chest\)/,"bronze-door chest payment helper must exist");
assert.match(play,/chest\.locked&&!roomKeyPaid&&p\.bronzeKeys<=0/,"a paid bronze room must bypass the second-key lock check");
assert.match(play,/if\(chest\.locked&&!roomKeyPaid\)p\.bronzeKeys--/,"only standalone locked chests may consume another bronze key");
assert.match(play,/chest\.locked=false/,"opened chests must clear the lock state");

assert.match(core,/UI\.bronze\.textContent=`BRONZE \$\{p1\.bronzeKeys\|\|0\}`/,"HUD must expose the bronze count directly");
assert.match(html,/id="hud-bronze">BRONZE 0</,"initial HUD must identify bronze keys explicitly");
assert.match(html,/DOORS, BRONZE KEYS &amp; SECRETS/,"rulebook must document bronze key behaviour");
assert.match(html,/chest costs no second key/,"rulebook must explain the single-key room/chest rule");
assert.match(css,/\.keys-card strong\{[^}]*overflow:visible/,"bronze count must not be clipped");
assert.match(render,/chests:make\("assets\/pixel\/chest-sheet-v10-34\.png"\)/,"R54 renderer must request the established chest sprite sheet");
assert.match(render,/meta\[name="ccg-lost-sizzler-cache"\]/,"R54 renderer must derive its sprite cache identity from the canonical page token");
assert.match(render,/image\.src=`\$\{packageRoot\}\$\{path\}\?v=\$\{encodeURIComponent\(cache\)\}`/,"R54 renderer must append the canonical cache token to package-aware sprite paths");
assert.match(render,/image\.fetchPriority="high"/,"R54 sprite sheets must receive high fetch priority");
assert.match(html,/rel="preload" as="image" href="assets\/pixel\/chest-sheet-v10-34\.png\?v=20260924r54" fetchpriority="high"/,"canonical page must preload the established chest artwork");
assert.match(render,/function drawMerchantNpc\(t,s,col\)/,"shops must render a merchant character rather than only a generic shop block");
assert.match(render,/PLAYER_WALK_RENDER_SEQUENCE=Object\.freeze\(\[/,"player animation must expose expanded renderer-owned walk cadence");
assert.match(render,/PLAYER_MELEE_RENDER_SEQUENCE=Object\.freeze\(\[/,"player animation must expose expanded renderer-owned melee cadence");
assert.match(render,/ENEMY_WALK_RENDER_FRAMES=Object\.freeze\(\[-3,-2,0,2,3,2,0,-2\]\)/,"enemy locomotion must expose the R54 eight-stage renderer cadence");
assert.match(render,/const attackMs=Math\.max\(180,Number\(e\._attackAnimMs\|\|360\)\),attackAge=time-Number\(e\._attackAnimAt\|\|-Infinity\)/,"enemy renderer must expose the shared attack presentation state");
assert.match(read("arcade/lost-sizzler/js/ai.js"),/e\.meleeSwingMs=k==="knight"\?420:k==="hunter"\|\|k==="charger"\?360:300;markAttackAnimation\(e,"melee",e\.meleeSwingMs\)/,"every melee family must expose the renderer-owned swing and attack state without adding a new timer owner");
assert.match(read("arcade/lost-sizzler/js/v10-41-r48-character-animation-polish.js"),/const WALK_SEQUENCE=Object\.freeze\(\[[\s\S]*?left-rise[\s\S]*?right-rise/,"player walk animation must expose the expanded R54 presentation sequence");
assert.match(render,/theme=room\?\.theme\|\|"WARP_GALLERY"/,"corridors must receive an explicit material/render theme");
assert.match(render,/function drawCorridorDetail\(s,x,y,h,th\)/,"R54 must retain the floor-specific corridor treatment recovered from the superseded graphics branch");
assert.match(render,/if\(roomId<0\)drawCorridorDetail\(s,x,y,h,th\)/,"corridor treatment must remain presentation-only outside generated rooms");
for(const phrase of ["Threshold corridors","Iron Keep corridors","Bone/Moss corridors","Ember corridors","Sigil corridors"]){
  assert.ok(render.includes(phrase),`corridor presentation must retain ${phrase}`);
}
assert.match(render,/quartermaster_bex/,"Bex Harrow must retain a distinct merchant visual");
assert.match(render,/collector_nix/,"Nix Calder must retain a distinct merchant visual");
assert.match(render,/archivist_orin/,"Orin Vale must retain a distinct merchant visual");
assert.doesNotMatch(render,/fillText\("SHOP",0,9\)/,"the old generic SHOP square must not return");
assert.match(render,/const enemyDefeatVisuals=\[\]/,"enemy defeat frames must remain renderer-owned");
assert.match(render,/if\(enemyDefeatVisuals\.length>12\)/,"enemy defeat sequence must remain bounded");
assert.match(render,/drawEnemyDefeatVisuals\(\)/,"enemy defeat presentation must stay in the existing render pass");
assert.match(local,/window\.CCGQueueEnemyDefeatVisual\?\.\(p\)/,"existing death FX must feed the renderer-owned defeat sequence");

assert.match(css,/\/\* R54 message-rail repair\./,"R54 must retain explicit message-rail ownership");
assert.match(css,/@media\(max-width:820px\)\{[\s\S]*?\.game-message-rail\{[\s\S]*?display:block!important/,"compact layouts must keep the message rail visible below the canvas");
assert.match(css,/\.game-message-rail \.pickup-toast span\{[^}]*white-space:normal!important[^}]*display:block!important[^}]*overflow:(?:auto|visible)!important/,"notice copy must wrap instead of becoming an unreadable dark rectangle");
assert.match(landing,/rail\.insertBefore\(panel,pickup\)/,"major notices must be inserted into the message rail before the ordinary pickup slot");
assert.match(landing,/body\[data-ccg-major-notification="true"\] #pickup-toast\{[^}]*display:none!important[^}]*visibility:hidden!important[^}]*opacity:0!important/,"major notices must release the ordinary toast layout space");
assert.doesNotMatch(html,/ONLINE room code remains your rejoin key/i,"retired online rejoin wording must not return");
assert.doesNotMatch(html,/rejoin key/i,"public Dungeon HTML must not advertise a retired online rejoin key");

console.log("[r54-pickup-bronze] mechanic-led pickups, readable bronze HUD and single-key room chests verified.");
