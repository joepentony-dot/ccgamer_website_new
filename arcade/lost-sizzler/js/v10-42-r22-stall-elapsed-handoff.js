/* C64 Dungeon Carnage V10.42 r22 — live stall elapsed handoff. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R22StallElapsedHandoff)return;

  const diagnostics={stallFrames:0,alertDtClamps:0,catchupDrops:0,lastOriginalDt:0,lastAppliedDt:0,lastWallGap:0};
  const STALL_MS=120;
  const CATCHUP_DRAIN_MS=8;
  let lastWriterTick=performance.now(),wasNormalPlay=false,stallDrainUntil=0;

  const activeRun=()=>document.body?.dataset?.runActive==="true";
  const currentMode=()=>{try{return typeof mode!=="undefined"?String(mode):""}catch(_){return""}};
  const spyActive=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")==="sizzler-saboteurs"}catch(_){return false}};

  function reportStall(){
    diagnostics.stallFrames++;
    try{
      const r20=window.CCGLostSizzlerV142R20LiveRegressionStability;
      if(r20?.diagnostics)r20.diagnostics.frameStalls=Math.max(0,Number(r20.diagnostics.frameStalls)||0)+1;
    }catch(_){}
  }

  function install(){
    const current=window.updateAlert;
    if(typeof current!=="function")return false;
    if(current.__ccgV142R22StallElapsedHandoff===true)return true;

    const wrapped=function updateAlertV142R22StallElapsedHandoff(dt,...args){
      const now=performance.now();
      const wallGap=Math.max(0,now-lastWriterTick);
      lastWriterTick=now;
      diagnostics.lastWallGap=wallGap;

      let safeDt=Number(dt);
      diagnostics.lastOriginalDt=Number.isFinite(safeDt)?safeDt:0;
      const normalPlay=activeRun()&&currentMode()==="playing"&&!spyActive();
      const wallStall=normalPlay&&wasNormalPlay&&wallGap>STALL_MS&&wallGap<600000;

      if(wallStall){
        safeDt=Number.isFinite(safeDt)?Math.min(16,Math.max(0,safeDt)):16;
        stallDrainUntil=now+CATCHUP_DRAIN_MS;
        diagnostics.alertDtClamps++;
        reportStall();
      }else if(normalPlay&&now<stallDrainUntil){
        safeDt=0;
        diagnostics.catchupDrops++;
      }else if(normalPlay&&Number.isFinite(safeDt)&&safeDt>STALL_MS&&safeDt<600000){
        safeDt=16;
        stallDrainUntil=now+CATCHUP_DRAIN_MS;
        diagnostics.alertDtClamps++;
        reportStall();
      }

      wasNormalPlay=normalPlay;
      if(!normalPlay)stallDrainUntil=0;
      diagnostics.lastAppliedDt=Number.isFinite(safeDt)?safeDt:0;
      return current.call(this,safeDt,...args);
    };

    try{for(const key of Object.keys(current))wrapped[key]=current[key]}catch(_){}
    wrapped.__ccgV142R22StallElapsedHandoff=true;
    wrapped.__ccgOriginal=current;
    window.updateAlert=wrapped;
    return window.updateAlert===wrapped;
  }

  install();
  addEventListener("ccg:v142-ready",install,{once:true});

  window.CCGLostSizzlerV142R22StallElapsedHandoff=Object.freeze({version:"V10.42-r22",diagnostics,install});
})();
