/* The Lost Sizzler V10.41 r36 — Solo Dungeon render-fault and black-canvas recovery. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R36_SOLO_RENDER_RECOVERY__)return;
  window.__CCG_LOST_SIZZLER_V141_R36_SOLO_RENDER_RECOVERY__=true;

  const INSTALL_MS=80;
  const WATCHDOG_MS=280;
  const RETRY_MS=520;
  const ACTIVE_SPECIAL_MODES=new Set(["horde-survivor","sizzler-saboteurs"]);
  const state={
    timer:0,watchdogTimer:0,installed:false,renderWrapped:false,backupReady:false,
    backupCaptures:0,backupRestores:0,renderFaults:0,renderFaultRecoveries:0,renderFaultPauses:0,
    blankDetections:0,blankRecoveries:0,coordinateRepairs:0,consecutiveFaults:0,watchdogChecks:0,
    lastRetryAt:0,lastFaultAt:0,lastFaultLogAt:0,lastRenderFault:"",faultPaused:false
  };

  let backupCanvas=null,backupCtx=null,probeCanvas=null,probeCtx=null;

  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const controllerId=()=>{try{return String(window.CCGLostSizzlerModeRuntime?.detect?.()||document.body?.dataset?.modeController||"")}catch(_){return String(document.body?.dataset?.modeController||"")}};
  const soloDungeon=()=>{
    if(ACTIVE_SPECIAL_MODES.has(specialType()))return false;
    const detected=controllerId();
    if(detected==="dungeon-solo")return true;
    if(["dungeon-online","horde-solo","horde-online","spy-online","split-screen"].includes(detected))return false;
    try{return String(playMode||"solo")==="solo"&&!p2&&document.body?.dataset?.hordeSolo!=="true"}catch(_){return false}
  };
  const soloRun=()=>{try{return soloDungeon()&&document.body?.dataset?.runActive==="true"&&Boolean(world&&host&&p1)}catch(_){return false}};
  const soloPlaying=()=>{try{return soloRun()&&mode==="playing"}catch(_){return false}};
  const visiblePanel=id=>{const node=document.getElementById(id);return Boolean(node&&!node.classList.contains("hidden"))};
  const blockingPanelVisible=()=>["pause","inventory-panel","item-info-panel","named-dossier-panel","shop-panel","save-panel","artefact-choice-panel","floor-complete","level-up"].some(visiblePanel);
  const finite=value=>Number.isFinite(Number(value));

  function ensureCanvases(){
    const game=typeof canvas!=="undefined"?canvas:document.getElementById("game");if(!game)return false;
    if(!backupCanvas){backupCanvas=document.createElement("canvas");backupCtx=backupCanvas.getContext("2d",{alpha:false})}
    if(!probeCanvas){probeCanvas=document.createElement("canvas");probeCanvas.width=16;probeCanvas.height=9;probeCtx=probeCanvas.getContext("2d",{willReadFrequently:true})}
    return Boolean(backupCtx&&probeCtx)
  }

  function canvasHasVisibleFrame(){
    if(!ensureCanvases())return false;
    const game=typeof canvas!=="undefined"?canvas:document.getElementById("game");
    if(!game||game.width<2||game.height<2)return false;
    try{
      probeCtx.clearRect(0,0,16,9);probeCtx.drawImage(game,0,0,16,9);
      const data=probeCtx.getImageData(0,0,16,9).data;let lit=0;
      for(let i=0;i<data.length;i+=4){if(Math.max(data[i],data[i+1],data[i+2])>14&&data[i+3]>0){lit++;if(lit>=2)return true}}
    }catch(_){}
    return false
  }

  function captureHealthyFrame(visibleConfirmed=false){
    if(!soloRun()||!ensureCanvases())return false;
    const game=typeof canvas!=="undefined"?canvas:document.getElementById("game");
    if(!game||game.width<2||game.height<2||(!visibleConfirmed&&!canvasHasVisibleFrame()))return false;
    try{
      if(backupCanvas.width!==game.width)backupCanvas.width=game.width;
      if(backupCanvas.height!==game.height)backupCanvas.height=game.height;
      backupCtx.imageSmoothingEnabled=false;backupCtx.clearRect(0,0,backupCanvas.width,backupCanvas.height);backupCtx.drawImage(game,0,0);
      state.backupReady=true;state.backupCaptures++;return true
    }catch(_){return false}
  }

  function restoreHealthyFrame(){
    if(!state.backupReady||!ensureCanvases())return false;
    const game=typeof canvas!=="undefined"?canvas:document.getElementById("game"),context=typeof ctx!=="undefined"?ctx:game?.getContext?.("2d");
    if(!game||!context||game.width<2||game.height<2)return false;
    try{
      context.save();context.setTransform?.(1,0,0,1,0,0);context.globalAlpha=1;context.imageSmoothingEnabled=false;context.clearRect(0,0,game.width,game.height);context.drawImage(backupCanvas,0,0,backupCanvas.width,backupCanvas.height,0,0,game.width,game.height);context.restore();
      state.backupRestores++;return true
    }catch(_){return false}
  }

  function repairSoloCoordinates(){
    if(!soloRun())return false;let changed=false;
    try{
      const width=Number(world?.map?.[0]?.length||0),height=Number(world?.map?.length||0),bad=!finite(p1.x)||!finite(p1.y)||Number(p1.x)<0||Number(p1.y)<0||(width&&Number(p1.x)>=width)||(height&&Number(p1.y)>=height);
      if(bad){p1.x=Number(world?.start?.x)||1;p1.y=Number(world?.start?.y)||1;changed=true}
      if(!finite(p1.rx)){p1.rx=Number(p1.x);changed=true}if(!finite(p1.ry)){p1.ry=Number(p1.y);changed=true}
      if(changed){try{cameras?.clear?.()}catch(_){}state.coordinateRepairs++}
    }catch(_){}
    return changed
  }

  function noteFault(error){
    const now=performance.now();state.renderFaults++;state.consecutiveFaults++;state.lastFaultAt=now;state.lastRenderFault=String(error?.message||error||"Unknown Solo render fault").slice(0,280);
    if(now-state.lastFaultLogAt>2000){state.lastFaultLogAt=now;try{console.error("[Lost Sizzler r36] Solo render fault recovered without committing a black frame.",error)}catch(_){}}
  }

  function pauseInvisibleCombat(){
    if(state.faultPaused||!soloPlaying())return false;
    try{input?.clear?.()}catch(_){}
    try{mode="paused"}catch(_){return false}
    try{UI?.pause?.classList?.remove("hidden")}catch(_){}
    state.faultPaused=true;state.renderFaultPauses++;return true
  }

  function safeRender(current,args,scope){
    if(!soloRun())return current.apply(scope,args);
    const now=performance.now(),paused=(()=>{try{return mode==="paused"}catch(_){return false}})();
    if(state.faultPaused&&paused&&now-state.lastRetryAt<RETRY_MS){restoreHealthyFrame();return false}
    if(state.faultPaused&&!paused){state.faultPaused=false;state.consecutiveFaults=0}
    if(state.faultPaused)state.lastRetryAt=now;
    repairSoloCoordinates();
    try{
      const result=current.apply(scope,args);state.consecutiveFaults=0;return result
    }catch(error){
      noteFault(error);repairSoloCoordinates();if(restoreHealthyFrame())state.renderFaultRecoveries++;
      if(state.consecutiveFaults>=2)pauseInvisibleCombat();
      return false
    }
  }

  function installRenderGuard(){
    const current=window.render;if(typeof current!=="function")return false;
    if(current.__ccgV141R36SoloRenderRecovery){state.renderWrapped=true;return true}
    const wrapped=function renderV141R36SoloRecovery(){return safeRender(current,arguments,this)};
    wrapped.__ccgV141R36SoloRenderRecovery=true;wrapped.__ccgOriginal=current;
    /* The retained post-playtest monitor otherwise wraps render again every 40 ms.
     * Carry its marker forward because its Horde-only behaviour remains beneath us. */
    wrapped.__ccgV141PostPlaytestRender=true;
    window.render=wrapped;state.renderWrapped=true;return true
  }

  function recoverBlankCanvas(force=false){
    if(!soloPlaying()||blockingPanelVisible())return false;
    const visible=canvasHasVisibleFrame();
    if(visible){captureHealthyFrame(true);return false}
    if(!force&&!state.backupReady)return false;
    state.blankDetections++;
    const restored=restoreHealthyFrame();if(restored)state.blankRecoveries++;
    repairSoloCoordinates();
    try{
      window.__CCG_LOST_SIZZLER_SCHEDULE_RESIZE__?.();
      const r31=window.CCGLostSizzlerV141R31SoloDungeon;
      if(r31?.recoverSoloDisplay)setTimeout(()=>r31.recoverSoloDisplay("r36 black-canvas watchdog"),0);
      else if(typeof render==="function")setTimeout(()=>render(),0)
    }catch(_){}
    return restored||true
  }

  function resumeAfterRecovery(){
    if(!soloRun())return false;
    repairSoloCoordinates();state.consecutiveFaults=0;state.faultPaused=false;state.lastRetryAt=0;
    try{UI?.pause?.classList?.add("hidden");mode="playing";input?.clear?.();last=performance.now();cameras?.clear?.()}catch(_){}
    try{window.CCGLostSizzlerV141R31SoloDungeon?.recoverSoloDisplay?.("r36 manual retry")}catch(_){}
    return true
  }

  function watchdog(){
    if(!soloPlaying()||blockingPanelVisible())return false;
    state.watchdogChecks++;
    const visible=canvasHasVisibleFrame();
    if(visible){captureHealthyFrame(true);return true}
    return recoverBlankCanvas(true)
  }

  function install(){
    const gate=window.CCGLostSizzlerReleaseGate;if(gate&&!gate.state?.ready)return false;
    if(!document.body||!window.CCGLostSizzlerV141R31SoloDungeon||!window.CCGLostSizzlerModeRuntime||typeof window.render!=="function")return false;
    ensureCanvases();installRenderGuard();state.watchdogTimer=setInterval(watchdog,WATCHDOG_MS);state.installed=true;document.body.dataset.v141R36SoloRenderRecovery="true";return true
  }

  if(!install())state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},INSTALL_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);if(state.watchdogTimer)clearInterval(state.watchdogTimer);state.timer=state.watchdogTimer=0},{once:true});

  window.CCGLostSizzlerV141R36SoloRenderRecovery={
    canvasHasVisibleFrame,captureHealthyFrame,restoreHealthyFrame,repairSoloCoordinates,recoverBlankCanvas,resumeAfterRecovery,watchdog,installRenderGuard,get state(){return state}
  };
})();