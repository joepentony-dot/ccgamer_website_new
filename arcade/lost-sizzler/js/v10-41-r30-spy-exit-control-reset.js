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

  function cacheToken(){
    return String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"latest").trim()
  }

  function loadPostPlaytestStability(){
    if(document.querySelector('script[data-ccg-post-playtest-stability="true"]'))return true;
    const script=document.createElement("script");
    script.src=`js/v10-41-post-playtest-stability.js?v=${encodeURIComponent(cacheToken())}`;
    script.async=false;script.dataset.ccgPostPlaytestStability="true";document.head.appendChild(script);return true;
  }

  function loadUiSpyPerformanceHardening(){
    if(document.querySelector('script[data-ccg-ui-spy-performance-hardening="true"]'))return true;
    const script=document.createElement("script");
    script.src=`js/v10-41-ui-spy-performance-hardening.js?v=${encodeURIComponent(cacheToken())}`;
    script.async=false;script.dataset.ccgUiSpyPerformanceHardening="true";document.head.appendChild(script);return true;
  }

  function loadHordeFramePerformance(){
    if(document.querySelector('script[data-ccg-horde-frame-performance="true"]'))return true;
    const script=document.createElement("script");
    script.src=`js/v10-41-horde-frame-performance.js?v=${encodeURIComponent(cacheToken())}`;
    script.async=false;script.dataset.ccgHordeFramePerformance="true";document.head.appendChild(script);return true;
  }

  loadPostPlaytestStability();
  loadUiSpyPerformanceHardening();
  loadHordeFramePerformance();
  if(!install())state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},40);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141R30SpyExitControlReset={install,resetPostSpyControls,loadPostPlaytestStability,loadUiSpyPerformanceHardening,loadHordeFramePerformance,get state(){return state}};
})();
