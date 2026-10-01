import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-tutorial-campaign.js'),'utf8');
const onboarding=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-20-onboarding-safety.js'),'utf8');
const guidance=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-23-tutorial-guidance.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-41-r30-buglog.js'),'utf8');
const bootstrap=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-bootstrap.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

assert(loader.includes('v10-42-bootstrap.js'),'Canonical late loader must hand V10.42 activation to the ordered bootstrap.');
assert(bootstrap.includes('v10-42-tutorial-campaign.js'),'Authoritative V10.42 bootstrap must activate the campaign-aware Tutorial layer.');
assert(source.includes('without rewriting the stabilized training runtime'),'Tutorial refresh must remain a presentation/content layer over the stabilized Training Archive runtime.');

for(const stale of [
  'THE FIVE-DEPTH CAMPAIGN',
  'The full adventure spans five procedural depths',
  'Floor 5 expects a developed character',
  'across all five depths',
  'final-depth objective after all three Keys'
])assert(!source.includes(stale),`Tutorial must not revive retired five-floor campaign teaching: ${stale}`);

assert(onboarding.includes('ATTACK & THE EVOLVING FIREARM'),'Interactive attack lesson must introduce the evolving firearm model.');
assert(onboarding.includes('first weapon pickup unlocks Tier 1 Field Pulse'),'Tutorial must explain how the firearm is acquired.');
assert(onboarding.includes('Every later WEAPON UPGRADED event evolves that same firearm'),'Tutorial must explain single-weapon upgrade semantics.');
assert(onboarding.includes('EQUIPMENT & INVENTORY'),'Tutorial must teach the new equipment/inventory surface.');
for(const slot of ['Head','Body','Hands','Boots','Trinket'])assert(onboarding.includes(slot),`Tutorial must name wearable slot ${slot}.`);
assert(onboarding.includes('A normal death stops on YOU DIED until you confirm it'),'Tutorial must explain persistent death acknowledgement.');
assert(onboarding.includes('one death cache'),'Tutorial must explain exact-one death-cache recovery ownership.');
assert(onboarding.includes('weapon caches upgrade the single evolving firearm'),'Tutorial must reject obsolete separate-weapon cache semantics.');
assert(onboarding.includes('SHOPS, SANCTUARY & SPECIAL OPPORTUNITIES'),'Tutorial must teach shops and Sanctuary as core discovered services.');
assert(onboarding.includes('Sanctuary rooms are challenge-free refuges'),'Tutorial must explain Sanctuary safety.');
assert(onboarding.includes('You Are Ready To Take On The Adventure!'),'Established completion signal must remain present.');

assert(guidance.includes('SANCTUARY","Green cross only after discovery'),'Information tour must teach discovered-only Sanctuary map semantics.');
assert(guidance.includes('WEAPON CACHE","Evolves the current Field Pulse'),'Information tour must teach weapon-cache evolution.');
assert(guidance.includes('DEATH CACHE","Recover lost XP/items before another death'),'Information tour must teach death-cache recovery.');
assert(guidance.includes('SHOP","Supplies, upgrades and useful services'),'Information tour must teach shop purpose without front-loading every service.');
assert(guidance.includes('You do not need to memorise every system before starting the run')||onboarding.includes('You do not need to memorise every system before starting the run'),'Tutorial philosophy must remain contextual rather than becoming a manual dump.');

for(const stat of ['Might','Vitality','Agility','Endurance','Luck','Arcana'])assert(source.includes(stat),`Tutorial must retain RPG attribute ${stat}.`);
assert(source.includes('Warden Corruption'),'Tutorial must teach Warden Corruption language.');
assert(source.includes('single Field Pulse weapon'),'Campaign copy must preserve the evolving-firearm model.');
assert(source.includes('death cache'),'Campaign copy must retain death/recovery language.');
assert(source.includes('Sanctuary is challenge-free'),'Campaign copy must explain current Sanctuary semantics.');

assert(source.includes('if(banner.dataset.v142CampaignCopy==="true")return true'),'Completion banner patch must be idempotent to avoid MutationObserver feedback loops.');
assert(!source.includes('label.textContent="FREE INTRODUCTION COMPLETE"'),'Campaign copy must preserve the established TUTORIAL COMPLETE banner signal used by the paywall handoff.');
assert(!/\bgrid\.innerHTML\s*=/.test(source),'Campaign copy must never assign new HTML to the stabilized information-tour grid; its live child nodes carry HUD highlight ownership.');
assert(!/querySelector\(["']\.tour-grid["']\)\.innerHTML\s*=/.test(source),'Campaign copy must never rebuild the stabilized information-tour grid through a direct selector assignment.');
assert(source.includes('interactive tour DOM intact'),'Tutorial source must document the live-node preservation boundary that protects lesson highlighting.');
assert(source.includes('window.CCGLostSizzlerV142TutorialCampaign=Object.freeze'),'Tutorial campaign layer must expose a stable diagnostic API.');

console.log('Dungeon Carnage current-system Tutorial contract passed with five-floor legacy teaching retired.');
