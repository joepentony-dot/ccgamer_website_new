import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const game=path.resolve(here,"..");
const readGame=file=>fs.readFileSync(path.join(game,file),"utf8");
const play=readGame("js/game-play.js");
const render=readGame("js/game-render.js");
const systems=readGame("js/systems.js");
const audio=readGame("js/audio.js");

assert.match(play,/const FURNITURE_ITEM_CHANCE=\.12/,"smashable furniture must have a restrained item chance");
const enemyChance=Number(play.match(/const FURNITURE_ENEMY_CHANCE=([\d.]+)/)?.[1]);
assert.ok(enemyChance>0&&enemyChance<.05,"barrel/bookcase enemy releases must remain below five percent");
assert.match(play,/\["barrel","bookcase"\]\.includes\(blocker\?\.type\)/,"rare furniture enemies must be limited to barrels and bookcases");
assert.match(play,/host\.v131FurnitureEnemyReleased/,"a floor must cap furniture ambushes");
assert.match(play,/bounty\.target\+\+/,"a released enemy must be added to a sub-50 all-enemies bounty");
assert.match(systems,/BUDGET_BIN:\["bin","barrel"/,"barrels must be part of generated furniture");
assert.match(render,/d\.type==="barrel"/,"barrels must have dedicated rendering");
assert.match(play,/const meleeOnly=!\(p\.firearmUnlocked&&p\.weapon&&Number\(p\.mana\|\|0\)>0\)/,"legacy collision code must still identify its original sword-only branch before the final contact owner takes over");
assert.match(play,/if\(meleeOnly\)[\s\S]*?p\.x=fromX;p\.y=fromY[\s\S]*?return;/,"sword users must remain adjacent without contact damage before the final contact owner takes over");
assert.match(play,/CCGLostSizzlerOnboardingV120\?\.state\?\.active\|\|SYS\.inSanctuary\(world,p\.x,p\.y\)\)\{resetCamp\(p,true\);return\}/,"anti-idle explosions must be disabled during tutorial mode and while the player is in Sanctuary");
assert.match(audio,/function stopAll\(\)/,"tutorial exit must be able to stop all music and effects");

console.log("C64 Dungeon Carnage V10.31 furniture, melee and tutorial safety checks passed.");
