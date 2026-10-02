import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../../..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const moduleSource=read("arcade/lost-sizzler/js/v10-42-r92-enemy-identity.js");
const bootstrap=read("arcade/lost-sizzler/js/v10-42-bootstrap.js");
const renderer=read("arcade/lost-sizzler/js/game-render.js");
const runtime=read("arcade/lost-sizzler/js/game-local-runtime.js");

const context={window:{}};
vm.runInNewContext(moduleSource,context,{filename:"v10-42-r92-enemy-identity.js"});
const identity=context.window.CCGDungeonEnemyIdentity;

assert(identity&&typeof identity.label==="function","R92 must expose one shared enemy identity owner.");
assert(identity.label({kind:"scout"},{floor:1})==="Vault Scout","early campaign scouts must use the RPG identity.");
assert(identity.label({kind:"scout"},{floor:7})==="Catacomb Scout","mid-campaign scouts must evolve with the dungeon.");
assert(identity.label({kind:"scout"},{floor:13})==="Citadel Scout","late-campaign scouts must use the Citadel identity.");
assert(identity.label({kind:"firebreather"},{floor:13})==="Infernal Maw","late firebreathers must receive a stronger RPG identity.");
assert(identity.label({kind:"ghost"},{floor:13})==="Blood Wraith","late ghosts must receive a stronger RPG identity.");
assert(identity.label({kind:"root",follower:{name:"AZALEA"}},{floor:13})==="AZALEA","named supporter identities must never be renamed.");
assert(identity.label({kind:"cook",follower:{name:"CPU"}},{floor:13})==="CPU","CPU must retain the named supporter identity.");
assert(identity.label({kind:"ghost",deathStalker:true,voidStalker:true},{floor:13})==="Death Stalker","Death Stalker naming must remain canonical.");
assert(identity.label({kind:"guardian",exitWarden:true,championName:"Sigil Warden"},{floor:13})==="Sigil Warden","Sigil Warden naming must remain canonical.");
assert(identity.label({kind:"hunter",championName:"Raster Baron"},{floor:13})==="Raster Baron","champion names must remain authoritative.");

assert(bootstrap.includes('["v10-42-r92-enemy-identity.js","CCGLostSizzlerV142R92EnemyIdentity"]'),"ordered bootstrap must load R92 enemy identity.");
assert(renderer.includes("CCGDungeonEnemyIdentity?.label?.(e"),"renderer must use the shared R92 identity owner.");
assert(runtime.includes("CCGDungeonEnemyIdentity?.label?.(e"),"combat/death runtime must use the shared R92 identity owner.");
assert(runtime.includes("enemyDefeatIdentity"),"enemy-credit identity must remain owned by the existing defeat ledger.");
assert(!moduleSource.includes("damageEnemy(")&&!moduleSource.includes("stepEnemies("),"R92 identity must not claim combat or AI ownership.");

console.log("Dungeon Carnage R92 floor-aware enemy identity contract passed.");