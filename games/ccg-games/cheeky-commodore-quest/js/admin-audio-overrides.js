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

  function musicTarget(){
    const root=window.CCG_ASSET_OVERRIDES=window.CCG_ASSET_OVERRIDES||{};
    root.audio=root.audio||{};
    root.audio.music=root.audio.music||{};
    root.audio.music.playlists=root.audio.music.playlists||{};
    return root.audio.music;
  }

  async function load(){
    try{
      const client=await window.ccgSupabase?.getClient?.();
      if(!client?.from)throw new Error("Supabase asset client unavailable");
      const {data,error}=await client.from("arcade_assets")
        .select("asset_key,public_url,enabled,created_at")
        .eq("asset_group","music")
        .eq("enabled",true)
        .order("created_at",{ascending:true});
      if(error)throw error;

      const target=musicTarget();
      const playlists={normal:[],danger:[],sanctuary:[],named:[],stalker:[]};
      let applied=0;
      for(const row of data||[]){
        if(!row?.public_url)continue;
        const category=categoryForKey(row.asset_key);
        if(!category)continue;
        if(!playlists[category.state].includes(row.public_url))playlists[category.state].push(row.public_url);
        applied++;
      }

      for(const [state,urls] of Object.entries(playlists)){
        target.playlists[state]=urls;
      }

      const admin={
        playlists,
        exploration:playlists.normal[0]||null,
        danger:playlists.danger[0]||null,
        sanctuary:playlists.sanctuary[0]||null,
        named:playlists.named[0]||null,
        stalker:playlists.stalker[0]||null
      };
      window.CCG_ADMIN_AUDIO={...(window.CCG_ADMIN_AUDIO||{}),...admin,playlists};
      window.CCG_ADMIN_AUDIO_READY=true;
      window.dispatchEvent(new CustomEvent("ccg:admin-audio-ready",{detail:{applied,playlists}}));
    }catch(error){
      console.warn("[Lost Sizzler] custom admin music unavailable; bundled music remains active.",error);
    }
  }

  load();
})();
