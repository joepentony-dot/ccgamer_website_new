import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const index=read("index.html"),active=read("js/v10-41-active-enemy-fire.js"),css=read("css/v10-41-r28.css"),manifest=JSON.parse(read("version.json"));

assert.ok(index.includes(`js/v10-41-active-enemy-fire.js?v=${manifest.cacheToken}`),"active enemy-fire compatibility must load from the canonical shell");
assert.doesNotMatch(index,/v10-41-r28-special-mode-repair\.js/,"retired r28 special-mode runtime must not load");
assert.match(active,/function cardinalEnemyShot\(/,"active enemy-only cardinal shot normaliser must exist");
assert.match(active,/function installEnemyCardinalFire\(/,"active enemy-fire wrapper installer must exist");
assert.match(active,/__ccgV141ActiveEnemyCardinal/,"active enemy-fire wrapper must have an idempotent ownership marker");
assert.match(active,/function balanceJoystickHunters\(/,"ordinary Dungeon Hunter balancing must remain active after r28 removal");
assert.doesNotMatch(active,/horde-survivor|sizzler-saboteurs|CCGLostSizzlerSpecialModes/,"active extraction must not activate retired Horde or Spy runtime");
assert.match(css,/width:100vw!important/,"separate active desktop shell correction must remain present");

const shots=[];
const baseStep=(host,map,players,dt,hooks)=>hooks.shoot({enemyId:"enemy-1",x:4,y:4,dx:2,dy:1});
const window={CCGAI:{stepEnemies:baseStep}};
const context=vm.createContext({window,document:{body:{dataset:{specialMode:""}}},run:{floor:1},host:{enemies:[]},setInterval:()=>0,addEventListener:()=>{}});
vm.runInContext(active,context);
const wrapped=window.CCGAI.stepEnemies;
wrapped({enemies:[{id:"enemy-1",x:4,y:4,targetId:"solo"}]},null,[{id:"solo",x:9,y:6,health:5}],0,{shoot:shot=>shots.push(shot)});
assert.equal(shots.length,1,"Solo enemy firing must produce one shot");
assert.deepEqual({...shots[0]},{enemyId:"enemy-1",x:4,y:4,dx:1,dy:0},"Solo enemy firing must target the active player on one cardinal axis");
vm.runInContext(active,context);
assert.equal(window.CCGAI.stepEnemies,wrapped,"repeated starts must not stack duplicate AI wrappers");
assert.equal(wrapped.__ccgOriginal,baseStep,"active enemy-fire ownership depth must remain one wrapper");
console.log("C64 Dungeon Carnage active enemy-fire extraction contract passed.");
