/* The Lost Sizzler V10.41 r30 — global movement/input ownership recovery and failsafe watchdogs. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R30_GLOBAL_MOVEMENT_GUARD__)return;
  window.__CCG_LOST_SIZZLER_V141_R30_GLOBAL_MOVEMENT_GUARD__=true;

  const SPY_MODE="sizzler-saboteurs",MONITOR_MS=40,STALL_RECOVERY_MS=700,RECOVERY_COOLDOWN_MS=550;
  const P1_CODES=new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS"]);
  const P2_CODES=new Set(["KeyI","KeyJ","KeyK","KeyL"]);
  const MOVE_CODES=new Set([...P1_CODES,...P2_CODES]);
  const ISOLATED_MARKERS=["__ccgV141R29SpyRuntimeOwner","__ccgV141SpyIsolated","__ccgV141SpyDamageBoundary"];
  const ORIGINAL_LINKS=["__ccgOriginal","__ccgV141Original","__ccgV141TutorialOriginal","__ccgV141R27Original","__ccgV141R25Original"];
  const state={
    timer:0,r29TimerStopped:false,r29InstallCooperative:false,spyTimerStopped:false,
    baselineUpdate:null,baselineMove:null,baselineHurt:null,
    goldenUpdate:null,goldenMove:null,goldenHurt:null,goldenLocked:false,goldenLockedAt:0,
    spyOwnerUpdate:null,spyOwnerMove:null,spyOwnerHurt:null,
    forcedRestores:0,ownershipRepairs:0,inputBridges:0,inputReassertions:0,
    watchdogRecoveries:0,watchdogMisses:0,watchdogCooldownBreaks:0,lastWatchdogRecoveryAt:0,
    notificationOwnershipRepairs:0,notificationPostInstallRepairs:0,nestedOwnershipDetections:0,
    lastRestoreAt:0,lastRestoreReason:"",lastModeType:"",modeTransitions:0,lastRecoveryLogAt:0
  };
  const held=new Set();
  const watches={p1:{x:null,y:null,code:"",since:0},p2:{x:null,y:null,code:"",since:0}};

  const special=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const modeType=()=>String(special()?.type||document.body?.dataset?.specialMode||"");
  const spyActive=()=>modeType()===SPY_MODE;
  const spyEngine=()=>window.CCGLostSizzlerV141R29SpyEngine||null;
  const r29=()=>window.CCGLostSizzlerV141R29||null;
  const playing=()=>{try{return mode==="playing"&&document.body?.dataset?.runActive==="true"}catch(_){return false}};
  const releaseReady=()=>document.body?.dataset?.releaseReady==="true";

  function originalLinks(fn){
    if(typeof fn!=="function")return[];
    const links=[];
    for(const key of ORIGINAL_LINKS){
      try{
        const linked=fn[key];
        if(typeof linked==="function"&&linked!==fn&&!links.includes(linked))links.push(linked);
      }catch(_){}
    }
    return links;
  }
  function originalLink(fn){return originalLinks(fn)[0]||null}
  function chainHas(fn,marker){
    if(typeof fn!=="function")return false;
    const queue=[{fn,depth:0}],seen=new Set();
    while(queue.length){
      const entry=queue.shift(),current=entry?.fn,depth=Number(entry?.depth||0);
      if(typeof current!=="function"||seen.has(current))continue;
      seen.add(current);
      try{if(current[marker]){if(depth>0)state.nestedOwnershipDetections++;return true}}catch(_){}
      if(depth>=47)continue;
      for(const linked of originalLinks(current))queue.push({fn:linked,depth:depth+1});
    }
    return false;
  }
  function spyContaminated(fn){return ISOLATED_MARKERS.some(marker=>chainHas(fn,marker))}
  function topLevelSpyOwner(fn){
    if(typeof fn!=="function")return false;
    return ISOLATED_MARKERS.some(marker=>{try{return Boolean(fn[marker])}catch(_){return false}})
  }
  function controllerProtectedUpdate(fn){
    if(typeof fn!=="function"||topLevelSpyOwner(fn))return false;
    return chainHas(fn,"__ccgV141ModeFrameBoundary")
  }

  function healthyBaseline(fn){return typeof fn==="function"&&!spyContaminated(fn)}
  function captureBaseline(){
    if(spyActive()||spyEngine()?.state?.isolated)return false;
    if(healthyBaseline(window.update))state.baselineUpdate=window.update;
    if(healthyBaseline(window.movePlayer))state.baselineMove=window.movePlayer;
    if(healthyBaseline(window.hurtPlayer))state.baselineHurt=window.hurtPlayer;
    if(releaseReady()&&!state.goldenLocked&&state.baselineUpdate&&state.baselineMove&&state.baselineHurt){
      state.goldenUpdate=state.baselineUpdate;state.goldenMove=state.baselineMove;state.goldenHurt=state.baselineHurt;
      state.goldenLocked=true;state.goldenLockedAt=Date.now();
    }
    return Boolean(state.baselineMove&&state.baselineUpdate&&state.baselineHurt);
  }
  const recoveryUpdate=()=>state.goldenUpdate||state.baselineUpdate;
  const recoveryMove=()=>state.goldenMove||state.baselineMove;
  const recoveryHurt=()=>state.goldenHurt||state.baselineHurt;

  function noteRecovery(reason){
    const now=Date.now();
    try{document.body.dataset.movementRecovery=String(state.forcedRestores+state.watchdogRecoveries)}catch(_){}
    if(now-state.lastRecoveryLogAt>1500){state.lastRecoveryLogAt=now;try{console.warn(`[Lost Sizzler r30] runtime movement failsafe recovered control ownership: ${reason}`)}catch(_){}}
  }

  function ensureStableLoopOnly(api){
    try{
      if(typeof window.loop!=="function"||!window.loop.__ccgV141R29Stable){if(typeof api?.stableLoop==="function")window.loop=api.stableLoop}
      if(typeof window.loop==="function"&&window.loop.__ccgV141R29Stable)window.loop.__ccgV141CrashContained=true;
      return Boolean(window.loop?.__ccgV141R29Stable);
    }catch(_){return false}
  }

  function stabilisePostR29Install(){
    try{
      const before=Boolean(window.showToast?.__ccgV141Priority);
      const stable=maintainNotificationOwnership();
      if(stable&&!before&&window.showToast?.__ccgV141Priority===true)state.notificationPostInstallRepairs++;
      return stable;
    }catch(_){return false}
  }

  function makeR29Cooperative(){
    const api=r29();if(!api?.install)return false;
    try{if(api.state?.timer){clearInterval(api.state.timer);api.state.timer=0;state.r29TimerStopped=true}}catch(_){}
    if(api.install.__ccgV141R30Cooperative){
      state.r29InstallCooperative=true;
      try{return api.install()}catch(_){return false}
    }
    const original=api.install.bind(api);
    const cooperative=function installV141R30Cooperative(){
      const isolated=Boolean(spyEngine()?.state?.isolated)||spyActive();
      if(isolated)return ensureStableLoopOnly(api);
      const result=original();
      stabilisePostR29Install();
      return result;
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
    state.spyOwnerUpdate=state.spyOwnerMove=state.spyOwnerHurt=null;noteRecovery(state.lastRestoreReason);return true;
  }

  function assertNormalRuntimeOwnership(reason="periodic invariant"){
    if(spyActive()||spyEngine()?.state?.isolated)return false;
    const currentUpdate=window.update,currentMove=window.movePlayer,currentHurt=window.hurtPlayer;
    const updateBad=typeof currentUpdate!=="function"||(!controllerProtectedUpdate(currentUpdate)&&spyContaminated(currentUpdate));
    const moveBad=typeof currentMove!=="function"||spyContaminated(currentMove);
    const hurtBad=typeof currentHurt!=="function"||spyContaminated(currentHurt);
    if(!(updateBad||moveBad||hurtBad))return false;
    const u=updateBad?recoveryUpdate():currentUpdate,m=moveBad?recoveryMove():currentMove,h=hurtBad?recoveryHurt():currentHurt;
    if((updateBad&&typeof u!=="function")||(moveBad&&typeof m!=="function")||(hurtBad&&typeof h!=="function"))return false;
    state.ownershipRepairs++;return forceRestore(u,m,h,reason);
  }

  function maintainSpyOwnership(){
    const engine=spyEngine();if(!engine)return false;stopLegacySpyMonitor();
    if(spyActive()){
      if(!engine.state?.isolated){
        engine.enterIsolation?.();
        if(engine.state?.isolated){state.spyOwnerUpdate=window.update;state.spyOwnerMove=window.movePlayer;state.spyOwnerHurt=window.hurtPlayer}
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
      const baseUpdate=engine.state.baseUpdate||recoveryUpdate(),baseMove=engine.state.baseMove||recoveryMove(),baseHurt=engine.state.baseHurt||recoveryHurt();
      try{engine.leaveIsolation?.()}catch(_){}
      forceRestore(baseUpdate,baseMove,baseHurt,"Spy runtime exit");captureBaseline();return true;
    }
    return assertNormalRuntimeOwnership("stale Spy owner outside Spy mode");
  }

  function maintainNotificationOwnership(){
    const finalizer=window.CCGLostSizzlerV141R29LoopFinalizer;
    if(!finalizer)return false;
    try{finalizer.ensureNotificationRailGuard?.()}catch(_){}
    try{finalizer.ensureNotificationToastOwner?.()}catch(_){}
    const current=window.showToast;if(typeof current!=="function")return false;
    if(current.__ccgV141Priority!==true){current.__ccgV141Priority=true;state.notificationOwnershipRepairs++}
    return true;
  }

  function editableVisible(target){
    try{
      const node=target?.closest?.("input,textarea,select,[contenteditable='true'],[contenteditable='']");if(!node)return false;
      if(node.closest?.(".hidden,[hidden]"))return false;
      const style=getComputedStyle(node),rect=node.getBoundingClientRect();
      return style.display!=="none"&&style.visibility!=="hidden"&&Number(rect.width)>1&&Number(rect.height)>1;
    }catch(_){return false}
  }
  function playerForCode(code){try{return P2_CODES.has(code)&&typeof p2!=="undefined"&&p2?p2:p1}catch(_){return null}}
  function bridgeKeyDown(event){
    if(!MOVE_CODES.has(event.code)||!playing()||editableVisible(event.target))return;
    held.add(event.code);
    try{input.add(event.code);const player=playerForCode(event.code);if(player&&typeof setDir==="function")setDir(player,event.code);state.inputBridges++}catch(_){}
  }
  function bridgeKeyUp(event){if(!MOVE_CODES.has(event.code))return;held.delete(event.code);try{input.delete(event.code)}catch(_){}}
  function resetWatch(watch){watch.x=null;watch.y=null;watch.code="";watch.since=0}
  function clearHeld(){held.clear();resetWatch(watches.p1);resetWatch(watches.p2)}

  function reassertHeldInput(){
    if(!playing()){clearHeld();return false}
    let changed=false;
    for(const code of held){try{if(!input.has(code)){input.add(code);changed=true;state.inputReassertions++}}catch(_){} }
    return changed;
  }

  function directionForCode(code,player){
    const p2Map={KeyJ:{x:-1,y:0},KeyL:{x:1,y:0},KeyI:{x:0,y:-1},KeyK:{x:0,y:1}};
    const p1Map={ArrowLeft:{x:-1,y:0},KeyA:{x:-1,y:0},ArrowRight:{x:1,y:0},KeyD:{x:1,y:0},ArrowUp:{x:0,y:-1},KeyW:{x:0,y:1},ArrowDown:{x:0,y:1},KeyS:{x:0,y:1}};
    try{return player===p2?p2Map[code]||null:p1Map[code]||null}catch(_){return p1Map[code]||null}
  }
  function occupiedTarget(player,x,y){
    try{if((host?.enemies||[]).some(enemy=>enemy?.alive&&Number(enemy.x)===x&&Number(enemy.y)===y))return true}catch(_){}
    try{if((host?.blockingDecor||[]).some(item=>Number(item.x)===x&&Number(item.y)===y))return true}catch(_){}
    try{if(typeof allPlayers==="function"&&allPlayers().some(other=>other&&other!==player&&Number(other.x)===x&&Number(other.y)===y))return true}catch(_){}
    return false;
  }
  function stepExpectedFree(player,dir){
    if(!player||!dir||!world?.map||!host)return false;
    const nx=Number(player.x)+dir.x,ny=Number(player.y)+dir.y;
    try{if(!window.CCGWorld?.walkable?.(world.map,nx,ny,host))return false}catch(_){return false}
    return !occupiedTarget(player,nx,ny);
  }
  function heldCodeFor(player){
    const allowed=(()=>{try{return player===p2?P2_CODES:P1_CODES}catch(_){return P1_CODES}})();
    for(const code of held)if(allowed.has(code))return code;
    return "";
  }
  function cooldownReady(player){
    try{if(player===p2)return Number(move2||0)<=0;return Number(move1||0)<=0}catch(_){return true}
  }
  function breakPoisonedCooldown(player){
    try{
      if(player===p2){if(Number(move2||0)>0){move2=0;state.watchdogCooldownBreaks++}}
      else if(Number(move1||0)>0){move1=0;state.watchdogCooldownBreaks++}
    }catch(_){}
  }

  function movementWatchdogFor(player,watch){
    if(!player||spyActive()||!playing()){resetWatch(watch);return false}
    const code=heldCodeFor(player);if(!code){resetWatch(watch);return false}
    const dir=directionForCode(code,player);
    if(!dir||!stepExpectedFree(player,dir)||(player.hitStunMs||0)>0){resetWatch(watch);return false}
    const x=Number(player.x),y=Number(player.y),now=performance.now();
    if(watch.code!==code||watch.x!==x||watch.y!==y){watch.code=code;watch.x=x;watch.y=y;watch.since=now;return false}
    if(now-watch.since<STALL_RECOVERY_MS||now-state.lastWatchdogRecoveryAt<RECOVERY_COOLDOWN_MS)return false;
    if(!cooldownReady(player))breakPoisonedCooldown(player);
    state.lastWatchdogRecoveryAt=now;
    assertNormalRuntimeOwnership("movement watchdog ownership repair");
    const owner=recoveryMove();if(typeof owner!=="function"||spyContaminated(owner)){state.watchdogMisses++;watch.since=now;return false}
    const beforeX=Number(player.x),beforeY=Number(player.y);
    try{window.movePlayer=owner;owner(player,dir.x,dir.y,false)}catch(_){state.watchdogMisses++;watch.since=now;return false}
    if(Number(player.x)!==beforeX||Number(player.y)!==beforeY){state.watchdogRecoveries++;watch.x=Number(player.x);watch.y=Number(player.y);watch.since=performance.now();noteRecovery("held-key movement watchdog");return true}
    state.watchdogMisses++;watch.since=now;return false;
  }
  function movementWatchdog(){
    let changed=false;
    try{changed=movementWatchdogFor(p1,watches.p1)||changed}catch(_){}
    try{if(typeof p2!=="undefined"&&p2)changed=movementWatchdogFor(p2,watches.p2)||changed}catch(_){}
    return changed;
  }

  function monitorModeTransition(){
    const current=modeType();if(current===state.lastModeType)return false;
    const previous=state.lastModeType;state.lastModeType=current;state.modeTransitions++;resetWatch(watches.p1);resetWatch(watches.p2);
    if(previous===SPY_MODE&&current!==SPY_MODE)setTimeout(()=>assertNormalRuntimeOwnership("post-Spy mode-transition invariant"),0);
    return true;
  }

  function maintain(){
    makeR29Cooperative();captureBaseline();monitorModeTransition();maintainSpyOwnership();
    if(!spyActive())assertNormalRuntimeOwnership();
    maintainNotificationOwnership();reassertHeldInput();movementWatchdog();
  }

  addEventListener("keydown",bridgeKeyDown,true);addEventListener("keyup",bridgeKeyUp,true);
  addEventListener("blur",clearHeld);document.addEventListener("visibilitychange",()=>{if(document.hidden)clearHeld()});
  maintain();state.timer=setInterval(maintain,MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);clearHeld()},{once:true});

  window.CCGLostSizzlerV141R30={
    originalLink,originalLinks,chainHas,spyContaminated,topLevelSpyOwner,controllerProtectedUpdate,captureBaseline,maintainSpyOwnership,maintainNotificationOwnership,assertNormalRuntimeOwnership,reassertHeldInput,movementWatchdog,makeR29Cooperative,
    constants:{ORIGINAL_LINKS},get state(){return state}
  };
})();