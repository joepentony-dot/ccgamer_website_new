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
// Only genuine special-room flags may change room-based music.
assert(owner.includes('v10-7-continuous-exploration.js'),'Continuous exploration guard is not loaded by the game.');
assert(continuity.includes('if(room.sanctuary)return "sanctuary"'),'Sanctuary rooms must retain their dedicated music state.');
assert(continuity.includes('if(room.dangerous)return "danger"'),'Danger/combat rooms must retain their dedicated music state.');
assert(continuity.includes('return "normal";'),'Ordinary rooms and corridors must resolve to Exploration.');
assert(continuity.includes('roomMoodFor=continuousRoomMoodFor'),'Continuous exploration guard must replace the legacy room-theme music map.');
for(const legacy of ['C64_ARCHIVE','1541_WORKSHOP','BUDGET_BIN','DEMO_LOUNGE','ARMOURY','CPU_KITCHEN','SID_REACTOR','WARP_GALLERY','ZZAP_LIBRARY','TAPE_STORE','CARTRIDGE_BAY','CRACKED_INTRO','PIXEL_FOUNDRY','MODEM_EXCHANGE','HIGH_SCORE_CRYPT','CRT_MAZE','TREASURE_VAULT']){
  assert(!continuity.includes(legacy),`Legacy area music state ${legacy} must not return in the continuity guard.`);
}

// Exploration is a persistent deck. Special themes may interrupt it, but the
// exact same Exploration Audio object and currentTime must resume afterwards.
// Only natural track completion/error may choose another Exploration song.
assert(patch.includes('let explorationSlot=null'),'Playlist must retain a persistent Exploration slot.');
assert(patch.includes('function parkExploration(slot)'),'Interrupted Exploration must be parked rather than destroyed.');
assert(patch.includes('function resumeExploration(previous)'),'Returning to Exploration must resume the parked track.');
assert(patch.includes('if(state==="normal"&&!advance)'),'Normal/corridor requests must take the persistent Exploration path.');
assert(patch.includes('if(explorationSlot&&resumeExploration(current))return'),'Special-theme exit must resume the existing Exploration slot.');
assert(patch.includes('transition(true,true)'),'Natural track completion must still advance the playlist.');
assert(patch.includes('setDanger:()=>{}'),'Legacy per-frame danger intensity must not control music.');
assert(patch.includes('name==="room"?undefined'),'Room-boundary audio cue must remain suppressed.');
assert(assets.includes('room:"assets/audio/sfx/room-enter.wav"'),'Room-enter asset remains documented even though boundary playback is suppressed.');
assert(patch.includes('stopImmediatePropagation'),'Admin music readiness must not trigger the old stop/start refresh listener.');
assert(patch.includes('failedUrls=new Set'),'Failed uploaded tracks must be quarantined for the current session.');
assert(patch.includes('return groups.bundled.filter'),'Bundled tracks must remain the fallback when custom uploads fail.');

