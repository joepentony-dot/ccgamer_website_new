import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../../..');
const read=relative=>fs.readFileSync(path.join(repo,relative),'utf8');
const adminSource=read('arcade/lost-sizzler/js/admin-audio-overrides.js');
const playlistSource=read('arcade/lost-sizzler/js/lost-sizzler-playlist-audio.js');
const adminUploaderSource=read('admin/js/arcade-assets.js');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

assert(adminSource.includes('navigator.webdriver===true'),'Remote audio policy must identify automated browsers.');
assert(adminSource.includes('__CCG_ALLOW_REMOTE_TEST_ASSETS__'),'Remote audio tests need an explicit opt-in escape hatch.');
assert(playlistSource.includes('isMeteredRemoteTrack'),'Playlist must identify metered Supabase Storage music.');
const localHostPredicate=source=>source.match(/const isLocalPlaybackHost=\(\)=>\{[\s\S]*?\n  \};/)?.[0]||'';
assert(localHostPredicate(adminSource)&&localHostPredicate(adminSource)===localHostPredicate(playlistSource),
  'Admin audio and playlist must keep identical local-host safety classification.');

assert(playlistSource.includes('audio.loop=meteredRemote'),'Metered remote songs must loop within the current run instead of auto-advancing.');
assert(adminUploaderSource.includes("LOST_SIZZLER_MUSIC_CACHE_SECONDS='31536000'"),'Future Lost Sizzler music uploads must use a one-year browser/CDN cache lifetime.');
assert(adminUploaderSource.includes('cacheControl:LOST_SIZZLER_MUSIC_CACHE_SECONDS'),'Lost Sizzler playlist uploads must apply the long cache policy.');

let clientCalls=0;
const adminEvents=[];
class FakeCustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail}}
const adminWindow={
  CCG_ASSET_OVERRIDES:{audio:{music:{playlists:{}},voice:{}}},
  ccgSupabase:{getClient:async()=>{clientCalls++;throw new Error('Supabase must not be contacted by webdriver tests')}},
  addEventListener(){},
  dispatchEvent:event=>adminEvents.push(event)
};
const adminSandbox={
  window:adminWindow,
  navigator:{webdriver:true,userAgent:'HeadlessChrome/140'},
  location:{hostname:'127.0.0.1'},
  CustomEvent:FakeCustomEvent,
  console
};
vm.runInNewContext(adminSource,adminSandbox,{filename:'admin-audio-overrides.js'});
await new Promise(resolve=>setImmediate(resolve));
assert(clientCalls===0,'Headless/local validation must not query the remote arcade audio catalogue.');
assert(adminWindow.CCG_ADMIN_AUDIO_READY===true,'Skipping remote audio must still complete the admin-audio readiness contract.');
assert(adminWindow.CCG_ADMIN_AUDIO?.remoteMediaSkipped===true,'Automated browser must expose that remote media was deliberately skipped.');
assert(adminEvents.some(event=>event.type==='ccg:admin-audio-ready'&&event.detail?.remoteMediaSkipped===true),'Remote-media skip must dispatch the normal readiness event.');

// Local audio catalogue isolation must include all IPv4 loopback addresses,
// bracketed IPv6 loopback and browser-local development hostnames even without WebDriver.
for(const hostname of ['localhost','localhost.','play.localhost.','127.0.0.1','127.0.0.2.','::1','[::1]','::','[::]','127.0.0.2','127.255.255.254','play.localhost','0.0.0.0']){
  let loopbackClientCalls=0;
  let loopbackRestCalls=0;
  const loopbackWindow={
    CCG_SUPABASE_URL:'https://lcslgxpgmttaexsorxik.supabase.co',
    CCG_SUPABASE_ANON_KEY:'test-anon-key',
    CCG_ASSET_OVERRIDES:{audio:{music:{playlists:{}},voice:{}}},
    ccgSupabase:{getClient:async()=>{loopbackClientCalls++;throw new Error('Loopback browser must not fetch production audio')}},
    addEventListener(){},dispatchEvent(){}
  };
  vm.runInNewContext(adminSource,{
    window:loopbackWindow,
    navigator:{webdriver:false,userAgent:'Mozilla/5.0 Chrome/140.0 Safari/537.36'},
    location:{hostname,protocol:'http:'},
    URLSearchParams,
    fetch:async()=>{loopbackRestCalls++;throw new Error('Local browser must not fetch the production catalogue')},
    setTimeout:()=>1,clearTimeout(){},
    CustomEvent:FakeCustomEvent,
    console
  },{filename:'admin-audio-overrides-loopback-'+hostname+'.js'});
  await new Promise(resolve=>setImmediate(resolve));
  assert(loopbackClientCalls===0,hostname+' must not request the Supabase audio catalogue.');
  assert(loopbackRestCalls===0,hostname+' must not request the Supabase REST audio catalogue.');
  assert(loopbackWindow.CCG_ADMIN_AUDIO_READY===true&&loopbackWindow.CCG_ADMIN_AUDIO?.remoteMediaSkipped===true,
    hostname+' must preserve offline audio readiness.');
}

