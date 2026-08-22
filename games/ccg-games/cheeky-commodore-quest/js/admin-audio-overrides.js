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
  const ROOMS={
    lostSizzlerRoomArchive:"archive",
    lostSizzlerRoomWorkshop:"workshop",
    lostSizzlerRoomBudget:"budget",
    lostSizzlerRoomDemo:"demo",
    lostSizzlerRoomArmoury:"armoury",
    lostSizzlerRoomKitchen:"kitchen",
    lostSizzlerRoomReactor:"reactor",
    lostSizzlerRoomWarp:"warp",
    lostSizzlerRoomLibrary:"library",
    lostSizzlerRoomTape:"tape",
    lostSizzlerRoomCartridge:"cartridge",
    lostSizzlerRoomCracked:"cracked",
    lostSizzlerRoomFoundry:"foundry",
    lostSizzlerRoomModem:"modem",
    lostSizzlerRoomCrypt:"crypt",
    lostSizzlerRoomCrt:"crt",
    lostSizzlerRoomVault:"vault"
  };

  function musicTarget(){
    const root=window.CCG_ASSET_OVERRIDES=window.CCG_ASSET_OVERRIDES||{};
    root.audio=root.audio||{};
    root.audio.music=root.audio.music||{};
    root.audio.music.rooms=root.audio.music.rooms||{};
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
      const admin={rooms:{}};
      let applied=0;
      for(const row of data||[]){
        if(!row?.public_url)continue;
        const direct=DIRECT[row.asset_key];
        if(direct){target[direct]=row.public_url;admin[direct]=row.public_url;applied++;continue;}
        const room=ROOMS[row.asset_key];
        if(room){target.rooms[room]=row.public_url;admin.rooms[room]=row.public_url;applied++;}
      }
      window.CCG_ADMIN_AUDIO={...(window.CCG_ADMIN_AUDIO||{}),...admin,rooms:{...(window.CCG_ADMIN_AUDIO?.rooms||{}),...admin.rooms}};
      window.CCG_ADMIN_AUDIO_READY=true;
      window.dispatchEvent(new CustomEvent("ccg:admin-audio-ready",{detail:{applied}}));
    }catch(error){
      console.warn("[Lost Sizzler] custom admin music unavailable; bundled music remains active.",error);
    }
  }

  load();
})();
