import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
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

// Repeat Exploration requests caused by ordinary room/corridor boundaries must
// never advance the playlist. Rotation is allowed only when the current song
// naturally reaches its end or fails and the engine explicitly advances it.
assert(patch.includes('function transition(force=false,advance=false)'),'Playlist transition must distinguish forced refresh from natural track advance.');
assert(patch.includes('if(state==="normal"&&!advance){updateVolume();return}'),'Active Exploration must survive repeat normal-state requests unchanged.');
assert(patch.includes('transition(true,true)'),'Natural track completion must still be able to advance the playlist.');
assert(patch.includes('if(next==="normal"&&current?.state==="normal"&&!current.audio.paused)'),'Repeated corridor/ordinary-room Exploration state requests must be ignored.');
assert(patch.includes('name==="room"?undefined'),'Room-boundary audio cue must not interrupt the continuous Exploration soundtrack.');
assert(assets.includes('room:"assets/audio/sfx/room-enter.wav"'),'Room-enter asset remains documented even though boundary playback is suppressed.');

// Behavioural regression: actually execute the wrapper against a fake Audio
// implementation. Room -> corridor -> ordinary room must keep one Exploration
// audio instance. A real Danger transition is still allowed to create a new one.
class FakeAudio{
  static instances=[];
  constructor(url){this.url=url;this.paused=true;this.volume=0;this.currentTime=0;this.duration=180;this.listeners={};FakeAudio.instances.push(this)}
  play(){this.paused=false;return Promise.resolve()}
  pause(){this.paused=true}
  removeAttribute(){}
  load(){}
  addEventListener(name,fn){(this.listeners[name]||(this.listeners[name]=[])).push(fn)}
}
const sfxCalls=[];
const baseSound={
  start:async()=>true,
  startMusic:()=>{},
  stopMusic:()=>{},
  toggle:()=>true,
  isEnabled:()=>true,
  setDanger:()=>{},
  sfx:name=>sfxCalls.push(name),
  windWhistle:()=>{}
};
const fakeWindow={
  CCGSound:baseSound,
  CCG_AUDIO_ASSETS:{music:{
    normal:'explore-a.mp3',danger:'danger-a.mp3',sanctuary:'safe-a.mp3',named:'named-a.mp3',stalker:'loadula-a.mp3',
    playlists:{normal:['explore-a.mp3','explore-b.mp3'],danger:['danger-a.mp3'],sanctuary:['safe-a.mp3'],named:['named-a.mp3'],stalker:['loadula-a.mp3']}
  }},
  CCG_ASSET_OVERRIDES:{audio:{music:{playlists:{normal:[],danger:[],sanctuary:[],named:[],stalker:[]}}}},
  CCG_ADMIN_AUDIO:{},
  addEventListener:()=>{}
};
const sandbox={
  window:fakeWindow,
  Audio:FakeAudio,
  performance:{now:()=>0},
  setInterval:()=>1,
  clearInterval:()=>{},
  setTimeout:fn=>{fn();return 1},
  clearTimeout:()=>{},
  console
};
vm.runInNewContext(patch,sandbox,{filename:'lost-sizzler-playlist-audio.js'});
await fakeWindow.CCGSound.start();
await Promise.resolve();
assert(FakeAudio.instances.length===1,'Starting Exploration should create exactly one music instance.');
const firstExploration=FakeAudio.instances[0].url;
fakeWindow.CCGSound.setRoomMood('normal');
fakeWindow.CCGSound.setRoomMood('archive'); // legacy ordinary-room state normalises to Exploration
fakeWindow.CCGSound.setRoomMood('normal'); // corridor / ordinary-room boundary
assert(FakeAudio.instances.length===1,'Room/corridor Exploration requests must not create a replacement track.');
assert(FakeAudio.instances[0].url===firstExploration,'The current Exploration track must remain unchanged across corridors.');
fakeWindow.CCGSound.sfx('room');
assert(!sfxCalls.includes('room'),'Room-entry boundary cue must be suppressed.');
fakeWindow.CCGSound.sfx('pickup');
assert(sfxCalls.includes('pickup'),'Normal gameplay SFX must remain available.');
fakeWindow.CCGSound.setRoomMood('danger');
await Promise.resolve();
assert(FakeAudio.instances.length===2,'Danger must still be allowed to replace Exploration with its own theme.');
fakeWindow.CCGSound.setRoomMood('normal');
await Promise.resolve();
assert(FakeAudio.instances.length===3,'Returning from Danger must restore an Exploration theme.');
fakeWindow.CCGSound.setRoomMood('normal');
fakeWindow.CCGSound.setRoomMood('archive');
assert(FakeAudio.instances.length===3,'Further corridor/ordinary-room movement must keep the restored Exploration track.');

console.log('Lost Sizzler multi-track playlist contract passed.');