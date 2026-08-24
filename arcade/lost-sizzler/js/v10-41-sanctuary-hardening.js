/* The Lost Sizzler V10.41 — sanctuary challenge/progression hardening. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_SANCTUARY_HARDENING__)return;
  window.__CCG_LOST_SIZZLER_V141_SANCTUARY_HARDENING__=true;

  const state={installed:false,startWrapped:false,updateWrapped:false,arenaWrapped:false,timedWrapped:false,doorWrapped:false,lastSweep:0,released:0,removedChallenges:0};

  const sanctuaryIds=()=>new Set((world?.rooms||[]).filter(room=>room?.sanctuary).map(room=>Number(room.id)));
  const roomById=id=>(world?.rooms||[]).find(room=>Number(room?.id)===Number(id))||null;
  const isSanctuaryRoomId=id=>Boolean(roomById(id)?.sanctuary);

  function adjacentSanctuary(x,y){
    if(!world)return false;
    const points=[[0,0],[1,0],[-1,0],[0,1],[0,-1]];
    for(const [dx,dy] of points){
      try{
        const id=W.roomAt?.(world,Number(x)+dx,Number(y)+dy);
        if(id!=null&&id>=0&&isSanctuaryRoomId(id))return true;
      }catch(_){}
    }
    return false;
  }

  function sanctuaryDoor(door,ids=sanctuaryIds()){
    if(!door||door.type==="secret"||door.sigilGate||door.sigilAnnex)return false;
    return ids.has(Number(door.roomId))||adjacentSanctuary(door.x,door.y);
  }

  function releaseDoorGroup(door,ids){
    if(!door||!host)return 0;
    const leaves=door.groupId?(host.doors||[]).filter(item=>item.groupId===door.groupId):[door];
    let changed=0;
    for(const leaf of leaves){
      if(!sanctuaryDoor(leaf,ids)&&!sanctuaryDoor(door,ids))continue;
      const wasBlocked=Boolean(leaf.locked||leaf.opening||!leaf.open);
      leaf.locked=false;
      leaf.open=true;
      leaf.opening=false;
      leaf.openingStart=0;
      leaf.openAt=0;
      leaf.openSoundDone=true;
      leaf.sanctuarySafeDoor=true;
      if(wasBlocked)changed++;
    }
    if(changed){host.revision=(host.revision||0)+1;state.released+=changed}
    return changed;
  }

  function stripSanctuaryChallenges(){
    if(!world||!host)return{removed:0,released:0};
    const ids=sanctuaryIds();
    if(!ids.size)return{removed:0,released:0};
    let removed=0,released=0;

    for(const key of ["arenas","timedRooms"]){
      if(!Array.isArray(host[key]))continue;
      const before=host[key].length;
      host[key]=host[key].filter(challenge=>!ids.has(Number(challenge?.roomId)));
      removed+=before-host[key].length;
    }

    for(const room of world.rooms||[]){
      if(!room?.sanctuary)continue;
      room.dangerous=false;
      room.arenaRoom=false;
      room.timedRoom=false;
      room.challengeRoom=false;
    }

    for(const door of host.doors||[]){
      if(door.type!=="room"||!sanctuaryDoor(door,ids))continue;
      released+=releaseDoorGroup(door,ids);
    }

    if(removed){
      state.removedChallenges+=removed;
      host.revision=(host.revision||0)+1;
      try{broadcastWorld?.()}catch(_){}
    }
    return{removed,released};
  }

  function sanctuaryPlayer(player){
    if(!player||!world)return false;
    try{return Boolean(roomById(W.roomAt(world,player.x,player.y))?.sanctuary)}catch(_){return false}
  }

  function installStartGuard(){
    if(state.startWrapped||typeof startWorld!=="function")return state.startWrapped;
    const original=startWorld;
    startWorld=function startWorldV141SanctuaryHardening(){
      const result=original.apply(this,arguments);
      try{stripSanctuaryChallenges()}catch(error){console.warn("[Lost Sizzler V10.41] sanctuary floor hardening failed safely",error)}
      return result;
    };
    state.startWrapped=true;
    return true;
  }

  function installArenaGuard(){
    if(state.arenaWrapped||typeof triggerArena!=="function")return state.arenaWrapped;
    const original=triggerArena;
    triggerArena=function triggerArenaV141SanctuaryGuard(player){
      if(sanctuaryPlayer(player)){
        stripSanctuaryChallenges();
        return;
      }
      return original.apply(this,arguments);
    };
    state.arenaWrapped=true;
    return true;
  }

  function installTimedGuard(){
    if(state.timedWrapped||typeof triggerTimed!=="function")return state.timedWrapped;
    const original=triggerTimed;
    triggerTimed=function triggerTimedV141SanctuaryGuard(player){
      if(sanctuaryPlayer(player)){
        stripSanctuaryChallenges();
        return;
      }
      return original.apply(this,arguments);
    };
    state.timedWrapped=true;
    return true;
  }

  function installDoorFailSafe(){
    if(state.doorWrapped||typeof tryDoor!=="function")return state.doorWrapped;
    const original=tryDoor;
    tryDoor=function tryDoorV141SanctuaryFailSafe(player,x,y){
      const door=host&&W?.doorAt?.(host,x,y);
      if(door&&door.type==="room"&&sanctuaryDoor(door)){
        const changed=releaseDoorGroup(door,sanctuaryIds());
        if(changed){
          try{showToast("SANCTUARY EXIT RELEASED","Sanctuary doors can never be sealed by dungeon challenges.","green",4200)}catch(_){}
          try{broadcastWorld?.()}catch(_){}
        }
        return true;
      }
      return original.apply(this,arguments);
    };
    state.doorWrapped=true;
    return true;
  }

  function installUpdateSweep(){
    if(state.updateWrapped||typeof update!=="function")return state.updateWrapped;
    const original=update;
    update=function updateV141SanctuaryHardening(dt){
      const result=original.apply(this,arguments);
      const now=performance.now();
      if(now-state.lastSweep>=450){
        state.lastSweep=now;
        try{stripSanctuaryChallenges()}catch(_){}
      }
      return result;
    };
    state.updateWrapped=true;
    return true;
  }

  function install(){
    const ready=installStartGuard()&&installArenaGuard()&&installTimedGuard()&&installDoorFailSafe()&&installUpdateSweep();
    if(ready){
      state.installed=true;
      try{stripSanctuaryChallenges()}catch(_){}
      document.body.dataset.v141SanctuaryHardening="true";
    }
    return ready;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(install()||attempts>240)clearInterval(timer);
  },100);
  install();
  window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
  window.CCGLostSizzlerSanctuaryHardeningV141={state,stripSanctuaryChallenges,releaseDoorGroup,install};
})();