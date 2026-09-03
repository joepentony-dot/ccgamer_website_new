/* The Lost Sizzler V10.41 r32/r59 — Spy-only lazy loader.
 *
 * The full overhaul has no reason to install during Solo, Horde or ordinary
 * online Dungeon sessions. Keep those startup/network paths untouched and load
 * the Spy owners only after Sizzler Saboteurs is active. This loader owns TAB
 * from the first Spy keypress, detaches the stale r27 F/TAB keyboard owner and
 * provides one idempotent Spy-mode F fullscreen dispatch shared with game-main.
 * r59 is loaded globally from here so pause/resume timing is stabilised for
 * every game mode before desktop packaging. Spy activation is observed from the
 * authoritative mode attributes instead of waking a cross-mode polling timer.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R32_SPY_LOADER__)return;
  window.__CCG_LOST_SIZZLER_V141_R32_SPY_LOADER__=true;

  const MODE_ID="sizzler-saboteurs";
  const OWNER_ACTION_CODES=new Set(["KeyE","KeyT","KeyX"]);
  const fullscreenEvents=new WeakSet();
  const state={
    timer:0,loading:false,loaded:false,loads:0,lastError:"",
    uiLoading:false,uiLoaded:false,uiLoads:0,uiLastError:"",
    hardeningLoaded:false,fullscreenUiLoaded:false,perfectionLoaded:false,trapPresentationLoaded:false,r58Loaded:false,
    r59Loading:false,r59Loaded:false,r59Loads:0,r59LastError:"",
    r56Guarded:false,r56GuardInstalls:0,r56OwnerSkips:0,r27KeyDetached:false,r27KeyDetachments:0,
    modeObserverInstalled:false,modeObserverUnsupported:false,modeSignals:0,spyActivationSignals:0,
    tabTogglePending:false,tabToggles:0,tabLoadBridges:0,fullscreenKeyCalls:0,fullscreenDuplicateGuards:0,fieldKitLabelRepairs:0,
    pendingActionCode:"",queuedActions:0,replayedActions:0,queuedSearchFeedbacks:0,directSearchActions:0,
    searchTargetBridges:0,searchRoomBridges:0,searchKeyDowns:0,searchKeyUpFallbacks:0
  };
  let loadPromise=null,uiPromise=null,r59Promise=null,pendingActionPromise=null,lastSearchDispatchAt=0,modeObserver=null;

  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID}catch(_){return false}};
  const revision=()=>String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"latest").trim();
  const overhaul=()=>{try{return window.CCGLostSizzlerV141R32SpyOverhaul||null}catch(_){return null}};
  const actorId=()=>{try{return String(net?.sessionId||p1?.id||"P1")}catch(_){return"P1"}};
  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};

  function guardR56SpyOwnership(){
    let api=null;try{api=window.CCGLostSizzlerV141R56PlaytestCompletion||null}catch(_){return false}
    if(!api||typeof api.installOwners!=="function")return false;
    const current=api.installOwners;
    if(current.__ccgV141R58SpySafe){state.r56Guarded=true;return true}
    const wrapped=function installOwnersR58SpySafe(){
      if(spyActive()){state.r56OwnerSkips++;return true}
      return current.apply(this,arguments)
    };
    wrapped.__ccgV141R58SpySafe=true;wrapped.__ccgOriginal=current;api.installOwners=wrapped;
    state.r56Guarded=true;state.r56GuardInstalls++;return true
  }

  function detachLegacyR27KeyOwner(){
    const api=window.CCGLostSizzlerV141R27SpyIsolation;
    if(!api||typeof api.onSpyKeyDown!=="function")return false;
    if(state.r27KeyDetached)return true;
    try{removeEventListener("keydown",api.onSpyKeyDown,true);state.r27KeyDetached=true;state.r27KeyDetachments++;return true}catch(_){return false}
  }

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

  async function ensureR59(){
    if(state.r59Loaded||window.CCGLostSizzlerV141R59LiveRegressionFixes){state.r59Loaded=true;return true}
    if(r59Promise)return r59Promise;
    state.r59Loading=true;
    r59Promise=(async()=>{
      try{
        await loadScript("v10-41-r59-live-regression-fixes.js","data-ccg-r59-live-regression-fixes",()=>Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes));
        state.r59Loaded=true;state.r59Loads++;state.r59LastError="";return true
      }catch(error){state.r59LastError=String(error?.message||error);console.warn("[Lost Sizzler r32] r59 live regression authority failed safely",error);return false}
      finally{state.r59Loading=false;r59Promise=null}
    })();
    return r59Promise
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
        await ensureR59();
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
        await loadScript("v10-41-r45-spy-trap-presentation.js","data-ccg-r45-spy-trap-presentation",()=>Boolean(window.CCGLostSizzlerV141R45SpyTrapPresentation));
        state.trapPresentationLoaded=true;
        await loadScript("v10-41-r58-spy-overhaul.js","data-ccg-r58-spy-overhaul",()=>Boolean(window.CCGLostSizzlerV141R58SpyOverhaul));
        state.r58Loaded=true;
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

  function forceSharedPlaying(){
    if(!spyActive())return false;
    try{if(typeof mode!=="undefined"&&["inventory","dossier"].includes(String(mode)))mode="playing"}catch(_){}
    try{UI?.inventory?.classList?.add?.("hidden")}catch(_){}
    return true
  }

  async function toggleSpyInventoryFromTab(){
    if(!spyActive()||state.tabTogglePending)return false;
    const readyOwner=overhaul();
    if(typeof readyOwner?.setInventory==="function"){
      forceSharedPlaying();readyOwner.setInventory(!Boolean(readyOwner.state?.inventoryOpen));state.tabToggles++;return true
    }
    state.tabTogglePending=true;state.tabLoadBridges++;
    try{
      const loaded=await ensureLoaded();if(!loaded||!spyActive())return false;
      forceSharedPlaying();
      const owner=overhaul();if(typeof owner?.setInventory!=="function")return false;
      owner.setInventory(!Boolean(owner.state?.inventoryOpen));state.tabToggles++;return true
    }catch(error){state.lastError=String(error?.message||error);return false}
    finally{state.tabTogglePending=false}
  }

  function repairFieldKitLabels(){
    if(!spyActive())return false;let repaired=0;
    try{
      for(const key of document.querySelectorAll("kbd")){
        if(String(key.textContent||"").trim().toUpperCase()!=="F")continue;
        const text=String(key.parentElement?.textContent||key.closest?.("div")?.textContent||"").toUpperCase();
        if(!text.includes("FIELD KIT"))continue;
        key.textContent="TAB";repaired++;
      }
      const quick=document.getElementById("quick-specials");if(quick&&/\bF\s+FIELD KIT\b/i.test(quick.textContent||"")){quick.textContent=String(quick.textContent||"").replace(/\bF\s+FIELD KIT\b/gi,"TAB FIELD KIT");repaired++}
      const hint=document.getElementById("fullscreen-hint");if(hint&&/<kbd>F<\/kbd>\s*FIELD KIT/i.test(hint.innerHTML)){hint.innerHTML=hint.innerHTML.replace(/<kbd>F<\/kbd>\s*FIELD KIT/gi,"<kbd>TAB</kbd> FIELD KIT");repaired++}
      const notice=document.getElementById("inventory-mobile-notice");if(notice&&/\bF\s+FIELD KIT\b/i.test(notice.textContent||"")){notice.textContent=String(notice.textContent||"").replace(/\bF\s+FIELD KIT\b/gi,"TAB FIELD KIT");repaired++}
    }catch(_){}
    state.fieldKitLabelRepairs+=repaired;return repaired>0
  }

  function clearPendingActionState(){state.pendingActionCode="";lastSearchDispatchAt=0;return true}

  function ensureSpyOwners(reason="Spy activation"){
    if(!spyActive())return false;
    state.spyActivationSignals++;
    guardR56SpyOwnership();detachLegacyR27KeyOwner();ensureR59();
    repairFieldKitLabels();ensureSearchUi();ensureLoaded();
    return Boolean(reason)
  }

  function handleModeSignal(reason="mode attribute transition"){
    state.modeSignals++;
    if(spyActive())return ensureSpyOwners(reason);
    clearPendingActionState();return false
  }

  function installModeObserver(){
    if(modeObserver){state.modeObserverInstalled=true;return true}
    if(typeof MutationObserver!=="function"||!document.body){state.modeObserverUnsupported=true;return false}
    modeObserver=new MutationObserver(records=>{
      for(const record of records){
        if(record?.type!=="attributes")continue;
        const name=String(record.attributeName||"");
        if(name!=="data-special-mode"&&name!=="data-mode-controller")continue;
        handleModeSignal(`attribute:${name}`);break
      }
    });
    modeObserver.observe(document.body,{attributes:true,attributeFilter:["data-special-mode","data-mode-controller"]});
    state.modeObserverInstalled=true;return true
  }

  function prime(){
    guardR56SpyOwnership();detachLegacyR27KeyOwner();ensureR59();installModeObserver();
    if(spyActive())ensureSpyOwners("initial Spy state");else clearPendingActionState();
    return true
  }

  function handleSpyFullscreenKey(event){
    if(!spyActive()||String(event?.code||"")!=="KeyF")return false;
    event.preventDefault?.();
    if(fullscreenEvents.has(event)){
      state.fullscreenDuplicateGuards++;event.stopImmediatePropagation?.();return true
    }
    fullscreenEvents.add(event);
    if(!event?.repeat){
      try{if(typeof toggleFullscreen==="function"){toggleFullscreen();state.fullscreenKeyCalls++}}catch(error){state.lastError=String(error?.message||error)}
    }
    event.stopImmediatePropagation?.();return true
  }

  function onKeyDown(event){
    if(!spyActive())return;const code=String(event?.code||"");
    if(code==="Tab"||code==="KeyF"||OWNER_ACTION_CODES.has(code))ensureSpyOwners(`key:${code}`);
    if(code==="Tab"){
      event.preventDefault?.();event.stopImmediatePropagation?.();
      if(!event.repeat)toggleSpyInventoryFromTab();return
    }
    if(code==="KeyF"){handleSpyFullscreenKey(event);return}
    if(event?.repeat)return;
    if(!OWNER_ACTION_CODES.has(code))return;
    if(code==="KeyE"){
      event.preventDefault?.();event.stopPropagation?.();dispatchSearchAction();return
    }
    if(state.loaded)return;
    event.preventDefault?.();event.stopPropagation?.();queueOwnerAction(code)
  }

  function onKeyUp(event){
    if(!spyActive()||String(event?.code||"")!=="KeyE")return;
    ensureSpyOwners("key:KeyE-up");
    const owner=overhaul(),recent=perfNow()-lastSearchDispatchAt<140,searchActive=Boolean(owner?.state?.search),searchQueued=state.pendingActionCode==="KeyE";
    if(recent&&(searchActive||searchQueued))return;
    event.preventDefault?.();event.stopPropagation?.();state.searchKeyUpFallbacks++;
    if(state.loaded&&typeof owner?.beginSearch==="function")directSearchAction();else queueOwnerAction("KeyE")
  }

  addEventListener("keydown",onKeyDown,true);addEventListener("keyup",onKeyUp,true);
  prime();
  addEventListener("pagehide",()=>{
    if(modeObserver){modeObserver.disconnect();modeObserver=null}
    state.modeObserverInstalled=false;state.timer=0;clearPendingActionState()
  },{once:true});

  window.CCGLostSizzlerV141R32SpyLoader={
    ensureLoaded,ensureR59,ensureSearchUi,queueOwnerAction,directSearchAction,bridgeSearchTarget,dispatchSearchAction,toggleSpyInventoryFromTab,handleSpyFullscreenKey,
    detachLegacyR27KeyOwner,repairFieldKitLabels,guardR56SpyOwnership,ensureSpyOwners,handleModeSignal,installModeObserver,prime,get state(){return state}
  };
})();