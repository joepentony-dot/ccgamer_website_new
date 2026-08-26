/* The Lost Sizzler V10.41 — final Spy Vs Spy movement ownership.
 * Installs only after the sequential enhancement queue is complete so later
 * dungeon wrappers cannot replace the Spy movement repair.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_SPY_MOVEMENT_FINALIZER__)return;
  window.__CCG_LOST_SIZZLER_V141_SPY_MOVEMENT_FINALIZER__=true;
  const state={installed:false,moveInstalled:false,updateInstalled:false,fallbackMoves:0,respawns:0,statusById:new Map(),timer:0};
  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type==="sizzler-saboteurs"||document.body?.dataset?.specialMode==="sizzler-saboteurs"}catch(_){return false}};
  const spyModelFor=player=>{try{return window.CCGLostSizzlerSpecialModes?.active?.state?.players?.find(entry=>String(entry?.id||"")===String(player?.id||""))||null}catch(_){return null}};
  const canSpyMove=player=>{const model=spyModelFor(player);return !model||model.status==="active"};
  const activeOccupant=player=>{const model=spyModelFor(player);if(model)return model.status==="active"&&Number(model.hp??player?.health??1)>0;return Number(player?.health??1)>0};
  const otherPlayerAt=(player,x,y)=>{try{return (typeof allPlayers==="function"?allPlayers():[p1,...remote.values()]).some(other=>other&&other!==player&&activeOccupant(other)&&other.x===x&&other.y===y)}catch(_){return false}};
  function liveFor(id){try{return String(p1?.id||"")===String(id)?p1:remote?.get?.(id)||null}catch(_){return null}}
  function modelRoom(model){
    try{
      const match=window.CCGLostSizzlerSpecialModes?.active?.state,logical=match?.map?.rooms?.find(room=>String(room?.id||"")===String(model?.roomId||""));
      const physical=Number(logical?.dungeonRoomId);return Number.isFinite(physical)?world?.rooms?.[physical]||null:null;
    }catch(_){return null}
  }
  function roomCentre(room){return room?{x:Math.floor(Number(room.x)+Number(room.w)/2),y:Math.floor(Number(room.y)+Number(room.h)/2)}:null}
  function materialiseRespawn(model){
    const live=liveFor(model?.id),room=modelRoom(model),cell=roomCentre(room);if(!live||!cell)return false;
    try{if(!window.CCGWorld?.walkable?.(world.map,cell.x,cell.y,host))return false}catch(_){return false}
    live.x=cell.x;live.y=cell.y;live.rx=cell.x;live.ry=cell.y;live.hitStunMs=0;live.health=Math.max(1,Number(model.hp||live.health||1));
    try{live.maxHealth=Math.max(Number(live.maxHealth||1),Number(model.maxHp||model.hp||1));reveal?.(live);markRoomVisit?.(live);rememberTrail?.(live);sync?.()}catch(_){}
    state.respawns++;return true
  }
  function syncRespawns(){
    if(!spyActive()){state.statusById.clear();return false}
    const models=window.CCGLostSizzlerSpecialModes?.active?.state?.players||[];let changed=false;
    for(const model of models){
      const id=String(model?.id||"");if(!id)continue;const current=String(model?.status||""),previous=state.statusById.get(id);
      if(previous==="knocked-out"&&current==="active"){
        if(!materialiseRespawn(model))continue;
        changed=true;
      }
      state.statusById.set(id,current);
    }
    return changed
  }
  function validStep(player,dx,dy){
    try{
      if(!spyActive()||!player||!canSpyMove(player)||mode!=="playing"||!world?.map||!host||!window.CCGWorld||(player.hitStunMs||0)>0)return null;
      const nx=player.x+dx,ny=player.y+dy;
      if(dx&&dy&&(!window.CCGWorld.walkable(world.map,player.x+dx,player.y,host)||!window.CCGWorld.walkable(world.map,player.x,player.y+dy,host)))return null;
      if(!window.CCGWorld.walkable(world.map,nx,ny,host)||otherPlayerAt(player,nx,ny))return null;
      return{x:nx,y:ny};
    }catch(_){return null}
  }
  function installMove(){
    if(state.moveInstalled||typeof window.movePlayer!=="function")return state.moveInstalled;
    const original=window.movePlayer;
    window.movePlayer=function movePlayerV141SpyFinal(player,dx,dy,dash=false){
      if(spyActive()&&!canSpyMove(player))return false;
      const ox=player?.x,oy=player?.y;let result;
      try{result=original.apply(this,arguments)}catch(error){if(!spyActive())throw error;try{console.warn("[Lost Sizzler V10.41] Spy movement inherited path failed; using safe floor fallback",error)}catch(_){}}
      if(!spyActive()||!player||dash||player.x!==ox||player.y!==oy)return result;
      const step=validStep(player,Number(dx)||0,Number(dy)||0);if(!step)return result;
      player.x=step.x;player.y=step.y;player.dir={x:Number(dx)||0,y:Number(dy)||0};
      if(!Number.isFinite(Number(player.rx)))player.rx=ox;if(!Number.isFinite(Number(player.ry)))player.ry=oy;
      try{reveal?.(player);markRoomVisit?.(player);rememberTrail?.(player);sync?.()}catch(_){}state.fallbackMoves++;return result;
    };
    window.movePlayer.__ccgV141SpyFinal=true;window.movePlayer.__ccgOriginal=original;state.moveInstalled=true;
    try{window.CCGLostSizzlerV141R30?.adoptReleaseMoveOwner?.(window.movePlayer)}catch(_){}
    return true;
  }
  function installUpdate(){
    if(state.updateInstalled||typeof window.update!=="function")return state.updateInstalled;
    const original=window.update;
    window.update=function updateV141SpyRespawnFinal(){const result=original.apply(this,arguments);try{syncRespawns()}catch(error){try{console.warn("[Lost Sizzler V10.41] Spy respawn finalizer recovered",error)}catch(_){}}return result};
    window.update.__ccgV141SpyRespawnFinal=true;state.updateInstalled=true;return true;
  }
  function install(){
    const moveReady=installMove(),updateReady=installUpdate();state.installed=Boolean(moveReady&&updateReady);
    if(state.installed)try{window.CCGLostSizzlerV141BrowserStabilityGameplay?.repairSpySpawn?.()}catch(_){}
    return state.installed;
  }
  function ready(){return document.body?.dataset?.releaseReady==="true"||window.CCGLostSizzlerReleaseGate?.state?.ready===true}
  const gate=window.CCGLostSizzlerReleaseGate?.state?.promise;
  if(gate&&typeof gate.then==="function")gate.then(ok=>{if(ok!==false)install()}).catch(()=>{});
  state.timer=setInterval(()=>{if(ready()&&install()){clearInterval(state.timer);state.timer=0}},80);
  if(ready())install();
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141SpyMovementFinalizer={install,validStep,canSpyMove,syncRespawns,materialiseRespawn,get state(){return state}};
})();