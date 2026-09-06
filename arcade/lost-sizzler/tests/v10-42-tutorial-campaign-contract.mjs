import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-tutorial-campaign.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-41-r30-buglog.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

assert(loader.includes('v10-42-tutorial-campaign.js'),'Canonical V10.42 loader must activate the campaign-aware Tutorial layer.');
assert(source.includes('without rewriting the stabilized training runtime'),'V10.42 Tutorial work must remain a presentation layer over the stabilized training mechanics.');
assert(source.includes('THE FIVE-DEPTH CAMPAIGN'),'Tutorial must explain the five-depth campaign.');
for(const name of ['The Threshold','Iron Keep','Moss Crypt','Ember Depths','Sigil Sanctum'])assert(source.includes(name),`Tutorial must name ${name}.`);
for(const key of ['Iron','Bone','Ash'])assert(source.includes(key),`Tutorial must explain the ${key} campaign Key.`);
for(const stat of ['Might','Vitality','Agility','Endurance','Luck','Arcana'])assert(source.includes(stat),`Tutorial must explain RPG attribute ${stat}.`);
assert(source.includes('Banishment Essence'),'Tutorial must teach the V10.42 Banishment Essence system.');
assert(source.includes('persistent Vessel'),'Tutorial must explain that the Banishment Vessel persists through the run.');
assert(source.includes('A–Z rescue deck'),'Tutorial must teach the campaign-wide A–Z C64 rescue deck.');
assert(source.includes('relic choices'),'Tutorial must mention post-domain relic choices.');
assert(source.includes('artefact-for-Flask loop is replaced'),'Tutorial must explicitly supersede the retired artefact-for-Flask progression.');
assert(source.includes('Floor 1 gives you more reaction time; Floor 5 expects a developed character'),'Tutorial must communicate progressive enemy pressure instead of implying flat difficulty.');
assert(source.includes('if(banner.dataset.v142CampaignCopy==="true")return true'),'Completion banner patch must be idempotent to avoid MutationObserver feedback loops.');
assert(!source.includes('label.textContent="FREE INTRODUCTION COMPLETE"'),'Campaign copy must preserve the established TUTORIAL COMPLETE banner signal used by the paywall handoff.');
assert(!/\bgrid\.innerHTML\s*=/.test(source),'V10.42 campaign copy must never assign new HTML to the stabilized information-tour grid; its live child nodes carry HUD highlight ownership.');
assert(!/querySelector\(["']\.tour-grid["']\)\.innerHTML\s*=/.test(source),'V10.42 campaign copy must never rebuild the stabilized information-tour grid through a direct selector assignment.');
assert(source.includes('interactive tour DOM intact'),'V10.42 Tutorial source must document the live-node preservation boundary that protects lesson 5 highlighting.');
assert(source.includes('window.CCGLostSizzlerV142TutorialCampaign=Object.freeze'),'Tutorial campaign layer must expose a stable diagnostic API.');

console.log('Lost Sizzler V10.42 campaign-aware Tutorial contract passed with live information-tour node preservation.');
