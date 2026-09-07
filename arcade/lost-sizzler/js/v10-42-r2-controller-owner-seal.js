/* The Lost Sizzler V10.42 r2 — preserve authoritative controller ownership. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R2_CONTROLLER_OWNER_SEAL__)return;
  window.__CCG_LOST_SIZZLER_V142_R2_CONTROLLER_OWNER_SEAL__=true;

  const MAINTENANCE_MS=200;
  const STARTUP_RETRY_DELAYS=[0,16,64,160];
  const state={
    installed:false,
    inheritedGate:false,
    inheritedGateProbes:0,
    inheritedGateRejects:0,
    unsupported:false,
    blockedWrites:0,
    maintenanceTicks:0,
    installAttempts:0,
    deferredInstallAttempts:0,
    lastBlocked:null,
    timer:0,
    startupTimers:[]
  };
  let controllerBoundary=null,getter=null,setter=null;

  function runtime(){return window.CCGLostSizzlerModeRuntime||null}
  function stability(){return window.CCGLostSizzlerV142R1Stability||null}
  function authoritativeBoundary(){
    const boundary=runtime()?.state?.sharedFrameBoundary;
    return typeof boundary==="function"&&boundary.__ccgV141ModeFrameBoundary===true?boundary:null
  }

  function inheritedGateActive(){
    if(!state.inheritedGate)return false;
    const boundary=authoritativeBoundary();
    let descriptor=null;
    try{descriptor=Object.getOwnPropertyDescriptor(window,"update")}catch(_){}
    const live=Boolean(boundary&&descriptor&&descriptor.configurable===false&&window.update===boundary);
    if(!live)state.inheritedGate=false;
    return live
  }

  function gateActive(){
    if(inheritedGateActive())return true;
    if(!state.installed||typeof getter!=="function"||typeof setter!=="function")return false;
    let descriptor=null;
    try{descriptor=Object.getOwnPropertyDescriptor(window,"update")}catch(_){}
    return Boolean(descriptor&&descriptor.get===getter&&descriptor.set===setter&&descriptor.configurable===false)
  }

  function acceptInheritedGate(descriptor,boundary){
    if(!descriptor||descriptor.configurable!==false||typeof boundary!=="function"||window.update!==boundary)return false;
    state.inheritedGateProbes++;
    const probe=function lostSizzlerV142InheritedSealProbe(){};
    let after=null;
    try{window.update=probe}catch(_){}
    try{after=window.update}catch(_){after=null}
    if(after===boundary){
      controllerBoundary=boundary;
      state.inheritedGate=true;
      state.installed=true;
      state.unsupported=false;
      clearStartupTimers();
      return true
    }
    state.inheritedGateRejects++;
    try{if(after===probe)window.update=boundary}catch(_){}
    return false
  }

  function install(){
    state.installAttempts++;
    if(gateActive())return true;
    controllerBoundary=authoritativeBoundary();
    if(!controllerBoundary)return false;
    let descriptor=null;
    try{descriptor=Object.getOwnPropertyDescriptor(window,"update")}catch(_){}
    if(descriptor&&descriptor.configurable===false){
      if(descriptor.get===getter&&descriptor.set===setter){state.installed=true;return true}
      if(acceptInheritedGate(descriptor,controllerBoundary))return true;
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
      clearStartupTimers();
      return window.update===controllerBoundary
    }catch(_){
      state.unsupported=true;
      getter=setter=null;
      return false
    }
  }

  function clearStartupTimers(){
    for(const timer of state.startupTimers)clearTimeout(timer);
    state.startupTimers.length=0;
  }

  function deferredInstall(){
    if(state.installed||state.unsupported)return;
    state.deferredInstallAttempts++;
    install()
  }

  function armStartupInstall(){
    queueMicrotask(deferredInstall);
    for(const delay of STARTUP_RETRY_DELAYS){
      const timer=setTimeout(deferredInstall,delay);
      state.startupTimers.push(timer)
    }
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",deferredInstall,{once:true});
    if(document.readyState!=="complete")addEventListener("load",deferredInstall,{once:true});
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

  if(!install())armStartupInstall();
  maintainCombatIntegrity();
  state.timer=setInterval(maintainCombatIntegrity,MAINTENANCE_MS);

  addEventListener("pagehide",()=>{
    clearStartupTimers();
    if(state.timer)clearInterval(state.timer);
    state.timer=0;
  },{once:true});

  window.CCGLostSizzlerV142R2ControllerOwnerSeal={
    install,gateActive,inheritedGateActive,authoritativeBoundary,maintainCombatIntegrity,
    get state(){return state}
  };
})();
