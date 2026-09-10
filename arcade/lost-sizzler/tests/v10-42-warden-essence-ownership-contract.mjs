import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../js/v10-42-warden-purpose-overhaul.js",import.meta.url),"utf8");
let timer=null;
const p1={id:"p1",x:22,y:2,level:2,health:8,maxHealth:10,armor:1,mana:20,maxMana:100,totalXp:0,banishmentEssence:0};
const p2={id:"p2",x:3,y:2,level:2,health:7,maxHealth:9,armor:1,mana:0,maxMana:100,totalXp:0,banishmentEssence:0};
const death={id:"death-stalker-test",x:4,y:2,alive:true,deathStalker:true,armor:3,maxArmor:3};
const pursuer={id:"ordinary-pursuer",x:5,y:2,alive:true,armor:2,moveCooldown:700};
const host={enemies:[death,pursuer],stalker:null,chests:[],timedRooms:[],revision:0};
const run={floor:3,alert:0,stats:{kills:0}};
const world={rooms:[null,{id:1,x:0,y:0,w:11,h:11,depth:6},{id:2,x:20,y:0,w:11,h:11,depth:7}]};
const roomAt=(w,x)=>Number(x)<12?1:Number(x)>=20?2:-1;
const context={
  console,
  window:{
    CCG_CONFIG:{stalker:{name:"Count Loadula",banishPromptDistance:8}},
    CCGProgression:{
      firstInventory:()=>-1,
      inventoryRemove:()=>false,
      inventoryKindCount:()=>0
    }
  },
  document:{querySelector:()=>null,querySelectorAll:()=>[]},
  performance:{now:()=>10000},
  setInterval:fn=>(timer=fn,1),clearInterval:()=>{},addEventListener:()=>{},
  host,run,world,p1,p2,mode:"playing",score:0,shake:0,
  localPlayers:()=>[p1,p2],
  P:{purple:"purple",gold:"gold",white:"white"},
  W:{roomAt},
  S:{sfx:()=>{},setStalkerNear:()=>{}},
  showToast:()=>{},broadcastWorld:()=>{},burst:()=>{},ring:()=>{},floatText:()=>{},
  isDeathStalkerEnemy:enemy=>Boolean(enemy?.deathStalker),
  damageEnemy:(enemy,power,element,attacker)=>{
    enemy.alive=false;
    context.score+=120;
    attacker.totalXp=(Number(attacker.totalXp)||0)+100;
    return true;
  },
  awardXP:(player,xp)=>{player.totalXp=(Number(player.totalXp)||0)+Number(xp||0);return player.totalXp}
};

vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-42-warden-purpose-overhaul.js"});

const api=context.window.CCGLostSizzlerV142WardenPurposeOverhaul;
assert.ok(api,"Warden purpose overhaul should install");
assert.equal(api.breakWard(death,p1),true,"P1 should be able to break the sealed Death Stalker ward");
assert.equal(death.v142WardBroken,true,"Ward Break should expose the Warden to normal combat");

context.damageEnemy(death,999,"energy",p2);

assert.equal(death.v142WardenDefeated,true,"P2 killing blow should still defeat the Warden");
assert.equal(context.score,7500,"Warden score should normalize to exactly 7,500 even when P2 gets the killing blow");
assert.equal(p2.totalXp,250,"Warden XP should normalize to exactly 250 on the actual killer");
assert.equal(p2.armor,3,"Combat recovery should grant +2 armour to the actual killer");
assert.equal(p2.mana,18,"Combat recovery should refill ammunition/mana on the actual killer");
assert.equal(p1.banishmentEssence,1,"The Warden Essence must go to P1, the campaign Ward-Break/alchemy owner");
assert.equal(p2.banishmentEssence,0,"A P2 killing blow must not strand Banishment Essence on a player who cannot spend it");
assert.equal(run.stats.wardenKills,1,"The Warden kill should be counted once");
assert.equal(host.chests.length,1,"The Warden kill should create exactly one high-tier cache");
assert.equal(host.chests[0].v142WardenSource,"death-stalker-test","The cache should remain bound to the defeated Warden");
assert.equal(host.v142WardenAftershock?.sourceId,"death-stalker-test","The Warden kill should still trigger its aftershock");
assert.equal(run.alert,82,"The Warden aftershock should raise alert to the configured floor");
assert.equal(typeof timer,"function","The normal Warden maintenance timer should still install");

timer();
assert.equal(pursuer.aiState,"chase","The Warden Aftershock should push an ordinary enemy into pursuit");
assert.deepEqual({x:pursuer.lastSeen?.x,y:pursuer.lastSeen?.y},{x:p2.x,y:p2.y},"A P2-room Aftershock pursuer should target P2 rather than remote P1");
assert.equal(pursuer.memoryMs,2800,"Aftershock pursuit should keep the existing pursuit-memory floor");
assert.equal(pursuer.moveCooldown,500,"Aftershock pursuit should keep the existing movement-pressure ceiling");

console.log("PASS v10-42 Warden P2 kill keeps operational Essence on P1 and Aftershock pursuit split-safe");
