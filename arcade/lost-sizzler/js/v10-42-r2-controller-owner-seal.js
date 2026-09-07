/* The Lost Sizzler V10.42 r2 — preserve authoritative controller ownership. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R2_CONTROLLER_OWNER_SEAL__)return;
  window.__CCG_LOST_SIZZLER_V142_R2_CONTROLLER_OWNER_SEAL__=true;

  const MAINTENANCE_MS=200;
  const STARTUP_RETRY_DELAYS=[0,16,64,160];
  const state={
    installed:false,
    unsupported:false,
    blockedWrites:0,
    maintenanceTicks:0,
    installAttempts:0,
    deferredInstallAttempts:0,
    runtimeBoundaryDrifts:0,
    lockMode:"",
    lastBlocked:null,
    lastRuntimeBoundary:null,
    timer:0,
    startupTimers:[]
  };
  let controllerBoundary=null;

  function runtime(){return window.CCGLostSizzlerModeRuntime||null}
  function stability(){return window.CCGLostSizzlerV142R1Stability||null}
  function authoritativeBoundary(){
    const boundary=runtime()?.state?.sharedFrameBoundary;
    return typeof boundary==="function"&&boundary.__ccgV141ModeFrameBoundary===true?boundary:null
  }

  function runtimeBoundaryStatus(){
    const latest=authoritativeBoundary(),drift=Boolean(controllerBoundary&&latest&&latest!==controllerBoundary);
    if(drift&&state.lastRuntimeBoundary!==latest)state.runtimeBoundaryDrifts++;
    state.lastRuntimeBoundary=latest||null;
    return{locked:controllerBoundary,current:latest,drift}
  }

  function gateActive(){
    if(!state.installed||typeof controllerBoundary!=="function")return false;
    let descriptor=null;
    try{descriptor=Object.getOwnPropertyDescriptor(window,"update")}catch(_){}
    return Boolean(
      descriptor&&
      Object.prototype.hasOwnProperty.call(descriptor,"value")&&
      descriptor.value===controllerBoundary&&
      descriptor.writable===false&&
      descriptor.configurable===false
    )
  }

  function install(){
    state.installAttempts++;
    if(gateActive()){runtimeBoundaryStatus();return true}
    if(!controllerBoundary)controllerBoundary=authoritativeBoundary();
    if(!controllerBoundary)return false;

    let descriptor=null;
    try{descriptor=Object.getOwnPropertyDescriptor(window,"update")}catch(_){}
    if(descriptor&&!Object.prototype.hasOwnProperty.call(descriptor,"value")&&descriptor.configurable===false){
      state.unsupported=true;state.lockMode="unsupported-accessor";return false
    }
    if(descriptor&&descriptor.configurable===false&&descriptor.writable===false&&descriptor.value!==controllerBoundary){
      state.unsupported=true;state.lockMode="unsupported-fixed-owner";return false
    }

    try{
      Object.defineProperty(window,"update",{
        configurable:false,
        enumerable:descriptor?.enumerable!==false,
        writable:false,
        value:controllerBoundary
      });
      state.installed=true;
      state.unsupported=false;
      state.lockMode="frozen-data";
      clearStartupTimers();
      runtimeBoundaryStatus();
      return gateActive()
    }catch(_){
      state.unsupported=true;state.lockMode="define-failed";
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
    runtimeBoundaryStatus();
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
    install,gateActive,authoritativeBoundary,runtimeBoundaryStatus,maintainCombatIntegrity,
    get state(){return state}
  };
})();
