import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const repoRoot=path.resolve(root,"../..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const readRepo=relative=>fs.readFileSync(path.join(repoRoot,relative),"utf8");

const world=read("js/world.js");
const systems=read("js/systems.js");
const play=read("js/game-play.js");
const local=read("js/game-local-runtime.js");
const core=read("js/game-core.js");
const render=read("js/game-render.js");
const visual=read("js/v10-42-r54-visual-gameplay-overhaul.js");
const bootstrap=read("js/v10-42-bootstrap.js");
const html=read("index.html");
const css=read("css/game.css");
const version=JSON.parse(read("version.json"));
const serviceWorker=readRepo("service-worker.js");

assert.equal(version.build,"V10.42 r54","R54 must publish its own build identity");
assert.equal(version.cacheToken,"20260923r54","R54 must publish its own cache token");
assert.match(bootstrap,/const BUILD="V10\.42 r54";/,"ordered bootstrap must identify R54");
assert.match(bootstrap,/const CACHE="20260923r54";/,"ordered bootstrap must use the R54 release token");
assert.match(bootstrap,/v10-42-r54-visual-gameplay-overhaul\.js","CCGLostSizzlerV142R54VisualGameplay"/,"R54 visual owner must load through the ordered bootstrap");
assert.match(serviceWorker,/CODE_CACHE_VERSION = "2026-09-23-public-code-v8"/,"public code cache must advance for R54 public JS/CSS");

assert.doesNotMatch(world,/kind:cycle\[i%cycle\.length\],title:C\.c64Loot/,"ordinary mechanic pickups must never inherit a C64 game title");
assert.match(world,/kind:"game",title:C\.c64Loot/,"actual C64 game collectibles must retain their catalogue title");
assert.match(local,/if\(i\.kind==="game"\)return i\.title\|\|"C64 GAME"/,"only actual game collectibles may report their C64 title");
assert.match(local,/if\(p&&i\.kind==="weapon"&&!i\.generatedWeapon\)[\s\S]*?i\.generatedWeapon=PGR\.generateWeapon/,"weapon pickup must resolve the actual weapon before pickup feedback");
assert.match(local,/else if\(i\.kind==="weapon"\)equipWeapon\(p,i\.generatedWeapon\|\|PGR\.generateWeapon/,"the same resolved weapon must be equipped");
assert.match(local,/showToast\("ARMOUR","\+1 ARMOUR","cyan"\)/,"floor armour pickup must report +1 ARMOUR");
assert.match(local,/showToast\("XP","\+10 XP","cyan"\)/,"XP pickup must report the actual XP amount");
assert.match(local,/showToast\("POTION","\+3 HEALTH","green"\)/,"health pickup must use Potion wording and the actual health amount");
assert.match(local,/showToast\("AMMO",/,"ammunition pickup must use literal ammunition wording");

assert.match(systems,/const bronzeRewardRooms=new Set\(bonus\.filter\(d=>d\.type==="bronze"\)/,"decoration must identify bronze-gated reward rooms");
assert.match(systems,/chest\.locked=false;chest\.bronzeDoorReward=true/,"bronze-gated reward chest must be free after paying for the door");
assert.match(play,/const bronzeDoorReward=Boolean\(chest\.bronzeDoorReward\|\|\(host\.doors\|\|\[\]\)\.some\(d=>d\.type==="bronze"&&d\.roomId===chest\.roomId\)\)/,"openChest must repair restored bronze-room chests before key charging");
assert.match(play,/if\(bronzeDoorReward&&chest\.locked\)\{chest\.locked=false;chest\.bronzeDoorReward=true\}/,"runtime chest guard must prevent a second key charge");
assert.match(core,/UI\.bronze\.textContent=/,"large key HUD value must expose the Bronze Key count");
assert.match(core,/p1\.bronzeKeys\|\|0/,"large key HUD value must use the Bronze Key field");
assert.match(css,/\.critical-card\.keys-card strong#hud-bronze\{[^}]*overflow:visible[^}]*text-overflow:clip/,"Bronze Key count must not be ellipsized");
assert.match(css,/\.critical-card\.keys-card span#quick-keyring\{[^}]*white-space:normal[^}]*overflow:visible/,"full keyring summary must remain visible");

assert.doesNotMatch(visual,/requestAnimationFrame\s*\(/,"R54 must not create a second render loop");
assert.doesNotMatch(visual,/setInterval\s*\(/,"R54 must not create per-entity polling");
assert.doesNotMatch(visual,/setTimeout\s*\(/,"R54 visual animation must be render-clock owned");
assert.match(visual,/WALK_OFFSETS=\[-2,-1,0,1,2,1,0,-1\]/,"player walk animation must expose eight renderer phases");
assert.match(visual,/const counts=\{idle:4,walk:6,attack:5,hit:3\}/,"enemy animation must expose explicit idle, walk, attack and hit frame phases");
assert.match(render,/CCGLostSizzlerV142R54VisualGameplay\?\.playerFrame/,"player rendering must consume R54 animation frames");
assert.match(render,/CCGLostSizzlerV142R54VisualGameplay\?\.enemyFrame/,"enemy rendering must consume R54 animation frames");
assert.match(render,/CCGLostSizzlerV142R54VisualGameplay\?\.drawCorridorTile/,"corridors must use the R54 visual grammar");
assert.match(render,/CCGLostSizzlerV142R54VisualGameplay\?\.drawMerchant/,"shops must prefer merchant character rendering");
assert.match(render,/lostSizzlerPixelAssets\.chests/,"authored chest sheet must remain the primary chest source");
assert.match(html,/rel="preload" as="image" href="assets\/pixel\/chest-sheet-v10-34\.png\?v=20260923r54"/,"authored chest art must be preloaded");

assert.match(html,/DOORS, BRONZE KEYS &amp; SECRETS/,"rulebook must document the Bronze Key rules");
assert.match(html,/opening the chest does not cost a second key/,"rulebook must document one-key bronze-room ownership");
assert.match(html,/Floor armour adds 1 ARMOUR/,"rulebook must document floor armour pickup amount");
assert.match(html,/XP Orbs award 10 XP/,"rulebook must document XP pickup amount");
assert.match(html,/Weapon Cache pickups identify the actual firearm you receive/,"rulebook must document weapon pickup identity");
assert.match(html,/C64 game titles are reserved for genuine collectible C64 games/,"rulebook must distinguish game collectibles from mechanic pickups");

console.log("PASS V10.42 R54 visual/gameplay overhaul contract");
