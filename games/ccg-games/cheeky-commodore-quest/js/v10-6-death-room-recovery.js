/* The Lost Sizzler — V10.6 sealed-room death recovery.
 *
 * Challenge rooms intentionally lock their ordinary room doors while the player
 * is inside. A normal death respawns the player at the floor start, so leaving
 * those same doors locked creates an unrecoverable soft-lock: the challenge is
 * still active but the player can no longer get back in to finish it.
 *
 * The Sigil lockdown already has its own bespoke death reset in game-play.js.
 * This layer handles every other challenge-sealed ordinary room door without
 * changing combat, enemy state, arena progress, objectives or death penalties.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_DEATH_ROOM_RECOVERY_V106__)return;
  window.__CCG_LOST_SIZZLER_DEATH_ROOM_RECOVERY_V106__=true;

  const originalHurtPlayer=typeof hurtPlayer==="function"?hurtPlayer:null;
  if(!originalHurtPlayer)return;

  function sealedRoomDoors(roomId){
    if(roomId==null||typeof host==="undefined"||!host)return[];
    return (host.doors||[]).filter(door=>door?.type==="room"&&door.roomId===roomId&&door.locked);
  }

  function releaseRoomAfterDeath(roomId){
    if(roomId==null||typeof host==="undefined"||!host)return false;
    if(host.sigilRoomId!=null&&roomId===host.sigilRoomId)return false;

    const roomDoors=(host.doors||[]).filter(door=>door?.type==="room"&&door.roomId===roomId);
    if(!roomDoors.length)return false;

    for(const door of roomDoors){
      door.locked=false;
      door.open=true;
      door.opening=false;
      door.openingStart=0;
      door.openAt=0;
      door.openSoundDone=true;
    }

    host.revision=(Number(host.revision)||0)+1;
    try{S?.sfx?.("dooropen")}catch(_){}
    try{broadcastWorld?.()}catch(_){}
    try{
      showToast(
        "CHALLENGE DOORS REOPENED",
        "The room you died in has been unlocked so you can return and finish the challenge.",
        "gold",
        8500
      );
    }catch(_){}
    return true;
  }

  hurtPlayer=function(){
    const player=arguments[0];
    const deathRoomId=(player&&typeof world!=="undefined"&&world&&typeof W!=="undefined")?W.roomAt(world,player.x,player.y):null;
    const lockedBefore=sealedRoomDoors(deathRoomId).length>0;
    const deathsBefore=Number(run?.stats?.deaths||0);
    const result=originalHurtPlayer.apply(this,arguments);
    const deathsAfter=Number(run?.stats?.deaths||0);

    // Weekly Dungeon deaths end the run instead of respawning, and game-over
    // deaths also leave playing mode. Only a real normal respawn needs this.
    if(lockedBefore&&deathsAfter>deathsBefore&&typeof mode!=="undefined"&&mode==="playing"){
      releaseRoomAfterDeath(deathRoomId);
    }
    return result;
  };

  window.CCGLostSizzlerDeathRoomRecoveryV106={releaseRoomAfterDeath};
})();