// Behavioural regression against a fake browser Audio implementation.
class FakeAudio{
  static instances=[];
  constructor(url){
    this.url=url;
    this.paused=true;
    this.volume=0;
    this.currentTime=0;
    this.duration=180;
    this.listeners={};
    FakeAudio.instances.push(this);
  }
  play(){this.paused=false;return Promise.resolve()}
  pause(){this.paused=true}
  removeAttribute(){}
  load(){}
  addEventListener(name,fn){(this.listeners[name]||(this.listeners[name]=[])).push(fn)}
  emit(name){for(const fn of this.listeners[name]||[])fn()}
}
const sfxCalls=[];
let legacyDangerCalls=0;
const baseSound={
  start:async()=>true,
  startMusic:()=>{},
  stopMusic:()=>{},
  toggle:()=>true,
  isEnabled:()=>true,
  setDanger:()=>{legacyDangerCalls++},
  sfx:name=>sfxCalls.push(name),
  windWhistle:()=>{}
};
const eventListeners=new Map();
const fakeWindow={
  CCGSound:baseSound,
  CCG_AUDIO_ASSETS:{music:{
    normal:'explore-a.mp3',danger:'danger-a.mp3',sanctuary:'safe-a.mp3',named:'named-a.mp3',stalker:'loadula-a.mp3',
    playlists:{normal:['explore-a.mp3','explore-b.mp3'],danger:['danger-a.mp3'],sanctuary:['safe-a.mp3'],named:['named-a.mp3'],stalker:['loadula-a.mp3']}
  }},
  CCG_ASSET_OVERRIDES:{audio:{music:{playlists:{normal:[],danger:[],sanctuary:[],named:[],stalker:[]}}}},
  CCG_ADMIN_AUDIO:{},
  addEventListener(name,fn){
    if(!eventListeners.has(name))eventListeners.set(name,[]);
    eventListeners.get(name).push(fn);
  },
  dispatchEvent(event){
    for(const fn of eventListeners.get(event.type)||[]){
      fn(event);
      if(event.__stopped)break;
    }
  }
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
const firstExploration=FakeAudio.instances[0];
firstExploration.currentTime=47.25;

// Room -> corridor -> ordinary room: no replacement and no position reset.
fakeWindow.CCGSound.setRoomMood('normal');
fakeWindow.CCGSound.setRoomMood('archive');
fakeWindow.CCGSound.setRoomMood('normal');
await Promise.resolve();
assert(FakeAudio.instances.length===1,'Room/corridor Exploration requests must not create a replacement track.');
assert(FakeAudio.instances[0]===firstExploration,'Corridors must keep the exact same Exploration Audio object.');
assert(firstExploration.currentTime===47.25,'Corridor entry must not reset Exploration playback position.');

// The old room-enter cue and per-frame procedural danger hook must not control music.
fakeWindow.CCGSound.sfx('room');
assert(!sfxCalls.includes('room'),'Room-entry boundary cue must be suppressed.');
fakeWindow.CCGSound.sfx('pickup');
assert(sfxCalls.includes('pickup'),'Normal gameplay SFX must remain available.');
fakeWindow.CCGSound.setDanger(.9);
assert(legacyDangerCalls===0,'Legacy per-frame danger intensity must not reach the old music engine.');

// Admin source readiness may update future choices, but must not stop/start the
// currently playing Exploration track through the old V10.6 refresh listener.
let legacyAdminRefreshCalls=0;
fakeWindow.addEventListener('ccg:admin-audio-ready',()=>{legacyAdminRefreshCalls++});
const adminReadyEvent={
  type:'ccg:admin-audio-ready',
  stopImmediatePropagation(){this.__stopped=true}
};
fakeWindow.dispatchEvent(adminReadyEvent);
await Promise.resolve();
assert(legacyAdminRefreshCalls===0,'Playlist handler must block the old admin stop/start refresh listener.');
assert(FakeAudio.instances.length===1,'Admin readiness must not replace the active Exploration song.');

// A real special theme can interrupt Exploration.
fakeWindow.CCGSound.setRoomMood('danger');
await Promise.resolve();
assert(FakeAudio.instances.length===2,'Danger must still create its own theme.');
assert(fakeWindow.CCGLostSizzlerPlaylistAudio.getState().state==='danger','Danger state must become active.');

// Returning to a corridor/ordinary room resumes the exact same Exploration song
// at the same playback position instead of selecting a new Exploration track.
fakeWindow.CCGSound.setRoomMood('normal');
await Promise.resolve();
const resumed=fakeWindow.CCGLostSizzlerPlaylistAudio.getState();
assert(FakeAudio.instances.length===2,'Returning from Danger must reuse the retained Exploration Audio object.');
assert(resumed.url===firstExploration.url,'Returning from Danger must resume the same Exploration URL.');
assert(firstExploration.currentTime===47.25,'Returning from Danger must preserve Exploration playback position.');
assert(!firstExploration.paused,'Retained Exploration track must be playing again.');

fakeWindow.CCGSound.setRoomMood('archive');
fakeWindow.CCGSound.setRoomMood('normal');
await Promise.resolve();
assert(FakeAudio.instances.length===2,'Further corridor movement must keep the resumed Exploration track.');

// Natural completion is the one time Exploration may rotate to another song.
firstExploration.emit('ended');
await Promise.resolve();
assert(FakeAudio.instances.length===3,'Natural Exploration completion must advance to another track.');
assert(FakeAudio.instances[2].url!==firstExploration.url,'Natural advance should avoid an immediate Exploration repeat.');

console.log('Lost Sizzler multi-track playlist contract passed.');