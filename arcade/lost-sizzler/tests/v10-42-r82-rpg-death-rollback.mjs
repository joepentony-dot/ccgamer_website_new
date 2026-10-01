import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const source=read("js/v10-42-r82-rpg-death-rollback.js");
const bootstrap=read("js/v10-42-bootstrap.js");
const version=JSON.parse(read("version.json"));

assert.equal(version.build,"V10.42 r84");
assert.equal(version.cacheToken,"20261001r84");
assert.match(bootstrap,/v10-42-r80-wearable-equipment\.js[\s\S]*v10-42-r82-rpg-death-rollback\.js[\s\S]*v10-42-r72-map-death-feedback\.js/,"R82 rollback must load after current RPG/equipment composition and before death presentation");
assert.match(source,/PGR\.applyDeathPenalty=function r82ApplyDeathPenalty/,"R82 must wrap the canonical exported death penalty");
assert.match(source,/lostId\.startsWith\("v142-stat-"\)/,"R82 must only own RPG-stat history entries");
assert.match(source,/player\.rpgStats\[id\]=after/,"R82 must actually decrement the lost RPG attribute");
assert.match(source,/player\.damageBonus=Math\.max/,"Might rollback must reverse threshold damage");
assert.match(source,/player\.maxHealth=Math\.max/,"Vitality rollback must reverse persistent max health");
assert.match(source,/player\.moveMultiplier=Math\.max/,"Agility rollback must reverse movement multipliers");
assert.match(source,/player\._v105Base\.moveMultiplier/,"Agility rollback must update the collectible-effect movement baseline so active effects cannot restore lost Agility");
assert.match(source,/player\._cursedCartridge\.oldMoveMultiplier/,"Agility rollback must update the Cursed Cartridge movement snapshot");
assert.match(source,/player\.maxMana=Math\.max\(1,/,"Endurance rollback must subtract only its own contribution instead of clamping away other ammo modifiers");
assert.match(source,/player\._cursedCartridge\.oldMaxMana/,"Endurance rollback must update the Cursed Cartridge ammo snapshot");
assert.match(source,/recomputeArcana\(player,after\)/,"Arcana rollback must recompute its persistent alchemy/Ward state");
assert.match(source,/delete ledger\[id\]/,"crossing below a level-10 threshold must clear the specialisation ledger");

const makeContext=()=>{
  const PGR={
    applyDeathPenalty(player,score){
      player.level=Math.max(1,(player.level||2)-1);
      if((player.pendingLevels||0)>0){player.pendingLevels--;return{score,levelLost:true,lostSkill:"Unused level-up"}}
      player.skills=player.skills||[];
      player.skills.pop();
      return{score,levelLost:true,lostSkill:null}
    }
  };
  const context={
    console,Date,Math,Number,Boolean,
    window:{
      CCGProgression:PGR,
      CCG_CONFIG:{player:{maxHealth:5,maxMana:100},proceduralDungeon:{essenceRequired:3}}
    }
  };
  context.window.window=context.window;
  vm.createContext(context);
  vm.runInContext(source,context,{filename:"v10-42-r82-rpg-death-rollback.js"});
  return context
};

{
  const context=makeContext(),PGR=context.window.CCGProgression;
  const p={level:7,pendingLevels:0,skills:["v142-stat-might"],rpgStats:{might:7},damageBonus:3};
  const r=PGR.applyDeathPenalty(p,100,{});
  assert.equal(p.rpgStats.might,6);
  assert.equal(p.damageBonus,2);
  assert.equal(r.lostSkill,"MIGHT +1");
  assert.deepEqual(JSON.parse(JSON.stringify(r.rpgRollback)),{id:"might",before:7,after:6});
}

{
  const context=makeContext(),api=context.window.CCGLostSizzlerV142R82RpgDeathRollback;
  const p={rpgStats:{vitality:10},maxHealth:12,health:12,v142R23BuildMilestones:{vitality:10}};
  api.rollbackPoint(p,"vitality",10);
  assert.equal(p.rpgStats.vitality,9);
  assert.equal(p.maxHealth,9);
  assert.equal(p.health,9);
  assert.equal(p.v142R23BuildMilestones.vitality,undefined);
}

{
  const context=makeContext(),api=context.window.CCGLostSizzlerV142R82RpgDeathRollback;
  const pre=Math.pow(.97,5)*.95;
  const p={rpgStats:{agility:10},moveMultiplier:pre,dashDamage:2,v142R23BuildMilestones:{agility:10}};
  api.rollbackPoint(p,"agility",10);
  assert.ok(Math.abs(p.moveMultiplier-Math.pow(.97,4))<1e-9);
  assert.equal(p.dashDamage,1);
  assert.equal(p.v142R23BuildMilestones.agility,undefined);
}

{
  const context=makeContext(),api=context.window.CCGLostSizzlerV142R82RpgDeathRollback;
  const base=Math.pow(.97,5)*.95;
  const turbo=.58;
  const p={
    rpgStats:{agility:10},
    moveMultiplier:base*turbo,
    dashDamage:4,
    _v105Base:{moveMultiplier:base,dashDamage:2},
    _mysteryOldMove:base,
    _cursedCartridge:{oldMoveMultiplier:base,oldMaxMana:120},
    v142R23BuildMilestones:{agility:10}
  };
  api.rollbackPoint(p,"agility",10);
  const expected=Math.pow(.97,4);
  assert.ok(Math.abs(p.moveMultiplier-expected*turbo)<1e-9,"active Turbo/Nimble scaling must survive while the lost Agility contribution is removed");
  assert.ok(Math.abs(p._v105Base.moveMultiplier-expected)<1e-9,"collectible-effect base must lose the same Agility contribution");
  assert.equal(p._v105Base.dashDamage,1,"temporary effect base must also lose the AGI 10 dash specialisation");
  assert.ok(Math.abs(p._mysteryOldMove-expected)<1e-9,"mystery movement restoration snapshot must not resurrect lost Agility");
  assert.ok(Math.abs(p._cursedCartridge.oldMoveMultiplier-expected)<1e-9,"curse cleanse must not resurrect lost Agility");
  assert.equal(p.dashDamage,3);
}

{
  const context=makeContext(),api=context.window.CCGLostSizzlerV142R82RpgDeathRollback;
  const p={rpgStats:{endurance:10},maxMana:210,mana:210,v142R23BuildMilestones:{endurance:10}};
  api.rollbackPoint(p,"endurance",10);
  assert.equal(p.maxMana,156);
  assert.equal(p.mana,156);
  assert.equal(p.v142R23BuildMilestones.endurance,undefined);
}

{
  const context=makeContext(),api=context.window.CCGLostSizzlerV142R82RpgDeathRollback;
  const p={rpgStats:{endurance:6},maxMana:114,mana:114,relics:["hot-fire-button"]};
  api.rollbackPoint(p,"endurance",6);
  assert.equal(p.maxMana,100,"Hot Fire Button -20 modifier must remain after losing the +14 Endurance point");
  assert.equal(p.mana,100);
}

{
  const context=makeContext(),api=context.window.CCGLostSizzlerV142R82RpgDeathRollback;
  const p={
    rpgStats:{endurance:6},
    maxMana:102,
    mana:102,
    _cursedCartridge:{oldMoveMultiplier:1,oldMaxMana:114}
  };
  api.rollbackPoint(p,"endurance",6);
  assert.equal(p.maxMana,88,"active curse penalty must remain on the live maximum after Endurance rollback");
  assert.equal(p._cursedCartridge.oldMaxMana,100,"cleansing the curse later must restore the non-Endurance maximum, not the lost point");
  assert.equal(p.mana,88);
}

{
  const context=makeContext(),api=context.window.CCGLostSizzlerV142R82RpgDeathRollback;
  const p={rpgStats:{arcana:10},v142SightBonus:2,v142WardCooldownMs:18000,banishmentEssenceCost:2,relics:["cartographer-chip"],v142R23BuildMilestones:{arcana:10}};
  api.rollbackPoint(p,"arcana",10);
  assert.equal(p.rpgStats.arcana,9);
  assert.equal(p.v142SightBonus,1);
  assert.equal(p.v142WardCooldownMs,22800);
  assert.equal(p.banishmentEssenceCost,2);
  assert.equal(p.v142R23BuildMilestones.arcana,undefined);

  p.rpgStats.arcana=6;p.banishmentEssenceCost=2;p.v142WardCooldownMs=28200;
  api.rollbackPoint(p,"arcana",6);
  assert.equal(p.rpgStats.arcana,5);
  assert.equal(p.banishmentEssenceCost,3);
  assert.equal(p.v142WardCooldownMs,30000);
}

{
  const context=makeContext(),PGR=context.window.CCGProgression;
  const p={level:7,pendingLevels:1,skills:["v142-stat-luck"],rpgStats:{luck:8}};
  const r=PGR.applyDeathPenalty(p,100,{});
  assert.equal(p.rpgStats.luck,8,"unused level-up loss must not remove a previously spent RPG stat");
  assert.equal(p.skills.length,1);
  assert.equal(r.lostSkill,"Unused level-up");
}

console.log("Dungeon R82 RPG death rollback contract passed.");
