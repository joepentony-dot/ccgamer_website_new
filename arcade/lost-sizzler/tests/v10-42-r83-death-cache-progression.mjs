import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const source=read("js/v10-42-r83-death-cache-progression.js");
const gameplay=read("js/game-play.js");
const bootstrap=read("js/v10-42-bootstrap.js");
const version=JSON.parse(read("version.json"));

assert.match(bootstrap,/v10-42-r82-rpg-death-rollback\.js[\s\S]*v10-42-r83-death-cache-progression\.js[\s\S]*v10-42-r72-map-death-feedback\.js/,"R83 must compose after RPG rollback and before death presentation");
assert.match(gameplay,/priorCacheLost=\(host\.deathCaches\|\|\[\]\)\.some/,"a new death must detect an unrecovered prior cache");
assert.match(gameplay,/if\(priorCacheLost\)host\.deathCaches=\[\]/,"a second death must destroy the previous active cache");
assert.match(gameplay,/cache\.progressionRecovery=penalty\.progressionRecovery/,"the new death cache must own the recoverable progression transaction");
assert.match(gameplay,/YOUR PREVIOUS DEATH CACHE WAS DESTROYED/,"death feedback must explain permanent loss of the prior cache");
assert.match(source,/bankedXpLost/,"R83 must preserve the original floor-vs-banked XP accounting");
assert.match(source,/restoreSpentRpgPoint/,"R83 must restore a stripped RPG point");
assert.match(source,/recoveredLevels\.some\(level=>level>=bundle\.levelBefore\)/,"R83 must restore the cached entitlement only when cached XP actually recreates the missing level");
assert.match(source,/levelRestoredByCache&&bundle\.lostSkillId/,"spent RPG restoration must be gated on a level restored by this cache");
assert.match(source,/levelRestoredByCache&&bundle\.lostPendingLevel/,"unused-level restoration must be gated on a level restored by this cache");
assert.match(source,/window\.triggerDeathCache=function triggerDeathCacheV142R83ProgressionFeedback/,"R83 feedback must wrap the active V10.4 death-cache trigger");
assert.match(source,/PROGRESSION RECOVERED/,"the active recovery path must visibly report restored progression");
assert.match(source,/lostPendingLevel/,"R83 must restore an unused level entitlement when that was what death removed");

function contextFor({lostSkill=true,lostPending=false}={}){
  const PGR={
    applySkill(player,id){
      if(!String(id).startsWith("v142-stat-")||Math.max(0,Number(player.pendingLevels)||0)<=0)return null;
      const statId=String(id).slice("v142-stat-".length);
      player.pendingLevels--;
      player.skills=player.skills||[];
      player.skills.push(id);
      player.rpgStats=player.rpgStats||{};
      player.rpgStats[statId]=(Number(player.rpgStats[statId])||5)+1;
      if(statId==="might"&&player.rpgStats[statId]===7)player.damageBonus=(Number(player.damageBonus)||0)+1;
      return{id,name:statId.toUpperCase()+" +1"};
    },
    applyDeathPenalty(player,score,run){
      const beforeFloor=run.floorXP,beforeBanked=run.bankedXP;
      run.floorXP=Math.max(0,beforeFloor-80);
      run.bankedXP=Math.max(0,beforeBanked-20);
      player.totalXp-=100;
      player.level=4;
      player.xp=900;
      if(lostSkill){
        player.skills.pop();
        player.rpgStats.might=6;
        player.damageBonus=1;
        return{score:Math.floor(score/2),xpLost:100,levelLost:true,levelBefore:5,levelAfter:4,lostSkill:"MIGHT +1",rpgRollback:{id:"might",before:7,after:6}}
      }
      if(lostPending){
        player.pendingLevels=Math.max(0,(player.pendingLevels||0)-1);
        return{score:Math.floor(score/2),xpLost:100,levelLost:true,levelBefore:5,levelAfter:4,lostSkill:"Unused level-up"}
      }
      return{score:Math.floor(score/2),xpLost:100,levelLost:false,levelBefore:5,levelAfter:5,lostSkill:null}
    },
    recoverDeathCache(player,run,cache){
      const xp=Math.max(0,Number(cache.xp)||0);
      const beforeLevel=player.level;
      player.totalXp+=xp;
      player.xp+=xp;
      const levels=[];
      if(player.level===4&&player.xp>=1000){
        player.xp-=1000;
        player.level=5;
        player.pendingLevels=(player.pendingLevels||0)+1;
        levels.push(5);
      }
      run.floorXP+=xp;
      cache.xp=0;
      return{recovered:0,games:0,remaining:0,score:0,xp,levels,beforeLevel}
    }
  };
  const context={console,Date,Math,Number,Boolean,JSON,window:{CCGProgression:PGR}};
  context.window.window=context.window;
  vm.createContext(context);
  vm.runInContext(source,context,{filename:"v10-42-r83-death-cache-progression.js"});
  return context
}

