/* The Lost Sizzler V10.42 — multiplayer/split campaign authority and character-state adapter. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_MULTIPLAYER_STATE__)return;
  window.__CCG_LOST_SIZZLER_V142_MULTIPLAYER_STATE__=true;

  const PLAYER_SCALARS=[
    "banishmentVessel","banishmentEssence","banishmentEssenceCost","sigilReveal","sigilWard","sigilBind","sigilBanish",
    "v142SightBonus","v142WardCooldownMs","v142BloodCartridge","v142BloodHealAt","scavenger","pendingLevels"
  ];
  const PLAYER_ARRAYS=["relics","skills","v142RelicDomains"];
  const RUN_SCALARS=["v142Campaign","v142AllKeysAnnounced","v142ThreeKeys","v142EscapePhase","alert"];
  const state={installed:false,pendingRelics:[],activeRelic:null,suppressRelicUntil:0,observer:null};
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch(_){return value}};
  const currentRun=()=>{try{return typeof run!=="undefined"?run:null}catch(_){return null}};
  const currentPlayer=()=>{try{return typeof p1!=="undefined"?p1:null}catch(_){return null}};
  const localRoster=()=>{try{return typeof localPlayers==="function"?localPlayers().filter(Boolean):[p1,p2].filter(Boolean)}catch(_){return[currentPlayer()].filter(Boolean)}};
  const online=()=>{try{return typeof playMode!=="undefined"&&playMode==="online"&&net?.connected}catch(_){return false}};
  const onlineGuest=()=>online()&&!net.isHost;
  const onlineHost=()=>online()&&net.isHost;
  const isLocalPlayer=player=>localRoster().includes(player);
  const domainRows=()=>window.CCG_CONFIG?.proceduralDungeon?.keyDomains||[];
  const domainById=id=>domainRows().find(row=>row.id===id)||null;
  const domainPower=domain=>String(domain?.sigilPower||"").toUpperCase();

  function copyPlayerV142(target,source){
    if(!target||!source)return target;
    if(source.rpgStats&&typeof source.rpgStats==="object")target.rpgStats={...source.rpgStats};
    for(const key of PLAYER_ARRAYS)if(Array.isArray(source[key]))target[key]=source[key].map(value=>typeof value==="object"&&value?clone(value):value);
    for(const key of PLAYER_SCALARS)if(source[key]!==undefined)target[key]=source[key];
    return target;
  }
  function playerV142Snapshot(player){
    const out={};if(player?.rpgStats&&typeof player.rpgStats==="object")out.rpgStats={...player.rpgStats};
    for(const key of PLAYER_ARRAYS)if(Array.isArray(player?.[key]))out[key]=clone(player[key]);
    for(const key of PLAYER_SCALARS)if(player?.[key]!==undefined)out[key]=player[key];
    return out;
  }
  function restorePlayerV142(player,snapshot){
    if(!player||!snapshot)return;
    for(const key of ["rpgStats",...PLAYER_ARRAYS,...PLAYER_SCALARS]){
      if(Object.prototype.hasOwnProperty.call(snapshot,key))player[key]=clone(snapshot[key]);
      else delete player[key];
    }
  }
  function campaignSnapshot(runState=currentRun()){
    if(!runState)return null;const out={v142ClaimedDomains:Array.isArray(runState.v142ClaimedDomains)?[...new Set(runState.v142ClaimedDomains)]:[]};
    for(const key of RUN_SCALARS)if(runState[key]!==undefined)out[key]=clone(runState[key]);
    if(runState.stats&&typeof runState.stats==="object")out.stats=clone(runState.stats);
    return out;
  }
  function restoreCampaign(runState,snapshot){
    if(!runState||!snapshot)return;
    runState.v142ClaimedDomains=[...(snapshot.v142ClaimedDomains||[])];
    for(const key of RUN_SCALARS){if(Object.prototype.hasOwnProperty.call(snapshot,key))runState[key]=clone(snapshot[key]);else delete runState[key]}
    if(Object.prototype.hasOwnProperty.call(snapshot,"stats"))runState.stats=clone(snapshot.stats);
  }
  function applyCampaign(snapshot){
    const runState=currentRun();if(!runState||!snapshot)return [];
    const before=new Set(Array.isArray(runState.v142ClaimedDomains)?runState.v142ClaimedDomains:[]),incoming=[...new Set(Array.isArray(snapshot.v142ClaimedDomains)?snapshot.v142ClaimedDomains:[])];
    runState.v142ClaimedDomains=incoming;
    for(const key of RUN_SCALARS)if(snapshot[key]!==undefined)runState[key]=clone(snapshot[key]);
    if(snapshot.stats&&typeof snapshot.stats==="object")runState.stats=clone(snapshot.stats);
    return incoming.filter(id=>!before.has(id));
  }

  function hasPower(player,domain){const power=domainPower(domain);return power==="REVEAL"?Boolean(player?.sigilReveal):power==="WARD"?Boolean(player?.sigilWard):power==="BIND"?Boolean(player?.sigilBind):false}
  function applyPower(player,domain){
    if(!player||!domain)return false;window.CCGLostSizzlerV142ProceduralOverhaul?.initRpg?.(player);const power=domainPower(domain);
    if(power==="REVEAL")player.sigilReveal=true;
    if(power==="WARD"){player.sigilWard=true;player.v142WardReadyAt=0}
    if(power==="BIND"){player.sigilBind=true;player.v142BindReadyAt=0}
    return Boolean(power);
  }
  function seededChoices(player,domain){
    const api=window.CCGLostSizzlerV142ProceduralOverhaul,pool=(api?.relics||[]).filter(row=>!new Set(player?.relics||[]).has(row.id));if(!pool.length)return[];
    const choices=pool.length>=3?[...pool]:[...(api?.relics||[])],seed=`${currentRun()?.seed||"CCG"}-${domain?.id||"KEY"}-RELIC-${player?.level||1}`;
    const random=typeof window.CCGProgression?.seededRandom==="function"?window.CCGProgression.seededRandom(seed):Math.random;
    for(let i=choices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]]}return choices.slice(0,3);
  }
  function applyRelic(player,id){
    if(!player||!id)return false;player.relics=Array.isArray(player.relics)?player.relics:[];if(player.relics.includes(id))return false;
    if(id==="archive-plate"){player.maxHealth=(Number(player.maxHealth)||0)+2;player.health=Math.min(player.maxHealth,(Number(player.health)||0)+2)}
    else if(id==="sid-capacitor"){player.maxMana=(Number(player.maxMana)||0)+50;player.mana=Math.min(player.maxMana,(Number(player.mana)||0)+50)}
    else if(id==="hot-fire-button"){player.damageBonus=(Number(player.damageBonus)||0)+1;player.maxMana=Math.max(60,(Number(player.maxMana)||0)-20);player.mana=Math.min(Number(player.mana)||0,player.maxMana)}
    else if(id==="competition-pro-spring")player.moveMultiplier=(Number(player.moveMultiplier)||1)*.90;
    else if(id==="scavenger-rom"){player.scavenger=(Number(player.scavenger)||0)+.35;player.potionBonus=(Number(player.potionBonus)||0)+1}
    else if(id==="alchemist-seal"){const cost=window.CCGLostSizzlerV142ProceduralOverhaul?.essenceCost?.(player)??player.banishmentEssenceCost??3;player.banishmentEssenceCost=Math.max(2,Number(cost)-1)}
    else if(id==="cartographer-chip")player.v142SightBonus=(Number(player.v142SightBonus)||0)+1;
    else if(id==="blood-cartridge"){player.v142BloodCartridge=true;player.v142BloodHealAt=(Number(currentRun()?.stats?.kills)||0)+10}
    else if(id==="ward-amplifier")player.v142WardCooldownMs=18000;
    else return false;
    player.relics.push(id);return true;
  }
  function ensureModal(){
    let modal=document.getElementById("v142-relic-choice");if(modal)return modal;
    modal=document.createElement("section");modal.id="v142-relic-choice";modal.className="hidden";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");document.body.appendChild(modal);return modal;
  }
  function finishRelicChoice(player,domain,relic,previousMode){
    if(!applyRelic(player,relic.id))return;player.v142RelicDomains=Array.isArray(player.v142RelicDomains)?player.v142RelicDomains:[];if(!player.v142RelicDomains.includes(domain.id))player.v142RelicDomains.push(domain.id);
    const modal=ensureModal();modal.classList.add("hidden");state.activeRelic=null;try{if(typeof mode!=="undefined")mode=previousMode==="v142relic"?"playing":previousMode||"playing"}catch(_){}
    try{showToast(`RELIC CLAIMED — ${relic.name}`,relic.desc,"green",8000)}catch(_){}try{sync()}catch(_){}try{if(online()&&player===currentPlayer()&&typeof sendPlayer==="function")sendPlayer()}catch(_){}setTimeout(pumpRelics,0);
  }
  function pumpRelics(){
    if(state.activeRelic||!state.pendingRelics.length||performance.now()<state.suppressRelicUntil)return;
    const modal=ensureModal();if(!modal.classList.contains("hidden"))return;
    const next=state.pendingRelics.shift(),player=next?.player,domain=next?.domain;if(!player||!domain)return pumpRelics();
    player.v142RelicDomains=Array.isArray(player.v142RelicDomains)?player.v142RelicDomains:[];if(player.v142RelicDomains.includes(domain.id))return pumpRelics();
    const choices=seededChoices(player,domain);if(!choices.length){player.v142RelicDomains.push(domain.id);return pumpRelics()}
    const previousMode=(()=>{try{return typeof mode!=="undefined"?mode:"playing"}catch(_){return"playing"}})();state.activeRelic={player,domain};try{mode="v142relic";input?.clear?.()}catch(_){}
    modal.innerHTML=`<div class="v142-card"><small>KEY DOMAIN CLEARED · ${String(player.name||"PLAYER").toUpperCase()}</small><h2>CHOOSE A RELIC</h2><p>${domain.name||"A dungeon Key"} has awakened part of the Sigil for ${player.name||"this character"}. Choose one relic for this character's campaign build.</p><div class="v142-relic-grid">${choices.map(row=>`<button type="button" data-v142-net-relic="${row.id}"><b>${row.name}</b><span>${row.desc}</span></button>`).join("")}</div></div>`;
    modal.querySelectorAll("[data-v142-net-relic]").forEach(button=>button.addEventListener("click",()=>{const relic=choices.find(row=>row.id===button.dataset.v142NetRelic);if(relic)finishRelicChoice(player,domain,relic,previousMode)}));modal.classList.remove("hidden");
  }
  function queueDomainReward(player,domain){
    if(!player||!domain)return;applyPower(player,domain);player.v142RelicDomains=Array.isArray(player.v142RelicDomains)?player.v142RelicDomains:[];
    if(player.v142RelicDomains.includes(domain.id)||state.pendingRelics.some(row=>row.player===player&&row.domain.id===domain.id)||state.activeRelic?.player===player&&state.activeRelic?.domain?.id===domain.id)return;
    state.pendingRelics.push({player,domain});pumpRelics();
  }
  function suppressScheduledRemoteRelic(){
    state.suppressRelicUntil=performance.now()+900;setTimeout(()=>{
      const modal=document.getElementById("v142-relic-choice");if(modal&&!modal.classList.contains("hidden")){modal.classList.add("hidden");try{if(typeof mode!=="undefined"&&mode==="v142relic")mode="playing"}catch(_){}}
      state.suppressRelicUntil=0;pumpRelics();
    },360);
  }

  function installPlayerNetwork(){
    if(typeof playerStateForNetwork!=="function"||playerStateForNetwork.__v142CampaignState)return false;
    const base=playerStateForNetwork;const wrapped=function playerStateForNetworkV142(player){const out=base(player);if(player?.rpgStats)out.rpgStats={...player.rpgStats};for(const key of PLAYER_ARRAYS)if(Array.isArray(player?.[key]))out[key]=clone(player[key]);for(const key of PLAYER_SCALARS)if(player?.[key]!==undefined)out[key]=player[key];return out};wrapped.__v142CampaignState=true;wrapped.__ccgOriginal=base;playerStateForNetwork=wrapped;return true;
  }
  function installPlayerStateReceive(){
    if(!net?.cb||typeof net.cb.onPacket!=="function"||net.cb.onPacket.__v142CampaignState)return false;
    const base=net.cb.onPacket;const wrapped=function onPacketV142CampaignState(event,payload){if(event==="v131_player_state"&&payload?.target===net.sessionId&&payload.state&&currentPlayer())copyPlayerV142(currentPlayer(),payload.state);return base.apply(this,arguments)};wrapped.__v142CampaignState=true;wrapped.__ccgOriginal=base;net.cb.onPacket=wrapped;return true;
  }
  function installWorldSend(){
    if(!net||typeof net.send!=="function"||net.send.__v142CampaignState)return false;
    const base=net.send.bind(net);const wrapped=function sendV142CampaignState(event,payload){if(event==="world"&&net.isHost&&payload&&typeof payload==="object")payload={...payload,_v142Campaign:campaignSnapshot()};return base(event,payload)};wrapped.__v142CampaignState=true;wrapped.__ccgOriginal=base;net.send=wrapped;return true;
  }
  function installWorldReceive(){
    if(typeof onWorld!=="function"||onWorld.__v142CampaignState)return false;
    const base=onWorld;const wrapped=function onWorldV142CampaignState(snapshot){
      let added=[];if(snapshot?._v142Campaign&&onlineGuest())added=applyCampaign(snapshot._v142Campaign);
      const result=base.apply(this,arguments),player=currentPlayer();
      for(const id of added){const domain=domainById(id);if(domain&&player)queueDomainReward(player,domain)}
      return result
    };wrapped.__v142CampaignState=true;wrapped.__ccgOriginal=base;onWorld=wrapped;return true;
  }
  function installPreserve(){
    if(typeof preservePlayer!=="function"||preservePlayer.__v142CampaignState)return false;
    const base=preservePlayer;const wrapped=function preservePlayerV142CampaignState(old,...args){const result=base(old,...args);copyPlayerV142(result,old);if(old?.v142WardReadyAt!==undefined)result.v142WardReadyAt=old.v142WardReadyAt;if(old?.v142BindReadyAt!==undefined)result.v142BindReadyAt=old.v142BindReadyAt;return result};wrapped.__v142CampaignState=true;wrapped.__ccgOriginal=base;preservePlayer=wrapped;return true;
  }
  function installMovementAuthority(){
    if(typeof movementTriggers!=="function"||movementTriggers.__v142CampaignAuthority)return false;
    const base=movementTriggers;const wrapped=function movementTriggersV142Authority(player){
      const runState=currentRun(),beforeCampaign=campaignSnapshot(runState),beforePlayer=playerV142Snapshot(player),beforeInventory=clone(player?.inventory||[]),beforeDomains=new Set(beforeCampaign?.v142ClaimedDomains||[]),guest=onlineGuest(),remoteActor=onlineHost()&&!isLocalPlayer(player);
      const result=base.apply(this,arguments),afterDomains=[...new Set(currentRun()?.v142ClaimedDomains||[])],added=afterDomains.filter(id=>!beforeDomains.has(id));
      if(guest&&added.length){restoreCampaign(runState,beforeCampaign);restorePlayerV142(player,beforePlayer);if(player)player.inventory=beforeInventory;suppressScheduledRemoteRelic();return result}
      if(added.length){
        if(remoteActor)suppressScheduledRemoteRelic();
        for(const id of added){const domain=domainById(id);if(!domain)continue;for(const local of localRoster())if(local!==player)queueDomainReward(local,domain)}
      }
      return result;
    };wrapped.__v142CampaignAuthority=true;wrapped.__ccgOriginal=base;movementTriggers=wrapped;return true;
  }

  function install(){
    const ready=Boolean(window.CCGLostSizzlerV142ProceduralOverhaul&&window.CCGLostSizzlerV142FiveDepthCampaign&&window.CCG_CONFIG?.proceduralDungeon&&typeof preservePlayer==="function");if(!ready)return false;
    installPlayerNetwork();installPlayerStateReceive();installWorldSend();installWorldReceive();installPreserve();installMovementAuthority();state.installed=true;return true;
  }

  let attempts=0,timer=setInterval(()=>{attempts++;if(install()||attempts>80){clearInterval(timer);timer=0}},100);install();
  state.observer=new MutationObserver(()=>{if(performance.now()<state.suppressRelicUntil){const modal=document.getElementById("v142-relic-choice");if(modal&&!modal.classList.contains("hidden")){modal.classList.add("hidden");try{if(typeof mode!=="undefined"&&mode==="v142relic")mode="playing"}catch(_){}}}else pumpRelics()});state.observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  addEventListener("pagehide",()=>{if(timer)clearInterval(timer);state.observer?.disconnect?.()},{once:true});
  window.CCGLostSizzlerV142MultiplayerState=Object.freeze({state,campaignSnapshot,playerV142Snapshot,copyPlayerV142,applyCampaign,queueDomainReward});
})();