// Packaged builds must retain local audio when the remote catalogue is skipped.
// Regresses the Windows EXE smoke failure where the admin loader emptied
// the already-correct five bundled WAV playlist selections.
const packagedTracks={
  normal:'assets/audio/music/exploration.wav',
  danger:'assets/audio/music/danger.wav',
  sanctuary:'assets/audio/music/sanctuary.wav',
  named:'assets/audio/music/named-enemy.wav',
  stalker:'assets/audio/music/count-loadula.wav'
};
let packagedRemoteCalls=0;
const packagedWindow={
  CCGDungeonCarnageItchPackage:true,
  __CCG_ALLOW_REMOTE_TEST_ASSETS__:true, // Must never overrule offline isolation.
  CCG_ASSET_OVERRIDES:{audio:{music:{playlists:
    Object.fromEntries(Object.entries(packagedTracks).map(([state,url])=>[state,[url]]))},voice:{}}},
  ccgSupabase:{getClient:async()=>{packagedRemoteCalls++;throw new Error('Offline game must not reach Supabase')}},
  addEventListener(){},dispatchEvent(){}
};
vm.runInNewContext(adminSource,{
  window:packagedWindow,navigator:{webdriver:true,userAgent:'HeadlessChrome/140'},
  location:{hostname:'127.0.0.1'},CustomEvent:FakeCustomEvent,console
},{filename:'admin-audio-overrides.js/offline'});
await new Promise(resolve=>setImmediate(resolve));
assert(packagedRemoteCalls===0,'Packaged game must not request remote music even with automated override flag.');
assert(packagedWindow.CCG_ADMIN_AUDIO_READY===true&&packagedWindow.CCG_ADMIN_AUDIO.remoteMediaSkipped===true,
  'Packaged audio must complete local-only readiness without a network request.');
for(const [state,url] of Object.entries(packagedTracks)){
  const selection=packagedWindow.CCG_ASSET_OVERRIDES.audio.music.playlists[state];
  assert(Array.isArray(selection)&&selection.length===1&&selection[0]===url,
    'Offline admin audio must preserve bundled '+state+' WAV rather than erase the playlist.');
}

class FakeAudio{
  static instances=[];
  constructor(url){this.url=url;this.paused=true;this.volume=0;this.currentTime=0;this.duration=180;this.listeners={};this.loop=false;this.preload='auto';FakeAudio.instances.push(this)}
  play(){this.paused=false;return Promise.resolve()}
  pause(){this.paused=true}
  removeAttribute(){}
  load(){}
  addEventListener(name,fn){(this.listeners[name]||(this.listeners[name]=[])).push(fn)}
  emit(name){for(const fn of this.listeners[name]||[])fn()}
}
const remoteTrack='https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerExploration/example.mp3';
const eventListeners=new Map();
const baseSound={start:async()=>true,startMusic(){},stopMusic(){},toggle:()=>true,isEnabled:()=>true,sfx(){},windWhistle(){}};
const playlistWindow={
  CCGSound:baseSound,
  CCG_AUDIO_ASSETS:{music:{normal:'assets/audio/music/exploration.wav',playlists:{normal:['assets/audio/music/exploration.wav'],danger:[],sanctuary:[],named:[],stalker:[]}}},
  CCG_ASSET_OVERRIDES:{audio:{music:{playlists:{normal:[],danger:[],sanctuary:[],named:[],stalker:[]}}}},
  CCG_ADMIN_AUDIO:{playlists:{normal:[remoteTrack],danger:[],sanctuary:[],named:[],stalker:[]},exploration:remoteTrack},
  addEventListener(name,fn){if(!eventListeners.has(name))eventListeners.set(name,[]);eventListeners.get(name).push(fn)},
  dispatchEvent(event){for(const fn of eventListeners.get(event.type)||[])fn(event)}
};
const playlistSandbox={
  window:playlistWindow,
  Audio:FakeAudio,
  URL,
  // Exercise real-site remote looping here; the automated/local exclusion is
  // independently asserted in v10-7-audio-playlists.mjs.
  location:{href:'https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/',hostname:'www.cheekycommodoregamer.co.uk',protocol:'https:'},
  navigator:{webdriver:false,userAgent:'Mozilla/5.0 Chrome/140.0 Safari/537.36'},
  performance:{now:()=>0},
  setInterval:()=>1,
  clearInterval(){},
  setTimeout:()=>1,
  clearTimeout(){},
  console
};
vm.runInNewContext(playlistSource,playlistSandbox,{filename:'lost-sizzler-playlist-audio.js'});
await playlistWindow.CCGSound.start();
await Promise.resolve();
assert(FakeAudio.instances.length===1,'Starting remote Exploration should create one Audio element.');
const remote=FakeAudio.instances[0];
assert(remote.url===remoteTrack,'The enabled admin track must remain the selected production soundtrack.');
assert(remote.loop===true,'Supabase-hosted music must loop for the session instead of downloading another playlist file on completion.');
assert(remote.preload==='none','Metered remote music must not be eagerly preloaded.');
assert(!(remote.listeners.timeupdate||[]).length,'Metered remote music must not arm near-end auto-advance.');
assert(!(remote.listeners.ended||[]).length,'Metered remote music must not arm end-of-track auto-advance.');
remote.emit('ended');
await Promise.resolve();
assert(FakeAudio.instances.length===1,'A remote song ending must not create/download a second remote song in the same state.');
const state=playlistWindow.CCGLostSizzlerPlaylistAudio.getState();
assert(state.slots.normal.meteredRemote===true&&state.slots.normal.looping===true,'Runtime diagnostics must expose the remote looping policy.');

console.log('Lost Sizzler Supabase egress guard contract passed.');
