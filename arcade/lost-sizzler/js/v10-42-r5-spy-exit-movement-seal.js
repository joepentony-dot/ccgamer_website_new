/* The Lost Sizzler V10.42 r5 — Spy exit movement ownership seal. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R5_SPY_EXIT_MOVEMENT_SEAL__)return;
  window.__CCG_LOST_SIZZLER_V142_R5_SPY_EXIT_MOVEMENT_SEAL__=true;

  const engine=window.CCGLostSizzlerV141R29SpyEngine;
  if(!engine||typeof engine.leaveIsolation!=="function"||typeof engine.moveOwner!=="function"){
    window.CCGLostSizzlerV142R5SpyExitMovementSeal={installed:false,repairs:0};
    return;
  }

  const originalLeave=engine.leaveIsolation;
  if(originalLeave.__ccgV142R5SpyExitMovementSeal){
    window.CCGLostSizzlerV142R5SpyExitMovementSeal={installed:true,repairs:0};
    return;
  }

  const state={installed:true,repairs:0};
  const chainHas=(root,target)=>{
    const seen=new Set();let current=root,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth++<64){
      if(current===target)return true;
      seen.add(current);current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null;
    }
    return false;
  };

  function sealedLeaveIsolation(){
    const owner=engine.moveOwner;
    const retainedBefore=chainHas(window.movePlayer,owner);
    const fallback=typeof engine.state?.baseMove==="function"
      ? engine.state.baseMove
      : (typeof owner.__ccgOriginal==="function"?owner.__ccgOriginal:null);
    const result=originalLeave.apply(this,arguments);

    // r29's native exit restores movement when its owner is outermost. If a
    // compatibility wrapper was installed above the Spy owner during the match,
    // restore the exact pre-Spy movement boundary captured on entry instead of
    // carrying that Spy ancestry into the next match.
    if(retainedBefore&&typeof fallback==="function"&&window.movePlayer!==fallback){
      window.movePlayer=fallback;
      state.repairs++;
    }
    return result;
  }
  sealedLeaveIsolation.__ccgV142R5SpyExitMovementSeal=true;
  sealedLeaveIsolation.__ccgOriginal=originalLeave;
  engine.leaveIsolation=sealedLeaveIsolation;

  window.CCGLostSizzlerV142R5SpyExitMovementSeal=state;
})();
