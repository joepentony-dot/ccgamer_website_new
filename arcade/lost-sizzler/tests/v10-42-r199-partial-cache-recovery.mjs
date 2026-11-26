import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync(new URL("../js/progression.js",import.meta.url),"utf8");

const cut=(s,a,b)=>{const start=s.indexOf(a),end=s.indexOf(b,start);assert.ok(start>=0&&end>start);return s.slice(start,end)};
const inventory=cut(source,"const stackableKinds=","  function bankFloor(");
const clone=source.match(/function cloneItem\(x\)\{return x&&typeof x==="object"\?\{\.\.\.x\}:x\}/)?.[0];assert.ok(clone);
const recovery=cut(source,"function recoverDeathCache(","  function loseFloorProgress(");
const ctx={C:{player:{inventorySlots:12,startingInventorySlots:3}},gainXP:()=>{throw Error("unexpected XP")}};
vm.createContext(ctx);vm.runInContext(inventory+"\n"+clone+"\n"+recovery,ctx);
const run=()=>({floorGames:[],stats:{}}),cache=(kind,qty)=>({active:true,inventory:[{kind,qty,name:kind}],games:[],armour:0,score:0,xp:0});
const qty=(p,kind)=>p.inventory.filter(x=>x.kind===kind).reduce((sum,x)=>sum+x.qty,0);
for(const [kind,limit] of [["potion",4],["torch",2],["teleport",4],["mapReveal",2]]){
  const p={magicSacks:1,inventorySlots:3,armor:0,inventory:[{kind,qty:limit-1},{kind:"weapon",qty:1},{kind:"bronze",qty:1}]};
  const r=run(),c=cache(kind,3),a=ctx.recoverDeathCache(p,r,c);
  assert.equal(a.recovered,1);assert.equal(a.remaining,2);assert.equal(qty(p,kind),limit);assert.equal(c.inventory[0].qty,2);assert.equal(c.active,true);assert.equal(p.inventory.length,3);assert.equal(r.stats.deathCachesRecovered,undefined);
  const restored=JSON.parse(JSON.stringify(c)),b=ctx.recoverDeathCache(p,r,restored);
  assert.equal(b.recovered,0);assert.equal(b.remaining,2);assert.equal(qty(p,kind),limit);
  p.inventory.pop();
  const d=ctx.recoverDeathCache(p,r,restored);
  assert.equal(d.recovered,2);assert.equal(d.remaining,0);assert.equal(qty(p,kind),limit+2);assert.equal(restored.active,false);assert.equal(r.stats.deathCachesRecovered,1);
  const e=ctx.recoverDeathCache(p,r,restored);assert.equal(e.recovered,0);assert.equal(r.stats.deathCachesRecovered,1);
}
const p={inventorySlots:3,armor:0,inventory:[{kind:"banishment",qty:1},{kind:"weapon",qty:1},{kind:"bronze",qty:1}]},r=run(),c=cache("banishment",1);
const a=ctx.recoverDeathCache(p,r,c);assert.equal(a.recovered,0);assert.equal(a.remaining,1);assert.equal(qty(p,"banishment"),1);assert.equal(c.active,true);
console.log("PASS R199 partial consumable recovery preserves cache quantities and charge ownership");
