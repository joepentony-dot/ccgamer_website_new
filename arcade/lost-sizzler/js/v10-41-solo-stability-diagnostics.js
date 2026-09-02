/* The Lost Sizzler — passive Solo stability diagnostics.
 *
 * This file must not modify gameplay state. It samples runtime timing,
 * lifecycle and ownership so long-session sluggishness / acceleration can be
 * reproduced with evidence before the scheduler is replaced.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_SOLO_STABILITY_DIAGNOSTICS__)return;
  window.__CCG_LOST_SIZZLER_SOLO_STABILITY_DIAGNOSTICS__=true;

  const SAMPLE_MS=250,REPORT_MS=5000,HISTORY_LIMIT=360,OWNER_NAMES=["loop","update","movePlayer","hurtPlayer","openChest","tryChest"];
  const state={
    startedAt:performance.now(),timer:0,lastSampleAt:0,lastReportAt:0,lastRunElapsed:null,lastSharedFrames:null,lastR59AcceptedFrames:null,
    soloActiveWallMs:0,soloObservedSimulationMs:0,simulationRatio:1,updateRate:0,rafAcceptedRate:0,
    minSimulationRatio:Infinity,maxSimulationRatio:0,ratioWarnings:0,ownerChanges:0,
    maxSampleGapMs:0,sampleOverruns:0,focusReturns:0,blurEvents:0,visibilityReturns:0,visibilityHides:0,
    ownerSignatures:{},ownerDepths:{},ownerChangeLog:[],lifecycleLog:[],history:[],samples:0,lastError:""
  };

  function safeMode(){try{return String(mode||"")}catch(_){return""}}
  function safeRunElapsed(){try{return Number(run?.elapsed)}catch(_){return NaN}}
  function controllerId(){try{return String(window.CCGLostSizzlerModeRuntime?.state?.activeId||"")}catch(_){return""}}
  function sharedFrames(){try{return Number(window.CCGLostSizzlerModeRuntime?.state?.sharedPreFrames)}catch(_){return NaN}}
  function r59State(){try{return window.CCGLostSizzlerV141R59LiveRegressionFixes?.state||window.CCGLostSizzlerV141R59?.state||null}catch(_){return null}}
  function soloActive(){return document.body?.dataset?.runActive==="true"&&!document.hidden&&safeMode()==="playing"&&controllerId()==="dungeon-solo"}

  function functionMarkers(fn){
    if(typeof fn!=="function")return[];
    try{return Object.keys(fn).filter(key=>key.startsWith("__ccg")&&fn[key]!==false&&fn[key]!=null).sort().slice(0,18)}catch(_){return[]}
  }
  function ownerInfo(fn){
    if(typeof fn!=="function")return{signature:"missing",depth:0};
    const parts=[],seen=new Set();let current=fn,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth<32){
      seen.add(current);parts.push(`${current.name||"anonymous"}[${functionMarkers(current).join(",")}]`);depth++;
      current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:(typeof current.__ccgV141Original==="function"?current.__ccgV141Original:null);
    }
    return{signature:`${depth}:${parts.join(" <- ")}`,depth}
  }
  function ownerSignature(fn){return ownerInfo(fn).signature}
  function sampleOwners(now){
    for(const name of OWNER_NAMES){
      const info=ownerInfo(window[name]),signature=info.signature,previous=state.ownerSignatures[name];
      if(previous&&previous!==signature){
        state.ownerChanges++;
        state.ownerChangeLog.push({at:now,name,from:previous,to:signature,mode:safeMode(),controllerId:controllerId()});
        if(state.ownerChangeLog.length>80)state.ownerChangeLog.splice(0,state.ownerChangeLog.length-80);
      }
      state.ownerSignatures[name]=signature;state.ownerDepths[name]=info.depth;
    }
  }

  function noteLifecycle(kind){
    const at=performance.now();
    if(kind==="focus")state.focusReturns++;
    else if(kind==="blur")state.blurEvents++;
    else if(kind==="visible")state.visibilityReturns++;
    else if(kind==="hidden")state.visibilityHides++;
    state.lifecycleLog.push({at,kind,mode:safeMode(),controllerId:controllerId(),hidden:Boolean(document.hidden)});
    if(state.lifecycleLog.length>80)state.lifecycleLog.splice(0,state.lifecycleLog.length-80)
  }

  function runtimeSnapshot(now){
    const modeRuntime=window.CCGLostSizzlerModeRuntime?.state||{},r29=window.CCGLostSizzlerV141R29?.state||{},r30=window.CCGLostSizzlerV141R30?.state||{},ownerSeal=window.CCGLostSizzlerV141R30OwnerSeal?.state||{},r59=r59State()||{},r60=window.CCGLostSizzlerV141R60?.state||{};
    return{
      at:now,mode:safeMode(),controllerId:controllerId(),hidden:Boolean(document.hidden),hasFocus:typeof document.hasFocus==="function"?Boolean(document.hasFocus()):null,runActive:document.body?.dataset?.runActive==="true",
      activeWallMs:Math.round(state.soloActiveWallMs),observedSimulationMs:Math.round(state.soloObservedSimulationMs),simulationRatio:Number(state.simulationRatio.toFixed(4)),updateRate:Number(state.updateRate.toFixed(2)),rafAcceptedRate:Number(state.rafAcceptedRate.toFixed(2)),
      maxSampleGapMs:Number(state.maxSampleGapMs.toFixed(2)),sampleOverruns:state.sampleOverruns,focusReturns:state.focusReturns,blurEvents:state.blurEvents,visibilityReturns:state.visibilityReturns,visibilityHides:state.visibilityHides,
      ownerChanges:state.ownerChanges,loopOwner:state.ownerSignatures.loop||"missing",updateOwner:state.ownerSignatures.update||"missing",moveOwner:state.ownerSignatures.movePlayer||"missing",damageOwner:state.ownerSignatures.hurtPlayer||"missing",
      loopOwnerDepth:Number(state.ownerDepths.loop||0),updateOwnerDepth:Number(state.ownerDepths.update||0),moveOwnerDepth:Number(state.ownerDepths.movePlayer||0),damageOwnerDepth:Number(state.ownerDepths.hurtPlayer||0),
      sharedFrameBoundaryReassertions:Number(modeRuntime.sharedFrameBoundaryReassertions||0),ownedSystemReassertions:Number(modeRuntime.ownedSystemReassertions||0),ownedSystemCalls:Number(modeRuntime.ownedSystemCalls||0),modeRuntimeTransitions:Number(modeRuntime.transitions||0),
      r29FrameStalls:Number(r29.frameStalls||0),r29DuplicateFramesSkipped:Number(r29.duplicateFramesSkipped||0),r29CombatStallRecoveries:Number(r29.combatStallRecoveries||0),
      r30OwnershipRepairs:Number(r30.ownershipRepairs||0),r30ForcedRestores:Number(r30.forcedRestores||0),r30InputReassertions:Number(r30.inputReassertions||0),r30WatchdogRecoveries:Number(r30.watchdogRecoveries||0),r30WatchdogMisses:Number(r30.watchdogMisses||0),r30WatchdogCooldownBreaks:Number(r30.watchdogCooldownBreaks||0),r30ModeTransitions:Number(r30.modeTransitions||0),
      ownerSealRepairs:Number(ownerSeal.repairs||0),ownerSealBlockedWrites:Number(ownerSeal.blockedWrites||0),ownerSealAssignmentGate:Boolean(ownerSeal.assignmentGate),ownerSealUnsupported:Boolean(ownerSeal.assignmentGateUnsupported),
      r59AcceptedFrames:Number(r59.acceptedFrames||0),r59DuplicateFramesSkipped:Number(r59.duplicateFramesSkipped||0),r59LongGaps:Number(r59.longGaps||0),r59LongGapRecoveries:Number(r59.longGapRecoveries||0),
      r59PausedGapsDiscarded:Number(r59.pausedGapsDiscarded||0),r59PauseBoundaries:Number(r59.pauseBoundaries||0),r59R58Reassertions:Number(r59.r58Reassertions||0),r59R58Ticks:Number(r59.r58Ticks||0),
      r59ClockInstalled:Boolean(r59.clockInstalled),r59PauseWrapped:Boolean(r59.pauseWrapped),r59SoloSaveTransitionInstalls:Number(r59.soloSaveTransitionInstalls||0),r59SoloFloorAutosaves:Number(r59.soloFloorAutosaves||0),r59SuppressRecoveryUntil:Number(r59.suppressRecoveryUntil||0),r59LastAcceptedRafTimestamp:Number(r59.lastAcceptedRafTimestamp||0),
      r60VisibleGapClamps:Number(r60.visibleGapClamps||0),r60DiscardedVisibleMs:Number(r60.discardedVisibleMs||0)
    }
  }

  function report(now){
    const snap=runtimeSnapshot(now);state.history.push(snap);if(state.history.length>HISTORY_LIMIT)state.history.splice(0,state.history.length-HISTORY_LIMIT);
    if(snap.runActive&&snap.controllerId==="dungeon-solo"&&(snap.simulationRatio<0.82||snap.simulationRatio>1.18)){
      state.ratioWarnings++;
      console.warn("[Lost Sizzler diagnostics] Solo simulation drift detected",snap);
    }
    return snap
  }

  function sample(){
    try{
      const now=performance.now(),previousAt=state.lastSampleAt||now,rawWallDelta=Math.max(0,now-previousAt),wallDelta=Math.min(2000,rawWallDelta);state.lastSampleAt=now;state.samples++;
      state.maxSampleGapMs=Math.max(state.maxSampleGapMs,rawWallDelta);if(rawWallDelta>SAMPLE_MS*2)state.sampleOverruns++;
      const active=soloActive(),runElapsed=safeRunElapsed(),frames=sharedFrames(),r59Accepted=Number(r59State()?.acceptedFrames);
      if(active){
        state.soloActiveWallMs+=wallDelta;
        if(Number.isFinite(runElapsed)&&Number.isFinite(state.lastRunElapsed)){
          const simDelta=runElapsed-state.lastRunElapsed;
          if(simDelta>=0&&simDelta<=2000)state.soloObservedSimulationMs+=simDelta;
        }
        if(Number.isFinite(frames)&&Number.isFinite(state.lastSharedFrames)&&wallDelta>0)state.updateRate=Math.max(0,(frames-state.lastSharedFrames)*1000/wallDelta);
        if(Number.isFinite(r59Accepted)&&Number.isFinite(state.lastR59AcceptedFrames)&&wallDelta>0)state.rafAcceptedRate=Math.max(0,(r59Accepted-state.lastR59AcceptedFrames)*1000/wallDelta);
      }
      state.lastRunElapsed=Number.isFinite(runElapsed)?runElapsed:null;state.lastSharedFrames=Number.isFinite(frames)?frames:null;state.lastR59AcceptedFrames=Number.isFinite(r59Accepted)?r59Accepted:null;
      if(state.soloActiveWallMs>0){
        state.simulationRatio=state.soloObservedSimulationMs/state.soloActiveWallMs;
        if(Number.isFinite(state.simulationRatio)){state.minSimulationRatio=Math.min(state.minSimulationRatio,state.simulationRatio);state.maxSimulationRatio=Math.max(state.maxSimulationRatio,state.simulationRatio)}
      }
      sampleOwners(now);
      if(!state.lastReportAt||now-state.lastReportAt>=REPORT_MS){state.lastReportAt=now;report(now)}
    }catch(error){state.lastError=String(error?.message||error||"unknown").slice(0,260)}
  }

  function snapshot(){return runtimeSnapshot(performance.now())}
  function reset(){
    state.lastSampleAt=performance.now();state.lastReportAt=0;state.lastRunElapsed=safeRunElapsed();state.lastSharedFrames=sharedFrames();state.lastR59AcceptedFrames=Number(r59State()?.acceptedFrames)||null;
    state.soloActiveWallMs=0;state.soloObservedSimulationMs=0;state.simulationRatio=1;state.updateRate=0;state.rafAcceptedRate=0;state.minSimulationRatio=Infinity;state.maxSimulationRatio=0;state.ratioWarnings=0;state.ownerChanges=0;state.maxSampleGapMs=0;state.sampleOverruns=0;
    state.focusReturns=0;state.blurEvents=0;state.visibilityReturns=0;state.visibilityHides=0;state.ownerChangeLog.length=0;state.lifecycleLog.length=0;state.history.length=0;state.lastError="";
    sampleOwners(state.lastSampleAt);return snapshot()
  }

  addEventListener("focus",()=>noteLifecycle("focus"),{passive:true});
  addEventListener("blur",()=>noteLifecycle("blur"),{passive:true});
  document.addEventListener("visibilitychange",()=>noteLifecycle(document.hidden?"hidden":"visible"),{passive:true});
  state.timer=setInterval(sample,SAMPLE_MS);sample();
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});
  window.CCGLostSizzlerSoloDiagnostics={SAMPLE_MS,REPORT_MS,HISTORY_LIMIT,state,ownerInfo,ownerSignature,snapshot,reset,get history(){return [...state.history]},get ownerChangeLog(){return [...state.ownerChangeLog]},get lifecycleLog(){return [...state.lifecycleLog]}};
})();