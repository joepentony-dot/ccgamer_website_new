/* The Lost Sizzler V10.41 r29 — final animation-loop ownership after deferred guards. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R29_LOOP_FINALIZER__)return;
  window.__CCG_LOST_SIZZLER_V141_R29_LOOP_FINALIZER__=true;

  const state={timer:0,reassertions:0,lastLoop:null};

  function ensureFinalLoop(){
    const api=window.CCGLostSizzlerV141R29;
    if(!api?.install)return false;
    const before=window.loop;
    try{api.install()}catch(error){try{console.error("[Lost Sizzler r29] final loop ownership install failed safely",error)}catch(_){}return false}
    const current=window.loop;
    if(typeof current!=="function"||!current.__ccgV141R29Stable)return false;
    current.__ccgV141CrashContained=true;
    if(current!==before)state.reassertions++;
    state.lastLoop=current;
    return true;
  }

  ensureFinalLoop();
  state.timer=setInterval(ensureFinalLoop,40);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});

  window.CCGLostSizzlerV141R29LoopFinalizer={ensureFinalLoop,get state(){return state}};
})();
