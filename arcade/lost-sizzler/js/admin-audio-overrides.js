(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_ADMIN_AUDIO__)return;
  window.__CCG_LOST_SIZZLER_ADMIN_AUDIO__=true;

  const CATEGORIES={
    lostSizzlerExploration:"normal",
    lostSizzlerDanger:"danger",
    lostSizzlerSanctuary:"sanctuary",
    lostSizzlerNamed:"named",
    lostSizzlerStalker:"stalker"
  };
  const CANONICAL_UPLOADED_MUSIC=Object.freeze({
    normal:Object.freeze([
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerExploration/1787411626645-5-exploration-01.mp3",
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerExploration/1787411628149-6-exploration-02.mp3",
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerExploration/1787411629062-7-exploration-03.mp3",
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerExploration/1787411630429-8-exploration-04.mp3",
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerExploration/1787411631439-9-exploration-05.mp3"
    ]),
    danger:Object.freeze([
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerDanger/1787411621547-0-combat-01.mp3",
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerDanger/1787411622953-1-combat-03.mp3",
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerDanger/1787411636390-14-combat-02.mp3"
    ]),
    sanctuary:Object.freeze([
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerSanctuary/1787411634411-12-sanctuary-01.mp3",
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerSanctuary/1787411635463-13-sanctuary-02.mp3"
    ]),
    named:Object.freeze([
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerNamed/1787411632588-10-named-01.mp3",
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerNamed/1787411633643-11-named-02.mp3",
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerNamed/1787411637581-15-named-03.mp3"
    ]),
    stalker:Object.freeze([
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerStalker/1787411624060-2-count-loadula-01.mp3",
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerStalker/1787411624977-3-count-loadula-02.mp3",
      "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerStalker/1787411625578-4-count-loadula-03.mp3"
    ])
  });
  function fillCanonicalMusic(playlists){
    for(const state of Object.keys(CANONICAL_UPLOADED_MUSIC))if(!playlists[state]?.length)playlists[state]=[...CANONICAL_UPLOADED_MUSIC[state]];
    return playlists
  }

  function categoryForKey(assetKey){
    const key=String(assetKey||"");
    for(const [prefix,state] of Object.entries(CATEGORIES)){
      if(key===prefix||key.startsWith(`${prefix}--`))return{prefix,state};
    }
    return null;
  }

  function voiceCueForRow(row){
    const meta=String(row?.asset_meta?.voice_cue||"").trim();
    if(meta)return meta;
    const match=String(row?.asset_key||"").match(/^lostSizzlerVoice--([A-Za-z0-9]+)--/);
    return match?.[1]||"";
  }

  function audioRoot(){
    const root=window.CCG_ASSET_OVERRIDES=window.CCG_ASSET_OVERRIDES||{};
    root.audio=root.audio||{};
    root.audio.music=root.audio.music||{};
    root.audio.music.playlists=root.audio.music.playlists||{};
    root.audio.voice=root.audio.voice||{};
    return root.audio;
  }

  function remoteMediaAllowed(){
    if(window.__CCG_ALLOW_REMOTE_TEST_ASSETS__===true)return true;
    let automated=false,local=false;
    try{automated=navigator.webdriver===true||/HeadlessChrome/i.test(String(navigator.userAgent||""))}catch(_){}
    try{local=["localhost","127.0.0.1","::1"].includes(String(location.hostname||"").toLowerCase())}catch(_){}
    return !(automated||local);
  }

  function finishWithoutRemoteMedia(reason){
    const target=audioRoot();
    const playlists={normal:[],danger:[],sanctuary:[],named:[],stalker:[]};
    const voicePlaylists={};
    for(const state of Object.keys(playlists))target.music.playlists[state]=[];
    const admin={playlists,voice:voicePlaylists,exploration:null,danger:null,sanctuary:null,named:null,stalker:null,remoteMediaSkipped:true,skipReason:String(reason||"automated-browser")};
    window.CCG_ADMIN_AUDIO={...(window.CCG_ADMIN_AUDIO||{}),...admin};
    window.CCG_ADMIN_AUDIO_READY=true;
    window.dispatchEvent(new CustomEvent("ccg:admin-audio-ready",{detail:{applied:0,appliedMusic:0,appliedVoice:0,playlists,voice:voicePlaylists,remoteMediaSkipped:true,reason:admin.skipReason}}));
    return true;
  }

  async function load(){
    try{
      if(!remoteMediaAllowed())return finishWithoutRemoteMedia("automation-or-localhost");
      const client=await window.ccgSupabase?.getClient?.();
      if(!client?.from)throw new Error("Supabase asset client unavailable");
      const {data,error}=await client.from("arcade_assets")
        .select("asset_group,asset_key,public_url,enabled,created_at,asset_meta")
        .in("asset_group",["music","voice"])
        .eq("enabled",true)
        .order("created_at",{ascending:true});
      if(error)throw error;

      const target=audioRoot();
      const playlists={normal:[],danger:[],sanctuary:[],named:[],stalker:[]};
      const voicePlaylists={};
      let appliedMusic=0;
      let appliedVoice=0;

      for(const row of data||[]){
        if(!row?.public_url)continue;
        if(row.asset_group==="music"){
          const category=categoryForKey(row.asset_key);
          if(!category)continue;
          if(!playlists[category.state].includes(row.public_url))playlists[category.state].push(row.public_url);
          appliedMusic++;
          continue;
        }
        if(row.asset_group==="voice"){
          const cue=voiceCueForRow(row);
          if(!cue)continue;
          voicePlaylists[cue]=voicePlaylists[cue]||[];
          if(!voicePlaylists[cue].includes(row.public_url))voicePlaylists[cue].push(row.public_url);
          appliedVoice++;
        }
      }

      fillCanonicalMusic(playlists);
      for(const [state,urls] of Object.entries(playlists))target.music.playlists[state]=urls;
      for(const [cue,urls] of Object.entries(voicePlaylists))target.voice[cue]=urls;

      const admin={
        playlists,
        voice:voicePlaylists,
        exploration:playlists.normal[0]||null,
        danger:playlists.danger[0]||null,
        sanctuary:playlists.sanctuary[0]||null,
        named:playlists.named[0]||null,
        stalker:playlists.stalker[0]||null,
        remoteMediaSkipped:false
      };
      window.CCG_ADMIN_AUDIO={...(window.CCG_ADMIN_AUDIO||{}),...admin,playlists,voice:voicePlaylists};
      window.CCG_ADMIN_AUDIO_READY=true;
      window.dispatchEvent(new CustomEvent("ccg:admin-audio-ready",{detail:{applied:appliedMusic+appliedVoice,appliedMusic,appliedVoice,playlists,voice:voicePlaylists,remoteMediaSkipped:false}}));
    }catch(error){
      const target=audioRoot();
      const playlists=fillCanonicalMusic({normal:[],danger:[],sanctuary:[],named:[],stalker:[]});
      for(const [state,urls] of Object.entries(playlists))target.music.playlists[state]=urls;
      const message=String(error?.message||error||"unknown admin audio error"),admin={
        playlists,voice:{},exploration:playlists.normal[0]||null,danger:playlists.danger[0]||null,sanctuary:playlists.sanctuary[0]||null,named:playlists.named[0]||null,stalker:playlists.stalker[0]||null,
        remoteMediaSkipped:false,loadFailed:true,error:message,canonicalUploadedFallback:true
      };
      window.CCG_ADMIN_AUDIO={...(window.CCG_ADMIN_AUDIO||{}),...admin};
      window.CCG_ADMIN_AUDIO_READY=true;
      window.dispatchEvent(new CustomEvent("ccg:admin-audio-ready",{detail:{applied:Object.values(playlists).reduce((n,urls)=>n+urls.length,0),appliedMusic:Object.values(playlists).reduce((n,urls)=>n+urls.length,0),appliedVoice:0,playlists,voice:{},remoteMediaSkipped:false,loadFailed:true,error:message,canonicalUploadedFallback:true}}));
      console.warn("[Lost Sizzler] admin audio catalogue unavailable; using the canonical uploaded soundtrack manifest.",error);
    }
  }

  window.CCGLostSizzlerRemoteMediaPolicy={remoteMediaAllowed,finishWithoutRemoteMedia};
  load();
})();
