(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_ADMIN_AUDIO__)return;
  window.__CCG_LOST_SIZZLER_ADMIN_AUDIO__=true;

  const DIRECT={
    lostSizzlerExploration:"exploration",
    lostSizzlerDanger:"danger",
    lostSizzlerSanctuary:"sanctuary",
    lostSizzlerNamed:"named",
    lostSizzlerStalker:"stalker"
  };

  function musicTarget(){
    const root=window.CCG_ASSET_OVERRIDES=window.CCG_ASSET_OVERRIDES||{};
    root.audio=root.audio||{};
    root.audio.music=root.audio.music||{};
    return root.audio.music;
  }

  async function load(){
    try{
      const client=await window.ccgSupabase?.getClient?.();
      if(!client?.from)throw new Error("Supabase asset client unavailable");
      const {data,error}=await client.from("arcade_assets")
        .select("asset_key,public_url,enabled")
        .eq("asset_group","music")
        .eq("enabled",true);
      if(error)throw error;

      const target=musicTarget();
      const admin={};
      let applied=0;
      for(const row of data||[]){
        if(!row?.public_url)continue;
        const direct=DIRECT[row.asset_key];
        if(!direct)continue;
        target[direct]=row.public_url;
        admin[direct]=row.public_url;
        applied++;
      }
      window.CCG_ADMIN_AUDIO={...(window.CCG_ADMIN_AUDIO||{}),...admin};
      window.CCG_ADMIN_AUDIO_READY=true;
      window.dispatchEvent(new CustomEvent("ccg:admin-audio-ready",{detail:{applied}}));
    }catch(error){
      console.warn("[Lost Sizzler] custom admin music unavailable; bundled music remains active.",error);
    }
  }

  load();
})();
