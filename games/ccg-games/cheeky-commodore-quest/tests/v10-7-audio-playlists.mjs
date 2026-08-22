import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../../../..');
const read=relative=>fs.readFileSync(path.join(repo,relative),'utf8');
const patch=read('games/ccg-games/cheeky-commodore-quest/js/lost-sizzler-playlist-audio.js');
const assets=read('games/ccg-games/cheeky-commodore-quest/js/audio-assets.js');
const overrides=read('games/ccg-games/cheeky-commodore-quest/js/admin-audio-overrides.js');
const owner=read('games/ccg-games/cheeky-commodore-quest/js/asset-overrides.js');
const admin=read('admin/js/arcade-assets.js');

const assert=(condition,message)=>{if(!condition)throw new Error(message);};
for(const state of ['normal','danger','sanctuary','named','stalker']){
  assert(assets.includes(`${state}:Object.freeze([`),`Bundled ${state} playlist is missing.`);
  assert(patch.includes(`"${state}"`),`Playlist patch does not recognise ${state}.`);
}
assert(patch.includes('const FADE_MS=2500'),'Crossfade must remain 2.5 seconds.');
assert(patch.includes('url!==last'),'Immediate-repeat protection is missing.');
assert(patch.includes('stalkerNear?"stalker":roomMood'),'Count Loadula must retain music priority.');
assert(owner.includes('lost-sizzler-playlist-audio.js'),'Playlist patch is not loaded by the game.');
assert(overrides.includes('key.startsWith(`${prefix}--`)'),'Admin playlist rows are not collected by category prefix.');
assert(admin.includes('lostSizzlerAutoPlaylist'),'Batch auto-categorisation slot is missing.');
assert(admin.includes('input.multiple=Boolean(slot.playlist)'),'Lost Sizzler category uploads must accept multiple files.');
assert(admin.includes(".from('arcade_assets').insert("),'Playlist uploads must append rows rather than replace a category.');
assert(admin.includes('/loadula|lodula|stalker|death/'),'Loadula and lodula filename variants must both be recognised.');
console.log('Lost Sizzler multi-track playlist contract passed.');
