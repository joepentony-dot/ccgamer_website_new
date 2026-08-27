/* The Lost Sizzler V10.41 r30 — sealed normal-mode movement ownership. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R30_OWNER_SEAL__)return;
  window.__CCG_LOST_SIZZLER_V141_R30_OWNER_SEAL__=true;

  const SPY_MODE="sizzler-saboteurs",CHECK_MS=16;
  const state={timer:0,repairs:0,blockedWrites:0,lastRepairAt:0,lastObserved:null,lastBlocked:null,assignmentGate:false,assignmentGateUnsupported:false};
  let gatedMove=null;

  function r30(){return window.CCGLostSizzlerV141R30||null}
  function spyOwned(){
    try{
      const active=window.CCGLostSizzlerSpecialModes?.active?.type;
      const dataset=document.body?.dataset?.specialMode;
      const isolated=window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated;
      return String(active||dataset||"")===SPY_MODE||Boolean(isolated);
    }catch(_){return false}
  }
  function tutorialOwned(){
    try{return Boolean(window.CCGLostSizzlerOnboardingV120?.state?.active)}catch(_){return false}
  }
  function golden(){
    const api=r30(),move=api?.state?.goldenMove;
    return api?.state?.goldenLocked&&typeof move==="function"?move:null;
  }
  function installAssignmentGate(){
    if(state.assignmentGate||state.assignmentGateUnsupported)return state.assignmentGate;
    const target=golden();if(!target)return false;
    let descriptor;
    try{descriptor=Object.getOwnPropertyDescriptor(window,"movePlayer")}catch(_){descriptor=null}
    if(descriptor&&descriptor.configurable===false){state.assignmentGateUnsupported=true;return false}
    gatedMove=typeof window.movePlayer==="function"?window.movePlayer:target;
    try{
      Object.defineProperty(window,"movePlayer",{
        configurable:true,
        enumerable:descriptor?.enumerable!==false,
        get(){return gatedMove},
        set(value){
          const locked=golden();
          if(!locked||spyOwned()||tutorialOwned()||value===locked){gatedMove=value;return}
          state.blockedWrites++;state.lastBlocked=value;gatedMove=locked;
        }
      });
      state.assignmentGate=true;
      if(!spyOwned()&&!tutorialOwned())gatedMove=target;
      return true;
    }catch(_){state.assignmentGateUnsupported=true;return false}
  }
  function seal(reason="normal-mode owner seal"){
    installAssignmentGate();
    if(spyOwned()||tutorialOwned())return false;
    const target=golden();if(!target)return false;
    const current=window.movePlayer;state.lastObserved=current;
    if(current===target)return false;
    window.movePlayer=target;
    state.repairs++;state.lastRepairAt=Date.now();
    try{r30()?.assertNormalRuntimeOwnership?.(reason)}catch(_){}
    try{if(typeof move1!=="undefined"&&Number(move1||0)>0)move1=0;if(typeof move2!=="undefined"&&Number(move2||0)>0)move2=0}catch(_){}
    return true;
  }

  function onMovementKey(event){
    const code=String(event?.code||"");
    if(!/^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|KeyA|KeyD|KeyW|KeyS|KeyI|KeyJ|KeyK|KeyL)$/.test(code))return;
    seal("movement-key owner seal");
  }

  addEventListener("keydown",onMovementKey,true);
  addEventListener("keyup",onMovementKey,true);
  state.timer=setInterval(()=>seal(),CHECK_MS);
  seal("owner seal install");
  addEventListener("pagehide",()=>{
    if(state.timer)clearInterval(state.timer);state.timer=0;
    removeEventListener("keydown",onMovementKey,true);removeEventListener("keyup",onMovementKey,true);
  },{once:true});

  window.CCGLostSizzlerV141R30OwnerSeal={seal,installAssignmentGate,spyOwned,tutorialOwned,get state(){return state}};
})();