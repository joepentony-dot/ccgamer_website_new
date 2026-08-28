/* The Lost Sizzler V10.41 r32/r36 — Spy-only lazy loader.
 *
 * The full overhaul has no reason to install during Solo, Horde or ordinary
 * online Dungeon sessions. Keep those startup/network paths untouched and load
 * the Spy owners only after Sizzler Saboteurs is active. The r32 overhaul owns
 * the actual TAB inventory toggle; the r33 packet/final owner loads immediately
 * afterwards and seals TAB before r35 is installed. The shared game owner keeps
 * F as fullscreen; this loader stops that same F event before any later Spy
 * compatibility layer can reuse it. The r35 knockout finalizer binds the real
 * combat/trap boundary to the ghost/capture rules, r34 owns fullscreen panel
 * presentation, and r36 then performs the final live-state/UI reconciliation.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R32_SPY_LOADER__)return;
  window.__CCG_LOST_SIZZLER_V141_R32_SPY_LOADER__=true;

  const MODE_ID="sizzler-saboteurs",MONITOR_MS=20;
  const OWNER_ACTION_CODES=new Set(["KeyE","KeyT","KeyX"]);
  const state={
    timer:0,loading:false,loaded:false,loads:0,lastError:"",
    uiLoading:false,uiLoaded:false,uiLoads:0,uiLastError:"",
    hardeningLoaded:false,fullscreenUiLoaded:false,perfectionLoaded:false,
    pendingActionCode:"",queuedActions:0,replayedActions:0,queuedSearchFeedbacks:0,directSearchActions:0,
    searchTargetBridges:0,searchRoomBridges:0,searchKeyDowns:0,searchKeyUpFallbacks:0
  };
  let loadPromise=null,uiPromise=null,pendingActionPromise=null,lastSearchDispatchAt=0;

  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID}catch(_){return false}};
  const revision=()=>String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"latest").trim();
  const overhaul=()=>{try{return window.CCGLostSizzlerV141R32SpyOverhaul||null}catch(_){return null}};
  const actorId=()=>{try{return String(net?.sessionId||p1?.id||"P1")}catch(_){return"P1"}};
  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};

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

  async function ensureSearchUi(){
    if(state.uiLoaded||!spyActive())return state.uiLoaded;
    if(uiPromise)return uiPromise;
    state.uiLoading=true;
    uiPromise=(async()=>{
      try{
        await loadScript("v10-41-r32-spy-search-ui-owner.js","data-ccg-r32-spy-search-ui-owner",()=>Boolean(window.CCGLostSizzlerV141R32SpySearchUiOwner));
        state.uiLoaded=true;state.uiLoads++;state.uiLastError="";return true
      }catch(error){state.uiLastError=String(error?.message||error);console.warn("[Lost Sizzler r32] Spy search UI bridge failed safely",error);return false}
      finally{state.uiLoading=false;uiPromise=null}
    })();
    return uiPromise
  }

  async function ensureLoaded(){
    if(state.loaded||!spyActive())return state.loaded;
    if(loadPromise)return loadPromise;
    state.loading=true;
    loadPromise=(async()=>{
      try{
        await loadScript("v10-41-r32-spy-overhaul.js","data-ccg-r32-spy-overhaul",()=>Boolean(window.CCGLostSizzlerV141R32SpyOverhaul));
        await loadScript("v10-41-r32-spy-packet-owner.js","data-ccg-r32-spy-packet-owner",()=>Boolean(window.CCGLostSizzlerV141R32SpyPacketOwner));
        await loadScript("v10-41-r35-spy-rules-hardening.js","data-ccg-r35-spy-rules-hardening",()=>Boolean(window.CCGLostSizzlerV141R35SpyRulesHardening));
        state.hardeningLoaded=true;
        await loadScript("v10-41-r35-spy-knockout-finalizer.js","data-ccg-r35-spy-knockout-finalizer",()=>Boolean(window.CCGLostSizzlerV141R35SpyKnockoutFinalizer));
        await loadScript("v10-41-r34-spy-fullscreen-ui.js","data-ccg-r34-spy-fullscreen-ui",()=>Boolean(window.CCGLostSizzlerV141R34SpyFullscreenUi));
        state.fullscreenUiLoaded=true;
        await ensureSearchUi();
        await loadScript("v10-41-r36-spy-perfection.js","data-ccg-r36-spy-perfection",()=>Boolean(window.CCGLostSizzlerV141R36SpyPerfection));
        state.perfectionLoaded=true;
        state.loaded=true;state.loads++;state.lastError="";return true
      }catch(error){state.lastError=String(error?.message||error);console.warn("[Lost Sizzler r32] Spy lazy load failed safely",error);return false}
      finally{state.loading=false;loadPromise=null}
    })();
    return loadPromise
  }

  function replayQueuedAction(code){
    const key=code==="KeyE"?"e":code==="KeyT"?"t":"x";
    dispatchEvent(new KeyboardEvent("keydown",{code,key,bubbles:true,cancelable:true}));
    dispatchEvent(new KeyboardEvent("keyup",{code,key,bubbles:true,cancelable:true}));
  }

  function queueSearchFeedback(){
    try{
      const api=window.CCGLostSizzlerV141UiSpyPerformance;
      if(api?.beginSearchFeedback?.()){state.queuedSearchFeedbacks++;return true}
    }catch(_){}
    return false
  }

  function bridgeSearchTarget(){
    try{
      const ui=window.CCGLostSizzlerV141UiSpyPerformance,target=ui?.nearSpyFurniture?.(),physical=target?.near;
      if(!physical?.spyFurniture)return false;
      const match=window.CCGLostSizzlerSpecialModes?.active?.state,targetId=String(target?.id||physical.logicalFurnitureId||"");
      const room=match?.map?.rooms?.find?.(row=>(row?.furniture||[]).some(item=>String(item?.id||"")===targetId));
      if(!room?.id||!targetId)return false;
      let changed=false;
      if(!physical.spyR32Furniture){physical.spyR32Furniture=true;changed=true}
      if(String(physical.logicalFurnitureId||"")!==targetId){physical.logicalFurnitureId=targetId;changed=true}
      if(String(physical.logicalRoomId||"")!==String(room.id)){physical.logicalRoomId=room.id;changed=true}
      const matchPlayer=match?.players?.find?.(row=>String(row?.id||"")===actorId())||match?.players?.[0]||null;
      if(matchPlayer&&String(matchPlayer.roomId||"")!==String(room.id)){matchPlayer.roomId=room.id;state.searchRoomBridges++}
      if(changed)state.searchTargetBridges++;
      return true
    }catch(_){return false}
  }

  function directSearchAction(){
    if(!spyActive())return false;
    const owner=overhaul();if(typeof owner?.beginSearch!=="function")return false;
    bridgeSearchTarget();
    const started=Boolean(owner.beginSearch());
    if(started){state.directSearchActions++;return true}
    if(owner?.state?.search)return true;
    return queueSearchFeedback()
  }

  function queueOwnerAction(code){
    if(!OWNER_ACTION_CODES.has(code)||!spyActive())return false;
    if(!state.pendingActionCode){state.pendingActionCode=code;state.queuedActions++;if(code==="KeyE")queueSearchFeedback()}
    if(pendingActionPromise)return true;
    pendingActionPromise=(async()=>{
      const loaded=await ensureLoaded();await ensureSearchUi();
      const queued=state.pendingActionCode;state.pendingActionCode="";
      if(!loaded||!spyActive()||!queued)return false;
      replayQueuedAction(queued);state.replayedActions++;return true
    })().finally(()=>{pendingActionPromise=null});
    return true
  }

  function dispatchSearchAction(){
    if(!spyActive())return false;
    lastSearchDispatchAt=perfNow();state.searchKeyDowns++;
    if(state.loaded&&typeof overhaul()?.beginSearch==="function")return directSearchAction();
    return queueOwnerAction("KeyE")
  }

  function onKeyDown(event){
    if(!spyActive()||event?.repeat)return;const code=String(event?.code||"");
    if(code==="KeyF"){
      // game-main has already handled F as fullscreen; stop later Spy compatibility handlers.
      event.preventDefault?.();event.stopImmediatePropagation?.();return
    }
    if(!OWNER_ACTION_CODES.has(code))return;
    if(code==="KeyE"){
      event.preventDefault?.();event.stopPropagation?.();dispatchSearchAction();return
    }
    if(state.loaded)return;
    event.preventDefault?.();event.stopPropagation?.();queueOwnerAction(code)
  }

  function onKeyUp(event){
    if(!spyActive()||String(event?.code||"")!=="KeyE")return;
    const owner=overhaul(),recent=perfNow()-lastSearchDispatchAt<140,searchActive=Boolean(owner?.state?.search),searchQueued=state.pendingActionCode==="KeyE";
    if(recent&&(searchActive||searchQueued))return;
    event.preventDefault?.();event.stopPropagation?.();state.searchKeyUpFallbacks++;
    if(state.loaded&&typeof owner?.beginSearch==="function")directSearchAction();else queueOwnerAction("KeyE")
  }

  function monitor(){
    if(spyActive()){ensureSearchUi();ensureLoaded()}
    else{state.pendingActionCode="";lastSearchDispatchAt=0}
  }

  addEventListener("keydown",onKeyDown,true);addEventListener("keyup",onKeyUp,true);
  monitor();state.timer=setInterval(monitor,MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0;state.pendingActionCode="";lastSearchDispatchAt=0},{once:true});

  window.CCGLostSizzlerV141R32SpyLoader={ensureLoaded,ensureSearchUi,queueOwnerAction,directSearchAction,bridgeSearchTarget,dispatchSearchAction,get state(){return state}};
})();