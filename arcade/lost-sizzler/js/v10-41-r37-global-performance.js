/* The Lost Sizzler V10.41 r37 — global client/network performance finalizer.
 *
 * This sits above the existing Horde and multimode performance layers. It does
 * not replace gameplay ownership. Instead it coalesces redundant publication,
 * lengthens full-state repair intervals now that compact live streams exist,
 * suppresses idle duplicate packets, and bounds purely visual transient arrays.
 *
 * Supabase remains the room transport. Database/auth/leaderboard behaviour is
 * untouched. Gameplay projectiles, enemies, collision and simulation arrays are
 * never trimmed by this module.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R37_GLOBAL_PERFORMANCE__)return;
  window.__CCG_LOST_SIZZLER_V141_R37_GLOBAL_PERFORMANCE__=true;

  const DUNGEON="dungeon",HORDE="horde-survivor",SPY="sizzler-saboteurs";
  const FULL_PLAYER_HEARTBEAT_MS=2500;
  const IDLE_PLAYER_HEARTBEAT_MS=500;
  const WORLD_RECOVERY_MS=2500;
  const WORLD_BURST_MIN_MS=280;
  const SPY_POSITION_HEARTBEAT_MS=350;
  const HORDE_STATE_HEARTBEAT_MS=300;
  const VISUAL_TRIM_MS=250;
  const INSTALL_MS=80;

  const state={
    installed:false,timer:0,raf:0,runKey:"",
    sendPlayerWrapped:false,worldWrapped:false,networkSendWrapped:false,
    lastFullPlayerAt:0,lastPlayerAt:0,lastPlayerSignature:"",
    lastWorldAt:0,lastWorldRevision:-1,pendingWorld:false,
    lastSpyPositionAt:0,lastSpyPositionSignature:"",
    lastHordeStateAt:0,lastHordeStateSignature:"",
    playerPackets:0,playerPacketsSuppressed:0,fullPlayerRepairs:0,
    worldPackets:0,worldPacketsSuppressed:0,worldBurstsCoalesced:0,
    spyPacketsSuppressed:0,hordePacketsSuppressed:0,
    packetsObserved:0,estimatedBytes:0,visualTrims:0,visualItemsRemoved:0,
    frameSamples:0,lastFrameAt:0,avgFrameMs:16.7,fps:60,lowFps:false
  };

  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const roomMode=()=>{try{return String(net?.getRoomMode?.()?.id||net?.roomMode||DUNGEON)}catch(_){return DUNGEON}};
  const online=()=>{try{return playMode==="online"&&Boolean(net?.connected)}catch(_){return false}};
  const hostOnline=()=>{try{return online()&&Boolean(net?.isHost)}catch(_){return false}};
  const activeMode=()=>specialType()||roomMode();
  const gameplayActive=()=>{try{return document.body?.dataset?.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"}catch(_){return false}};
  const currentRunKey=()=>{try{return `${activeMode()}|${run?.seed||net?.roomCode||""}|${run?.floor||1}`}catch(_){return""}};

  function resetCadenceIfNeeded(){
    const key=currentRunKey();if(state.runKey===key)return false;
    state.runKey=key;
    state.lastFullPlayerAt=0;state.lastPlayerAt=0;state.lastPlayerSignature="";
    state.lastWorldAt=0;state.lastWorldRevision=-1;state.pendingWorld=false;
    state.lastSpyPositionAt=0;state.lastSpyPositionSignature="";
    state.lastHordeStateAt=0;state.lastHordeStateSignature="";
    return true
  }

  const quantiseTimer=value=>Math.max(0,Math.ceil((Number(value)||0)/500)*500);
  function compactPlayer(player){
    return{
      id:String(player?.id||""),name:String(player?.name||"Player"),
      x:Number(player?.x)||0,y:Number(player?.y)||0,
      health:Math.max(0,Number(player?.health)||0),maxHealth:Math.max(1,Number(player?.maxHealth)||1),
      mana:Math.max(0,Number(player?.mana)||0),maxMana:Math.max(0,Number(player?.maxMana)||0),
      dir:player?.dir?{x:Number(player.dir.x)||0,y:Number(player.dir.y)||0}:{x:1,y:0},
      armor:Math.max(0,Number(player?.armor)||0),bronzeKeys:Math.max(0,Number(player?.bronzeKeys)||0),
      level:Math.max(1,Number(player?.level)||1),torchMs:quantiseTimer(player?.torchMs),rapidMs:quantiseTimer(player?.rapidMs)
    }
  }
  function compactPlayerSignature(packet){
    const d=packet?.dir||{};
    return [packet?.id,packet?.x,packet?.y,packet?.health,packet?.maxHealth,packet?.mana,packet?.maxMana,d.x,d.y,packet?.armor,packet?.bronzeKeys,packet?.level,packet?.torchMs,packet?.rapidMs].join("|")
  }
  function fullPlayerState(player){
    try{if(typeof playerStateForNetwork==="function")return playerStateForNetwork(player)}catch(_){}
    return compactPlayer(player)
  }

  function wrapSendPlayer(){
    if(state.sendPlayerWrapped)return true;
    if(typeof sendPlayer!=="function"||typeof net?.send!=="function")return false;
    const original=sendPlayer;
    const wrapped=function sendPlayerV141R37GlobalPerformance(){
      if(!online()||typeof p1==="undefined"||!p1)return original.apply(this,arguments);
      resetCadenceIfNeeded();const type=activeMode();
      // Spy owns a dedicated position transport. If legacy Dungeon publication
      // is invoked accidentally while Spy is active, do not duplicate it.
      if(type===SPY){state.playerPacketsSuppressed++;return false}
      if(type!==DUNGEON&&type!==HORDE)return original.apply(this,arguments);
      const tick=perfNow(),compact=compactPlayer(p1),signature=compactPlayerSignature(compact);
      if(!state.lastFullPlayerAt||tick-state.lastFullPlayerAt>=FULL_PLAYER_HEARTBEAT_MS){
        state.lastFullPlayerAt=tick;state.lastPlayerAt=tick;state.lastPlayerSignature=signature;state.fullPlayerRepairs++;state.playerPackets++;
        try{return net.send("player",fullPlayerState(p1))}catch(_){return original.apply(this,arguments)}
      }
      if(signature===state.lastPlayerSignature&&state.lastPlayerAt&&tick-state.lastPlayerAt<IDLE_PLAYER_HEARTBEAT_MS){state.playerPacketsSuppressed++;return false}
      state.lastPlayerAt=tick;state.lastPlayerSignature=signature;state.playerPackets++;
      try{return net.send("player",compact)}catch(_){return original.apply(this,arguments)}
    };
    wrapped.__ccgV141R37GlobalPerformance=true;wrapped.__ccgOriginal=original;
    sendPlayer=wrapped;state.sendPlayerWrapped=true;return true
  }

  function worldRevision(){try{return Number(host?.revision||0)}catch(_){return 0}}
  function wrapWorldBroadcast(){
    if(state.worldWrapped)return true;
    if(typeof broadcastWorld!=="function")return false;
    const original=broadcastWorld;
    const wrapped=function broadcastWorldV141R37GlobalPerformance(){
      if(!hostOnline())return original.apply(this,arguments);
      resetCadenceIfNeeded();const type=activeMode();if(type!==DUNGEON&&type!==HORDE)return original.apply(this,arguments);
      const tick=perfNow(),revision=worldRevision(),changed=revision!==state.lastWorldRevision;
      if(type===HORDE){
        if(state.lastWorldAt&&tick-state.lastWorldAt<WORLD_RECOVERY_MS){state.worldPacketsSuppressed++;return false}
      }else if(changed){
        if(state.lastWorldAt&&tick-state.lastWorldAt<WORLD_BURST_MIN_MS){state.pendingWorld=true;state.worldBurstsCoalesced++;state.worldPacketsSuppressed++;return false}
      }else if(state.lastWorldAt&&tick-state.lastWorldAt<WORLD_RECOVERY_MS){state.worldPacketsSuppressed++;return false}
      state.lastWorldAt=tick;state.lastWorldRevision=revision;state.pendingWorld=false;state.worldPackets++;
      return original.apply(this,arguments)
    };
    wrapped.__ccgV141R37GlobalPerformance=true;wrapped.__ccgOriginal=original;
    broadcastWorld=wrapped;state.worldWrapped=true;return true
  }

  function spyPositionSignature(payload){
    const p=payload?.player||{},d=p.dir||{};
    return [payload?.actorId||p.id,p.x,p.y,p.health,p.maxHealth,d.x,d.y].join("|")
  }
  function hordeStateSignature(payload){
    const s=payload?.state||{},parts=[s.state,s.wave,s.waveState,s.score,s.kills,s.remaining,s.playerCount];
    for(const p of s.players||[])parts.push(`p:${p.id}:${p.x}:${p.y}:${p.hp}:${p.status}`);
    for(const e of s.activeEnemies||[])if(e&&e.kind!=="reserve")parts.push(`e:${e.id}:${e.x}:${e.y}:${e.hp}:${e.alive===false?0:1}`);
    if(s.boss)parts.push(`b:${s.boss.id}:${s.boss.x}:${s.boss.y}:${s.boss.hp}:${s.boss.alive===false?0:1}`);
    return parts.join("|")
  }
  function notePacket(event,payload){
    state.packetsObserved++;
    try{state.estimatedBytes+=String(event||"").length+JSON.stringify(payload??null).length}catch(_){}
  }
  function wrapNetworkSend(){
    if(state.networkSendWrapped)return true;
    if(!net||typeof net.send!=="function")return false;
    const original=net.send;
    net.send=function sendV141R37GlobalPerformance(event,payload){
      resetCadenceIfNeeded();const tick=perfNow();
      if(event==="v141_spy_position"&&activeMode()===SPY){
        const signature=spyPositionSignature(payload);
        if(signature===state.lastSpyPositionSignature&&state.lastSpyPositionAt&&tick-state.lastSpyPositionAt<SPY_POSITION_HEARTBEAT_MS){state.spyPacketsSuppressed++;return Promise.resolve("ok")}
        state.lastSpyPositionSignature=signature;state.lastSpyPositionAt=tick
      }
      if(event==="v133_special_state"&&activeMode()===HORDE&&payload?.roomMode===HORDE){
        const signature=hordeStateSignature(payload);
        if(signature===state.lastHordeStateSignature&&state.lastHordeStateAt&&tick-state.lastHordeStateAt<HORDE_STATE_HEARTBEAT_MS){state.hordePacketsSuppressed++;return Promise.resolve("ok")}
        state.lastHordeStateSignature=signature;state.lastHordeStateAt=tick
      }
      notePacket(event,payload);
      return original.call(this,event,payload)
    };
    net.send.__ccgV141R37GlobalPerformance=true;net.send.__ccgOriginal=original;
    state.networkSendWrapped=true;return true
  }

  function visualBudget(){
    const type=activeMode(),split=(()=>{try{return playMode==="split"}catch(_){return false}})();
    let particles=type===HORDE?260:type===SPY?240:split?320:420;
    if(state.lowFps)particles=Math.max(160,Math.floor(particles*.68));
    return{particles,rings:state.lowFps?54:80,floaters:state.lowFps?64:96}
  }
  function trimArray(array,max){
    if(!Array.isArray(array)||array.length<=max)return 0;const remove=array.length-max;array.splice(0,remove);return remove
  }
  function trimVisuals(){
    if(!gameplayActive())return 0;
    const budget=visualBudget();let removed=0;
    try{removed+=trimArray(particles,budget.particles)}catch(_){}
    try{removed+=trimArray(rings,budget.rings)}catch(_){}
    try{removed+=trimArray(floaters,budget.floaters)}catch(_){}
    if(removed){state.visualTrims++;state.visualItemsRemoved+=removed}
    return removed
  }

  function frameSample(timestamp){
    const tick=Number(timestamp)||perfNow();
    if(state.lastFrameAt){const delta=Math.max(1,Math.min(120,tick-state.lastFrameAt));state.avgFrameMs=state.frameSamples?state.avgFrameMs*.92+delta*.08:delta;state.frameSamples++;state.fps=Math.max(1,Math.min(120,1000/state.avgFrameMs));state.lowFps=state.avgFrameMs>22.5}else state.frameSamples=1;
    state.lastFrameAt=tick;state.raf=requestAnimationFrame(frameSample)
  }

  let lastVisualTrimAt=0;
  function tick(){
    install();resetCadenceIfNeeded();const now=perfNow();
    if(state.pendingWorld&&hostOnline()&&activeMode()===DUNGEON&&(!state.lastWorldAt||now-state.lastWorldAt>=WORLD_BURST_MIN_MS)){
      try{broadcastWorld()}catch(_){}
    }
    if(now-lastVisualTrimAt>=VISUAL_TRIM_MS){lastVisualTrimAt=now;trimVisuals()}
  }

  function install(){
    wrapSendPlayer();wrapWorldBroadcast();wrapNetworkSend();
    const ready=state.sendPlayerWrapped&&state.worldWrapped&&state.networkSendWrapped;
    if(ready&&!state.installed){state.installed=true;document.body.dataset.v141R37GlobalPerformance="true"}
    return ready
  }

  install();state.timer=setInterval(tick,INSTALL_MS);state.raf=requestAnimationFrame(frameSample);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);if(state.raf)cancelAnimationFrame(state.raf);state.timer=0;state.raf=0},{once:true});

  window.CCGLostSizzlerV141R37GlobalPerformance={
    FULL_PLAYER_HEARTBEAT_MS,IDLE_PLAYER_HEARTBEAT_MS,WORLD_RECOVERY_MS,WORLD_BURST_MIN_MS,SPY_POSITION_HEARTBEAT_MS,HORDE_STATE_HEARTBEAT_MS,VISUAL_TRIM_MS,
    compactPlayer,compactPlayerSignature,spyPositionSignature,hordeStateSignature,trimVisuals,visualBudget,install,
    getDiagnostics(){return{
      mode:activeMode(),fps:Math.round(state.fps*10)/10,frameMs:Math.round(state.avgFrameMs*100)/100,lowFps:state.lowFps,
      playerPackets:state.playerPackets,playerPacketsSuppressed:state.playerPacketsSuppressed,fullPlayerRepairs:state.fullPlayerRepairs,
      worldPackets:state.worldPackets,worldPacketsSuppressed:state.worldPacketsSuppressed,worldBurstsCoalesced:state.worldBurstsCoalesced,
      spyPacketsSuppressed:state.spyPacketsSuppressed,hordePacketsSuppressed:state.hordePacketsSuppressed,
      packetsObserved:state.packetsObserved,estimatedBytes:state.estimatedBytes,visualItemsRemoved:state.visualItemsRemoved
    }},
    get state(){return state}
  };
})();
