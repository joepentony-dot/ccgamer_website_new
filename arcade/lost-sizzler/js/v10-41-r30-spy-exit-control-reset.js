/* The Lost Sizzler V10.41 r30 — deterministic Spy exit control-state reset. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R30_SPY_EXIT_CONTROL_RESET__)return;
  window.__CCG_LOST_SIZZLER_V141_R30_SPY_EXIT_CONTROL_RESET__=true;

  const state={installed:false,resets:0,timer:0,lastResetAt:0};

  function localPlayersSafe(){
    try{return typeof localPlayers==="function"?localPlayers():[typeof p1!=="undefined"?p1:null,typeof p2!=="undefined"?p2:null].filter(Boolean)}catch(_){return[]}
  }

  function resetPostSpyControls(){
    try{if(typeof move1!=="undefined")move1=0}catch(_){}
    try{if(typeof move2!=="undefined")move2=0}catch(_){}
    for(const player of localPlayersSafe()){
      if(!player)continue;
      try{player.hitStunMs=0}catch(_){}
      try{if("controlLocked" in player)player.controlLocked=false}catch(_){}
      try{if("controlsLocked" in player)player.controlsLocked=false}catch(_){}
    }
    try{window.CCGLostSizzlerV141R24LiveRegressions?.state&&(window.CCGLostSizzlerV141R24LiveRegressions.state.spyMoveCooldownMs=0)}catch(_){}
    try{window.CCGLostSizzlerV141R30?.assertNormalRuntimeOwnership?.("Spy exit control-state reset")}catch(_){}
    state.resets++;state.lastResetAt=Date.now();return true;
  }

  function install(){
    const engine=window.CCGLostSizzlerV141R29SpyEngine;
    if(!engine||typeof engine.leaveIsolation!=="function")return false;
    if(engine.leaveIsolation.__ccgV141R30PostSpyControlReset){state.installed=true;return true}
    const original=engine.leaveIsolation;
    const wrapped=function leaveIsolationV141R30ControlReset(){
      const wasIsolated=Boolean(engine.state?.isolated);
      const result=original.apply(this,arguments);
      if(wasIsolated&&!engine.state?.isolated)resetPostSpyControls();
      return result;
    };
    wrapped.__ccgV141R30PostSpyControlReset=true;wrapped.__ccgOriginal=original;
    engine.leaveIsolation=wrapped;state.installed=true;return true;
  }

  if(!install())state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},40);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141R30SpyExitControlReset={install,resetPostSpyControls,get state(){return state}};
})();
