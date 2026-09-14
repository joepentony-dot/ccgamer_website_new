/* C64 Dungeon Carnage V10.42 r22 — live stall elapsed handoff. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R22StallElapsedHandoff)return;

  const diagnostics={stallFrames:0,alertDtClamps:0,catchupDrops:0,lastOriginalDt:0,lastAppliedDt:0,lastWallGap:0,loopRepairs:0,recoveryClamps:0,rafGuardInstalls:0,rafRecoveryFrames:0,pauseBoundarySkips:0,debtRepaidMs:0,maxDebtMs:0};
  const STALL_MS=300;
  const NORMAL_FRAME_MS=16;
  const RECOVERY_PAD_MS=180;
  const RAF_RECOVERY_FRAMES=4;
  const RAF_RECOVERY_MAX_STEP_MS=120;
  const RAF_RECOVERY_MAX_DEBT_MS=1080;
  let lastWriterTick=performance.now();

  const activeRun=()=>document.body?.dataset?.runActive==="true";
  const currentMode=()=>{try{return typeof mode!=="undefined"?String(mode):""}catch(_){return""}};
  const spyActive=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")==="sizzler-saboteurs"}catch(_){return false}};
  const normalPlay=()=>activeRun()&&currentMode()==="playing"&&!spyActive();
  const pauseBoundaryCount=()=>{try{return Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.pauseBoundaries)||0}catch(_){return 0}};
  const r59Api=()=>{try{return window.CCGLostSizzlerV141R59LiveRegressionFixes||null}catch(_){return null}};

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
    let lastPauseBoundary=pauseBoundaryCount();

    const wrapped=function requestAnimationFrameV142R22RafRecoveryGuard(callback){
      if(typeof callback!=="function")return current.call(this,callback);
      return current.call(this,function(timestamp){
        const api=r59Api();
        const r59Callback=Boolean(api&&(callback===api.stableLoopR59||callback.__ccgV141R59PauseClock===true));
        if(!r59Callback)return callback.apply(this,arguments);

        const t=Number(timestamp);
        const ownsNormalFrame=normalPlay();
        const pauseBoundary=pauseBoundaryCount();
        const crossedPauseBoundary=pauseBoundary!==lastPauseBoundary;
        lastPauseBoundary=pauseBoundary;
        const previous=previousRafTimestamp;
        const gap=Number.isFinite(t)&&previous>0?Math.max(0,t-previous):0;
        if(Number.isFinite(t))previousRafTimestamp=t;

        if(crossedPauseBoundary){
          recovery=null;
          diagnostics.pauseBoundarySkips++;
          if(ownsNormalFrame&&Number.isFinite(t)){
            try{
              if(typeof last!=="undefined"&&Number.isFinite(Number(last)))last=t-NORMAL_FRAME_MS;
              api?.setAcceptedRafTimestamp?.(t-NORMAL_FRAME_MS);
            }catch(_){}
          }
        }else if(ownsNormalFrame&&gap>STALL_MS&&gap<600000){
          const carried=Number(recovery?.debtMs)||0;
          const debtMs=Math.min(RAF_RECOVERY_MAX_DEBT_MS,carried+Math.max(0,gap-NORMAL_FRAME_MS));
          recovery={debtMs,frames:0,lastFrameTimestamp:t};
          diagnostics.maxDebtMs=Math.max(diagnostics.maxDebtMs,debtMs);
          try{
            if(typeof last!=="undefined"&&Number.isFinite(Number(last)))last=t-NORMAL_FRAME_MS;
            api?.setAcceptedRafTimestamp?.(t-NORMAL_FRAME_MS);
          }catch(_){}
          reportStall();
        }else if(ownsNormalFrame&&recovery&&Number.isFinite(t)){
          const debtBefore=Math.max(0,Number(recovery.debtMs)||0);
          const wallStep=Math.max(0,Number(gap)||0);
          const desiredStep=Math.min(RAF_RECOVERY_MAX_STEP_MS,Math.max(NORMAL_FRAME_MS,wallStep)+debtBefore);
          const repaid=Math.max(0,desiredStep-wallStep);
          if(repaid>0){
            recovery.debtMs=Math.max(0,debtBefore-repaid);
            recovery.frames=Math.max(0,Number(recovery.frames)||0)+1;
            recovery.lastFrameTimestamp=t;
            diagnostics.rafRecoveryFrames++;
            diagnostics.debtRepaidMs+=repaid;
            try{
              if(typeof last!=="undefined"&&Number.isFinite(Number(last)))last=t-desiredStep;
              api?.setAcceptedRafTimestamp?.(t-desiredStep);
            }catch(_){}
          }
          if(recovery.debtMs<=0)recovery=null;
        }else if(!ownsNormalFrame){
          recovery=null;
        }

        return callback.apply(this,arguments);
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
    let lastPauseBoundary=pauseBoundaryCount();
    const wrapped=function loopV142R22RecoveryGuard(timestamp){
      const ownsNormalFrame=normalPlay();
      const t=Number(timestamp);
      const wallNow=performance.now();
      const pauseBoundary=pauseBoundaryCount();
      const crossedPauseBoundary=pauseBoundary!==lastPauseBoundary;
      lastPauseBoundary=pauseBoundary;
      let stalled=false,gap=NORMAL_FRAME_MS,beforeElapsed=NaN,beforeFloorElapsed=NaN;

      if(crossedPauseBoundary){
        recovery=null;
        diagnostics.pauseBoundarySkips++;
        if(ownsNormalFrame&&Number.isFinite(t)){
          try{if(typeof last!=="undefined"&&Number.isFinite(Number(last)))last=t-NORMAL_FRAME_MS}catch(_){}
        }
      }else if(ownsNormalFrame&&Number.isFinite(t)){
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
