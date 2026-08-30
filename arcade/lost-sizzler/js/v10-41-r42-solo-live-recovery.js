/* The Lost Sizzler V10.41 r42 — standard Solo live render/combat recovery.
 *
 * Player feedback exposed two gaps that the earlier panel-return protections did
 * not cover: a silently black gameplay canvas during ordinary Solo play/floor
 * descent, and an attack path that could remain unavailable without a visible
 * pause/inventory panel. This guard is deliberately restricted to the normal
 * Solo Dungeon. It never owns Weekly Vault, Tutorial, Split Screen, Horde, Spy
 * or online Dungeon state.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R42_SOLO_LIVE_RECOVERY__)return;
  window.__CCG_LOST_SIZZLER_V141_R42_SOLO_LIVE_RECOVERY__=true;

  const MONITOR_MS=120,PROBE_MS=200,BACKUP_MS=700,STALL_MS=1800,ATTACK_INTENT_MS=1400;
  const ACTIVE_SPECIAL_MODES=new Set(["horde-survivor","sizzler-saboteurs"]);
  const BLOCKING_OVERLAYS=["pause","inventory-panel","item-info-panel","named-dossier-panel","shop-panel","save-panel","level-up","floor-complete","artefact-choice-panel","end"];
  const state={
    timer:0,renderInstalled:false,transitionInstalled:false,renderSource:null,renderGuard:null,
    renderCalls:0,renderErrors:0,lastProbeAt:0,lastBackupAt:0,blackProbeStreak:0,blackRecoveries:0,renderRecoveryQueued:false,lastRecoveryAt:0,
    backupCanvas:null,backupCtx:null,probeCanvas:null,probeCtx:null,lastGoodReady:false,
    transitionRecoveries:0,lastTransitionFloor:0,observedFloor:0,transitionPendingFloor:0,
    attackIntents:0,lastAttackIntentAt:0,combatRepairs:0,orphanModeRepairs:0,
    fireObserved:null,fireStallSince:0,stunObserved:null,stunStallSince:0,controlLockSince:0,lastError:""
  };

  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const finite=value=>Number.isFinite(Number(value));
  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const tutorialOwned=()=>{
    try{
      const ts=window.CCGLostSizzlerOnboardingV120?.state;
      return Boolean(ts?.active||ts?.tutorialRequested||ts?.forceTutorial||document.body?.dataset?.tutorialActive==="true")
    }catch(_){return false}
  };
  const editable=target=>{try{return Boolean(target?.closest?.("input,textarea,select,[contenteditable='true'],[contenteditable='']"))}catch(_){return false}};
  const visible=id=>{const node=document.getElementById(id);return Boolean(node&&!node.classList.contains("hidden"))};
  const blockingOverlayVisible=()=>BLOCKING_OVERLAYS.some(visible);

  function standardSoloRun(){
    if(document.body?.dataset?.runActive!=="true"||tutorialOwned())return false;
    const special=specialType();if(special||ACTIVE_SPECIAL_MODES.has(special))return false;
    try{
      if(!run||run.daily||!p1||p2||!world||!host)return false;
      if(String(playMode||"")!=="solo"||document.body?.dataset?.hordeSolo==="true")return false;
      if(Boolean(net?.connected))return false;
      return true
    }catch(_){return false}
  }
  const standardSoloPlaying=()=>{try{return standardSoloRun()&&mode==="playing"}catch(_){return false}};

  function sourceHasMarker(fn,marker){
    let current=fn;
    for(let depth=0;current&&depth<12;depth++){
      if(current?.[marker])return true;
      current=current.__ccgOriginal||current.__ccgV141ModeOwnedSource||current.__ccgV141R31Original||null
    }
    return false
  }

  function ensureRenderCanvases(){
    try{
      if(!state.probeCanvas){state.probeCanvas=document.createElement("canvas");state.probeCanvas.width=20;state.probeCanvas.height=12;state.probeCtx=state.probeCanvas.getContext("2d",{willReadFrequently:true})}
      if(!state.backupCanvas){state.backupCanvas=document.createElement("canvas");state.backupCtx=state.backupCanvas.getContext("2d")}
      if(typeof canvas!=="undefined"&&canvas&&(state.backupCanvas.width!==canvas.width||state.backupCanvas.height!==canvas.height)){
        state.backupCanvas.width=Math.max(1,canvas.width);state.backupCanvas.height=Math.max(1,canvas.height);state.lastGoodReady=false
      }
      return Boolean(state.probeCtx&&state.backupCtx)
    }catch(_){return false}
  }

  function canvasLooksBlack(){
    if(!ensureRenderCanvases()||typeof canvas==="undefined"||!canvas||canvas.width<2||canvas.height<2)return false;
    try{
      state.probeCtx.clearRect(0,0,20,12);state.probeCtx.drawImage(canvas,0,0,canvas.width,canvas.height,0,0,20,12);
      const data=state.probeCtx.getImageData(0,0,20,12).data;let lit=0;
      for(let i=0;i<data.length;i+=4){if(data[i]>16||data[i+1]>16||data[i+2]>16){lit++;if(lit>=5)return false}}
      return true
    }catch(_){return false}
  }

  function captureGoodFrame(){
    if(!standardSoloPlaying()||!ensureRenderCanvases()||typeof canvas==="undefined"||!canvas||canvas.width<2||canvas.height<2)return false;
    try{
      state.backupCtx.clearRect(0,0,state.backupCanvas.width,state.backupCanvas.height);state.backupCtx.drawImage(canvas,0,0);state.lastGoodReady=true;state.lastBackupAt=perfNow();return true
    }catch(_){return false}
  }

  function restoreGoodFrame(){
    if(!state.lastGoodReady||typeof ctx==="undefined"||!ctx||!state.backupCanvas||typeof canvas==="undefined"||!canvas)return false;
    try{ctx.drawImage(state.backupCanvas,0,0,canvas.width,canvas.height);state.blackRecoveries++;state.lastRecoveryAt=perfNow();return true}catch(_){return false}
  }

  function resetFrameState(){
    try{if(typeof last!=="undefined")last=perfNow()}catch(_){}
    try{cameras?.clear?.()}catch(_){}
    try{window.__CCG_LOST_SIZZLER_SCHEDULE_RESIZE__?.()}catch(_){}
    try{if(typeof resizeGameCanvas==="function")resizeGameCanvas()}catch(_){}
  }

  function queueRenderRecovery(reason="black canvas"){
    if(state.renderRecoveryQueued||!standardSoloRun())return false;
    state.renderRecoveryQueued=true;
    setTimeout(()=>{
      state.renderRecoveryQueued=false;if(!standardSoloRun())return;
      try{
        repairOrphanMode(reason);resetFrameState();
        const source=state.renderSource;
        if(typeof source==="function"&&source!==state.renderGuard)source.call(window);
        try{document.getElementById("game")?.focus?.({preventScroll:true})}catch(_){}
        state.lastRecoveryAt=perfNow();state.lastError=""
      }catch(error){state.lastError=String(error?.message||error);try{console.warn("[Lost Sizzler r42] Solo render recovery failed safely",error)}catch(_){}}
    },0);
    return true
  }

  function inspectCanvas(force=false){
    if(!standardSoloPlaying())return{active:false,black:false,recovered:false,streak:state.blackProbeStreak};
    const now=perfNow();if(!force&&now-state.lastProbeAt<PROBE_MS)return{active:true,black:null,recovered:false,streak:state.blackProbeStreak};
    state.lastProbeAt=now;const black=canvasLooksBlack();let recovered=false;
    if(black){
      state.blackProbeStreak++;
      if(state.blackProbeStreak>=2){recovered=restoreGoodFrame();queueRenderRecovery("live black-canvas watchdog");state.blackProbeStreak=0}
    }else{
      state.blackProbeStreak=0;if(!state.lastGoodReady||now-state.lastBackupAt>=BACKUP_MS)captureGoodFrame()
    }
    return{active:true,black,recovered,streak:state.blackProbeStreak}
  }

  function installRenderGuard(){
    if(!standardSoloRun())return false;
    const current=window.render;if(typeof current!=="function")return false;
    if(current===state.renderGuard||current.__ccgV141R42SoloBlackGuard){state.renderGuard=current;state.renderInstalled=true;return true}
    const original=current,retainedPostPlaytest=sourceHasMarker(original,"__ccgV141PostPlaytestRender"),retainedR28=sourceHasMarker(original,"__ccgV141R28NoHordeBanner");
    const wrapped=function renderV141R42SoloLiveGuard(){
      state.renderCalls++;
      try{
        const result=original.apply(this,arguments);
        if(standardSoloPlaying())inspectCanvas(false);
        return result
      }catch(error){
        state.renderErrors++;state.lastError=String(error?.message||error);restoreGoodFrame();queueRenderRecovery("render exception");throw error
      }
    };
    wrapped.__ccgV141R42SoloBlackGuard=true;wrapped.__ccgOriginal=original;
    // These owners remain underneath r42. Preserve only their recognition
    // markers so their monitors do not repeatedly wrap the same retained work.
    if(retainedPostPlaytest)wrapped.__ccgV141PostPlaytestRender=true;
    if(retainedR28)wrapped.__ccgV141R28NoHordeBanner=true;
    state.renderSource=original;state.renderGuard=wrapped;window.render=wrapped;state.renderInstalled=true;return true
  }

  function repairOrphanMode(reason="live Solo watchdog"){
    if(!standardSoloRun()||blockingOverlayVisible())return false;
    try{
      if(!["paused","inventory","dossier","saveprompt"].includes(String(mode||"")))return false;
      mode="playing";input?.clear?.();state.orphanModeRepairs++;state.lastRecoveryAt=perfNow();
      try{document.getElementById("game")?.focus?.({preventScroll:true})}catch(_){}
      return reason
    }catch(_){return false}
  }

  function noteAttackIntent(){
    if(!standardSoloRun()||blockingOverlayVisible())return false;
    state.attackIntents++;state.lastAttackIntentAt=perfNow();repairOrphanMode("attack input with orphaned mode");return true
  }

  function trackStall(value,valueKey,sinceKey,now){
    if(!finite(value)||Number(value)<=0){state[valueKey]=null;state[sinceKey]=0;return 0}
    const n=Number(value),previous=state[valueKey];
    if(previous==null||Math.abs(Number(previous)-n)>.25){state[valueKey]=n;state[sinceKey]=now;return 0}
    if(!state[sinceKey])state[sinceKey]=now;
    return now-state[sinceKey]
  }

  function repairCombatLiveness(){
    try{window.CCGLostSizzlerV141PostPlaytestStability?.repairSoloFireState?.()}catch(_){}
    if(!standardSoloPlaying()||blockingOverlayVisible())return false;
    const now=perfNow(),recentIntent=now-state.lastAttackIntentAt<=ATTACK_INTENT_MS;
    if(!recentIntent)return false;
    try{if(!p1||Number(p1.health||0)<=0||Number(p1.mana||0)<=0)return false}catch(_){return false}
    let repaired=false;
    try{
      if(typeof fire1!=="undefined"){
        if(!finite(fire1)||Number(fire1)<0||Number(fire1)>2500){fire1=0;state.fireObserved=null;state.fireStallSince=0;repaired=true}
        else if(trackStall(fire1,"fireObserved","fireStallSince",now)>=STALL_MS){fire1=0;state.fireObserved=null;state.fireStallSince=0;repaired=true}
      }
    }catch(_){}
    try{
      const stun=Number(p1.hitStunMs||0);
      if(!finite(stun)||stun<0){p1.hitStunMs=0;state.stunObserved=null;state.stunStallSince=0;repaired=true}
      else if(trackStall(stun,"stunObserved","stunStallSince",now)>=STALL_MS){p1.hitStunMs=0;state.stunObserved=null;state.stunStallSince=0;repaired=true}
    }catch(_){}
    try{
      const locked=Boolean(p1.controlLocked||p1.controlsLocked);
      if(locked){if(!state.controlLockSince)state.controlLockSince=now;if(now-state.controlLockSince>=STALL_MS){if("controlLocked" in p1)p1.controlLocked=false;if("controlsLocked" in p1)p1.controlsLocked=false;state.controlLockSince=0;repaired=true}}
      else state.controlLockSince=0
    }catch(_){}
    if(repaired){state.combatRepairs++;state.lastRecoveryAt=now;try{document.getElementById("game")?.focus?.({preventScroll:true})}catch(_){}}
    return repaired
  }

  function recoverFloorTransition(expectedFloor=0){
    if(!standardSoloRun())return false;
    let currentFloor=0;try{currentFloor=Number(run?.floor)||0;if(expectedFloor&&currentFloor!==Number(expectedFloor))return false}catch(_){return false}
    if(currentFloor&&state.lastTransitionFloor===currentFloor&&perfNow()-state.lastRecoveryAt<250)return false;

    // Internal combat/frame state is safe to normalise even while the legitimate
    // Floor checkpoint overlay is visible. Presentation ownership stays with the
    // overlay until it closes; r42 never dismisses it or steals keyboard focus.
    try{if(typeof fire1!=="undefined")fire1=0;if(typeof fireBuffer1!=="undefined")fireBuffer1=0}catch(_){}
    try{if(p1){p1.hitStunMs=0;if("controlLocked" in p1)p1.controlLocked=false;if("controlsLocked" in p1)p1.controlsLocked=false}}catch(_){}
    try{input?.clear?.()}catch(_){}
    resetFrameState();

    const blocked=blockingOverlayVisible();
    if(!blocked){
      try{if(typeof window.render==="function")window.render()}catch(error){state.lastError=String(error?.message||error)}
      try{document.getElementById("game")?.focus?.({preventScroll:true})}catch(_){}
    }
    state.transitionRecoveries++;state.lastTransitionFloor=currentFloor;state.observedFloor=currentFloor;state.lastRecoveryAt=perfNow();return true
  }

  function scheduleTransitionRecovery(floor){
    floor=Math.max(1,Math.floor(Number(floor)||0));if(!floor)return false;
    if(state.transitionPendingFloor===floor)return false;
    state.transitionPendingFloor=floor;
    const recover=()=>recoverFloorTransition(floor);
    queueMicrotask(recover);
    try{requestAnimationFrame(recover)}catch(_){}
    setTimeout(()=>{recover();if(state.transitionPendingFloor===floor)state.transitionPendingFloor=0},80);
    return true
  }

  function onDescendIntent(event){
    const button=event?.target?.closest?.("#descend-btn");if(!button||!standardSoloRun())return;
    let before=0;try{before=Number(run?.floor)||0}catch(_){return}
    queueMicrotask(()=>{
      if(!standardSoloRun())return;
      let after=before;try{after=Number(run?.floor)||before}catch(_){return}
      if(after>before){state.observedFloor=after;scheduleTransitionRecovery(after)}
    })
  }

  function installTransitionGuard(){
    if(state.transitionInstalled)return true;
    document.addEventListener("click",onDescendIntent,true);state.transitionInstalled=true;
    try{state.observedFloor=standardSoloRun()?Number(run?.floor)||0:0}catch(_){state.observedFloor=0}
    return true
  }

  function watchFloorAdvance(){
    if(!standardSoloRun()){state.observedFloor=0;state.transitionPendingFloor=0;return false}
    let current=0;try{current=Number(run?.floor)||0}catch(_){return false}
    if(!current)return false;
    if(!state.observedFloor){state.observedFloor=current;return false}
    const advanced=current>state.observedFloor;state.observedFloor=current;
    if(advanced)return scheduleTransitionRecovery(current);
    return false
  }

  function onKeyDown(event){
    if(String(event?.code||"")!=="Space"||editable(event?.target))return;
    noteAttackIntent()
  }

  function monitor(){
    if(standardSoloRun()){
      installRenderGuard();installTransitionGuard();watchFloorAdvance();repairOrphanMode();repairCombatLiveness();
      if(standardSoloPlaying())inspectCanvas(false)
    }else{
      state.fireObserved=null;state.fireStallSince=0;state.stunObserved=null;state.stunStallSince=0;state.controlLockSince=0;state.blackProbeStreak=0;state.observedFloor=0;state.transitionPendingFloor=0
    }
  }

  addEventListener("keydown",onKeyDown,true);
  installTransitionGuard();monitor();state.timer=setInterval(monitor,MONITOR_MS);
  addEventListener("pagehide",()=>{
    if(state.timer)clearInterval(state.timer);state.timer=0;
    removeEventListener("keydown",onKeyDown,true);document.removeEventListener("click",onDescendIntent,true)
  },{once:true});

  window.CCGLostSizzlerV141R42SoloLiveRecovery={
    standardSoloRun,standardSoloPlaying,blockingOverlayVisible,installRenderGuard,installTransitionGuard,watchFloorAdvance,inspectCanvas,captureGoodFrame,restoreGoodFrame,
    repairOrphanMode,noteAttackIntent,repairCombatLiveness,recoverFloorTransition,monitor,get state(){return state}
  };
})();
