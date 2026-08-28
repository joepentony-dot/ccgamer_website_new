/* The Lost Sizzler V10.41 — four-player Horde network performance layer.
 * Keeps the existing Supabase room transport while removing duplicated high-
 * frequency state. Horde's dedicated v133 state remains the fast authoritative
 * stream; the large generic dungeon snapshot becomes a slower recovery packet.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_HORDE_NETWORK_PERFORMANCE__)return;
  window.__CCG_LOST_SIZZLER_V141_HORDE_NETWORK_PERFORMANCE__=true;

  const HORDE="horde-survivor";
  const INSTALL_MS=80;
  const HORDE_WORLD_RECOVERY_MS=900;
  const FULL_PLAYER_HEARTBEAT_MS=1200;
  const state={
    installed:false,timer:0,playerWrapped:false,worldWrapped:false,packetWrapped:false,networkSendWrapped:false,
    runKey:"",lastFullPlayerAt:0,lastWorldAt:0,
    compactPlayerSends:0,fullPlayerSends:0,worldSends:0,worldSkips:0,suppressedHordeInputs:0,
    guestActorUpdates:0,guestActorCreates:0,guestActorRemovals:0,lastSpecialStateAt:0
  };

  const special=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const isHorde=()=>String(special()?.type||document.body?.dataset?.specialMode||"")===HORDE;
  const connectedHorde=()=>{
    try{return Boolean(isHorde()&&net?.connected&&playMode==="online")}catch(_){return false}
  };
  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const currentRunKey=()=>{
    try{return String(special()?.seed||run?.seed||net?.roomCode||"")}catch(_){return""}
  };
  function resetCadenceIfNeeded(){
    const key=currentRunKey();if(state.runKey===key)return false;
    state.runKey=key;state.lastFullPlayerAt=0;state.lastWorldAt=0;return true
  }

  function compactPlayerState(player){
    return{
      id:player.id,name:player.name,x:player.x,y:player.y,
      health:player.health,maxHealth:player.maxHealth,mana:player.mana,maxMana:player.maxMana,
      dir:player.dir?{x:Number(player.dir.x)||0,y:Number(player.dir.y)||0}:{x:1,y:0},
      armor:Number(player.armor||0),level:Number(player.level||1),torchMs:Number(player.torchMs||0),rapidMs:Number(player.rapidMs||0)
    }
  }

  function wrapPlayerSend(){
    if(state.playerWrapped)return true;
    if(typeof sendPlayer!=="function")return false;
    const original=sendPlayer;
    const wrapped=function sendPlayerV141HordeNetworkPerformance(){
      if(!connectedHorde()||typeof p1==="undefined"||!p1)return original.apply(this,arguments);
      resetCadenceIfNeeded();const tick=perfNow();
      if(!state.lastFullPlayerAt||tick-state.lastFullPlayerAt>=FULL_PLAYER_HEARTBEAT_MS){
        state.lastFullPlayerAt=tick;state.fullPlayerSends++;return original.apply(this,arguments)
      }
      state.compactPlayerSends++;
      try{return net.send("player",compactPlayerState(p1))}catch(_){return original.apply(this,arguments)}
    };
    wrapped.__ccgV141HordeNetworkPerformance=true;wrapped.__ccgOriginal=original;
    sendPlayer=wrapped;state.playerWrapped=true;return true
  }

  function wrapWorldBroadcast(){
    if(state.worldWrapped)return true;
    if(typeof broadcastWorld!=="function")return false;
    const original=broadcastWorld;
    const wrapped=function broadcastWorldV141HordeRecovery(){
      if(!connectedHorde()||!net?.isHost)return original.apply(this,arguments);
      resetCadenceIfNeeded();const tick=perfNow();
      if(state.lastWorldAt&&tick-state.lastWorldAt<HORDE_WORLD_RECOVERY_MS){state.worldSkips++;return false}
      state.lastWorldAt=tick;state.worldSends++;return original.apply(this,arguments)
    };
    wrapped.__ccgV141HordeNetworkPerformance=true;wrapped.__ccgOriginal=original;
    broadcastWorld=wrapped;state.worldWrapped=true;return true
  }

  function wrapNetworkSend(){
    if(state.networkSendWrapped)return true;
    if(!net||typeof net.send!=="function")return false;
    const original=net.send;
    net.send=function sendV141HordeNetworkPerformance(event,payload){
      // v133_special_input is consumed by Spy Vs Spy. Horde movement is already
      // represented by the normal player packet stream and updateHorde never
      // reads the special input map, so sending it every 75 ms is duplicate work.
      if(event==="v133_special_input"&&connectedHorde()){
        state.suppressedHordeInputs++;return Promise.resolve("ok")
      }
      return original.apply(this,arguments)
    };
    net.send.__ccgV141HordeNetworkPerformance=true;net.send.__ccgOriginal=original;
    state.networkSendWrapped=true;return true
  }

  const physicalKind=kind=>({bat:"ghost",fighter:"hunter",elite:"guardian",warden:"knight"}[String(kind||"")]||String(kind||"spider"));
  function modelPosition(model){
    const x=Number(model?.x),y=Number(model?.y);return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null
  }
  function makeReplica(model,boss=false){
    const pos=modelPosition(model);if(!pos)return null;
    const hp=Math.max(1,Number(model.hp||model.maxHp||1)),maxHp=Math.max(hp,Number(model.maxHp||hp));
    return{
      id:String(model.id),x:pos.x,y:pos.y,kind:physicalKind(model.kind),hp,maxHp,alive:true,
      aiState:"chase",facing:{x:0,y:1},lastSeen:null,memoryMs:999999,searchMs:0,
      moveCooldown:999999,attackCooldown:999999,chargeCooldown:999999,healCooldown:999999,
      flash:0,hpBarMs:0,hordeEnemy:true,hordeModelId:String(model.id),hordeWarden:Boolean(boss),
      champion:Boolean(boss),championName:boss?(model.name||"The Horde Warden"):undefined,
      moveSpeedScale:Number(model.speed||1),spawnedAt:Number(model.spawnedAt||Date.now()),_v141NetworkReplica:true
    }
  }
  function findPhysical(model){
    if(!host?.enemies)return null;const id=String(model?.id||"");
    return host.enemies.find(enemy=>String(enemy?.hordeModelId||enemy?.id||"")===id)||null
  }
  function applyModel(enemy,model,boss=false){
    const pos=modelPosition(model);if(!enemy||!pos)return false;
    enemy.x=pos.x;enemy.y=pos.y;enemy.hp=Math.max(0,Number(model.hp||0));enemy.maxHp=Math.max(enemy.hp,Number(model.maxHp||enemy.maxHp||enemy.hp||1));
    enemy.alive=model.alive!==false&&enemy.hp>0;enemy.hordeEnemy=true;enemy.hordeModelId=String(model.id);enemy.hordeWarden=Boolean(boss||enemy.hordeWarden);
    if(boss){enemy.champion=true;enemy.championName=model.name||enemy.championName||"The Horde Warden"}
    state.guestActorUpdates++;return true
  }
  function liveModelsFrom(payload){
    const source=payload?.state||{},models=[];
    for(const model of source.activeEnemies||[]){
      if(!model||model.alive===false||Number(model.hp||0)<=0||String(model.kind||"")==="reserve"||!modelPosition(model))continue;
      models.push({model,boss:false})
    }
    const boss=source.boss;
    if(boss?.alive!==false&&Number(boss?.hp||0)>0&&modelPosition(boss))models.push({model:boss,boss:true});
    return models
  }
  function syncGuestHordeActors(payload){
    if(!connectedHorde()||net?.isHost||payload?.roomMode!==HORDE||!payload?.state||!host?.enemies)return false;
    state.lastSpecialStateAt=perfNow();const models=liveModelsFrom(payload),liveIds=new Set();
    for(const entry of models){
      const id=String(entry.model.id);liveIds.add(id);let enemy=findPhysical(entry.model);
      if(!enemy){enemy=makeReplica(entry.model,entry.boss);if(enemy){host.enemies.push(enemy);state.guestActorCreates++}}
      if(enemy)applyModel(enemy,entry.model,entry.boss)
    }
    const before=host.enemies.length;
    host.enemies=host.enemies.filter(enemy=>{
      if(!(enemy?.hordeEnemy||enemy?.hordeWarden||enemy?._v141NetworkReplica))return true;
      const id=String(enemy?.hordeModelId||enemy?.id||"");return liveIds.has(id)
    });
    state.guestActorRemovals+=Math.max(0,before-host.enemies.length);
    return true
  }

  function wrapPacket(){
    if(state.packetWrapped)return true;
    if(!net?.cb||typeof net.cb.onPacket!=="function"||!window.CCGLostSizzlerSpecialModes?.startOnline)return false;
    const original=net.cb.onPacket;
    const wrapped=function onPacketV141HordeNetworkPerformance(event,payload){
      const result=original?.(event,payload);
      if(event==="v133_special_state"&&payload?.roomMode===HORDE){try{syncGuestHordeActors(payload)}catch(error){console.warn("[Lost Sizzler V10.41] Horde guest actor sync failed",error)}}
      return result
    };
    wrapped.__ccgV141HordeNetworkPerformance=true;wrapped.__ccgOriginal=original;
    net.cb.onPacket=wrapped;state.packetWrapped=true;return true
  }

  function install(){
    if(state.installed)return true;
    const ready=Boolean(window.CCGLostSizzlerSpecialModes?.startOnline&&typeof sendPlayer==="function"&&typeof broadcastWorld==="function"&&net?.cb&&typeof net.send==="function");
    if(!ready)return false;
    wrapPlayerSend();wrapWorldBroadcast();wrapNetworkSend();wrapPacket();
    if(!(state.playerWrapped&&state.worldWrapped&&state.networkSendWrapped&&state.packetWrapped))return false;
    state.installed=true;document.body.dataset.v141HordeNetworkPerformance="true";return true
  }

  if(!install())state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},INSTALL_MS);
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});
  window.CCGLostSizzlerHordeNetworkPerformance={
    HORDE_WORLD_RECOVERY_MS,FULL_PLAYER_HEARTBEAT_MS,compactPlayerState,syncGuestHordeActors,install,
    get state(){return state}
  };
})();