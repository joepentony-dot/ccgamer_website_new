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
  const state={
    timer:0,installed:false,combatWrapped:false,liveWrapped:false,
    preSource:null,postSource:null,liveSource:null,
    lastNow:0,lastPauseBoundary:0,lastMode:"",clockPrimed:false,
    projectileAccumulator:0,enemyAccumulator:0,currentElapsed:0,currentFrameDt:0,currentExtra:0,
    frames:0,clockResets:0,pauseGapsDiscarded:0,visibleGapClamps:0,discardedVisibleMs:0,
    projectileSteps:0,projectileCatchupSteps:0,enemySteps:0,enemyCatchupSteps:0,
    playerTimerCatchupMs:0,liveElapsedFrames:0,hookReassertions:0,lastError:""
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
    if(!playingVisible()){
      resetClock("not-visible-playing",true);state.lastPauseBoundary=pauseBoundary;state.lastMode=modeNow;
      return{active:false,elapsed:0,frameDt,extra:0,pauseBoundary}
    }

    primeAccumulators();
    const first=!finite(state.lastNow)||Number(state.lastNow)<=0;
    let raw=first?(frameDt||16):Math.max(0,now-Number(state.lastNow));
    const boundaryChanged=!first&&pauseBoundary!==Number(state.lastPauseBoundary||0);
    const modeChanged=Boolean(state.lastMode&&modeNow!==state.lastMode);
    state.lastNow=now;state.lastPauseBoundary=pauseBoundary;state.lastMode=modeNow;

    if(boundaryChanged||modeChanged){
      state.pauseGapsDiscarded++;
      raw=frameDt||16
    }
    let elapsed=Math.max(frameDt||0,raw||frameDt||16);
    if(elapsed>MAX_VISIBLE_FRAME_MS){state.visibleGapClamps++;state.discardedVisibleMs+=elapsed-MAX_VISIBLE_FRAME_MS;elapsed=MAX_VISIBLE_FRAME_MS}
    const extra=Math.max(0,elapsed-frameDt);
    payDownPlayerTimers(extra);

    state.currentElapsed=elapsed;state.currentFrameDt=frameDt;state.currentExtra=extra;state.frames++;
    try{projectileCD=SUPPRESS_TIMER_MS}catch(_){}try{enemyCD=SUPPRESS_TIMER_MS}catch(_){}
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

  function wrapLiveController(){
    const api=window.CCGLostSizzlerV138;if(!api||typeof api.updateHordeLive!=="function")return false;
    const current=api.updateHordeLive;
    if(current.__ccgV141R60RealElapsed){state.liveWrapped=true;return true}
    const source=current;
    const wrapped=function updateHordeLiveV141R60(dt){
      const elapsed=playingVisible()&&state.currentElapsed>0?state.currentElapsed:Number(dt)||0;
      if(playingVisible())state.liveElapsedFrames++;
      return source.call(this,elapsed)
    };
    wrapped.__ccgV141R60RealElapsed=true;wrapped.__ccgOriginal=source;api.updateHordeLive=wrapped;state.liveSource=source;state.liveWrapped=true;
    if(state.installed)state.hookReassertions++;
    return true
  }

  function install(){
    const combat=wrapCombatController(),live=wrapLiveController();
    if(combat&&live){
      state.installed=true;
      try{document.body.dataset.v141R60HordeCombatIntegrity="true"}catch(_){}
      return true
    }
    return false
  }

  state.timer=setInterval(()=>{
    try{install()}catch(error){recordError(error)}
    if(!isHorde()&&state.clockPrimed)resetClock("left-horde",false)
  },INSTALL_MS);
  install();
  addEventListener("visibilitychange",()=>{if(document.hidden)resetClock("hidden",true)},{passive:true});
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0;resetClock("pagehide",false)},{once:true});

  window.CCGLostSizzlerV141R60HordeCombatIntegrity={
    PROJECTILE_STEP_MS,MAX_VISIBLE_FRAME_MS,MAX_PROJECTILE_STEPS,MAX_ENEMY_STEPS,SUPPRESS_TIMER_MS,
    beginFrame,serviceCombat,runProjectileSteps,runEnemySteps,payDownPlayerTimers,resetClock,primeAccumulators,wrapCombatController,wrapLiveController,install,
    get state(){return state}
  };
})();