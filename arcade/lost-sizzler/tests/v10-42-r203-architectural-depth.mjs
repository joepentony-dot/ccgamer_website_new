import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
const start=source.indexOf("const dungeonStoneReliefCache="),end=source.indexOf("const FLOOR_TILE_PALETTES=",start);
assert.ok(start>=0&&end>start);
for(const tile of [42,48,128]){
  const raster=[],draws=[];let allocations=0;
  const g={save(){},restore(){},translate(){},fillRect(x,y,w,h){raster.push([x,y,w,h])}};
  const world={map:Array.from({length:5},()=>Array(5).fill(1))};
  const box={world,C:{tile},run:{floor:1},W:{themeAt:()=>({wall:"#483f4d",hi:"#8b7b87"})},ctx:{drawImage(...a){draws.push(a)}},document:{createElement(){allocations++;return{getContext:()=>g}}},dungeonRenderPerformance:{}};
  vm.createContext(box);vm.runInContext(source.slice(start,end),box);
  for(let mask=0;mask<16;mask++){
    world.map[1][2]=mask&1?0:1;world.map[2][3]=mask&2?0:1;world.map[3][2]=mask&4?0:1;world.map[2][1]=mask&8?0:1;
    for(let seed=0;seed<3;seed++){
      const before=JSON.stringify(world);draws.length=0;
      assert.equal(box.drawDungeonStoneRelief({x:10,y:20},2,2,seed),mask!==0);
      assert.equal(JSON.stringify(world),before);
      const edges=[4,1,8,2].map((bit,index)=>({bit,index})).filter(e=>mask&e.bit);
      assert.deepEqual(draws.map(a=>a.slice(1)),edges.map(e=>[e.index*tile,seed*tile,tile,tile,10,20,tile,tile]));
    }
  }
  assert.equal(allocations,1);
  assert.deepEqual(raster[0],[0,tile-Math.round(tile*.38),tile,Math.round(tile*.38)]);
  for(const [x,y,w,h] of raster)assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=tile&&y+h<=tile);
  assert.equal(vm.runInContext("dungeonStoneReliefBytes",box),tile*tile*12*4);
  box.run.floor=2;assert.equal(box.drawDungeonStoneRelief({x:0,y:0},2,2,0),false);
}
console.log("R203 deeper atlas geometry, all edge/seed combinations and unchanged warm draws PASS");
