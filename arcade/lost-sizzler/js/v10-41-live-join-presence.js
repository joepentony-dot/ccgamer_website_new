/* The Lost Sizzler V10.41 — persistent live-room late join hardening. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_LIVE_JOIN_PRESENCE__)return;
  window.__CCG_LOST_SIZZLER_V141_LIVE_JOIN_PRESENCE__=true;

  const state={installed:false,timer:0,lastPublished:"",lastConsumed:"",lastRoster:"",consumeAt:0};
  const members=()=>{try{return net?.getMembers?.()||[]}catch(_){return[]}};
  const activeSpecial=()=>window.CCGLostSizzlerSpecialModes?.active||null;
  const v106=()=>window.CCGLostSizzlerV106||null;
  const liveHost=()=>Boolean(typeof net!=="undefined"&&net?.connected&&net?.isHost&&typeof playMode!=="undefined"&&playMode==="online"&&(typeof mode!=="undefined"&&mode==="playing"||document.body?.dataset?.specialMode));
  const lobbyGuest=()=>Boolean(typeof net!=="undefined"&&net?.connected&&!net?.isHost&&v106()?.isLobbyOpen?.());

  function currentStartMeta(){
    const meta=v106()?.getLastStartMeta?.();
    if(!meta||typeof meta!=="object")return null;
    const roomMembers=members();
    return{
      ...meta,
      roomCode:String(net?.roomCode||meta.roomCode||""),
      roomMode:String(activeSpecial()?.type||meta.roomMode||net?.getRoomMode?.().id||"dungeon"),
      roomCapacity:Number(net?.getCapacity?.()||meta.roomCapacity||4),
      hostId:String(roomMembers[0]?.id||meta.hostId||net?.sessionId||""),
      players:roomMembers.map(member=>({id:String(member.id),name:String(member.name||"CCG Player")}))
    };
  }

  function publishHostRuntime(){
    if(typeof net==="undefined"||!net?.setRuntimePresence)return false;
    if(!liveHost()){
      if(net?.isHost&&net?.connected&&net.runtimeStarted){
        state.lastPublished="";
        Promise.resolve(net.setRuntimePresence(false,null)).catch(()=>{});
      }
      return false;
    }
    const meta=currentStartMeta();if(!meta)return false;
    const signature=`${meta.roomCode}|${meta.roomMode}|${meta.startedAt||0}|${meta.players.map(player=>player.id).join(",")}`;
    if(signature===state.lastPublished&&net.runtimeStarted)return true;
    state.lastPublished=signature;
    Promise.resolve(net.setRuntimePresence(true,meta)).catch(error=>console.warn("[Lost Sizzler V10.41] live room presence publish failed",error));
    return true;
  }

  function makeHordePlayer(member,index,runState){
    const starts=runState?.arena?.playerStarts||[],start=starts[index]||starts[0]||{x:Number(p1?.x||1),y:Number(p1?.y||1)};
    return{
      id:String(member.id),name:String(member.name||"CCG Player").slice(0,18),x:Number(start.x),y:Number(start.y),
      hp:10,maxHp:10,status:"active",downedAt:0,downExpiresAt:0,invulnerableUntil:Date.now()+2000,
      selfReviveAvailable:false,weapons:[],currentWeapon:null,kills:0,revives:0,damageTaken:0
    };
  }

  function reconcileHordeRoster(){
    const special=activeSpecial();
    if(!liveHost()||special?.type!=="horde-survivor"||!special.authoritative||!special.state)return false;
    const runState=special.state,roomMembers=members(),signature=roomMembers.map(member=>member.id).join("|");
    if(signature===state.lastRoster&&runState.players?.length===roomMembers.length)return true;
    runState.players=Array.isArray(runState.players)?runState.players:[];
    for(const [index,member] of roomMembers.entries()){
      if(runState.players.some(player=>String(player.id)===String(member.id)))continue;
      runState.players.push(makeHordePlayer(member,index,runState));
      try{showToast("SURVIVOR JOINED",`${String(member.name||"A new survivor")} joined the live Horde run. Enemy scaling has adjusted to ${runState.players.length} active players.`,"green",6500)}catch(_){}
    }
    // Remove disconnected players only after they have actually left room presence.
    const admitted=new Set(roomMembers.map(member=>String(member.id)));
    runState.players=runState.players.filter(player=>admitted.has(String(player.id)));
    runState.playerCount=Math.max(1,Math.min(4,runState.players.length));
    state.lastRoster=signature;
    return true;
  }

  function consumeLivePresence(){
    if(!lobbyGuest()||typeof net==="undefined"||!net?.getHostRuntimePresence)return false;
    const runtime=net.getHostRuntimePresence();
    if(!runtime?.started||!runtime.startMeta)return false;
    const meta={...runtime.startMeta};
    const roomMembers=members();
    meta.hostId=String(runtime.hostId||roomMembers[0]?.id||meta.hostId||"");
    meta.players=roomMembers.map(member=>({id:String(member.id),name:String(member.name||"CCG Player")}));
    meta.roomCode=String(net.roomCode||meta.roomCode||"");
    meta.roomMode=String(meta.roomMode||net.getRoomMode?.().id||"dungeon");
    const signature=`${meta.roomCode}|${meta.roomMode}|${meta.startedAt||0}|${net.sessionId}`;
    if(signature===state.lastConsumed||Date.now()<state.consumeAt)return true;
    state.lastConsumed=signature;state.consumeAt=Date.now()+1500;
    try{
      // Route through V10.6's own packet handler rather than duplicating its
      // launch logic. This sets startHandled, closes the lobby and starts the
      // correct Dungeon/Horde/Spy adapter exactly as a live host packet does.
      net.cb?.onPacket?.("v106_lobby_start",meta);
      if(typeof mode!=="undefined"&&mode==="playing"||document.body?.dataset?.specialMode){
        try{showToast("JOINED LIVE MATCH",`${net.getRoomMode?.().label||"Multiplayer"} was already running. You have joined the current game.`,"green",7000)}catch(_){}
      }
    }catch(error){
      state.lastConsumed="";
      console.warn("[Lost Sizzler V10.41] persistent live-room handoff failed",error);
      return false;
    }
    return true;
  }

  function install(){
    if(state.installed)return true;
    if(typeof net==="undefined"||!net||!v106()||typeof net.getHostRuntimePresence!=="function")return false;
    state.installed=true;document.body.dataset.v141LiveJoinPresence="true";return true;
  }

  function tick(){
    if(!install())return;
    try{reconcileHordeRoster();publishHostRuntime();consumeLivePresence()}catch(error){console.warn("[Lost Sizzler V10.41] live join guard recovered from an error",error)}
  }

  state.timer=setInterval(tick,140);tick();
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141LiveJoinPresence={publishHostRuntime,reconcileHordeRoster,consumeLivePresence,get state(){return state}};
})();