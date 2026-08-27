/* The Lost Sizzler V10.41 r32 — Spy-only lazy loader.
 *
 * The full overhaul has no reason to install during Solo, Horde or ordinary
 * online Dungeon sessions. Keep those startup/network paths untouched and load
 * the r32 overhaul/network owners only after Sizzler Saboteurs is active. The
 * lightweight world-owner bridge is preloaded separately so the first Spy world
 * build is already deterministic before these asynchronous owners arrive.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R32_SPY_LOADER__)return;
  window.__CCG_LOST_SIZZLER_V141_R32_SPY_LOADER__=true;

  const MODE_ID="sizzler-saboteurs",MONITOR_MS=20;
  const state={timer:0,loading:false,loaded:false,loads:0,lastError:""};

  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID}catch(_){return false}};
  const revision=()=>String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"latest").trim();

  function loadScript(path,marker,ready){
    return new Promise((resolve,reject)=>{
      if(ready?.()){resolve(true);return}
      const existing=document.querySelector(`script[${marker}="true"]`);
      if(existing){
        if(ready?.()||existing.dataset.ccgLoaded==="true"){resolve(true);return}
        existing.addEventListener("load",()=>resolve(true),{once:true});existing.addEventListener("error",()=>reject(new Error(`Failed to load ${path}`)),{once:true});return
      }
      const script=document.createElement("script");script.src=`js/${path}?v=${encodeURIComponent(revision())}`;script.setAttribute(marker,"true");
      script.addEventListener("load",()=>{script.dataset.ccgLoaded="true";resolve(true)},{once:true});script.addEventListener("error",()=>reject(new Error(`Failed to load ${path}`)),{once:true});document.head.appendChild(script)
    })
  }

  async function ensureLoaded(){
    if(state.loaded||state.loading||!spyActive())return state.loaded;state.loading=true;
    try{
      await loadScript("v10-41-r32-spy-overhaul.js","data-ccg-r32-spy-overhaul",()=>Boolean(window.CCGLostSizzlerV141R32SpyOverhaul));
      await loadScript("v10-41-r32-spy-search-ui-owner.js","data-ccg-r32-spy-search-ui-owner",()=>Boolean(window.CCGLostSizzlerV141R32SpySearchUiOwner));
      await loadScript("v10-41-r32-spy-packet-owner.js","data-ccg-r32-spy-packet-owner",()=>Boolean(window.CCGLostSizzlerV141R32SpyPacketOwner));
      state.loaded=true;state.loads++;state.lastError="";return true
    }catch(error){state.lastError=String(error?.message||error);console.warn("[Lost Sizzler r32] Spy lazy load failed safely",error);return false}
    finally{state.loading=false}
  }

  function monitor(){if(spyActive())ensureLoaded()}
  monitor();state.timer=setInterval(monitor,MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerV141R32SpyLoader={ensureLoaded,get state(){return state}};
})();