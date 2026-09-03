/* The Lost Sizzler V10.41 r59 — live pause-clock and Spy regression authority.
 *
 * This finalizer owns release blockers reported after r58:
 * - pause/resume must never turn paused wall-clock time into gameplay recovery or
 *   allow more than one accepted simulation frame for the same RAF timestamp;
 * - the r58 Spy rules must stay authoritative after older compatibility layers
 *   have finished installing;
 * - standard Solo floor-entry autosaves must be committed synchronously from
 *   the canonical floor checkpoint transition rather than depend on click/timer
 *   scheduling under a heavily loaded browser run.
 *
 * Keyboard ownership for TAB/F is established by the r32 Spy loader. R29 remains
 * the public runtime/fault diagnostic surface while R59 owns the final RAF
 * callback, so R59 mirrors accepted-frame, duplicate-frame and stall accounting
 * into R29 without handing simulation ownership back to the older loop.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R59_LIVE_REGRESSION_FIXES__)return;
  window.__CCG_LOST_SIZZLER_V141_R59_LIVE_REGRESSION_FIXES__=true;

  const MONITOR_MS=40;
  const LONG_GAP_MS=500;
  const PAUSE_GUARD_MS=1200;
  const SOLO_MAX_STEP_MS=45;
  // The sustained lifecycle soak reproduced active visible RAF gaps a little
  // above one second after repeated pause/focus transitions. A 540 ms ceiling
  // discarded about 1.8 seconds of visible simulation time in one 60-second
  // stressed window. Preserve the canonical <=45 ms update slice, but allow a
  // single accepted visible Solo frame to recover up to 1080 ms through at most
  // 24 bounded substeps. Paused/hidden time still never reaches this path because
  // those lifecycle boundaries rebase the accepted RAF timestamp.
  const SOLO_MAX_VISIBLE_FRAME_MS=1080;
  const SOLO_MAX_STEPS=24;
  const state={
    timer:0,installed:false,clockInstalled:false,pauseWrapped:false,soloSaveTransitionInstalled:false,
    acceptedFrames:0,duplicateFramesSkipped:0,longGaps:0,longGapRecoveries:0,
    pausedGapsDiscarded:0,pauseBoundaries:0,lastAcceptedRafTimestamp:null,
    lastMode:"",suppressRecoveryUntil:0,lastPauseReason:"",lastError:"",
    faultBridges:0,diagnosticBridges:0,r58Reassertions:0,r58Ticks:0,soloSaveTransitionInstalls:0,soloFloorAutosaves:0,
    soloFrames:0,soloSubsteps:0,soloCatchupFrames:0,soloDiscardedVisibleMs:0,soloLastElapsed:0,soloLastSteps:0
  };

  let basePayDownCombatGap=null;

  const finite=value=>Number.isFinite(Number(value));
  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const currentMode=()=>{try{return String(mode||"")}catch(_){return""}};
  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type==="sizzler-saboteurs"||document.body?.dataset?.specialMode==="sizzler-saboteurs"}catch(_){return false}};
  const r29State=()=>{try{return window.CCGLostSizzlerV141R29?.state||null}catch(_){return null}};
  const soloDungeonPlaying=()=>{
    try{
      return currentMode()==="playing"&&!document.hidden&&document.body?.dataset?.runActive==="true"&&
        window.CCGLostSizzlerModeRuntime?.state?.activeId==="dungeon-solo"&&
        !window.CCGLostSizzlerSpecialModes?.active?.type&&!document.body?.dataset?.specialMode;
    }catch(_){return false}
  };

  function chainHas(fn,marker){
    const seen=new Set();let current=fn,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth<32){
      seen.add(current);try{if(current[marker])return true}catch(_){}
      try{current=current.__ccgOriginal||current.__ccgV141Original||null}catch(_){current=null}
      depth++;
    }
    return false
  }

  function noteFault(phase,error){
    const message=String(error?.message||error||"Unknown frame fault").slice(0,260),now=perfNow();
    state.lastError=message;
    try{
      const r29=r29State();
      if(r29){
        r29.frameFaults=Number(r29.frameFaults||0)+1;
        if(phase==="update")r29.updateFaults=Number(r29.updateFaults||0)+1;
        if(phase==="render")r29.renderFaults=Number(r29.renderFaults||0)+1;
        r29.lastFaultAt=now;r29.lastFaultMessage=message;state.faultBridges++;
      }
    }catch(_){}
    try{console.error(`[Lost Sizzler r59] ${phase} fault contained`,error)}catch(_){}
    return message
  }

  function noteDuplicateFrame(){
    state.duplicateFramesSkipped++;
    try{const r29=r29State();if(r29){r29.duplicateFramesSkipped=Number(r29.duplicateFramesSkipped||0)+1;state.diagnosticBridges++}}catch(_){}
    return true
  }

  function noteFrameStall(){
    state.longGaps++;
    try{const r29=r29State();if(r29){r29.frameStalls=Number(r29.frameStalls||0)+1;state.diagnosticBridges++}}catch(_){}
    return true
  }

  function setAcceptedRafTimestamp(value){
    state.lastAcceptedRafTimestamp=value;
    try{const r29=r29State();if(r29)r29.lastAcceptedRafTimestamp=value}catch(_){}
    return value
  }

  function normaliseAudioRate(){
    let repaired=0;
    try{
      for(const audio of document.querySelectorAll("audio")){
        const rate=Number(audio.playbackRate);
        if(Number.isFinite(rate)&&Math.abs(rate-1)>.001){audio.playbackRate=1;repaired++}
        const defaultRate=Number(audio.defaultPlaybackRate);
        if(Number.isFinite(defaultRate)&&Math.abs(defaultRate-1)>.001)audio.defaultPlaybackRate=1;
      }
    }catch(_){}
    return repaired
  }

  function markPauseBoundary(reason="pause transition"){
    const now=perfNow();
    state.pauseBoundaries++;state.lastPauseReason=String(reason||"pause transition");
    state.suppressRecoveryUntil=Math.max(state.suppressRecoveryUntil,now+PAUSE_GUARD_MS);
    setAcceptedRafTimestamp(null);
    state.lastMode=currentMode();
    state.soloLastElapsed=0;state.soloLastSteps=0;
    try{last=now}catch(_){}
    normaliseAudioRate();
    return true
  }

  function safeGapRecovery(gap){
    const modeNow=currentMode();
    if(!finite(gap)||Number(gap)<LONG_GAP_MS)return false;
    // A genuine pause/hidden transition is made safe by markPauseBoundary()
    // resetting the accepted RAF clock. Do not also suppress recovery merely
    // because a recent focus/pause boundary happened: while the game is visibly
    // playing, a real main-thread stall still has to pay down combat cooldowns,
    // hit-stun and retained control locks.
    if(modeNow!=="playing"||document.hidden){state.pausedGapsDiscarded++;return false}
    if(typeof basePayDownCombatGap!=="function")return false;
    try{const recovered=Boolean(basePayDownCombatGap(gap));if(recovered)state.longGapRecoveries++;return recovered}catch(error){noteFault("gap-recovery",error);return false}
  }

  function runSoloUpdates(elapsed){
    const raw=Math.max(0,Number(elapsed)||0),bounded=Math.min(SOLO_MAX_VISIBLE_FRAME_MS,raw);
    if(raw>bounded)state.soloDiscardedVisibleMs+=raw-bounded;
    let remaining=bounded,steps=0;
    while(remaining>0&&steps<SOLO_MAX_STEPS){
      const step=Math.min(SOLO_MAX_STEP_MS,remaining);
      try{if(typeof update==="function")update(step)}catch(error){noteFault("update",error);break}
      remaining-=step;steps++;state.soloSubsteps++;
    }
    state.soloFrames++;state.soloLastElapsed=bounded;state.soloLastSteps=steps;
    if(steps>1)state.soloCatchupFrames++;
    return{elapsed:bounded,steps,discarded:Math.max(0,raw-bounded)}
  }

  function stableLoopR59(timestamp){
    const hasTimestamp=finite(timestamp),t=hasTimestamp?Number(timestamp):perfNow();
    const accepted=state.lastAcceptedRafTimestamp,hasPreviousAccepted=accepted!==null&&accepted!==undefined&&finite(accepted);
    if(hasTimestamp&&hasPreviousAccepted&&t<=Number(accepted)){
      noteDuplicateFrame();
      return
    }

    const previous=hasPreviousAccepted?Number(accepted):null;
    const modeNow=currentMode(),modeChanged=Boolean(state.lastMode&&modeNow!==state.lastMode);
    let gap=previous==null?16:Math.max(0,t-previous),dt=16,soloHandled=false;
    if(!finite(gap))gap=16;

    // Paused/hidden frames never recover combat time. Active visible Solo uses
    // bounded wall-time substeps so slow rendered frames do not permanently lose
    // simulation time. Other modes retain their established single-step cadence.
    if(modeChanged||modeNow!=="playing"||document.hidden){
      if(gap>=LONG_GAP_MS)state.pausedGapsDiscarded++;
      dt=modeNow==="playing"?Math.min(16,gap||16):0;
    }else{
      if(gap>=LONG_GAP_MS){noteFrameStall();safeGapRecovery(gap)}
      if(soloDungeonPlaying()){
        dt=Math.min(SOLO_MAX_VISIBLE_FRAME_MS,Math.max(0,gap));soloHandled=true;
      }else dt=Math.min(SOLO_MAX_STEP_MS,Math.max(0,gap));
    }

    setAcceptedRafTimestamp(t);state.lastMode=modeNow;state.acceptedFrames++;
    try{last=t}catch(_){}
    try{if(typeof damageFlash!=="undefined"&&damageFlash>0)damageFlash=Math.max(0,damageFlash-dt/500)}catch(error){noteFault("frame-clock",error)}
    if(soloHandled)runSoloUpdates(gap);
    else try{if(typeof update==="function")update(dt)}catch(error){noteFault("update",error)}
    try{if(typeof render==="function")render()}catch(error){noteFault("render",error)}
    try{requestAnimationFrame(stableLoopR59)}catch(error){noteFault("raf",error);setTimeout(()=>{try{requestAnimationFrame(stableLoopR59)}catch(secondError){noteFault("raf-retry",secondError)}},16)}
  }
  stableLoopR59.__ccgV141R29Stable=true;
  stableLoopR59.__ccgV141R59PauseClock=true;
  stableLoopR59.__ccgV141CrashContained=true;

  function installClockOwner(){
    const api=window.CCGLostSizzlerV141R29;if(!api)return false;
    if(!basePayDownCombatGap&&typeof api.payDownCombatGap==="function")basePayDownCombatGap=api.payDownCombatGap.bind(api);
    try{api.stableLoop=stableLoopR59}catch(_){}
    if(window.loop!==stableLoopR59)window.loop=stableLoopR59;
    state.clockInstalled=true;return true
  }

  function wrapPauseFunction(name,kind){
    const current=window[name];if(typeof current!=="function")return false;
    if(chainHas(current,"__ccgV141R59PauseBoundary"))return true;
    const wrapped=function(){
      const before=currentMode();
      if(kind==="open")markPauseBoundary(`${name}:open`);
      else if(kind==="close")markPauseBoundary(`${name}:resume`);
      let result;
      try{result=current.apply(this,arguments)}finally{
        const after=currentMode();
        if(before!==after||kind==="close"||kind==="open")markPauseBoundary(`${name}:${before||"unknown"}->${after||"unknown"}`);
      }
      return result
    };
    wrapped.__ccgV141R59PauseBoundary=true;wrapped.__ccgOriginal=current;window[name]=wrapped;return true
  }

  function installPauseOwners(){
    const a=wrapPauseFunction("openPauseMenu","open"),b=wrapPauseFunction("closePauseMenu","close"),c=wrapPauseFunction("pause","toggle");
    state.pauseWrapped=Boolean(a||b||c);return state.pauseWrapped
  }

  function installSoloSaveTransitionOwner(){
    const api=window.CCGLostSizzlerV141R43SoloSave,current=window.captureFloorEntryCheckpoint;
    if(!api||typeof api.captureEntry!=="function"||typeof current!=="function")return false;
    if(chainHas(current,"__ccgV141R59SoloAutosave")){state.soloSaveTransitionInstalled=true;return true}
    const wrapped=function captureFloorEntryCheckpointV141R59(){
      const checkpoint=current.apply(this,arguments);
      if(checkpoint){
        try{if(api.captureEntry("autosave")){state.soloFloorAutosaves++}}catch(error){noteFault("solo-floor-autosave",error)}
      }
      return checkpoint
    };
    wrapped.__ccgV141R59SoloAutosave=true;wrapped.__ccgOriginal=current;
    window.captureFloorEntryCheckpoint=wrapped;state.soloSaveTransitionInstalled=true;state.soloSaveTransitionInstalls++;return true
  }

  function reassertR58(){
    if(!spyActive())return false;
    const api=window.CCGLostSizzlerV141R58SpyOverhaul;if(!api)return false;
    try{
      if(!api.state?.installed){api.install?.();state.r58Reassertions++}
      api.patchInputOwnership?.();api.patchSaboteurRules?.();
      if(api.tick?.()){state.r58Ticks++;return true}
    }catch(error){state.lastError=String(error?.message||error)}
    return false
  }

  function ensure(){
    installClockOwner();installPauseOwners();installSoloSaveTransitionOwner();reassertR58();
    state.installed=state.clockInstalled&&state.pauseWrapped;
    return state.installed
  }

  ensure();state.timer=setInterval(ensure,MONITOR_MS);
  addEventListener("focus",()=>{markPauseBoundary("focus return");ensure()},{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){markPauseBoundary("visibility return");ensure()}},{passive:true});
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerV141R59LiveRegressionFixes={
    MONITOR_MS,LONG_GAP_MS,PAUSE_GUARD_MS,SOLO_MAX_STEP_MS,SOLO_MAX_VISIBLE_FRAME_MS,SOLO_MAX_STEPS,
    stableLoopR59,runSoloUpdates,soloDungeonPlaying,markPauseBoundary,safeGapRecovery,noteFault,noteDuplicateFrame,noteFrameStall,setAcceptedRafTimestamp,installClockOwner,installPauseOwners,installSoloSaveTransitionOwner,reassertR58,normaliseAudioRate,ensure,
    get state(){return state}
  };
})();
