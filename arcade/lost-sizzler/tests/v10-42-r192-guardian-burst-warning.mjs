import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(new URL("../js/"+p,import.meta.url),"utf8");
const renderer=read("game-render.js"),play=read("game-play.js");
const slice=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+1);assert.ok(i>=0&&j>i);return s.slice(i,j)};
const warning=slice(renderer,"function drawGuardianBurstWarning(","\nfunction drawEnemy(e){");
const burst=slice(play,"function bossBurst(","\nfunction bossRewardCell(");
function check({hp=100,ms=650,triggered=true,cleared=false,alive=true,id="g"}={}){
  const e={id,alive,hp,maxHp:100,x:4,y:5};
  const fight={bossId:"g",triggered,cleared,attackMs:ms,floor:10,style:"shock",name:"Guardian"};
  const host={r114BossFight:fight},before=JSON.stringify([host,e]),ticks=[],strokes=[],shots=[];
  const ctx={save(){},restore(){},beginPath(){},arc(){},stroke(){strokes.push({colour:this.strokeStyle,alpha:this.globalAlpha,blur:this.shadowBlur})},
    moveTo(x,y){ticks.push([Math.sign(x-100),Math.sign(y-100)])},lineTo(){}};
  const phase=hp<=30?3:hp<=65?2:1;
  const scope={ctx,host,C:{tile:32},e,fight,phase,spawnEnemyShot:s=>shots.push(s),S:{sfx(){}},shake:0,performance:{now:()=>0},outcome:null};
  vm.createContext(scope);vm.runInContext(warning+"\n"+burst+"\noutcome=drawGuardianBurstWarning(e,100,100);if(outcome)bossBurst(fight,e,phase);",scope);
  assert.equal(JSON.stringify([host,e]),before,"Warning and burst do not mutate boss, encounter or countdown");
  if(scope.outcome){
    assert.equal(JSON.stringify(ticks),JSON.stringify(shots.map(s=>[s.dx,s.dy])),"Warning directions match the actual burst owner");
    assert.equal(strokes.length,4,"Two outlined paths, without per-direction stroke calls");
    assert.ok(strokes.every(s=>s.alpha===1&&s.blur===0),"Warnings use steady contrast without expensive blur");
    assert.equal(strokes[3].colour,phase===3?"#ff795d":"#ffd36b");
  }else assert.equal(strokes.length,0,"Inactive warnings draw nothing");
  return scope.outcome;
}
for(const hp of [100,66,65,31,30,1])assert.equal(check({hp}),true);
for(const ms of [651,2200,0,-1,NaN,Infinity])assert.equal(check({ms}),false);
for(const options of [{triggered:false},{cleared:true},{alive:false},{id:"another"}])assert.equal(check(options),false);
assert.equal(check({ms:1}),true);
assert.ok(renderer.includes("drawEnemyChargeTelegraph(e,cx,cy);drawGuardianBurstWarning(e,cx,cy);"));
assert.ok(renderer.includes("if(!e.alive||!tileInRenderView(e.x,e.y,3)||!visibleTo(focus,e.x,e.y))return;"),"Existing visibility gate retained");
console.log("PASS R192 Guardian burst countdown, exact phase directions, steady warning, encounter ownership and immutable state");
