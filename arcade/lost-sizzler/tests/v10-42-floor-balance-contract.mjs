import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-floor-balance.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-41-r30-buglog.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const systems={decorate(_world,host){return host}};
const sandbox={
  window:{
    CCG_CONFIG:{maxFloors:5},
    CCGSystems:systems,
    CCGLostSizzlerV142FiveDepthCampaign:{version:'V10.42'}
  },
  console,
  setInterval(){return 1},
  clearInterval(){},
  addEventListener(){}
};
vm.runInNewContext(source,sandbox,{filename:'v10-42-floor-balance.js'});
const api=sandbox.window.CCGLostSizzlerV142FloorBalance;
assert(api,'Progressive floor balance API must install.');
assert(loader.includes('v10-42-floor-balance.js'),'Canonical V10.42 loader must activate progressive combat balance.');

const expectedDamage=[.80,.90,1,1.10,1.20];
for(let floor=1;floor<=5;floor++){
  assert(Math.abs(api.damageFor({floor})-expectedDamage[floor-1])<1e-9,`Floor ${floor} damage scale changed unexpectedly.`);
}
for(let floor=2;floor<=5;floor++){
  assert(api.damageFor({floor})>=api.damageFor({floor:floor-1}),`Enemy damage must not decrease from Floor ${floor-1} to Floor ${floor}.`);
  assert(api.eliteFor({floor})>=api.eliteFor({floor:floor-1}),`Elite pressure must not decrease from Floor ${floor-1} to Floor ${floor}.`);
}

const makeEnemy=(overrides={})=>({id:'enemy',kind:'scout',hp:10,maxHp:10,alive:true,attackCooldown:500,damageScale:1,namedDamageScale:1,...overrides});
const opening={enemies:[makeEnemy({id:'opening',kind:'charger',chargeCooldown:300})]};
api.applyCombatBalance(opening,{floor:1});
assert(opening.enemies[0].damageScale===.8,'Floor 1 projectile damage must be reduced while the player learns the systems.');
assert(opening.enemies[0].namedDamageScale===.8,'Floor 1 melee damage must be reduced while the player learns the systems.');
assert(opening.enemies[0].attackCooldown>=700,'Floor 1 attacks need a minimum reaction window.');
assert(opening.enemies[0].chargeCooldown>=1200,'Floor 1 charger attacks need a longer telegraph window.');

const midpoint={enemies:[makeEnemy({id:'mid'})]};
api.applyCombatBalance(midpoint,{floor:3});
assert(midpoint.enemies[0].damageScale===1,'Floor 3 must be the stabilized baseline combat damage point.');

const finalNamed={enemies:[makeEnemy({id:'boss',kind:'champion',hp:20,maxHp:20,armor:4,maxArmor:4,champion:true})]};
api.applyCombatBalance(finalNamed,{floor:5});
const boss=finalNamed.enemies[0];
assert(boss.damageScale>1.2,'Named Floor 5 threats must gain a modest extra damage multiplier beyond ordinary enemies.');
assert(boss.maxHp===22,'Named Floor 5 threats should gain only a controlled 10% HP finalizer, not turn into extreme HP sponges.');
assert(boss.maxArmor===5,'Named Floor 5 threats should receive one additional armour point.');
assert(finalNamed.v142CombatBalance.floor===5,'Runtime diagnostics must expose the active combat-balance floor.');

console.log('Lost Sizzler V10.42 progressive floor combat balance contract passed.');