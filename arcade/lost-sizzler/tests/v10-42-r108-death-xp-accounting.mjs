import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const config=fs.readFileSync(new URL("../js/config.js",import.meta.url),"utf8");
const progression=fs.readFileSync(new URL("../js/progression.js",import.meta.url),"utf8");
const core=fs.readFileSync(new URL("../js/game-core.js",import.meta.url),"utf8");

const storage=new Map();
const localStorage={
  getItem:key=>storage.has(String(key))?storage.get(String(key)):null,
  setItem:(key,value)=>storage.set(String(key),String(value)),
  removeItem:key=>storage.delete(String(key))
};
const sandbox={console,window:{},localStorage,Date,Math};
vm.createContext(sandbox);
vm.runInContext(config,sandbox,{filename:"config.js"});
vm.runInContext(progression,sandbox,{filename:"progression.js"});
const P=sandbox.window.CCGProgression;

const basePlayer=()=>({
  id:"P1",level:3,xp:100,totalXp:P.xpNeed(1)+P.xpNeed(2)+100,xpDebt:0,everEarnedXp:true,
  pendingLevels:0,lostLevelProgression:[],skills:["health","damage"],
  health:9,maxHealth:9,mana:240,maxMana:240,armor:0,torchBonusMs:0,dashDamage:0,
  potionBonus:0,moveMultiplier:1,scavenger:0,damageBonus:1,inventory:[],inventorySlots:3
});
const baseRun=player=>({
  ...P.makeRun({difficulty:"ARCADE",seed:"R108-DEATH-XP"}),
  floor:1,floorXP:player.totalXp,bankedXP:0,everEarnedXp:true,xpPeak:player.totalXp
});

{
  const player=basePlayer(),run=baseRun(player),beforeTotal=player.totalXp;
  const penalty=P.applyDeathPenalty(player,1000,run);
  assert.equal(penalty.levelLost,true,"death must remove the current level when XP falls below its threshold");
  assert.equal(penalty.levelBefore,3);
  assert.equal(penalty.levelAfter,2);
  assert.equal(player.level,2);
  assert.equal(player.damageBonus,0,"the attribute gain from the lost level must be undone immediately");
  assert.deepEqual(player.skills,["health"],"the lost level's selected skill must be removed");
  assert.equal(player.totalXp,beforeTotal-penalty.xpLost,"death must deduct XP immediately");
  assert.equal(player.lostLevelProgression.length,1,"lost level progression must remain recoverable by earning XP again");
  assert.equal(player.lostLevelProgression[0].targetLevel,3);
  assert.equal(player.lostLevelProgression[0].skillId,"damage");

  const toThreshold=P.xpNeed(2)-player.xp;
  const almost=P.gainXP(player,run,toThreshold-1,"threshold guard");
  assert.equal(player.level,2,"level must not return before crossing the threshold");
  assert.equal(player.damageBonus,0,"lost attribute must remain removed below the threshold");
  assert.equal(almost.restoredProgression.length,0);

  const crossing=P.gainXP(player,run,1,"threshold crossing");
  assert.equal(player.level,3,"crossing the threshold must restore the lost level");
  assert.equal(player.damageBonus,1,"crossing the threshold must restore the exact lost level attribute");
  assert.deepEqual(player.skills,["health","damage"]);
  assert.equal(player.pendingLevels,0,"restoring a previously selected level skill must not create an extra level-up choice");
  assert.equal(player.lostLevelProgression.length,0,"restored progression must be consumed exactly once");
  assert.equal(crossing.restoredProgression[0].skillId,"damage");
}

{
  const player=basePlayer(),run=baseRun(player),beforeTotal=player.totalXp,beforeDamage=player.damageBonus;
  const penalty=P.applyDeathPenalty(player,1000,run);
  const cache={active:true,inventory:[],games:[],score:0,xp:penalty.xpLost,progressionRecovery:penalty.progressionRecovery};
  const recovered=P.recoverDeathCache(player,run,cache);
  assert.equal(recovered.xp,penalty.xpLost,"death cache must restore exactly the XP actually lost");
  assert.equal(recovered.xpDiscarded,0);
  assert.equal(player.totalXp,beforeTotal,"recovering the untouched death cache must restore the pre-death XP total");
  assert.equal(player.level,3);
  assert.equal(player.damageBonus,beforeDamage,"death cache recovery must restore the lost level-derived attribute");
  assert.equal(recovered.progressionRecovered,true);
  assert.equal(recovered.restoredSkill,"Hot Fire Button");
  assert.equal(cache.xp,0,"recovered XP must be consumed from the cache");
  assert.equal(cache.active,false,"an otherwise empty recovered cache must be exhausted");

  const afterFirst=player.totalXp;
  const duplicate=P.recoverDeathCache(player,run,cache);
  assert.equal(duplicate.xp,0,"an exhausted death cache must never restore XP twice");
  assert.equal(player.totalXp,afterFirst,"re-reading an exhausted cache must not duplicate XP");

  const penalty2=P.applyDeathPenalty(player,1000,run);
  const cache2={active:true,inventory:[],games:[],score:0,xp:penalty2.xpLost,progressionRecovery:penalty2.progressionRecovery};
  P.recoverDeathCache(player,run,cache2);
  assert.equal(player.totalXp,beforeTotal,"repeated die/recover loops must have zero net XP gain");
  assert.equal(player.damageBonus,beforeDamage,"repeated die/recover loops must not stack level-derived attributes");
  assert.equal(player.skills.filter(id=>id==="damage").length,1,"restoration must not duplicate the recovered skill");
}

{
  const player={
    ...basePlayer(),level:2,xp:0,totalXp:P.xpNeed(1),pendingLevels:1,skills:[],
    maxHealth:8,health:8,damageBonus:0
  };
  const run=baseRun(player);
  const penalty=P.applyDeathPenalty(player,0,run);
  assert.equal(player.level,1);
  assert.equal(player.pendingLevels,0,"an unused level entitlement must be removed with the lost level");
  assert.equal(penalty.progressionRecovery.pendingOnly,true);
  const needed=P.xpNeed(1)-player.xp;
  P.gainXP(player,run,needed,"re-earn unused level");
  assert.equal(player.level,2);
  assert.equal(player.pendingLevels,1,"crossing the threshold again must restore the unused level entitlement exactly once");
  assert.equal(player.lostLevelProgression.length,0);
}

assert.match(core,/pendingLevels:0,lostLevelProgression:\[\]/,"new players must initialise the lost-level restoration queue");
assert.match(core,/"pendingLevels","lostLevelProgression","inventory"/,"floor transitions must preserve lost-level restoration state");
assert.doesNotMatch(progression,/reservedXP/,"death-cache recovery must not directly inject reserved XP outside normal progression");

console.log("Dungeon Carnage R108 death XP, level rollback, attribute restoration and no-duplication contract passed.");
