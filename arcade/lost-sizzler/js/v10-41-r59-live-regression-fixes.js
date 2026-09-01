/* The Lost Sizzler V10.41 r59 — live pause-clock and Spy regression authority.
 *
 * This finalizer owns two release blockers reported after r58:
 * - pause/resume must never turn paused wall-clock time into gameplay recovery or
 *   allow more than one accepted simulation frame for the same RAF timestamp;
 * - the r58 Spy rules must stay authoritative after older compatibility layers
 *   have finished installing.
 *
 * Keyboard ownership for TAB/F is established by the r32 Spy loader. This file
 * keeps the runtime clock and final r58 rules stable without changing Solo,
 * Horde, Dungeon or Split Screen gameplay rules.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R59_LIVE_REGRESSION_FIXES__)return;
  window.__CCG_LOST_SIZZLER_V141_R59_LIVE_REGRESSION_FIXES__=true;

  const MONITOR_MS=40;
  const LONG_GAP_MS=500;
  const PAUSE_GUARD_MS=1200;
  const state={
    timer:0,installed:false,clockInstalled:false,pauseWrapped:false,
    acceptedFrames:0,duplicateFramesSkipped:0,longGaps:0,longGapRecoveries:0,
    pausedGapsDiscarded:0,pauseBoundaries:0,lastAcceptedRafTimestamp:null,
    lastMode:"",suppressRecoveryUntil:0,lastPauseReason:"",lastError:"",
    r58Reassertions:0,r58Ticks:0
  };

  let basePayDownCombatGap=null;

  const finite=value=>Number.isFinite(Number(value));
  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const currentMode=()=>{try{return String(mode||"")}catch(_){return""}};
  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type==="sizzler-saboteurs"||document.body?.dataset?.specialMode==="sizzler-saboteurs"}catch(_){return false}};

  function chainHas(fn,marker){
    const seen=new Set();let current=fn,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth<32){
      seen.add(current);try{if(current[marker])return true}catch(_){}
      try{current=current.__ccgOriginal||current.__ccgV141Original||null}catch(_){current=null}
      depth++;
    }
    return false
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
    state.lastAcceptedRafTimestamp=null;
    state.lastMode=currentMode();
    try{last=now}catch(_){}
    normaliseAudioRate();
    return true
  }

  function safeGapRecovery(gap){
    const now=perfNow(),modeNow=currentMode();
    if(!finite(gap)||Number(gap)<LONG_GAP_MS)return false;
    if(now<state.suppressRecoveryUntil||modeNow!=="playing"||document.hidden){state.pausedGapsDiscarded++;return false}
    if(typeof basePayDownCombatGap!=="function")return false;
    try{const recovered=Boolean(basePayDownCombatGap(gap));if(recovered)state.longGapRecoveries++;return recovered}catch(error){state.lastError=String(error?.message||error);return false}
  }

  function stableLoopR59(timestamp){
    const hasTimestamp=finite(timestamp),t=hasTimestamp?Number(timestamp):perfNow();
    if(hasTimestamp&&finite(state.lastAcceptedRafTimestamp)&&t<=Number(state.lastAcceptedRafTimestamp)){
      state.duplicateFramesSkipped++;
      return
    }

    const previous=finite(state.lastAcceptedRafTimestamp)?Number(state.lastAcceptedRafTimestamp):null;
    const modeNow=currentMode(),modeChanged=Boolean(state.lastMode&&modeNow!==state.lastMode);
    let gap=previous==null?16:Math.max(0,t-previous),dt=16;
    if(!finite(gap))gap=16;

    if(modeChanged||perfNow()<state.suppressRecoveryUntil){
      if(gap>=LONG_GAP_MS)state.pausedGapsDiscarded++;
      dt=modeNow==="playing"?Math.min(16,gap||16):0;
    }else{
      if(gap>=LONG_GAP_MS){state.longGaps++;safeGapRecovery(gap)}
      dt=Math.min(45,Math.max(0,gap));
    }

    state.lastAcceptedRafTimestamp=t;state.lastMode=modeNow;state.acceptedFrames++;
    try{last=t}catch(_){}
    try{if(typeof damageFlash!=="undefined"&&damageFlash>0)damageFlash=Math.max(0,damageFlash-dt/500)}catch(_){}
    try{if(typeof update==="function")update(dt)}catch(error){state.lastError=String(error?.message||error);try{console.error("[Lost Sizzler r59] update fault contained",error)}catch(_){}}
    try{if(typeof render==="function")render()}catch(error){state.lastError=String(error?.message||error);try{console.error("[Lost Sizzler r59] render fault contained",error)}catch(_){}}
    try{requestAnimationFrame(stableLoopR59)}catch(error){state.lastError=String(error?.message||error);setTimeout(()=>{try{requestAnimationFrame(stableLoopR59)}catch(_){}},16)}
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
    installClockOwner();installPauseOwners();reassertR58();
    state.installed=state.clockInstalled&&state.pauseWrapped;
    return state.installed
  }

  ensure();state.timer=setInterval(ensure,MONITOR_MS);
  addEventListener("focus",()=>{markPauseBoundary("focus return");ensure()},{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){markPauseBoundary("visibility return");ensure()}},{passive:true});
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerV141R59LiveRegressionFixes={
    MONITOR_MS,LONG_GAP_MS,PAUSE_GUARD_MS,stableLoopR59,markPauseBoundary,safeGapRecovery,installClockOwner,installPauseOwners,reassertR58,normaliseAudioRate,ensure,
    get state(){return state}
  };
})();