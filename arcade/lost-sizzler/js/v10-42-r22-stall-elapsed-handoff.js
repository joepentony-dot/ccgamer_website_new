/* C64 Dungeon Carnage V10.42 r22 — live stall elapsed handoff. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R22StallElapsedHandoff)return;

  const diagnostics={stallFrames:0,runElapsedClamps:0,floorElapsedClamps:0};
  const STALL_MS=120;
  let lastDoorTick=performance.now(),lastRunElapsed=NaN,lastFloorElapsed=NaN;

  const activeRun=()=>document.body?.dataset?.runActive==="true";
  const currentMode=()=>{try{return typeof mode!=="undefined"?String(mode):""}catch(_){return""}};
  const spyActive=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")==="sizzler-saboteurs"}catch(_){return false}};

  function clampElapsed(runRef,hostRef,runBaseline,floorBaseline){
    try{
      if(run===runRef&&Number.isFinite(runBaseline)&&Number.isFinite(Number(run?.elapsed))&&Number(run.elapsed)-runBaseline>45){
        run.elapsed=runBaseline+16;
        diagnostics.runElapsedClamps++;
      }
    }catch(_){}
    try{
      if(host===hostRef&&Number.isFinite(floorBaseline)&&Number.isFinite(Number(host?.floorElapsed))&&Number(host.floorElapsed)-floorBaseline>45){
        host.floorElapsed=floorBaseline+16;
        diagnostics.floorElapsedClamps++;
      }
    }catch(_){}
  }

  function install(){
    const current=window.updateDoors;
    if(typeof current!=="function")return false;
    if(current.__ccgV142R22StallElapsedHandoff===true)return true;

    const wrapped=function updateDoorsV142R22StallElapsedHandoff(...args){
      const now=performance.now(),gap=Math.max(0,now-lastDoorTick);lastDoorTick=now;
      const normalPlay=activeRun()&&currentMode()==="playing"&&!spyActive();
      const stalled=normalPlay&&gap>STALL_MS&&gap<600000;
      let runRef=null,hostRef=null,runBaseline=NaN,floorBaseline=NaN;

      try{runRef=run;hostRef=host}catch(_){}
      if(stalled){
        runBaseline=lastRunElapsed;
        floorBaseline=lastFloorElapsed;
        diagnostics.stallFrames++;
        try{
          const r20=window.CCGLostSizzlerV142R20LiveRegressionStability;
          if(r20?.diagnostics)r20.diagnostics.frameStalls=Math.max(0,Number(r20.diagnostics.frameStalls)||0)+1;
        }catch(_){}
        clampElapsed(runRef,hostRef,runBaseline,floorBaseline);
      }

      const result=current.apply(this,args);

      if(stalled){
        clampElapsed(runRef,hostRef,runBaseline,floorBaseline);
        queueMicrotask(()=>{
          clampElapsed(runRef,hostRef,runBaseline,floorBaseline);
          try{lastRunElapsed=Number(run?.elapsed)}catch(_){lastRunElapsed=NaN}
          try{lastFloorElapsed=Number(host?.floorElapsed)}catch(_){lastFloorElapsed=NaN}
        });
      }else{
        try{lastRunElapsed=Number(run?.elapsed)}catch(_){lastRunElapsed=NaN}
        try{lastFloorElapsed=Number(host?.floorElapsed)}catch(_){lastFloorElapsed=NaN}
      }
      return result;
    };

    try{for(const key of Object.keys(current))wrapped[key]=current[key]}catch(_){}
    wrapped.__ccgV142R22StallElapsedHandoff=true;
    wrapped.__ccgOriginal=current;
    window.updateDoors=wrapped;
    return window.updateDoors===wrapped;
  }

  install();
  addEventListener("ccg:v142-ready",install,{once:true});
  document.addEventListener("visibilitychange",()=>{
    lastDoorTick=performance.now();
    try{lastRunElapsed=Number(run?.elapsed)}catch(_){lastRunElapsed=NaN}
    try{lastFloorElapsed=Number(host?.floorElapsed)}catch(_){lastFloorElapsed=NaN}
  });

  window.CCGLostSizzlerV142R22StallElapsedHandoff=Object.freeze({version:"V10.42-r22",diagnostics,install});
})();
