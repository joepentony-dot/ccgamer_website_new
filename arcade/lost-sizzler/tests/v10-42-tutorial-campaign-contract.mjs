import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-tutorial-campaign.js'),'utf8');
const guidance=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-23-tutorial-guidance.js'),'utf8');
const onboarding=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-20-onboarding-safety.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-41-r30-buglog.js'),'utf8');
const bootstrap=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-bootstrap.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

assert(loader.includes('v10-42-bootstrap.js'),'Canonical late loader must hand V10.42 activation to the ordered bootstrap.');
assert(bootstrap.includes('v10-42-tutorial-campaign.js'),'Authoritative V10.42 bootstrap must activate the campaign-aware Tutorial layer.');
assert(source.includes('without rewriting the stabilized training runtime'),'Tutorial refresh must remain a presentation layer over the stabilized Training Archive mechanics.');

assert(source.includes('CCG_CONFIG?.maxFloors'),'Tutorial campaign length must come from live configuration rather than a hard-coded five-floor assumption.');
assert(source.includes('campaignDepth'),'Tutorial presentation must retain the configured campaign depth for current/future floor expansion.');
assert(!source.includes('THE FIVE-DEPTH CAMPAIGN'),'Tutorial must not hard-code the retired five-depth presentation.');
assert(!source.includes('full five-depth campaign'),'Completion copy must not hard-code the retired five-depth presentation.');

for(const stat of ['Might','Vitality','Agility','Endurance','Luck','Arcana'])assert(source.includes(stat),`Tutorial must explain RPG attribute ${stat}.`);
for(const currentTerm of ['EVOLVING FIREARM','WEAPON UPGRADED','SANCTUARY','death cache','WARDEN'])assert(source.toUpperCase().includes(currentTerm.toUpperCase()),`Tutorial campaign layer must teach ${currentTerm}.`);

assert(onboarding.includes('ATTACK & EVOLVING FIREARM'),'hands-on FIRE lesson must introduce the one-weapon evolution model.');
assert(!onboarding.includes('SWING YOUR SWORD'),'hands-on FIRE lesson must not retain the retired sword-only teaching.');
assert(onboarding.includes('OPEN EQUIPMENT & INVENTORY'),'Training Archive must teach the current equipment/inventory surface.');
assert(onboarding.includes('OBJECTIVE, MAP & SANCTUARY'),'Training Archive must teach the discovered-map/Sanctuary language.');
assert(onboarding.includes('HEALTH, ARMOUR, DEATH & RECOVERY'),'Training Archive must teach persistent death/cache recovery.');
assert(onboarding.includes('DOORS, CHESTS & WEAPON CACHES'),'Training Archive must distinguish weapon caches from obsolete standalone-weapon loot.');
assert(onboarding.includes('ENEMIES, WARDENS & SPECIAL THREATS'),'Training Archive must teach Warden/special-threat identity.');
assert(onboarding.includes('SHOPS, SANCTUARY, SECRETS & EVENTS'),'Training Archive must teach discovered services and exploration.');

assert(guidance.includes('WEAPON UPGRADE'),'visual tour must show evolving-firearm progression.');
assert(guidance.includes('DEATH CACHE'),'visual tour must show death recovery.');
assert(guidance.includes('SANCTUARY'),'visual tour must show discovered Sanctuary.');
assert(guidance.includes('WARDEN'),'visual tour must show Warden identity.');
assert(!guidance.includes('Spend score or trade artefacts'),'visual tour must not teach the retired artefact-trade shop loop.');

assert(source.includes('if(banner.dataset.v142CampaignCopy==="true")return true'),'Completion banner patch must remain idempotent to avoid MutationObserver feedback loops.');
assert(!source.includes('label.textContent="FREE INTRODUCTION COMPLETE"'),'Campaign copy must preserve the established TUTORIAL COMPLETE banner signal.');
assert(!/\bgrid\.innerHTML\s*=/.test(source),'campaign copy must never assign new HTML to the stabilized information-tour grid; its live child nodes carry HUD highlight ownership.');
assert(!/querySelector\(["']\.tour-grid["']\)\.innerHTML\s*=/.test(source),'campaign copy must never rebuild the stabilized information-tour grid through a direct selector assignment.');
assert(source.includes('interactive tour DOM intact'),'Tutorial source must document the live-node preservation boundary that protects highlighting.');
assert(source.includes('window.CCGLostSizzlerV142TutorialCampaign=Object.freeze'),'Tutorial campaign layer must expose a stable diagnostic API.');

console.log('C64 Dungeon Carnage current-system Tutorial contract passed with dynamic campaign depth and preserved Training Archive ownership.');
