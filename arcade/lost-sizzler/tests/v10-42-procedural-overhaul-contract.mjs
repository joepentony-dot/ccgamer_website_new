import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const configSource=read('arcade/lost-sizzler/js/config.js');
const overhaulSource=read('arcade/lost-sizzler/js/v10-42-procedural-overhaul.js');
const campaignSource=read('arcade/lost-sizzler/js/v10-42-five-depth-campaign.js');
const loaderSource=read('arcade/lost-sizzler/js/v10-41-r30-buglog.js');
const bootstrapSource=read('arcade/lost-sizzler/js/v10-42-bootstrap.js');

const sandbox={window:{},console};
vm.runInNewContext(configSource,sandbox,{filename:'config.js'});
const config=sandbox.window.CCG_CONFIG;

/*
 * Engine-first configuration guard: reject invalid data before it can reach
 * procedural placement, AI timing, combat balance, or campaign progression.
 * Contract-only coverage; no runtime values or existing mechanics change.
 */
const positiveFinite=(value,label)=>assert(Number.isFinite(value)&&value>0,
  `${label} must be a positive finite number.`);
const naturalInteger=(value,label)=>assert(Number.isSafeInteger(value)&&value>=0,
  `${label} must be a non-negative integer.`);

naturalInteger(config.maxFloors,'Campaign floor count');
positiveFinite(config.worldWidth,'World width');
positiveFinite(config.worldHeight,'World height');
naturalInteger(config.dungeon?.minLeaf,'Minimum BSP leaf');
naturalInteger(config.dungeon?.maxLeaf,'Maximum BSP leaf');
assert(config.dungeon.minLeaf>0&&config.dungeon.minLeaf<=config.dungeon.maxLeaf,
  'BSP minimum leaf cannot exceed the maximum leaf.');
naturalInteger(config.dungeon?.targetRooms,'Dungeon room target');
naturalInteger(config.dungeon?.sanctuaryRooms,'Sanctuary target');
assert(config.dungeon.sanctuaryRooms<config.dungeon.targetRooms,
  'Sanctuary allocation must leave ordinary rooms available.');
naturalInteger(config.player?.startingInventorySlots,'Starting inventory capacity');
naturalInteger(config.player?.inventorySlots,'Maximum inventory capacity');
assert(config.player.startingInventorySlots>=1&&
  config.player.startingInventorySlots<=config.player.inventorySlots,
  'Starting inventory must fit within the established maximum.');
for(const key of ['moveDelay','fireDelay','dashDelay','emergencyRechargeMs']){
  positiveFinite(config.player[key],`Player ${key}`);
}
for(const key of ['thinkDelay','lineOfSightRange','torchSightRange','searchTime']){
  positiveFinite(config.enemy[key],`Enemy ${key}`);
}
for(const [kind,delay] of Object.entries(config.enemy.chaseStep||{})){
  positiveFinite(delay,`Enemy chase cooldown ${kind}`);
}
for(const [kind,delay] of Object.entries(config.enemy.alertMemory||{})){
  positiveFinite(delay,`Enemy detection memory ${kind}`);
}
assert(Array.isArray(config.levelCaps)&&config.levelCaps.length===config.maxFloors&&
  config.levelCaps.every((cap,index)=>Number.isSafeInteger(cap)&&cap>0&&
    (index===0||cap>config.levelCaps[index-1])),
  'Campaign level caps must be positive, strictly increasing integers per floor.');

const campaignProfiles=config.proceduralDungeon?.campaignFloors;
assert(Array.isArray(campaignProfiles)&&campaignProfiles.length===config.maxFloors,
  'Campaign requires exactly one floor profile per floor.');
const recognisedThemes=new Set(config.roomThemes||[]);
assert(campaignProfiles.every((profile,index)=>profile.floor===index+1&&
  recognisedThemes.has(profile.theme)&&typeof profile.id==='string'&&profile.id.length>0),
  'Every campaign profile needs a unique floor index and recognised renderer theme.');
