/* The Lost Sizzler V10.41 — Dungeon, Spy and shared client performance layer.
 *
 * Goals:
 * - keep Dungeon Multiplayer on Supabase while replacing repeated large movement
 *   payloads with compact player/enemy state between recovery snapshots;
 * - keep Spy Vs Spy's dedicated transport while removing repeated no-change input
 *   traffic and oversized position payloads;
 * - reduce UI/radar work that does not need to run at animation-frame cadence;
 * - leave Solo gameplay simulation, Horde's dedicated performance layer and
 *   Split Screen rendering cadence unchanged.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_MULTIMODE_PERFORMANCE__)return;
  window.__CCG_LOST_SIZZLER_V141_MULTIMODE_PERFORMANCE__=true;

  const DUNGEON="dungeon",HORDE="horde-survivor",SPY="sizzler-saboteurs";
  const DUNGEON_LIVE_PACKET="v141_dungeon_live";
  const DUNGEON_LIVE_MS=200;
  const DUNGEON_WORLD_RECOVERY_MS=900;
  const FULL_PLAYER_HEARTBEAT_MS=1200;
  const SPY_INPUT_HEARTBEAT_MS=225;
  const SPY_LOGIC_MS=33;
  const UI_SYNC_MS=80;
  const RADAR_MS=100;
  const INSTALL_MS=80;

  const state={
    installed:false,timer:0,runKey:"",lastFullPlayerAt:0,lastWorldAt:0,lastWorldRevision:-1,lastDungeonLiveAt:0,
    playerWrapped:false,worldWrapped:false,networkSendWrapped:false,packetWrapped:false,syncWrapped:false,radarWrapped:false,spyLogicWrapped:false,
    compactDungeonPlayers:0,fullDungeonPlayers:0,dungeonWorldSends:0,dungeonWorldSkips:0,dungeonLiveSends:0,dungeonLiveReceives:0,dungeonEnemyUpdates:0,dungeonDeathsApplied:0,
    compactSpyPositions:0,spyInputsSent:0,spyInputsSuppressed:0,lastSpyInputSignature:"",lastSpyInputAt:0,
    syncCalls:0,syncSkips:0,splitSyncSkips:0,radarCalls:0,radarSkips:0,spyRadarSkips:0,spyLogicCalls:0,spyLogicSkips:0,lastSpyLogicAt:0
  };

  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const roomMode=()=>{try{return String(net?.getRoomMode?.()?.id||net?.roomMode||DUNGEON)}catch(_){return DUNGEON}};
  const online=()=>{try{return playMode==="online"&&Boolean(net?.connected)}catch(_){return false}};
  const connectedDungeon=()=>online()&&roomMode()===DUNGEON&&!specialType();
  const connectedSpy=()=>online()&&(roomMode()===SPY||specialType()===SPY);
  const splitActive=()=>{try{return playMode==="split"&&mode==="playing"&&Boolean(p1&&p2&&run)&&document.body?.dataset?.runActive==="true"}catch(_){return false}};
  const gameplayActive=()=>{try{return mode==="playing"&&Boolean(run&&p1)&&document.body?.dataset?.runActive==="true"}catch(_){return false}};
  const currentRunKey=()=>{try{return `${roomMode()}|${run?.seed||net?.roomCode||""}|${run?.floor||1}`}catch(_){return""}};
  function resetCadenceIfNeeded(){
    const key=currentRunKey();if(state.runKey===key)return false;
    state.runKey=key;state.lastFullPlayerAt=0;state.lastWorldAt=0;state.lastWorldRevision=-1;state.lastDungeonLiveAt=0;state.lastSpyInputAt=0;state.lastSpyInputSignature="";state.lastSpyLogicAt=0;return true
  }

  function compactPlayerState(player){
    return{
      id:player.id,name:player.name,x:player.x,y:player.y,
      health:player.health,maxHealth:player.maxHealth,mana:player.mana,maxMana:player.maxMana,
      dir:player.dir?{x:Number(player.dir.x)||0,y:Number(player.dir.y)||0}:{x:1,y:0},
      armor:Number(player.armor||0),bronzeKeys:Number(player.bronzeKeys||0),level:Number(player.level||1),
      torchMs:Number(player.torchMs||0),rapidMs:Number(player.rapidMs||0)
    }
  }

  function compactSpyPlayer(player){
    return{
      id:String(player?.id||""),name:String(player?.name||"Agent"),x:Number(player?.x)||0,y:Number(player?.y)||0,
      health:Math.max(0,Number(player?.health)||0),maxHealth:Math.max(1,Number(player?.maxHealth)||1),
      dir:player?.dir?{x:Number(player.dir.x)||0,y:Number(player.dir.y)||0}:{x:1,y:0}
    }
  }

  function wrapPlayerSend(){
    if(state.playerWrapped)return true;
    if(typeof sendPlayer!=="function")return false;
    const original=sendPlayer;
    const wrapped=function sendPlayerV141MultimodePerformance(){
      if(!connectedDungeon()||typeof p1==="undefined"||!p1)return original.apply(this,arguments);
      resetCadenceIfNeeded();const tick=perfNow();
      if(!state.lastFullPlayerAt||tick-state.lastFullPlayerAt>=FULL_PLAYER_HEARTBEAT_MS){
        state.lastFullPlayerAt=tick;state.fullDungeonPlayers++;return original.apply(this,arguments)
      }
      state.compactDungeonPlayers++;
      try{return net.send("player",compactPlayerState(p1))}catch(_){return original.apply(this,arguments)}
    };
    wrapped.__ccgV141MultimodePerformance=true;wrapped.__ccgOriginal=original;
    sendPlayer=wrapped;state.playerWrapped=true;return true
  }

  function worldRevision(){try{return Number(host?.revision||0)}catch(_){return 0}}
  function wrapWorldBroadcast(){
    if(state.worldWrapped)return true;
    if(typeof broadcastWorld!=="function")return false;
    const original=broadcastWorld;
    const wrapped=function broadcastWorldV141DungeonRecovery(){
      if(!connectedDungeon()||!net?.isHost)return original.apply(this,arguments);
      resetCadenceIfNeeded();const tick=perfNow(),revision=worldRevision(),changed=revision!==state.lastWorldRevision;
      if(!changed&&state.lastWorldAt&&tick-state.lastWorldAt<DUNGEON_WORLD_RECOVERY_MS){state.dungeonWorldSkips++;return false}
      state.lastWorldAt=tick;state.lastWorldRevision=revision;state.dungeonWorldSends++;return original.apply(this,arguments)
    };
    wrapped.__ccgV141MultimodePerformance=true;wrapped.__ccgOriginal=original;
    broadcastWorld=wrapped;state.worldWrapped=true;return true
  }

  function dungeonLivePayload(){
    const enemies=[];const dead=[];
    try{
      for(const enemy of host?.enemies||[]){
        const id=String(enemy?.id||"");if(!id)continue;
        if(enemy.alive===false||Number(enemy.hp||0)<=0){dead.push(id);continue}
        const x=Number(enemy.x),y=Number(enemy.y);if(!Number.isFinite(x)||!Number.isFinite(y))continue;
        enemies.push({id,x,y,hp:Math.max(0,Number(enemy.hp)||0),maxHp:Math.max(1,Number(enemy.maxHp||enemy.hp)||1),aiState:String(enemy.aiState||"")})
      }
    }catch(_){}
    let stalker=null;
    try{
      if(host?.stalker&&Number.isFinite(Number(host.stalker.x))&&Number.isFinite(Number(host.stalker.y)))stalker={id:String(host.stalker.id||"stalker"),x:Number(host.stalker.x),y:Number(host.stalker.y),awake:Boolean(host.stalker.awake)}
    }catch(_){}
    return{roomMode:DUNGEON,revision:worldRevision(),enemies,dead,stalker,sentAt:Date.now()}
  }

  function sendDungeonLive(force=false){
    if(!connectedDungeon()||!net?.isHost||typeof net?.send!=="function")return false;
    resetCadenceIfNeeded();const tick=perfNow();if(!force&&state.lastDungeonLiveAt&&tick-state.lastDungeonLiveAt<DUNGEON_LIVE_MS)return false;
    state.lastDungeonLiveAt=tick;
    try{const result=net.send(DUNGEON_LIVE_PACKET,dungeonLivePayload());result?.catch?.(()=>{});state.dungeonLiveSends++;return true}catch(_){return false}
  }

  function applyDungeonLive(payload){
    if(!connectedDungeon()||net?.isHost||payload?.roomMode!==DUNGEON||!host)return false;
    const byId=new Map((host.enemies||[]).map(enemy=>[String(enemy?.id||""),enemy]));
    for(const model of payload.enemies||[]){
      const enemy=byId.get(String(model?.id||""));if(!enemy)continue;
      const x=Number(model.x),y=Number(model.y);if(!Number.isFinite(x)||!Number.isFinite(y))continue;
      enemy.x=x;enemy.y=y;enemy.hp=Math.max(0,Number(model.hp)||0);enemy.maxHp=Math.max(enemy.hp,Number(model.maxHp||enemy.maxHp||1));enemy.alive=enemy.hp>0;
      if(model.aiState)enemy.aiState=String(model.aiState);state.dungeonEnemyUpdates++
    }
    const dead=new Set((payload.dead||[]).map(String));
    if(dead.size)for(const enemy of host.enemies||[])if(dead.has(String(enemy?.id||""))&&enemy.alive!==false){enemy.alive=false;enemy.hp=0;state.dungeonDeathsApplied++}
    try{
      if(payload.stalker&&host.stalker){host.stalker.x=Number(payload.stalker.x);host.stalker.y=Number(payload.stalker.y);host.stalker.awake=Boolean(payload.stalker.awake)}
    }catch(_){}
    state.dungeonLiveReceives++;return true
  }

  function spyInputSignature(payload){
    const input=payload?.input||{};return [Number(input.dx)||0,Number(input.dy)||0,input.fire?1:0,input.interact?1:0,input.trap?1:0,input.extract?1:0].join("|")
  }

  function wrapNetworkSend(){
    if(state.networkSendWrapped)return true;
    if(!net||typeof net.send!=="function")return false;
    const original=net.send;
    net.send=function sendV141MultimodePerformance(event,payload){
      if(event==="v141_spy_position"&&connectedSpy()&&payload?.player){
        state.compactSpyPositions++;payload={...payload,player:compactSpyPlayer(payload.player)}
      }
      if(event==="v133_special_input"&&connectedSpy()){
        const tick=perfNow(),signature=spyInputSignature(payload),same=signature===state.lastSpyInputSignature;
        if(same&&state.lastSpyInputAt&&tick-state.lastSpyInputAt<SPY_INPUT_HEARTBEAT_MS){state.spyInputsSuppressed++;return Promise.resolve("ok")}
        state.lastSpyInputSignature=signature;state.lastSpyInputAt=tick;state.spyInputsSent++
      }
      return original.call(this,event,payload)
    };
    net.send.__ccgV141MultimodePerformance=true;net.send.__ccgOriginal=original;
    state.networkSendWrapped=true;return true
  }

  function wrapPacket(){
    if(state.packetWrapped)return true;
    if(!net?.cb||typeof net.cb.onPacket!=="function")return false;
    const original=net.cb.onPacket;
    const wrapped=function onPacketV141MultimodePerformance(event,payload){
      const result=original?.apply(this,arguments);
      if(event===DUNGEON_LIVE_PACKET){try{applyDungeonLive(payload)}catch(error){console.warn("[Lost Sizzler V10.41] Dungeon live sync failed safely",error)}}
      return result
    };
    wrapped.__ccgV141MultimodePerformance=true;wrapped.__ccgOriginal=original;
    net.cb.onPacket=wrapped;state.packetWrapped=true;return true
  }

  function wrapSync(){
    if(state.syncWrapped)return true;
    if(typeof sync!=="function")return false;
    const original=sync;let lastAt=0;
    const wrapped=function syncV141Performance(){
      state.syncCalls++;
      if(gameplayActive()){
        const tick=perfNow();
        if(lastAt&&tick-lastAt<UI_SYNC_MS){state.syncSkips++;if(splitActive())state.splitSyncSkips++;return undefined}
        lastAt=tick
      }else lastAt=0;
      return original.apply(this,arguments)
    };
    wrapped.__ccgV141MultimodePerformance=true;wrapped.__ccgOriginal=original;
    sync=wrapped;state.syncWrapped=true;return true
  }

  function wrapRadar(){
    if(state.radarWrapped)return true;
    if(typeof renderRadarPanel!=="function")return false;
    const original=renderRadarPanel;let lastAt=0;
    const wrapped=function renderRadarPanelV141Performance(player){
      if(specialType()===SPY){state.spyRadarSkips++;return false}
      const tick=perfNow();if(lastAt&&tick-lastAt<RADAR_MS){state.radarSkips++;return false}
      lastAt=tick;state.radarCalls++;return original.apply(this,arguments)
    };
    wrapped.__ccgV141MultimodePerformance=true;wrapped.__ccgOriginal=original;
    renderRadarPanel=wrapped;state.radarWrapped=true;return true
  }

  function wrapSpyLogic(){
    if(state.spyLogicWrapped)return true;
    const engine=window.CCGLostSizzlerV141R29SpyEngine;if(!engine||typeof engine.isolatedUpdate!=="function")return false;
    const original=engine.isolatedUpdate;
    const wrapped=function isolatedUpdateV141Performance(){
      if(!connectedSpy())return original.apply(this,arguments);
      resetCadenceIfNeeded();const tick=perfNow();
      if(state.lastSpyLogicAt&&tick-state.lastSpyLogicAt<SPY_LOGIC_MS){state.spyLogicSkips++;return true}
      state.lastSpyLogicAt=tick;state.spyLogicCalls++;return original.apply(this,arguments)
    };
    wrapped.__ccgV141MultimodePerformance=true;wrapped.__ccgOriginal=original;
    engine.isolatedUpdate=wrapped;
    try{const runtime=window.CCGLostSizzlerModeRuntime?.runtimes?.[SPY];if(runtime&&runtime.update===original)runtime.update=wrapped}catch(_){}
    state.spyLogicWrapped=true;return true
  }

  function install(){
    wrapPlayerSend();wrapWorldBroadcast();wrapNetworkSend();wrapPacket();wrapSync();wrapRadar();wrapSpyLogic();
    const core=state.playerWrapped&&state.worldWrapped&&state.networkSendWrapped&&state.packetWrapped&&state.syncWrapped&&state.radarWrapped;
    if(core&&!state.installed){state.installed=true;document.body.dataset.v141MultimodePerformance="true"}
    return core
  }

  function tick(){
    install();sendDungeonLive(false);if(!state.spyLogicWrapped)wrapSpyLogic()
  }

  install();state.timer=setInterval(tick,INSTALL_MS);
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});
  window.CCGLostSizzlerMultimodePerformance={
    DUNGEON_LIVE_PACKET,DUNGEON_LIVE_MS,DUNGEON_WORLD_RECOVERY_MS,FULL_PLAYER_HEARTBEAT_MS,SPY_INPUT_HEARTBEAT_MS,SPY_LOGIC_MS,UI_SYNC_MS,RADAR_MS,
    compactPlayerState,compactSpyPlayer,dungeonLivePayload,sendDungeonLive,applyDungeonLive,install,
    get state(){return state}
  };
})();
