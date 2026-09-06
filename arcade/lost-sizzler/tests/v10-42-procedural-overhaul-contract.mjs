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
const loaderSource=read('arcade/lost-sizzler/js/v10-41-r30-buglog.js');

const sandbox={window:{},console};
vm.runInNewContext(configSource,sandbox,{filename:'config.js'});
const config=sandbox.window.CCG_CONFIG;

assert(config.maxFloors===1,'V10.42 must use one continuous procedural dungeon rather than the old five-floor run.');
assert(config.worldWidth>=160&&config.worldHeight>=104,'V10.42 dungeon must be materially larger than the stabilized five-floor map size.');
assert(config.keyTarget===3,'The three-Key escape objective must remain intact.');
assert(config.proceduralDungeon?.enabled===true,'Procedural overhaul must be explicitly enabled in config.');
assert(config.proceduralDungeon?.keyDomains?.length===3,'Iron, Bone and Ash must be represented as three Key domains.');
assert(config.proceduralDungeon.keyDomains.map(row=>row.id).join(',')==='iron,bone,ash','Key domains must remain Iron, Bone and Ash.');
assert(config.levelCaps?.[0]>=25,'The single dungeon must allow substantially deeper RPG levelling than old floor one.');

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
assert(overhaulSource.includes('v142AlphabetPickup:true'),'Generated C64 collectibles must carry the V10.42 A-Z marker.');
assert(overhaulSource.includes('BANISHMENT ESSENCE'),'The Banishment Essence/Vessel economy must be present.');
assert(overhaulSource.includes('offerRelic'),'Key-domain progression must provide relic choices.');
assert(overhaulSource.includes('beginEscape'),'Claiming the completed Sigil must start an explicit escape phase.');
assert(overhaulSource.includes('sigilReveal')&&overhaulSource.includes('sigilWard')&&overhaulSource.includes('sigilBind'),'Reveal, Ward and Bind Sigil powers must be represented.');
assert(overhaulSource.includes('CHARACTER ATTRIBUTES'),'The inventory must expose an RPG character sheet.');
assert(loaderSource.includes('v10-42-procedural-overhaul.js'),'The canonical game loader must activate V10.42 on the overhaul branch.');

console.log('Lost Sizzler V10.42 procedural RPG overhaul contract passed.');