for(const profile of campaignProfiles){
  for(const key of ['targetMinutes','hpScale','tempo','ammoTarget','stalkerDelayMs','deathStalkerSpeed']){
    positiveFinite(profile[key],`Floor ${profile.floor} ${key}`);
  }
}
for(const name of ['CASUAL','ARCADE','SIZZLER','GOLD MEDAL']){
  const mode=config.difficulty?.[name];
  assert(mode&&typeof mode==='object',`Missing ${name} difficulty profile.`);
  for(const key of ['enemyHp','enemyDamage','enemyTempo','enemyPopulation','loot','ammo','stalker']){
    positiveFinite(mode[key],`Difficulty ${name} ${key}`);
  }
  naturalInteger(mode.damageGraceMs,`Difficulty ${name} damage grace`);
}
for(const domain of config.proceduralDungeon.keyDomains||[]){
  assert(campaignProfiles.some(profile=>profile.floor===domain.floor&&profile.domain===domain.id),
    `Key domain ${domain.id} must be assigned to a matching campaign floor.`);
}

assert(config.maxFloors===15,'V10.42 must expose the full fifteen-floor campaign.');
assert(config.worldWidth>=128&&config.worldHeight>=84,'Each V10.42 floor must remain a substantial procedural dungeon.');
assert(config.dungeon?.targetRooms>=30,'Each campaign floor must target at least thirty generated rooms.');
assert(config.keyTarget===3,'The three-Key escape objective must remain intact.');
assert(config.proceduralDungeon?.enabled===true,'Procedural overhaul must be explicitly enabled in config.');
assert(config.proceduralDungeon?.targetRunMinutesMin>=135&&config.proceduralDungeon?.targetRunMinutesMax>=180,'Fifteen-floor campaign must advertise a substantially longer successful run.');
assert(config.proceduralDungeon?.campaignFloors?.length===15,'Fifteen campaign floor definitions are required.');
assert(config.proceduralDungeon.campaignFloors.map(row=>row.id).join(',')==='threshold,driveworks,iron,budget,cartridge,tapes,bone,demo,modem,sid,ash,foundry,scores,crt,citadel','Campaign floor order must remain the authored fifteen-floor progression.');
assert(config.proceduralDungeon?.keyDomains?.length===3,'Iron, Bone and Ash must be represented as three global Key domains.');
assert(new Set(config.proceduralDungeon.campaignFloors.map(row=>row.theme)).size===15,'Every campaign floor must have a distinct primary visual theme.');
assert(config.proceduralDungeon.campaignFloors[14].theme==='BLOOD_CITADEL','Floor 15 must use the danger-red Blood Citadel theme.');
assert(config.proceduralDungeon.keyDomains.map(row=>row.id).join(',')==='iron,bone,ash','Key domains must remain Iron, Bone and Ash.');
assert(config.proceduralDungeon.keyDomains.map(row=>row.floor).join(',')==='3,7,11','The three global Keys must be spaced across Floors 3, 7 and 11.');
assert(config.levelCaps?.join(',')==='5,10,15,20,25,30,35,40,45,50,55,60,65,70,75','RPG level caps must progress across all fifteen floors.');
assert(config.dungeon?.ammoPacks===12,'Baseline ammo supply must remain compatible with the stabilized finite-ammo contract.');

const floorBalance=config.proceduralDungeon.campaignFloors;
for(let i=1;i<floorBalance.length;i++){
  assert(floorBalance[i].hpScale>=floorBalance[i-1].hpScale,`Enemy durability must not decrease from Floor ${i} to Floor ${i+1}.`);
  assert(floorBalance[i].tempo>=floorBalance[i-1].tempo,`Enemy tempo must not decrease from Floor ${i} to Floor ${i+1}.`);
  assert(floorBalance[i].ammoTarget<=floorBalance[i-1].ammoTarget,`Spare ammunition must not increase from Floor ${i} to Floor ${i+1}.`);
  assert(floorBalance[i].stalkerDelayMs<=floorBalance[i-1].stalkerDelayMs,`Count Loadula pressure must not become later from Floor ${i} to Floor ${i+1}.`);
}
assert(floorBalance[0].stalkerDelayMs>=900000,'Floor 1 must provide a long introductory grace period before Count Loadula.');
assert(floorBalance[14].tempo>1&&floorBalance[14].hpScale>1.4,'Floor 15 must be materially harder than the opening campaign.');

const distribution=config.proceduralDungeon.pickupDistribution;
assert(Array.isArray(distribution)&&distribution.length===15,'A–Z pickups must be distributed across all fifteen floors.');
assert(distribution.reduce((sum,value)=>sum+Number(value||0),0)===26,'Exactly 26 A–Z collectible slots must exist across the full campaign.');

