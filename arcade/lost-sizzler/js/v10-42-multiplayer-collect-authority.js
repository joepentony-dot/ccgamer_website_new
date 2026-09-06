/* The Lost Sizzler V10.42 — host-authoritative Key-domain collection bridge for online co-op. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_MULTIPLAYER_COLLECT_AUTHORITY__)return;
  window.__CCG_LOST_SIZZLER_V142_MULTIPLAYER_COLLECT_AUTHORITY__=true;

  let timer=0,attempts=0;
  const currentRun=()=>{try{return typeof run!=="undefined"?run:null}catch(_){return null}};
  const currentHost=()=>{try{return typeof host!=="undefined"?host:null}catch(_){return null}};
  const localRoster=()=>{try{return typeof localPlayers==="function"?localPlayers().filter(Boolean):[p1,p2].filter(Boolean)}catch(_){return[]}};
  const domainById=id=>(window.CCG_CONFIG?.proceduralDungeon?.keyDomains||[]).find(row=>row.id===id)||null;

  function install(){
    const campaignApi=window.CCGLostSizzlerV142MultiplayerState;
    if(!campaignApi||typeof onCollectRequest!=="function"||onCollectRequest.__v142CollectAuthority)return false;
    const base=onCollectRequest;
    const wrapped=function onCollectRequestV142Authority(payload){
      const runState=currentRun(),hostState=currentHost(),item=hostState?.items?.find(row=>row.id===payload?.itemId&&row.active),domain=item?.kind==="key"&&item.domainId?domainById(item.domainId):null;
      const beforeDomains=new Set(Array.isArray(runState?.v142ClaimedDomains)?runState.v142ClaimedDomains:[]),wasActive=Boolean(item?.active),result=base.apply(this,arguments);
      if(!domain||!wasActive||item?.active!==false||!runState||beforeDomains.has(domain.id))return result;
      runState.v142ClaimedDomains=Array.isArray(runState.v142ClaimedDomains)?runState.v142ClaimedDomains:[];
      if(!runState.v142ClaimedDomains.includes(domain.id))runState.v142ClaimedDomains.push(domain.id);
      if(hostState)hostState.v142GlobalKeyCount=new Set(runState.v142ClaimedDomains).size;
      for(const player of localRoster())campaignApi.queueDomainReward?.(player,domain);
      try{broadcastWorld()}catch(_){}
      try{sync()}catch(_){}
      return result;
    };
    wrapped.__v142CollectAuthority=true;wrapped.__ccgOriginal=base;onCollectRequest=wrapped;
    window.CCGLostSizzlerV142MultiplayerCollectAuthority=Object.freeze({installed:true});
    return true;
  }

  timer=setInterval(()=>{attempts++;if(install()||attempts>80){clearInterval(timer);timer=0}},100);install();
  addEventListener("pagehide",()=>{if(timer)clearInterval(timer)},{once:true});
})();