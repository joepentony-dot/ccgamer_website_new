/* The Lost Sizzler V10.40 — consolidated run-integrity hardening.
 * Selectively ports the useful reliability work from the retired legacy-route
 * hardening branch into the canonical arcade runtime without replacing newer
 * V10.40 systems for audio, rendering, Weekly Vault, Horde or Spy Vs Spy.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V140_INTEGRITY_CONSOLIDATION__)return;
  window.__CCG_LOST_SIZZLER_V140_INTEGRITY_CONSOLIDATION__=true;

  const RUNTIME_BUILD="V10.40";
  const CHECKPOINT_SCHEMA=2;
  const INSTALL_MS=90;
  const PLAYER_GRACE_MS=1500;
  const TELEPORT_GRACE_MS=900;
  const START_GRACE_MS=900;
  const MIGRATION_WAIT_MS=900;
  const hostClaims=new Set();
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  const key=(x,y)=>`${x},${y}`;
  const state={installed:false,functionsWrapped:false,networkWrapped:false,checkpointWrapped:false,focusInstalled:false,auditTimer:0,installTimer:0,lastRevision:-1,migration:null};

  const P=()=>window.CCGProgression||null;
  const Config=()=>window.CCG_CONFIG||null;
  const normalDungeon=()=>!document.body?.dataset?.specialMode&&!run?.specialMode;
  const authoritative=()=>playMode!=="online"||Boolean(net?.isHost);
  const activeNormalRun=()=>typeof mode!=="undefined"&&mode==="playing"&&Boolean(world&&host&&p1)&&normalDungeon();

  function doorAt(x,y){return (host?.doors||[]).find(door=>door?.x===x&&door?.y===y)||null}
  function traversable(x,y,{ignoreLockedDoors=false}={}){
    if(!world?.map?.[y]||world.map[y][x]!==0)return false;
    if((host?.blockingDecor||[]).some(row=>!row?.destroyed&&row.x===x&&row.y===y))return false;
    const door=doorAt(x,y);
    if(!door)return true;
    if(door.locked&&!ignoreLockedDoors)return false;
    return true;
  }

  function reachableFrom(start,opts={}){
    const seen=new Set();
    if(!start)return seen;
    const sx=Math.round(Number(start.x)),sy=Math.round(Number(start.y));
    if(!traversable(sx,sy,opts))return seen;
    const queue=[{x:sx,y:sy}];seen.add(key(sx,sy));
    for(let i=0;i<queue.length;i++){
      const cell=queue[i];
      for(const [dx,dy] of dirs){
        const x=cell.x+dx,y=cell.y+dy,k=key(x,y);
        if(seen.has(k)||!traversable(x,y,opts))continue;
        seen.add(k);queue.push({x,y});
      }
    }
    return seen;
  }

  function reachableFromPlayers(){
    const seen=new Set();
    let players=[];
    try{players=typeof allPlayers==="function"?allPlayers():[p1,p2].filter(Boolean)}catch(_){players=[p1,p2].filter(Boolean)}
    for(const player of players){
      if(!player||Number(player.health||0)<=0)continue;
      for(const cell of reachableFrom(player))seen.add(cell);
    }
    if(!seen.size&&world?.start)for(const cell of reachableFrom(world.start))seen.add(cell);
    return seen;
  }

  function targetReachable(target,seen){
    if(!target||!seen?.size)return false;
    const x=Math.round(Number(target.x)),y=Math.round(Number(target.y));
    return seen.has(key(x,y))||dirs.some(([dx,dy])=>seen.has(key(x+dx,y+dy)));
  }

  function activeChallengeLock(){
    if(host?.sigilLockdown)return true;
    if((host?.arenas||[]).some(arena=>arena?.triggered&&!arena?.cleared))return true;
    if((host?.timedRooms||[]).some(room=>room?.triggered&&Number(room.timeLeft||0)>0&&!room?.cleared))return true;
    return false;
  }

  function objectiveTargets(){
    if(!host||!world)return[];
    if(host.exitSigilCollected||host.exitOpen)return world.exit?[world.exit]:[];
    const objective=host.objective||{};
    if(objective.complete){
      const sigils=(host.items||[]).filter(item=>item?.active&&item.kind==="exitSigil");
      if(sigils.length)return sigils;
      const room=world.rooms?.[host.sigilRoomId];
      if(room)return[{x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.h/2)}];
      return[];
    }
    if(objective.type==="keys")return (host.items||[]).filter(item=>item?.active&&item.kind==="key");
    if(objective.type==="generators")return (host.generators||[]).filter(generator=>generator?.active!==false&&!generator?.destroyed);
    if(objective.type==="rescue"&&host.rescue&&!host.rescue.rescued)return[host.rescue];
    if(["guardian","explore_guardian"].includes(objective.type))return (host.enemies||[]).filter(enemy=>enemy?.alive&&(enemy.guardian||enemy.exitWarden));
    return[];
  }

  function doorSides(leaves){
    const first=leaves?.[0];if(!first)return[[],[]];
    const offsets=first.orientation==="horizontal"?[[0,-1],[0,1]]:[[-1,0],[1,0]];
    return offsets.map(([dx,dy])=>leaves.map(leaf=>({x:leaf.x+dx,y:leaf.y+dy})));
  }

  function bridgeDoorFor(reachable){
    const groups=new Map();
    for(const door of host?.doors||[]){
      if(door?.type!=="room"||!door.locked||door.sigilGate)continue;
      const id=door.groupId||door.id||key(door.x,door.y);
      if(!groups.has(id))groups.set(id,[]);
      groups.get(id).push(door);
    }
    for(const leaves of groups.values()){
      const [a,b]=doorSides(leaves);
      const aReach=a.some(cell=>reachable.has(key(cell.x,cell.y)));
      const bReach=b.some(cell=>reachable.has(key(cell.x,cell.y)));
      const aPossible=a.some(cell=>traversable(cell.x,cell.y,{ignoreLockedDoors:true}));
      const bPossible=b.some(cell=>traversable(cell.x,cell.y,{ignoreLockedDoors:true}));
      if((aReach&&!bReach&&bPossible)||(bReach&&!aReach&&aPossible))return leaves[0];
    }
    return null;
  }

  function reopenDoorGroup(door){
    if(!door)return false;
    const leaves=door.groupId?(host.doors||[]).filter(row=>row.groupId===door.groupId):[door];
    let changed=false;
    for(const leaf of leaves){
      if(!leaf||leaf.type!=="room"||leaf.sigilGate)continue;
      if(leaf.locked||!leaf.open||leaf.opening){changed=true;leaf.locked=false;leaf.open=true;leaf.opening=false;leaf.openAt=0;leaf.openingStart=0;leaf.openSoundDone=true}
    }
    return changed;
  }

  function validateCriticalRoute(reason="a dungeon state change",force=false){
    if(!activeNormalRun()||!authoritative())return true;
    if(activeChallengeLock()&&!force)return true;
    const targets=objectiveTargets();
    if(!targets.length)return true;
    let reachable=reachableFromPlayers();
    if(targets.some(target=>targetReachable(target,reachable)))return true;
    let opened=0;
    while(opened<4){
      const door=bridgeDoorFor(reachable);if(!door)break;
      if(!reopenDoorGroup(door))break;
      opened++;reachable=reachableFromPlayers();
      if(targets.some(target=>targetReachable(target,reachable)))break;
    }
    if(opened){
      host.revision=(Number(host.revision)||0)+1;
      try{S?.sfx?.("dooropen")}catch(_){}
      try{broadcastWorld?.()}catch(_){}
      try{showToast?.("ROUTE RECOVERY",`${opened} stale challenge door${opened===1?"":"s"} reopened after ${reason}. The required objective route is available again.`,"gold",8200)}catch(_){}
    }
    return targets.some(target=>targetReachable(target,reachable));
  }

  function hazardCell(x,y){return (host?.hazardRooms||[]).some(room=>(room?.cells||[]).some(cell=>cell?.x===x&&cell?.y===y))}
  function dangerousTile(x,y,ignorePlayer=null){
    if(!traversable(x,y))return true;
    if((host?.enemies||[]).some(enemy=>enemy?.alive&&enemy.x===x&&enemy.y===y))return true;
    if((host?.traps||[]).some(trap=>trap?.active&&trap.x===x&&trap.y===y))return true;
    if(hazardCell(x,y))return true;
    if((host?.doors||[]).some(door=>door?.x===x&&door?.y===y))return true;
    if(ignorePlayer){
      try{if((typeof allPlayers==="function"?allPlayers():[]).some(player=>player&&player!==ignorePlayer&&Number(player.health||0)>0&&player.x===x&&player.y===y))return true}catch(_){}
    }
    return false;
  }

  function nearestSafe(origin,maxRadius=14,allowed=null,ignorePlayer=null){
    if(!origin)return null;
    const ox=Math.round(Number(origin.x)),oy=Math.round(Number(origin.y));
    const valid=(x,y)=>!dangerousTile(x,y,ignorePlayer)&&(!allowed||allowed.has(key(x,y)));
    if(valid(ox,oy))return{x:ox,y:oy};
    for(let radius=1;radius<=maxRadius;radius++){
      for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
        if(Math.abs(dx)+Math.abs(dy)!==radius)continue;
        const x=ox+dx,y=oy+dy;if(valid(x,y))return{x,y};
      }
    }
    return null;
  }

  function secureDeathCaches(){
    if(!activeNormalRun()||!authoritative()||activeChallengeLock()||!Array.isArray(host?.deathCaches)||!host.deathCaches.length)return 0;
    const reachable=reachableFromPlayers();if(!reachable.size)return 0;
    let moved=0;
    for(const cache of host.deathCaches){
      if(!cache?.active)continue;
      const x=Math.round(Number(cache.x)),y=Math.round(Number(cache.y));
      if(reachable.has(key(x,y))&&!dangerousTile(x,y))continue;
      const safe=nearestSafe({x,y},18,reachable)||nearestSafe(world.start,18,reachable);
      if(!safe)continue;
      cache.x=safe.x;cache.y=safe.y;moved++;
    }
    if(moved){
      host.revision=(Number(host.revision)||0)+1;
      try{broadcastWorld?.()}catch(_){}
      try{showToast?.("DEATH CACHE RECOVERED TO SAFE GROUND",`${moved} unreachable or hazardous death cache${moved===1?" was":"s were"} moved to the nearest reachable safe tile.`,"cyan",7600)}catch(_){}
    }
    return moved;
  }

  function securePlayerPosition(player,graceMs=PLAYER_GRACE_MS){
    if(!player||!world||!host)return false;
    const origin={x:Math.round(Number(player.x)),y:Math.round(Number(player.y))};
    let moved=false;
    if(dangerousTile(origin.x,origin.y,player)){
      const safe=nearestSafe(origin,12,null,player)||nearestSafe(world.start,18,null,player);
      if(safe){player.x=safe.x;player.y=safe.y;player.rx=safe.x;player.ry=safe.y;moved=true}
    }else{player.rx=Number.isFinite(Number(player.rx))?player.rx:origin.x;player.ry=Number.isFinite(Number(player.ry))?player.ry:origin.y}
    const grace=Math.max(0,Number(graceMs)||0);
    if(grace>0){player.invuln=Math.max(Number(player.invuln)||0,grace);player._v140IntegrityGraceUntil=performance.now()+grace}
    return moved;
  }

  function installFunctionHardening(){
    if(state.functionsWrapped)return true;
    if(typeof hurtPlayer!=="function"||typeof startWorld!=="function")return false;

    const originalHurt=hurtPlayer;
    hurtPlayer=function hurtPlayerV140Integrity(){
      if(!normalDungeon())return originalHurt.apply(this,arguments);
      const player=arguments[0],before=Number(run?.stats?.deaths||0),result=originalHurt.apply(this,arguments),after=Number(run?.stats?.deaths||0);
      if(player&&after>before&&mode==="playing"){
        securePlayerPosition(player,PLAYER_GRACE_MS);
        validateCriticalRoute("a player death");
        secureDeathCaches();
        try{sync?.()}catch(_){}
      }
      return result;
    };

    if(typeof useTeleport==="function"){
      const originalTeleport=useTeleport;
      useTeleport=function useTeleportV140Integrity(player){
        const before=player?key(player.x,player.y):"",result=originalTeleport.apply(this,arguments);
        if(normalDungeon()&&player&&key(player.x,player.y)!==before){securePlayerPosition(player,TELEPORT_GRACE_MS);validateCriticalRoute("teleportation");secureDeathCaches()}
        return result;
      };
    }

    if(typeof firePlayer==="function"){
      const originalFire=firePlayer;
      firePlayer=function firePlayerV140Integrity(player){
        if(player&&Number(player._v140IntegrityGraceUntil||0)>performance.now()){player._v140IntegrityGraceUntil=0;player.invuln=0}
        return originalFire.apply(this,arguments);
      };
    }

    const originalStartWorld=startWorld;
    startWorld=function startWorldV140Integrity(){
      hostClaims.clear();
      const result=originalStartWorld.apply(this,arguments);
      setTimeout(()=>{
        if(!activeNormalRun())return;
        for(const player of [p1,p2].filter(Boolean))securePlayerPosition(player,START_GRACE_MS);
        validateCriticalRoute("floor generation");secureDeathCaches();
      },0);
      return result;
    };

    if(typeof descendFloor==="function"){
      const originalDescend=descendFloor;
      descendFloor=function descendFloorV140Integrity(){
        const result=originalDescend.apply(this,arguments);
        setTimeout(()=>{if(activeNormalRun()){validateCriticalRoute("floor descent");secureDeathCaches()}},0);
        return result;
      };
    }

    if(typeof onCollectRequest==="function"){
      const originalCollect=onCollectRequest;
      onCollectRequest=function onCollectRequestV140Integrity(request){
        if(!normalDungeon()||!net?.isHost)return originalCollect.apply(this,arguments);
        const id=String(request?.itemId||"");if(!id)return originalCollect.apply(this,arguments);
        if(hostClaims.has(id))return false;
        const item=host?.items?.find(row=>String(row?.id)===id&&row?.active);if(!item)return false;
        hostClaims.add(id);
        try{return originalCollect.apply(this,arguments)}finally{hostClaims.delete(id)}
      };
    }

    state.functionsWrapped=true;
    return true;
  }

  function installFocusPause(){
    if(state.focusInstalled)return true;
    let locked=false;
    const pauseForFocusLoss=()=>{
      if(locked||mode!=="playing"||playMode==="online")return;
      locked=true;
      try{input?.clear?.()}catch(_){}
      try{pause?.()}catch(_){}
      setTimeout(()=>{locked=false},300);
    };
    window.addEventListener("blur",pauseForFocusLoss);
    document.addEventListener("visibilitychange",()=>{if(document.hidden)pauseForFocusLoss()});
    state.focusInstalled=true;
    return true;
  }

  function runEnvelope(snapshot){
    if(!snapshot||typeof snapshot!=="object")return snapshot;
    snapshot._v106Run={
      floor:Number(run?.floor||1),deepest:Number(run?.deepest||run?.floor||1),difficulty:String(run?.difficulty||"ARCADE"),modifier:run?.modifier?{...run.modifier}:null,
      score:Math.max(0,Number(score||0)),seed:String(run?.seed||net?.roomCode||""),
      enemyDefeats:(run?.enemyDefeats||[]).map(row=>({...row,killers:(row.killers||[]).map(killer=>({...killer})),floors:(row.floors||[]).map(floor=>({...floor}))}))
    };
    return snapshot;
  }

  function currentMigrationSnapshot(){
    if(typeof serialWorld!=="function"||!host)return null;
    try{return runEnvelope(serialWorld())}catch(error){console.warn("[Lost Sizzler V10.40] migration snapshot failed",error);return null}
  }

  function beginMigration(){
    if(!activeNormalRun()||playMode!=="online"||!net?.isHost)return;
    const snapshot=currentMigrationSnapshot(),epoch=`${net.sessionId}-${Date.now()}`;
    state.migration={epoch,target:String(net.sessionId),candidates:snapshot?[{revision:Number(snapshot.revision||0),state:snapshot,local:true}]:[]};
    try{showToast?.("HOST MIGRATION CHECK","Checking the remaining browsers for the freshest authoritative dungeon snapshot before continuing.","cyan",6200)}catch(_){}
    net.send("v140_migration_probe",{epoch,target:net.sessionId}).catch(()=>{});
    setTimeout(()=>finishMigration(epoch),MIGRATION_WAIT_MS);
  }

  function finishMigration(epoch){
    const migration=state.migration;if(!migration||migration.epoch!==epoch||!net?.isHost)return;
    state.migration=null;
    const candidates=migration.candidates.filter(row=>row?.state).sort((a,b)=>Number(b.revision||0)-Number(a.revision||0));
    const best=candidates[0],currentRevision=Number(host?.revision||0);
    if(best&&!best.local&&Number(best.revision||0)>currentRevision&&typeof onWorld==="function"){
      const wasHost=net.isHost;net.isHost=false;
      try{onWorld(best.state)}catch(error){console.warn("[Lost Sizzler V10.40] migration reconciliation failed",error)}finally{net.isHost=wasHost}
    }
    try{broadcastWorld?.()}catch(_){}
    try{showToast?.("HOST MIGRATION COMPLETE","The freshest available shared dungeon state is authoritative on the new host.","green",6200)}catch(_){}
  }

  function installNetworkHardening(){
    if(state.networkWrapped)return true;
    if(typeof net==="undefined"||!net?.cb||typeof net.send!=="function")return false;

    const originalPresence=typeof net.presenceMember==="function"?net.presenceMember.bind(net):null;
    if(originalPresence)net.presenceMember=function presenceMemberV140(){return{...originalPresence(),build:RUNTIME_BUILD}};

    const originalSend=net.send.bind(net);
    net.send=function sendV140Integrity(event,payload){
      let next=payload;
      if(payload&&typeof payload==="object"&&(event==="hello"||event==="v106_lobby_start"||Object.prototype.hasOwnProperty.call(payload,"build")))next={...payload,build:RUNTIME_BUILD};
      return originalSend(event,next);
    };

    const originalMembers=net.cb.onMembers;
    net.cb.onMembers=function onMembersV140Integrity(rows,isHost,changed){
      const result=originalMembers?.(rows,isHost,changed);
      if(changed&&isHost&&activeNormalRun()&&playMode==="online")beginMigration();
      return result;
    };

    const originalPacket=net.cb.onPacket;
    net.cb.onPacket=function onPacketV140Integrity(event,payload){
      if(event==="v140_migration_probe"&&activeNormalRun()&&playMode==="online"&&!net.isHost&&payload?.target){
        const snapshot=currentMigrationSnapshot();
        if(snapshot)net.send("v140_migration_snapshot",{epoch:payload.epoch,target:payload.target,source:net.sessionId,revision:Number(snapshot.revision||0),state:snapshot}).catch(()=>{});
        return;
      }
      if(event==="v140_migration_snapshot"&&net.isHost&&state.migration&&payload?.epoch===state.migration.epoch&&payload?.target===net.sessionId){
        state.migration.candidates.push({revision:Number(payload.revision||0),state:payload.state||null,source:payload.source||"peer"});
        return;
      }
      return originalPacket?.(event,payload);
    };

    try{if(net.connected)net.publishPresence?.()}catch(_){}
    state.networkWrapped=true;
    return true;
  }

  function validateCheckpoint(data){
    const cfg=Config(),floor=Number(data?.floor??data?.run?.floor);
    return Boolean(
      data&&data.version==="V10.3"&&data.run&&data.player&&
      Number.isInteger(floor)&&floor>=1&&floor<=Number(cfg?.maxFloors||5)&&
      Array.isArray(data.player.inventory||[])&&
      (!data.player2||Array.isArray(data.player2.inventory||[]))&&
      (!data.schemaVersion||Number(data.schemaVersion)<=CHECKPOINT_SCHEMA)
    );
  }

  function installCheckpointHardening(){
    if(state.checkpointWrapped)return true;
    const progression=P();if(!progression?.makeCheckpoint||!progression?.saveCheckpointData||!progression?.loadCheckpoint)return false;
    const originalMake=progression.makeCheckpoint.bind(progression),originalSave=progression.saveCheckpointData.bind(progression),originalLoad=progression.loadCheckpoint.bind(progression);
    progression.makeCheckpoint=function makeCheckpointV140(){const data=originalMake(...arguments);if(data){data.schemaVersion=CHECKPOINT_SCHEMA;data.runtimeBuild=RUNTIME_BUILD}return data};
    progression.saveCheckpointData=function saveCheckpointDataV140(data){if(!validateCheckpoint(data))return false;data.schemaVersion=CHECKPOINT_SCHEMA;data.runtimeBuild=RUNTIME_BUILD;return originalSave(data)};
    progression.loadCheckpoint=function loadCheckpointV140(){
      const data=originalLoad();if(!data)return null;
      if(validateCheckpoint(data))return data;
      try{progression.clearCheckpoint?.()}catch(_){}
      const note=document.getElementById("menu-note");if(note)note.textContent="An incompatible older checkpoint was removed rather than risking a corrupted run.";
      return null;
    };
    progression.validateCheckpointV140=validateCheckpoint;
    state.checkpointWrapped=true;
    return true;
  }

  function enforceRuntimeLabel(){
    const published=document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"";
    const brand=document.querySelector(".brand p");if(brand)brand.textContent=`THE LOST SIZZLER — ${RUNTIME_BUILD}`;
    for(const badge of document.querySelectorAll(".build-badge"))if(!/UPDATE AVAILABLE/i.test(badge.textContent||"")){badge.textContent=`BUILD ${RUNTIME_BUILD}`;badge.title=published?`Runtime ${RUNTIME_BUILD} · published build ${published}`:`Runtime ${RUNTIME_BUILD}`}
  }

  function startAudit(){
    if(state.auditTimer)return;
    state.auditTimer=setInterval(()=>{
      if(!activeNormalRun()||!authoritative()||!host)return;
      const revision=Number(host.revision||0);if(revision===state.lastRevision)return;
      state.lastRevision=revision;
      try{validateCriticalRoute();secureDeathCaches()}catch(error){console.warn("[Lost Sizzler V10.40] integrity audit skipped safely",error)}
    },2400);
  }

  function install(){
    if(state.installed)return true;
    if(!window.CCGLostSizzlerV140?.state?.installed)return false;
    if(typeof mode==="undefined"||typeof playMode==="undefined"||typeof net==="undefined")return false;
    if(!installFunctionHardening()||!installNetworkHardening()||!installCheckpointHardening())return false;
    installFocusPause();enforceRuntimeLabel();startAudit();
    state.installed=true;document.body.dataset.v140Integrity="true";
    return true;
  }

  state.installTimer=setInterval(()=>{if(install()){clearInterval(state.installTimer);state.installTimer=0}},INSTALL_MS);
  install();
  window.addEventListener("pagehide",()=>{if(state.installTimer)clearInterval(state.installTimer);if(state.auditTimer)clearInterval(state.auditTimer)},{once:true});

  window.CCGLostSizzlerV140Integrity={
    RUNTIME_BUILD,CHECKPOINT_SCHEMA,reachableFrom,validateCriticalRoute,secureDeathCaches,securePlayerPosition,validateCheckpoint,enforceRuntimeLabel,get state(){return state}
  };
})();
