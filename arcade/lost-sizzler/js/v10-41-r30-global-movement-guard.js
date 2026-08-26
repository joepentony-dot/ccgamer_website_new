/* The Lost Sizzler V10.41 r30 — global movement/input ownership recovery. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R30_GLOBAL_MOVEMENT_GUARD__)return;
  window.__CCG_LOST_SIZZLER_V141_R30_GLOBAL_MOVEMENT_GUARD__=true;

  const SPY_MODE="sizzler-saboteurs",MONITOR_MS=40;
  const MOVE_CODES=new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS"]);
  const state={
    timer:0,r29TimerStopped:false,r29InstallCooperative:false,spyTimerStopped:false,
    baselineUpdate:null,baselineMove:null,baselineHurt:null,
    spyOwnerUpdate:null,spyOwnerMove:null,spyOwnerHurt:null,
    forcedRestores:0,inputBridges:0,inputReassertions:0,lastRestoreAt:0,lastRestoreReason:""
  };
  const held=new Set();

  const special=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const spyActive=()=>special()?.type===SPY_MODE;
  const spyEngine=()=>window.CCGLostSizzlerV141R29SpyEngine||null;
  const r29=()=>window.CCGLostSizzlerV141R29||null;
  const playing=()=>{try{return mode==="playing"&&document.body?.dataset?.runActive==="true"}catch(_){return false}};

  function chainHas(fn,marker){
    let current=fn;
    for(let depth=0;depth<32&&typeof current==="function";depth++){
      if(current?.[marker])return true;
      current=current.__ccgOriginal||current.__ccgV141Original||null;
    }
    return false;
  }

  function healthyBaseline(fn){return typeof fn==="function"&&!chainHas(fn,"__ccgV141R29SpyRuntimeOwner")}
  function captureBaseline(){
    if(spyActive()||spyEngine()?.state?.isolated)return false;
    if(healthyBaseline(window.update))state.baselineUpdate=window.update;
    if(healthyBaseline(window.movePlayer))state.baselineMove=window.movePlayer;
    if(healthyBaseline(window.hurtPlayer))state.baselineHurt=window.hurtPlayer;
    return Boolean(state.baselineMove&&state.baselineUpdate&&state.baselineHurt);
  }

  function ensureStableLoopOnly(api){
    try{
      if(typeof window.loop!=="function"||!window.loop.__ccgV141R29Stable){
        if(typeof api?.stableLoop==="function")window.loop=api.stableLoop;
      }
      if(typeof window.loop==="function"&&window.loop.__ccgV141R29Stable)window.loop.__ccgV141CrashContained=true;
      return Boolean(window.loop?.__ccgV141R29Stable);
    }catch(_){return false}
  }

  function makeR29Cooperative(){
    const api=r29();if(!api?.install)return false;
    try{
      if(api.state?.timer){clearInterval(api.state.timer);api.state.timer=0;state.r29TimerStopped=true}
    }catch(_){}
    if(api.install.__ccgV141R30Cooperative){state.r29InstallCooperative=true;return true}
    const original=api.install.bind(api);
    const cooperative=function installV141R30Cooperative(){
      const isolated=Boolean(spyEngine()?.state?.isolated)||spyActive();
      if(isolated)return ensureStableLoopOnly(api);
      return original();
    };
    cooperative.__ccgV141R30Cooperative=true;cooperative.__ccgOriginal=api.install;
    api.install=cooperative;state.r29InstallCooperative=true;return true;
  }

  function stopLegacySpyMonitor(){
    const engine=spyEngine();if(!engine?.state)return false;
    try{if(engine.state.timer){clearInterval(engine.state.timer);engine.state.timer=0;state.spyTimerStopped=true}}catch(_){}
    return true;
  }

  function forceRestore(updateFn,moveFn,hurtFn,reason){
    if(typeof updateFn==="function")window.update=updateFn;
    if(typeof moveFn==="function")window.movePlayer=moveFn;
    if(typeof hurtFn==="function")window.hurtPlayer=hurtFn;
    state.forcedRestores++;state.lastRestoreAt=Date.now();state.lastRestoreReason=String(reason||"runtime handoff");
    state.spyOwnerUpdate=state.spyOwnerMove=state.spyOwnerHurt=null;
    return true;
  }

  function maintainSpyOwnership(){
    const engine=spyEngine();if(!engine)return false;stopLegacySpyMonitor();
    if(spyActive()){
      if(!engine.state?.isolated){
        engine.enterIsolation?.();
        if(engine.state?.isolated){
          state.spyOwnerUpdate=window.update;state.spyOwnerMove=window.movePlayer;state.spyOwnerHurt=window.hurtPlayer;
        }
      }
      if(engine.state?.isolated){
        if(!state.spyOwnerUpdate)state.spyOwnerUpdate=window.update;
        if(!state.spyOwnerMove)state.spyOwnerMove=window.movePlayer;
        if(!state.spyOwnerHurt)state.spyOwnerHurt=window.hurtPlayer;
        if(typeof state.spyOwnerUpdate==="function"&&window.update!==state.spyOwnerUpdate)window.update=state.spyOwnerUpdate;
        if(typeof state.spyOwnerMove==="function"&&window.movePlayer!==state.spyOwnerMove)window.movePlayer=state.spyOwnerMove;
        if(typeof state.spyOwnerHurt==="function"&&window.hurtPlayer!==state.spyOwnerHurt)window.hurtPlayer=state.spyOwnerHurt;
      }
      return true;
    }

    if(engine.state?.isolated){
      const baseUpdate=engine.state.baseUpdate||state.baselineUpdate;
      const baseMove=engine.state.baseMove||state.baselineMove;
      const baseHurt=engine.state.baseHurt||state.baselineHurt;
      try{engine.leaveIsolation?.()}catch(_){}
      forceRestore(baseUpdate,baseMove,baseHurt,"Spy runtime exit");
      captureBaseline();
      return true;
    }

    const contaminated=chainHas(window.update,"__ccgV141R29SpyRuntimeOwner")||chainHas(window.movePlayer,"__ccgV141R29SpyRuntimeOwner")||chainHas(window.hurtPlayer,"__ccgV141R29SpyRuntimeOwner");
    if(contaminated&&state.baselineUpdate&&state.baselineMove&&state.baselineHurt){
      forceRestore(state.baselineUpdate,state.baselineMove,state.baselineHurt,"stale Spy owner outside Spy mode");
      return true;
    }
    return false;
  }

  function editableVisible(target){
    try{
      const node=target?.closest?.("input,textarea,select,[contenteditable='true'],[contenteditable='']");if(!node)return false;
      if(node.closest?.(".hidden,[hidden]"))return false;
      const style=getComputedStyle(node),rect=node.getBoundingClientRect();
      return style.display!=="none"&&style.visibility!=="hidden"&&Number(rect.width)>1&&Number(rect.height)>1;
    }catch(_){return false}
  }

  function bridgeKeyDown(event){
    if(!MOVE_CODES.has(event.code)||!playing()||editableVisible(event.target))return;
    held.add(event.code);
    try{input.add(event.code);if(p1&&typeof setDir==="function")setDir(p1,event.code);state.inputBridges++}catch(_){}
  }
  function bridgeKeyUp(event){if(!MOVE_CODES.has(event.code))return;held.delete(event.code);try{input.delete(event.code)}catch(_){}}
  function clearHeld(){held.clear()}

  function reassertHeldInput(){
    if(!playing()){held.clear();return false}
    let changed=false;
    for(const code of held){try{if(!input.has(code)){input.add(code);changed=true;state.inputReassertions++}}catch(_){}}
    return changed;
  }

  function maintain(){
    makeR29Cooperative();captureBaseline();maintainSpyOwnership();reassertHeldInput();
  }

  addEventListener("keydown",bridgeKeyDown,true);addEventListener("keyup",bridgeKeyUp,true);
  addEventListener("blur",clearHeld);document.addEventListener("visibilitychange",()=>{if(document.hidden)clearHeld()});
  maintain();state.timer=setInterval(maintain,MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);clearHeld()},{once:true});

  window.CCGLostSizzlerV141R30={chainHas,captureBaseline,maintainSpyOwnership,reassertHeldInput,makeR29Cooperative,get state(){return state}};
})();