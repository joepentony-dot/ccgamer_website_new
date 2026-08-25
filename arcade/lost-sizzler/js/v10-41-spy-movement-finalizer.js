/* The Lost Sizzler V10.41 — final Spy Vs Spy movement ownership.
 * Installs only after the sequential enhancement queue is complete so later
 * dungeon wrappers cannot replace the Spy movement repair.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_SPY_MOVEMENT_FINALIZER__)return;
  window.__CCG_LOST_SIZZLER_V141_SPY_MOVEMENT_FINALIZER__=true;
  const state={installed:false,fallbackMoves:0,timer:0};
  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type==="sizzler-saboteurs"||document.body?.dataset?.specialMode==="sizzler-saboteurs"}catch(_){return false}};
  const otherPlayerAt=(player,x,y)=>{try{return (typeof allPlayers==="function"?allPlayers():[p1,...remote.values()]).some(other=>other&&other!==player&&Number(other.health||1)>0&&other.x===x&&other.y===y)}catch(_){return false}};
  function validStep(player,dx,dy){
    try{
      if(!spyActive()||!player||mode!=="playing"||!world?.map||!host||!window.CCGWorld||(player.hitStunMs||0)>0)return null;
      const nx=player.x+dx,ny=player.y+dy;
      if(dx&&dy&&(!window.CCGWorld.walkable(world.map,player.x+dx,player.y,host)||!window.CCGWorld.walkable(world.map,player.x,player.y+dy,host)))return null;
      if(!window.CCGWorld.walkable(world.map,nx,ny,host)||otherPlayerAt(player,nx,ny))return null;
      return{x:nx,y:ny};
    }catch(_){return null}
  }
  function install(){
    if(state.installed||typeof window.movePlayer!=="function")return state.installed;
    const original=window.movePlayer;
    window.movePlayer=function movePlayerV141SpyFinal(player,dx,dy,dash=false){
      const ox=player?.x,oy=player?.y;let result;
      try{result=original.apply(this,arguments)}catch(error){if(!spyActive())throw error;try{console.warn("[Lost Sizzler V10.41] Spy movement inherited path failed; using safe floor fallback",error)}catch(_){}}
      if(!spyActive()||!player||dash||player.x!==ox||player.y!==oy)return result;
      const step=validStep(player,Number(dx)||0,Number(dy)||0);if(!step)return result;
      player.x=step.x;player.y=step.y;player.dir={x:Number(dx)||0,y:Number(dy)||0};
      if(!Number.isFinite(Number(player.rx)))player.rx=ox;if(!Number.isFinite(Number(player.ry)))player.ry=oy;
      try{reveal?.(player);markRoomVisit?.(player);rememberTrail?.(player);sync?.()}catch(_){}state.fallbackMoves++;return result;
    };
    window.movePlayer.__ccgV141SpyFinal=true;state.installed=true;
    try{window.CCGLostSizzlerV141BrowserStabilityGameplay?.repairSpySpawn?.()}catch(_){}
    return true;
  }
  function ready(){return document.body?.dataset?.releaseReady==="true"||window.CCGLostSizzlerReleaseGate?.state?.ready===true}
  const gate=window.CCGLostSizzlerReleaseGate?.state?.promise;
  if(gate&&typeof gate.then==="function")gate.then(ok=>{if(ok!==false)install()}).catch(()=>{});
  state.timer=setInterval(()=>{if(ready()&&install()){clearInterval(state.timer);state.timer=0}},80);
  if(ready())install();
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141SpyMovementFinalizer={install,validStep,get state(){return state}};
})();