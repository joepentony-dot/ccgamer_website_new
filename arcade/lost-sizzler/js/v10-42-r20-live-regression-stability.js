/* C64 Dungeon Carnage V10.42 r58 — non-FIRE live stability support.
 * FIRE ownership was retired in r58. This module preserves only presentation,
 * panel recovery, cursor, shop feedback, door-stall and frame-stall safeguards.
 */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R20LiveRegressionStability)return;

  const STALL_MS=120;
  const CURSOR_IDLE_MS=1600;
  const diagnostics={
    staleModeRecoveries:0,
    presentationRepairs:0,
    dossierKeyboardCloses:0,
    cursorHides:0,
    scoreDeltas:0,
    doorLagFreezes:0,
    frameStalls:0,
    stallClampInstalls:0,
    attackIntents:0,
    directAttackErrors:0,
    staleStunRepairs:0,
    controlLockRepairs:0,
    mobileFireFallbacks:0,
    mobileFireReleases:0
  };
  let cursorTimer=0,lastDoorTick=performance.now(),presentationResumeObserver=null;
  addEventListener("ccg:attack-intent",()=>{diagnostics.attackIntents++},{passive:true});

  const panelVisible=id=>{
    const node=document.getElementById(id);
    return Boolean(node&&!node.classList.contains("hidden"))
  };
  const currentMode=()=>{try{return typeof mode!=="undefined"?String(mode):""}catch(_){return""}};
  const finePointer=()=>window.matchMedia?.("(pointer: fine)")?.matches!==false;
  const spyActive=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")==="sizzler-saboteurs"}catch(_){return false}};
  const liveSession=()=>{
    try{
      const live=Boolean(run&&host&&p1),state=currentMode();
      return live&&!["menu","end"].includes(state)
    }catch(_){return false}
  };

  function focusGame(){
    try{
      if(typeof focusGameplayKeyboard==="function")focusGameplayKeyboard();
      else document.getElementById("game")?.focus?.({preventScroll:true})
    }catch(_){}
  }

  function activeRun(){
    if(document.body?.dataset?.runActive==="true")return true;
    if(!liveSession())return false;
    try{
      document.body.dataset.runActive="true";
      diagnostics.presentationRepairs++;
      focusGame()
    }catch(_){}
    return true
  }

  function restoreLivePresentationNow(reason="resume"){
    if(currentMode()!=="playing"||!liveSession())return false;
    const repaired=activeRun();
    try{window.CCGLostSizzlerV142R95MobileControls?.sync?.()}catch(_){}
    if(repaired)try{document.body.dataset.v142R20PresentationResume=String(reason)}catch(_){}
    return repaired
  }

  function recoverLivePresentation(reason="resume"){
    const repair=()=>restoreLivePresentationNow(reason);
    repair();queueMicrotask(repair);setTimeout(repair,0);setTimeout(repair,60);
    return true
  }

  function recoverOrphanedGameplayMode(){
    if(!activeRun())return false;
    const state=currentMode();
    const panelForMode={dossier:"named-dossier-panel",inventory:"inventory-panel",shop:"shop-panel",paused:"pause","level-up":"level-up"};
    const panelId=panelForMode[state];
    if(panelId&&!panelVisible(panelId)){
      try{mode="playing";diagnostics.staleModeRecoveries++}catch(_){}
    }
    return currentMode()==="playing"
  }

  function installPresentationResumeObserver(){
    if(presentationResumeObserver)return true;
    const targets=[document.getElementById("inventory-panel"),document.getElementById("pause")].filter(Boolean);
    if(!targets.length)return false;
    presentationResumeObserver=new MutationObserver(records=>{
      for(const record of records){
        const node=record.target;
        if(node instanceof Element&&node.classList.contains("hidden")){
          recoverLivePresentation(node.id==="pause"?"pause-close":"inventory-close");
          break
        }
      }
    });
    for(const node of targets)presentationResumeObserver.observe(node,{attributes:true,attributeFilter:["class"]});
    return true
  }

  function installPresentationResumeOwners(){
    let installed=false;
    try{
      if(typeof toggleInventory==="function"&&!toggleInventory.__ccgV142R20PresentationResume){
        const base=toggleInventory;
        toggleInventory=function toggleInventoryV142R20PresentationResume(...args){
          const returning=currentMode()==="inventory",result=base.apply(this,args);
          if(returning&&currentMode()==="playing")restoreLivePresentationNow("inventory-close-owner");
          return result
        };
        toggleInventory.__ccgV142R20PresentationResume=true;toggleInventory.__ccgOriginal=base;installed=true
      }
    }catch(_){}
    try{
      if(typeof returnToGameFromPanel==="function"&&!returnToGameFromPanel.__ccgV142R20PresentationResume){
        const base=returnToGameFromPanel;
        returnToGameFromPanel=function returnToGameFromPanelV142R20PresentationResume(...args){
          const returning=currentMode()==="inventory",result=base.apply(this,args);
          if(returning&&currentMode()==="playing")restoreLivePresentationNow("inventory-close-top-owner");
          return result
        };
        returnToGameFromPanel.__ccgV142R20PresentationResume=true;returnToGameFromPanel.__ccgOriginal=base;installed=true
      }
    }catch(_){}
    try{
      if(typeof closePauseMenu==="function"&&!closePauseMenu.__ccgV142R20PresentationResume){
        const base=closePauseMenu;
        closePauseMenu=function closePauseMenuV142R20PresentationResume(...args){
          const returning=currentMode()==="paused",result=base.apply(this,args);
          if(returning&&currentMode()==="playing")restoreLivePresentationNow("pause-close-owner");
          return result
        };
        closePauseMenu.__ccgV142R20PresentationResume=true;closePauseMenu.__ccgOriginal=base;installed=true
      }
    }catch(_){}
    return installed
  }

  try{
    if(typeof hideNamedDossier==="function"&&!hideNamedDossier.__ccgV142R20){
      const base=hideNamedDossier;
      hideNamedDossier=function(...args){
        const result=base(...args);
        try{if(activeRun()&&!panelVisible("named-dossier-panel")&&currentMode()==="dossier")mode="playing"}catch(_){}
        focusGame();scheduleCursorHide();
        return result
      };
      hideNamedDossier.__ccgV142R20=true;hideNamedDossier.__ccgOriginal=base
    }
  }catch(_){}

  document.addEventListener("keydown",event=>{
    if(event.code!=="Space"||!panelVisible("named-dossier-panel"))return;
    const target=event.target;
    if(target instanceof Element&&(target.matches("input,textarea,select,[contenteditable='true'],[contenteditable='']")||target.closest("input,textarea,select,[contenteditable='true'],[contenteditable='']")))return;
    event.preventDefault();event.stopImmediatePropagation();
    try{hideNamedDossier()}catch(_){document.getElementById("named-dossier-panel")?.classList.add("hidden")}
    diagnostics.dossierKeyboardCloses++
  },true);

  function interactiveOverlayVisible(){
    return ["menu","pause","inventory-panel","named-dossier-panel","shop-panel","save-panel","level-up","floor-complete","end","artefact-choice-panel","item-info-panel"].some(panelVisible)
  }
  function ensureCursorStyle(){
    if(document.getElementById("ccg-r20-cursor-style"))return;
    const style=document.createElement("style");
    style.id="ccg-r20-cursor-style";
    style.textContent="body.ccg-game-cursor-idle,body.ccg-game-cursor-idle *{cursor:none!important}";
    document.head.appendChild(style)
  }
  function showCursor(){
    document.body?.classList.remove("ccg-game-cursor-idle");
    if(cursorTimer){clearTimeout(cursorTimer);cursorTimer=0}
  }
  function hideCursorIfIdle(){
    cursorTimer=0;
    if(!activeRun()||!finePointer()||interactiveOverlayVisible())return;
    document.body?.classList.add("ccg-game-cursor-idle");diagnostics.cursorHides++
  }
  function scheduleCursorHide(){
    showCursor();
    if(!activeRun()||!finePointer()||interactiveOverlayVisible())return;
    cursorTimer=setTimeout(hideCursorIfIdle,CURSOR_IDLE_MS)
  }
  ensureCursorStyle();
  addEventListener("pointermove",scheduleCursorHide,{passive:true});
  addEventListener("pointerdown",scheduleCursorHide,{passive:true});
  addEventListener("keydown",()=>{if(activeRun()&&!interactiveOverlayVisible())scheduleCursorHide()},{passive:true});
  document.addEventListener("visibilitychange",()=>{showCursor();lastDoorTick=performance.now();if(!document.hidden&&liveSession())recoverLivePresentation("visibility-return")});
  addEventListener("focus",()=>{if(liveSession())recoverLivePresentation("focus-return")},{passive:true});

  function ensureScoreFeedback(){
    let rail=document.getElementById("shop-score-delta-rail");if(rail)return rail;
    const scoreNode=document.getElementById("shop-score");if(!scoreNode)return null;
    rail=document.createElement("span");rail.id="shop-score-delta-rail";rail.setAttribute("aria-live","polite");
    rail.style.cssText="display:inline-flex;flex-wrap:wrap;gap:5px;margin-left:8px;vertical-align:middle";
    scoreNode.insertAdjacentElement("afterend",rail);return rail
  }
  function showScoreDelta(amount){
    const value=Math.max(0,Math.round(Number(amount)||0));if(!value)return;
    const rail=ensureScoreFeedback();if(!rail)return;
    const chip=document.createElement("b");chip.className="shop-score-delta";chip.textContent=`−${value.toLocaleString()} SCORE`;
    chip.style.cssText="display:inline-block;padding:3px 6px;border:1px solid rgba(255,104,104,.65);border-radius:3px;color:#ff8b8b;background:rgba(48,8,16,.78);font:900 10px/1.2 'Courier New',monospace;letter-spacing:.25px";
    rail.appendChild(chip);diagnostics.scoreDeltas++;
    while(rail.children.length>6)rail.firstElementChild?.remove();
    setTimeout(()=>chip.remove(),4200)
  }
  try{
    if(typeof buyShopItem==="function"&&!buyShopItem.__ccgV142R20){
      const base=buyShopItem;
      buyShopItem=function(...args){
        let before=0;try{before=Math.max(0,Number(score)||0)}catch(_){}
        const result=base(...args);
        let after=before;try{after=Math.max(0,Number(score)||0)}catch(_){}
        if(result&&after<before)showScoreDelta(before-after);
        return result
      };
      buyShopItem.__ccgV142R20=true;buyShopItem.__ccgOriginal=base
    }
  }catch(_){}

  try{
    if(typeof updateDoors==="function"&&!updateDoors.__ccgV142R20){
      const base=updateDoors;
      updateDoors=function(...args){
        const now=performance.now(),gap=Math.max(0,now-lastDoorTick);lastDoorTick=now;
        if(gap>STALL_MS&&gap<600000){
          const freeze=Math.max(0,gap-16);
          try{
            for(const door of host?.doors||[])if(door?.opening){
              door.openingStart=Number(door.openingStart||now)+freeze;
              door.openAt=Number(door.openAt||now)+freeze;
              diagnostics.doorLagFreezes++
            }
          }catch(_){}
        }
        return base(...args)
      };
      updateDoors.__ccgV142R20=true;updateDoors.__ccgOriginal=base
    }
  }catch(_){}

  function installAuthoritativeLoopStallClamp(){
    const current=window.loop;
    if(typeof current!=="function")return false;
    if(current.__ccgV142R20LoopStallClamp===true)return true;
    const wrapped=function loopV142R20StallClamp(timestamp){
      const ownsNormalFrame=activeRun()&&currentMode()==="playing"&&!spyActive(),t=Number(timestamp);
      let maxAdvance=45,beforeElapsed=NaN,beforeFloorElapsed=NaN;
      if(ownsNormalFrame&&Number.isFinite(t)){
        try{
          const previous=typeof last!=="undefined"?Number(last):NaN;
          const gap=Number.isFinite(previous)?Math.max(0,t-previous):16;
          maxAdvance=Math.min(45,Math.max(0,gap||16));
          if(gap>STALL_MS&&gap<600000){last=t-16;maxAdvance=16;diagnostics.frameStalls++}
          beforeElapsed=Number(run?.elapsed);beforeFloorElapsed=Number(host?.floorElapsed)
        }catch(_){}
      }
      const result=current.call(this,timestamp);
      if(ownsNormalFrame){
        try{
          if(Number.isFinite(beforeElapsed)&&Number.isFinite(Number(run?.elapsed))&&Number(run.elapsed)-beforeElapsed>maxAdvance)run.elapsed=beforeElapsed+maxAdvance;
          if(Number.isFinite(beforeFloorElapsed)&&Number.isFinite(Number(host?.floorElapsed))&&Number(host.floorElapsed)-beforeFloorElapsed>maxAdvance)host.floorElapsed=beforeFloorElapsed+maxAdvance
        }catch(_){}
      }
      return result
    };
    try{for(const key of Object.keys(current))wrapped[key]=current[key]}catch(_){}
    wrapped.__ccgV141R29Stable=true;wrapped.__ccgV142R20LoopStallClamp=true;wrapped.__ccgOriginal=current;
    window.loop=wrapped;diagnostics.stallClampInstalls++;
    return window.loop===wrapped
  }

  function installStallClamp(){
    let installed=installAuthoritativeLoopStallClamp();
    const runtime=window.CCGLostSizzlerModeRuntime,boundary=runtime?.state?.sharedFrameBoundary;
    if(typeof boundary!=="function")return installed;
    if(boundary.__ccgV142R20StallClamp===true)return true;
    const stallSafeBoundary=function updateV142R20StallClamp(dt,...args){
      let safeDt=Number(dt);
      if(activeRun()&&currentMode()==="playing"&&!spyActive()&&Number.isFinite(safeDt)&&safeDt>STALL_MS&&safeDt<600000){
        safeDt=16;diagnostics.frameStalls++
      }
      return boundary.call(this,safeDt,...args)
    };
    try{for(const key of Object.keys(boundary))stallSafeBoundary[key]=boundary[key]}catch(_){}
    stallSafeBoundary.__ccgV141ModeFrameBoundary=true;stallSafeBoundary.__ccgV142R20StallClamp=true;stallSafeBoundary.__ccgOriginal=boundary;
    runtime.state.sharedFrameBoundary=stallSafeBoundary;diagnostics.stallClampInstalls++;
    return runtime.state.sharedFrameBoundary===stallSafeBoundary||installed
  }

  installStallClamp();installPresentationResumeObserver();installPresentationResumeOwners();
  addEventListener("ccg:v142-ready",()=>{installStallClamp();installPresentationResumeObserver();installPresentationResumeOwners()},{once:true});
  addEventListener("pagehide",()=>{
    showCursor();presentationResumeObserver?.disconnect?.();presentationResumeObserver=null;
    if(cursorTimer)clearTimeout(cursorTimer)
  },{once:true});

  window.CCGLostSizzlerV142R20LiveRegressionStability=Object.freeze({
    version:"V10.42-r58-non-fire-stability",
    gameplayOwnership:false,inputOwnership:false,fireOwnership:false,
    diagnostics,activeRun,liveSession,recoverOrphanedGameplayMode,
    restoreLivePresentationNow,recoverLivePresentation,
    installPresentationResumeObserver,installPresentationResumeOwners,
    showScoreDelta,installStallClamp
  });
})();
