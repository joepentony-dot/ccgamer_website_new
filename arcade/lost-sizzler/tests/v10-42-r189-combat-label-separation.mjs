import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const render=readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
const start=render.indexOf("function placeCombatFloater("),end=render.indexOf("\nfunction drawHazards(",start);
assert.ok(start>=0&&end>start,"Actual canvas label renderer must be present");
function renderLabels({viewX=0,ownerX=5,ownerY=6,measure=true,otherOwner=false,far=false}={}){
  const x=ownerX*32+16,y=ownerY*32-17,drawn=[],stroked=[];
  const pickup=(text,ownerId="p1")=>({text,pickup:true,ownerId,life:800,maxLife:1250,startScale:.42,endScale:1.28,col:"gold"});
  const labels=[pickup("AMMUNITION ×3"),pickup("ARMOUR"),{text:"+100 XP",x,y,life:720,maxLife:720,col:"white"}];
  if(otherOwner)labels.push(pickup("HEALTH","p2"));
  if(far)labels.push({text:"FREED",x:x+160,y,life:720,maxLife:720,col:"white"});
  const players=[{id:"p1",rx:ownerX,ry:ownerY},{id:"p2",rx:ownerX+4,ry:ownerY}];
  let position,scale=1;
  const ctx={save(){},restore(){},translate(a,b){position=[a,b]},scale(a){scale=a},
    strokeText(text){stroked.push(text)},fillText(text){drawn.push({text,x:position[0],y:position[1],scale})}};
  if(measure)ctx.measureText=t=>({width:t.length*9});
  const snapshot=JSON.stringify(labels),playerSnapshot=JSON.stringify(players);
  const scope={ctx,view:{x:viewX,y:0,w:400,h:300},cam:{x:0,y:0},
    particles:[],rings:[],floaters:labels,localPlayers:()=>players,C:{tile:32}};
  vm.createContext(scope);vm.runInContext(render.slice(start,end)+"\ndrawEffects()",scope,{filename:"actual-combat-label-renderer"});
  assert.equal(JSON.stringify(labels),snapshot,"Rendering cannot mutate event values or lifetimes");
  assert.equal(JSON.stringify(players),playerSnapshot,"Rendering cannot move either player");
  assert.deepEqual(drawn.map(q=>q.text),labels.map(q=>q.text),"No reward or combat label dropped");
  assert.deepEqual(stroked,labels.map(q=>q.text),"Text outlines preserved");
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(Math.abs(drawn[i].y-drawn[j].y)>=25,"Mixed simultaneous labels must have separated baselines");
  return drawn;
}
const desktop=renderLabels();
assert.equal(desktop[0].x,176);
assert.ok(Math.abs(desktop[0].y-174.52)<.001,"First label retains its natural owner anchor");
const split=renderLabels({viewX:400});
assert.deepEqual(split.map(q=>q.y),desktop.map(q=>q.y));
assert.deepEqual(split.map(q=>q.x),desktop.map(q=>q.x+400));
const edge=renderLabels({ownerY:1});
assert.ok(edge.every(q=>q.y>=20&&q.y<=297),"Top-edge placement must choose visible lanes");
renderLabels({measure:false});
const separated=renderLabels({otherOwner:true,far:true});
assert.equal(separated[3].x,304,"Second player's label stays with its own owner");
assert.equal(separated[3].y,desktop[0].y,"Separate owner does not inherit another player's occupied lane");
// FREED is far from P1, but overlaps the second player's HEALTH label.
assert.equal(separated[4].x,336,"Combat event retains its horizontal anchor");
assert.ok(Math.abs(separated[4].y-separated[3].y)>=25,"Nearby combat event must avoid the second player's label");
const distant=renderLabels({far:true});
assert.equal(distant[3].x,336);
assert.equal(distant[3].y,175,"A genuinely non-overlapping combat event retains its natural position");

// Verify the bounded fallback in an exceptionally congested viewport:
// no infinite loop, no disappearing labels, no gameplay mutation.
const scope={view:{x:0,y:0,w:120,h:30},occupied:[]};
vm.createContext(scope);vm.runInContext(render.slice(start,render.indexOf("function drawEffects(",start)),scope);
for(let i=0;i<96;i++)assert.ok(Number.isFinite(scope.placeCombatFloater(60,25,35,20,scope.occupied)));
assert.equal(scope.occupied.length,96);
console.log("PASS R189 real canvas mixed combat label separation, viewport isolation, edge lanes and bounded saturation fallback");
