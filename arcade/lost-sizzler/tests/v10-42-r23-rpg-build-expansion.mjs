import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-42-r23-rpg-build-expansion.js"),"utf8");

const body={dataset:{}};
globalThis.window=globalThis;
globalThis.document={body};
globalThis.CCGLostSizzlerV142ProceduralOverhaul={version:"V10.42"};
globalThis.CCGLostSizzlerModeRuntime={detect:()=>"dungeon-solo"};
globalThis.CCGLostSizzlerSpecialModes={active:null};

globalThis.CCGProgression={
  skillChoices(player){
    return ["vitality","agility","endurance","arcana","might","luck"].map(id=>({id:`v142-stat-${id}`,name:`${id.toUpperCase()} +1`,desc:`Raise ${id}.`}));
  },
  applySkill(player,id){
    if(!String(id).startsWith("v142-stat-"))return{id,name:id,desc:"base"};
    const statId=String(id).slice("v142-stat-".length),before=player.rpgStats[statId],after=before+1;player.rpgStats[statId]=after;
    if(statId==="vitality"){player.maxHealth+=1;player.health=Math.min(player.maxHealth,player.health+1)}
    if(statId==="agility")player.moveMultiplier*=.97;
    if(statId==="endurance"){player.maxMana+=14;player.mana=Math.min(player.maxMana,player.mana+14);player.armor=Math.min(12,player.armor+1)}
    if(statId==="arcana")player.v142WardCooldownMs=Math.max(14000,30000-(after-5)*1800);
    return{id,name:`${statId.toUpperCase()} ${after}`,desc:`${statId} increased to ${after}.`};
  }
};

globalThis.preservePlayer=function(old,x=0,y=0){
  return{...old,x,y,rpgStats:{...old.rpgStats},skills:[...(old.skills||[])]};
};

vm.runInThisContext(source,{filename:"v10-42-r23-rpg-build-expansion.js"});
const API=globalThis.CCGLostSizzlerV142R23RpgBuildExpansion;
assert.ok(API,"r23 RPG build expansion API must install.");
assert.equal(API.threshold,10,"The first specialization threshold must be stat 10.");
assert.deepEqual(Object.keys(API.definitions).sort(),["agility","arcana","endurance","vitality"],"Might and Luck must remain outside the first r23 specialization pass.");

function player(overrides={}){
  return{
    rpgStats:{might:5,vitality:9,agility:9,endurance:9,luck:5,arcana:9},
    maxHealth:8,health:5,maxMana:240,mana:120,armor:0,moveMultiplier:1,dashDamage:0,v142WardCooldownMs:22800,v142SightBonus:0,skills:[],
    ...overrides
  };
}

const preview=CCGProgression.skillChoices(player());
for(const id of ["vitality","agility","endurance","arcana"]){
  const choice=preview.find(row=>row.id===`v142-stat-${id}`);assert.ok(choice?.desc.includes("SPECIALISATION UNLOCKS NOW"),`${id} at 9 must preview its stat-10 specialization.`);
}
assert.equal(preview.find(row=>row.id==="v142-stat-might").desc,"Raise might.","Might choice copy must remain unchanged in r23.");
assert.equal(preview.find(row=>row.id==="v142-stat-luck").desc,"Raise luck.","Luck choice copy must remain unchanged in r23.");

const vitality=player();
const vitResult=CCGProgression.applySkill(vitality,"v142-stat-vitality");
assert.equal(vitality.rpgStats.vitality,10);
assert.equal(vitality.maxHealth,11,"Vitality 10 must include the normal +1 plus the +2 specialization bonus.");
assert.equal(vitality.health,8,"Vitality 10 must heal the normal +1 plus the +2 specialization heal without exceeding max health.");
assert.equal(vitality.v142R23BuildMilestones.vitality,10);
assert.match(vitResult.desc,/VITALITY SPECIALISATION UNLOCKED/);
API.reconcile(vitality);API.reconcile(vitality);
assert.equal(vitality.maxHealth,11,"Repeated reconciliation must not stack the Vitality specialization.");

const agility=player();
CCGProgression.applySkill(agility,"v142-stat-agility");
assert.equal(agility.rpgStats.agility,10);
assert.ok(Math.abs(agility.moveMultiplier-(.97*.95))<1e-12,"Agility 10 must retain the normal 3% improvement and add its 5% specialization improvement.");
assert.equal(agility.dashDamage,1,"Agility 10 must make dash contact deal one damage.");
API.reconcile(agility);
assert.equal(agility.dashDamage,1,"Repeated reconciliation must not stack dash damage.");

const endurance=player();
CCGProgression.applySkill(endurance,"v142-stat-endurance");
assert.equal(endurance.rpgStats.endurance,10);
assert.equal(endurance.maxMana,294,"Endurance 10 must include the normal +14 and specialization +40 maximum ammunition.");
assert.equal(endurance.mana,174,"Endurance 10 must refill the matching 54 ammunition when capacity permits.");
assert.equal(endurance.armor,3,"Endurance 10 must include the normal +1 and specialization +2 armour.");

const arcana=player();
CCGProgression.applySkill(arcana,"v142-stat-arcana");
assert.equal(arcana.rpgStats.arcana,10);
assert.equal(arcana.v142SightBonus,1,"Arcana 10 must add one permanent sight tile.");
assert.equal(arcana.v142WardCooldownMs,18000,"Arcana 10 must cap Ward recharge at 18 seconds.");
arcana.rpgStats.arcana=11;arcana.v142WardCooldownMs=19200;API.reconcile(arcana);
assert.equal(arcana.v142WardCooldownMs,18000,"Later Arcana increases must never make the unlocked Ward specialization worse.");
assert.equal(arcana.v142SightBonus,1,"Arcana reconciliation must not stack permanent sight.");

const legacy=player({rpgStats:{might:5,vitality:10,agility:5,endurance:5,luck:5,arcana:5},maxHealth:9,health:9});
assert.deepEqual(API.reconcile(legacy),["vitality"],"A legacy/current save at the threshold must receive its missing specialization once.");
assert.equal(legacy.maxHealth,11);
const preserved=preservePlayer(legacy,4,7);
assert.equal(preserved.maxHealth,11,"Floor preservation must not reapply an already-recorded specialization.");
assert.equal(preserved.v142R23BuildMilestones.vitality,10,"The r23 milestone ledger must survive floor preservation.");

body.dataset.specialMode="horde-survivor";
const horde=player();
CCGProgression.applySkill(horde,"v142-stat-vitality");
assert.equal(horde.rpgStats.vitality,10,"The underlying RPG wrapper may still process its existing stat choice.");
assert.equal(horde.maxHealth,9,"r23 must not add its specialization bonus inside Horde Survivor.");
assert.equal(horde.v142R23BuildMilestones,undefined,"r23 must not create milestone ownership inside Horde Survivor.");
body.dataset.specialMode="sizzler-saboteurs";
const spy=player();
CCGProgression.applySkill(spy,"v142-stat-agility");
assert.equal(spy.dashDamage,0,"r23 must not add its dash specialization inside Sizzler Saboteurs.");
assert.equal(spy.v142R23BuildMilestones,undefined,"r23 must not create milestone ownership inside Sizzler Saboteurs.");
body.dataset.specialMode="";

console.log("V10.42 r23 RPG build expansion contract passed.");