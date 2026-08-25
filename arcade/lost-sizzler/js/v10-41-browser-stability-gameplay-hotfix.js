/* The Lost Sizzler V10.41 — browser crash containment and special-mode gameplay hotfix.
 *
 * Release blocker goals:
 * - a single update/render exception must never terminate the RAF loop;
 * - returning from Pause, a background tab or fullscreen change must reset
 *   transient input/camera timing rather than resuming stale state;
 * - Horde uses a substantially smaller centred arena so waves engage quickly;
 * - Spy Vs Spy has a safe movement fallback when a valid floor step is rejected
 *   by inherited dungeon movement state.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_BROWSER_STABILITY_GAMEPLAY_HOTFIX__)return;
  window.__CCG_LOST_SIZZLER_V141_BROWSER_STABILITY_GAMEPLAY_HOTFIX__=true;

  const state={
    installedAt:Date.now(),frameGuard:false,pauseGuard:false,moveGuard:false,specialGuard:false,
    frameFaults:0,updateFaults:0,renderFaults:0,lastFaultAt:0,faultBurst:0,lastFaultMessage:"",
    compactedHordeRuns:0,spyFallbackMoves:0,focusRecoveries:0,timer:0
  };

  const activeSpecial=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const hordeActive=()=>String(activeSpecial()?.type||document.body?.dataset?.specialMode||"")==="horde-survivor";
  const spyActive=()=>String(activeSpecial()?.type||document.body?.dataset?.specialMode||"")==="sizzler-saboteurs";
  const runActive=()=>document.body?.dataset?.runActive==="true";
  const finite=value=>Number.isFinite(Number(value));

  function safeConsole(method,...args){try{console?.[method]?.(...args)}catch(_){}}
  function clearInputs(){
    try{input?.clear?.()}catch(_){}
    try{move1=0;move2=0;fireBuffer1=0;fireBuffer2=0}catch(_){}
  }
  function resetFrameClock(){try{last=performance.now()}catch(_){} }
  function clearCameras(){try{cameras?.clear?.()}catch(_){} }
  function requestSafeResize(){
    try{window.__CCG_LOST_SIZZLER_SCHEDULE_RESIZE__?.()}catch(_){}
    try{requestAnimationFrame(()=>{try{resizeGameCanvas?.()}catch(_){}})}catch(_){}
  }
  function repairPlayer(player){
    if(!player)return;
    if(!finite(player.x)||!finite(player.y))return;
    if(!finite(player.rx))player.rx=player.x;if(!finite(player.ry))player.ry=player.y;
    if(!finite(player.hitStunMs)||player.hitStunMs<0)player.hitStunMs=0;
    if(!finite(player.invuln)||player.invuln<0)player.invuln=0;
  }
  function repairRuntime(reason="runtime"){
    clearInputs();resetFrameClock();clearCameras();
    try{repairPlayer(p1);repairPlayer(p2);for(const player of remote?.values?.()||[])repairPlayer(player)}catch(_){}
    try{
      if(host){
        for(const key of ["enemies","items","doors","chests","blockingDecor","generators","traps","hazards","shops","deathCaches"])if(!Array.isArray(host[key]))host[key]=[];
      }
    }catch(_){}
    if(reason==="render"){
      try{
        if(canvas&&ctx&&canvas.width>0&&canvas.height>0){const w=canvas.width,h=canvas.height;canvas.width=w;canvas.height=h;ctx.imageSmoothingEnabled=false}
      }catch(_){}
      requestSafeResize();
    }
  }
  function noteFault(phase,error){
    const now=performance.now();state.frameFaults++;if(phase==="update")state.updateFaults++;if(phase==="render")state.renderFaults++;
    state.faultBurst=now-state.lastFaultAt<2000?state.faultBurst+1:1;state.lastFaultAt=now;state.lastFaultMessage=String(error?.message||error||"Unknown frame error").slice(0,240);
    if(state.faultBurst<=2||state.faultBurst%10===0)safeConsole("error",`[Lost Sizzler V10.41] ${phase} frame recovered instead of terminating`,error);
    repairRuntime(phase);
  }

  function installFrameGuard(){
    if(state.frameGuard||typeof window.loop!=="function")return state.frameGuard;
    const guarded=function loopV141CrashContained(timestamp){
      const t=finite(timestamp)?Number(timestamp):performance.now();let dt=16,failed=false;
      try{
        const previous=finite(last)?Number(last):t-16;dt=Math.min(45,Math.max(0,t-previous||16));last=t;
        if(typeof damageFlash!=="undefined"&&damageFlash>0)damageFlash=Math.max(0,damageFlash-dt/500);
      }catch(error){failed=true;noteFault("frame-clock",error)}
      try{if(typeof update==="function")update(dt)}catch(error){failed=true;noteFault("update",error)}
      try{if(typeof render==="function")render()}catch(error){failed=true;noteFault("render",error)}
      if(!failed&&performance.now()-state.lastFaultAt>2500)state.faultBurst=0;
      const schedule=()=>{try{requestAnimationFrame(loop)}catch(error){safeConsole("error","[Lost Sizzler V10.41] RAF reschedule failed",error)}};
      if(state.faultBurst>=4&&performance.now()-state.lastFaultAt<2000)setTimeout(schedule,90);else schedule();
    };
    guarded.__ccgV141CrashContained=true;window.loop=guarded;state.frameGuard=true;return true;
  }

  function forceResumeFallback(){
    try{UI?.pause?.classList?.add("hidden")}catch(_){}
    try{if(typeof mode!=="undefined"&&mode==="paused")mode=(typeof pauseReturnMode!=="undefined"&&pauseReturnMode&&pauseReturnMode!=="paused")?pauseReturnMode:"playing"}catch(_){}
    try{if(typeof pauseReturnMode!=="undefined")pauseReturnMode="playing"}catch(_){}
    clearInputs();repairRuntime("resume");requestSafeResize();
    try{S?.setMusicLevel?.(.075)}catch(_){}
    return true;
  }
  function installPauseGuard(){
    if(state.pauseGuard||typeof window.closePauseMenu!=="function"||typeof window.openPauseMenu!=="function")return state.pauseGuard;
    const originalClose=window.closePauseMenu,originalOpen=window.openPauseMenu;
    window.closePauseMenu=function closePauseMenuV141StableResume(){
      clearInputs();repairRuntime("resume");let result=true;
      try{result=originalClose.apply(this,arguments)}catch(error){noteFault("pause-resume",error);result=forceResumeFallback()}
      resetFrameClock();clearCameras();requestSafeResize();
      try{if(runActive())document.getElementById("game")?.focus?.({preventScroll:true})}catch(_){}
      return result;
    };
    window.openPauseMenu=function openPauseMenuV141Stable(){
      clearInputs();resetFrameClock();
      try{return originalOpen.apply(this,arguments)}catch(error){noteFault("pause-open",error);try{if(typeof mode!=="undefined")mode="paused";UI?.pause?.classList?.remove("hidden")}catch(_){}return true}
    };
    if(typeof window.pause==="function"){
      const currentPause=window.pause;
      window.pause=function pauseV141Stable(){
        try{return currentPause.apply(this,arguments)}catch(error){noteFault("pause-toggle",error);return typeof mode!=="undefined"&&mode==="paused"?forceResumeFallback():false}
      };
    }
    state.pauseGuard=true;return true;
  }

  function roomCentre(room){return{x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.h/2)}}
  function insideRoom(room,x,y,pad=0){return Boolean(room&&x>=room.x+pad&&x<=room.x+room.w-pad&&y>=room.y+pad&&y<=room.y+room.h-pad)}
  function livePlayerFor(id){
    try{if(String(p1?.id)===String(id))return p1;return remote?.get?.(id)||null}catch(_){return null}
  }
  function hordePerimeter(room,index=0){
    const centre=roomCentre(room),minX=room.x+2,maxX=room.x+room.w-2,minY=room.y+2,maxY=room.y+room.h-2,side=index%4,spanX=Math.max(1,maxX-minX-4),spanY=Math.max(1,maxY-minY-4);
    if(side===0)return{x:minX,y:minY+2+(index*7)%spanY};if(side===1)return{x:maxX,y:minY+2+(index*7)%spanY};if(side===2)return{x:minX+2+(index*11)%spanX,y:minY};return{x:minX+2+(index*11)%spanX,y:maxY};
  }
  function compactHordeArena(){
    if(!hordeActive())return false;
    try{if(!world||!host||!p1||!window.CCG_CONFIG)return false}catch(_){return false}
    if(world._v141CompactHordeArena)return true;
    const C=window.CCG_CONFIG,maxW=Math.max(28,Number(C.worldWidth||128)-12),maxH=Math.max(24,Number(C.worldHeight||84)-12),w=Math.min(58,maxW),h=Math.min(38,maxH),x=Math.max(3,Math.floor((C.worldWidth-w)/2)),y=Math.max(3,Math.floor((C.worldHeight-h)/2));
    const previous=world.rooms?.[0]||{},room={...previous,id:0,x,y,w,h,theme:previous.theme||"IRON_KEEP",variant:Number(previous.variant||2),optional:false,sanctuary:false,hordeArena:true,compactHordeArena:true};
    const map=Array.from({length:C.worldHeight},()=>Array(C.worldWidth).fill(1));for(let yy=room.y;yy<=room.y+room.h;yy++)for(let xx=room.x;xx<=room.x+room.w;xx++)if(map[yy])map[yy][xx]=0;
    const centre=roomCentre(room);world.map=map;world.rooms=[room];world.start={...centre};world.startRoomId=0;world.exit={x:1,y:1};world.exitRoomId=-1;world.edges=[];world.decor=[];world.wallLights=[];world.doorFrameCells=[];world.tunnelY=-999;world._v135HordeArena=true;world._v141CompactHordeArena=true;window.__CCG_WORLD=world;
    host.doors=[];host.blockingDecor=[];host.worldRef=world;host.enteredRoomIds=[0];host.revision=(host.revision||0)+1;
    const active=activeSpecial(),entries=active?.state?.players||net?.getMembers?.()||[],spawns=[{x:centre.x-3,y:centre.y},{x:centre.x+3,y:centre.y},{x:centre.x,y:centre.y-3},{x:centre.x,y:centre.y+3}];
    if(entries.length){entries.forEach((entry,index)=>{const player=livePlayerFor(entry.id);if(!player)return;const q=spawns[index%spawns.length];player.x=q.x;player.y=q.y;player.rx=q.x;player.ry=q.y;if(active?.authoritative&&entry){entry.x=q.x;entry.y=q.y}})}else{const q=spawns[0];p1.x=q.x;p1.y=q.y;p1.rx=q.x;p1.ry=q.y}
    let enemyIndex=0;for(const enemy of host.enemies||[]){if(!enemy?.alive||!enemy.hordeEnemy)continue;if(!insideRoom(room,enemy.x,enemy.y,2)){const q=hordePerimeter(room,enemyIndex++);enemy.x=q.x;enemy.y=q.y;enemy._v135ArenaSpawned=true}}
    clearInputs();clearCameras();try{explored?.clear?.();reveal?.(p1);sync?.()}catch(_){}state.compactedHordeRuns++;
    safeConsole("info",`[Lost Sizzler V10.41] Horde arena compacted to ${w+1}×${h+1} walkable tiles for faster wave engagement.`);return true;
  }

  function otherPlayerAt(player,x,y){
    try{return (typeof allPlayers==="function"?allPlayers():[p1,...(remote?.values?.()||[])]).some(other=>other&&other!==player&&Number(other.health||1)>0&&other.x===x&&other.y===y)}catch(_){return false}
  }
  function validSpyStep(player,dx,dy){
    if(!spyActive()||!player||typeof mode==="undefined"||mode!=="playing"||!world?.map||!host||!window.CCGWorld)return null;
    if((player.hitStunMs||0)>0)return null;const nx=player.x+dx,ny=player.y+dy;if(dx&&dy){if(!window.CCGWorld.walkable(world.map,player.x+dx,player.y,host)||!window.CCGWorld.walkable(world.map,player.x,player.y+dy,host))return null}
    if(!window.CCGWorld.walkable(world.map,nx,ny,host)||otherPlayerAt(player,nx,ny))return null;return{x:nx,y:ny}
  }
  function installSpyMoveGuard(){
    if(state.moveGuard||typeof window.movePlayer!=="function")return state.moveGuard;
    const original=window.movePlayer;
    window.movePlayer=function movePlayerV141SpyFallback(player,dx,dy,dash=false){
      const ox=player?.x,oy=player?.y;let result;
      try{result=original.apply(this,arguments)}catch(error){if(!spyActive())throw error;noteFault("spy-move",error)}
      if(!spyActive()||!player||player.x!==ox||player.y!==oy||dash)return result;
      const step=validSpyStep(player,Number(dx)||0,Number(dy)||0);if(!step)return result;
      player.x=step.x;player.y=step.y;player.dir={x:Number(dx)||0,y:Number(dy)||0};if(!finite(player.rx))player.rx=ox;if(!finite(player.ry))player.ry=oy;
      try{reveal?.(player);markRoomVisit?.(player);rememberTrail?.(player);sync?.()}catch(_){}state.spyFallbackMoves++;return result;
    };
    state.moveGuard=true;return true;
  }
  function repairSpySpawn(){
    if(!spyActive()||!world?._v135SpyDoorMap||world._v141SpyMobilityGuard)return false;
    const players=[];try{if(p1)players.push(p1);for(const player of remote?.values?.()||[])if(player)players.push(player)}catch(_){}
    for(const player of players){repairPlayer(player);player.hitStunMs=0;const rid=window.CCGWorld?.roomAt?.(world,player.x,player.y),room=world.rooms?.[rid];if(!room)continue;
      const cardinal=[[1,0],[-1,0],[0,1],[0,-1]],open=cardinal.filter(([dx,dy])=>window.CCGWorld.walkable(world.map,player.x+dx,player.y+dy,host));
      if(open.length)continue;
      for(const [dx,dy] of cardinal){const nx=player.x+dx,ny=player.y+dy;if(!insideRoom(room,nx,ny,1))continue;world.map[ny][nx]=0;host.blockingDecor=(host.blockingDecor||[]).filter(item=>item.x!==nx||item.y!==ny)}
    }
    try{move1=0;move2=0;host.revision=(host.revision||0)+1}catch(_){}world._v141SpyMobilityGuard=true;return true;
  }

  function installSpecialGuard(){
    const api=window.CCGLostSizzlerSpecialModes;if(!api||api.__v141StabilityGameplayWrapped)return false;
    const originalStart=api.startOnline?.bind(api),originalStop=api.stop?.bind(api);
    if(originalStart)api.startOnline=function startOnlineV141StabilityGameplay(meta={}){const result=originalStart(meta);try{if(String(meta.roomMode||api.active?.type||"")==="horde-survivor")compactHordeArena();if(String(meta.roomMode||api.active?.type||"")==="sizzler-saboteurs")setTimeout(repairSpySpawn,0)}catch(error){noteFault("special-start",error)}return result};
    if(originalStop)api.stop=function stopV141StabilityGameplay(){const result=originalStop.apply(api,arguments);clearInputs();resetFrameClock();clearCameras();return result};
    api.__v141StabilityGameplayWrapped=true;state.specialGuard=true;return true;
  }

  function recoverFocus(){
    if(!runActive())return;state.focusRecoveries++;clearInputs();resetFrameClock();clearCameras();repairRuntime("focus");requestSafeResize();
    try{if(hordeActive())compactHordeArena();if(spyActive())repairSpySpawn()}catch(_){}
  }
  addEventListener("focus",recoverFocus,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)recoverFocus();else clearInputs()},{passive:true});
  document.addEventListener("fullscreenchange",()=>{resetFrameClock();clearCameras();requestSafeResize()},{passive:true});
  addEventListener("pageshow",recoverFocus,{passive:true});

  function install(){
    installFrameGuard();installPauseGuard();installSpyMoveGuard();installSpecialGuard();
    try{if(hordeActive())compactHordeArena();if(spyActive())repairSpySpawn()}catch(error){noteFault("special-repair",error)}
    return state.frameGuard&&state.pauseGuard&&state.moveGuard;
  }
  install();state.timer=setInterval(install,120);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);removeEventListener("focus",recoverFocus);removeEventListener("pageshow",recoverFocus)},{once:true});
  window.CCGLostSizzlerV141BrowserStabilityGameplay={install,compactHordeArena,repairSpySpawn,recoverFocus,get state(){return state}};
})();
