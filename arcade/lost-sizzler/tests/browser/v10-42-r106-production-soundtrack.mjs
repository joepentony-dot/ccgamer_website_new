import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../..");
const adminSource=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/admin-audio-overrides.js"),"utf8");
const playlistSource=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/lost-sizzler-playlist-audio.js"),"utf8");

const rows=[
  {asset_group:"music",asset_key:"lostSizzlerExploration--test-01",public_url:"https://example.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerExploration/exploration-01.mp3",enabled:true,created_at:"2026-01-01T00:00:01Z",asset_meta:{playlist:true}},
  {asset_group:"music",asset_key:"lostSizzlerDanger--test-01",public_url:"https://example.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerDanger/danger-01.mp3",enabled:true,created_at:"2026-01-01T00:00:02Z",asset_meta:{playlist:true}},
  {asset_group:"music",asset_key:"lostSizzlerSanctuary--test-01",public_url:"https://example.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerSanctuary/sanctuary-01.mp3",enabled:true,created_at:"2026-01-01T00:00:03Z",asset_meta:{playlist:true}},
  {asset_group:"music",asset_key:"lostSizzlerNamed--test-01",public_url:"https://example.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerNamed/named-01.mp3",enabled:true,created_at:"2026-01-01T00:00:04Z",asset_meta:{playlist:true}},
  {asset_group:"music",asset_key:"lostSizzlerStalker--test-01",public_url:"https://example.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerStalker/stalker-01.mp3",enabled:true,created_at:"2026-01-01T00:00:05Z",asset_meta:{playlist:true}}
];

const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage"]});
try{
  const page=await browser.newPage();
  await page.setContent("<main></main>");
  await page.addScriptTag({content:[
    // Simulate a genuine browser for this synthetic audio test: Audio and fetch
    // are replaced with inert local fixtures, so no production egress occurs.
    'Object.defineProperty(navigator,"webdriver",{configurable:true,value:false});',
    'Object.defineProperty(navigator,"userAgent",{configurable:true,value:"Mozilla/5.0 Chrome/140.0 Safari/537.36"});',
    'window.__CCG_ALLOW_REMOTE_TEST_ASSETS__=true;',
    'window.CCG_SUPABASE_URL="https://example.supabase.co";',
    'window.CCG_SUPABASE_ANON_KEY="test-anon-key";',
    'window.CCG_ASSET_OVERRIDES={audio:{music:{playlists:{normal:[],danger:[],sanctuary:[],named:[],stalker:[]}},voice:{}}};',
    'window.CCG_AUDIO_ASSETS={music:{playlists:{normal:["fallback-normal.wav"],danger:["fallback-danger.wav"],sanctuary:["fallback-sanctuary.wav"],named:["fallback-named.wav"],stalker:["fallback-stalker.wav"]}}};',
    'window.__musicInstances=[];',
    'window.Audio=class{constructor(url){this.url=String(url||"");this.paused=true;this.currentTime=0;this.duration=180;this.volume=0;this.loop=false;this.preload="";this.listeners=new Map();window.__musicInstances.push(this)}addEventListener(name,fn){const list=this.listeners.get(name)||[];list.push(fn);this.listeners.set(name,list)}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}load(){}removeAttribute(){}};',
    'window.CCGSound={start:async()=>true,startMusic(){},stopMusic(){},toggle(){return true},isEnabled:()=>true,sfx(){},windWhistle(){}};'
  ].join("\n")});
  await page.evaluate((fixture)=>{
    window.fetch=async function(url,options){
      window.__audioFetch={url:String(url),headers:options&&options.headers||{}};
      return {ok:true,status:200,json:async()=>fixture};
    };
    window.ccgSupabase=undefined;
  },rows);

  await page.addScriptTag({content:adminSource});
  await page.waitForFunction(()=>window.CCG_ADMIN_AUDIO_READY===true);
  const hydrated=await page.evaluate(()=>({
    source:window.CCG_ADMIN_AUDIO&&window.CCG_ADMIN_AUDIO.source,
    failed:Boolean(window.CCG_ADMIN_AUDIO&&window.CCG_ADMIN_AUDIO.loadFailed),
    playlists:window.CCG_ADMIN_AUDIO&&window.CCG_ADMIN_AUDIO.playlists,
    fetch:window.__audioFetch
  }));
  assert.equal(hydrated.source,"rest","production audio must hydrate through the public REST path without waiting for supabase-js");
  assert.equal(hydrated.failed,false);
  assert.ok(hydrated.fetch.url.includes("/rest/v1/arcade_assets?"));
  for(const state of ["normal","danger","sanctuary","named","stalker"])assert.equal(hydrated.playlists[state].length,1,state+" must hydrate one uploaded test track");

  await page.addScriptTag({content:playlistSource});
  await page.evaluate(()=>window.CCGSound.start());
  await page.waitForTimeout(0);

  async function expectState(state,action){
    if(action)await page.evaluate(action);
    await page.waitForTimeout(0);
    const snapshot=await page.evaluate(()=>window.CCGLostSizzlerPlaylistAudio.getState());
    assert.equal(snapshot.state,state,"music state must be "+state);
    assert.ok(snapshot.url.includes("/music/"),state+" must own an uploaded music URL");
    assert.equal(snapshot.customSoundtrackOwned,true,state+" must report uploaded soundtrack ownership");
    assert.equal(snapshot.adminAudioReady,true,state+" must see completed admin audio hydration");
    assert.equal(snapshot.fallbackActive,false,state+" must not use generated/basic fallback music");
    assert.equal(snapshot.slots[state].active,true,state+" slot must be active");
    assert.equal(snapshot.slots[state].paused,false,state+" slot must be playing");
    assert.equal(snapshot.slots[state].looping,true,state+" uploaded remote track must loop locally");
  }

  await expectState("normal");
  await expectState("danger",()=>window.CCGSound.setRoomMood("danger"));
  await expectState("sanctuary",()=>window.CCGSound.setRoomMood("sanctuary"));
  await expectState("named",()=>window.CCGSound.setRoomMood("named"));
  await expectState("normal",()=>window.CCGSound.setRoomMood("normal"));
  await expectState("stalker",()=>window.CCGSound.setStalkerNear(true));
  await expectState("normal",()=>window.CCGSound.setStalkerNear(false));

  const playlists=await page.evaluate(()=>Object.fromEntries(["normal","danger","sanctuary","named","stalker"].map(state=>[state,window.CCGLostSizzlerPlaylistAudio.getPlaylist(state)])));
  for(const state of Object.keys(playlists)){
    assert.equal(playlists[state].length,1,state+" playlist must prefer only the uploaded source");
    assert.ok(playlists[state][0].includes("example.supabase.co"),state+" playlist must not fall back to packaged/basic music");
  }
  console.log("R106 production soundtrack passed: REST hydration + normal/danger/sanctuary/named/stalker transitions.");
}finally{
  await browser.close();
}
