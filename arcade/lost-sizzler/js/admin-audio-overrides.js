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
    return window.__CCG_ALLOW_REMOTE_MEDIA__===true||window.__CCG_ALLOW_REMOTE_TEST_ASSETS__===true;
  }

  function finishWithoutRemoteMedia(reason){
    const target=audioRoot();
    const playlists={normal:[],danger:[],sanctuary:[],named:[],stalker:[]};
    const voicePlaylists={};
    for(const state of Object.keys(playlists))target.music.playlists[state]=[];
    const admin={playlists,voice:voicePlaylists,exploration:null,danger:null,sanctuary:null,named:null,stalker:null,remoteMediaSkipped:true,skipReason:String(reason||"remote-media-disabled")};
    window.CCG_ADMIN_AUDIO={...(window.CCG_ADMIN_AUDIO||{}),...admin};
    window.CCG_ADMIN_AUDIO_READY=true;
    window.dispatchEvent(new CustomEvent("ccg:admin-audio-ready",{detail:{applied:0,appliedMusic:0,appliedVoice:0,playlists,voice:voicePlaylists,remoteMediaSkipped:true,reason:admin.skipReason}}));
    return true;
  }

  async function load(){
    try{
      if(!remoteMediaAllowed())return finishWithoutRemoteMedia("remote-media-disabled");
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
      console.warn("[Lost Sizzler] custom admin audio unavailable; bundled audio and browser voice remain active.",error);
    }
  }

  window.CCGLostSizzlerRemoteMediaPolicy={remoteMediaAllowed,finishWithoutRemoteMedia};
  load();
})();
