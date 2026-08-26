/* The Lost Sizzler V10.41 — authoritative game-mode controller lifecycle. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_MODE_RUNTIME__)return;
  window.__CCG_LOST_SIZZLER_V141_MODE_RUNTIME__=true;

  const IDS=Object.freeze({
    DUNGEON_SOLO:"dungeon-solo",
    DUNGEON_ONLINE:"dungeon-online",
    HORDE_SOLO:"horde-solo",
    HORDE_ONLINE:"horde-online",
    SPY_ONLINE:"spy-online",
    SPLIT_SCREEN:"split-screen"
  });
  const SPECIAL_HORDE="horde-survivor",SPECIAL_SPY="sizzler-saboteurs",MONITOR_MS=40;
  const SHARED_CORE=Object.freeze(["rendering","collision","enemy-components","audio","basic-weapons","player-movement"]);
  const MODE_OWNED=Object.freeze(["wave-transitions","control-locking","death-state","respawning","hazards","scoring","multiplayer-sync","mode-ui"]);
  const OWNED_SYSTEMS=Object.freeze({
    updateCamping:Object.freeze({capability:"antiCamping",blockedReturn:false}),
    updateHazards:Object.freeze({capability:"antiCamping",blockedReturn:false}),
    updateDedicatedHazards:Object.freeze({capability:"dedicatedHazards",blockedReturn:false}),
    updateGenerators:Object.freeze({capability:"dungeonSystems",blockedReturn:false}),
    updateArena:Object.freeze({capability:"dungeonSystems",blockedReturn:false}),
    updateTimed:Object.freeze({capability:"dungeonSystems",blockedReturn:false}),
    updateBoulder:Object.freeze({capability:"dungeonSystems",blockedReturn:false}),
    updateMemoryPuzzle:Object.freeze({capability:"dungeonSystems",blockedReturn:false}),
    updateRescue:Object.freeze({capability:"dungeonSystems",blockedReturn:false}),
    updateBanishment:Object.freeze({capability:"dungeonSystems",blockedReturn:false}),
    updateStalker:Object.freeze({capability:"dungeonSystems",blockedReturn:false}),
    updateFloorObjective:Object.freeze({capability:"dungeonSystems",blockedReturn:false}),
    updateAlert:Object.freeze({capability:"dungeonSystems",blockedReturn:false}),
    updateRoomEvents:Object.freeze({capability:"dungeonSystems",blockedReturn:false}),
    triggerSwitch:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    activateSwitch:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    triggerTrader:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    triggerDeathCache:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    triggerBloodClue:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    triggerMemoryPuzzle:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    triggerSequenceTorch:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    triggerWeightBridge:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    triggerShrine:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    triggerTrap:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    triggerRescue:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    triggerArena:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    triggerTimed:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    triggerBoulder:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    triggerHauntedCorridor:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    triggerSigilRoom:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    closeNearbyDoor:Object.freeze({capability:"dungeonInteractions",blockedReturn:false}),
    openChest:Object.freeze({capability:"dungeonInteractions",blockedReturn:true}),
    tryChest:Object.freeze({capability:"dungeonInteractions",blockedReturn:true})
  });

  function profile(id,options={}){
    return Object.freeze({
      id,
      family:options.family||"dungeon",
      online:Boolean(options.online),
      split:Boolean(options.split),
      dungeonSystems:Boolean(options.dungeonSystems),
      dungeonInteractions:Boolean(options.dungeonInteractions),
      antiCamping:Boolean(options.antiCamping),
      dedicatedHazards:Boolean(options.dedicatedHazards),
      waveController:Boolean(options.waveController),
      spyController:Boolean(options.spyController),
      sharedCore:SHARED_CORE,
      modeOwned:MODE_OWNED
    });
  }

  const dungeonCapabilities={dungeonSystems:true,dungeonInteractions:true,antiCamping:true,dedicatedHazards:true};
  const PROFILES=Object.freeze({
    [IDS.DUNGEON_SOLO]:profile(IDS.DUNGEON_SOLO,{family:"dungeon",...dungeonCapabilities}),
    [IDS.DUNGEON_ONLINE]:profile(IDS.DUNGEON_ONLINE,{family:"dungeon",online:true,...dungeonCapabilities}),
    [IDS.HORDE_SOLO]:profile(IDS.HORDE_SOLO,{family:"horde",dungeonSystems:false,dungeonInteractions:false,waveController:true}),
    [IDS.HORDE_ONLINE]:profile(IDS.HORDE_ONLINE,{family:"horde",online:true,dungeonSystems:false,dungeonInteractions:false,waveController:true}),
    [IDS.SPY_ONLINE]:profile(IDS.SPY_ONLINE,{family:"spy",online:true,dungeonSystems:false,dungeonInteractions:false,spyController:true}),
    [IDS.SPLIT_SCREEN]:profile(IDS.SPLIT_SCREEN,{family:"dungeon",split:true,...dungeonCapabilities})
  });

  function controller(id){
    return{
      id,profile:PROFILES[id],state:{entries:0,exits:0,frames:0,resets:0,lastEnterAt:0,lastExitAt:0,lastReason:"",lastWave:0,lastPhase:"",hazardsPurged:0,campingPurges:0,ownedCalls:0,blockedOwnedCalls:0,deathPresentations:0},
      enter(reason){this.state.entries++;this.state.lastEnterAt=Date.now();this.state.lastReason=String(reason||"mode enter")},
      exit(reason){this.state.exits++;this.state.lastExitAt=Date.now();this.state.lastReason=String(reason||"mode exit")},
      frame(){this.state.frames++}
    };
  }
  const controllers=new Map(Object.values(IDS).map(id=>[id,controller(id)]));
  const ownedSystems=new Map();
  const state={
    activeId:"",previousId:"",transitions:0,generation:0,timer:0,lastSyncAt:0,lastTransitionReason:"",lastResetReason:"",
    hordeWaveResets:0,hordePhaseResets:0,globalHazardsPurged:0,globalCampingPurges:0,
    hordeLoadoutMaintenances:0,hordeReserveMaintenances:0,hordeFocusPostFrames:0,hordeLivePostFrames:0,hordeCombatPreFrames:0,hordeCombatPostFrames:0,hordeCompletionPostFrames:0,
    spyRuleFrames:0,spySourceBypasses:0,spyFrameMisses:0,
    r25SpecialPreFrames:0,r25SpecialPostFrames:0,r26DungeonPreFrames:0,r26DungeonPostFrames:0,
    sharedFrameBoundary:null,sharedFrameBoundarySource:null,sharedFrameBoundaryInstalls:0,sharedFrameBoundaryReassertions:0,sharedPreFrames:0,sharedPostFrames:0,sharedSourceFrames:0,
    ownedSystemInstalls:0,ownedSystemReassertions:0,ownedSystemCalls:0,blockedOwnedSystemCalls:0,hordeDeathPresentations:0
  };

  const special=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const specialType=()=>String(special()?.type||document.body?.dataset?.specialMode||"");
  const playModeValue=()=>{try{return String(playMode||"")}catch(_){return""}};
  const hordeSoloFlag=()=>document.body?.dataset?.hordeSolo==="true";

  function detect(){
    const type=specialType();
    if(type===SPECIAL_HORDE)return hordeSoloFlag()?IDS.HORDE_SOLO:IDS.HORDE_ONLINE;
    if(type===SPECIAL_SPY)return IDS.SPY_ONLINE;
    const play=playModeValue();
    if(play==="split")return IDS.SPLIT_SCREEN;
    if(play==="online")return IDS.DUNGEON_ONLINE;
    return IDS.DUNGEON_SOLO;
  }

  function activeController(){return controllers.get(state.activeId)||controllers.get(IDS.DUNGEON_SOLO)}
  function activeProfile(){return activeController().profile}
  function allows(capability){return Boolean(activeProfile()?.[capability])}
  function inFamily(family){return activeProfile()?.family===String(family||"")}
  function localPlayerList(){try{return typeof localPlayers==="function"?localPlayers():[typeof p1!=="undefined"?p1:null,typeof p2!=="undefined"?p2:null].filter(Boolean)}catch(_){return[]}}

  function clearGlobalArray(name){
    try{
      const value=eval(name);
      if(Array.isArray(value)){const count=value.length;value.length=0;return count}
    }catch(_){}
    return 0
  }
  function clearGlobalMap(name){
    try{
      const value=eval(name);
      const size=Number(value?.size||0);value?.clear?.();return size
    }catch(_){return 0}
  }
  function zeroGlobal(name){try{eval(`${name}=0`);return true}catch(_){return false}}

  function resetControlCooldowns(){
    for(const name of ["move1","move2","fire1","fire2","fireBuffer1","fireBuffer2"])zeroGlobal(name);
    for(const player of localPlayerList()){
      if(!player)continue;
      if(Number(player.hitStunMs||0)>0)player.hitStunMs=0;
      if("controlLocked" in player)player.controlLocked=false;
      if("controlsLocked" in player)player.controlsLocked=false;
    }
  }

  function clearDungeonTransient(options={}){
    const clearEnemyShots=Boolean(options.clearEnemyShots),clearInput=Boolean(options.clearInput);
    const hazardsRemoved=clearGlobalArray("hazards"),campRemoved=clearGlobalMap("campStates");
    if(clearEnemyShots)clearGlobalArray("enemyBullets");
    if(clearInput){try{input?.clear?.()}catch(_){}
    }
    try{if(host){if(Array.isArray(host.hazardRooms))host.hazardRooms.length=0;if(Array.isArray(host.traps))host.traps.length=0}}catch(_){}
    state.globalHazardsPurged+=hazardsRemoved;state.globalCampingPurges+=campRemoved;
    return{hazardsRemoved,campRemoved}
  }

  function resetModeTransient(reason,options={}){
    resetControlCooldowns();
    const result=clearDungeonTransient(options);
    state.lastResetReason=String(reason||"mode transient reset");
    const current=activeController();current.state.resets++;current.state.hazardsPurged+=result.hazardsRemoved;current.state.campingPurges+=result.campRemoved;
    return result
  }

  function clearHordePresentation(){
    try{
      delete document.body?.dataset?.hordeSolo;
      const banner=document.getElementById?.("horde-transition-banner");
      if(banner)banner.dataset.visible="false";
    }catch(_){}
  }

  function enterController(next,previous,reason){
    next.enter(reason);
    document.body?.setAttribute?.("data-mode-controller",next.id);
    if(next.profile.family==="horde"||next.profile.family==="spy")resetModeTransient(`${next.id} enter`,{clearEnemyShots:true,clearInput:true});
    else if(previous&&(previous.profile.family==="horde"||previous.profile.family==="spy"))resetModeTransient(`${next.id} post-special enter`,{clearEnemyShots:true,clearInput:true});
    if(next.profile.family!=="horde")clearHordePresentation();
    if(next.id===IDS.SPY_ONLINE)try{window.CCGLostSizzlerV141R29SpyEngine?.enterIsolation?.()}catch(error){console.warn("[Lost Sizzler mode runtime] Spy enter failed",error)}
  }

  function leaveController(previous,next,reason){
    if(!previous)return;
    previous.exit(reason);
    if(previous.id===IDS.SPY_ONLINE)try{window.CCGLostSizzlerV141R29SpyEngine?.leaveIsolation?.()}catch(error){console.warn("[Lost Sizzler mode runtime] Spy exit failed",error)}
    if((previous.profile.family==="horde"||previous.profile.family==="spy")&&next?.profile.family!==previous.profile.family)resetModeTransient(`${previous.id} exit`,{clearEnemyShots:true,clearInput:true});
  }

  function sync(reason="runtime monitor"){
    const id=detect(),now=performance.now();state.lastSyncAt=now;
    if(id===state.activeId)return activeController();
    const previous=controllers.get(state.activeId)||null,next=controllers.get(id)||controllers.get(IDS.DUNGEON_SOLO);
    state.previousId=state.activeId;leaveController(previous,next,reason);state.activeId=next.id;state.transitions++;state.generation++;state.lastTransitionReason=String(reason||"mode transition");enterController(next,previous,reason);
    return next
  }

  function blockedReturnFor(definition){return definition?.blockedReturn}
  function dispatchOwnedSystem(name,source,thisArg,args){
    const definition=OWNED_SYSTEMS[name];
    if(!definition||typeof source!=="function")return undefined;
    const current=sync(`owned system ${name}`);current.state.ownedCalls++;state.ownedSystemCalls++;
    if(!allows(definition.capability)){
      current.state.blockedOwnedCalls++;state.blockedOwnedSystemCalls++;
      return blockedReturnFor(definition)
    }
    return source.apply(thisArg,args)
  }

  function installOwnedSystemGate(name){
    const definition=OWNED_SYSTEMS[name],current=window[name];
    if(!definition||typeof current!=="function")return false;
    if(current.__ccgV141ModeOwnedGate===true&&current.__ccgV141ModeOwnedName===name){
      ownedSystems.set(name,{name,capability:definition.capability,gate:current,source:current.__ccgV141ModeOwnedSource||current.__ccgOriginal||null});return true
    }
    const source=current;
    const gate=function modeOwnedSystemGate(){return dispatchOwnedSystem(name,source,this,arguments)};
    gate.__ccgV141ModeOwnedGate=true;gate.__ccgV141ModeOwnedName=name;gate.__ccgV141ModeCapability=definition.capability;gate.__ccgV141ModeOwnedSource=source;gate.__ccgOriginal=source;
    const previous=ownedSystems.get(name);window[name]=gate;ownedSystems.set(name,{name,capability:definition.capability,gate,source});
    state.ownedSystemInstalls++;if(previous)state.ownedSystemReassertions++;
    return true
  }

  function ensureOwnedSystemGates(){
    let installed=0;
    for(const name of Object.keys(OWNED_SYSTEMS))if(installOwnedSystemGate(name))installed++;
    return installed
  }

  function ownedSystemState(name){
    const entry=ownedSystems.get(String(name||""));
    if(!entry)return null;
    return{name:entry.name,capability:entry.capability,installed:window[entry.name]===entry.gate,gate:entry.gate,source:entry.source}
  }

  function monitorHordeLifecycle(){
    const current=activeController();if(current.profile.family!=="horde")return false;
    const runState=special()?.state;if(!runState)return false;
    const wave=Math.max(0,Number(runState.wave)||0),phase=String(runState.state||"");
    const waveChanged=wave!==current.state.lastWave,phaseChanged=phase!==current.state.lastPhase;
    if(waveChanged||phaseChanged){
      if(waveChanged)state.hordeWaveResets++;
      if(phaseChanged)state.hordePhaseResets++;
      current.state.lastWave=wave;current.state.lastPhase=phase;
      resetModeTransient(`horde lifecycle ${phase||"unknown"} wave ${wave}`,{clearEnemyShots:phase==="intermission"||phase==="briefing",clearInput:false});
    }
    return Boolean(waveChanged||phaseChanged)
  }

  function presentHordeDeaths(){
    const current=activeController();if(current.profile.family!=="horde")return 0;
    let presented=0;
    try{
      for(const enemy of host?.enemies||[]){
        if(!enemy?.hordeEnemy||enemy.alive!==false||enemy._ccgModeHordeDeathPresented)continue;
        enemy._ccgModeHordeDeathPresented=true;enemy._ccgModeHordeDeathAt=performance.now();presented++;
        try{burst(enemy.x,enemy.y,enemy.hordeWarden?(P?.gold||"#ffd85a"):(P?.orange||"#ff9b54"),enemy.hordeWarden?34:18,enemy.hordeWarden?2.2:1.45)}catch(_){}
        try{ring(enemy.x,enemy.y,enemy.hordeWarden?(P?.gold||"#ffd85a"):(P?.red||"#ff6868"),enemy.hordeWarden?58:32)}catch(_){}
      }
    }catch(_){}
    if(presented){current.state.deathPresentations+=presented;state.hordeDeathPresentations+=presented}
    return presented
  }

  function maintainHordeControllerSystems(){
    const current=activeController();if(current.profile.family!=="horde")return false;
    let maintained=false;
    try{
      const reserve=window.CCGLostSizzlerV140?.ensureExpandedWaveReserve;
      if(typeof reserve==="function"){reserve();state.hordeReserveMaintenances++;maintained=true}
    }catch(error){console.warn("[Lost Sizzler mode runtime] Horde reserve maintenance failed",error)}
    try{
      const loadout=window.CCGLostSizzlerV139?.syncLocalLoadout;
      if(typeof loadout==="function"){loadout();state.hordeLoadoutMaintenances++;maintained=true}
    }catch(error){console.warn("[Lost Sizzler mode runtime] Horde loadout maintenance failed",error)}
    return maintained
  }

  function preSharedFrame(dt){
    const current=sync("shared frame pre");state.sharedPreFrames++;
    const context={controllerId:current.id,hordeCombat:null};
    if(current.profile.family==="horde"||current.profile.family==="spy"){
      try{
        const isolation=window.CCGLostSizzlerV141R25SpySpeedBountyHotfix?.controllerFrameIsolation;
        if(typeof isolation==="function"&&isolation(current.id)){state.r25SpecialPreFrames++}
      }catch(error){console.warn("[Lost Sizzler mode runtime] Special-mode isolation pre-frame failed",error)}
    }
    if(current.id===IDS.DUNGEON_SOLO){
      try{
        const compatibility=window.CCGLostSizzlerV141R26SpyEnemyStability?.preControllerFrame;
        if(typeof compatibility==="function"&&compatibility(current.id,dt)){state.r26DungeonPreFrames++}
      }catch(error){console.warn("[Lost Sizzler mode runtime] Dungeon Solo compatibility pre-frame failed",error)}
    }
    if(current.profile.family==="horde"){
      try{
        const combat=window.CCGLostSizzlerV141HordeCombatPolish?.preHordeCombatFrame;
        if(typeof combat==="function"){context.hordeCombat=combat(dt);state.hordeCombatPreFrames++}
      }catch(error){console.warn("[Lost Sizzler mode runtime] Horde combat pre-frame failed",error)}
    }
    return context
  }

  function postSharedFrame(dt,context=null){
    const current=sync("shared frame post");state.sharedPostFrames++;
    if(current.id===IDS.DUNGEON_SOLO){
      try{
        const compatibility=window.CCGLostSizzlerV141R26SpyEnemyStability?.postControllerFrame;
        if(typeof compatibility==="function"&&compatibility(current.id,dt)){state.r26DungeonPostFrames++}
      }catch(error){console.warn("[Lost Sizzler mode runtime] Dungeon Solo compatibility post-frame failed",error)}
    }
    if(current.profile.family==="spy"){
      try{
        const isolation=window.CCGLostSizzlerV141R25SpySpeedBountyHotfix?.controllerFrameIsolation;
        if(typeof isolation==="function"&&isolation(current.id)){state.r25SpecialPostFrames++}
      }catch(error){console.warn("[Lost Sizzler mode runtime] Special-mode isolation post-frame failed",error)}
    }
    if(current.profile.family!=="horde")return current;
    try{
      const focus=window.CCGLostSizzlerV137?.updateHordeFocus;
      if(typeof focus==="function"){focus(dt);state.hordeFocusPostFrames++}
    }catch(error){console.warn("[Lost Sizzler mode runtime] Horde focus post-frame failed",error)}
    try{
      const live=window.CCGLostSizzlerV138?.updateHordeLive;
      if(typeof live==="function"){live(dt);state.hordeLivePostFrames++}
    }catch(error){console.warn("[Lost Sizzler mode runtime] Horde live post-frame failed",error)}
    try{
      const combat=window.CCGLostSizzlerV141HordeCombatPolish?.postHordeCombatFrame;
      if(typeof combat==="function"){combat(context?.hordeCombat||null);state.hordeCombatPostFrames++}
    }catch(error){console.warn("[Lost Sizzler mode runtime] Horde combat post-frame failed",error)}
    try{
      const completion=window.CCGLostSizzlerV141HordeCompletion?.postHordeCompletionFrame;
      if(typeof completion==="function"){completion(dt);state.hordeCompletionPostFrames++}
    }catch(error){console.warn("[Lost Sizzler mode runtime] Horde completion post-frame failed",error)}
    try{
      const isolation=window.CCGLostSizzlerV141R25SpySpeedBountyHotfix?.controllerFrameIsolation;
      if(typeof isolation==="function"&&isolation(current.id)){state.r25SpecialPostFrames++}
    }catch(error){console.warn("[Lost Sizzler mode runtime] Special-mode isolation post-frame failed",error)}
    return current
  }

  function runSpyControllerFrame(dt){
    const current=sync("spy controller frame");
    if(current.id!==IDS.SPY_ONLINE)return false;
    const engine=window.CCGLostSizzlerV141R29SpyEngine;
    if(typeof engine?.isolatedUpdate!=="function"){
      state.spyFrameMisses++;
      return false;
    }
    try{
      engine.enterIsolation?.();
      const result=engine.isolatedUpdate(dt);
      state.spyRuleFrames++;
      return result;
    }catch(error){
      state.spyFrameMisses++;
      console.warn("[Lost Sizzler mode runtime] Spy controller frame failed safely",error);
      return false;
    }
  }

  function installSharedFrameBoundary(){
    if(state.sharedFrameBoundary){
      if(window.update!==state.sharedFrameBoundary){
        window.update=state.sharedFrameBoundary;state.sharedFrameBoundaryReassertions++;
      }
      return true;
    }
    if(typeof window.update!=="function")return false;
    const source=window.update;
    const boundary=function updateV141ModeControllerBoundary(dt){
      const context=preSharedFrame(dt);
      let result;
      if(context.controllerId===IDS.SPY_ONLINE){
        state.spySourceBypasses++;
        result=runSpyControllerFrame(dt);
      }else{
        state.sharedSourceFrames++;
        result=source.apply(this,arguments);
      }
      postSharedFrame(dt,context);
      return result
    };
    boundary.__ccgV141ModeFrameBoundary=true;
    boundary.__ccgOriginal=source;
    state.sharedFrameBoundary=boundary;state.sharedFrameBoundarySource=source;state.sharedFrameBoundaryInstalls++;
    window.update=boundary;
    return true
  }

  function frame(){
    installSharedFrameBoundary();
    const current=sync("frame");current.frame();ensureOwnedSystemGates();
    if(current.profile.family==="horde"){maintainHordeControllerSystems();monitorHordeLifecycle();presentHordeDeaths()}
    if(current.id===IDS.SPY_ONLINE)try{window.CCGLostSizzlerV141R29SpyEngine?.enterIsolation?.()}catch(_){}
    return current
  }

  function snapshot(){
    const current=activeController();return{
      activeId:current.id,previousId:state.previousId,generation:state.generation,transitions:state.transitions,
      profile:{...current.profile},controllerState:{...current.state},lastTransitionReason:state.lastTransitionReason,lastResetReason:state.lastResetReason,
      hordeWaveResets:state.hordeWaveResets,hordePhaseResets:state.hordePhaseResets,globalHazardsPurged:state.globalHazardsPurged,globalCampingPurges:state.globalCampingPurges,
      hordeLoadoutMaintenances:state.hordeLoadoutMaintenances,hordeReserveMaintenances:state.hordeReserveMaintenances,hordeFocusPostFrames:state.hordeFocusPostFrames,hordeLivePostFrames:state.hordeLivePostFrames,
      hordeCombatPreFrames:state.hordeCombatPreFrames,hordeCombatPostFrames:state.hordeCombatPostFrames,hordeCompletionPostFrames:state.hordeCompletionPostFrames,
      spyRuleFrames:state.spyRuleFrames,spySourceBypasses:state.spySourceBypasses,spyFrameMisses:state.spyFrameMisses,
      r25SpecialPreFrames:state.r25SpecialPreFrames,r25SpecialPostFrames:state.r25SpecialPostFrames,r26DungeonPreFrames:state.r26DungeonPreFrames,r26DungeonPostFrames:state.r26DungeonPostFrames,
      sharedFrameBoundaryInstalls:state.sharedFrameBoundaryInstalls,sharedFrameBoundaryReassertions:state.sharedFrameBoundaryReassertions,sharedPreFrames:state.sharedPreFrames,sharedPostFrames:state.sharedPostFrames,sharedSourceFrames:state.sharedSourceFrames,
      ownedSystemInstalls:state.ownedSystemInstalls,ownedSystemReassertions:state.ownedSystemReassertions,ownedSystemCalls:state.ownedSystemCalls,blockedOwnedSystemCalls:state.blockedOwnedSystemCalls,hordeDeathPresentations:state.hordeDeathPresentations
    }
  }

  sync("mode runtime install");ensureOwnedSystemGates();installSharedFrameBoundary();
  state.timer=setInterval(()=>{try{frame()}catch(error){console.warn("[Lost Sizzler mode runtime] lifecycle monitor failed",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerModeRuntime={
    IDS,PROFILES,SHARED_CORE,MODE_OWNED,OWNED_SYSTEMS,detect,sync,frame,allows,inFamily,activeController,activeProfile,
    resetModeTransient,clearHordePresentation,monitorHordeLifecycle,presentHordeDeaths,maintainHordeControllerSystems,preSharedFrame,postSharedFrame,runSpyControllerFrame,installSharedFrameBoundary,ensureOwnedSystemGates,ownedSystemState,snapshot,
    get state(){return state},get controllers(){return controllers},get ownedSystems(){return ownedSystems}
  };
})();