/* The Lost Sizzler V10.42 r2 — preserve authoritative controller ownership. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R2_CONTROLLER_OWNER_SEAL__)return;
  window.__CCG_LOST_SIZZLER_V142_R2_CONTROLLER_OWNER_SEAL__=true;

  const MAINTENANCE_MS=200;
  const state={
    installed:false,
    unsupported:false,
    blockedWrites:0,
    maintenanceTicks:0,
    lastBlocked:null,
    timer:0
  };
  let controllerBoundary=null,getter=null,setter=null;

  function runtime(){return window.CCGLostSizzlerModeRuntime||null}
  function stability(){return window.CCGLostSizzlerV142R1Stability||null}
  function authoritativeBoundary(){
    const boundary=runtime()?.state?.sharedFrameBoundary;
    return typeof boundary==="function"&&boundary.__ccgV141ModeFrameBoundary===true?boundary:null
  }

  function gateActive(){
    if(!state.installed||typeof getter!=="function"||typeof setter!=="function")return false;
    let descriptor=null;
    try{descriptor=Object.getOwnPropertyDescriptor(window,"update")}catch(_){}
    return Boolean(descriptor&&descriptor.get===getter&&descriptor.set===setter&&descriptor.configurable===false)
  }

  function install(){
    if(gateActive())return true;
    controllerBoundary=authoritativeBoundary();
    if(!controllerBoundary)return false;
    let descriptor=null;
    try{descriptor=Object.getOwnPropertyDescriptor(window,"update")}catch(_){}
    if(descriptor&&descriptor.configurable===false){
      if(descriptor.get===getter&&descriptor.set===setter){state.installed=true;return true}
      state.unsupported=true;return false
    }

    getter=function getLostSizzlerAuthoritativeUpdate(){
      const latest=authoritativeBoundary();
      if(latest)controllerBoundary=latest;
      return controllerBoundary
    };
    setter=function setLostSizzlerAuthoritativeUpdate(value){
      const latest=authoritativeBoundary();
      if(latest)controllerBoundary=latest;
      if(value===controllerBoundary)return;
      state.blockedWrites++;
      state.lastBlocked=value;
    };

    try{
      Object.defineProperty(window,"update",{
        configurable:false,
        enumerable:descriptor?.enumerable!==false,
        get:getter,
        set:setter
      });
      state.installed=true;
      return window.update===controllerBoundary
    }catch(_){
      state.unsupported=true;
      getter=setter=null;
      return false
    }
  }

  function maintainCombatIntegrity(){
    if(document.hidden)return false;
    try{if(typeof mode!=="undefined"&&mode!=="playing")return false}catch(_){}
    const api=stability();
    try{api?.repairCombatTimers?.()}catch(_){}
    try{api?.repairProjectilePool?.()}catch(_){}
    state.maintenanceTicks++;
    return true
  }

  install();
  maintainCombatIntegrity();
  state.timer=setInterval(maintainCombatIntegrity,MAINTENANCE_MS);

  addEventListener("pagehide",()=>{
    if(state.timer)clearInterval(state.timer);
    state.timer=0;
  },{once:true});

  window.CCGLostSizzlerV142R2ControllerOwnerSeal={
    install,gateActive,authoritativeBoundary,maintainCombatIntegrity,
    get state(){return state}
  };
})();
