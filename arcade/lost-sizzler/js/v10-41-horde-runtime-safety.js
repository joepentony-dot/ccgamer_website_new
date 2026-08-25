/* The Lost Sizzler V10.41 — Horde runtime isolation and long-run browser safety. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_HORDE_RUNTIME_SAFETY__)return;
  window.__CCG_LOST_SIZZLER_V141_HORDE_RUNTIME_SAFETY__=true;

  const INSTALL_MS=80;
  const HARD_ACTIVE_CAP=Object.freeze({1:22,2:28,3:34,4:40});
  const MAX_ENEMY_BULLETS=160;
  const FORBIDDEN_TOAST=/DUNGEON\s+(?:BOUNTY|BONUS)|IRON\s+SHRINE|SHRINE|FLOOR\s+MUTATION|OBJECTIVE|SANCTUARY|SUPPLY\s+SIGNAL|MONSTER\s+NEST|PATROL\s+SHIFT|THE\s+DUNGEON\s+SHIFTS|GILDED|TREASURE\s+MAP|SECRET\s+ARTEFACT\s+TRADER|SUPPLY\s+DESK|SHOP|DEATH\s+STALKER|COUNT\s+LOADULA|SIGIL|BRONZE\s+KEY|ARENA\s+LOCKDOWN|TIMED\s+CHAMBER/i;
  const state={installed:false,updateWrapped:false,damageWrapped:false,toastWrapped:false,timer:0,runKey:"",pruned:0,emergencyTrimmed:0,suppressedToasts:0,lastScrubAt:0,lastPhysical:0};

  const special=()=>window.CCGLostSizzlerSpecialModes||null;
  const live=()=>special()?.active||null;
  const isHorde=()=>live()?.type==="horde-survivor"||document.body?.dataset?.specialMode==="horde-survivor";
  const isAuthority=()=>Boolean(live()?.authoritative);
  const hordeState=()=>live()?.state||null;
  const count=()=>Math.max(1,Math.min(4,Number(hordeState()?.playerCount)||1));

  function clearArray(owner,key){if(owner&&Array.isArray(owner[key])&&owner[key].length)owner[key].length=0}

  function neutraliseRareEvents(){
    const rare=window.CCGLostSizzlerRareEvents?.state;if(!rare)return false;
    rare.bounty=null;rare.mutation=null;rare.golden=null;rare.ghost=null;rare.hintTarget=null;rare.hintMarkerUntil=0;rare.hintStage=999;rare.lastMoveAt=0;rare.plans={};
    try{rare.announcedRooms?.clear?.();rare.specialDeaths?.clear?.()}catch(_){}
    return true
  }

  function scrubDungeonOnlyState(){
    if(!isHorde()||!host||!run)return false;
    run.specialMode="horde-survivor";run.daily=false;run.rareMutation=null;run.alert=0;

    clearArray(host,"items");clearArray(host,"chests");clearArray(host,"shrines");clearArray(host,"switches");clearArray(host,"shops");clearArray(host,"deathCaches");clearArray(host,"generators");clearArray(host,"traps");clearArray(host,"hazardRooms");clearArray(host,"arenas");clearArray(host,"timedRooms");clearArray(host,"sanctuaryRegeneration");
    host.trader=null;host.startShop=null;host.boulderTrap=null;host.memoryPuzzle=null;host.sequenceTorchPuzzle=null;host.weightBridge=null;host.bloodClue=null;host.rescue=null;host.guardian=null;host.sigilWarden=null;host.sigilRoomId=null;host.sigilLockdown=false;host.sigilResolved=false;host.sigilDropPos=null;host.sigilDefenderIds=[];host.sigilGateIds=[];host.skeletonHorde=null;host.spiderNest=null;host.stalker=null;host.voidStalkers=[];host.deathStalkerId=null;host.voidStalkerInSight=false;host.nextEvent=Number.MAX_SAFE_INTEGER;host.floorElapsed=0;host.objectiveReminderAt=Number.MAX_SAFE_INTEGER;
    host.objective={type:"horde",progress:0,target:10,complete:false};

    if(world){
      world.sanctuaryRooms=[];world.fireplaces=world.fireplaces||[];
      for(const room of world.rooms||[]){room.sanctuary=false;room.sigilRoom=false;room.dedicatedHazard=false;room.skeletonHorde=false;room.spiderNest=false;room.boulderRoom=false;room.memoryPuzzleRoom=false;room.sequenceTorchRoom=false;room.weightBridgeRoom=false;room.developerRoom=false}
    }
    neutraliseRareEvents();
    try{S?.setStalkerNear?.(false);S?.setStalkerSight?.(false);S?.setNamedEnemy?.(null)}catch(_){}
    state.lastScrubAt=performance.now();
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
    // These are emergency removals caused only by an impossible over-cap state.
    // Count them as resolved so an accidental duplicate-spawn loop cannot prevent
    // the wave from ever progressing after the browser-safety intervention.
    runState.defeated=Math.min(Number(runState._v138DesiredQuota||Infinity),Number(runState.defeated||0)+excess.length);
    state.emergencyTrimmed+=excess.length;host.revision=(host.revision||0)+1;
    console.warn(`[Lost Sizzler V10.41] Horde safety removed ${excess.length} runaway live enemies (cap ${cap}).`);
    return excess.length
  }

  function capTransientCombatState(){
    if(!isHorde())return;
    try{if(Array.isArray(enemyBullets)&&enemyBullets.length>MAX_ENEMY_BULLETS)enemyBullets.splice(0,enemyBullets.length-MAX_ENEMY_BULLETS)}catch(_){}
    try{if(Array.isArray(hazards)&&hazards.length>80)hazards.splice(0,hazards.length-80)}catch(_){}
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
        // The kill burst/score/model update has already been performed by the
        // underlying Horde adapter. Remove the physical corpse immediately so
        // later AI/render/update passes cannot scan hundreds of old enemies.
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

  function wrapDungeonSystems(){let count=0;for(const name of DUNGEON_FUNCTIONS)if(wrapDungeonFunction(name))count++;return count}

  function resetForNewRun(){
    const key=String(live()?.seed||hordeState()?.seed||"");if(state.runKey===key)return;
    state.runKey=key;state.pruned=0;state.emergencyTrimmed=0;state.suppressedToasts=0;
  }

  function wrapUpdate(){
    if(state.updateWrapped||typeof window.update!=="function")return state.updateWrapped;
    const original=window.update;
    window.update=function updateV141HordeRuntimeSafety(dt){
      if(!isHorde()){state.runKey="";return original.apply(this,arguments)}
      resetForNewRun();
      try{scrubDungeonOnlyState();pruneDeadPhysical();trimRunawayLiveEnemies();capTransientCombatState();clearForbiddenToastNow()}catch(error){console.warn("[Lost Sizzler V10.41] pre-frame Horde isolation failed",error)}
      let result;
      try{result=original.apply(this,arguments)}catch(error){
        try{window.CCGLostSizzlerHordeAudio?.syncLegacyVoiceGuard?.();speechSynthesis?.cancel?.()}catch(_){}
        console.error("[Lost Sizzler V10.41] Horde frame aborted safely",error);
        throw error
      }
      try{scrubDungeonOnlyState();pruneDeadPhysical();trimRunawayLiveEnemies();capTransientCombatState();clearForbiddenToastNow()}catch(error){console.warn("[Lost Sizzler V10.41] post-frame Horde isolation failed",error)}
      return result
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
  window.CCGLostSizzlerV141HordeRuntimeSafety={HARD_ACTIVE_CAP,MAX_ENEMY_BULLETS,FORBIDDEN_TOAST,DUNGEON_FUNCTIONS,scrubDungeonOnlyState,neutraliseRareEvents,pruneDeadPhysical,trimRunawayLiveEnemies,allowedHordeToast,get state(){return state}};
})();