const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
for(const letter of letters){
  const bucket=config.c64LootByLetter?.[letter];
  assert(Array.isArray(bucket)&&bucket.length>0,`C64 collectible pool must contain at least one ${letter} title.`);
  assert(bucket.every(title=>typeof title==='string'&&title.trim()),`${letter} collectible titles must be non-empty strings.`);
}

for(const stat of ['might','vitality','agility','endurance','luck','arcana']){
  assert(overhaulSource.includes(`id:\"${stat}\"`),`RPG progression must define ${stat}.`);
}
assert(overhaulSource.includes('PROG.skillChoices=function'),'Level-up choices must be replaced by RPG attribute choices.');
assert(overhaulSource.includes('PROG.applySkill=function'),'RPG attribute upgrades must have concrete gameplay effects.');
assert(overhaulSource.includes('WORLD.createHostState=function'),'World host-state generation must be extended for Key domains and A-Z collectibles.');
assert(overhaulSource.includes('BANISHMENT ESSENCE'),'The Banishment Essence/Vessel economy must be present.');
assert(overhaulSource.includes('function floorEssenceState('),'Essence awards must be budgeted against supernatural threats on the current floor.');
assert(overhaulSource.includes('Math.min(2,(voidStalker?1:0)+(countActive?1:0))'),'A floor must fund at most its Death Stalker plus Count Loadula rather than unlimited Essence farming.');
assert(overhaulSource.includes('player.banishmentEssence=have+add'),'The Vessel must hold at most one Ward-Break Charge worth of Essence at a time.');
assert(overhaulSource.includes('state.awarded'),'Routine Essence awards must consume a persistent per-floor allowance.');
assert(overhaulSource.includes('if(awardEssence(player,1'),'Spent/dead Essence sources must only be consumed when the Vessel and floor budget can accept the reward.');
assert(overhaulSource.includes('offerRelic'),'Key-domain progression must provide relic choices.');
assert(overhaulSource.includes('beginEscape'),'Claiming the completed Sigil must start an explicit escape phase.');
assert(overhaulSource.includes('sigilReveal')&&overhaulSource.includes('sigilWard')&&overhaulSource.includes('sigilBind'),'Reveal, Ward and Bind Sigil powers must be represented.');
assert(overhaulSource.includes('CHARACTER ATTRIBUTES'),'The inventory must expose an RPG character sheet.');

assert(campaignSource.includes('floorPickupSlice'),'Campaign layer must slice the single A-Z deck across floors rather than respawning 26 games on every floor.');
assert(campaignSource.includes('configureDomainKey'),'Campaign layer must reduce Key floors to their single assigned global domain Key.');
assert(campaignSource.includes('globalKeyCount'),'Global Key progress must survive floor transitions.');
assert(campaignSource.includes('applyFloorBalance'),'Campaign layer must apply floor-specific enemy/resource balance.');
assert(campaignSource.includes('AI.stepEnemies=function'),'Enemy pursuit/combat tempo must scale through the campaign.');
assert(campaignSource.includes('authorizeInterimExit'),'Floors 1–14 must use progression stairs without falsely completing the final Sigil escape.');
assert(campaignSource.includes('15 PROCEDURAL FLOORS'),'Menu copy must expose the expanded fifteen-floor campaign.');

assert(loaderSource.includes('v10-42-bootstrap.js'),'Canonical late loader must hand V10.42 to the authoritative ordered bootstrap.');
assert(!loaderSource.includes('function loadV142ProceduralOverhaul'),'Legacy independent V10.42 module insertion must not remain active.');
assert(bootstrapSource.includes('v10-42-procedural-overhaul.js'),'Ordered bootstrap must activate the V10.42 RPG overhaul.');
assert(bootstrapSource.includes('v10-42-five-depth-campaign.js'),'Ordered bootstrap must activate the five-depth campaign layer.');
assert(bootstrapSource.includes('v10-42-r1-stability.js'),'Ordered bootstrap must finish with the V10.42 stability layer.');
assert(bootstrapSource.indexOf('v10-42-procedural-overhaul.js')<bootstrapSource.indexOf('v10-42-five-depth-campaign.js'),'Procedural overhaul must load before the campaign wrapper.');
assert(bootstrapSource.indexOf('v10-42-five-depth-campaign.js')<bootstrapSource.indexOf('v10-42-r1-stability.js'),'Stability layer must load after campaign wrappers are installed.');

console.log('Dungeon Carnage V10.42 fifteen-floor procedural RPG overhaul contract passed.');