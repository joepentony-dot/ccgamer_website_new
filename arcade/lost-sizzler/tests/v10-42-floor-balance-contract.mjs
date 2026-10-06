import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-floor-balance.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-41-r30-buglog.js'),'utf8');
const bootstrap=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-bootstrap.js'),'utf8');
const config=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/config.js'),'utf8');
const localRuntime=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/game-local-runtime.js'),'utf8');
const gamePlay=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/game-play.js'),'utf8');
const systemsSource=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/systems.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const systems={decorate(_world,host){return host}};
const sandbox={
  window:{
    CCG_CONFIG:{maxFloors:15},
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
assert(loader.includes('v10-42-bootstrap.js'),'Canonical late loader must hand V10.42 activation to the ordered bootstrap.');
assert(bootstrap.includes('v10-42-floor-balance.js'),'Authoritative V10.42 bootstrap must activate progressive combat balance.');
assert(bootstrap.indexOf('v10-42-five-depth-campaign.js')<bootstrap.indexOf('v10-42-floor-balance.js'),'Five-depth campaign state must exist before the floor-balance wrapper installs.');
assert(bootstrap.indexOf('v10-42-floor-balance.js')<bootstrap.indexOf('v10-42-tutorial-campaign.js'),'Floor combat balance must install before presentation-only Tutorial copy.');
assert(bootstrap.indexOf('v10-42-floor-balance.js')<bootstrap.indexOf('v10-42-zero-server-release.js'),'Floor combat balance must install before the production release-policy guard.');
assert(bootstrap.indexOf('v10-42-floor-balance.js')<bootstrap.indexOf('v10-42-r1-stability.js'),'Floor combat balance must install before final V10.42 stability protection.');
assert(config.includes('CASUAL:{enemyHp:.68,enemyDamage:.55,enemyTempo:.72,enemyPopulation:.70,damageGraceMs:1350,loot:1.25,ammo:1.4,stalker:.68}'),'Casual must materially reduce HP, damage, attack tempo and roaming population while extending the damage grace window.');
assert(systemsSource.includes('const populationScale=Math.max(.5,Math.min(1,Number(diff.enemyPopulation??1)))'),'Dungeon decoration must apply the selected difficulty population scale.');
assert(systemsSource.includes('!e.follower&&!e.guardian&&!e.champion&&!e.deathStalker&&!e.voidStalker&&!e.spider&&!e.skeleton&&!e.furnitureEnemy'),'Population scaling must preserve named, objective and authored special encounters.');
assert(systemsSource.includes('host.v142DifficultyPopulation'),'Runtime diagnostics must expose the applied Casual crowd reduction.');
assert(localRuntime.includes('Number(dt||0)*tempo'),'Authoritative enemy AI must apply the difficulty enemyTempo multiplier.');
assert(gamePlay.includes('PGR.difficulty(run)?.damageGraceMs||800'),'Player damage recovery must honour the longer Casual damage grace window.');

const expectedDamage=[.80,.84,.88,.92,.96,1.00,1.04,1.08,1.12,1.16,1.20,1.23,1.26,1.29,1.32];
for(let floor=1;floor<=15;floor++){
  assert(Math.abs(api.damageFor({floor})-expectedDamage[floor-1])<1e-9,`Floor ${floor} damage scale changed unexpectedly.`);
}
for(let floor=2;floor<=15;floor++){
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
api.applyCombatBalance(midpoint,{floor:6});
assert(midpoint.enemies[0].damageScale===1,'Floor 6 must be the stabilized baseline combat damage point.');

const finalNamed={enemies:[makeEnemy({id:'boss',kind:'champion',hp:20,maxHp:20,armor:4,maxArmor:4,champion:true})]};
api.applyCombatBalance(finalNamed,{floor:15});
const boss=finalNamed.enemies[0];
assert(boss.damageScale>1.6,'Named Floor 15 threats must gain a controlled extra damage multiplier beyond ordinary enemies.');
assert(boss.maxHp===22,'Named Floor 15 threats should gain only a controlled 10% HP finalizer, not turn into extreme HP sponges.');
assert(boss.maxArmor===5,'Named Floor 15 threats should receive one additional armour point.');
assert(finalNamed.v142CombatBalance.floor===15,'Runtime diagnostics must expose the active combat-balance floor.');

console.log('Lost Sizzler V10.42 progressive floor combat balance contract passed through the ordered bootstrap.');