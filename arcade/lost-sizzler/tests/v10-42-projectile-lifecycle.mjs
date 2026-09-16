import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const source=read("js/v10-42-projectile-lifecycle.js");
const bootstrap=read("js/v10-42-bootstrap.js");
const gamePlay=read("js/game-play.js");
const heldFireBrowser=read("tests/browser/v10-42-live-defects-current-main.mjs");

assert.match(bootstrap,/v10-42-projectile-lifecycle\.js/,"ordered V10.42 bootstrap must load the projectile lifecycle owner");
assert.match(source,/finally\s*\{\s*sweepExpired\(bullets,"player"\);\s*sweepExpired\(enemyBullets,"enemy"\)/s,"projectile cleanup must run from a finally boundary even when hit/death callbacks fault");
assert.match(source,/consumeImpact\(b\);\s*const owner=findLocal\(b\.owner\)/s,"enemy impacts must retire or consume piercing state before the enemy damage/death callback");
assert.doesNotMatch(source,/fireDelay|maxProjectiles|rapidMs|firePlayer\s*=|function\s+firePlayer/,"projectile lifecycle repair must not change fire cadence, projectile allowance or the held-fire owner");
assert.match(gamePlay,/input\.has\("Space"\)\|\|fireBuffer1>0/,"canonical frame loop must retain held-Space firing");
assert.match(heldFireBrowser,/await sustainedFire\(page,"Space"\)/,"retained Chromium contract must continue exercising sustained held-Space firing on the release runtime");

const context={
  console,
  bullets:[],enemyBullets:[],particles:[],
  C:{tile:40},
  P:{cyan:"cyan",orange:"orange",gold:"gold",white:"white",purple:"purple"},
  S:{sfx(){}},
  W:{walkable(){return true}},
  world:{map:Array.from({length:8},()=>Array(64).fill(0))},
  host:{sequenceTorchPuzzle:null,switches:[],stalker:null,generators:[],enemies:[]},
  p1:{id:"p1",x:0,y:0},
  playMode:"solo",
  net:{send(){}},
  stepProjectiles(){},
  damageFurnitureAt(){return false},
  projectilePathClear(){return true},
  burst(){},ring(){},
  activateSequenceTorch(){},activateSwitch(){},hitStalker(){return false},damageGenerator(){},
  findLocal(owner){return owner==="p1"?this.p1:null},
  damageEnemy(){},
  localPlayers(){return [this.p1]},
  hurtPlayer(){}
};
context.window=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-42-projectile-lifecycle.js"});
assert.equal(context.CCGLostSizzlerV142ProjectileLifecycle.ownsBoundary(),true,"lifecycle module must own the live projectile step boundary");

const makeBullet=(overrides={})=>({x:0,y:0,dx:1,dy:0,ttl:18,power:1,element:"physical",owner:"p1",ownerName:"P1",pierce:0,...overrides});
const makeEnemy=(overrides={})=>({id:"enemy",x:1,y:0,alive:true,hp:4,maxHp:4,...overrides});
function reset(){
  context.bullets.length=0;context.enemyBullets.length=0;context.particles.length=0;
  context.host.sequenceTorchPuzzle=null;context.host.switches=[];context.host.stalker=null;context.host.generators=[];context.host.enemies=[];
  context.damageEnemy=()=>{};
}

reset();
context.host.enemies=[makeEnemy()];
context.bullets.push(makeBullet());
context.stepProjectiles();
assert.equal(context.bullets.length,0,"a non-piercing projectile that hits an enemy must leave the authoritative projectile collection immediately");

reset();
context.host.enemies=[makeEnemy()];
for(let hit=0;hit<500;hit++){
  context.bullets.push(makeBullet());
  context.stepProjectiles();
  assert.equal(context.bullets.length,0,`repeated enemy hit ${hit+1} must not retain a stale projectile`);
}

reset();
const dying=makeEnemy({hp:1,maxHp:1});
context.host.enemies=[dying];
context.damageEnemy=enemy=>{enemy.hp=0;enemy.alive=false;throw new Error("simulated downstream death callback fault")};
context.bullets.push(makeBullet());
assert.throws(()=>context.stepProjectiles(),/simulated downstream death callback fault/,"lifecycle owner must not hide downstream combat faults");
assert.equal(dying.alive,false,"death-path fixture must reach the enemy-death state");
assert.equal(context.bullets.length,0,"a projectile that kills an enemy must still be removed when a downstream death callback faults");
assert.ok(context.CCGLostSizzlerV142ProjectileLifecycle.diagnostics.faultSweeps>=1,"faulting hit/death paths must execute the authoritative cleanup sweep");

reset();
let peak=0;
for(let tick=0;tick<2400;tick++){
  context.bullets.push(makeBullet({x:0,y:2,ttl:18}));
  context.stepProjectiles();
  peak=Math.max(peak,context.bullets.length);
}
assert.ok(peak<=17,`deterministic sustained firing must remain TTL-bounded rather than grow without limit (peak ${peak})`);
for(let tick=0;tick<24;tick++)context.stepProjectiles();
assert.equal(context.bullets.length,0,"sustained-fire projectile pool must drain fully after firing stops");

console.log("Dungeon Carnage projectile lifecycle regression passed.");
