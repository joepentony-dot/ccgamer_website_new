/* The Lost Sizzler V10.41 r32 — staged Spy owner loader.
 *
 * The world/engine owner must be ready before the first Spy isolation call so
 * retained r29 callers can never expose an old furniture map for a frame and
 * then replace it with the r32 7x7 world. Load the three r32 owners in a fixed
 * order during startup. The packet-owner seal immediately restores the normal
 * multiplayer callback outside Spy, so Solo, Horde and Dungeon networking keep
 * their existing owner while the Spy code is merely standing by.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R32_SPY_LOADER__)return;
  window.__CCG_LOST_SIZZLER_V141_R32_SPY_LOADER__=true;

  const MONITOR_MS=40;
  const state={timer:0,loading:false,loaded:false,loads:0,lastError:""};

  const revision=()=>String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"latest").trim();

  function loadScript(path,marker,ready){
    return new Promise((resolve,reject)=>{
      if(ready?.()){resolve(true);return}
      const existing=document.querySelector(`script[${marker}="true"]`);
      if(existing){
        if(ready?.()||existing.dataset.ccgLoaded==="true"){resolve(true);return}
        existing.addEventListener("load",()=>resolve(true),{once:true});existing.addEventListener("error",()=>reject(new Error(`Failed to load ${path}`)),{once:true});return
      }
      const script=document.createElement("script");script.async=false;script.src=`js/${path}?v=${encodeURIComponent(revision())}`;script.setAttribute(marker,"true");
      script.addEventListener("load",()=>{script.dataset.ccgLoaded="true";resolve(true)},{once:true});script.addEventListener("error",()=>reject(new Error(`Failed to load ${path}`)),{once:true});document.head.appendChild(script)
    })
  }

  async function ensureLoaded(){
    if(state.loaded||state.loading)return state.loaded;state.loading=true;
    try{
      await loadScript("v10-41-r32-spy-world-owner.js","data-ccg-r32-spy-world-owner",()=>Boolean(window.CCGLostSizzlerV141R32SpyWorldOwner));
      await loadScript("v10-41-r32-spy-overhaul.js","data-ccg-r32-spy-overhaul",()=>Boolean(window.CCGLostSizzlerV141R32SpyOverhaul));
      await loadScript("v10-41-r32-spy-packet-owner.js","data-ccg-r32-spy-packet-owner",()=>Boolean(window.CCGLostSizzlerV141R32SpyPacketOwner));
      state.loaded=true;state.loads++;state.lastError="";return true
    }catch(error){state.lastError=String(error?.message||error);console.warn("[Lost Sizzler r32] staged Spy owner load failed safely",error);return false}
    finally{state.loading=false}
  }

  function monitor(){if(!state.loaded&&!state.loading)ensureLoaded()}
  ensureLoaded();state.timer=setInterval(monitor,MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerV141R32SpyLoader={ensureLoaded,get state(){return state}};
})();