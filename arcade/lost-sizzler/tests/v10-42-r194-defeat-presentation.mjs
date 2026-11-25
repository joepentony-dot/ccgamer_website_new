import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");

const a=source.indexOf("const enemyDefeatVisuals=[];"),b=source.indexOf("\nconst PUNY_ENEMY_CELL",a);
assert.ok(a>=0&&b>a);
function scenario({quality="rich",reduced=false,onscreen=true,visible=true,start=0,now=360}={}){
  let time=start,visibilityCalls=0;const calls=[],draws=[];
  const ctx={save(){},restore(){},translate(...x){calls.push(["translate",...x])},rotate(x){calls.push(["rotate",x])},scale(...x){calls.push(["scale",...x])},fillRect(...x){calls.push(["spark",...x])}};
  const scope={window:{},ctx,C:{tile:32},P:{pink:"#f0f"},focus:{},performance:{now:()=>time},dungeonReducedMotion:()=>reduced,dungeonRenderQuality:()=>quality,tileInRenderView:()=>onscreen,visibleTo:()=>{visibilityCalls++;return visible},ws:(x,y)=>({x:x*32,y:y*32}),drawPunyEnemySprite:e=>{draws.push({progress:e.__defeatProgress,alpha:ctx.globalAlpha});return true},drawAuthoredDungeonEnemySprite:()=>false,drawPixelEnemySprite:()=>{},result:null};
  vm.createContext(scope);vm.runInContext(source.slice(a,b),scope);
  const input={x:4,y:4,kind:"guard",facing:{x:-1,y:0}},before=JSON.stringify(input);
  scope.window.CCGQueueEnemyDefeatVisual(input);time=now;
  vm.runInContext("drawEnemyDefeatVisuals();result=enemyDefeatVisuals.length",scope);
  assert.equal(JSON.stringify(input),before);
  return {calls,draws,visibilityCalls,length:scope.result};
}
const rich=scenario();
assert.equal(rich.draws.length,1);assert.equal(rich.draws[0].progress,360/540);
assert.equal(rich.calls.filter(x=>x[0]==="spark").length,4);
assert.ok(rich.calls.some(x=>x[0]==="rotate"&&x[1]<0));
for(const quality of ["rich","reduced","severe"]){
  const stationary=scenario({quality,reduced:true});
  assert.deepEqual(stationary.calls,[]);assert.equal(stationary.draws[0].progress,0);
  assert.equal(stationary.draws[0].alpha,rich.draws[0].alpha);
  assert.equal(stationary.length,1);
  const expired=scenario({quality,reduced:true,now:540});
  assert.equal(expired.length,0);assert.equal(expired.draws.length,0);
}
for(const quality of ["reduced","severe"]){
  const lower=scenario({quality});assert.equal(lower.draws[0].progress,rich.draws[0].progress);
  assert.equal(lower.calls.filter(x=>x[0]==="spark").length,0);assert.ok(lower.calls.some(x=>x[0]==="rotate"));
}
const off=scenario({onscreen:false});assert.equal(off.length,1);assert.equal(off.visibilityCalls,0);assert.deepEqual(off.draws,[]);assert.deepEqual(off.calls,[]);
assert.equal(scenario({onscreen:false,now:540}).length,0);
const hidden=scenario({visible:false});assert.equal(hidden.length,1);assert.deepEqual(hidden.draws,[]);assert.deepEqual(hidden.calls,[]);
assert.equal(scenario({start:100,now:99}).draws.length,0);
console.log("PASS R194 defeat fade, motion preference, quality spark budget, culling and zero-time expiry");
