import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";

// Execute the real Guardian shot owner, the real projectile collision gate,
// and the canonical grid walkability function. The old R184 diagonal vectors
// (0.707, +/-0.707) throw TypeError when indexing the map in phase 2 or 3.
const js=join(dirname(fileURLToPath(import.meta.url)),"../js");
const game=readFileSync(join(js,"game-play.js"),"utf8");
const worldSource=readFileSync(join(js,"world.js"),"utf8");
function owner(source,first,after){
  const start=source.indexOf(first),end=source.indexOf(after,start);
  assert.ok(start>=0&&end>start,`Production owner not found: ${first}`);
  return source.slice(start,end);
}
assert.match(game,/for\(const b of enemyBullets\)\{[^\n]*projectilePathClear\(b,nx,ny\)/,
  "The enemy-bullet runtime must keep using the same collision gate reproduced here");
const program=[
  `const C={worldWidth:28,worldHeight:28,tile:24};
   const world={map:Array.from({length:28},()=>Array(28).fill(0))};
   const host={doors:[],blockingDecor:[]};
   const P={orange:"#f80",cyan:"#0ff",red:"#f00",green:"#0f0"};
   const performance={now:()=>1000},S={sfx:()=>{}};
   let shake=0;const shots=[];const spawnEnemyShot=b=>shots.push({...b});`,
  `const W=(()=>{${owner(worldSource,"  function doorAt(host,x,y){","  function playerWalkable(")}
     return {walkable};})();`,
  owner(game,"function projectilePathClear(b,nx,ny){","\nconst FURNITURE_ITEM_CHANCE="),
  owner(game,"function bossBurst(fight,boss,phase){","\nfunction bossRewardCell("),
  "globalThis.api={bossBurst,projectilePathClear,host,shots};"
].join("\n");
const {api}=vm.runInNewContext(program+"\nglobalThis;",{},{timeout:3000});
const guardian={id:"f5-guardian",x:14,y:14},fight={floor:5,name:"GUARDIAN MAW",style:"shock"};
for(const phase of [1,2,3]){
  api.shots.length=0;
  api.bossBurst(fight,guardian,phase);
  assert.equal(api.shots.length,phase===1?4:8,`Guardian phase ${phase} must retain its authored shot count`);
  const directions=new Set(api.shots.map(b=>`${b.dx}:${b.dy}`));
  assert.equal(directions.size,api.shots.length,"Radial attacks must preserve distinct directions");
  if(phase>=2){
    assert.equal(api.shots.filter(b=>b.dx!==0&&b.dy!==0).length,4,
      "Guardian phases two and three must retain four diagonal attacks");
  }
  for(const shot of api.shots){
    assert.ok(Number.isInteger(shot.x)&&Number.isInteger(shot.y)&&
      Number.isInteger(shot.dx)&&Number.isInteger(shot.dy),
      "Every active Guardian projectile must move through whole-number tiles");
    for(let step=1;step<=4;step++){
      const nx=shot.x+shot.dx*step,ny=shot.y+shot.dy*step;
      assert.equal(api.projectilePathClear(shot,nx,ny),true,
        `Guardian phase ${phase} projectile should cross open tiles without a map TypeError`);
    }
  }
}
api.shots.length=0;api.bossBurst(fight,guardian,2);
const diagonal=api.shots.find(b=>b.dx===1&&b.dy===1);
api.host.doors.push({x:15,y:14,locked:true,open:false});
assert.equal(api.projectilePathClear(diagonal,15,15),false,
  "Whole-tile diagonal bullets must still respect closed-door corner collision");
console.log("PASS R185 Guardian phase 1/2/3 radial shots, real walkable collision, and blocked diagonal corner");
