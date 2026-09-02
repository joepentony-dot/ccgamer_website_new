/* The Lost Sizzler — passive Solo stability diagnostics.
 *
 * This file must not modify gameplay state. It samples runtime timing and
 * ownership so long-session sluggishness / acceleration can be reproduced with
 * evidence before the scheduler is replaced.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_SOLO_STABILITY_DIAGNOSTICS__)return;
  window.__CCG_LOST_SIZZLER_SOLO_STABILITY_DIAGNOSTICS__=true;

  const SAMPLE_MS=250,REPORT_MS=5000,HISTORY_LIMIT=360,OWNER_NAMES=["update","movePlayer","hurtPlayer","openChest","tryChest"];
  const state={
    startedAt:performance.now(),timer:0,lastSampleAt:0,lastReportAt:0,lastRunElapsed:null,lastSharedFrames:null,
    soloActiveWallMs:0,soloObservedSimulationMs:0,simulationRatio:1,updateRate:0,
    minSimulationRatio:Infinity,maxSimulationRatio:0,ratioWarnings:0,ownerChanges:0,
    ownerSignatures:{},ownerChangeLog:[],history:[],samples:0,lastError:""
  };

  function safeMode(){try{return String(mode||"")}catch(_){return""}}
  function safeRunElapsed(){try{return Number(run?.elapsed)}catch(_){return NaN}}
  function controllerId(){try{return String(window.CCGLostSizzlerModeRuntime?.state?.activeId||"")}catch(_){return""}}
  function sharedFrames(){try{return Number(window.CCGLostSizzlerModeRuntime?.state?.sharedPreFrames)}catch(_){return NaN}}
  function soloActive(){return document.body?.dataset?.runActive==="true"&&!document.hidden&&safeMode()==="playing"&&controllerId()==="dungeon-solo"}

  function functionMarkers(fn){
    if(typeof fn!=="function")return[];
    try{return Object.keys(fn).filter(key=>key.startsWith("__ccg")&&fn[key]!==false&&fn[key]!=null).sort().slice(0,14)}catch(_){return[]}
  }
  function ownerSignature(fn){
    if(typeof fn!=="function")return"missing";
    const parts=[],seen=new Set();let current=fn,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth<24){
      seen.add(current);parts.push(`${current.name||"anonymous"}[${functionMarkers(current).join(",")}]`);depth++;
      current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null;
    }
    return `${depth}:${parts.join(" <- ")}`
  }
  function sampleOwners(now){
    for(const name of OWNER_NAMES){
      const signature=ownerSignature(window[name]),previous=state.ownerSignatures[name];
      if(previous&&previous!==signature){
        state.ownerChanges++;
        state.ownerChangeLog.push({at:now,name,from:previous,to:signature,mode:safeMode(),controllerId:controllerId()});
        if(state.ownerChangeLog.length>80)state.ownerChangeLog.splice(0,state.ownerChangeLog.length-80);
      }
      state.ownerSignatures[name]=signature;
    }
  }

  function runtimeSnapshot(now){
    const modeRuntime=window.CCGLostSizzlerModeRuntime?.state||{},r29=window.CCGLostSizzlerV141R29?.state||{},r60=window.CCGLostSizzlerV141R60?.state||{};
    return{
      at:now,mode:safeMode(),controllerId:controllerId(),hidden:Boolean(document.hidden),runActive:document.body?.dataset?.runActive==="true",
      activeWallMs:Math.round(state.soloActiveWallMs),observedSimulationMs:Math.round(state.soloObservedSimulationMs),simulationRatio:Number(state.simulationRatio.toFixed(4)),updateRate:Number(state.updateRate.toFixed(2)),
      ownerChanges:state.ownerChanges,updateOwner:state.ownerSignatures.update||"missing",moveOwner:state.ownerSignatures.movePlayer||"missing",damageOwner:state.ownerSignatures.hurtPlayer||"missing",
      sharedFrameBoundaryReassertions:Number(modeRuntime.sharedFrameBoundaryReassertions||0),ownedSystemReassertions:Number(modeRuntime.ownedSystemReassertions||0),ownedSystemCalls:Number(modeRuntime.ownedSystemCalls||0),
      r29FrameStalls:Number(r29.frameStalls||0),r29DuplicateFramesSkipped:Number(r29.duplicateFramesSkipped||0),r29CombatStallRecoveries:Number(r29.combatStallRecoveries||0),
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
      const now=performance.now(),previousAt=state.lastSampleAt||now,wallDelta=Math.max(0,Math.min(2000,now-previousAt));state.lastSampleAt=now;state.samples++;
      const active=soloActive(),runElapsed=safeRunElapsed(),frames=sharedFrames();
      if(active){
        state.soloActiveWallMs+=wallDelta;
        if(Number.isFinite(runElapsed)&&Number.isFinite(state.lastRunElapsed)){
          const simDelta=runElapsed-state.lastRunElapsed;
          if(simDelta>=0&&simDelta<=2000)state.soloObservedSimulationMs+=simDelta;
        }
        if(Number.isFinite(frames)&&Number.isFinite(state.lastSharedFrames)&&wallDelta>0){state.updateRate=Math.max(0,(frames-state.lastSharedFrames)*1000/wallDelta)}
      }
      state.lastRunElapsed=Number.isFinite(runElapsed)?runElapsed:null;state.lastSharedFrames=Number.isFinite(frames)?frames:null;
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
    state.lastSampleAt=performance.now();state.lastReportAt=0;state.lastRunElapsed=safeRunElapsed();state.lastSharedFrames=sharedFrames();
    state.soloActiveWallMs=0;state.soloObservedSimulationMs=0;state.simulationRatio=1;state.updateRate=0;state.minSimulationRatio=Infinity;state.maxSimulationRatio=0;state.ratioWarnings=0;state.ownerChanges=0;state.ownerChangeLog.length=0;state.history.length=0;state.lastError="";
    sampleOwners(state.lastSampleAt);return snapshot()
  }

  state.timer=setInterval(sample,SAMPLE_MS);sample();
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});
  window.CCGLostSizzlerSoloDiagnostics={SAMPLE_MS,REPORT_MS,HISTORY_LIMIT,state,ownerSignature,snapshot,reset,get history(){return [...state.history]},get ownerChangeLog(){return [...state.ownerChangeLog]}};
})();