{
  const context=contextFor({lostSkill:true}),PGR=context.window.CCGProgression;
  const run={floorXP:500,bankedXP:800};
  const player={level:5,xp:0,totalXp:5000,pendingLevels:0,skills:["v142-stat-might"],rpgStats:{might:7},damageBonus:2};
  const penalty=PGR.applyDeathPenalty(player,1000,run);
  assert.equal(penalty.progressionRecovery.floorXpLost,80);
  assert.equal(penalty.progressionRecovery.bankedXpLost,20);
  assert.equal(penalty.progressionRecovery.lostSkillId,"v142-stat-might");
  const cache={xp:100,progressionRecovery:JSON.parse(JSON.stringify(penalty.progressionRecovery))};
  const recovered=PGR.recoverDeathCache(player,run,cache);
  assert.equal(player.level,5);
  assert.equal(player.rpgStats.might,7);
  assert.equal(player.damageBonus,2);
  assert.equal(player.pendingLevels,0,"the restored stat must consume the level entitlement recreated by the cached XP");
  assert.equal(player.skills.at(-1),"v142-stat-might");
  assert.equal(run.floorXP,500,"floor XP accounting must return to its pre-death amount");
  assert.equal(run.bankedXP,800,"banked XP accounting must return to its pre-death amount");
  assert.equal(recovered.progressionRecovered,true);
  assert.match(recovered.restoredSkill,/MIGHT/i);
}

{
  const context=contextFor({lostSkill:false,lostPending:true}),PGR=context.window.CCGProgression;
  const run={floorXP:500,bankedXP:800};
  const player={level:5,xp:0,totalXp:5000,pendingLevels:1,skills:["v142-stat-luck"],rpgStats:{luck:8}};
  const penalty=PGR.applyDeathPenalty(player,1000,run);
  assert.equal(player.pendingLevels,0);
  assert.equal(penalty.progressionRecovery.lostPendingLevel,true);
  const cache={xp:100,progressionRecovery:JSON.parse(JSON.stringify(penalty.progressionRecovery))};
  const recovered=PGR.recoverDeathCache(player,run,cache);
  assert.equal(player.level,5);
  assert.equal(player.pendingLevels,1,"recovering the cache must return the unused level entitlement");
  assert.equal(recovered.pendingLevelRestored,true);
}


{
  const context=contextFor({lostSkill:true}),PGR=context.window.CCGProgression;
  const run={floorXP:500,bankedXP:800};
  const player={level:5,xp:0,totalXp:5000,pendingLevels:0,skills:["v142-stat-might"],rpgStats:{might:7},damageBonus:2};
  const penalty=PGR.applyDeathPenalty(player,1000,run);
  const cache={xp:100,progressionRecovery:JSON.parse(JSON.stringify(penalty.progressionRecovery))};

  // The player earns level 5 again and spends its replacement attribute before
  // returning to the old cache. Cached XP may still be recovered, but the old
  // entitlement must not be awarded a second time.
  player.level=5;
  player.xp=0;
  player.pendingLevels=0;
  player.skills=["v142-stat-might"];
  player.rpgStats.might=7;
  player.damageBonus=2;

  const recovered=PGR.recoverDeathCache(player,run,cache);
  assert.equal(player.level,5);
  assert.equal(player.pendingLevels,0,"cache pickup must not create another entitlement after the level was re-earned and spent");
  assert.equal(player.skills.filter(id=>id==="v142-stat-might").length,1,"the recovered cache must not duplicate the spent RPG skill");
  assert.equal(player.rpgStats.might,7);
  assert.equal(player.damageBonus,2);
  assert.equal(recovered.restoredLevel,false);
  assert.equal(recovered.restoredSkill,"");
  assert.equal(recovered.pendingLevelRestored,false);
}

{
  const context=contextFor({lostSkill:false,lostPending:true}),PGR=context.window.CCGProgression;
  const run={floorXP:500,bankedXP:800};
  const player={level:5,xp:0,totalXp:5000,pendingLevels:1,skills:["v142-stat-luck"],rpgStats:{luck:8}};
  const penalty=PGR.applyDeathPenalty(player,1000,run);
  const cache={xp:100,progressionRecovery:JSON.parse(JSON.stringify(penalty.progressionRecovery))};

  // Re-earn the lost level before cache recovery. The new level already owns
  // one pending choice; the cache must not manufacture a second choice.
  player.level=5;
  player.xp=0;
  player.pendingLevels=1;

  const recovered=PGR.recoverDeathCache(player,run,cache);
  assert.equal(player.pendingLevels,1,"re-earned unused level entitlement must not be doubled by cache recovery");
  assert.equal(recovered.restoredLevel,false);
  assert.equal(recovered.pendingLevelRestored,false);
}

assert.equal(version.build,"V10.42 r83");
assert.equal(version.cacheToken,"20260930r83");
console.log("Dungeon R83 recoverable XP/level/stat death-cache contract passed.");