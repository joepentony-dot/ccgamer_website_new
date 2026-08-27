/* The Lost Sizzler V10.41 — Horde combat pacing, shot power and wave recovery. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_HORDE_COMBAT_POLISH__)return;
  window.__CCG_LOST_SIZZLER_V141_HORDE_COMBAT_POLISH__=true;

  const WAVE_RECOVERY_HP=5;
  const MAX_ENEMY_SPEED=.72;
  const MAX_WARDEN_SPEED=.78;
  const SIDE_STEP_GRACE_MS=1100;
  const PACING_MAINTENANCE_MS=240;
  const NAV_SAMPLE_MS=160;
  const WAVE_POWER=Object.freeze([2,2,3,3,4,4,5,5,6,7]);
  const state={
    installed:false,wrapped:false,controllerOwnedUpdate:true,timer:0,runKey:"",lastPhase:"",lastWave:0,recoveredWave:0,nav:new Map(),
    lastPacingAt:0,lastNavSampleAt:0,pacingRuns:0,navSamples:0,navLookups:0
  };

  const active=()=>window.CCGLostSizzlerSpecialModes?.active||null;
  const isHorde=()=>active()?.type==="horde-survivor";
  const isAuthority=()=>Boolean(isHorde()&&active()?.authoritative);
  const actorId=()=>String(net?.sessionId||p1?.id||"P1");
  const hordeState=()=>active()?.state||null;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};

  function liveFor(id){
    const key=String(id||"");
    if(String(p1?.id||actorId())===key||actorId()===key)return p1||null;
    try{return remote?.get?.(key)||null}catch(_){return null}
  }

  function alivePhysicalPlayers(){
    const out=[];
    try{
      if(p1&&Number(p1.health||0)>0)out.push(p1);
      for(const player of remote?.values?.()||[])if(player&&Number(player.health||0)>0)out.push(player);
    }catch(_){}
    return out;
  }

  function wavePower(level){
    const wave=clamp(Math.floor(level||1),1,10);
    return WAVE_POWER[wave-1]||WAVE_POWER[0];
  }

  function strengthenLocalWeapon(){
    if(!isHorde()||!p1)return false;
    const runState=hordeState(),wave=clamp(Math.floor(runState?.wave||1),1,10),power=wavePower(wave);
    if(!p1.firearmUnlocked||!p1.weapon)return false;
    p1.weapon.power=Math.max(power,Number(p1.weapon.power||0));
    p1.weapon.rating=Math.max(power,Number(p1.weapon.rating||0));
    p1.maxMana=Math.max(60,Number(p1.maxMana||60));
    p1.mana=p1.maxMana;
    return true;
  }

  function capEnemyPacing(){
    if(!isHorde())return false;
    const runState=hordeState();
    for(const model of runState?.activeEnemies||[]){
      if(!model||model._v138Reserve||model.kind==="reserve")continue;
      const speed=Number(model.speed||1);
      model.speed=Math.min(speed,MAX_ENEMY_SPEED);
    }
    if(runState?.boss?.alive)runState.boss.speed=Math.min(Number(runState.boss.speed||1),MAX_WARDEN_SPEED);
    for(const enemy of host?.enemies||[]){
      if(!enemy?.alive||!enemy.hordeEnemy)continue;
      const cap=enemy.hordeWarden?MAX_WARDEN_SPEED:MAX_ENEMY_SPEED;
      enemy.moveSpeedScale=Math.min(Number(enemy.moveSpeedScale||1),cap);
      enemy.moveCooldown=Math.max(Number(enemy.moveCooldown||0),90000);
      enemy.aiState="chase";
    }
    state.pacingRuns++;
    return true;
  }

  function maintainPacing(now=perfNow(),force=false){
    if(!isHorde())return false;
    if(!force&&now-state.lastPacingAt<PACING_MAINTENANCE_MS)return false;
    state.lastPacingAt=now;
    capEnemyPacing();strengthenLocalWeapon();
    return true;
  }

  function nearestTarget(enemy,players){
    let best=null,bestDistance=Infinity;
    for(const player of players){
      const distance=Math.abs(Number(enemy.x)-Number(player.x))+Math.abs(Number(enemy.y)-Number(player.y));
      if(distance<bestDistance){bestDistance=distance;best=player}
    }
    return best;
  }

  function snapshotApproachSteps(){
    if(!isAuthority())return null;
    const players=alivePhysicalPlayers(),snapshot=new Map();
    if(!players.length)return snapshot;
    for(const enemy of host?.enemies||[]){
      if(!enemy?.alive||!enemy.hordeEnemy)continue;
      const target=nearestTarget(enemy,players);if(!target)continue;
      snapshot.set(String(enemy.id),{
        x:Number(enemy.x),y:Number(enemy.y),approachMs:Number(enemy._v138ApproachMs||0),
        targetX:Number(target.x),targetY:Number(target.y)
      });
    }
    state.navSamples++;
    return snapshot;
  }

  function sampleApproachSteps(now=perfNow(),force=false){
    if(!isAuthority())return null;
    if(!force&&now-state.lastNavSampleAt<NAV_SAMPLE_MS)return null;
    state.lastNavSampleAt=now;
    return snapshotApproachSteps();
  }

  function restoreEnemyPosition(enemy,before){
    enemy.x=before.x;enemy.y=before.y;
    const model=hordeState()?.activeEnemies?.find?.(row=>String(row?.id)===String(enemy.id));
    if(model){model.x=before.x;model.y=before.y}
  }

  function filterRapidSideSteps(before,now=Date.now()){
    if(!before||!isAuthority())return false;
    const byId=new Map();
    for(const enemy of host?.enemies||[])if(enemy?.alive&&enemy.hordeEnemy)byId.set(String(enemy.id),enemy);
    for(const [id,old] of before){
      const enemy=byId.get(id);state.navLookups++;if(!enemy)continue;
      if(Number(enemy.x)===old.x&&Number(enemy.y)===old.y)continue;
      if(!(old.approachMs<=0&&Number(enemy._v138ApproachMs||0)>0))continue;
      const oldDistance=Math.abs(old.targetX-old.x)+Math.abs(old.targetY-old.y);
      const newDistance=Math.abs(old.targetX-Number(enemy.x))+Math.abs(old.targetY-Number(enemy.y));
      if(newDistance<oldDistance){state.nav.delete(id);continue}
      const nav=state.nav.get(id)||{blockedSince:now};
      if(now-nav.blockedSince<SIDE_STEP_GRACE_MS){
        restoreEnemyPosition(enemy,old);
        state.nav.set(id,nav);
        continue
      }
      nav.blockedSince=now;state.nav.set(id,nav);
    }
    return true;
  }

  function grantWaveRecovery(runState,wave){
    if(!isAuthority()||!runState||state.recoveredWave===wave)return false;
    let healed=0;
    for(const model of runState.players||[]){
      if(model?.status!=="active")continue;
      const maxHp=Math.max(1,Number(model.maxHp||10)),before=Math.max(0,Number(model.hp||0));
      model.hp=Math.min(maxHp,before+WAVE_RECOVERY_HP);
      const physical=liveFor(model.id);
      if(physical){physical.maxHealth=maxHp;physical.health=model.hp}
      healed+=Math.max(0,model.hp-before);
    }
    state.recoveredWave=wave;
    try{showToast("WAVE CLEARED — +5 HP",healed>0?"Every active survivor recovered up to 5 HP before the next assault.":"Wave cleared. Survivors already at full health keep their current HP.","green",5600)}catch(_){}
    return true;
  }

  function resetRunTracking(runState){
    const key=String(active()?.seed||runState?.seed||"");
    if(state.runKey===key)return false;
    state.runKey=key;state.lastPhase=String(runState?.state||"");state.lastWave=Number(runState?.wave||0);state.recoveredWave=0;state.nav.clear();state.lastPacingAt=0;state.lastNavSampleAt=0;
    return true;
  }

  function processWaveTransition(previousPhase,previousWave){
    if(!isAuthority())return;
    const runState=hordeState();if(!runState)return;
    const phase=String(runState.state||""),wave=Number(runState.wave||0);
    if(["wave","siege"].includes(previousPhase)&&["intermission","boss"].includes(phase)&&wave===previousWave&&wave>0)grantWaveRecovery(runState,wave);
    state.lastPhase=phase;state.lastWave=wave;
  }

  function preHordeCombatFrame(){
    if(!isHorde()){
      if(state.runKey){state.runKey="";state.lastPhase="";state.lastWave=0;state.recoveredWave=0;state.nav.clear();state.lastPacingAt=0;state.lastNavSampleAt=0}
      return null
    }
    const runState=hordeState(),freshRun=resetRunTracking(runState),now=perfNow();
    const context={previousPhase:String(runState?.state||state.lastPhase||""),previousWave:Number(runState?.wave||state.lastWave||0),before:null};
    maintainPacing(now,freshRun);
    if(isAuthority())context.before=sampleApproachSteps(now,freshRun);
    return context
  }

  function postHordeCombatFrame(context){
    if(!isHorde())return false;
    if(context?.before)filterRapidSideSteps(context.before,Date.now());
    processWaveTransition(String(context?.previousPhase||""),Number(context?.previousWave||0));
    return true
  }

  function install(){
    if(state.installed)return true;
    const gate=window.CCGLostSizzlerReleaseGate;
    if(gate&&!gate.state?.ready)return false;
    if(!window.CCGLostSizzlerV140?.state?.installed||!window.CCGLostSizzlerV139?.state?.installed||!window.CCGLostSizzlerV138||!window.CCGLostSizzlerHorde)return false;
    state.installed=true;document.body.dataset.v141HordeCombatPolish="true";return true;
  }

  state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},90);
  install();
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});

  window.CCGLostSizzlerV141HordeCombatPolish={
    WAVE_RECOVERY_HP,MAX_ENEMY_SPEED,MAX_WARDEN_SPEED,SIDE_STEP_GRACE_MS,PACING_MAINTENANCE_MS,NAV_SAMPLE_MS,WAVE_POWER,
    wavePower,strengthenLocalWeapon,capEnemyPacing,maintainPacing,grantWaveRecovery,filterRapidSideSteps,snapshotApproachSteps,sampleApproachSteps,preHordeCombatFrame,postHordeCombatFrame,get state(){return state}
  };
})();