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

assert(config.maxFloors===5,'V10.42 must retain a substantial five-depth campaign.');
assert(config.worldWidth>=128&&config.worldHeight>=84,'Each V10.42 floor must remain a substantial procedural dungeon.');
assert(config.dungeon?.targetRooms>=30,'Each campaign floor must target at least thirty generated rooms.');
assert(config.keyTarget===3,'The three-Key escape objective must remain intact.');
assert(config.proceduralDungeon?.enabled===true,'Procedural overhaul must be explicitly enabled in config.');
assert(config.proceduralDungeon?.targetRunMinutesMin>=55&&config.proceduralDungeon?.targetRunMinutesMax>=60,'Campaign must target roughly an hour-long successful run.');
assert(config.proceduralDungeon?.campaignFloors?.length===5,'Five campaign floor definitions are required.');
assert(config.proceduralDungeon.campaignFloors.map(row=>row.id).join(',')==='threshold,iron,bone,ash,sigil','Campaign floor order must remain Threshold, Iron, Bone, Ash, Sigil.');
assert(config.proceduralDungeon?.keyDomains?.length===3,'Iron, Bone and Ash must be represented as three global Key domains.');
assert(config.proceduralDungeon.keyDomains.map(row=>row.id).join(',')==='iron,bone,ash','Key domains must remain Iron, Bone and Ash.');
assert(config.proceduralDungeon.keyDomains.map(row=>row.floor).join(',')==='2,3,4','The three global Keys must be earned across Floors 2, 3 and 4.');
assert(config.levelCaps?.join(',')==='5,10,15,20,25','RPG level caps must progress across all five floors.');
assert(config.dungeon?.ammoPacks===12,'Baseline ammo supply must remain compatible with the stabilized finite-ammo contract.');

const floorBalance=config.proceduralDungeon.campaignFloors;
for(let i=1;i<floorBalance.length;i++){
  assert(floorBalance[i].hpScale>=floorBalance[i-1].hpScale,`Enemy durability must not decrease from Floor ${i} to Floor ${i+1}.`);
  assert(floorBalance[i].tempo>=floorBalance[i-1].tempo,`Enemy tempo must not decrease from Floor ${i} to Floor ${i+1}.`);
  assert(floorBalance[i].ammoTarget<=floorBalance[i-1].ammoTarget,`Spare ammunition must not increase from Floor ${i} to Floor ${i+1}.`);
  assert(floorBalance[i].stalkerDelayMs<=floorBalance[i-1].stalkerDelayMs,`Count Loadula pressure must not become later from Floor ${i} to Floor ${i+1}.`);
}
assert(floorBalance[0].stalkerDelayMs>=900000,'Floor 1 must provide a long introductory grace period before Count Loadula.');
assert(floorBalance[4].tempo>1&&floorBalance[4].hpScale>1,'Floor 5 must be materially harder than the baseline floor.');

const distribution=config.proceduralDungeon.pickupDistribution;
assert(Array.isArray(distribution)&&distribution.length===5,'A–Z pickups must be distributed across all five floors.');
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
assert(overhaulSource.includes('offerRelic'),'Key-domain progression must provide relic choices.');
assert(overhaulSource.includes('beginEscape'),'Claiming the completed Sigil must start an explicit escape phase.');
assert(overhaulSource.includes('sigilReveal')&&overhaulSource.includes('sigilWard')&&overhaulSource.includes('sigilBind'),'Reveal, Ward and Bind Sigil powers must be represented.');
assert(overhaulSource.includes('CHARACTER ATTRIBUTES'),'The inventory must expose an RPG character sheet.');

assert(campaignSource.includes('floorPickupSlice'),'Five-depth layer must slice the single A-Z deck across floors rather than respawning 26 games on every floor.');
assert(campaignSource.includes('configureDomainKey'),'Five-depth layer must reduce Key floors to their single assigned global domain Key.');
assert(campaignSource.includes('globalKeyCount'),'Global Key progress must survive floor transitions.');
assert(campaignSource.includes('applyFloorBalance'),'Five-depth layer must apply floor-specific enemy/resource balance.');
assert(campaignSource.includes('AI.stepEnemies=function'),'Enemy pursuit/combat tempo must scale through the campaign.');
assert(campaignSource.includes('authorizeInterimExit'),'Floors 1–4 must use progression stairs without falsely completing the final Sigil escape.');
assert(campaignSource.includes('55–75 minutes'),'Menu copy must describe the intended substantial campaign length.');

assert(loaderSource.includes('v10-42-bootstrap.js'),'Canonical late loader must hand V10.42 to the authoritative ordered bootstrap.');
assert(!loaderSource.includes('function loadV142ProceduralOverhaul'),'Legacy independent V10.42 module insertion must not remain active.');
assert(bootstrapSource.includes('v10-42-procedural-overhaul.js'),'Ordered bootstrap must activate the V10.42 RPG overhaul.');
assert(bootstrapSource.includes('v10-42-five-depth-campaign.js'),'Ordered bootstrap must activate the five-depth campaign layer.');
assert(bootstrapSource.includes('v10-42-r1-stability.js'),'Ordered bootstrap must finish with the V10.42 stability layer.');
assert(bootstrapSource.indexOf('v10-42-procedural-overhaul.js')<bootstrapSource.indexOf('v10-42-five-depth-campaign.js'),'Procedural overhaul must load before the five-depth campaign wrapper.');
assert(bootstrapSource.indexOf('v10-42-five-depth-campaign.js')<bootstrapSource.indexOf('v10-42-r1-stability.js'),'Stability layer must load after campaign wrappers are installed.');

console.log('Lost Sizzler V10.42 five-depth procedural RPG overhaul contract passed.');