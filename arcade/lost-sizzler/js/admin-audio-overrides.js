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
  const REST_SELECT="asset_group,asset_key,public_url,enabled,created_at,asset_meta";
  let resolveReady;
  window.CCG_ADMIN_AUDIO_READY=false;
  window.CCG_ADMIN_AUDIO_READY_PROMISE=new Promise(resolve=>{resolveReady=resolve});

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
    // A packaged offline game must never consult Supabase, even when a test
    // harness explicitly opts into remote media for the website build.
    if(window.CCGDungeonCarnageItchPackage===true)return false;
    if(window.__CCG_ALLOW_REMOTE_TEST_ASSETS__===true)return true;
    let automated=false,local=false;
    try{automated=navigator.webdriver===true||/HeadlessChrome/i.test(String(navigator.userAgent||""))}catch(_){}
    try{local=["localhost","127.0.0.1","::1"].includes(String(location.hostname||"").toLowerCase())}catch(_){}
    return !(automated||local);
  }

  function publishReady(detail){
    window.CCG_ADMIN_AUDIO_READY=true;
    try{window.dispatchEvent(new CustomEvent("ccg:admin-audio-ready",{detail}))}catch(_){}
    try{resolveReady?.(detail)}catch(_){}
    resolveReady=null;
    return detail;
  }

  function finishWithoutRemoteMedia(reason){
    const target=audioRoot();
    const playlists={normal:[],danger:[],sanctuary:[],named:[],stalker:[]};
    const voicePlaylists={};
    for(const state of Object.keys(playlists)){
      // Asset overrides already selected the bundled soundtrack before this
      // admin catalogue initialiser ran. Skipping remote media may clear
      // website/automation catalogue values, but must not erase local music
      // from the authorised offline game.
      const existing=target.music.playlists[state];
      if(window.CCGDungeonCarnageItchPackage===true&&Array.isArray(existing)){
        playlists[state]=existing.filter(url=>typeof url==="string"&&
          /^assets\/audio\/music\/[a-z0-9-]+\.wav(?:\?[^?#]*)?$/i.test(url));
      }
      target.music.playlists[state]=playlists[state];
    }
    const admin={playlists,voice:voicePlaylists,exploration:null,danger:null,sanctuary:null,named:null,stalker:null,remoteMediaSkipped:true,skipReason:String(reason||"automated-browser"),source:"skipped"};
    window.CCG_ADMIN_AUDIO={...(window.CCG_ADMIN_AUDIO||{}),...admin};
    publishReady({applied:0,appliedMusic:0,appliedVoice:0,playlists,voice:voicePlaylists,remoteMediaSkipped:true,reason:admin.skipReason,source:"skipped"});
    return true;
  }

  function restUrl(){
    const base=String(window.CCG_SUPABASE_URL||"").trim().replace(/\/+$/,"");
    const key=String(window.CCG_SUPABASE_ANON_KEY||"").trim();
    if(!base||!key)throw new Error("Supabase public audio configuration unavailable");
    const params=new URLSearchParams({
      select:REST_SELECT,
      asset_group:"in.(music,voice)",
      enabled:"eq.true",
      order:"created_at.asc"
    });
    return{url:`${base}/rest/v1/arcade_assets?${params.toString()}`,key};
  }

  async function fetchRowsViaRest(){
    const {url,key}=restUrl();
    const controller=typeof AbortController==="function"?new AbortController():null;
    const timeout=controller?setTimeout(()=>controller.abort(),4500):null;
    try{
      const response=await fetch(url,{method:"GET",headers:{apikey:key,Authorization:`Bearer ${key}`,Accept:"application/json"},signal:controller?.signal});
      if(!response.ok)throw new Error(`arcade_assets REST ${response.status}`);
      const data=await response.json();
      if(!Array.isArray(data))throw new Error("arcade_assets REST response was not an array");
      return{data,source:"rest"};
    }finally{if(timeout)clearTimeout(timeout)}
  }

  async function fetchRowsViaClient(){
    const client=await window.ccgSupabase?.getClient?.();
    if(!client?.from)throw new Error("Supabase asset client unavailable");
    const {data,error}=await client.from("arcade_assets")
      .select(REST_SELECT)
      .in("asset_group",["music","voice"])
      .eq("enabled",true)
      .order("created_at",{ascending:true});
    if(error)throw error;
    return{data:Array.isArray(data)?data:[],source:"client"};
  }

  async function fetchRows(){
    try{return await fetchRowsViaRest()}
    catch(restError){
      try{return await fetchRowsViaClient()}
      catch(clientError){
        const error=new Error(`Production audio catalogue unavailable: ${String(restError?.message||restError)}; ${String(clientError?.message||clientError)}`);
        error.cause=clientError;
        throw error;
      }
    }
  }

  async function load(){
    if(!remoteMediaAllowed())return finishWithoutRemoteMedia("automation-or-localhost");
    let lastError=null;
    for(let attempt=1;attempt<=3;attempt++){
      try{
        const {data,source}=await fetchRows();
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
          remoteMediaSkipped:false,
          loadFailed:false,
          source,
          attempts:attempt
        };
        window.CCG_ADMIN_AUDIO={...(window.CCG_ADMIN_AUDIO||{}),...admin,playlists,voice:voicePlaylists};
        publishReady({applied:appliedMusic+appliedVoice,appliedMusic,appliedVoice,playlists,voice:voicePlaylists,remoteMediaSkipped:false,source,attempts:attempt});
        return true;
      }catch(error){
        lastError=error;
        if(attempt<3)await new Promise(resolve=>setTimeout(resolve,250*(2**(attempt-1))));
      }
    }

    const target=audioRoot();
    const playlists={normal:[],danger:[],sanctuary:[],named:[],stalker:[]};
    for(const state of Object.keys(playlists))target.music.playlists[state]=[];
    const message=String(lastError?.message||lastError||"unknown admin audio error");
    window.CCG_ADMIN_AUDIO={...(window.CCG_ADMIN_AUDIO||{}),playlists,voice:{},exploration:null,danger:null,sanctuary:null,named:null,stalker:null,remoteMediaSkipped:false,loadFailed:true,error:message,source:"failed",attempts:3};
    publishReady({applied:0,appliedMusic:0,appliedVoice:0,playlists,voice:{},remoteMediaSkipped:false,loadFailed:true,error:message,source:"failed",attempts:3});
    console.warn("[C64 Dungeon Carnage] uploaded production audio catalogue unavailable after retries; packaged authored music remains eligible.",lastError);
    return false;
  }

  window.CCGLostSizzlerRemoteMediaPolicy={remoteMediaAllowed,finishWithoutRemoteMedia,fetchRowsViaRest};
  load();
})();