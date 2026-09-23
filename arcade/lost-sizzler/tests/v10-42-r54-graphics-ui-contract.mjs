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

assert.doesNotMatch(world,/kind:cycle\[i%C\.cycle\.length\],title:C\.c64Loot/,"generic gameplay pickups must not inherit C64 collectible titles");
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

console.log("PASS V10.42 R54 graphics/UI first-batch contract");
