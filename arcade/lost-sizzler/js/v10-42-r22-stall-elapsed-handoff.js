/* C64 Dungeon Carnage V10.42 r22 — live stall elapsed handoff. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R22StallElapsedHandoff)return;

  const diagnostics={stallFrames:0,alertDtClamps:0,catchupDrops:0,lastOriginalDt:0,lastAppliedDt:0,lastWallGap:0,loopRepairs:0,recoveryClamps:0};
  const STALL_MS=120;
  const NORMAL_FRAME_MS=16;
  const RECOVERY_PAD_MS=180;
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
          if(Number.isFinite(beforeElapsed)&&Number.isFinite(Number(run?.elapsed))&&Number(run.elapsed)-beforeElapsed>NORMAL_FRAME_MS)run.elapsed=beforeElapsed+NORMAL_FRAME_MS;
          if(Number.isFinite(beforeFloorElapsed)&&Number.isFinite(Number(host?.floorElapsed))&&Number(host.floorElapsed)-beforeFloorElapsed>NORMAL_FRAME_MS)host.floorElapsed=beforeFloorElapsed+NORMAL_FRAME_MS;
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
          try{
            if(Number.isFinite(recovery.elapsedBase)&&Number.isFinite(Number(run?.elapsed))&&Number(run.elapsed)>recovery.elapsedBase+allowance){
              run.elapsed=recovery.elapsedBase+allowance;
              diagnostics.recoveryClamps++;
            }
            if(Number.isFinite(recovery.floorBase)&&Number.isFinite(Number(host?.floorElapsed))&&Number(host.floorElapsed)>recovery.floorBase+allowance){
              host.floorElapsed=recovery.floorBase+allowance;
              diagnostics.recoveryClamps++;
            }
          }catch(_){}
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
    const loopReady=installLoopRecoveryGuard();
    return alertReady||loopReady;
  }

  install();
  addEventListener("ccg:v142-ready",install,{once:true});

  window.CCGLostSizzlerV142R22StallElapsedHandoff=Object.freeze({version:"V10.42-r22",diagnostics,install});
})();
