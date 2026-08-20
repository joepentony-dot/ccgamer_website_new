(function(){
  "use strict";
  const Q=window.CCGQuest=window.CCGQuest||{};
  const TAG='[CCG QUEST ASSETS]';

  function normalizePath(value){try{return new URL(value,window.location.origin).pathname;}catch(_e){return String(value||'');}}
  function loadScript(src){
    const found=Array.from(document.scripts).find(s=>normalizePath(s.getAttribute('src'))===src);
    if(found)return Promise.resolve();
    return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.addEventListener('load',resolve,{once:true});s.addEventListener('error',reject,{once:true});document.head.appendChild(s);});
  }
  async function waitForClient(timeout=3500){const start=Date.now();while(Date.now()-start<timeout){if(window.ccgSupabase&&typeof window.ccgSupabase.getClient==='function')return window.ccgSupabase.getClient();await new Promise(r=>setTimeout(r,60));}return null;}
  Q.hydrateRemoteAssets=async function(){
    if(location.protocol==='file:')return false;
    try{
      await loadScript('/js/ccg-supabase-config.js');await loadScript('/js/ccg-supabase-client.js');
      const client=await waitForClient();if(!client)return false;
      const {data,error}=await client.from('arcade_assets').select('asset_group,asset_key,public_url,enabled').eq('enabled',true);
      if(error){console.info(TAG,'remote asset manifest unavailable; bundled assets remain active',error.message);return false;}
      for(const row of data||[]){const group=String(row.asset_group||'').trim(),key=String(row.asset_key||'').trim(),url=String(row.public_url||'').trim();if(!group||!key||!url||!Q.CUSTOM_ASSETS?.[group]||!(key in Q.CUSTOM_ASSETS[group]))continue;Q.CUSTOM_ASSETS[group][key]=url;}
      console.info(TAG,'loaded',data?.length||0,'remote asset records');return true;
    }catch(error){console.info(TAG,'using bundled assets only',error?.message||error);return false;}
  };
})();
