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

  function profile(id,options={}){
    return Object.freeze({
      id,
      family:options.family||"dungeon",
      online:Boolean(options.online),
      split:Boolean(options.split),
      dungeonSystems:Boolean(options.dungeonSystems),
      antiCamping:Boolean(options.antiCamping),
      dedicatedHazards:Boolean(options.dedicatedHazards),
      waveController:Boolean(options.waveController),
      spyController:Boolean(options.spyController),
      sharedCore:SHARED_CORE,
      modeOwned:MODE_OWNED
    });
  }

  const PROFILES=Object.freeze({
    [IDS.DUNGEON_SOLO]:profile(IDS.DUNGEON_SOLO,{family:"dungeon",dungeonSystems:true,antiCamping:true,dedicatedHazards:true}),
    [IDS.DUNGEON_ONLINE]:profile(IDS.DUNGEON_ONLINE,{family:"dungeon",online:true,dungeonSystems:true,antiCamping:true,dedicatedHazards:true}),
    [IDS.HORDE_SOLO]:profile(IDS.HORDE_SOLO,{family:"horde",dungeonSystems:false,waveController:true}),
    [IDS.HORDE_ONLINE]:profile(IDS.HORDE_ONLINE,{family:"horde",online:true,dungeonSystems:false,waveController:true}),
    [IDS.SPY_ONLINE]:profile(IDS.SPY_ONLINE,{family:"spy",online:true,dungeonSystems:false,spyController:true}),
    [IDS.SPLIT_SCREEN]:profile(IDS.SPLIT_SCREEN,{family:"dungeon",split:true,dungeonSystems:true,antiCamping:true,dedicatedHazards:true})
  });

  function controller(id){
    return{
      id,profile:PROFILES[id],state:{entries:0,exits:0,frames:0,resets:0,lastEnterAt:0,lastExitAt:0,lastReason:"",lastWave:0,lastPhase:"",hazardsPurged:0,campingPurges:0},
      enter(reason){this.state.entries++;this.state.lastEnterAt=Date.now();this.state.lastReason=String(reason||"mode enter")},
      exit(reason){this.state.exits++;this.state.lastExitAt=Date.now();this.state.lastReason=String(reason||"mode exit")},
      frame(){this.state.frames++}
    };
  }
  const controllers=new Map(Object.values(IDS).map(id=>[id,controller(id)]));
  const state={activeId:"",previousId:"",transitions:0,generation:0,timer:0,lastSyncAt:0,lastTransitionReason:"",lastResetReason:"",hordeWaveResets:0,hordePhaseResets:0,globalHazardsPurged:0,globalCampingPurges:0};

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
    if(clearInput){try{input?.clear?.()}catch(_){}}
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

  function enterController(next,previous,reason){
    next.enter(reason);
    document.body?.setAttribute?.("data-mode-controller",next.id);
    if(next.profile.family==="horde"||next.profile.family==="spy")resetModeTransient(`${next.id} enter`,{clearEnemyShots:true,clearInput:true});
    else if(previous&&(previous.profile.family==="horde"||previous.profile.family==="spy"))resetModeTransient(`${next.id} post-special enter`,{clearEnemyShots:true,clearInput:true});
    if(next.profile.family!=="horde")delete document.body?.dataset?.hordeSolo;
  }

  function leaveController(previous,next,reason){
    if(!previous)return;
    previous.exit(reason);
    if((previous.profile.family==="horde"||previous.profile.family==="spy")&&next?.profile.family!==previous.profile.family)resetModeTransient(`${previous.id} exit`,{clearEnemyShots:true,clearInput:true});
  }

  function sync(reason="runtime monitor"){
    const id=detect(),now=performance.now();state.lastSyncAt=now;
    if(id===state.activeId)return activeController();
    const previous=controllers.get(state.activeId)||null,next=controllers.get(id)||controllers.get(IDS.DUNGEON_SOLO);
    state.previousId=state.activeId;leaveController(previous,next,reason);state.activeId=next.id;state.transitions++;state.generation++;state.lastTransitionReason=String(reason||"mode transition");enterController(next,previous,reason);
    return next
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
    // Global dungeon camping hazards have no valid meaning in Horde. Purge them
    // continuously so a legacy dungeon update can never mature a red warning
    // circle into player damage while controller extraction is completed.
    const result=clearDungeonTransient({clearEnemyShots:false,clearInput:false});
    current.state.hazardsPurged+=result.hazardsRemoved;current.state.campingPurges+=result.campRemoved;
    return Boolean(waveChanged||phaseChanged||result.hazardsRemoved||result.campRemoved)
  }

  function frame(){
    const current=sync("frame");current.frame();
    if(current.profile.family==="horde")monitorHordeLifecycle();
    return current
  }

  function snapshot(){
    const current=activeController();return{
      activeId:current.id,previousId:state.previousId,generation:state.generation,transitions:state.transitions,
      profile:{...current.profile},controllerState:{...current.state},lastTransitionReason:state.lastTransitionReason,lastResetReason:state.lastResetReason,
      hordeWaveResets:state.hordeWaveResets,hordePhaseResets:state.hordePhaseResets,globalHazardsPurged:state.globalHazardsPurged,globalCampingPurges:state.globalCampingPurges
    }
  }

  sync("mode runtime install");
  state.timer=setInterval(()=>{try{frame()}catch(error){console.warn("[Lost Sizzler mode runtime] lifecycle monitor failed",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerModeRuntime={IDS,PROFILES,SHARED_CORE,MODE_OWNED,detect,sync,frame,allows,inFamily,activeController,activeProfile,resetModeTransient,monitorHordeLifecycle,snapshot,get state(){return state},get controllers(){return controllers}};
})();
