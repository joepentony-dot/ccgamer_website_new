/* The Lost Sizzler V10.41 r29 — dedicated Spy Vs Spy position transport.
 *
 * The isolated Spy rules runtime intentionally bypasses the ordinary Dungeon
 * update. Dungeon networking used to publish player positions from that update,
 * so Spy now owns a small dedicated position packet as well. This keeps host
 * and joining agent movement synchronized without routing Spy movement through
 * Dungeon onPlayer/processRemoteMovement room triggers.
 *
 * Stage 10 retires the former always-on 40 ms transport monitor. Mode entry and
 * exit are observed from the authoritative body attributes, while the 85 ms
 * heartbeat exists only for the lifetime of an active Spy match. Successful
 * movement still publishes immediately for low-latency remote presentation.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R29_SPY_NETWORK_ISOLATION__)return;
  window.__CCG_LOST_SIZZLER_V141_R29_SPY_NETWORK_ISOLATION__=true;

  const MODE_ID="sizzler-saboteurs",PACKET="v141_spy_position",SEND_MS=85;
  const state={
    installed:false,timer:0,lastSendAt:0,basePacket:null,sent:0,received:0,reassertions:0,dropped:0,lastRemoteAt:0,
    modeObserver:null,modeObserverInstalled:false,modeSignals:0,heartbeatsStarted:0,heartbeatsStopped:0
  };

  const active=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const spyActive=()=>active()?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID;
  const actorId=()=>{try{return String(net?.sessionId||p1?.id||"P1")}catch(_){return"P1"}};
  const connected=()=>{try{return playMode==="online"&&Boolean(net?.connected)}catch(_){return false}};
  const nowPerf=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};

  function safePlayerState(player){
    if(!player)return null;
    try{if(typeof playerStateForNetwork==="function")return playerStateForNetwork(player)}catch(_){}
    return{
      id:String(player.id||actorId()),name:String(player.name||"Agent"),x:Number(player.x)||0,y:Number(player.y)||0,
      health:Number(player.health)||1,maxHealth:Number(player.maxHealth)||1,dir:player.dir?{x:Number(player.dir.x)||0,y:Number(player.dir.y)||0}:{x:1,y:0}
    };
  }

  function sendPosition(force=false){
    if(!spyActive()||!connected()||!p1||typeof net?.send!=="function")return false;
    const t=nowPerf();if(!force&&t-state.lastSendAt<SEND_MS)return false;state.lastSendAt=t;
    const player=safePlayerState(p1);if(!player)return false;
    try{
      const sentAt=Date.now(),payload={roomMode:MODE_ID,actorId:actorId(),player,sentAt};
      const result=net.send(PACKET,payload);result?.catch?.(()=>{});state.sent++;return true;
    }catch(_){return false}
  }

  function admitted(id){
    if(!id)return false;
    try{
      const rows=net?.getMembers?.();if(!Array.isArray(rows)||!rows.length)return true;
      return rows.some(row=>String(row?.id||"")===String(id));
    }catch(_){return true}
  }

  function applyPosition(payload){
    if(!spyActive()||payload?.roomMode!==MODE_ID)return false;
    const id=String(payload?.actorId||payload?.player?.id||"");if(!id||id===actorId()||!admitted(id)){state.dropped++;return false}
    const incoming=payload?.player||{},x=Number(incoming.x),y=Number(incoming.y);if(!Number.isFinite(x)||!Number.isFinite(y)){state.dropped++;return false}
    try{
      const old=remote?.get?.(id)||null,stamp=nowPerf(),next={...old,...incoming,id,x,y,rx:old?.rx??x,ry:old?.ry??y,lastSeen:stamp,spyPosition:true,spySentAt:Number(payload?.sentAt)||Date.now()};
      remote?.set?.(id,next);
      const model=active()?.state?.players?.find?.(row=>String(row?.id||"")===id);
      if(model){
        model.x=x;model.y=y;
        try{
          const rid=window.CCGWorld?.roomAt?.(world,x,y),logical=active()?.state?.map?.rooms?.find?.(room=>Number(room?.dungeonRoomId)===Number(rid));
          if(logical&&String(model.roomId)!==String(logical.id)){model.roomId=logical.id;model.roomEnteredAt=Date.now()}
        }catch(_){}
      }
      state.received++;state.lastRemoteAt=stamp;return true;
    }catch(_){state.dropped++;return false}
  }

  function packetOwner(event,payload){
    if(event===PACKET){applyPosition(payload);return}
    return typeof state.basePacket==="function"?state.basePacket.apply(this,arguments):undefined;
  }
  packetOwner.__ccgV141R29SpyNetworkOwner=true;

  function install(){
    if(!net?.cb)return false;
    if(net.cb.onPacket===packetOwner){state.installed=true;return true}
    if(!state.basePacket||!state.installed)state.basePacket=net.cb.onPacket;
    net.cb.onPacket=packetOwner;state.installed=true;return true
  }

  function reassert(){
    if(!net?.cb)return false;
    if(net.cb.onPacket===packetOwner)return true;
    // If another late wrapper is installed while Spy networking is not active,
    // adopt it as the new downstream callback. During an active Spy match we do
    // not allow the dedicated packet owner to be displaced.
    if(!spyActive())state.basePacket=net.cb.onPacket;
    net.cb.onPacket=packetOwner;state.reassertions++;return true
  }

  function restore(){
    if(net?.cb&&net.cb.onPacket===packetOwner&&typeof state.basePacket==="function")net.cb.onPacket=state.basePacket;
    state.installed=false;state.basePacket=null;state.lastSendAt=0;return true
  }

  // Movement uses an immediate position publish as well as the active Spy
  // heartbeat, reducing visible latency without bringing Dungeon update back.
  function wrapAttemptMove(){
    const engine=window.CCGLostSizzlerV141R29SpyEngine;if(!engine||engine.attemptMove?.__ccgV141R29SpyNetworkMove)return false;
    const original=engine.attemptMove;if(typeof original!=="function")return false;
    const wrapped=function attemptMoveV141R29SpyNetwork(){const moved=original.apply(this,arguments);if(moved)sendPosition(true);return moved};
    wrapped.__ccgV141R29SpyNetworkMove=true;engine.attemptMove=wrapped;return true;
  }

  function heartbeat(){
    if(!spyActive()){stopHeartbeat();return false}
    if(!state.installed)install();else reassert();
    wrapAttemptMove();sendPosition(false);return true
  }

  function startHeartbeat(){
    if(!spyActive())return false;
    if(!state.installed)install();else reassert();
    wrapAttemptMove();
    if(state.timer)return true;
    state.timer=setInterval(heartbeat,SEND_MS);state.heartbeatsStarted++;sendPosition(true);return true
  }

  function stopHeartbeat(){
    if(state.timer){clearInterval(state.timer);state.timer=0;state.heartbeatsStopped++}
    if(state.installed)restore();
    return true
  }

  function syncMode(){
    state.modeSignals++;
    return spyActive()?startHeartbeat():stopHeartbeat()
  }

  function installModeObserver(){
    if(state.modeObserverInstalled||typeof MutationObserver!=="function"||!document.body)return false;
    const observer=new MutationObserver(syncMode);
    observer.observe(document.body,{attributes:true,attributeFilter:["data-special-mode","data-mode-controller","data-run-active"]});
    state.modeObserver=observer;state.modeObserverInstalled=true;syncMode();return true
  }

  if(!installModeObserver())addEventListener("DOMContentLoaded",installModeObserver,{once:true});
  wrapAttemptMove();
  addEventListener("pagehide",()=>{
    try{state.modeObserver?.disconnect?.()}catch(_){}
    state.modeObserver=null;state.modeObserverInstalled=false;stopHeartbeat();restore()
  },{once:true});

  window.CCGLostSizzlerV141R29SpyNetwork={PACKET,sendPosition,applyPosition,install,restore,startHeartbeat,stopHeartbeat,syncMode,get state(){return state}};
})();