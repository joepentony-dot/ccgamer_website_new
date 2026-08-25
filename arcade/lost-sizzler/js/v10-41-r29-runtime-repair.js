/* The Lost Sizzler V10.41 r29 — runtime, Horde and Spy repair. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R29_RUNTIME_REPAIR__)return;
  window.__CCG_LOST_SIZZLER_V141_R29_RUNTIME_REPAIR__=true;

  const INSTALL_MS=80;
  const state={
    timer:0,loopInstalled:false,quitInstalled:false,damageInstalled:false,packetInstalled:false,
    spyMoveInstalled:false,lastLoopSource:null,lastQuitSource:null,lastDamageSource:null,lastPacketSource:null,lastSpyMoveSource:null,
    frameFaults:0,updateFaults:0,renderFaults:0,lastFaultAt:0,lastFaultMessage:"",lastFaultLogAt:0,
    hordeFriendlyFireBlocked:0,hordeEnemyHitsRerouted:0,spyMoves:0,spyBlockedMoves:0,
    lastRunActive:false,audioStops:0,lastRemaining:-1
  };

  const special=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const modeType=()=>String(special()?.type||document.body?.dataset?.specialMode||"");
  const hordeActive=()=>modeType()==="horde-survivor";
  const spyActive=()=>modeType()==="sizzler-saboteurs";
  const finite=value=>Number.isFinite(Number(value));
  const liveSpyModel=player=>{try{return special()?.state?.players?.find(row=>String(row?.id||"")===String(player?.id||""))||null}catch(_){return null}};
  const spyCanMove=player=>{const model=liveSpyModel(player);return !model||model.status==="active"};

  function noteFault(phase,error){
    const now=performance.now();state.frameFaults++;if(phase==="update")state.updateFaults++;if(phase==="render")state.renderFaults++;
    state.lastFaultAt=now;state.lastFaultMessage=String(error?.message||error||"Unknown frame fault").slice(0,260);
    if(now-state.lastFaultLogAt>2000){state.lastFaultLogAt=now;try{console.error(`[Lost Sizzler r29] ${phase} fault contained without clearing input, reallocating the canvas or throttling play.`,error)}catch(_){}}
  }

  function stableLoop(timestamp){
    const t=finite(timestamp)?Number(timestamp):performance.now();let dt=16;
    try{
      const previous=finite(last)?Number(last):t-16;dt=Math.min(45,Math.max(0,t-previous||16));last=t;
      if(typeof damageFlash!=="undefined"&&damageFlash>0)damageFlash=Math.max(0,damageFlash-dt/500);
    }catch(error){noteFault("frame-clock",error)}
    try{if(typeof update==="function")update(dt)}catch(error){noteFault("update",error)}
    try{if(typeof render==="function")render()}catch(error){noteFault("render",error)}
    try{requestAnimationFrame(loop)}catch(error){noteFault("raf",error);setTimeout(()=>{try{requestAnimationFrame(loop)}catch(_){}},16)}
  }
  stableLoop.__ccgV141R29Stable=true;

  function installStableLoop(){
    const current=window.loop;if(typeof current!=="function")return false;
    if(current.__ccgV141R29Stable){state.loopInstalled=true;state.lastLoopSource=current;return true}
    const older=window.CCGLostSizzlerV141BrowserStabilityGameplay;
    if(older&&!older.state?.frameGuard)return false;
    window.loop=stableLoop;state.loopInstalled=true;state.lastLoopSource=stableLoop;return true;
  }

  function silenceGameplayAudio(){
    let changed=false;
    try{
      const api=window.CCGLostSizzlerSpecialModes;
      if(api?.active&&typeof api.stop==="function"){api.stop(undefined,true);changed=true}
    }catch(_){}
    try{if(typeof S!=="undefined"&&S?.stopMusic){S.stopMusic();changed=true}}catch(_){}
    try{window.CCGLostSizzlerHordeAudio?.stop?.();changed=true}catch(_){}
    try{window.CCGLostSizzlerSaboteursAudio?.stop?.();changed=true}catch(_){}
    try{window.CCGLostSizzlerVoice?.stop?.("menu")}catch(_){}
    try{window.speechSynthesis?.cancel?.()}catch(_){}
    if(changed)state.audioStops++;
    return changed;
  }

  function installQuitAudioGuard(){
    const current=window.quitToMenu;if(typeof current!=="function")return false;
    if(current.__ccgV141R29SilentMenu){state.quitInstalled=true;state.lastQuitSource=current;return true}
    if(current===state.lastQuitSource)return state.quitInstalled;
    const wrapped=async function quitToMenuV141R29Silent(){
      silenceGameplayAudio();
      try{return await current.apply(this,arguments)}finally{silenceGameplayAudio()}
    };
    wrapped.__ccgV141R29SilentMenu=true;wrapped.__ccgOriginal=current;window.quitToMenu=wrapped;
    state.quitInstalled=true;state.lastQuitSource=wrapped;return true;
  }

  function installHordeFriendlyFireGuard(){
    const current=window.hurtPlayer;if(typeof current!=="function")return false;
    if(current.__ccgV141R29HordeFriendly){state.damageInstalled=true;state.lastDamageSource=current;return true}
    if(current===state.lastDamageSource)return state.damageInstalled;
    const wrapped=function hurtPlayerV141R29NoHordeFriendly(player,amount,friendly=false){
      if(hordeActive()&&friendly){state.hordeFriendlyFireBlocked++;return false}
      return current.apply(this,arguments)
    };
    wrapped.__ccgV141R29HordeFriendly=true;wrapped.__ccgOriginal=current;window.hurtPlayer=wrapped;
    state.damageInstalled=true;state.lastDamageSource=wrapped;return true;
  }

  function installHordeNetworkDamageGuard(){
    const callbacks=typeof net!=="undefined"?net?.cb:null,current=callbacks?.onPacket;if(typeof current!=="function")return false;
    if(current.__ccgV141R29HordePacket){state.packetInstalled=true;state.lastPacketSource=current;return true}
    if(current===state.lastPacketSource)return state.packetInstalled;
    const wrapped=function onPacketV141R29HordeDamage(event,payload){
      if(hordeActive()&&event==="player_hit"&&payload?.target===p1?.id){
        state.hordeEnemyHitsRerouted++;
        try{return hurtPlayer(p1,Math.max(1,Number(payload.power)||1),false,payload.source||"enemy") }catch(error){noteFault("horde-network-hit",error);return false}
      }
      return current.apply(this,arguments)
    };
    wrapped.__ccgV141R29HordePacket=true;wrapped.__ccgOriginal=current;callbacks.onPacket=wrapped;
    state.packetInstalled=true;state.lastPacketSource=wrapped;return true;
  }

  function activeSpyOccupant(player){
    if(!player)return false;const model=liveSpyModel(player);if(model)return model.status==="active"&&Number(model.hp??player.health??1)>0;return Number(player.health??1)>0;
  }
  function spyOccupied(player,x,y){
    try{return (typeof allPlayers==="function"?allPlayers():[p1,...(remote?.values?.()||[])]).some(other=>other&&other!==player&&activeSpyOccupant(other)&&Number(other.x)===x&&Number(other.y)===y)}catch(_){return false}
  }
  function spyWalkable(x,y){try{return Boolean(window.CCGWorld?.walkable?.(world.map,x,y,host))}catch(_){return false}}
  function spyStep(player,dx,dy){
    if(!player||!spyCanMove(player)||typeof mode==="undefined"||mode!=="playing"||!world?.map||!host)return false;
    if((player.hitStunMs||0)>0)return false;
    const sx=Math.sign(Number(dx)||0),sy=Math.sign(Number(dy)||0);if(!sx&&!sy)return false;
    const nx=Number(player.x)+sx,ny=Number(player.y)+sy;
    if(sx&&sy&&(!spyWalkable(Number(player.x)+sx,Number(player.y))||!spyWalkable(Number(player.x),Number(player.y)+sy))){state.spyBlockedMoves++;return false}
    try{if(typeof tryDoor==="function"&&!tryDoor(player,nx,ny)){state.spyBlockedMoves++;return false}}catch(error){noteFault("spy-door",error);return false}
    if(!spyWalkable(nx,ny)||spyOccupied(player,nx,ny)){state.spyBlockedMoves++;return false}
    player.x=nx;player.y=ny;player.dir={x:sx,y:sy};
    if(!finite(player.rx))player.rx=nx-sx;if(!finite(player.ry))player.ry=ny-sy;
    try{reveal?.(player);markRoomVisit?.(player);rememberTrail?.(player);sync?.()}catch(_){}
    state.spyMoves++;return true;
  }
  function spyMove(player,dx,dy,dash=false){
    if(!spyActive())return null;
    if(!player||!spyCanMove(player))return false;
    const steps=dash?2:1;let moved=false;
    for(let index=0;index<steps;index++){if(!spyStep(player,dx,dy))break;moved=true}
    return moved;
  }
  function installSpyMovementOwner(){
    if(!window.CCGLostSizzlerV141SpyMovementFinalizer?.state?.installed)return false;
    const current=window.movePlayer;if(typeof current!=="function")return false;
    if(current.__ccgV141R29SpyOwner){state.spyMoveInstalled=true;state.lastSpyMoveSource=current;return true}
    if(current===state.lastSpyMoveSource)return state.spyMoveInstalled;
    const wrapped=function movePlayerV141R29SpyOwner(player,dx,dy,dash=false){
      if(spyActive())return spyMove(player,dx,dy,dash);
      return current.apply(this,arguments)
    };
    wrapped.__ccgV141R29SpyOwner=true;wrapped.__ccgOriginal=current;window.movePlayer=wrapped;
    state.spyMoveInstalled=true;state.lastSpyMoveSource=wrapped;return true;
  }

  function desiredHordeQuota(runState){
    const wave=Math.max(0,Number(runState?.wave)||0),players=Math.max(1,Number(runState?.playerCount)||1);if(!wave)return 0;
    try{if(window.CCGLostSizzlerV138?.desiredQuota)return Number(window.CCGLostSizzlerV138.desiredQuota(wave,players))||0}catch(_){}
    try{return Number(window.CCGLostSizzlerHorde?.quotaFor?.(wave,players))||0}catch(_){return 0}
  }
  function hordeRemaining(runState=special()?.state){
    if(!runState)return 0;const quota=Math.max(0,desiredHordeQuota(runState)),defeated=Math.max(0,Number(runState.defeated)||0),bossAlive=Boolean(runState.boss?.alive&&Number(runState.boss?.hp||0)>0);
    return Math.max(0,quota-defeated)+(bossAlive?1:0)
  }
  function ensureRemainingHud(){
    let node=document.getElementById("horde-live-remaining");if(node)return node;
    const roster=document.getElementById("horde-live-roster");if(!roster)return null;
    node=document.createElement("div");node.id="horde-live-remaining";node.setAttribute("aria-live","polite");node.style.cssText="margin-top:5px;padding-top:5px;border-top:1px solid rgba(108,236,255,.25);color:#6cecff;font:900 10px/1.25 'Courier New',monospace;letter-spacing:.35px";
    const head=roster.querySelector(".v138-head");head?.insertAdjacentElement("afterend",node);return node;
  }
  function updateRemainingHud(){
    const node=ensureRemainingHud();if(!node)return false;
    if(!hordeActive()){node.textContent="";node.hidden=true;state.lastRemaining=-1;return false}
    const runState=special()?.state,remaining=hordeRemaining(runState),wave=Math.max(0,Number(runState?.wave)||0),physical=(typeof host!=="undefined"&&host?.enemies||[]).filter(enemy=>enemy?.alive&&enemy?.hordeEnemy).length;
    node.hidden=false;node.textContent=`WAVE ${wave||0}/10 · ENEMIES LEFT ${remaining} · ACTIVE NOW ${physical}`;state.lastRemaining=remaining;return true;
  }

  function runTransitionGuard(){
    const running=document.body?.dataset?.runActive==="true";
    if(state.lastRunActive&&!running)silenceGameplayAudio();
    state.lastRunActive=running;
  }

  function install(){
    installStableLoop();installQuitAudioGuard();installHordeFriendlyFireGuard();installHordeNetworkDamageGuard();installSpyMovementOwner();updateRemainingHud();runTransitionGuard();
    return state.loopInstalled&&state.quitInstalled&&state.damageInstalled
  }

  install();state.timer=setInterval(install,INSTALL_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);silenceGameplayAudio()},{once:true});
  window.CCGLostSizzlerV141R29={
    stableLoop,silenceGameplayAudio,spyMove,spyStep,hordeRemaining,updateRemainingHud,install,get state(){return state}
  };
})();
