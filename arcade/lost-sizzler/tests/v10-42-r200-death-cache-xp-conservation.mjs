import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=name=>fs.readFileSync(new URL("../js/"+name,import.meta.url),"utf8");
const source=["config.js","progression.js","v10-42-r83-death-cache-progression.js"].map(read).join("\n");
for(const capacity of [0,5,80,90,100,200])for(const priorFloor of [0,123])for(const bankedLoss of [0,20,80,100]){
  const context=vm.createContext({window:{}});
  vm.runInContext(source,context);
  const P=context.window.CCGProgression;
  const run={floor:2,floorXP:priorFloor,bankedXP:50000,stats:{},floorGames:[]};
  const cap=P.floorLevelCap(run);
  const player={level:capacity===0?cap:cap-1,xp:capacity===0?0:P.xpNeed(cap-1)-capacity,totalXp:50000+priorFloor,pendingLevels:0,inventory:[],armor:0};
  const cache={active:true,inventory:[],games:[],armour:0,score:0,xp:100,progressionRecovery:{bankedXpLost:bankedLoss,levelBefore:cap-1,levelAfter:cap-1}};
  const accepted=Math.min(capacity,100),moved=Math.min(accepted,bankedLoss);
  const result=P.recoverDeathCache(player,run,cache);
  assert.equal(result.xp,accepted);
  assert.equal(result.xpDiscarded,100-accepted);
  assert.equal(run.bankedXP,50000+moved);
  assert.equal(run.floorXP,priorFloor+accepted-moved);
  assert.equal(player.totalXp,run.bankedXP+run.floorXP,"cached XP must conserve run and player totals");
  assert.ok(!cache.active&&cache.xp===0);
  const before=JSON.stringify([run,player]);
  P.recoverDeathCache(player,run,JSON.parse(JSON.stringify(cache)));
  assert.equal(JSON.stringify([run,player]),before,"serialized inactive cache must not replay XP");
}
console.log("PASS R200 cache XP conservation: 336 assertions");
