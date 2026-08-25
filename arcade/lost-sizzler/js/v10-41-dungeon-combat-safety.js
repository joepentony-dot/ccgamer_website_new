/* The Lost Sizzler V10.41 — named-enemy room cap and controlled timed-room waves. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_DUNGEON_COMBAT_SAFETY__)return;
  window.__CCG_LOST_SIZZLER_V141_DUNGEON_COMBAT_SAFETY__=true;

  const TIMED_DURATION_MS=30000;
  const TIMED_WAVE_SIZE=3;
  const state={worldWrapped:false,timedTriggerWrapped:false,timedUpdateWrapped:false,sigilWrapped:false,lastNamedSweep:0};

  const W=window.CCGWorld;
  const SYS=window.CCGSystems;
  const roomAt=(x,y)=>{try{return W?.roomAt?.(world,Number(x),Number(y))??-1}catch(_){return-1}};
  const isNamedEnemy=enemy=>Boolean(enemy?.alive&&(enemy.follower||enemy.championName||enemy.namedEnemy||enemy.ccgBoss));
  const hostile=enemy=>Boolean(enemy?.alive&&!enemy.passiveNpc&&!enemy.lostAdventurer&&!enemy.gildedElf);

  function floorCellFree(x,y,ignore=null){
    if(!world?.map?.[y]||world.map[y][x]!==0)return false;
    try{if(!W.walkable(world.map,x,y,host))return false}catch(_){return false}
    if((host?.blockingDecor||[]).some(item=>item?.x===x&&item?.y===y))return false;
    if((host?.enemies||[]).some(enemy=>enemy!==ignore&&enemy?.alive&&enemy.x===x&&enemy.y===y))return false;
    try{if((typeof allPlayers==="function"?allPlayers():[p1,p2].filter(Boolean)).some(player=>player?.x===x&&player?.y===y))return false}catch(_){}
    return true;
  }

  function roomCells(room,ignore=null){
    if(!room)return[];
    const cells=[];
    for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++)if(floorCellFree(x,y,ignore))cells.push({x,y});
    return cells;
  }

  function namedRoomCandidates(hostState,worldState,occupiedRooms){
    return (worldState?.rooms||[])
      .filter(room=>room&&!room.optional&&!room.sanctuary&&room.id!==worldState.startRoomId&&room.id!==worldState.exitRoomId&&!occupiedRooms.has(Number(room.id)))
      .sort((a,b)=>Number(b.depth||0)-Number(a.depth||0)||Number(a.id)-Number(b.id));
  }

  function relocateNamedEnemy(enemy,hostState=host,worldState=world,occupiedRooms=new Set()){
    if(!enemy||!hostState||!worldState)return false;
    for(const room of namedRoomCandidates(hostState,worldState,occupiedRooms)){
      const candidates=[];
      for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++){
        if(worldState.map?.[y]?.[x]!==0)continue;
        if((hostState.enemies||[]).some(other=>other!==enemy&&other?.alive&&other.x===x&&other.y===y))continue;
        candidates.push({x,y});
      }
      if(!candidates.length)continue;
      const pick=candidates[Math.abs(String(enemy.id||"").split("").reduce((n,ch)=>n+ch.charCodeAt(0),0))%candidates.length];
      enemy.x=pick.x;enemy.y=pick.y;enemy.rx=pick.x;enemy.ry=pick.y;
      occupiedRooms.add(Number(room.id));
      return true;
    }
    return false;
  }

  function softenDuplicateNamed(enemy){
    if(!enemy)return false;
    const floor=Math.max(1,Number(run?.floor||1));
    enemy._v141NamedRoomDowngraded=true;
    delete enemy.follower;
    delete enemy.championName;
    delete enemy.namedEnemy;
    enemy.ccgBoss=false;
    enemy.kind="hunter";
    const cap=5+floor*2;
    enemy.maxHp=Math.max(1,Math.min(Number(enemy.maxHp||enemy.hp||cap),cap));
    enemy.hp=Math.max(1,Math.min(Number(enemy.hp||enemy.maxHp),enemy.maxHp));
    enemy.maxArmor=Math.min(Number(enemy.maxArmor||enemy.armor||0),2+floor);
    enemy.armor=Math.min(Number(enemy.armor||0),enemy.maxArmor);
    return true;
  }

  function enforceOneNamedPerRoom(hostState=host,worldState=world,{relocate=true}={}){
    if(!hostState?.enemies||!worldState?.rooms)return 0;
    const occupied=new Set(),duplicates=[];
    for(const enemy of hostState.enemies){
      if(!isNamedEnemy(enemy))continue;
      const roomId=W.roomAt(worldState,enemy.x,enemy.y);
      if(roomId==null||roomId<0)continue;
      if(!occupied.has(Number(roomId))){occupied.add(Number(roomId));continue}
      duplicates.push(enemy);
    }
    let changed=0;
    for(const enemy of duplicates){
      if(relocate&&relocateNamedEnemy(enemy,hostState,worldState,occupied)){changed++;continue}
      if(softenDuplicateNamed(enemy))changed++;
    }
    if(changed&&hostState===host)host.revision=(host.revision||0)+1;
    return changed;
  }

  function installWorldNamedGuard(){
    if(state.worldWrapped||!W||typeof W.createHostState!=="function")return state.worldWrapped;
    const original=W.createHostState.bind(W);
    W.createHostState=function createHostStateV141OneNamedPerRoom(worldState){
      const hostState=original(worldState);
      try{enforceOneNamedPerRoom(hostState,worldState,{relocate:true})}catch(error){console.warn("[Lost Sizzler V10.41] initial named-enemy room cap failed safely",error)}
      return hostState;
    };
    state.worldWrapped=true;
    return true;
  }

  function installSigilNamedGuard(){
    if(state.sigilWrapped||typeof triggerSigilRoom!=="function")return state.sigilWrapped;
    const original=triggerSigilRoom;
    triggerSigilRoom=function triggerSigilRoomV141OneNamedPerRoom(){
      const result=original.apply(this,arguments);
      try{enforceOneNamedPerRoom(host,world,{relocate:false})}catch(error){console.warn("[Lost Sizzler V10.41] sigil named-enemy room cap failed safely",error)}
      return result;
    };
    state.sigilWrapped=true;
    return true;
  }

  function timedPlayers(t){
    try{return (typeof localPlayers==="function"?localPlayers():[p1,p2].filter(Boolean)).filter(player=>player&&roomAt(player.x,player.y)===Number(t.roomId))}catch(_){return[]}
  }

  function timedEnemies(t){return(host?.enemies||[]).filter(enemy=>enemy?.alive&&enemy._v141TimedRoomId===t.id)}

  function clearExistingTimedRoomHostiles(t){
    for(const enemy of host?.enemies||[]){
      if(!hostile(enemy)||roomAt(enemy.x,enemy.y)!==Number(t.roomId))continue;
      if(isNamedEnemy(enemy)){
        const occupied=new Set((host.enemies||[]).filter(isNamedEnemy).map(other=>roomAt(other.x,other.y)).filter(id=>id>=0));
        if(relocateNamedEnemy(enemy,host,world,occupied))continue;
      }
      enemy.alive=false;
      enemy._v141TimedRoomSuppressed=true;
    }
  }

  function timedSpawnCells(t,count=TIMED_WAVE_SIZE){
    const room=world?.rooms?.[Number(t.roomId)];
    if(!room)return[];
    const players=timedPlayers(t),cells=roomCells(room);
    cells.sort((a,b)=>{
      const da=players.length?Math.min(...players.map(player=>Math.abs(player.x-a.x)+Math.abs(player.y-a.y))):0;
      const db=players.length?Math.min(...players.map(player=>Math.abs(player.x-b.x)+Math.abs(player.y-b.y))):0;
      return db-da||a.y-b.y||a.x-b.x;
    });
    return cells.slice(0,count);
  }

  function spawnTimedWave(t){
    if(!t||t.cleared||Number(t.timeLeft||0)<=0)return 0;
    const existing=timedEnemies(t);
    if(existing.length)return existing.length;
    const players=timedPlayers(t),target=players[0]||p1,cells=timedSpawnCells(t,TIMED_WAVE_SIZE),floor=Math.max(1,Number(run?.floor||1));
    const kinds=["scout","ambusher","hunter"];
    t.wave=Math.max(1,Number(t.wave||1));
    t._v141WaveSpawned=true;
    t._v141WaveSerial=Math.max(0,Number(t._v141WaveSerial||0))+1;
    for(let i=0;i<Math.min(TIMED_WAVE_SIZE,cells.length);i++){
      const q=cells[i],kind=kinds[(t.wave+i-1)%kinds.length],hp=kind==="hunter"?4+floor:3+floor;
      host.enemies.push({
        id:`timed-${t.id}-w${t.wave}-${t._v141WaveSerial}-${i}-${Date.now()}`,
        ...q,
        kind,
        hp,
        maxHp:hp,
        alive:true,
        aiState:"chase",
        facing:{x:i%2?1:-1,y:0},
        lastSeen:target?{x:target.x,y:target.y}:null,
        memoryMs:999999,
        searchMs:0,
        moveCooldown:180+i*45,
        attackCooldown:520+i*70,
        chargeCooldown:900,
        healCooldown:999999,
        flash:0,
        hpBarMs:0,
        _v141TimedRoomId:t.id,
        _v141TimedWave:t.wave
      });
    }
    host.revision=(host.revision||0)+1;
    try{broadcastWorld?.()}catch(_){}
    return Math.min(TIMED_WAVE_SIZE,cells.length);
  }

  function healTimedPlayers(t){
    const players=timedPlayers(t);
    for(const player of players){
      player.health=Math.max(1,Number(player.maxHealth||player.health||1));
      player.hpBarMs=3000;
      try{floatText?.(player.x,player.y,"FULL HEALTH",P?.green||"#72ff9b")}catch(_){}
    }
    try{showToast("TIMED WAVE CLEARED","All three enemies defeated. Health fully restored — next wave incoming.","green",5200)}catch(_){}
    try{sync?.()}catch(_){}
  }

  function openTimedRoomDoors(t){
    try{SYS?.lockRoomDoors?.(host,t.roomId,false)}catch(_){}
    for(const door of host?.doors||[]){
      if(door.type!=="room"||Number(door.roomId)!==Number(t.roomId))continue;
      door.locked=false;
      try{if(typeof beginDoorOpening==="function")beginDoorOpening(door,650);else{door.open=true;door.opening=false}}catch(_){door.open=true;door.opening=false}
    }
    if(host)host.revision=(host.revision||0)+1;
  }

  function failTimedRoom(t){
    for(const enemy of timedEnemies(t)){enemy.alive=false;enemy._v141TimedExpired=true}
    t.triggered=false;t.cleared=false;t.timeLeft=TIMED_DURATION_MS;t.wave=0;t._v141WaveSpawned=false;
    openTimedRoomDoors(t);
    try{showToast("TIMED CHALLENGE FAILED","The chamber has reset. Re-enter when you are ready to face another three-enemy wave run.","red",6500)}catch(_){}
  }

  function completeTimedRoom(t,player){
    for(const enemy of timedEnemies(t)){enemy.alive=false;enemy._v141TimedExpired=true}
    t.cleared=true;t.timeLeft=0;t._v141WaveSpawned=false;
    openTimedRoomDoors(t);
    try{showToast("TIMED CHAMBER CLEARED","Thirty seconds survived. The doors are open and the Sizzler Survival Plate is yours.","green",7600)}catch(_){}
    try{if(player)applyLoot({kind:"armour",amount:3,rarity:"SIZZLER",name:"SIZZLER Survival Plate"},player)}catch(_){}
    try{broadcastWorld?.()}catch(_){}
  }

  function triggerTimedV141(player){
    if(!host||!world||!player)return false;
    const roomId=roomAt(player.x,player.y),room=world.rooms?.[roomId];
    if(room?.sanctuary)return false;
    for(const t of host.timedRooms||[]){
      if(t.triggered||t.cleared||Number(t.roomId)!==Number(roomId))continue;
      clearExistingTimedRoomHostiles(t);
      t.triggered=true;t.cleared=false;t.timeLeft=TIMED_DURATION_MS;t.wave=1;t.hunterId=null;t._v141WaveSpawned=false;t._v141WaveSerial=0;
      try{SYS?.lockRoomDoors?.(host,t.roomId,true)}catch(_){}
      spawnTimedWave(t);
      try{showToast("TIMED CHAMBER — WAVE 1","Doors sealed for 30 seconds. Defeat three enemies at a time. Clearing each wave fully restores your health before the next three arrive.","red",10000)}catch(_){}
      try{broadcastWorld?.()}catch(_){}
      return true;
    }
    return false;
  }

  function updateTimedV141(dt){
    if(!host||!world)return false;
    const elapsed=Math.max(0,Number(dt||0));
    for(const t of host.timedRooms||[]){
      if(!t.triggered||t.cleared)continue;
      const players=timedPlayers(t);
      if(!players.length){failTimedRoom(t);continue}
      t.timeLeft=Math.max(0,Number(t.timeLeft||0)-elapsed);
      const alive=timedEnemies(t);
      if(alive.length>TIMED_WAVE_SIZE){for(const enemy of alive.slice(TIMED_WAVE_SIZE)){enemy.alive=false;enemy._v141TimedOverflowRemoved=true}}
      if(t.timeLeft<=0){completeTimedRoom(t,players[0]);continue}
      if(!timedEnemies(t).length&&t._v141WaveSpawned){
        healTimedPlayers(t);
        t.wave=Math.max(1,Number(t.wave||1))+1;
        t._v141WaveSpawned=false;
        spawnTimedWave(t);
      }
    }
    return true;
  }

  function installTimedRuntime(){
    if(!state.timedTriggerWrapped&&typeof triggerTimed==="function"){
      triggerTimed=function triggerTimedV141ControlledWaves(player){return triggerTimedV141(player)};
      state.timedTriggerWrapped=true;
    }
    if(!state.timedUpdateWrapped&&typeof updateTimed==="function"){
      updateTimed=function updateTimedV141ControlledWaves(dt){return updateTimedV141(dt)};
      state.timedUpdateWrapped=true;
    }
    return state.timedTriggerWrapped&&state.timedUpdateWrapped;
  }

  function runtimeSweep(){
    const now=performance.now();
    if(now-state.lastNamedSweep>=250){state.lastNamedSweep=now;try{enforceOneNamedPerRoom(host,world,{relocate:false})}catch(_){}}
  }

  function installSweep(){
    if(window.__CCG_LOST_SIZZLER_V141_COMBAT_SWEEP__)return;
    window.__CCG_LOST_SIZZLER_V141_COMBAT_SWEEP__=setInterval(()=>{
      installWorldNamedGuard();installSigilNamedGuard();installTimedRuntime();
      if(document.body?.dataset?.runActive==="true")runtimeSweep();
    },120);
    window.addEventListener("pagehide",()=>clearInterval(window.__CCG_LOST_SIZZLER_V141_COMBAT_SWEEP__),{once:true});
  }

  installWorldNamedGuard();
  installSigilNamedGuard();
  installTimedRuntime();
  installSweep();
  document.body.dataset.v141DungeonCombatSafety="true";
  window.CCGLostSizzlerDungeonCombatSafetyV141={state,enforceOneNamedPerRoom,triggerTimedV141,updateTimedV141,spawnTimedWave};
})();
