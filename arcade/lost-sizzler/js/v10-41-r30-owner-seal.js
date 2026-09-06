/* The Lost Sizzler V10.41 r30 — sealed normal-mode movement ownership. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R30_OWNER_SEAL__)return;
  window.__CCG_LOST_SIZZLER_V141_R30_OWNER_SEAL__=true;

  const SPY_MODE="sizzler-saboteurs",CHECK_MS=16;
  const state={timer:0,repairs:0,blockedWrites:0,lastRepairAt:0,lastObserved:null,lastBlocked:null,assignmentGate:false,assignmentGateUnsupported:false,assignmentGateLosses:0,tutorialWindow:false,pollStarts:0,pollRetirements:0,pollRetirementReason:""};
  let gatedMove=null,gateGetter=null,gateSetter=null;

  function r30(){return window.CCGLostSizzlerV141R30||null}
  function finalMovementStackReady(){
    const tutorial=window.CCGLostSizzlerV141TutorialActionFinalizer?.state;
    const spyFinal=window.CCGLostSizzlerV141SpyMovementFinalizer?.state;
    const stability=window.CCGLostSizzlerV141BrowserStabilityGameplay?.state;
    return Boolean(tutorial?.installed&&spyFinal?.moveInstalled&&stability?.moveGuard)
  }
  function broaderGuardActive(){
    const api=r30(),guard=api?.state;
    return Boolean(Number(guard?.timer||0)>0&&guard?.goldenLocked&&typeof guard?.goldenMove==="function"&&finalMovementStackReady())
  }
  function spyOwned(){
    try{
      const active=window.CCGLostSizzlerSpecialModes?.active?.type;
      const dataset=document.body?.dataset?.specialMode;
      const isolated=window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated;
      return String(active||dataset||"")===SPY_MODE||Boolean(isolated);
    }catch(_){return false}
  }
  function tutorialOwned(){
    try{
      const ts=window.CCGLostSizzlerOnboardingV120?.state;
      return Boolean(ts?.active||ts?.tutorialRequested||ts?.forceTutorial||document.body?.dataset?.tutorialActive==="true");
    }catch(_){return false}
  }
  function golden(){
    const api=r30(),move=api?.state?.goldenMove;
    return api?.state?.goldenLocked&&typeof move==="function"?move:null;
  }
  function setTutorialCompatibility(target,allowed){
    if(typeof target!=="function")return;
    try{
      if(allowed){target.__tutorial=true}
      else if(target.__tutorial===true)delete target.__tutorial;
    }catch(_){try{target.__tutorial=Boolean(allowed)}catch(__){}}
  }
  function syncTutorialWindow(){
    const target=golden(),active=tutorialOwned();
    // R30 is the sole normal-mode movement owner once the golden stack locks.
    // Keep that owner permanently marked tutorial-compatible so the legacy
    // 500 ms onboarding installer never wraps movePlayer again while training
    // is active. Tutorial progress can observe movement without owning it.
    if(target)setTutorialCompatibility(target,true);
    state.tutorialWindow=active;
    return active;
  }
  function noteR30OwnershipRepair(){
    try{
      const api=r30();
      if(api?.state){api.state.ownershipRepairs=Math.max(0,Number(api.state.ownershipRepairs||0))+1;api.state.lastOwnershipRepairAt=Date.now()}
    }catch(_){}
  }
  function noteBlockedWrite(value){
    state.blockedWrites++;state.lastBlocked=value;state.repairs++;state.lastRepairAt=Date.now();
    noteR30OwnershipRepair();
  }
  function assignmentGateActive(){
    if(!state.assignmentGate||typeof gateGetter!=="function"||typeof gateSetter!=="function")return false;
    let descriptor;
    try{descriptor=Object.getOwnPropertyDescriptor(window,"movePlayer")}catch(_){descriptor=null}
    const live=Boolean(descriptor&&descriptor.get===gateGetter&&descriptor.set===gateSetter);
    if(!live){state.assignmentGate=false;state.assignmentGateLosses++}
    return live
  }
  function installAssignmentGate(){
    if(assignmentGateActive())return true;
    if(state.assignmentGateUnsupported)return false;
    const target=golden();if(!target)return false;
    let descriptor;
    try{descriptor=Object.getOwnPropertyDescriptor(window,"movePlayer")}catch(_){descriptor=null}
    if(descriptor&&descriptor.configurable===false){state.assignmentGateUnsupported=true;return false}
    gatedMove=typeof window.movePlayer==="function"?window.movePlayer:target;
    gateGetter=function getMovePlayerR30OwnerSeal(){return gatedMove};
    gateSetter=function setMovePlayerR30OwnerSeal(value){
      const locked=golden(),tutorial=syncTutorialWindow();
      if(!locked||spyOwned()||tutorial||value===locked){gatedMove=value;return}
      noteBlockedWrite(value);gatedMove=locked;
    };
    try{
      Object.defineProperty(window,"movePlayer",{
        configurable:true,
        enumerable:descriptor?.enumerable!==false,
        get:gateGetter,
        set:gateSetter
      });
      state.assignmentGate=true;
      if(!spyOwned()&&!syncTutorialWindow())gatedMove=target;
      return true;
    }catch(_){state.assignmentGateUnsupported=true;gateGetter=gateSetter=null;return false}
  }
  function seal(reason="normal-mode owner seal"){
    const tutorial=syncTutorialWindow();
    installAssignmentGate();
    if(spyOwned()||tutorial)return false;
    const target=golden();if(!target)return false;
    setTutorialCompatibility(target,true);
    const current=window.movePlayer;state.lastObserved=current;
    if(current===target)return false;
    window.movePlayer=target;
    state.repairs++;state.lastRepairAt=Date.now();noteR30OwnershipRepair();
    try{r30()?.assertNormalRuntimeOwnership?.(reason)}catch(_){}
    try{if(typeof move1!=="undefined"&&Number(move1||0)>0)move1=0;if(typeof move2!=="undefined"&&Number(move2||0)>0)move2=0}catch(_){}
    return true;
  }

  function retirementCoverage(){
    if(assignmentGateActive())return"assignment-gate";
    if(broaderGuardActive())return"r30-global-guard";
    return""
  }
  function retirePollIfCovered(){
    const reason=retirementCoverage();if(!reason||!state.timer)return false;
    clearInterval(state.timer);state.timer=0;state.pollRetirements++;state.pollRetirementReason=reason;return true
  }
  function monitorSeal(){seal();retirePollIfCovered()}
  function ensureFallbackPoll(){
    if(retirementCoverage()||state.timer)return state.timer;
    state.timer=setInterval(monitorSeal,CHECK_MS);state.pollStarts++;return state.timer
  }

  function onMovementKey(event){
    const code=String(event?.code||"");
    if(!/^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|KeyA|KeyD|KeyW|KeyS|KeyI|KeyJ|KeyK|KeyL)$/.test(code))return;
    seal("movement-key owner seal");retirePollIfCovered();
  }

  addEventListener("keydown",onMovementKey,true);
  addEventListener("keyup",onMovementKey,true);
  seal("owner seal install");
  if(!retirementCoverage())ensureFallbackPoll();
  addEventListener("pagehide",()=>{
    if(state.timer)clearInterval(state.timer);state.timer=0;
    removeEventListener("keydown",onMovementKey,true);removeEventListener("keyup",onMovementKey,true);
  },{once:true});

  window.CCGLostSizzlerV141R30OwnerSeal={seal,installAssignmentGate,assignmentGateActive,finalMovementStackReady,broaderGuardActive,retirementCoverage,retirePollIfCovered,ensureFallbackPoll,spyOwned,tutorialOwned,syncTutorialWindow,get state(){return state}};
})();