/* The Lost Sizzler V10.41 r60 — Horde combat integrity under low frame rates.
 *
 * Horde used the shared rendered frame as the scheduler for projectile travel and
 * enemy thinking. When a frame took longer than the canonical 45 ms simulation
 * clamp, projectile and AI timer overshoot was discarded: bullets travelled only
 * one tile per rendered frame and enemy attack cooldowns advanced too slowly.
 *
 * R60 does not add another RAF loop. It plugs into the existing Horde controller
 * frame boundary, uses visible/playing wall-clock elapsed time, and performs a
 * bounded number of canonical projectile/AI substeps. Paused/hidden time is
 * discarded, while genuine active-play stalls get only a small bounded catch-up.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R60_HORDE_COMBAT_INTEGRITY__)return;
  window.__CCG_LOST_SIZZLER_V141_R60_HORDE_COMBAT_INTEGRITY__=true;

  const INSTALL_MS=60;
  const PROJECTILE_STEP_MS=70;
  const MAX_VISIBLE_FRAME_MS=210;
  const MAX_PROJECTILE_STEPS=3;
  const MAX_ENEMY_STEPS=3;
  const SUPPRESS_TIMER_MS=60000;
  const PAUSE_REENTRY_GUARD_MS=1200;
  const state={
    timer:0,installed:false,combatWrapped:false,liveWrapped:false,
    preSource:null,postSource:null,liveSource:null,liveOwner:null,
    lastNow:0,lastPauseBoundary:0,lastMode:"",clockPrimed:false,resumeGuardUntil:0,
    projectileAccumulator:0,enemyAccumulator:0,currentElapsed:0,currentFrameDt:0,currentExtra:0,
    frames:0,clockResets:0,pauseGapsDiscarded:0,pauseAccumulatorResets:0,resumeGuardFrames:0,visibleGapClamps:0,discardedVisibleMs:0,
    projectileSteps:0,projectileCatchupSteps:0,enemySteps:0,enemyCatchupSteps:0,
    playerTimerCatchupMs:0,liveElapsedFrames:0,liveOwnerInstalls:0,liveOwnerReassertions:0,hookReassertions:0,lastError:""
  };

  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const special=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const isHorde=()=>String(special()?.type||document.body?.dataset?.specialMode||"")==="horde-survivor";
  const playingVisible=()=>{try{return isHorde()&&String(mode||"")==="playing"&&!document.hidden}catch(_){return false}};
  const r59State=()=>{try{return window.CCGLostSizzlerV141R59?.state||window.CCGLostSizzlerV141R59LiveRegressionFixes?.state||null}catch(_){return null}};
  const finite=value=>Number.isFinite(Number(value));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const enemyThinkMs=()=>{try{return Math.max(30,Number(C?.enemy?.thinkDelay)||90)}catch(_){return 90}};

  function recordError(error){state.lastError=String(error?.message||error||"unknown").slice(0,260);return false}

  function resetClock(reason="inactive",keepRemainder=true){
    state.lastNow=perfNow();
    state.lastMode=(()=>{try{return String(mode||"")}catch(_){return""}})();
    state.lastPauseBoundary=Number(r59State()?.pauseBoundaries||0);
    state.currentElapsed=0;state.currentFrameDt=0;state.currentExtra=0;
    if(!keepRemainder){state.projectileAccumulator=0;state.enemyAccumulator=0;state.clockPrimed=false}
    state.clockResets++;
    return reason
  }

  function resetCombatAccumulators(reason="pause boundary"){
    state.projectileAccumulator=0;state.enemyAccumulator=0;state.clockPrimed=true;
    try{projectileCD=PROJECTILE_STEP_MS}catch(_){}try{enemyCD=enemyThinkMs()}catch(_){}
    state.pauseAccumulatorResets++;
    return reason
  }

  function armResumeGuard(now=perfNow()){
    const r59Until=Math.max(0,Number(r59State()?.suppressRecoveryUntil)||0);
    state.resumeGuardUntil=Math.max(Number(state.resumeGuardUntil)||0,r59Until,(Number(now)||0)+PAUSE_REENTRY_GUARD_MS);
    return state.resumeGuardUntil
  }

  function primeAccumulators(){
    if(state.clockPrimed)return true;
    const think=enemyThinkMs();
    try{state.projectileAccumulator=clamp(PROJECTILE_STEP_MS-Math.max(0,Number(projectileCD)||0),0,PROJECTILE_STEP_MS)}catch(_){state.projectileAccumulator=0}
    try{state.enemyAccumulator=clamp(think-Math.max(0,Number(enemyCD)||0),0,think)}catch(_){state.enemyAccumulator=0}
    state.clockPrimed=true;return true
  }

  function payDownPlayerTimers(extra){
    const amount=Math.max(0,Number(extra)||0);if(amount<=0)return 0;
    try{move1-=amount}catch(_){}try{move2-=amount}catch(_){}
    try{fire1-=amount}catch(_){}try{fire2-=amount}catch(_){}
    try{fireBuffer1=Math.max(0,Number(fireBuffer1||0)-amount)}catch(_){}try{fireBuffer2=Math.max(0,Number(fireBuffer2||0)-amount)}catch(_){}
    for(const player of [(()=>{try{return p1}catch(_){return null}})(),(()=>{try{return p2}catch(_){return null}})()]){
      if(!player)continue;
      for(const key of ["hitStunMs","invuln","rapidMs"]){
        const value=Number(player[key]||0);if(value>0)player[key]=Math.max(0,value-amount)
      }
    }
    state.playerTimerCatchupMs+=amount;return amount
  }

  function beginFrame(dt){
    const now=perfNow(),frameDt=clamp(dt,0,45),pauseBoundary=Number(r59State()?.pauseBoundaries||0),modeNow=(()=>{try{return String(mode||"")}catch(_){return""}})();
    const previousMode=state.lastMode,previousBoundary=Number(state.lastPauseBoundary||0);
    if(!playingVisible()){
      const enteredPause=modeNow==="paused"&&previousMode!=="paused",boundaryChanged=pauseBoundary!==previousBoundary;
      if(enteredPause||boundaryChanged){state.pauseGapsDiscarded++;resetCombatAccumulators("pause entry");armResumeGuard(now)}
      resetClock("not-visible-playing",true);state.lastPauseBoundary=pauseBoundary;state.lastMode=modeNow;
      return{active:false,elapsed:0,frameDt,extra:0,pauseBoundary}
    }

    primeAccumulators();
    const first=!finite(state.lastNow)||Number(state.lastNow)<=0;
    let raw=first?(frameDt||16):Math.max(0,now-Number(state.lastNow));
    const boundaryChanged=!first&&pauseBoundary!==previousBoundary;
    const modeChanged=Boolean(previousMode&&modeNow!==previousMode);
    const resumedFromPause=previousMode==="paused"&&modeNow==="playing";
    state.lastNow=now;state.lastPauseBoundary=pauseBoundary;state.lastMode=modeNow;

    if(boundaryChanged||resumedFromPause){
      state.pauseGapsDiscarded++;resetCombatAccumulators("pause resume");armResumeGuard(now);raw=frameDt||16
    }else if(modeChanged){
      raw=frameDt||16
    }
    const r59GuardUntil=Math.max(0,Number(r59State()?.suppressRecoveryUntil)||0),guardUntil=Math.max(Number(state.resumeGuardUntil)||0,r59GuardUntil);
    if(now<guardUntil){raw=frameDt||16;state.resumeGuardFrames++}
    let elapsed=Math.max(frameDt||0,raw||frameDt||16);
    if(elapsed>MAX_VISIBLE_FRAME_MS){state.visibleGapClamps++;state.discardedVisibleMs+=elapsed-MAX_VISIBLE_FRAME_MS;elapsed=MAX_VISIBLE_FRAME_MS}
    const extra=Math.max(0,elapsed-frameDt);
    payDownPlayerTimers(extra);

    state.currentElapsed=elapsed;state.currentFrameDt=frameDt;state.currentExtra=extra;state.frames++;
    try{projectileCD=SUPPRESS_TIMER_MS}catch(_){}try{enemyCD=SUPPRESS_TIMER_MS}catch(_){}
    try{wrapLiveController()}catch(error){recordError(error)}
    return{active:true,elapsed,frameDt,extra,pauseBoundary}
  }

  function runProjectileSteps(elapsed){
    state.projectileAccumulator+=Math.max(0,Number(elapsed)||0);
    let steps=0;
    while(state.projectileAccumulator>=PROJECTILE_STEP_MS&&steps<MAX_PROJECTILE_STEPS){
      try{if(typeof stepProjectiles==="function")stepProjectiles()}catch(error){recordError(error);break}
      state.projectileAccumulator-=PROJECTILE_STEP_MS;steps++;state.projectileSteps++
    }
    if(steps>1)state.projectileCatchupSteps+=steps-1;
    if(state.projectileAccumulator>=PROJECTILE_STEP_MS){
      const excess=state.projectileAccumulator%PROJECTILE_STEP_MS;
      state.discardedVisibleMs+=state.projectileAccumulator-excess;state.projectileAccumulator=excess
    }
    try{projectileCD=Math.max(0,PROJECTILE_STEP_MS-state.projectileAccumulator)}catch(_){}
    return steps
  }

  function runEnemySteps(elapsed){
    const think=enemyThinkMs();state.enemyAccumulator+=Math.max(0,Number(elapsed)||0);let steps=0;
    while(state.enemyAccumulator>=think&&steps<MAX_ENEMY_STEPS){
      try{if(typeof hostEnemyStep==="function")hostEnemyStep(think)}catch(error){recordError(error);break}
      state.enemyAccumulator-=think;steps++;state.enemySteps++
    }
    if(steps>1)state.enemyCatchupSteps+=steps-1;
    if(state.enemyAccumulator>=think){
      const excess=state.enemyAccumulator%think;
      state.discardedVisibleMs+=state.enemyAccumulator-excess;state.enemyAccumulator=excess
    }
    try{enemyCD=Math.max(0,think-state.enemyAccumulator)}catch(_){}
    return steps
  }

  function serviceCombat(timing){
    if(!timing?.active||!playingVisible())return{projectiles:0,enemies:0};
    const projectiles=runProjectileSteps(timing.elapsed),enemies=runEnemySteps(timing.elapsed);
    return{projectiles,enemies}
  }

  function wrapCombatController(){
    const api=window.CCGLostSizzlerV141HordeCombatPolish;if(!api)return false;
    let changed=false;
    const currentPre=api.preHordeCombatFrame;
    if(typeof currentPre==="function"&&!currentPre.__ccgV141R60HordeTiming){
      const source=currentPre;
      const wrapped=function preHordeCombatFrameV141R60(dt){
        const context=source.call(this,dt)||{};
        try{context.r60Timing=beginFrame(dt)}catch(error){recordError(error);context.r60Timing={active:false,elapsed:0,frameDt:Number(dt)||0,extra:0}}
        return context
      };
      wrapped.__ccgV141R60HordeTiming=true;wrapped.__ccgOriginal=source;api.preHordeCombatFrame=wrapped;state.preSource=source;changed=true
    }
    const currentPost=api.postHordeCombatFrame;
    if(typeof currentPost==="function"&&!currentPost.__ccgV141R60HordeTiming){
      const source=currentPost;
      const wrapped=function postHordeCombatFrameV141R60(context){
        try{serviceCombat(context?.r60Timing||null)}catch(error){recordError(error)}
        const result=source.call(this,context);
        state.currentElapsed=0;state.currentFrameDt=0;state.currentExtra=0;
        return result
      };
      wrapped.__ccgV141R60HordeTiming=true;wrapped.__ccgOriginal=source;api.postHordeCombatFrame=wrapped;state.postSource=source;changed=true
    }
    state.combatWrapped=Boolean(api.preHordeCombatFrame?.__ccgV141R60HordeTiming&&api.postHordeCombatFrame?.__ccgV141R60HordeTiming);
    if(changed&&state.installed)state.hookReassertions++;
    return state.combatWrapped
  }

  function originalChainContains(fn,target){
    if(typeof fn!=="function"||typeof target!=="function")return false;
    const seen=new Set();let current=fn,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth++<24){
      if(current===target)return true;
      seen.add(current);current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null
    }
    return false
  }

  function unwrapLiveSource(fn){
    if(typeof fn!=="function")return null;
    const seen=new Set();let current=fn,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth++<24&&current.__ccgV141R60RealElapsed===true&&typeof current.__ccgOriginal==="function"){
      if(current===state.liveOwner)break;
      seen.add(current);current=current.__ccgOriginal
    }
    return typeof current==="function"?current:null
  }

  function wrapLiveController(){
    const api=window.CCGLostSizzlerV138;if(!api||typeof api.updateHordeLive!=="function")return false;
    const current=api.updateHordeLive;
    if(current===state.liveOwner||originalChainContains(current,state.liveOwner)){
      state.liveWrapped=true;return true
    }
    const source=unwrapLiveSource(current);if(typeof source!=="function")return false;
    const wrapped=function updateHordeLiveV141R60Owned(dt){
      const elapsed=playingVisible()&&state.currentElapsed>0?state.currentElapsed:Number(dt)||0;
      if(playingVisible())state.liveElapsedFrames++;
      return source.call(this,elapsed)
    };
    wrapped.__ccgV141R60RealElapsed=true;wrapped.__ccgV141R60ExactLiveOwner=true;wrapped.__ccgOriginal=source;
    const replacing=typeof state.liveOwner==="function";
    state.liveOwner=wrapped;api.updateHordeLive=wrapped;state.liveSource=source;state.liveWrapped=true;state.liveOwnerInstalls++;
    if(replacing)state.liveOwnerReassertions++;
    if(state.installed)state.hookReassertions++;
    return true
  }

  function install(){
    const combat=wrapCombatController(),live=wrapLiveController();
    if(combat&&live){state.installed=true;try{document.body.dataset.v141R60HordeCombatIntegrity="true"}catch(_){}return true}
    return false
  }

  state.timer=setInterval(()=>{
    try{install()}catch(error){recordError(error)}
    if(!isHorde()&&state.clockPrimed)resetClock("left-horde",false)
  },INSTALL_MS);
  install();
  addEventListener("visibilitychange",()=>{if(document.hidden){resetCombatAccumulators("hidden");armResumeGuard();resetClock("hidden",true)}},{passive:true});
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0;resetClock("pagehide",false)},{once:true});

  window.CCGLostSizzlerV141R60HordeCombatIntegrity={
    PROJECTILE_STEP_MS,MAX_VISIBLE_FRAME_MS,MAX_PROJECTILE_STEPS,MAX_ENEMY_STEPS,SUPPRESS_TIMER_MS,PAUSE_REENTRY_GUARD_MS,
    beginFrame,serviceCombat,runProjectileSteps,runEnemySteps,payDownPlayerTimers,resetClock,resetCombatAccumulators,armResumeGuard,primeAccumulators,wrapCombatController,wrapLiveController,install,
    get state(){return state}
  };
})();

/* R60 live-play integrity addendum. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R60_LIVE_PLAY_INTEGRITY__)return;
  window.__CCG_LOST_SIZZLER_V141_R60_LIVE_PLAY_INTEGRITY__=true;

  const INSTALL_MS=40,FRAME_60=1000/60,AZALEA_ASSET="assets/parsnip-celery.png";
  const P1_MOVE=new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS"]);
  const P2_MOVE=new Set(["KeyI","KeyJ","KeyK","KeyL"]);
  const ENVIRONMENT_SOURCE=/(?:\btrap\b|anti[- ]loitering blast)/i;
  let movementTimes=new WeakMap();
  const state={
    timer:0,installed:false,updateWrapped:false,moveWrapped:false,startWrapped:false,hurtWrapped:false,
    updateSource:null,moveSource:null,startSource:null,hurtSource:null,lastVisualNow:0,lastPauseBoundary:0,lastMode:"",
    smoothingFrames:0,movementBlocks:0,pauseResets:0,ccgInsertions:0,azaleaRepairs:0,environmentRepairs:0,ownerReassertions:0,lastError:""
  };

  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const modeValue=()=>{try{return String(mode||"")}catch(_){return""}};
  const playModeValue=()=>{try{return String(playMode||"")}catch(_){return""}};
  const soloDungeon=()=>document.body?.dataset?.runActive==="true"&&playModeValue()==="solo"&&!specialType();
  const soloDungeonPlaying=()=>soloDungeon()&&modeValue()==="playing"&&!document.hidden;
  const r59PauseBoundary=()=>{try{return Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.pauseBoundaries||window.CCGLostSizzlerV141R59?.state?.pauseBoundaries||0)}catch(_){return 0}};
  const durability=player=>Number(player?.health||0)+Number(player?.armor||0);
  const recordError=error=>{state.lastError=String(error?.message||error||"unknown").slice(0,260);return false};

  function resetPauseSensitiveState(reason="mode boundary"){
    movementTimes=new WeakMap();state.lastVisualNow=perfNow();state.lastPauseBoundary=r59PauseBoundary();state.pauseResets++;
    try{if(Number(move1||0)>Math.max(45,Number(window.CCG_CONFIG?.player?.moveDelay||138)*2))move1=0}catch(_){}
    try{if(Number(move2||0)>Math.max(45,Number(window.CCG_CONFIG?.player?.moveDelay||138)*2))move2=0}catch(_){}
    return reason
  }

  function syncPauseBoundary(){
    const boundary=r59PauseBoundary(),currentMode=modeValue();
    if(boundary!==state.lastPauseBoundary||currentMode!==state.lastMode){
      const pauseTransition=boundary!==state.lastPauseBoundary||currentMode==="paused"||state.lastMode==="paused";
      state.lastPauseBoundary=boundary;state.lastMode=currentMode;
      if(pauseTransition)resetPauseSensitiveState("pause/resume boundary")
    }
    return boundary
  }

  function timeSmoothingAlpha(base,elapsedMs){
    const baseAlpha=Math.max(0,Math.min(.95,Number(base)||0)),elapsed=Math.max(0,Math.min(120,Number(elapsedMs)||0));
    if(baseAlpha<=0||elapsed<=0)return 0;
    return 1-Math.pow(1-baseAlpha,elapsed/FRAME_60)
  }

  function snapshotActors(){
    const rows=[];
    try{for(const player of typeof localPlayers==="function"?localPlayers():[p1,p2].filter(Boolean))if(player)rows.push({player,rx:Number(player.rx),ry:Number(player.ry),x:Number(player.x),y:Number(player.y),base:.32})}catch(_){}
    try{for(const player of remote?.values?.()||[])if(player)rows.push({player,rx:Number(player.rx),ry:Number(player.ry),x:Number(player.x),y:Number(player.y),base:.28})}catch(_){}
    return rows
  }

  function applyTimeSmoothing(rows,elapsedMs){
    for(const row of rows||[]){
      const player=row?.player;if(!player)continue;
      const x=Number(player.x),y=Number(player.y),legacyRx=Number(player.rx),legacyRy=Number(player.ry);
      if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(row.rx)||!Number.isFinite(row.ry))continue;
      const teleported=Math.abs(x-row.x)>2.25||Math.abs(y-row.y)>2.25;
      const explicitSnap=Math.abs(legacyRx-x)<.0001&&Math.abs(legacyRy-y)<.0001&&(teleported||Math.abs(x-row.x)>1.25||Math.abs(y-row.y)>1.25);
      if(explicitSnap)continue;
      const alpha=timeSmoothingAlpha(row.base,elapsedMs);
      player.rx=row.rx+(x-row.rx)*alpha;player.ry=row.ry+(y-row.ry)*alpha;state.smoothingFrames++
    }
  }

  function wrapUpdate(){
    if(specialType()==="sizzler-saboteurs")return false;
    const current=window.update;if(typeof current!=="function")return false;
    if(current.__ccgV141R60TimeSmoothing){state.updateWrapped=true;state.updateSource=current.__ccgOriginal||state.updateSource;return true}
    const source=current;
    const wrapped=function updateV141R60TimeSmoothed(dt){
      syncPauseBoundary();
      if(!soloDungeonPlaying()){state.lastVisualNow=perfNow();return source.apply(this,arguments)}
      const before=snapshotActors(),now=perfNow(),previous=state.lastVisualNow;state.lastVisualNow=now;
      const result=source.apply(this,arguments),wallElapsed=previous>0?Math.max(0,now-previous):Math.max(0,Number(dt)||FRAME_60);
      applyTimeSmoothing(before,Math.max(Number(dt)||0,wallElapsed));return result
    };
    wrapped.__ccgV141R60TimeSmoothing=true;wrapped.__ccgOriginal=source;
    window.update=wrapped;state.updateSource=source;state.updateWrapped=true;state.ownerReassertions++;return true
  }

  function movementHeldFor(player){
    try{const codes=player===p2?P2_MOVE:P1_MOVE;for(const code of codes)if(input?.has?.(code))return true}catch(_){}
    return false
  }

  function movementCadence(player){
    const base=Math.max(45,Number(window.CCG_CONFIG?.player?.moveDelay)||138),mult=Math.max(.25,Math.min(3,Number(player?.moveMultiplier)||1));
    return Math.max(45,base*mult)
  }

  function adoptMovementOwner(owner){
    if(typeof owner!=="function")return false;
    try{owner.__ccgV141SpyFinal=true;window.CCGLostSizzlerV141R30?.adoptReleaseMoveOwner?.(owner)}catch(_){}
    return true
  }

  function wrapMovement(){
    const current=window.movePlayer;if(typeof current!=="function")return false;
    if(current.__ccgV141R60CadenceSeal){adoptMovementOwner(current);state.moveWrapped=true;state.moveSource=current.__ccgOriginal||state.moveSource;return true}
    const source=current;
    const wrapped=function movePlayerV141R60CadenceSeal(player,dx,dy,dash=false){
      syncPauseBoundary();
      if(!soloDungeonPlaying()||dash||!player||!movementHeldFor(player))return source.apply(this,arguments);
      const now=perfNow(),last=Number(movementTimes.get(player)||0),minimum=Math.max(35,movementCadence(player)-8);
      if(last>0&&now-last<minimum){state.movementBlocks++;return false}
      const bx=Number(player.x),by=Number(player.y),result=source.apply(this,arguments);
      if(Number(player.x)!==bx||Number(player.y)!==by)movementTimes.set(player,now);
      return result
    };
    wrapped.__ccgV141R60CadenceSeal=true;wrapped.__ccgOriginal=source;adoptMovementOwner(wrapped);
    window.movePlayer=wrapped;state.moveSource=source;state.moveWrapped=true;state.ownerReassertions++;return true
  }

  function patchAzalea(){
    const rows=window.CCG_CONFIG?.followerElites;if(!Array.isArray(rows))return false;
    const azalea=rows.find(row=>String(row?.name||"").toUpperCase()==="AZALEA");if(!azalea)return false;
    let changed=false;if(String(azalea.avatar||"")!==AZALEA_ASSET){azalea.avatar=AZALEA_ASSET;changed=true}
    const overrides=window.CCG_ASSET_OVERRIDES?.images?.namedEnemies;
    if(overrides&&typeof overrides==="object"){
      if(overrides.AZALEA==null&&overrides["Parsnip Celery"]!=null)overrides.AZALEA=overrides["Parsnip Celery"];
      if(!Object.prototype.hasOwnProperty.call(overrides,"AZALEA"))overrides.AZALEA=null;delete overrides["Parsnip Celery"]
    }
    try{const custom=overrides?.AZALEA||AZALEA_ASSET,existing=typeof avatarImages!=="undefined"?avatarImages.get("AZALEA"):null;if(typeof avatarImages!=="undefined"&&(!existing||!String(existing.src||"").includes("parsnip-celery.png"))){const image=new Image();image.decoding="async";image.src=custom;avatarImages.set("AZALEA",image);changed=true}}catch(_){}
    if(changed)state.azaleaRepairs++;return true
  }

  function ccgDefinition(){return window.CCG_CONFIG?.followerElites?.find?.(row=>row?.ccgBoss||String(row?.name||"").toUpperCase()==="CCG")||null}
  function freeCcgCell(worldState,hostState){
    const occupied=new Set((hostState?.enemies||[]).filter(enemy=>enemy?.alive).map(enemy=>`${Number(enemy.x)},${Number(enemy.y)}`));
    const rooms=[...(worldState?.rooms||[])].filter(room=>room&&!room.sanctuary).sort((a,b)=>Number(b.depth||0)-Number(a.depth||0));
    for(const room of rooms)for(let y=Number(room.y)+1;y<Number(room.y)+Number(room.h);y++)for(let x=Number(room.x)+1;x<Number(room.x)+Number(room.w);x++){
      if(occupied.has(`${x},${y}`))continue;if(worldState?.start&&Math.abs(x-Number(worldState.start.x))+Math.abs(y-Number(worldState.start.y))<8)continue;
      try{if(window.CCGWorld?.walkable?.(worldState.map,x,y,hostState))return{x,y}}catch(_){}
    }
    return null
  }

  function ensureCcgEnemy(){
    if(!soloDungeon()||!window.CCGWorld||!host||!world)return false;
    if((host.enemies||[]).some(enemy=>String(enemy?.follower?.name||"").toUpperCase()==="CCG"))return true;
    const ccg=ccgDefinition(),cell=freeCcgCell(world,host);if(!ccg||!cell)return false;
    const floor=Math.max(1,Number(run?.floor||world?.floor||1));
    const enemy={id:`ccg-guaranteed-f${floor}-${Date.now()}`,...cell,kind:ccg.kind||"hunter",hp:18,maxHp:18,armor:4,maxArmor:4,alive:true,follower:ccg,ccgBoss:true,moveSpeedScale:Number(ccg.moveSpeedScale||1.35),namedDamageScale:Number(ccg.namedDamageScale||2),aiState:"idle",facing:{x:1,y:0},lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:900,attackCooldown:800,chargeCooldown:0,healCooldown:999999,flash:0,hpBarMs:0};
    host.enemies.push(enemy);host.revision=(Number(host.revision)||0)+1;try{window.CCGAI?.stageUnenteredEnemies?.(host,world)}catch(_){}state.ccgInsertions++;return true
  }

  function wrapStartWorld(){
    const current=window.startWorld;if(typeof current!=="function")return false;
    if(current.__ccgV141R60NamedRoster){state.startWrapped=true;state.startSource=current.__ccgOriginal||state.startSource;return true}
    const source=current;
    const wrapped=function startWorldV141R60NamedRoster(){const result=source.apply(this,arguments);setTimeout(()=>{try{patchAzalea();ensureCcgEnemy()}catch(error){recordError(error)}},0);return result};
    wrapped.__ccgV141R60NamedRoster=true;wrapped.__ccgOriginal=source;window.startWorld=wrapped;state.startSource=source;state.startWrapped=true;state.ownerReassertions++;return true
  }

  function wrapEnvironmentalDamage(){
    const current=window.hurtPlayer;if(typeof current!=="function")return false;
    if(current.__ccgV141R60EnvironmentSeal){state.hurtWrapped=true;state.hurtSource=current.__ccgOriginal||state.hurtSource;return true}
    const source=current;
    const wrapped=function hurtPlayerV141R60EnvironmentSeal(player,amount,friendly=false,sourceName="enemy"){
      if(!soloDungeonPlaying()||!player||!ENVIRONMENT_SOURCE.test(String(sourceName||"")))return source.apply(this,arguments);
      const before=durability(player),oldInv=Number(player.invuln||0);player.invuln=0;let result=source.apply(this,arguments),recovered=false;
      if(durability(player)>=before){const golden=window.CCGLostSizzlerV141R30?.state?.goldenHurt;if(typeof golden==="function"&&golden!==source&&golden!==wrapped){player.invuln=0;try{result=golden.call(this,player,amount,friendly,sourceName);recovered=durability(player)<before}catch(error){recordError(error)}}}
      if(durability(player)>=before)player.invuln=oldInv;else if(recovered)state.environmentRepairs++;
      return result
    };
    wrapped.__ccgV141R60EnvironmentSeal=true;wrapped.__ccgV141R56EnvironmentDamage=true;wrapped.__ccgOriginal=source;window.hurtPlayer=wrapped;state.hurtSource=source;state.hurtWrapped=true;state.ownerReassertions++;return true
  }

  function install(){
    syncPauseBoundary();patchAzalea();wrapStartWorld();wrapMovement();wrapEnvironmentalDamage();if(specialType()!=="sizzler-saboteurs")wrapUpdate();if(soloDungeon())ensureCcgEnemy();
    state.installed=Boolean(state.moveWrapped&&state.startWrapped&&state.hurtWrapped);if(state.installed)try{document.body.dataset.v141R60LivePlayIntegrity="true"}catch(_){}return state.installed
  }

  install();state.timer=setInterval(()=>{try{install()}catch(error){recordError(error)}},INSTALL_MS);
  addEventListener("visibilitychange",()=>{if(document.hidden)resetPauseSensitiveState("hidden")},{passive:true});
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerV141R60LivePlayIntegrity={AZALEA_ASSET,timeSmoothingAlpha,applyTimeSmoothing,movementCadence,patchAzalea,ensureCcgEnemy,wrapUpdate,wrapMovement,wrapStartWorld,wrapEnvironmentalDamage,install,get state(){return state}};
})();