import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../../../..');
const read=relative=>fs.readFileSync(path.join(repo,relative),'utf8');
const patch=read('games/ccg-games/cheeky-commodore-quest/js/lost-sizzler-playlist-audio.js');
const continuity=read('games/ccg-games/cheeky-commodore-quest/js/v10-7-continuous-exploration.js');
const core=read('games/ccg-games/cheeky-commodore-quest/js/game-core.js');
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

// game-core.js intentionally snapshots window.CCGSound into S before the late
// playlist layer loads. The playlist layer therefore MUST mutate that original
// object in place; replacing window.CCGSound creates a silent stale reference.
assert(core.includes('S=window.CCGSound'),'Game core no longer exposes the expected cached sound binding.');
assert(patch.includes('const original={'),'Playlist patch must snapshot the base audio methods before overriding them.');
assert(patch.includes('Object.assign(base,{'),'Playlist patch must mutate the cached CCGSound object in place.');
assert(patch.includes('window.CCGSound=base'),'Playlist patch must retain the original CCGSound object identity.');
assert(!patch.includes('window.CCGSound={\n    ...base'),'Playlist patch must not replace the cached CCGSound object.');
assert(patch.includes('original.stopMusic?.()'),'Playlist wrapper must call the captured base stop method without recursion.');
assert(patch.includes('original.toggle'),'Playlist wrapper must call the captured base toggle method without recursion.');

// Ordinary room themes and corridors must all remain the same Exploration state.
// Only genuine special-room flags may change room-based music; named enemies and
// Count Loadula continue to override through their separate encounter logic.
assert(owner.includes('v10-7-continuous-exploration.js'),'Continuous exploration guard is not loaded by the game.');
assert(continuity.includes('if(room.sanctuary)return "sanctuary"'),'Sanctuary rooms must retain their dedicated music state.');
assert(continuity.includes('if(room.dangerous)return "danger"'),'Danger/combat rooms must retain their dedicated music state.');
assert(continuity.includes('return "normal";'),'Ordinary rooms and corridors must resolve to Exploration.');
assert(continuity.includes('roomMoodFor=continuousRoomMoodFor'),'Continuous exploration guard must replace the legacy room-theme music map.');
for(const legacy of ['C64_ARCHIVE','1541_WORKSHOP','BUDGET_BIN','DEMO_LOUNGE','ARMOURY','CPU_KITCHEN','SID_REACTOR','WARP_GALLERY','ZZAP_LIBRARY','TAPE_STORE','CARTRIDGE_BAY','CRACKED_INTRO','PIXEL_FOUNDRY','MODEM_EXCHANGE','HIGH_SCORE_CRYPT','CRT_MAZE','TREASURE_VAULT']){
  assert(!continuity.includes(legacy),`Legacy area music state ${legacy} must not return in the continuity guard.`);
}

console.log('Lost Sizzler multi-track playlist contract passed.');
