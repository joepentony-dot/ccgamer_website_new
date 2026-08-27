/* The Lost Sizzler V10.41 — Horde isolation guard.
 * Horde owns its arena, objectives and announcements. Both Solo Horde and
 * Horde Multiplayer must remain independent of ordinary dungeon systems.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_HORDE_MODE_SAFETY__)return;
  window.__CCG_LOST_SIZZLER_V141_HORDE_MODE_SAFETY__=true;

  const state={installed:false,updateWrapped:false,voiceWrapped:false,toastWrapped:false,wasHorde:false,timer:0,purges:0,lastPurgeAt:0,arenaLayouts:0,arenaLayoutRejects:0,lastArenaLayoutAt:0};
  const active=()=>window.CCGLostSizzlerSpecialModes?.active||null;
  const isHorde=()=>{
    try{return active()?.type==="horde-survivor"||document.body?.dataset?.specialMode==="horde-survivor"}catch(_){return false}
  };

  const dungeonOnlyText=value=>/DUNGEON BOUNTY|BOUNTY START|BOUNTY COMPLETE|DUNGEON BONUS|FLOOR MUTATION|DEATH STALKER|COUNT LOADULA|SANCTUARY|SIGIL LOCKDOWN|ARENA LOCKDOWN|TIMED CHAMBER|BANISHMENT READY|SECRET TRADER|WANDERING MERCHANT/i.test(String(value||""));

  function hideDungeonNotifications(){
    if(!isHorde())return false;
    const pickup=document.getElementById("pickup-toast"),pickupTitle=document.getElementById("pickup-title")?.textContent||"";
    if(pickup&&dungeonOnlyText(pickupTitle))pickup.classList.remove("show");
    const major=document.getElementById("ccg-major-notification"),majorTitle=major?.querySelector?.(".major-copy b")?.textContent||"";
    if(major&&dungeonOnlyText(majorTitle)){
      major.dataset.visible="false";
      document.body?.removeAttribute?.("data-ccg-major-notification");
    }
    return true;
  }

  function purgeSanctuaryState(){
    if(!isHorde())return false;
    let changed=false;
    if(typeof world!=="undefined"&&world){
      for(const room of world.rooms||[]){
        if(room?.sanctuary){room.sanctuary=false;changed=true}
        if(room?.goldenRoom){room.goldenRoom=false;changed=true}
        if(room?.developerRoom){room.developerRoom=false;changed=true}
      }
      if(Array.isArray(world.decor)){
        const before=world.decor.length;
        world.decor=world.decor.filter(row=>!/^sanctuary/i.test(String(row?.type||"")));
        changed=changed||world.decor.length!==before;
      }
    }
    if(typeof host!=="undefined"&&host){
      if((host.sanctuaryRegeneration||[]).length){host.sanctuaryRegeneration=[];changed=true}
      if((host.sanctuaryScenes||[]).length){host.sanctuaryScenes=[];changed=true}
      if(Array.isArray(host.blockingDecor)){
        const before=host.blockingDecor.length;
        host.blockingDecor=host.blockingDecor.filter(row=>!/^sanctuary/i.test(String(row?.type||"")));
        changed=changed||host.blockingDecor.length!==before;
      }
      if(changed)host.revision=(host.revision||0)+1;
    }
    return changed;
  }

  function purgeRareDungeonState(){
    if(!isHorde())return false;
    let changed=false;
    const rare=window.CCGLostSizzlerRareEvents?.state;
    if(rare){
      if(rare.bounty){rare.bounty=null;changed=true}
      if(rare.mutation){rare.mutation=null;changed=true}
      if(rare.golden){rare.golden=null;changed=true}
      if(rare.hintTarget){rare.hintTarget=null;changed=true}
      if(Number(rare.hintMarkerUntil||0)!==0){rare.hintMarkerUntil=0;changed=true}
      if(rare.plans&&Object.keys(rare.plans).length){rare.plans={};changed=true}
    }
    try{
      if(typeof run!=="undefined"&&run){
        if(run.rareMutation){run.rareMutation="";changed=true}
        if(run.dungeonBounty){run.dungeonBounty=null;changed=true}
        if(run.activeBounty){run.activeBounty=null;changed=true}
      }
    }catch(_){}
    return changed;
  }

  function purgeHostDungeonObjects(){
    if(!isHorde()||typeof host==="undefined"||!host)return false;
    let changed=false;
    const empty=name=>{
      if(Array.isArray(host[name])&&host[name].length){host[name]=[];changed=true}
    };
    for(const name of ["items","chests","shrines","switches","shops","deathCaches","generators","traps","hazardRooms","timedRooms"])empty(name);
    for(const name of ["trader","startShop","stalker","gildedElf","rescue","memoryPuzzle","sequenceTorchPuzzle","weightBridge","spiderNest","skeletonHorde"]){
      if(host[name]){host[name]=null;changed=true}
    }
    if(Array.isArray(host.enemies)){
      const before=host.enemies.length;
      host.enemies=host.enemies.filter(enemy=>enemy?.hordeEnemy||enemy?.hordeWarden||enemy?._hordeModelId||enemy?._v138Reserve);
      changed=changed||host.enemies.length!==before;
    }
    if(changed)host.revision=(host.revision||0)+1;
    return changed;
  }

  function purgeDungeonRuntime(){
    if(!isHorde())return false;
    const changed=Boolean(purgeRareDungeonState()|purgeSanctuaryState()|purgeHostDungeonObjects());
    hideDungeonNotifications();
    state.lastPurgeAt=performance.now();
    if(changed)state.purges++;
    return changed;
  }

  function roomCentre(room){return{x:Math.round(room.x+room.w/2),y:Math.round(room.y+room.h/2)}}
  function insideRoom(room,x,y,margin=0){return x>=room.x+margin&&x<=room.x+room.w-margin&&y>=room.y+margin&&y<=room.y+room.h-margin}
  function floorAt(map,x,y){return Boolean(Array.isArray(map?.[y])&&map[y][x]===0)}
  function currentHordePlayers(){
    const players=[];
    try{if(typeof p1!=="undefined"&&p1)players.push(p1)}catch(_){}
    try{if(typeof p2!=="undefined"&&p2)players.push(p2)}catch(_){}
    try{for(const player of remote?.values?.()||[])if(player)players.push(player)}catch(_){}
    return players
  }
  function actorInRect(players,x1,y1,x2,y2){return players.some(player=>Number.isFinite(Number(player?.x))&&Number.isFinite(Number(player?.y))&&player.x>=x1&&player.x<=x2&&player.y>=y1&&player.y<=y2)}
  function paintRect(map,room,x1,y1,x2,y2,value,players=[]){
    const minX=Math.max(room.x+1,Math.min(x1,x2)),maxX=Math.min(room.x+room.w-1,Math.max(x1,x2)),minY=Math.max(room.y+1,Math.min(y1,y2)),maxY=Math.min(room.y+room.h-1,Math.max(y1,y2));
    if(minX>maxX||minY>maxY)return false;
    if(value===1&&actorInRect(players,minX,minY,maxX,maxY))return false;
    for(let yy=minY;yy<=maxY;yy++)for(let xx=minX;xx<=maxX;xx++)if(map[yy])map[yy][xx]=value;
    return true
  }
  function openArenaLanes(map,room){
    const centre=roomCentre(room),margin=4;
    for(let yy=room.y;yy<=room.y+room.h;yy++)for(let xx=room.x;xx<=room.x+room.w;xx++){
      if(!map[yy])continue;
      if(xx<room.x+margin||xx>room.x+room.w-margin||yy<room.y+margin||yy>room.y+room.h-margin)map[yy][xx]=0;
    }
    paintRect(map,room,room.x+2,centre.y-1,room.x+room.w-2,centre.y+1,0);
    paintRect(map,room,centre.x-1,room.y+2,centre.x+1,room.y+room.h-2,0);
    paintRect(map,room,centre.x-5,centre.y-4,centre.x+5,centre.y+4,0);
  }
  function arenaConnected(map,room){
    const centre=roomCentre(room);if(!floorAt(map,centre.x,centre.y))return false;
    const open=[];for(let yy=room.y;yy<=room.y+room.h;yy++)for(let xx=room.x;xx<=room.x+room.w;xx++)if(floorAt(map,xx,yy))open.push(`${xx},${yy}`);
    const pending=[[centre.x,centre.y]],seen=new Set([`${centre.x},${centre.y}`]);
    while(pending.length){
      const [x,y]=pending.shift();
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;
        if(seen.has(key)||!insideRoom(room,nx,ny)||!floorAt(map,nx,ny))continue;
        seen.add(key);pending.push([nx,ny]);
      }
    }
    return seen.size===open.length
  }
  function restoreMap(target,snapshot){for(let y=0;y<snapshot.length;y++)if(Array.isArray(snapshot[y]))target[y]=snapshot[y].slice()}
  function hordePerimeterCells(map,room){
    const cells=[],margin=3,minX=room.x+margin,maxX=room.x+room.w-margin,minY=room.y+margin,maxY=room.y+room.h-margin;
    for(let x=minX;x<=maxX;x++){if(floorAt(map,x,minY))cells.push({x,y:minY});if(floorAt(map,x,maxY))cells.push({x,y:maxY})}
    for(let y=minY+1;y<maxY;y++){if(floorAt(map,minX,y))cells.push({x:minX,y});if(floorAt(map,maxX,y))cells.push({x:maxX,y})}
    return cells
  }
  function relocateBlockedHordeEnemies(map,room){
    if(typeof host==="undefined"||!host||!Array.isArray(host.enemies))return 0;
    const perimeter=hordePerimeterCells(map,room);if(!perimeter.length)return 0;
    let moved=0,cursor=0;
    for(const enemy of host.enemies){
      if(!enemy?.alive||!(enemy.hordeEnemy||enemy.hordeWarden||enemy._hordeModelId||enemy._v138Reserve))continue;
      if(floorAt(map,Number(enemy.x),Number(enemy.y)))continue;
      const cell=perimeter[cursor++%perimeter.length];enemy.x=cell.x;enemy.y=cell.y;enemy._v141TraversalRelocated=true;moved++;
    }
    return moved
  }

  function shapeHordeArena(){
    if(!isHorde())return false;
    try{if(typeof world==="undefined"||!world?._v141CompactHordeArena||!Array.isArray(world.map)||!world.rooms?.[0])return false}catch(_){return false}
    if(world._v141TraversalHordeArena)return true;
    const room=world.rooms[0],map=world.map;
    if(!Number.isFinite(room.x)||!Number.isFinite(room.y)||!Number.isFinite(room.w)||!Number.isFinite(room.h)||room.w<28||room.h<24)return false;
    const snapshot=map.map(row=>Array.isArray(row)?row.slice():row),players=currentHordePlayers();
    const X=f=>room.x+Math.round(room.w*f),Y=f=>room.y+Math.round(room.h*f);
    const blocks=[
      [X(.16),Y(.18),X(.21),Y(.48)],
      [X(.16),Y(.62),X(.21),Y(.80)],
      [X(.31),Y(.16),X(.47),Y(.22)],
      [X(.40),Y(.31),X(.45),Y(.49)],
      [X(.66),Y(.18),X(.71),Y(.51)],
      [X(.57),Y(.68),X(.77),Y(.74)],
      [X(.29),Y(.70),X(.43),Y(.76)]
    ];
    let painted=0;for(const block of blocks)if(paintRect(map,room,...block,1,players))painted++;
    openArenaLanes(map,room);
    if(painted<4||!arenaConnected(map,room)){
      restoreMap(map,snapshot);state.arenaLayoutRejects++;return false
    }
    const relocated=relocateBlockedHordeEnemies(map,room);
    room.hordeTraversalArena=true;room.hordeTraversalBlocks=painted;world._v141TraversalHordeArena=true;
    try{if(typeof host!=="undefined"&&host){host.revision=(host.revision||0)+1;host.worldRef=world}}catch(_){}
    state.arenaLayouts++;state.lastArenaLayoutAt=performance.now();
    try{console.info(`[Lost Sizzler V10.41] Horde traversal arena installed with ${painted} internal wall groups${relocated?` and ${relocated} enemy relocations`:""}.`)}catch(_){}
    return true
  }

  function stopLegacyDungeonVoice(){
    const voice=window.CCGLostSizzlerVoice;if(!voice)return;
    try{voice.stop?.("horde-mode")}catch(_){}
    try{if(Array.isArray(voice.state?.queue))voice.state.queue.length=0}catch(_){}
    try{window.speechSynthesis?.cancel?.()}catch(_){}
  }

  function wrapLegacyVoice(){
    if(state.voiceWrapped)return true;
    const legacy=window.CCGLostSizzlerVoice;if(!legacy?.say||!legacy?.classifyToast)return false;
    window.CCGLostSizzlerVoice={
      say(key,...args){if(isHorde())return false;return legacy.say.call(legacy,key,...args)},
      stop(...args){return legacy.stop?.call(legacy,...args)},
      classifyToast(...args){if(isHorde())return"";return legacy.classifyToast.call(legacy,...args)},
      setEnabled(...args){return legacy.setEnabled?.call(legacy,...args)},
      get enabled(){return legacy.enabled},
      get state(){return legacy.state},
      lines:legacy.lines,
      bundledSprite:legacy.bundledSprite
    };
    state.voiceWrapped=true;
    return true;
  }

  function wrapToast(){
    if(state.toastWrapped||typeof window.showToast!=="function")return state.toastWrapped;
    const legacy=window.showToast;
    const wrapped=function showToastV141HordeIsolation(title){
      if(isHorde()&&dungeonOnlyText(title)){hideDungeonNotifications();return false}
      return legacy.apply(this,arguments)
    };
    wrapped.__ccgV141HordeIsolation=true;
    window.showToast=wrapped;
    state.toastWrapped=true;
    return true;
  }

  function transitionGuard(){
    const now=isHorde();
    if(now&&!state.wasHorde){
      stopLegacyDungeonVoice();
      purgeDungeonRuntime();
      shapeHordeArena();
      try{S?.setRoomMood?.("normal")}catch(_){}
    }
    state.wasHorde=now;
  }

  function install(){
    wrapLegacyVoice();
    wrapToast();
    if(state.installed)return true;
    // Phase 3: this safety layer no longer sits in every shared update() call.
    // The lightweight scheduler below performs Horde-only transition/purge work,
    // while Dungeon Solo and the other controllers never enter a Horde wrapper.
    state.updateWrapped=false;
    state.installed=true;
    return true;
  }

  state.timer=setInterval(()=>{
    wrapLegacyVoice();wrapToast();transitionGuard();
    if(isHorde())purgeDungeonRuntime();
    if(isHorde())shapeHordeArena();
    install();
  },90);
  transitionGuard();install();
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});
  window.CCGLostSizzlerHordeModeSafety={purgeSanctuaryState,purgeRareDungeonState,purgeHostDungeonObjects,purgeDungeonRuntime,shapeHordeArena,arenaConnected,transitionGuard,isHorde,get state(){return state}};
})();