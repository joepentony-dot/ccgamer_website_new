/* The Lost Sizzler V10.41 — Horde runtime isolation and long-run browser safety. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_HORDE_RUNTIME_SAFETY__)return;
  window.__CCG_LOST_SIZZLER_V141_HORDE_RUNTIME_SAFETY__=true;

  const INSTALL_MS=80;
  const HARD_ACTIVE_CAP=Object.freeze({1:22,2:28,3:34,4:40});
  const MAX_ENEMY_BULLETS=160;
  const BULLET_CAP_BY_PLAYERS=Object.freeze({1:96,2:116,3:138,4:160});
  const SCRUB_AUDIT_MS=700;
  const PRUNE_AUDIT_MS=180;
  const RUNAWAY_AUDIT_MS=450;
  const TRANSIENT_CAP_MS=90;
  const TOAST_AUDIT_MS=300;
  const FORBIDDEN_TOAST=/DUNGEON\s+(?:BOUNTY|BONUS)|IRON\s+SHRINE|SHRINE|FLOOR\s+MUTATION|OBJECTIVE|SANCTUARY|SUPPLY\s+SIGNAL|MONSTER\s+NEST|PATROL\s+SHIFT|THE\s+DUNGEON\s+SHIFTS|GILDED|TREASURE\s+MAP|SECRET\s+ARTEFACT\s+TRADER|SUPPLY\s+DESK|SHOP|DEATH\s+STALKER|COUNT\s+LOADULA|SIGIL|BRONZE\s+KEY|ARENA\s+LOCKDOWN|TIMED\s+CHAMBER/i;
  const state={
    installed:false,updateWrapped:false,damageWrapped:false,toastWrapped:false,timer:0,runKey:"",
    pruned:0,emergencyTrimmed:0,suppressedToasts:0,lastScrubAt:0,lastPhysical:0,
    lastScrubAuditAt:0,lastPruneAuditAt:0,lastRunawayAuditAt:0,lastTransientCapAt:0,lastToastAuditAt:0,
    maintenanceFrames:0,scrubAudits:0,scrubRuns:0,scrubSkips:0,pruneAudits:0,runawayAudits:0,transientCaps:0,toastAudits:0
  };

  const special=()=>window.CCGLostSizzlerSpecialModes||null;
  const live=()=>special()?.active||null;
  const isHorde=()=>live()?.type==="horde-survivor"||document.body?.dataset?.specialMode==="horde-survivor";
  const isAuthority=()=>Boolean(live()?.authoritative);
  const hordeState=()=>live()?.state||null;
  const count=()=>Math.max(1,Math.min(4,Number(hordeState()?.playerCount)||1));
  const now=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};

  function clearArray(owner,key){if(owner&&Array.isArray(owner[key])&&owner[key].length)owner[key].length=0}
  function clearObject(owner,key){if(!owner)return;if(owner[key]&&typeof owner[key]==="object"&&Object.keys(owner[key]).length)owner[key]={}}

  function neutraliseRareEvents(){
    const rare=window.CCGLostSizzlerRareEvents?.state;if(!rare)return false;
    rare.bounty=null;rare.mutation=null;rare.golden=null;rare.ghost=null;rare.hintTarget=null;rare.hintMarkerUntil=0;rare.hintStage=999;rare.lastMoveAt=0;
    clearObject(rare,"plans");
    try{rare.announcedRooms?.clear?.();rare.specialDeaths?.clear?.()}catch(_){}
    return true
  }

  function hasDungeonLeak(){
    if(!isHorde()||!host||!run)return false;
    if(run.specialMode!=="horde-survivor"||run.daily||run.rareMutation||Number(run.alert||0)!==0)return true;
    for(const key of ["items","chests","shrines","switches","shops","deathCaches","generators","traps","hazardRooms","arenas","timedRooms","sanctuaryRegeneration"])if(Array.isArray(host[key])&&host[key].length)return true;
    for(const key of ["trader","startShop","boulderTrap","memoryPuzzle","sequenceTorchPuzzle","weightBridge","bloodClue","rescue","guardian","sigilWarden","skeletonHorde","spiderNest","stalker","deathStalkerId"])if(host[key])return true;
    if(Array.isArray(host.sigilDefenderIds)&&host.sigilDefenderIds.length)return true;
    if(Array.isArray(host.sigilGateIds)&&host.sigilGateIds.length)return true;
    if(Array.isArray(host.voidStalkers)&&host.voidStalkers.length)return true;
    if(host.sigilLockdown||host.sigilResolved||host.sigilDropPos||host.voidStalkerInSight)return true;
    if(host.objective?.type!=="horde")return true;
    const rare=window.CCGLostSizzlerRareEvents?.state;
    if(rare&&(rare.bounty||rare.mutation||rare.golden||rare.ghost||rare.hintTarget))return true;
    if(world){
      if(Array.isArray(world.sanctuaryRooms)&&world.sanctuaryRooms.length)return true;
      for(const room of world.rooms||[])if(room&&(room.sanctuary||room.sigilRoom||room.dedicatedHazard||room.skeletonHorde||room.spiderNest||room.boulderRoom||room.memoryPuzzleRoom||room.sequenceTorchRoom||room.weightBridgeRoom||room.developerRoom))return true;
    }
    return false
  }

  function scrubDungeonOnlyState(){
    if(!isHorde()||!host||!run)return false;
    run.specialMode="horde-survivor";run.daily=false;run.rareMutation=null;run.alert=0;

    clearArray(host,"items");clearArray(host,"chests");clearArray(host,"shrines");clearArray(host,"switches");clearArray(host,"shops");clearArray(host,"deathCaches");clearArray(host,"generators");clearArray(host,"traps");clearArray(host,"hazardRooms");clearArray(host,"arenas");clearArray(host,"timedRooms");clearArray(host,"sanctuaryRegeneration");
    host.trader=null;host.startShop=null;host.boulderTrap=null;host.memoryPuzzle=null;host.sequenceTorchPuzzle=null;host.weightBridge=null;host.bloodClue=null;host.rescue=null;host.guardian=null;host.sigilWarden=null;host.sigilRoomId=null;host.sigilLockdown=false;host.sigilResolved=false;host.sigilDropPos=null;
    clearArray(host,"sigilDefenderIds");clearArray(host,"sigilGateIds");
    host.skeletonHorde=null;host.spiderNest=null;host.stalker=null;clearArray(host,"voidStalkers");host.deathStalkerId=null;host.voidStalkerInSight=false;host.nextEvent=Number.MAX_SAFE_INTEGER;host.floorElapsed=0;host.objectiveReminderAt=Number.MAX_SAFE_INTEGER;
    if(host.objective?.type!=="horde")host.objective={type:"horde",progress:0,target:10,complete:false};
    else{host.objective.progress=0;host.objective.target=10;host.objective.complete=false}

    if(world){
      clearArray(world,"sanctuaryRooms");world.fireplaces=world.fireplaces||[];
      for(const room of world.rooms||[]){room.sanctuary=false;room.sigilRoom=false;room.dedicatedHazard=false;room.skeletonHorde=false;room.spiderNest=false;room.boulderRoom=false;room.memoryPuzzleRoom=false;room.sequenceTorchRoom=false;room.weightBridgeRoom=false;room.developerRoom=false}
    }
    neutraliseRareEvents();
    try{S?.setStalkerNear?.(false);S?.setStalkerSight?.(false);S?.setNamedEnemy?.(null)}catch(_){}
    state.lastScrubAt=now();state.scrubRuns++;
    return true
  }

  function pruneDeadPhysical(){
    if(!isHorde()||!host?.enemies)return 0;
    const before=host.enemies.length;
    host.enemies=host.enemies.filter(enemy=>!enemy?.hordeEnemy||enemy.alive);
    const removed=before-host.enemies.length;
    if(removed){state.pruned+=removed;host.revision=(host.revision||0)+1}
    state.lastPhysical=(host.enemies||[]).filter(enemy=>enemy?.alive&&enemy.hordeEnemy).length;
    return removed
  }

  function trimRunawayLiveEnemies(){
    if(!isHorde()||!isAuthority()||!host?.enemies)return 0;
    const runState=hordeState();if(!runState)return 0;
    const cap=HARD_ACTIVE_CAP[count()]||HARD_ACTIVE_CAP[1];
    const physical=host.enemies.filter(enemy=>enemy?.alive&&enemy.hordeEnemy&&!enemy.hordeWarden);
    if(physical.length<=cap)return 0;
    physical.sort((a,b)=>Number(a.spawnedAt||0)-Number(b.spawnedAt||0));
    const excess=physical.slice(cap);const ids=new Set(excess.map(enemy=>String(enemy.hordeModelId||enemy.id)));
    for(const enemy of excess){enemy.alive=false;enemy.hp=0}
    host.enemies=host.enemies.filter(enemy=>!excess.includes(enemy));
    if(Array.isArray(runState.activeEnemies))runState.activeEnemies=runState.activeEnemies.filter(model=>!ids.has(String(model?.id||"")));
    runState.defeated=Math.min(Number(runState._v138DesiredQuota||Infinity),Number(runState.defeated||0)+excess.length);
    state.emergencyTrimmed+=excess.length;host.revision=(host.revision||0)+1;
    console.warn(`[Lost Sizzler V10.41] Horde safety removed ${excess.length} runaway live enemies (cap ${cap}).`);
    return excess.length
  }

  function capTransientCombatState(){
    if(!isHorde())return;
    const bulletCap=BULLET_CAP_BY_PLAYERS[count()]||MAX_ENEMY_BULLETS;
    try{if(Array.isArray(enemyBullets)&&enemyBullets.length>bulletCap)enemyBullets.splice(0,enemyBullets.length-bulletCap)}catch(_){}
    try{if(Array.isArray(hazards)&&hazards.length>64)hazards.splice(0,hazards.length-64)}catch(_){}
    state.transientCaps++
  }

  function clearForbiddenToastNow(){
    if(!isHorde())return;
    const title=document.getElementById("pickup-title"),text=document.getElementById("pickup-text"),toast=document.getElementById("pickup-toast");
    if(FORBIDDEN_TOAST.test(`${title?.textContent||""} ${text?.textContent||""}`))toast?.classList.remove("show");
    const major=document.getElementById("ccg-major-notification");
    if(major&&FORBIDDEN_TOAST.test(major.textContent||"")){major.dataset.visible="false";major.hidden=true}
  }

  function allowedHordeToast(title,text=""){
    const combined=`${String(title||"")} ${String(text||"")}`;
    if(FORBIDDEN_TOAST.test(combined))return false;
    return true
  }

  function wrapToast(){
    if(state.toastWrapped||typeof window.showToast!=="function")return state.toastWrapped;
    const original=window.showToast;
    window.showToast=function showToastV141HordeIsolation(title,text,tone,duration){
      if(isHorde()&&!allowedHordeToast(title,text)){state.suppressedToasts++;return false}
      return original.apply(this,arguments)
    };
    state.toastWrapped=true;return true
  }

  function wrapDamage(){
    if(state.damageWrapped||typeof window.damageEnemy!=="function")return state.damageWrapped;
    const original=window.damageEnemy;
    window.damageEnemy=function damageEnemyV141HordeCleanup(enemy){
      const result=original.apply(this,arguments);
      if(isHorde()&&enemy?.hordeEnemy&&!enemy.alive){
        try{pruneDeadPhysical()}catch(error){console.warn("[Lost Sizzler V10.41] Horde corpse cleanup failed",error)}
      }
      return result
    };
    state.damageWrapped=true;return true
  }

  const DUNGEON_FUNCTIONS=[
    "updateEmergencyAmmo","updateLastResortHealth","updateCamping","updateHazards","updateDedicatedHazards","updateGenerators","updateArena","updateTimed","updateBoulder","updateMemoryPuzzle","updateRescue","updateBanishment","updateStalker","updateFloorObjective","updateAlert","updateRoomEvents","processAchievements","surroundingsTick","updateNamedEncounters",
    "triggerSwitch","triggerShrine","triggerTrap","triggerRescue","triggerArena","triggerTimed","triggerTrader","triggerDeathCache"
  ];

  function wrapDungeonFunction(name){
    const fn=window[name];if(typeof fn!=="function"||fn.__ccgHordeIsolation)return false;
    const wrapped=function(){if(isHorde())return false;return fn.apply(this,arguments)};
    wrapped.__ccgHordeIsolation=true;wrapped.__ccgOriginal=fn;window[name]=wrapped;return true
  }

  function wrapDungeonSystems(){let installed=0;for(const name of DUNGEON_FUNCTIONS)if(wrapDungeonFunction(name))installed++;return installed}

  function resetForNewRun(){
    const key=String(live()?.seed||hordeState()?.seed||"");if(state.runKey===key)return false;
    state.runKey=key;state.pruned=0;state.emergencyTrimmed=0;state.suppressedToasts=0;
    state.lastScrubAuditAt=state.lastPruneAuditAt=state.lastRunawayAuditAt=state.lastTransientCapAt=state.lastToastAuditAt=0;
    return true
  }

  function due(timestamp,last,interval,force=false){return force||timestamp-last>=interval}
  function runMaintenance(timestamp=now(),force=false){
    if(!isHorde())return false;state.maintenanceFrames++;
    if(due(timestamp,state.lastScrubAuditAt,SCRUB_AUDIT_MS,force)){
      state.lastScrubAuditAt=timestamp;state.scrubAudits++;
      if(force||hasDungeonLeak())scrubDungeonOnlyState();else state.scrubSkips++
    }
    if(due(timestamp,state.lastPruneAuditAt,PRUNE_AUDIT_MS,force)){
      state.lastPruneAuditAt=timestamp;state.pruneAudits++;pruneDeadPhysical()
    }
    if(due(timestamp,state.lastRunawayAuditAt,RUNAWAY_AUDIT_MS,force)){
      state.lastRunawayAuditAt=timestamp;state.runawayAudits++;trimRunawayLiveEnemies()
    }
    if(due(timestamp,state.lastTransientCapAt,TRANSIENT_CAP_MS,force)){
      state.lastTransientCapAt=timestamp;capTransientCombatState()
    }
    if(due(timestamp,state.lastToastAuditAt,TOAST_AUDIT_MS,force)){
      state.lastToastAuditAt=timestamp;state.toastAudits++;clearForbiddenToastNow()
    }
    return true
  }

  function wrapUpdate(){
    if(state.updateWrapped||typeof window.update!=="function")return state.updateWrapped;
    const original=window.update;
    window.update=function updateV141HordeRuntimeSafety(dt){
      if(!isHorde()){state.runKey="";return original.apply(this,arguments)}
      const freshRun=resetForNewRun();
      try{runMaintenance(now(),freshRun)}catch(error){console.warn("[Lost Sizzler V10.41] Horde maintenance failed",error)}
      try{return original.apply(this,arguments)}catch(error){
        try{window.CCGLostSizzlerHordeAudio?.syncLegacyVoiceGuard?.();speechSynthesis?.cancel?.()}catch(_){}
        console.error("[Lost Sizzler V10.41] Horde frame aborted safely",error);
        throw error
      }
    };
    state.updateWrapped=true;return true
  }

  function install(){
    if(state.installed)return true;
    const gate=window.CCGLostSizzlerReleaseGate;if(gate&&!gate.state?.ready)return false;
    if(!special()?.active&&typeof window.CCGLostSizzlerSpecialModes?.startOnline!=="function")return false;
    if(typeof window.update!=="function"||typeof window.damageEnemy!=="function"||typeof window.showToast!=="function")return false;
    wrapDungeonSystems();wrapToast();wrapDamage();wrapUpdate();
    if(!state.updateWrapped||!state.damageWrapped||!state.toastWrapped)return false;
    state.installed=true;document.body.dataset.v141HordeRuntimeSafety="true";return true
  }

  state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},INSTALL_MS);
  install();
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141HordeRuntimeSafety={
    HARD_ACTIVE_CAP,MAX_ENEMY_BULLETS,BULLET_CAP_BY_PLAYERS,SCRUB_AUDIT_MS,PRUNE_AUDIT_MS,RUNAWAY_AUDIT_MS,TRANSIENT_CAP_MS,TOAST_AUDIT_MS,
    FORBIDDEN_TOAST,DUNGEON_FUNCTIONS,hasDungeonLeak,scrubDungeonOnlyState,neutraliseRareEvents,pruneDeadPhysical,trimRunawayLiveEnemies,capTransientCombatState,runMaintenance,allowedHordeToast,
    get state(){return state}
  };
})();