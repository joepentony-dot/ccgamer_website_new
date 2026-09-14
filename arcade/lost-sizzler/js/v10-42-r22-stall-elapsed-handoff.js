/* C64 Dungeon Carnage V10.42 r22 — live stall elapsed handoff. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R22StallElapsedHandoff)return;

  const diagnostics={stallFrames:0,alertDtClamps:0,catchupDrops:0,lastOriginalDt:0,lastAppliedDt:0,lastWallGap:0,loopRepairs:0,recoveryClamps:0,rafGuardInstalls:0,rafRecoveryFrames:0};
  const STALL_MS=120;
  const NORMAL_FRAME_MS=16;
  const RECOVERY_PAD_MS=180;
  const RAF_RECOVERY_FRAMES=4;
  let lastWriterTick=performance.now();

  const activeRun=()=>document.body?.dataset?.runActive==="true";
  const currentMode=()=>{try{return typeof mode!=="undefined"?String(mode):""}catch(_){return""}};
  const spyActive=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")==="sizzler-saboteurs"}catch(_){return false}};
  const normalPlay=()=>activeRun()&&currentMode()==="playing"&&!spyActive();

  function reportStall(){
    diagnostics.stallFrames++;
    try{
      const r20=window.CCGLostSizzlerV142R20LiveRegressionStability;
      if(r20?.diagnostics)r20.diagnostics.frameStalls=Math.max(0,Number(r20.diagnostics.frameStalls)||0)+1;
    }catch(_){}
  }

  function clampRuntimeElapsed(elapsedBase,floorBase,allowance){
    let clamped=false;
    try{
      if(Number.isFinite(elapsedBase)&&Number.isFinite(Number(run?.elapsed))&&Number(run.elapsed)>elapsedBase+allowance){
        run.elapsed=elapsedBase+allowance;
        clamped=true;
      }
      if(Number.isFinite(floorBase)&&Number.isFinite(Number(host?.floorElapsed))&&Number(host.floorElapsed)>floorBase+allowance){
        host.floorElapsed=floorBase+allowance;
        clamped=true;
      }
    }catch(_){}
    if(clamped)diagnostics.recoveryClamps++;
    return clamped;
  }

  function installAlertClamp(){
    const current=window.updateAlert;
    if(typeof current!=="function")return false;
    if(current.__ccgV142R22StallElapsedHandoff===true)return true;

    const wrapped=function updateAlertV142R22StallElapsedHandoff(dt,...args){
      const now=performance.now();
      diagnostics.lastWallGap=Math.max(0,now-lastWriterTick);
      lastWriterTick=now;

      let safeDt=Number(dt);
      diagnostics.lastOriginalDt=Number.isFinite(safeDt)?safeDt:0;
      if(normalPlay()&&Number.isFinite(safeDt)&&safeDt>STALL_MS&&safeDt<600000){
        safeDt=NORMAL_FRAME_MS;
        diagnostics.alertDtClamps++;
        reportStall();
      }
      diagnostics.lastAppliedDt=Number.isFinite(safeDt)?safeDt:0;
      return current.call(this,safeDt,...args);
    };

    try{for(const key of Object.keys(current))wrapped[key]=current[key]}catch(_){}
    wrapped.__ccgV142R22StallElapsedHandoff=true;
    wrapped.__ccgOriginal=current;
    window.updateAlert=wrapped;
    return window.updateAlert===wrapped;
  }

  function installRafRecoveryGuard(){
    const current=window.requestAnimationFrame;
    if(typeof current!=="function")return false;
    if(current.__ccgV142R22RafRecoveryGuard===true)return true;

    let previousRafTimestamp=0;
    let recovery=null;

    const wrapped=function requestAnimationFrameV142R22RafRecoveryGuard(callback){
      if(typeof callback!=="function")return current.call(this,callback);
      return current.call(this,function(timestamp){
        const t=Number(timestamp);
        const ownsNormalFrame=normalPlay();
        const previous=previousRafTimestamp;
        const gap=Number.isFinite(t)&&previous>0?Math.max(0,t-previous):0;
        if(Number.isFinite(t))previousRafTimestamp=t;

        if(ownsNormalFrame&&gap>STALL_MS&&gap<600000){
          let elapsedBase=NaN,floorBase=NaN;
          try{
            elapsedBase=Number(run?.elapsed);
            floorBase=Number(host?.floorElapsed);
            if(typeof last!=="undefined"&&Number.isFinite(Number(last)))last=t-NORMAL_FRAME_MS;
          }catch(_){}
          recovery={elapsedBase,floorBase,frames:0,lastFrameTimestamp:NaN};
          reportStall();
        }

        const result=callback.apply(this,arguments);

        if(!ownsNormalFrame){
          recovery=null;
          return result;
        }
        if(!recovery)return result;

        if(!Number.isFinite(recovery.lastFrameTimestamp)||recovery.lastFrameTimestamp!==t){
          recovery.frames+=1;
          recovery.lastFrameTimestamp=t;
          diagnostics.rafRecoveryFrames++;
        }
        const allowance=NORMAL_FRAME_MS*Math.max(1,recovery.frames);
        clampRuntimeElapsed(recovery.elapsedBase,recovery.floorBase,allowance);
        if(recovery.frames>=RAF_RECOVERY_FRAMES)recovery=null;
        return result;
      });
    };

    try{for(const key of Object.keys(current))wrapped[key]=current[key]}catch(_){}
    wrapped.__ccgV142R22RafRecoveryGuard=true;
    wrapped.__ccgOriginal=current;
    window.requestAnimationFrame=wrapped;
    diagnostics.rafGuardInstalls++;
    return window.requestAnimationFrame===wrapped;
  }

  function installLoopRecoveryGuard(){
    let current=window.loop;
    if(typeof current!=="function")return false;
    if(current.__ccgV142R22LoopRecoveryGuard===true)return true;

    /* R20 capped every ordinary frame to the observed RAF gap. In headless and
       high-refresh sessions that can make normal simulation run well below 1x.
       Retire only that wrapper and keep its underlying established RAF owner. */
    if(current.__ccgV142R20LoopStallClamp===true&&typeof current.__ccgOriginal==="function")current=current.__ccgOriginal;

    let recovery=null;
    const wrapped=function loopV142R22RecoveryGuard(timestamp){
      const ownsNormalFrame=normalPlay();
      const t=Number(timestamp);
      const wallNow=performance.now();
      let stalled=false,gap=NORMAL_FRAME_MS,beforeElapsed=NaN,beforeFloorElapsed=NaN;

      if(ownsNormalFrame&&Number.isFinite(t)){
        try{
          const previous=typeof last!=="undefined"?Number(last):NaN;
          gap=Number.isFinite(previous)?Math.max(0,t-previous):NORMAL_FRAME_MS;
          stalled=gap>STALL_MS&&gap<600000;
          if(stalled){
            last=t-NORMAL_FRAME_MS;
            beforeElapsed=Number(run?.elapsed);
            beforeFloorElapsed=Number(host?.floorElapsed);
            reportStall();
          }
        }catch(_){}
      }

      const result=current.call(this,timestamp);

      if(!ownsNormalFrame){
        recovery=null;
        return result;
      }

      if(stalled){
        try{
          clampRuntimeElapsed(beforeElapsed,beforeFloorElapsed,NORMAL_FRAME_MS);
          recovery={
            wallStart:wallNow,
            until:wallNow+Math.max(STALL_MS,gap)+RECOVERY_PAD_MS,
            elapsedBase:Number(run?.elapsed),
            floorBase:Number(host?.floorElapsed)
          };
        }catch(_){}
      }else if(recovery){
        if(wallNow>=recovery.until){
          recovery=null;
        }else{
          const allowance=Math.max(0,wallNow-recovery.wallStart)+NORMAL_FRAME_MS;
          clampRuntimeElapsed(recovery.elapsedBase,recovery.floorBase,allowance);
        }
      }
      return result;
    };

    try{for(const key of Object.keys(current))wrapped[key]=current[key]}catch(_){}
    wrapped.__ccgV141R29Stable=true;
    wrapped.__ccgV142R22LoopRecoveryGuard=true;
    wrapped.__ccgOriginal=current;
    window.loop=wrapped;
    diagnostics.loopRepairs++;
    return window.loop===wrapped;
  }

  function install(){
    const alertReady=installAlertClamp();
    const rafReady=installRafRecoveryGuard();
    const loopReady=installLoopRecoveryGuard();
    return alertReady||rafReady||loopReady;
  }

  install();
  addEventListener("ccg:v142-ready",install,{once:true});

  window.CCGLostSizzlerV142R22StallElapsedHandoff=Object.freeze({version:"V10.42-r22",diagnostics,install});
})();
