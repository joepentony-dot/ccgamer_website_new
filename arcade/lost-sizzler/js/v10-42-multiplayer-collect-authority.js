/* The Lost Sizzler V10.42 — host-authoritative campaign collection bridge for online co-op. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_MULTIPLAYER_COLLECT_AUTHORITY__)return;
  window.__CCG_LOST_SIZZLER_V142_MULTIPLAYER_COLLECT_AUTHORITY__=true;

  let timer=0,attempts=0;
  const currentRun=()=>{try{return typeof run!=="undefined"?run:null}catch(_){return null}};
  const currentHost=()=>{try{return typeof host!=="undefined"?host:null}catch(_){return null}};
  const localRoster=()=>{try{return typeof localPlayers==="function"?localPlayers().filter(Boolean):[p1,p2].filter(Boolean)}catch(_){return[]}};
  const onlineHost=()=>{try{return typeof playMode!=="undefined"&&playMode==="online"&&net?.connected&&net.isHost}catch(_){return false}};
  const remotePlayer=id=>{try{return typeof remote!=="undefined"?remote.get(id)||null:null}catch(_){return null}};
  const domainById=id=>(window.CCG_CONFIG?.proceduralDungeon?.keyDomains||[]).find(row=>row.id===id)||null;

  function beginRemoteEscape(player){
    const runState=currentRun(),hostState=currentHost(),progression=window.CCGProgression,PD=window.CCG_CONFIG?.proceduralDungeon;
    if(!runState||!hostState||runState.v142EscapePhase)return false;
    runState.v142EscapePhase=true;runState.alert=Math.max(Number(runState.alert)||0,Number(PD?.escapeAlert)||78);
    if(player){
      player.sigilBanish=true;
      const charge={kind:"banishment",name:"Sigil Banishment Charge",short:"BANISH"};
      if(progression?.inventoryCanAdd?.(player,charge))progression.inventoryAdd(player,charge);
    }
    if(hostState.stalker){hostState.stalker.spawnTimer=0;hostState.stalker.v142EscapeAwakened=true}
    const focus=player||localRoster()[0]||null;
    for(const enemy of hostState.enemies||[])if(enemy.alive&&enemy.deathStalker){
      enemy.aiState="chase";if(focus)enemy.lastSeen={x:focus.x,y:focus.y};enemy.memoryMs=999999;enemy.searchMs=0;enemy.moveCooldown=Math.min(enemy.moveCooldown||650,320);
    }
    try{showToast("THE SIGIL IS COMPLETE — ESCAPE","All three Keys are bound to the Sigil. The dungeon is fully awake; reach the exit.","red",12000)}catch(_){}
    try{if(player&&typeof sendRemotePlayerState==="function")sendRemotePlayerState(player)}catch(_){}
    try{broadcastWorld()}catch(_){}
    try{sync()}catch(_){}
    return true;
  }

  function install(){
    const campaignApi=window.CCGLostSizzlerV142MultiplayerState;
    if(!campaignApi||typeof onCollectRequest!=="function"||onCollectRequest.__v142CollectAuthority)return false;
    const base=onCollectRequest;
    const wrapped=function onCollectRequestV142Authority(payload){
      const runState=currentRun(),hostState=currentHost(),item=hostState?.items?.find(row=>row.id===payload?.itemId&&row.active),domain=item?.kind==="key"&&item.domainId?domainById(item.domainId):null;
      const remoteCollector=onlineHost()&&Boolean(payload?.collector)&&!localRoster().some(player=>player.id===payload.collector);
      const beforeDomains=new Set(Array.isArray(runState?.v142ClaimedDomains)?runState.v142ClaimedDomains:[]),wasActive=Boolean(item?.active),result=base.apply(this,arguments);
      if(!remoteCollector||!wasActive||item?.active!==false||!runState)return result;
      if(item.kind==="exitSigil"){
        if(hostState?.exitSigilCollected&&!runState.v142EscapePhase)beginRemoteEscape(remotePlayer(payload.collector));
        return result;
      }
      if(!domain||beforeDomains.has(domain.id)||runState.v142ClaimedDomains?.includes?.(domain.id))return result;
      runState.v142ClaimedDomains=Array.isArray(runState.v142ClaimedDomains)?runState.v142ClaimedDomains:[];
      runState.v142ClaimedDomains.push(domain.id);
      if(hostState)hostState.v142GlobalKeyCount=new Set(runState.v142ClaimedDomains).size;
      for(const player of localRoster())campaignApi.queueDomainReward?.(player,domain);
      try{broadcastWorld()}catch(_){}
      try{sync()}catch(_){}
      return result;
    };
    wrapped.__v142CollectAuthority=true;wrapped.__ccgOriginal=base;onCollectRequest=wrapped;
    window.CCGLostSizzlerV142MultiplayerCollectAuthority=Object.freeze({installed:true,beginRemoteEscape});
    return true;
  }

  timer=setInterval(()=>{attempts++;if(install()||attempts>80){clearInterval(timer);timer=0}},100);install();
  addEventListener("pagehide",()=>{if(timer)clearInterval(timer)},{once:true});
})();